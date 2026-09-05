import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec, withTransaction } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';

const router = Router();
router.use(authMiddleware);

const ITEM_FIELDS = [
  'type', 'gender', 'NAME', 'description', 'level', 'icon_id', 'part',
  'is_up_to_up', 'power_require', 'gold', 'gem', 'head', 'body', 'leg',
];

function normalizeItem(body = {}, current = {}) {
  const type = Number(body.type ?? current.type ?? 0);
  const gender = Number(body.gender ?? current.gender ?? 3);
  const level = Number(body.level ?? current.level ?? 0);
  const iconId = Number(body.icon_id ?? current.icon_id ?? 0);
  const part = Number(body.part ?? current.part ?? -1);
  const isUp = Number(body.is_up_to_up ?? current.is_up_to_up ?? 0) ? 1 : 0;
  const power = Number(body.power_require ?? current.power_require ?? 0);
  const gold = Number(body.gold ?? current.gold ?? 0);
  const gem = Number(body.gem ?? current.gem ?? 0);
  const head = Number(body.head ?? current.head ?? -1);
  const bodyPart = Number(body.body ?? current.body ?? -1);
  const leg = Number(body.leg ?? current.leg ?? -1);
  const name = String(body.NAME ?? body.name ?? current.NAME ?? '').trim();
  const description = String(body.description ?? current.description ?? '').trim();
  if (!name || name.length > 255) throw new Error('Tên vật phẩm bắt buộc và tối đa 255 ký tự');
  if (description.length > 75) throw new Error('Mô tả tối đa 75 ký tự theo schema game');
  if (![type, level, iconId, power, gold, gem].every(Number.isInteger) || type < 0 || level < 0 || iconId < 0 || power < 0 || gold < 0 || gem < 0) {
    throw new Error('type/level/icon/power/gold/gem phải là số nguyên không âm');
  }
  if (!Number.isInteger(gender) || gender < 0 || gender > 3) throw new Error('gender phải từ 0 đến 3');
  if (![part, head, bodyPart, leg].every(Number.isInteger) || part < -1 || head < -1 || bodyPart < -1 || leg < -1) {
    throw new Error('part/head/body/leg không hợp lệ');
  }
  if (gold > 2_000_000_000 || gem > 2_000_000_000) throw new Error('gold/gem vượt giới hạn int của database');
  const parts = normalizeParts(body.parts ?? current.parts);
  const headAvatar = body.head_avatar ?? current.head_avatar;
  const normalizedHeadAvatar = headAvatar == null || headAvatar === '' ? null : Number(headAvatar);
  if (normalizedHeadAvatar != null && (!Number.isInteger(normalizedHeadAvatar) || normalizedHeadAvatar < 0)) {
    throw new Error('head_avatar phải là số nguyên không âm hoặc để trống');
  }
  if (normalizedHeadAvatar != null && head < 0) throw new Error('Muốn lưu head_avatar thì cột Head phải là head_id không âm');
  return { type, gender, NAME: name, description, level, icon_id: iconId, part, is_up_to_up: isUp, power_require: power, gold, gem, head, body: bodyPart, leg, parts, head_avatar: normalizedHeadAvatar };
}

function normalizeParts(value) {
  if (value == null || value === '') return [];
  if (!Array.isArray(value)) throw new Error('parts phải là mảng [{ id, type, data }]');
  const ids = new Set();
  return value.map((raw) => {
    const id = Number(raw?.id);
    const type = Number(raw?.type);
    const data = typeof raw?.data === 'string' ? raw.data.trim() : JSON.stringify(raw?.data);
    if (!Number.isInteger(id) || id < 0 || !Number.isInteger(type) || type < 0 || type > 2 || !data) {
      throw new Error('Mỗi part cần id, type (0-2) và data JSON hợp lệ');
    }
    if (ids.has(id)) throw new Error(`Part #${id} bị lặp trong payload`);
    ids.add(id);
    let parsed;
    try { parsed = JSON.parse(data); } catch { throw new Error(`Data của part #${id} không phải JSON hợp lệ`); }
    if (!Array.isArray(parsed) || parsed.some((row) => !Array.isArray(row) || row.length !== 3 || row.some((n) => !Number.isInteger(Number(n))))) {
      throw new Error(`Data của part #${id} phải có dạng [[icon,dx,dy], ...]`);
    }
    return { id, type, data: JSON.stringify(parsed) };
  });
}

