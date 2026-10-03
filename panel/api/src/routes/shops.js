import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, withTransaction } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { reloadShop } from '../services/liveSync.js';
import { canonicalItemShopTabId, resolveItemShopTabIds } from '../utils/shopTabIds.js';
import { ensureGenderOverrideColumn, hasGenderOverrideColumn, ensureShopSnapshotTable } from '../services/shopSchema.js';

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

async function saveItemOptions(conn, itemShopId, options = []) {
  await conn.execute('DELETE FROM item_shop_option WHERE item_shop_id = ?', [itemShopId]);
  for (const o of options) {
    await conn.execute(
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
    const created = await withTransaction(async (conn) => {
      const [maxRows] = await conn.execute(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM item_shop WHERE tab_id IN (${ph})`,
        tabIds
      );
      const sortOrder = maxRows[0]?.next_order ?? 0;
      const [result] = await conn.execute(
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
      await saveItemOptions(conn, result.insertId, options || []);
      return { id: result.insertId, sortOrder };
    });
    const result = { insertId: created.id };
    const sortOrder = created.sortOrder;
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
    const createdIds = await withTransaction(async (conn) => {
      const [maxRows] = await conn.execute(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM item_shop WHERE tab_id IN (${ph})`,
        tabIds
      );
      let sortOrder = maxRows[0]?.next_order ?? 0;
      const ids = [];
      for (const row of rows) {
        const tempId = Number(row?.temp_id);
        if (!tempId || Number.isNaN(tempId)) continue;
        const [tplRows] = await conn.execute(
          'SELECT id FROM item_template WHERE id = ? LIMIT 1',
          [tempId]
        );
        if (!tplRows.length) continue;
        const [result] = await conn.execute(
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
        ids.push(result.insertId);
        await saveItemOptions(conn, result.insertId, row.options || []);
      }
      return ids;
    });

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
  if (!Array.isArray(rows)) {
    return res.status(400).json({ ok: false, error: 'Cần mảng items [{ id?, temp_id, cost, ... }]' });
  }
  try {
    await ensureGenderOverrideColumn();
    const genderCol = await hasGenderOverrideColumn();
    const tabId = canonicalItemShopTabId(req.params.tabId);
    const tabIds = resolveItemShopTabIds(req.params.tabId);
    const saved = await withTransaction(async (conn) => {
      const retainedIds = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const tempId = Number(row?.temp_id);
        if (!tempId || Number.isNaN(tempId)) continue;

        const rowId = (typeof row.id === 'number' && row.id > 0) ? row.id : null;
        const genderOverride = genderCol ? parseGenderOverride(row.gender_override) : undefined;
        const isSell = row.is_sell != null ? (row.is_sell ? 1 : 0) : 1;
        const typeSell = Number(row.type_sell) || 0;
        const cost = Number(row.cost) || 0;
        const iconSpec = Number(row.icon_spec) || 0;
        const isNew = row.is_new ? 1 : 0;
        const sortOrder = i;

        if (rowId) {
          await conn.execute(
            `UPDATE item_shop SET
               tab_id = ?,
               temp_id = ?,
               cost = ?,
               type_sell = ?,
               is_sell = ?,
               icon_spec = ?,
               is_new = ?,
               sort_order = ?${genderOverride !== undefined ? ', gender_override = ?' : ''}
             WHERE id = ?`,
            [
              tabId,
              tempId,
              cost,
              typeSell,
              isSell,
              iconSpec,
              isNew,
              sortOrder,
              ...(genderOverride !== undefined ? [genderOverride] : []),
              rowId,
            ]
          );
          if (row.options != null) {
            await saveItemOptions(conn, rowId, row.options);
          }
          retainedIds.push(rowId);
        } else {
          const [insertRes] = await conn.execute(
            `INSERT INTO item_shop (tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec, sort_order${genderOverride !== undefined ? ', gender_override' : ''})
             VALUES (?, ?, ?, ?, ?, ?, ?, ?${genderOverride !== undefined ? ', ?' : ''})`,
            [
              tabId,
              tempId,
              isNew,
              isSell,
              typeSell,
              cost,
              iconSpec,
              sortOrder,
              ...(genderOverride !== undefined ? [genderOverride] : []),
            ]
          );
          const newId = insertRes.insertId;
          if (row.options != null && row.options.length > 0) {
            await saveItemOptions(conn, newId, row.options);
          }
          retainedIds.push(newId);
        }
      }

      // Xóa các vật phẩm trong tab này đã bị gỡ bỏ khỏi danh sách
      const placeholders = tabIds.map(() => '?').join(',');
      let deleteSql = `SELECT id FROM item_shop WHERE tab_id IN (${placeholders})`;
      const queryParams = [...tabIds];
      if (retainedIds.length > 0) {
        const retainPh = retainedIds.map(() => '?').join(',');
        deleteSql += ` AND id NOT IN (${retainPh})`;
        queryParams.push(...retainedIds);
      }
      const [toDelete] = await conn.execute(deleteSql, queryParams);
      for (const d of toDelete) {
        await conn.execute('DELETE FROM item_shop_option WHERE item_shop_id = ?', [d.id]);
        await conn.execute('DELETE FROM item_shop WHERE id = ?', [d.id]);
      }

      return retainedIds.length;
    });
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
    await withTransaction(async (conn) => {
      await conn.execute(
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
      if (options != null) await saveItemOptions(conn, req.params.itemId, options);
    });
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
    await withTransaction(async (conn) => {
      for (let i = 0; i < order.length; i++) {
        await conn.execute(
          'UPDATE item_shop SET sort_order = ?, tab_id = ? WHERE id = ?',
          [i, tabId, order[i]]
        );
      }
    });
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
    await withTransaction(async (conn) => {
      await conn.execute('DELETE FROM item_shop_option WHERE item_shop_id = ?', [req.params.itemId]);
      await conn.execute('DELETE FROM item_shop WHERE id = ?', [req.params.itemId]);
    });
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

// --- CRUD SHOP (LƯU BỀN VỮNG MYSQL) ---
router.post('/', requirePermission('giftcode.manage'), async (req, res) => {
  const { npc_id, tag_name, type_shop, initial_tab_name, serverId } = req.body || {};
  if (npc_id == null || !tag_name) {
    return res.status(400).json({ ok: false, error: 'Cần npc_id và tag_name' });
  }
  try {
    const created = await withTransaction(async (conn) => {
      const [resShop] = await conn.execute(
        'INSERT INTO shop (npc_id, tag_name, type_shop) VALUES (?, ?, ?)',
        [Number(npc_id), String(tag_name).trim(), Number(type_shop || 0)]
      );
      const shopId = resShop.insertId;
      const tabName = (initial_tab_name || 'Hàng mới').trim();
      const [resTab] = await conn.execute(
        'INSERT INTO tab_shop (shop_id, name) VALUES (?, ?)',
        [shopId, tabName]
      );
      return { shopId, tabId: resTab.insertId };
    });

    await auditLog({
      userId: req.user.id,
      action: 'shop.create',
      target: created.shopId,
      requestBody: req.body,
      ip: req.ip,
    });
    const liveSync = await reloadShop(serverId);
    res.json({ ok: true, data: { ...created, persisted: true, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  const { npc_id, tag_name, type_shop, serverId } = req.body || {};
  try {
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE shop SET
           npc_id = COALESCE(?, npc_id),
           tag_name = COALESCE(?, tag_name),
           type_shop = COALESCE(?, type_shop)
         WHERE id = ?`,
        [
          npc_id != null ? Number(npc_id) : null,
          tag_name != null ? String(tag_name).trim() : null,
          type_shop != null ? Number(type_shop) : null,
          req.params.id,
        ]
      );
    });

    await auditLog({
      userId: req.user.id,
      action: 'shop.update',
      target: req.params.id,
      requestBody: req.body,
      ip: req.ip,
    });
    const liveSync = await reloadShop(serverId);
    res.json({ ok: true, data: { persisted: true, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    await withTransaction(async (conn) => {
      const [tabs] = await conn.execute('SELECT id FROM tab_shop WHERE shop_id = ?', [req.params.id]);
      for (const t of tabs) {
        const [items] = await conn.execute('SELECT id FROM item_shop WHERE tab_id = ?', [t.id]);
        for (const it of items) {
          await conn.execute('DELETE FROM item_shop_option WHERE item_shop_id = ?', [it.id]);
        }
        await conn.execute('DELETE FROM item_shop WHERE tab_id = ?', [t.id]);
      }
      await conn.execute('DELETE FROM tab_shop WHERE shop_id = ?', [req.params.id]);
      await conn.execute('DELETE FROM shop WHERE id = ?', [req.params.id]);
    });

    await auditLog({
      userId: req.user.id,
      action: 'shop.delete',
      target: req.params.id,
      ip: req.ip,
    });
    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { persisted: true, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- CRUD TAB SHOP ---
router.post('/:shopId/tabs', requirePermission('giftcode.manage'), async (req, res) => {
  const { name, serverId } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ ok: false, error: 'Tên tab không được để trống' });
  }
  try {
    const created = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        'INSERT INTO tab_shop (shop_id, name) VALUES (?, ?)',
        [req.params.shopId, String(name).trim()]
      );
      return { id: result.insertId };
    });

    await auditLog({
      userId: req.user.id,
      action: 'shop.tab.create',
      target: created.id,
      requestBody: req.body,
      ip: req.ip,
    });
    const liveSync = await reloadShop(serverId);
    res.json({ ok: true, data: { id: created.id, persisted: true, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/tabs/:tabId', requirePermission('giftcode.manage'), async (req, res) => {
  const { name, serverId } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ ok: false, error: 'Tên tab không được để trống' });
  }
  try {
    await withTransaction(async (conn) => {
      await conn.execute('UPDATE tab_shop SET name = ? WHERE id = ?', [String(name).trim(), req.params.tabId]);
    });

    await auditLog({
      userId: req.user.id,
      action: 'shop.tab.update',
      target: req.params.tabId,
      requestBody: req.body,
      ip: req.ip,
    });
    const liveSync = await reloadShop(serverId);
    res.json({ ok: true, data: { persisted: true, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/tabs/:tabId', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    await withTransaction(async (conn) => {
      const [items] = await conn.execute('SELECT id FROM item_shop WHERE tab_id = ?', [req.params.tabId]);
      for (const it of items) {
        await conn.execute('DELETE FROM item_shop_option WHERE item_shop_id = ?', [it.id]);
      }
      await conn.execute('DELETE FROM item_shop WHERE tab_id = ?', [req.params.tabId]);
      await conn.execute('DELETE FROM tab_shop WHERE id = ?', [req.params.tabId]);
    });

    await auditLog({
      userId: req.user.id,
      action: 'shop.tab.delete',
      target: req.params.tabId,
      ip: req.ip,
    });
    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { persisted: true, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- CLONE TAB VÀ CLONE SHOP ---
router.post('/tabs/:tabId/clone', requirePermission('giftcode.manage'), async (req, res) => {
  const { targetShopId, newTabName, serverId } = req.body || {};
  try {
    const cloned = await withTransaction(async (conn) => {
      const [srcTabs] = await conn.execute('SELECT * FROM tab_shop WHERE id = ? LIMIT 1', [req.params.tabId]);
      if (!srcTabs.length) throw new Error('Tab gốc không tồn tại');
      const srcTab = srcTabs[0];
      const targetId = targetShopId ? Number(targetShopId) : srcTab.shop_id;
      const tabName = (newTabName || `${srcTab.name} (Copy)`).trim();

      const [tabRes] = await conn.execute('INSERT INTO tab_shop (shop_id, name) VALUES (?, ?)', [targetId, tabName]);
      const newTabId = tabRes.insertId;

      const [srcItems] = await conn.execute('SELECT * FROM item_shop WHERE tab_id = ? ORDER BY sort_order, id', [req.params.tabId]);
      for (const item of srcItems) {
        const [itRes] = await conn.execute(
          `INSERT INTO item_shop (tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [newTabId, item.temp_id, item.is_new, item.is_sell, item.type_sell, item.cost, item.icon_spec, item.sort_order]
        );
        const [options] = await conn.execute('SELECT option_id, param FROM item_shop_option WHERE item_shop_id = ?', [item.id]);
        for (const opt of options) {
          await conn.execute(
            'INSERT INTO item_shop_option (item_shop_id, option_id, param) VALUES (?, ?, ?)',
            [itRes.insertId, opt.option_id, opt.param]
          );
        }
      }
      return { tabId: newTabId, itemCount: srcItems.length };
    });

    const liveSync = await reloadShop(serverId);
    res.json({ ok: true, data: { ...cloned, persisted: true, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- SNAPSHOT & ROLLBACK CHO SHOP ---
router.post('/snapshots', requirePermission('giftcode.manage'), async (req, res) => {
  const { shopId, title, description } = req.body || {};
  try {
    await ensureShopSnapshotTable();
    // Xuất dữ liệu shop
    let shopData = [];
    if (shopId) {
      const [s] = await query('SELECT * FROM shop WHERE id = ? LIMIT 1', [shopId]);
      if (s) {
        const tabs = await query('SELECT * FROM tab_shop WHERE shop_id = ? ORDER BY id', [shopId]);
        for (const t of tabs) {
          t.items = await query('SELECT * FROM item_shop WHERE tab_id = ? ORDER BY sort_order, id', [t.id]);
          for (const it of t.items) {
            it.options = await query('SELECT option_id, param FROM item_shop_option WHERE item_shop_id = ?', [it.id]);
          }
        }
        shopData = [{ ...s, tabs }];
      }
    } else {
      const shops = await query('SELECT * FROM shop ORDER BY id');
      for (const s of shops) {
        const tabs = await query('SELECT * FROM tab_shop WHERE shop_id = ? ORDER BY id', [s.id]);
        for (const t of tabs) {
          t.items = await query('SELECT * FROM item_shop WHERE tab_id = ? ORDER BY sort_order, id', [t.id]);
          for (const it of t.items) {
            it.options = await query('SELECT option_id, param FROM item_shop_option WHERE item_shop_id = ?', [it.id]);
          }
        }
        s.tabs = tabs;
      }
      shopData = shops;
    }

    const snapTitle = title || (shopId ? `Sao lưu Shop #${shopId}` : 'Sao lưu toàn bộ Shop');
    const [resInsert] = await query(
      'INSERT INTO panel_shop_snapshots (shop_id, title, description, snapshot_data, created_by) VALUES (?, ?, ?, ?, ?)',
      [shopId || null, snapTitle, description || null, JSON.stringify(shopData), req.user.id]
    );

    res.json({ ok: true, data: { id: resInsert.insertId, title: snapTitle } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/snapshots', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    await ensureShopSnapshotTable();
    const rows = await query(
      `SELECT s.id, s.shop_id, s.title, s.description, s.created_at, u.username AS creator_name
       FROM panel_shop_snapshots s
       LEFT JOIN panel_users u ON u.id = s.created_by
       ORDER BY s.id DESC LIMIT 50`
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/snapshots/:id/rollback', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    await ensureShopSnapshotTable();
    const [snap] = await query('SELECT * FROM panel_shop_snapshots WHERE id = ? LIMIT 1', [req.params.id]);
    if (!snap) return res.status(404).json({ ok: false, error: 'Snapshot không tồn tại' });
    const shops = JSON.parse(snap.snapshot_data);

    await withTransaction(async (conn) => {
      for (const s of shops) {
        // Xóa shop cũ và các tab/item cũ nếu có
        const [oldTabs] = await conn.execute('SELECT id FROM tab_shop WHERE shop_id = ?', [s.id]);
        for (const ot of oldTabs) {
          const [oldItems] = await conn.execute('SELECT id FROM item_shop WHERE tab_id = ?', [ot.id]);
          for (const oit of oldItems) {
            await conn.execute('DELETE FROM item_shop_option WHERE item_shop_id = ?', [oit.id]);
          }
          await conn.execute('DELETE FROM item_shop WHERE tab_id = ?', [ot.id]);
        }
        await conn.execute('DELETE FROM tab_shop WHERE shop_id = ?', [s.id]);
        await conn.execute('DELETE FROM shop WHERE id = ?', [s.id]);

        // Phục hồi lại shop
        await conn.execute(
          'INSERT INTO shop (id, npc_id, tag_name, type_shop) VALUES (?, ?, ?, ?)',
          [s.id, s.npc_id, s.tag_name, s.type_shop]
        );

        for (const t of (s.tabs || [])) {
          await conn.execute(
            'INSERT INTO tab_shop (id, shop_id, name) VALUES (?, ?, ?)',
            [t.id, s.id, t.name]
          );
          for (const it of (t.items || [])) {
            await conn.execute(
              `INSERT INTO item_shop (id, tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [it.id, t.id, it.temp_id, it.is_new, it.is_sell, it.type_sell, it.cost, it.icon_spec, it.sort_order]
            );
            for (const opt of (it.options || [])) {
              await conn.execute(
                'INSERT INTO item_shop_option (item_shop_id, option_id, param) VALUES (?, ?, ?)',
                [it.id, opt.option_id, opt.param]
              );
            }
          }
        }
      }
    });

    const liveSync = await reloadShop(req.body?.serverId);
    res.json({ ok: true, data: { rolledBack: true, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- XUẤT SQL DUMP CHO SHOP ---
router.get('/export-sql/:id?', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const shopId = req.params.id ? Number(req.params.id) : null;
    let sql = `-- EXPORT SHOP DATA FROM PANEL - ${new Date().toISOString()}\n`;
    sql += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

    let shops = [];
    if (shopId) {
      shops = await query('SELECT * FROM shop WHERE id = ?', [shopId]);
    } else {
      shops = await query('SELECT * FROM shop ORDER BY id');
    }

    for (const s of shops) {
      sql += `-- SHOP #${s.id} (NPC: ${s.npc_id}, Tag: ${s.tag_name})\n`;
      sql += `REPLACE INTO shop (id, npc_id, tag_name, type_shop) VALUES (${s.id}, ${s.npc_id}, '${s.tag_name.replace(/'/g, "\\'")}', ${s.type_shop});\n`;

      const tabs = await query('SELECT * FROM tab_shop WHERE shop_id = ? ORDER BY id', [s.id]);
      for (const t of tabs) {
        sql += `REPLACE INTO tab_shop (id, shop_id, name) VALUES (${t.id}, ${t.shop_id}, '${t.name.replace(/'/g, "\\'")}');\n`;
        const items = await query('SELECT * FROM item_shop WHERE tab_id = ? ORDER BY sort_order, id', [t.id]);
        for (const it of items) {
          sql += `REPLACE INTO item_shop (id, tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec, sort_order) VALUES (${it.id}, ${it.tab_id}, ${it.temp_id}, ${it.is_new}, ${it.is_sell}, ${it.type_sell}, ${it.cost}, ${it.icon_spec}, ${it.sort_order});\n`;
          const opts = await query('SELECT option_id, param FROM item_shop_option WHERE item_shop_id = ?', [it.id]);
          for (const o of opts) {
            sql += `REPLACE INTO item_shop_option (item_shop_id, option_id, param) VALUES (${it.id}, ${o.option_id}, ${o.param});\n`;
          }
        }
      }
      sql += '\n';
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="shop_dump_${shopId || 'all'}_${Date.now()}.sql"`);
    res.send(sql);
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
