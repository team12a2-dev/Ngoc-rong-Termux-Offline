import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost, getOnlinePlayers, agentGet } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import {
  enrichPlayer,
  buildDataPoint,
  buildInventory,
  buildLocation,
  buildItemsFromParsed,
  buildTask,
  buildSkillsFromList,
  addItemToContainer,
  tryParseJson,
} from '../services/playerData.js';

import { syncPlayerToGame, applyPlayerItemsOnline } from '../services/playerSync.js';
import {
  enrichOption,
  OPTION_CATEGORIES,
  QUICK_OPTION_IDS,
} from '../services/itemOptionCatalog.js';

const router = Router();
router.use(authMiddleware);

let itemNameCache = null;
let itemNameCacheAt = 0;
let itemListCache = null;

async function getItemNames() {
  if (itemNameCache && Date.now() - itemNameCacheAt < 300_000) return itemNameCache;
  try {
    const rows = await query('SELECT id, NAME, icon_id FROM item_template ORDER BY id');
    itemNameCache = Object.fromEntries(rows.map((r) => [r.id, r.NAME]));
    itemListCache = rows.map((r) => ({ id: r.id, name: r.NAME, icon_id: r.icon_id }));
    itemNameCacheAt = Date.now();
  } catch {
    itemNameCache = {};
    itemListCache = [];
  }
  return itemNameCache;
}

async function searchItemTemplates(qRaw, limit = 30) {
  const q = String(qRaw || '').trim();
  if (!q) return [];
  const num = Number(q);
  const like = `%${q}%`;
  try {
    const idLike = `%${q}%`;
    const rows = await query(
      `SELECT id, NAME AS name, type, icon_id FROM item_template
       WHERE NAME LIKE ? OR id = ? OR CAST(id AS CHAR) LIKE ?
       ORDER BY CASE WHEN id = ? THEN 0 WHEN CAST(id AS CHAR) LIKE ? THEN 1 WHEN NAME LIKE ? THEN 2 ELSE 3 END, id
       LIMIT ?`,
      [
        like,
        Number.isNaN(num) ? -1 : num,
        idLike,
        Number.isNaN(num) ? -1 : num,
        `${q}%`,
        `${q}%`,
        limit,
      ]
    );
    return rows;
  } catch {
    return [];
  }
}