async function persistVisualData(conn, item) {
  for (const part of item.parts) {
    const [rows] = await conn.execute('SELECT TYPE, DATA FROM part WHERE id = ? LIMIT 1', [part.id]);
    if (rows.length && (Number(rows[0].TYPE) !== part.type || String(rows[0].DATA) !== part.data)) {
      throw new Error(`Part #${part.id} đã tồn tại nhưng khác dữ liệu; không ghi đè để tránh hỏng item khác`);
    }
    if (!rows.length) await conn.execute('INSERT INTO part (id, TYPE, DATA) VALUES (?, ?, ?)', [part.id, part.type, part.data]);
  }
  if (item.head_avatar != null) {
    const [rows] = await conn.execute('SELECT avatar_id FROM head_avatar WHERE head_id = ? LIMIT 1', [item.head]);
    if (rows.length && Number(rows[0].avatar_id) !== item.head_avatar) {
      throw new Error(`head_avatar #${item.head} đã tồn tại với avatar khác; không ghi đè`);
    }
    if (!rows.length) await conn.execute('INSERT INTO head_avatar (head_id, avatar_id) VALUES (?, ?)', [item.head, item.head_avatar]);
  }
}

async function reloadRuntime(serverId) {
  return agentPost(Number(serverId || await getDefaultServerId()), '/reload/items', {});
}

