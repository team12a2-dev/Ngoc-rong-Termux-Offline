import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { reloadClans } from '../services/liveSync.js';
import { queuePanelCommand, sleep } from '../services/panelCommand.js';
import { getDefaultServerId } from '../services/serverRegistry.js';

const router = Router();
router.use(authMiddleware);

const ROLE_LABELS = {
  0: 'Bang chủ',
  1: 'Phó bang',
  2: 'Thành viên',
};

let flagCache = null;
let flagCacheAt = 0;

async function getFlagMap() {
  if (flagCache && Date.now() - flagCacheAt < 300_000) return flagCache;
  const rows = await query('SELECT id, icon_id, NAME AS name, gold, gem FROM flag_bag ORDER BY id');
  flagCache = Object.fromEntries(rows.map((r) => [r.id, r]));
  flagCacheAt = Date.now();
  return flagCache;
}

/** Parse members JSON — game lưu mảng chuỗi JSON */
function parseMembersRaw(raw) {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => (typeof item === 'string' ? JSON.parse(item) : item));
  } catch {
    return [];
  }
}

function serializeMembers(members) {
  return JSON.stringify(members.map((m) => JSON.stringify(m)));
}

function enrichMembers(members) {
  return members.map((m) => ({
    ...m,
    role: m.role != null ? Number(m.role) : 2,
    roleLabel: ROLE_LABELS[Number(m.role)] ?? `Role ${m.role}`,
    power: Number(m.power ?? m.powerPoint ?? 0),
    donate: Number(m.donate ?? 0),
    clan_point: Number(m.clan_point ?? 0),
    member_point: Number(m.member_point ?? 0),
  })).sort((a, b) => a.role - b.role || b.power - a.power);
}

async function saveClanMembers(clanId, members) {
  const leader = members.find((m) => Number(m.role) === 0);
  const thongTinLeader = leader
    ? `[${leader.id},${leader.name},${leader.head ?? -1},${leader.body ?? -1},${leader.leg ?? -1}]`
    : '[]';
  await query(
    'UPDATE clan SET members = ?, thongTinLeader = ? WHERE id = ?',
    [serializeMembers(members), thongTinLeader, clanId]
  );
}

async function enrichClan(clan) {
  const flags = await getFlagMap();
  const flag = flags[clan.img_id ?? 0] || flags[0];
  const members = enrichMembers(parseMembersRaw(clan.members));
  const leader = members.find((m) => m.role === 0);
  return {
    ...clan,
    flag_name: flag?.name ?? null,
    flag_icon_id: flag?.icon_id ?? null,
    membersParsed: members,
    member_count: members.length,
    leader_name: leader?.name ?? null,
    leader_id: leader?.id ?? null,
  };
}

function buildDissolveMessage(clan, reason) {
  const lines = [
    '[Hệ thống] Thông báo Ban Quản Trị',
    `Bang hội "${clan.NAME}" (ID: ${clan.id}) đã chính thức bị giải tán.`,
  ];
  if (reason) lines.push(`Lý do: ${reason}`);
  lines.push('Mọi thành viên đã được giải phóng khỏi bang. Cảm ơn sự đồng hành!');
  return lines.join('\n');
}

async function syncClanInGame(serverId, { reload = false, clanId, message } = {}) {
  const path = reload ? '/reload/clan' : '/clan/dissolve';
  const body = reload ? {} : { clanId: Number(clanId), message };

  const attempts = [
    () => agentPost(serverId, path, body),
  ];

  let lastErr;
  for (const attempt of attempts) {
    try {
      await attempt();
      if (reload) return { ok: true, method: 'agent' };
      const rows = await query('SELECT id FROM clan WHERE id = ? LIMIT 1', [clanId]);
      if (!rows.length) return { ok: true, method: 'agent' };
      lastErr = new Error('Bang vẫn còn trong DB sau khi gọi agent');
    } catch (e) {
      lastErr = e;
    }
  }

  if (!reload) {
    const safeMsg = String(message || '').replace(/\|/g, ' ').slice(0, 500);
    try {
      await queuePanelCommand(`DISSOLVE_CLAN|${clanId}|${safeMsg}`);
      await sleep(4000);
      const rows = await query('SELECT id FROM clan WHERE id = ? LIMIT 1', [clanId]);
      if (!rows.length) return { ok: true, method: 'panel_cmd' };
    } catch {
      /* fallback file bridge failed */
    }
  } else {
    try {
      await queuePanelCommand('RELOAD_CLAN');
      await sleep(4000);
      return { ok: true, method: 'panel_cmd' };
    } catch {
      /* ignore */
    }
  }

  throw lastErr || new Error('Không thực thi được trên game server');
}