router.get('/item-templates', requirePermission('player.view'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (req.query.refresh === '1') {
      itemNameCache = null;
      itemListCache = null;
      itemNameCacheAt = 0;
    }
    if (q) {
      const list = await searchItemTemplates(q);
      return res.json({
        ok: true,
        data: list.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          icon_id: r.icon_id != null ? Number(r.icon_id) : null,
        })),
        map: Object.fromEntries(list.map((r) => [r.id, r.name])),
      });
    }
    await getItemNames();
    res.json({
      ok: true,
      data: (itemListCache || []).map((r) => ({
        ...r,
        icon_id: r.icon_id != null ? Number(r.icon_id) : null,
      })),
      map: itemNameCache || {},
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/meta/skills', requirePermission('player.view'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const num = Number(q);
  const like = `%${q}%`;
  try {
    const rows = q
      ? await query(
        `SELECT id, name, nclass_id, max_point FROM skill_template
         WHERE name LIKE ? OR id = ?
         ORDER BY id LIMIT 40`,
        [like, Number.isNaN(num) ? -1 : num]
      )
      : await query('SELECT id, name, nclass_id, max_point FROM skill_template ORDER BY id LIMIT 100');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/meta/tasks', requirePermission('player.view'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const num = Number(q);
  const like = `%${q}%`;
  try {
    const rows = q
      ? await query(
        `SELECT id, name FROM task_main_template
         WHERE name LIKE ? OR id = ?
         ORDER BY id LIMIT 40`,
        [like, Number.isNaN(num) ? -1 : num]
      )
      : await query('SELECT id, name FROM task_main_template ORDER BY id LIMIT 100');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/meta/tasks/:id', requirePermission('player.view'), async (req, res) => {
  try {
    const main = await query('SELECT id, name, detail FROM task_main_template WHERE id = ? LIMIT 1', [req.params.id]);
    if (!main.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const subs = await query(
      `SELECT name, max_count, notify, npc_id, map FROM task_sub_template
       WHERE task_main_id = ? ORDER BY id`,
      [req.params.id]
    );
    res.json({ ok: true, data: { ...main[0], subTasks: subs } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

let itemOptionCache = null;
let itemOptionCatalogCache = null;
let itemOptionCacheAt = 0;
let itemOptionLoadError = null;

async function queryItemOptionTemplateRows() {
  try {
    return await query('SELECT id, NAME AS name FROM item_option_template ORDER BY id');
  } catch (e1) {
    try {
      return await query('SELECT id, name FROM item_option_template ORDER BY id');
    } catch (e2) {
      throw new Error(`item_option_template: ${e2.message || e1.message}`);
    }
  }
}

async function loadItemOptionRows(force = false) {
  if (!force && itemOptionCatalogCache && Date.now() - itemOptionCacheAt < 600_000) {
    return itemOptionCatalogCache;
  }
  try {
    const rows = await queryItemOptionTemplateRows();
    itemOptionCatalogCache = rows.map(enrichOption);
    itemOptionCache = Object.fromEntries(rows.map((r) => [r.id, r.name ?? r.NAME ?? '']));
    itemOptionCacheAt = Date.now();
    itemOptionLoadError = null;
  } catch (e) {
    console.error('[item-options] load failed:', e.message);
    itemOptionLoadError = e.message;
    if (force || !itemOptionCatalogCache) {
      itemOptionCatalogCache = [];
      itemOptionCache = {};
    }
  }
  return itemOptionCatalogCache;
}

async function getItemOptionMap() {
  await loadItemOptionRows();
  return itemOptionCache || {};
}

router.get('/meta/item-options', requirePermission('player.view'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const category = String(req.query.category || '').trim();
  const force = req.query.refresh === '1' || req.query.force === '1';
  const num = Number(q);
  const like = `%${q}%`;
  try {
    const catalog = await loadItemOptionRows(force);
    const map = await getItemOptionMap();
    const meta = {
      table: 'item_option_template',
      count: catalog.length,
      syncedAt: itemOptionCacheAt || null,
      loadError: itemOptionLoadError,
    };

    if (category && category !== 'all' && OPTION_CATEGORIES[category]) {
      const list = catalog.filter((o) => o.category === category);
      return res.json({ ok: true, data: list, map, meta, categories: OPTION_CATEGORIES, quickIds: QUICK_OPTION_IDS });
    }

    if (q) {
      let rows;
      try {
        rows = await query(
          `SELECT id, NAME AS name FROM item_option_template
           WHERE NAME LIKE ? OR id = ?
           ORDER BY id LIMIT 200`,
          [like, Number.isNaN(num) ? -1 : num]
        );
      } catch {
        rows = await query(
          `SELECT id, name FROM item_option_template
           WHERE name LIKE ? OR id = ?
           ORDER BY id LIMIT 200`,
          [like, Number.isNaN(num) ? -1 : num]
        );
      }
      return res.json({
        ok: true,
        data: rows.map(enrichOption),
        map,
        meta,
        categories: OPTION_CATEGORIES,
        quickIds: QUICK_OPTION_IDS,
      });
    }

    const quick = catalog.filter((o) => QUICK_OPTION_IDS.includes(o.id));
    res.json({
      ok: true,
      data: catalog,
      quick,
      map,
      meta,
      categories: OPTION_CATEGORIES,
      quickIds: QUICK_OPTION_IDS,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/search', requirePermission('player.view'), async (req, res) => {
  const qRaw = String(req.query.q || '').trim();
  const gender = req.query.gender;
  const sort = req.query.sort || 'id_desc';
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    let sql = `
      SELECT p.id, p.account_id, p.name, p.gender, p.head, p.clan_id, p.data_point, p.data_location,
             p.data_inventory, p.create_time, p.event_point, p.rank,
             a.username, a.vnd, a.ban, a.vip, a.tongnap
      FROM player p
      LEFT JOIN account a ON a.id = p.account_id
      WHERE 1=1`;
    const params = [];

    if (qRaw) {
      sql += ' AND (p.name LIKE ? OR p.id = ? OR p.account_id = ? OR a.username LIKE ?)';
      const q = `%${qRaw}%`;
      const n = Number(qRaw) || 0;
      params.push(q, n, n, q);
    }
    if (gender !== undefined && gender !== '') {
      sql += ' AND p.gender = ?';
      params.push(Number(gender));
    }

    sql += ' ORDER BY p.id DESC LIMIT ?';
    params.push(limit * 3);

    const rows = await query(sql, params);
    const itemNames = await getItemNames();
    let data = rows.map((r) => enrichPlayer(r, itemNames));

    if (sort === 'power_desc') data.sort((a, b) => (b.power || 0) - (a.power || 0));
    else if (sort === 'power_asc') data.sort((a, b) => (a.power || 0) - (b.power || 0));
    else if (sort === 'name_asc') data.sort((a, b) => String(a.name).localeCompare(String(b.name)));

    data = data.slice(0, limit);
    res.json({ ok: true, data, total: data.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/:id', requirePermission('player.view'), async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, a.username, a.vnd, a.tongnap, a.vip, a.ban, a.is_admin, a.email,
              a.ip_address, a.last_time_login, a.create_time AS account_create_time
       FROM player p LEFT JOIN account a ON a.id = p.account_id
       WHERE p.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });

    const itemNames = await getItemNames();
    const player = enrichPlayer(rows[0], itemNames);

    let online = null;
    try {
      const sid = Number(req.query.serverId || await getDefaultServerId());
      const onlineRes = await getOnlinePlayers(sid);
      const list = onlineRes?.data || [];
      online = list.find(
        (p) => p.id === player.id
          || String(p.name).toLowerCase() === String(player.name).toLowerCase()
      ) || null;
      if (!online) {
        try {
          const one = await agentGet(sid, `/players/${encodeURIComponent(player.name)}`);
          if (one?.data) online = one.data;
        } catch {
          /* offline */
        }
      }
    } catch {
      online = null;
    }

    res.json({ ok: true, data: { ...player, online } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/stats', requirePermission('account.edit'), async (req, res) => {
  const allowed = ['limitPower', 'power', 'tiemNang', 'stamina', 'maxStamina', 'hpg', 'mpg', 'dameg', 'defg', 'critg', 'critdragon', 'hp', 'mp'];
  const updates = {};
  for (const k of allowed) {
    if (req.body?.[k] != null) updates[k] = req.body[k];
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ ok: false, error: 'No stats to update' });
  }
  try {
    const rows = await query('SELECT data_point FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const data_point = buildDataPoint(rows[0].data_point, updates);
    await query('UPDATE player SET data_point = ? WHERE id = ?', [data_point, req.params.id]);
    await auditLog({ userId: req.user.id, action: 'player.stats', target: req.params.id, requestBody: req.body, ip: req.ip });
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { data_point: tryParseJson(data_point), sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/inventory', requirePermission('account.edit'), async (req, res) => {
  const allowed = ['gold', 'gem', 'ruby', 'coupon', 'event'];
  const updates = {};
  for (const k of allowed) {
    if (req.body?.[k] != null) updates[k] = req.body[k];
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ ok: false, error: 'No inventory fields' });
  }
  try {
    const rows = await query('SELECT data_inventory FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const data_inventory = buildInventory(rows[0].data_inventory, updates);
    await query('UPDATE player SET data_inventory = ? WHERE id = ?', [data_inventory, req.params.id]);
    await auditLog({ userId: req.user.id, action: 'player.inventory', target: req.params.id, requestBody: req.body, ip: req.ip });
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/location', requirePermission('account.edit'), async (req, res) => {
  const { mapId, x, y } = req.body || {};
  if (mapId == null && x == null && y == null) {
    return res.status(400).json({ ok: false, error: 'mapId, x, or y required' });
  }
  try {
    const rows = await query('SELECT data_location FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const data_location = buildLocation(rows[0].data_location, { mapId, x, y });
    await query('UPDATE player SET data_location = ? WHERE id = ?', [data_location, req.params.id]);
    await auditLog({ userId: req.user.id, action: 'player.location', target: req.params.id, requestBody: req.body, ip: req.ip });
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { location: tryParseJson(data_location), sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/profile', requirePermission('account.edit'), async (req, res) => {
  const { name, head, gender, clan_id } = req.body || {};
  const sets = [];
  const params = [];
  if (name != null) { sets.push('name = ?'); params.push(String(name).slice(0, 20)); }
  if (head != null) { sets.push('head = ?'); params.push(Number(head)); }
  if (gender != null) { sets.push('gender = ?'); params.push(Number(gender)); }
  if (clan_id != null) { sets.push('clan_id = ?'); params.push(Number(clan_id)); }
  if (!sets.length) return res.status(400).json({ ok: false, error: 'Nothing to update' });
  params.push(req.params.id);
  try {
    await query(`UPDATE player SET ${sets.join(', ')} WHERE id = ?`, params);
    await auditLog({ userId: req.user.id, action: 'player.profile', target: req.params.id, requestBody: req.body, ip: req.ip });
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/points', requirePermission('account.edit'), async (req, res) => {
  const fields = [
    'event_point', 'rank', 'point_sukien', 'point_sukien1', 'point_sukien2',
    'point_maydam', 'thachdauwhis', 'lucky_round_point', 'point_2207',
  ];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (req.body?.[f] != null) {
      sets.push(`${f} = ?`);
      params.push(Number(req.body[f]));
    }
  }
  if (!sets.length) return res.status(400).json({ ok: false, error: 'No point fields' });
  params.push(req.params.id);
  try {
    await query(`UPDATE player SET ${sets.join(', ')} WHERE id = ?`, params);
    await auditLog({ userId: req.user.id, action: 'player.points', target: req.params.id, requestBody: req.body, ip: req.ip });
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const ITEM_CONTAINERS = {
  body: 'items_body',
  bag: 'items_bag',
  box: 'items_box',
};

router.put('/:id/items/:container', requirePermission('account.edit'), async (req, res) => {
  const col = ITEM_CONTAINERS[req.params.container];
  if (!col) return res.status(400).json({ ok: false, error: 'container must be body, bag, or box' });
  const { items } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ ok: false, error: 'items array required' });
  try {
    const serialized = buildItemsFromParsed(items);
    await query(`UPDATE player SET ${col} = ? WHERE id = ?`, [serialized, req.params.id]);
    await auditLog({ userId: req.user.id, action: `player.items.${req.params.container}`, target: req.params.id, ip: req.ip });
    const apply = await applyPlayerItemsOnline(req.params.id, req.params.container, items, req.body?.serverId);
    const sync = apply.applied
      ? apply
      : await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { count: items.length, apply, sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/task', requirePermission('account.edit'), async (req, res) => {
  const { taskId, taskIndex, taskCount, taskLastTime } = req.body || {};
  try {
    const rows = await query('SELECT data_task FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const data_task = buildTask(rows[0].data_task, { taskId, taskIndex, taskCount, taskLastTime });
    await query('UPDATE player SET data_task = ? WHERE id = ?', [data_task, req.params.id]);
    await auditLog({ userId: req.user.id, action: 'player.task', target: req.params.id, requestBody: req.body, ip: req.ip });
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { task: tryParseJson(data_task), sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/skills', requirePermission('account.edit'), async (req, res) => {
  const { skills } = req.body || {};
  if (!Array.isArray(skills)) return res.status(400).json({ ok: false, error: 'skills array required' });
  try {
    const serialized = buildSkillsFromList(skills);
    await query('UPDATE player SET skills = ? WHERE id = ?', [serialized, req.params.id]);
    await auditLog({ userId: req.user.id, action: 'player.skills', target: req.params.id, ip: req.ip });
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { count: skills.length, sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/buff-item', requirePermission('player.buff'), async (req, res) => {
  const { temp_id, templateId, quantity = 1, options = [] } = req.body || {};
  const tid = Number(temp_id ?? templateId);
  const qty = Number(quantity);
  if (!tid || tid < 0 || qty <= 0) {
    return res.status(400).json({ ok: false, error: 'temp_id and quantity required' });
  }
  const itemPayload = {
    templateId: tid,
    quantity: qty,
    options: Array.isArray(options) ? options : [],
  };
  try {
    const rows = await query('SELECT name, items_bag FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const sid = Number(req.body?.serverId || await getDefaultServerId());

    let online = false;
    try {
      const one = await agentGet(sid, `/players/${encodeURIComponent(rows[0].name)}`);
      online = Boolean(one?.data);
    } catch {
      online = false;
    }

    if (online) {
      const agentItems = [{
        temp_id: tid,
        quantity: qty,
        options: itemPayload.options.map((o) => ({ id: o.id, param: o.param })),
      }];
      const result = await agentPost(sid, `/players/${encodeURIComponent(rows[0].name)}/buff-item`, { items: agentItems });
      const added = Number(result?.data?.added ?? result?.data?.data?.added ?? 0);
      await auditLog({ userId: req.user.id, serverId: sid, action: 'player.buff.item', target: rows[0].name, requestBody: req.body, response: result, ip: req.ip });
      return res.json({ ok: true, data: { mode: 'online', added, message: `Đã buff item #${tid} x${qty} (online)` } });
    }

    const items_bag = addItemToContainer(rows[0].items_bag, itemPayload);
    await query('UPDATE player SET items_bag = ? WHERE id = ?', [items_bag, req.params.id]);
    await auditLog({ userId: req.user.id, action: 'player.buff.item.db', target: rows[0].name, requestBody: req.body, ip: req.ip });
    res.json({ ok: true, data: { mode: 'database', message: `Đã thêm item #${tid} x${qty} vào bag (offline)` } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id/account', requirePermission('account.edit'), async (req, res) => {
  const { vnd, vip, is_admin, tongnap } = req.body || {};
  try {
    const rows = await query('SELECT account_id FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const accountId = rows[0].account_id;
    await query(
      `UPDATE account SET
         vnd = COALESCE(?, vnd),
         vip = COALESCE(?, vip),
         is_admin = COALESCE(?, is_admin),
         tongnap = COALESCE(?, tongnap)
       WHERE id = ?`,
      [vnd ?? null, vip ?? null, is_admin ?? null, tongnap ?? null, accountId]
    );
    await auditLog({ userId: req.user.id, action: 'player.account', target: req.params.id, requestBody: req.body, ip: req.ip });
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: { sync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/sync', requirePermission('account.edit'), async (req, res) => {
  try {
    const sync = await syncPlayerToGame(req.params.id, req.body?.serverId);
    res.json({ ok: true, data: sync });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/ban', requirePermission('account.ban'), async (req, res) => {
  try {
    const rows = await query('SELECT account_id, name FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    await query('UPDATE account SET ban = 1 WHERE id = ?', [rows[0].account_id]);
    let kicked = false;
    try {
      const sid = Number(req.body?.serverId || await getDefaultServerId());
      const kickRes = await agentPost(sid, `/players/${encodeURIComponent(rows[0].name)}/kick`, {});
      kicked = Boolean(kickRes?.data?.kicked ?? kickRes?.data?.data?.kicked);
    } catch {
      kicked = false;
    }
    await auditLog({ userId: req.user.id, action: 'player.ban', target: req.params.id, ip: req.ip });
    res.json({ ok: true, data: { banned: true, kicked } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/unban', requirePermission('account.ban'), async (req, res) => {
  try {
    const rows = await query('SELECT account_id, name FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    await query('UPDATE account SET ban = 0 WHERE id = ?', [rows[0].account_id]);
    await auditLog({ userId: req.user.id, action: 'player.unban', target: req.params.id, ip: req.ip });
    res.json({ ok: true, data: { banned: false, message: `Đã unban ${rows[0].name}` } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/kick', requirePermission('player.kick'), async (req, res) => {
  try {
    const rows = await query('SELECT name FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    const result = await agentPost(sid, `/players/${encodeURIComponent(rows[0].name)}/kick`, {});
    const kicked = Boolean(result?.data?.kicked ?? result?.data?.data?.kicked);
    await auditLog({ userId: req.user.id, serverId: sid, action: 'player.kick', target: rows[0].name, response: result, ip: req.ip });
    if (!kicked) {
      return res.json({ ok: true, data: { kicked: false, message: 'Player không online hoặc không tìm thấy trên server' } });
    }
    res.json({ ok: true, data: { kicked: true, message: `Đã kick ${rows[0].name}` } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/buff-vnd', requirePermission('player.buff'), async (req, res) => {
  const amount = Number(req.body?.amount || 0);
  if (!amount) return res.status(400).json({ ok: false, error: 'amount required' });
  try {
    const rows = await query('SELECT name, account_id FROM player WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const sid = Number(req.body?.serverId || await getDefaultServerId());

    let online = false;
    try {
      const one = await agentGet(sid, `/players/${encodeURIComponent(rows[0].name)}`);
      online = Boolean(one?.data);
    } catch {
      online = false;
    }

    if (online) {
      const result = await agentPost(sid, `/players/${encodeURIComponent(rows[0].name)}/buff-vnd`, { amount });
      await auditLog({ userId: req.user.id, serverId: sid, action: 'player.buff.vnd', target: rows[0].name, requestBody: req.body, response: result, ip: req.ip });
      return res.json({ ok: true, data: { mode: 'online', amount, message: `Buff ${amount} VND (online) cho ${rows[0].name}` } });
    }

    const acc = await query('SELECT vnd FROM account WHERE id = ?', [rows[0].account_id]);
    const newVnd = Number(acc[0]?.vnd || 0) + amount;
    await query('UPDATE account SET vnd = ? WHERE id = ?', [newVnd, rows[0].account_id]);
    await auditLog({ userId: req.user.id, action: 'player.buff.vnd.db', target: rows[0].name, requestBody: req.body, ip: req.ip });
    res.json({ ok: true, data: { mode: 'database', amount, vnd: newVnd, message: `Buff ${amount} VND vào DB (offline). VND mới: ${newVnd}` } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
