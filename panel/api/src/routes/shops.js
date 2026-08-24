import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { reloadShop } from '../services/liveSync.js';
import { canonicalItemShopTabId, resolveItemShopTabIds } from '../utils/shopTabIds.js';
import { ensureGenderOverrideColumn, hasGenderOverrideColumn } from '../services/shopSchema.js';

const router = Router();
router.use(authMiddleware);

async function loadItemTemplates(tempIds) {
  if (!tempIds.length) return {};
  const placeholders = tempIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT id, NAME, icon_id, type, gender, power_require FROM item_template WHERE id IN (${placeholders})`,
    tempIds
  );
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

function parseGenderOverride(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function effectiveShopItemGender(templateGender, overrideRaw) {
  const override = parseGenderOverride(overrideRaw);
  if (override != null) return override;
  return templateGender != null ? Number(templateGender) : 3;
}

async function enrichItems(items) {
  const tempIds = [...new Set(items.map((i) => i.temp_id).filter(Boolean))];
  const tplMap = await loadItemTemplates(tempIds);
  return items.map((item) => {
    const tpl = tplMap[item.temp_id];
    const templateGender = tpl?.gender != null ? Number(tpl.gender) : 3;
    const genderOverride = parseGenderOverride(item.gender_override);
    return {
      ...item,
      is_new: Number(item.is_new) === 1 ? 1 : 0,
      is_sell: Number(item.is_sell) === 1 ? 1 : 0,
      item_name: tpl?.NAME || null,
      icon_id: tpl?.icon_id ?? null,
      item_type: tpl?.type ?? null,
      template_gender: templateGender,
      gender_override: genderOverride,
      item_gender: effectiveShopItemGender(templateGender, genderOverride),
      item_str_require: tpl?.power_require != null ? Number(tpl.power_require) : 0,
      display_icon: item.icon_spec > 0 ? item.icon_spec : (tpl?.icon_id ?? null),
    };
  });
}

async function loadTabItems(tabId, { sellOnly = false } = {}) {
  await ensureGenderOverrideColumn();
  const tabIds = resolveItemShopTabIds(tabId);
  const placeholders = tabIds.map(() => '?').join(',');
  let sql = `SELECT * FROM item_shop WHERE tab_id IN (${placeholders})`;
  if (sellOnly) sql += ' AND is_sell = 1';
  sql += ' ORDER BY sort_order ASC, id ASC';
  const items = await query(sql, tabIds);
  for (const item of items) {
    const opts = await query(
      'SELECT option_id, param FROM item_shop_option WHERE item_shop_id = ?',
      [item.id]
    );
    item.options = opts.map((o) => ({ id: o.option_id, param: o.param }));
  }
  return enrichItems(items);
}

async function saveItemOptions(itemShopId, options = []) {
  await query('DELETE FROM item_shop_option WHERE item_shop_id = ?', [itemShopId]);
  for (const o of options) {
    await exec(
      'INSERT INTO item_shop_option (item_shop_id, option_id, param) VALUES (?, ?, ?)',
      [itemShopId, o.id, o.param ?? 0]
    );
  }
}

/** Khớp TabShop.isItemForRace — gender = race hoặc Chung (≥3) */
function itemTemplateRaceClause(raceRaw) {
  const race = String(raceRaw ?? '').trim();
  if (race === '' || !['0', '1', '2'].includes(race)) {
    return { sql: '', params: [] };
  }
  return { sql: ' AND (gender = ? OR gender >= 3)', params: [Number(race)] };
}

router.get('/meta/item-templates', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const raceClause = itemTemplateRaceClause(req.query.race);
    if (q) {
      const num = Number(q);
      const like = `%${q}%`;
      const idLike = `%${q}%`;
      const rows = await query(
        `SELECT id, NAME AS name, type, icon_id, gender FROM item_template
         WHERE (NAME LIKE ? OR id = ? OR CAST(id AS CHAR) LIKE ?)${raceClause.sql}
         ORDER BY CASE WHEN id = ? THEN 0 WHEN CAST(id AS CHAR) LIKE ? THEN 1 WHEN NAME LIKE ? THEN 2 ELSE 3 END, id
         LIMIT ?`,
        [
          like,
          Number.isNaN(num) ? -1 : num,
          idLike,
          ...raceClause.params,
          Number.isNaN(num) ? -1 : num,
          `${q}%`,
          `${q}%`,
          limit,
        ]
      );
      return res.json({
        ok: true,
        data: rows.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          icon_id: r.icon_id != null ? Number(r.icon_id) : null,
          gender: r.gender != null ? Number(r.gender) : 3,
        })),
      });
    }
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const rows = await query(
      `SELECT id, NAME AS name, type, icon_id, gender FROM item_template WHERE 1=1${raceClause.sql} ORDER BY id LIMIT ? OFFSET ?`,
      [...raceClause.params, limit, offset]
    );
    res.json({
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        icon_id: r.icon_id != null ? Number(r.icon_id) : null,
        gender: r.gender != null ? Number(r.gender) : 3,
      })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/meta/item-templates/batch', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const raw = String(req.query.ids || '').trim();
    const ids = [...new Set(
      raw.split(/[,;\s]+/).map((x) => Number(x)).filter((n) => n > 0 && !Number.isNaN(n))
    )].slice(0, 200);
    if (!ids.length) return res.json({ ok: true, data: [] });
    const placeholders = ids.map(() => '?').join(',');
    const rows = await query(
      `SELECT id, NAME AS name, type, icon_id, gender FROM item_template WHERE id IN (${placeholders})`,
      ids
    );
    res.json({
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        icon_id: r.icon_id != null ? Number(r.icon_id) : null,
        gender: r.gender != null ? Number(r.gender) : 3,
      })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const shops = await query('SELECT id, npc_id, tag_name, type_shop FROM shop ORDER BY id');
    for (const shop of shops) {
      const tabs = await query('SELECT id FROM tab_shop WHERE shop_id = ?', [shop.id]);
      let itemCount = 0;
      for (const tab of tabs) {
        const tabIds = resolveItemShopTabIds(tab.id);
        const ph = tabIds.map(() => '?').join(',');
        const cnt = await query(
          `SELECT COUNT(DISTINCT id) AS c FROM item_shop WHERE tab_id IN (${ph}) AND is_sell = 1`,
          tabIds
        );
        itemCount += cnt[0]?.c ?? 0;
      }
      shop.tab_count = tabs.length;
      shop.item_count = itemCount;
    }
    res.json({ ok: true, data: shops });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const shops = await query('SELECT * FROM shop WHERE id = ? LIMIT 1', [req.params.id]);
    if (!shops.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const tabs = await query('SELECT * FROM tab_shop WHERE shop_id = ? ORDER BY id', [req.params.id]);
    for (const tab of tabs) {
      tab.items = await loadTabItems(tab.id, { sellOnly: false });
    }
    res.json({ ok: true, data: { ...shops[0], tabs } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/tabs/:tabId/items', requirePermission('giftcode.manage'), async (req, res) => {
  const { temp_id, cost, type_sell, is_sell, icon_spec, options } = req.body || {};
  if (!temp_id) return res.status(400).json({ ok: false, error: 'Cần temp_id (item template)' });
  try {
    const tabId = canonicalItemShopTabId(req.params.tabId);
    const tabIds = resolveItemShopTabIds(req.params.tabId);
    const ph = tabIds.map(() => '?').join(',');
    const maxRow = await query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM item_shop WHERE tab_id IN (${ph})`,
      tabIds
    );
    const sortOrder = maxRow[0]?.next_order ?? 0;
    const result = await exec(
      `INSERT INTO item_shop (tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec, sort_order)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
      [
        tabId,
        temp_id,
        is_sell ?? 1,
        type_sell ?? 0,
        cost ?? 0,
        icon_spec ?? 0,
        sortOrder,
      ]
    );
    if (options?.length) await saveItemOptions(result.insertId, options);
    await auditLog({
      userId: req.user.id,
      action: 'shop.item.create',
      target: result.insertId,
      requestBody: req.body,
      ip: req.ip,
    });
    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { id: result.insertId, sort_order: sortOrder, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/tabs/:tabId/items/bulk-create', requirePermission('giftcode.manage'), async (req, res) => {
  const rows = req.body?.items;
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ ok: false, error: 'Cần mảng items [{ temp_id, options?, cost?, type_sell? }]' });
  }
  try {
    const tabId = canonicalItemShopTabId(req.params.tabId);
    const tabIds = resolveItemShopTabIds(req.params.tabId);
    const ph = tabIds.map(() => '?').join(',');
    const maxRow = await query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM item_shop WHERE tab_id IN (${ph})`,
      tabIds
    );
    let sortOrder = maxRow[0]?.next_order ?? 0;
    const createdIds = [];

    for (const row of rows) {
      const tempId = Number(row?.temp_id);
      if (!tempId || Number.isNaN(tempId)) continue;
      const tplRows = await query(
        'SELECT id FROM item_template WHERE id = ? LIMIT 1',
        [tempId]
      );
      if (!tplRows.length) continue;

      const result = await exec(
        `INSERT INTO item_shop (tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec, sort_order)
         VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
        [
          tabId,
          tempId,
          row.is_sell ?? 1,
          row.type_sell ?? 0,
          row.cost ?? 0,
          row.icon_spec ?? 0,
          sortOrder,
        ]
      );
      sortOrder += 1;
      const itemShopId = result.insertId;
      createdIds.push(itemShopId);
      if (row.options?.length) await saveItemOptions(itemShopId, row.options);
    }

    if (!createdIds.length) {
      return res.status(400).json({ ok: false, error: 'Không tạo được item — kiểm tra temp_id' });
    }

    const placeholders = createdIds.map(() => '?').join(',');
    const inserted = await query(`SELECT * FROM item_shop WHERE id IN (${placeholders})`, createdIds);
    const orderOf = new Map(createdIds.map((id, i) => [Number(id), i]));
    inserted.sort((a, b) => (orderOf.get(Number(a.id)) ?? 0) - (orderOf.get(Number(b.id)) ?? 0));
    const enriched = await enrichItems(inserted);

    await auditLog({
      userId: req.user.id,
      action: 'shop.tab.bulk_create',
      target: req.params.tabId,
      requestBody: { count: enriched.length },
      ip: req.ip,
    });
    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { created: enriched, count: enriched.length, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/tabs/:tabId/items/bulk', requirePermission('giftcode.manage'), async (req, res) => {
  const rows = req.body?.items;
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ ok: false, error: 'Cần mảng items [{ id, cost, ... }]' });
  }
  try {
    let saved = 0;
    await ensureGenderOverrideColumn();
    const genderCol = await hasGenderOverrideColumn();
    for (const row of rows) {
      if (!row?.id) continue;
      const genderOverride = genderCol && Object.prototype.hasOwnProperty.call(row, 'gender_override')
        ? parseGenderOverride(row.gender_override)
        : undefined;
      await query(
        `UPDATE item_shop SET
           cost = COALESCE(?, cost),
           type_sell = COALESCE(?, type_sell),
           is_sell = COALESCE(?, is_sell),
           icon_spec = COALESCE(?, icon_spec),
           is_new = COALESCE(?, is_new)${genderOverride !== undefined ? ', gender_override = ?' : ''}
         WHERE id = ?`,
        [
          row.cost ?? null,
          row.type_sell ?? null,
          row.is_sell ?? null,
          row.icon_spec ?? null,
          row.is_new ?? null,
          ...(genderOverride !== undefined ? [genderOverride] : []),
          row.id,
        ]
      );
      if (row.options != null) await saveItemOptions(row.id, row.options);
      saved += 1;
    }
    await auditLog({
      userId: req.user.id,
      action: 'shop.tab.bulk_update',
      target: req.params.tabId,
      requestBody: { count: saved },
      ip: req.ip,
    });
    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { saved, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/items/:itemId', requirePermission('giftcode.manage'), async (req, res) => {
  const { cost, type_sell, is_sell, icon_spec, temp_id, sort_order, is_new, options, gender_override } = req.body || {};
  try {
    await ensureGenderOverrideColumn();
    const genderCol = await hasGenderOverrideColumn();
    const genderOverride = genderCol && Object.prototype.hasOwnProperty.call(req.body || {}, 'gender_override')
      ? parseGenderOverride(gender_override)
      : undefined;
    await query(
      `UPDATE item_shop SET
         cost = COALESCE(?, cost),
         type_sell = COALESCE(?, type_sell),
         is_sell = COALESCE(?, is_sell),
         icon_spec = COALESCE(?, icon_spec),
         temp_id = COALESCE(?, temp_id),
         sort_order = COALESCE(?, sort_order),
         is_new = COALESCE(?, is_new)${genderOverride !== undefined ? ', gender_override = ?' : ''}
       WHERE id = ?`,
      [
        cost ?? null,
        type_sell ?? null,
        is_sell ?? null,
        icon_spec ?? null,
        temp_id ?? null,
        sort_order ?? null,
        is_new ?? null,
        ...(genderOverride !== undefined ? [genderOverride] : []),
        req.params.itemId,
      ]
    );
    if (options != null) await saveItemOptions(req.params.itemId, options);
    await auditLog({
      userId: req.user.id,
      action: 'shop.item.update',
      target: req.params.itemId,
      requestBody: req.body,
      ip: req.ip,
    });
    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/tabs/:tabId/reorder', requirePermission('giftcode.manage'), async (req, res) => {
  const order = req.body?.order;
  if (!Array.isArray(order) || !order.length) {
    return res.status(400).json({ ok: false, error: 'Cần mảng order [item_shop_id,...]' });
  }
  try {
    const tabId = canonicalItemShopTabId(req.params.tabId);
    for (let i = 0; i < order.length; i++) {
      await query(
        'UPDATE item_shop SET sort_order = ?, tab_id = ? WHERE id = ?',
        [i, tabId, order[i]]
      );
    }
    await auditLog({
      userId: req.user.id,
      action: 'shop.tab.reorder',
      target: req.params.tabId,
      requestBody: req.body,
      ip: req.ip,
    });
    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/items/:itemId', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    await query('DELETE FROM item_shop_option WHERE item_shop_id = ?', [req.params.itemId]);
    await query('DELETE FROM item_shop WHERE id = ?', [req.params.itemId]);
    await auditLog({
      userId: req.user.id,
      action: 'shop.item.delete',
      target: req.params.itemId,
      ip: req.ip,
    });
    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/reload', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    const result = await agentPost(sid, '/reload/shop', {});
    await auditLog({ userId: req.user.id, action: 'shop.reload', ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