async function dissolveClanInGame(serverId, clanId, message) {
  return syncClanInGame(serverId, { clanId, message });
}

async function handleDissolve(req, res) {
  const clanId = req.params.id ?? req.body?.clanId ?? req.body?.id;
  const reason = String(req.body?.reason || '').trim();
  if (clanId == null || clanId === '') {
    return res.status(400).json({ ok: false, error: 'Thiếu ID bang hội' });
  }
  try {
    const rows = await query('SELECT * FROM clan WHERE id = ? LIMIT 1', [clanId]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'Bang không tồn tại (có thể đã bị giải tán)' });
    }
    const clan = rows[0];
    const members = parseMembersRaw(clan.members);
    const memberIds = members.map((m) => Number(m.id)).filter(Boolean);
    const message = String(req.body?.message || '').trim() || buildDissolveMessage(clan, reason);
    const serverId = Number(req.body?.serverId || await getDefaultServerId());

    let syncMethod;
    try {
      const sync = await dissolveClanInGame(serverId, clanId, message);
      syncMethod = sync.method;
    } catch (e) {
      return res.status(502).json({
        ok: false,
        error: `Game server chưa thực thi giải tán in-game: ${e.message}. Tắt game server, chạy build-panel-clan.bat, rồi khởi động lại.`,
      });
    }

    await auditLog({
      userId: req.user.id,
      action: 'clan.dissolve',
      target: clanId,
      requestBody: { reason, memberCount: memberIds.length, syncMethod },
      ip: req.ip,
    });

    const verify = await query('SELECT id FROM clan WHERE id = ? LIMIT 1', [clanId]);
    if (verify.length) {
      return res.status(502).json({
        ok: false,
        error: 'Game server chưa xóa bang trong DB — giải tán in-game thất bại. Tắt game server, chạy build-panel-clan.bat, khởi động lại.',
      });
    }

    res.json({
      ok: true,
      data: {
        message,
        memberCount: memberIds.length,
        clanName: clan.NAME,
        agentSynced: true,
        syncMethod,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

router.get('/flags', requirePermission('player.view'), async (_req, res) => {
  try {
    const flags = await getFlagMap();
    res.json({ ok: true, data: Object.values(flags) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/search', requirePermission('player.view'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const sort = req.query.sort || 'power';
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  try {
    let sql = 'SELECT id, NAME, NAME_2, slogan, img_id, power_point, max_member, clan_point, LEVEL, create_time FROM clan';
    const params = [];
    if (q) {
      sql += ' WHERE NAME LIKE ? OR NAME_2 LIKE ? OR id = ?';
      const like = `%${q}%`;
      const num = Number(q);
      params.push(like, like, Number.isNaN(num) ? -1 : num);
    }
    const orderCol = sort === 'level' ? 'LEVEL DESC, power_point DESC'
      : sort === 'members' ? 'id DESC'
      : sort === 'name' ? 'NAME ASC'
      : 'power_point DESC, LEVEL DESC';
    sql += ` ORDER BY ${orderCol} LIMIT ?`;
    params.push(limit);
    const rows = await query(sql, params);
    const flags = await getFlagMap();
    const data = rows.map((c) => {
      const flag = flags[c.img_id ?? 0] || flags[0];
      return {
        ...c,
        flag_name: flag?.name ?? null,
        flag_icon_id: flag?.icon_id ?? null,
      };
    });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/dissolve', requirePermission('player.view'), handleDissolve);

router.post('/reload-sync', requirePermission('player.view'), async (req, res) => {
  try {
    const serverId = Number(req.body?.serverId || await getDefaultServerId());
    await syncClanInGame(serverId, { reload: true });
    res.json({ ok: true, data: { message: 'Đã đồng bộ bang hội in-game từ database' } });
  } catch (e) {
    res.status(502).json({
      ok: false,
      error: `Không đồng bộ được in-game: ${e.message}. Tắt game server, chạy build-panel-clan.bat, rồi khởi động lại.`,
    });
  }
});

router.get('/:id', requirePermission('player.view'), async (req, res) => {
  try {
    const rows = await query('SELECT * FROM clan WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, data: await enrichClan(rows[0]) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id', requirePermission('player.view'), async (req, res) => {
  const { slogan, img_id, NAME, NAME_2 } = req.body || {};
  try {
    await query(
      `UPDATE clan SET
         slogan = COALESCE(?, slogan),
         img_id = COALESCE(?, img_id),
         NAME = COALESCE(?, NAME),
         NAME_2 = COALESCE(?, NAME_2)
       WHERE id = ?`,
      [slogan ?? null, img_id ?? null, NAME ?? null, NAME_2 ?? null, req.params.id]
    );
    await auditLog({
      userId: req.user.id,
      action: 'clan.update',
      target: req.params.id,
      requestBody: req.body,
      ip: req.ip,
    });
    const rows = await query('SELECT * FROM clan WHERE id = ? LIMIT 1', [req.params.id]);
    const liveSync = await reloadClans(req.body?.serverId);
    res.json({ ok: true, data: { ...(await enrichClan(rows[0])), liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/members/:memberId', requirePermission('player.view'), async (req, res) => {
  const { role, donate, clan_point, member_point } = req.body || {};
  try {
    const rows = await query('SELECT * FROM clan WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Bang không tồn tại' });
    const members = parseMembersRaw(rows[0].members);
    const mid = Number(req.params.memberId);
    const idx = members.findIndex((m) => Number(m.id) === mid);
    if (idx < 0) return res.status(404).json({ ok: false, error: 'Không tìm thấy thành viên' });

    if (role != null) {
      const newRole = Number(role);
      if (newRole === 0) {
        members.forEach((m) => {
          if (Number(m.id) !== mid && Number(m.role) === 0) m.role = 2;
        });
      }
      members[idx].role = newRole;
    }
    if (donate != null) members[idx].donate = Number(donate);
    if (clan_point != null) members[idx].clan_point = Number(clan_point);
    if (member_point != null) members[idx].member_point = Number(member_point);

    await saveClanMembers(req.params.id, members);
    await auditLog({
      userId: req.user.id,
      action: 'clan.member.update',
      target: `${req.params.id}:${mid}`,
      requestBody: req.body,
      ip: req.ip,
    });
    const updated = await query('SELECT * FROM clan WHERE id = ? LIMIT 1', [req.params.id]);
    const liveSync = await reloadClans(req.body?.serverId);
    res.json({ ok: true, data: { ...(await enrichClan(updated[0])), liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/:id/members/:memberId', requirePermission('player.view'), async (req, res) => {
  try {
    const rows = await query('SELECT * FROM clan WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Bang không tồn tại' });
    const members = parseMembersRaw(rows[0].members);
    const mid = Number(req.params.memberId);
    const member = members.find((m) => Number(m.id) === mid);
    if (!member) return res.status(404).json({ ok: false, error: 'Không tìm thấy thành viên' });
    if (Number(member.role) === 0 && members.length > 1) {
      return res.status(400).json({ ok: false, error: 'Không thể đuổi bang chủ — chuyển quyền hoặc giải tán bang' });
    }

    const next = members.filter((m) => Number(m.id) !== mid);
    await saveClanMembers(req.params.id, next);
    await query('UPDATE player SET clan_id = -1 WHERE id = ?', [mid]);

    await auditLog({
      userId: req.user.id,
      action: 'clan.member.kick',
      target: `${req.params.id}:${mid}`,
      ip: req.ip,
    });
    const updated = await query('SELECT * FROM clan WHERE id = ? LIMIT 1', [req.params.id]);
    const liveSync = await reloadClans(req.body?.serverId);
    res.json({ ok: true, data: { ...(await enrichClan(updated[0])), liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/dissolve', requirePermission('player.view'), handleDissolve);

export default router;