async function readPersistedItem(id) {
  const rows = await query(
    `SELECT id, type, gender, NAME, description, level, icon_id, part, is_up_to_up,
            power_require, gold, gem, head, body, leg
     FROM item_template WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error(`Không đọc lại được item #${id} từ database ngocrong`);
  const item = rows[0];
  const parts = await query('SELECT id, TYPE AS type, DATA AS data FROM part WHERE id IN (?, ?, ?)', [item.part, item.body, item.leg]);
  const avatar = item.head >= 0 ? await query('SELECT avatar_id FROM head_avatar WHERE head_id = ? LIMIT 1', [item.head]) : [];
  return { ...item, parts, head_avatar: avatar.length ? Number(avatar[0].avatar_id) : null };
}

async function reloadOrReportDatabaseSaved({ req, res, sid, item, action, status = 200 }) {
  let runtime;
  try {
    runtime = await reloadRuntime(sid);
  } catch (e) {
    try {
      await auditLog({ userId: req.user.id, serverId: sid, action, target: item.id, requestBody: item, response: { databaseSaved: true, runtimeReloaded: false, error: e.message }, ip: req.ip });
    } catch (auditError) {
      console.warn('[items] audit failed after database save:', auditError.message);
    }
    return res.status(503).json({
      ok: false,
      error: `Database ngocrong đã lưu item #${item.id}, nhưng Java runtime chưa reload: ${e.message}`,
      data: { databaseSaved: true, runtimeReloaded: false, database: 'ngocrong', item },
    });
  }
  try {
    await auditLog({ userId: req.user.id, serverId: sid, action, target: item.id, requestBody: item, response: { databaseSaved: true, runtimeReloaded: true, runtime }, ip: req.ip });
  } catch (auditError) {
    console.warn('[items] audit failed after item persistence:', auditError.message);
  }
  return res.status(status).json({ ok: true, data: { databaseSaved: true, runtimeReloaded: true, database: 'ngocrong', item, runtime } });
}

router.get('/', requirePermission('giftcode.manage'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit || 5000), 1), 10000);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  try {
    const like = `%${q}%`;
    const rows = await query(
      `SELECT id, type, gender, NAME, description, level, icon_id, part, is_up_to_up,
              power_require, gold, gem, head, body, leg
       FROM item_template
       WHERE (? = '' OR NAME LIKE ? OR CAST(id AS CHAR) LIKE ?)
       ORDER BY id LIMIT ? OFFSET ?`,
      [q, like, like, limit, offset]
    );
    const countRows = await query(
      'SELECT COUNT(*) AS total, COALESCE(MAX(id), -1) AS max_id FROM item_template'
    );
    res.json({ ok: true, data: { rows, total: Number(countRows[0]?.total || 0), nextId: Number(countRows[0]?.max_id ?? -1) + 1, limit, offset } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/options', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const rows = await query('SELECT id, NAME AS name FROM item_option_template ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/parts', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const rows = await query('SELECT id, TYPE AS type, DATA AS data FROM part ORDER BY id, TYPE');
    res.json({ ok: true, data: { rows, total: rows.length } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/head-avatars', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const rows = await query('SELECT head_id, avatar_id FROM head_avatar ORDER BY head_id');
    res.json({ ok: true, data: { rows, total: rows.length } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const maxRows = await query('SELECT COUNT(*) AS count, COALESCE(MAX(id), -1) AS max_id FROM item_template');
    const count = Number(maxRows[0]?.count || 0);
    const maxId = Number(maxRows[0]?.max_id ?? -1);
    const requestedId = req.body?.id == null || req.body.id === '' ? null : Number(req.body.id);
    if (requestedId != null && (!Number.isInteger(requestedId) || requestedId < 0)) {
      return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
    }
    if (requestedId == null && maxId + 1 !== count) {
      return res.status(409).json({ ok: false, error: 'item_template đang có ID bị khuyết; hãy khôi phục ID trước khi thêm item' });
    }
    const id = requestedId == null ? maxId + 1 : requestedId;
    if (requestedId != null) {
      const duplicate = await query('SELECT id FROM item_template WHERE id = ? LIMIT 1', [id]);
      if (duplicate.length) return res.status(409).json({ ok: false, error: `item_template #${id} đã tồn tại` });
    }
    const item = normalizeItem(req.body);
    await withTransaction(async (conn) => {
      await persistVisualData(conn, item);
      await conn.execute(
        `INSERT INTO item_template
         (id, type, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.type, item.gender, item.NAME, item.description, item.level, item.icon_id, item.part,
          item.is_up_to_up, item.power_require, item.gold, item.gem, item.head, item.body, item.leg]
      );
    });
    const persisted = await readPersistedItem(id);
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    return reloadOrReportDatabaseSaved({ req, res, sid, item: persisted, action: 'item.create', status: 201 });
  } catch (e) {
    res.status(e.status ? e.status : 400).json({ ok: false, error: e.message });
  }
});

router.put('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0) return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
  try {
    const rows = await query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Item template không tồn tại' });
    const item = normalizeItem(req.body, rows[0]);
    await withTransaction(async (conn) => {
      await persistVisualData(conn, item);
      await conn.execute(
      `UPDATE item_template SET type=?, gender=?, NAME=?, description=?, level=?, icon_id=?, part=?,
       is_up_to_up=?, power_require=?, gold=?, gem=?, head=?, body=?, leg=? WHERE id=?`,
      [item.type, item.gender, item.NAME, item.description, item.level, item.icon_id, item.part,
        item.is_up_to_up, item.power_require, item.gold, item.gem, item.head, item.body, item.leg, id]
      );
    });
    const persisted = await readPersistedItem(id);
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    return reloadOrReportDatabaseSaved({ req, res, sid, item: persisted, action: 'item.update' });
  } catch (e) {
    res.status(e.status || 400).json({ ok: false, error: e.message });
  }
});

router.post('/reload', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    const runtime = await reloadRuntime(sid);
    await auditLog({ userId: req.user.id, serverId: sid, action: 'item.reload', response: { database: 'ngocrong', loadedFromDatabase: true, runtime }, ip: req.ip });
    res.json({ ok: true, data: { database: 'ngocrong', loadedFromDatabase: true, runtime } });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
