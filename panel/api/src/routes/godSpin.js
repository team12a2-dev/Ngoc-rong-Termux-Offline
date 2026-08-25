import express from 'express';
import { exec, query, withTransaction } from '../db.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { auditLog } from '../services/audit.js';
import { reloadGodSpin } from '../services/liveSync.js';
import { getDefaultServerId } from '../services/serverRegistry.js';

const router = express.Router();
router.use(authMiddleware);

const asJson = (value, fallback = null) => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const json = (value) => value == null ? null : JSON.stringify(value);
const integer = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
};
const bool = (value, fallback = false) => value == null ? fallback : value === true || value === 1 || value === '1' || value === 'true';
const dateValue = (value) => value ? String(value).replace('T', ' ').slice(0, 19) : null;
const serverId = async (value) => integer(value, await getDefaultServerId(), 1, 2147483647);

function normalizeConfig(body = {}) {
  const spinKey = String(body.spinKey || 'default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const name = String(body.name || '').trim();
  const startsAt = dateValue(body.startsAt);
  const endsAt = dateValue(body.endsAt);
  if (!spinKey || spinKey.length > 80) throw new Error('Mã vòng quay không hợp lệ.');
  if (!name || name.length > 160) throw new Error('Tên vòng quay bắt buộc và tối đa 160 ký tự.');
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
  const currencyMode = ['gem', 'gold', 'both'].includes(body.currencyMode) ? body.currencyMode : 'both';
  const status = ['draft', 'scheduled', 'active', 'paused', 'ended'].includes(body.status) ? body.status : 'draft';
  const items = Array.isArray(body.items) ? body.items : null;
  if ((body.enabled === true || body.enabled === 1 || status === 'active' || status === 'scheduled') && (!items || items.length === 0)) {
    throw new Error('Cấu hình đang bật/lên lịch phải có ít nhất một item.');
  }
  return {
    spinKey,
    name,
    description: String(body.description || '').trim() || null,
    status,
    enabled: bool(body.enabled, false) || status === 'active' || status === 'scheduled' ? 1 : 0,
    startsAt,
    endsAt,
    timezone: String(body.timezone || 'Asia/Ho_Chi_Minh').slice(0, 64),
    currencyMode,
    costGem: integer(body.costGem, 50, 0, 2000000000),
    costGold: integer(body.costGold, 2500000, 0, 2000000000),
    costTicket: integer(body.costTicket, 0, 0, 2000000000),
    ticketTempId: body.ticketTempId == null || body.ticketTempId === '' ? null : integer(body.ticketTempId, 0, 0, 2147483647),
    dailyLimit: integer(body.dailyLimit, 100, 1, 1000000),
    previewJson: body.previewJson || null,
    configJson: body.configJson || body.config || null,
    items,
  };
}

function normalizeItem(body = {}, index = 0) {
  const tempId = integer(body.tempId ?? body.templateId, -1, 0, 2147483647);
  const quantityMin = integer(body.quantityMin, 1, 1, 2147483647);
  const quantityMax = integer(body.quantityMax, quantityMin, quantityMin, 2147483647);
  const options = Array.isArray(body.options) ? body.options : asJson(body.optionsJson, []);
  if (tempId < 0) throw new Error(`Item #${index + 1}: tempId không hợp lệ.`);
  if (quantityMax < quantityMin) throw new Error(`Item #${index + 1}: số lượng tối đa phải >= tối thiểu.`);
  if (!Array.isArray(options)) throw new Error(`Item #${index + 1}: options phải là mảng.`);
  return {
    tempId,
    weight: integer(body.weight, 1, 1, 1000000000),
    quantityMin,
    quantityMax,
    options: options.slice(0, 50).map((option) => ({
      id: integer(option?.id ?? option?.optionId, -1, 0, 2147483647),
      param: integer(option?.param, 0, -2147483647, 2147483647),
      min: option?.min == null ? undefined : integer(option.min, 0, -2147483647, 2147483647),
      max: option?.max == null ? undefined : integer(option.max, 0, -2147483647, 2147483647),
    })).filter((option) => option.id >= 0),
    durationDays: body.durationDays == null || body.durationDays === '' ? null : integer(body.durationDays, 0, 0, 3650),
    vipOnly: bool(body.vipOnly, false) ? 1 : 0,
    enabled: bool(body.enabled, true) ? 1 : 0,
    maxWins: body.maxWins == null || body.maxWins === '' ? null : integer(body.maxWins, 0, 0, 2147483647),
    sortOrder: integer(body.sortOrder, index, -2147483647, 2147483647),
  };
}

async function validateItem(conn, item, index) {
  const [templates] = await conn.execute('SELECT id, NAME AS name, icon_id AS iconId FROM item_template WHERE id = ? LIMIT 1', [item.tempId]);
  if (!templates.length) throw new Error(`Item #${index + 1}: không tồn tại template #${item.tempId}.`);
  if (item.options.length) {
    const ids = [...new Set(item.options.map((option) => option.id))];
    const placeholders = ids.map(() => '?').join(',');
    const [options] = await conn.execute(`SELECT id FROM item_option_template WHERE id IN (${placeholders})`, ids);
    const known = new Set(options.map((option) => Number(option.id)));
    const invalid = ids.find((id) => !known.has(id));
    if (invalid != null) throw new Error(`Item #${index + 1}: option #${invalid} không tồn tại.`);
  }
  return templates[0];
}

async function validateAndInsertItems(conn, configId, items) {
  if (!items.length) throw new Error('Vòng quay phải có ít nhất một item.');
  const normalizedItems = items.map((raw, index) => normalizeItem(raw, index));
  const total = normalizedItems.reduce((sum, item) => sum + item.weight, 0);
  if (total > 2147483647) throw new Error('Tổng trọng số vượt giới hạn.');
  for (const [index, item] of normalizedItems.entries()) {
    await validateItem(conn, item, index);
    await conn.execute(
      `INSERT INTO panel_god_spin_items
       (config_id, temp_id, weight, quantity_min, quantity_max, options_json, duration_days, vip_only, enabled, max_wins, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [configId, item.tempId, item.weight, item.quantityMin, item.quantityMax, json(item.options), item.durationDays, item.vipOnly, item.enabled, item.maxWins, index]
    );
  }
}

async function loadConfig(id, sid) {
  const configs = await query('SELECT * FROM panel_god_spin_configs WHERE id = ? AND server_id = ? LIMIT 1', [id, sid]);
  if (!configs.length) return null;
  const items = await query('SELECT * FROM panel_god_spin_items WHERE config_id = ? ORDER BY sort_order, id', [id]);
  return {
    ...configs[0],
    previewJson: asJson(configs[0].preview_json, []),
    configJson: asJson(configs[0].config_json, {}),
    currencyMode: configs[0].currency_mode,
    costGem: Number(configs[0].cost_gem),
    costGold: Number(configs[0].cost_gold),
    costTicket: Number(configs[0].cost_ticket),
    ticketTempId: configs[0].ticket_temp_id == null ? null : Number(configs[0].ticket_temp_id),
    dailyLimit: Number(configs[0].daily_limit),
    items: items.map((item) => ({
      ...item,
      tempId: Number(item.temp_id),
      weight: Number(item.weight),
      quantityMin: Number(item.quantity_min),
      quantityMax: Number(item.quantity_max),
      options: asJson(item.options_json, []),
      durationDays: item.duration_days == null ? null : Number(item.duration_days),
      vipOnly: Boolean(item.vip_only),
      enabled: Boolean(item.enabled),
      maxWins: item.max_wins == null ? null : Number(item.max_wins),
    })),
  };
}

router.get('/catalog', requirePermission('godspin.view'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(100, Math.max(1, integer(req.query.limit, 30, 1)));
    const like = `%${q}%`;
    const rows = await query(
      `SELECT id, NAME AS name, icon_id AS iconId, description, level
       FROM item_template WHERE (? = '' OR NAME LIKE ? OR CAST(id AS CHAR) LIKE ?)
       ORDER BY id LIMIT ?`, [q, like, like, limit]
    );
    res.json({ ok: true, data: rows });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.get('/option-catalog', requirePermission('godspin.view'), async (_req, res) => {
  try {
    const rows = await query('SELECT id, NAME AS name FROM item_option_template ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.get('/', requirePermission('godspin.view'), async (req, res) => {
  try {
    const sid = await serverId(req.query.serverId);
    const rows = await query(
      `SELECT c.*, COUNT(i.id) AS item_count, COALESCE(SUM(CASE WHEN i.enabled = 1 THEN i.weight ELSE 0 END), 0) AS weight_total
       FROM panel_god_spin_configs c LEFT JOIN panel_god_spin_items i ON i.config_id = c.id
       WHERE c.server_id = ? GROUP BY c.id ORDER BY c.updated_at DESC, c.id DESC`, [sid]
    );
    res.json({ ok: true, data: rows.map((row) => ({ ...row, itemCount: Number(row.item_count), weightTotal: Number(row.weight_total) })) });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.get('/:id', requirePermission('godspin.view'), async (req, res) => {
  try {
    const data = await loadConfig(integer(req.params.id, 0, 1), await serverId(req.query.serverId));
    if (!data) return res.status(404).json({ ok: false, error: 'Không tìm thấy cấu hình vòng quay.' });
    res.json({ ok: true, data });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.post('/', requirePermission('godspin.manage'), async (req, res) => {
  try {
    const sid = await serverId(req.body?.serverId);
    const payload = normalizeConfig(req.body);
    const id = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO panel_god_spin_configs
         (server_id, spin_key, name, description, status, enabled, starts_at, ends_at, timezone, currency_mode,
          cost_gem, cost_gold, cost_ticket, ticket_temp_id, daily_limit, preview_json, config_json, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sid, payload.spinKey, payload.name, payload.description, payload.status, payload.enabled, payload.startsAt, payload.endsAt, payload.timezone,
          payload.currencyMode, payload.costGem, payload.costGold, payload.costTicket, payload.ticketTempId, payload.dailyLimit, json(payload.previewJson), json(payload.configJson), req.user?.id ?? null]
      );
      if (payload.items) await validateAndInsertItems(conn, result.insertId, payload.items);
      await conn.execute('INSERT INTO panel_god_spin_logs (config_id, payload, created_by) VALUES (?, ?, ?)', [result.insertId, json(payload), req.user?.id ?? null]);
      return result.insertId;
    });
    const liveSync = await reloadGodSpin(sid);
    await auditLog({ userId: req.user?.id, serverId: sid, action: 'godspin.create', target: `godspin:${id}`, requestBody: req.body, response: { liveSync }, ip: req.ip });
    res.status(201).json({ ok: true, data: { id, serverId: sid, liveSync } });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

router.put('/:id', requirePermission('godspin.manage'), async (req, res) => {
  try {
    const sid = await serverId(req.body?.serverId || req.query.serverId);
    const id = integer(req.params.id, 0, 1);
    const payload = normalizeConfig(req.body);
    const exists = await query('SELECT id FROM panel_god_spin_configs WHERE id = ? AND server_id = ? LIMIT 1', [id, sid]);
    if (!exists.length) return res.status(404).json({ ok: false, error: 'Không tìm thấy cấu hình vòng quay.' });
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE panel_god_spin_configs SET spin_key=?, name=?, description=?, status=?, enabled=?, starts_at=?, ends_at=?, timezone=?, currency_mode=?,
         cost_gem=?, cost_gold=?, cost_ticket=?, ticket_temp_id=?, daily_limit=?, preview_json=?, config_json=? WHERE id=? AND server_id=?`,
        [payload.spinKey, payload.name, payload.description, payload.status, payload.enabled, payload.startsAt, payload.endsAt, payload.timezone, payload.currencyMode,
          payload.costGem, payload.costGold, payload.costTicket, payload.ticketTempId, payload.dailyLimit, json(payload.previewJson), json(payload.configJson), id, sid]
      );
      if (payload.items) {
        await conn.execute('DELETE FROM panel_god_spin_items WHERE config_id = ?', [id]);
        await validateAndInsertItems(conn, id, payload.items);
      }
      await conn.execute('INSERT INTO panel_god_spin_logs (config_id, payload, created_by) VALUES (?, ?, ?)', [id, json(payload), req.user?.id ?? null]);
    });
    const liveSync = await reloadGodSpin(sid);
    await auditLog({ userId: req.user?.id, serverId: sid, action: 'godspin.update', target: `godspin:${id}`, requestBody: req.body, response: { liveSync }, ip: req.ip });
    res.json({ ok: true, data: { id, liveSync } });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

router.post('/:id/status', requirePermission('godspin.manage'), async (req, res) => {
  try {
    const sid = await serverId(req.body?.serverId || req.query.serverId);
    const id = integer(req.params.id, 0, 1);
    const status = ['draft', 'scheduled', 'active', 'paused', 'ended'].includes(req.body?.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ ok: false, error: 'Trạng thái không hợp lệ.' });
    if (status === 'active' || status === 'scheduled') {
      const rows = await query('SELECT SUM(CASE WHEN enabled = 1 AND weight > 0 THEN 1 ELSE 0 END) AS item_count, COALESCE(SUM(CASE WHEN enabled = 1 AND weight > 0 THEN weight ELSE 0 END), 0) AS weight_total FROM panel_god_spin_items WHERE config_id = ?', [id]);
      if (!Number(rows[0]?.item_count) || !Number(rows[0]?.weight_total)) return res.status(400).json({ ok: false, error: 'Không thể bật vòng quay khi pool chưa có item đang bật và trọng số > 0.' });
    }
    const result = await exec('UPDATE panel_god_spin_configs SET status=?, enabled=? WHERE id=? AND server_id=?', [status, status === 'active' || status === 'scheduled' ? 1 : 0, id, sid]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Không tìm thấy cấu hình vòng quay.' });
    const liveSync = await reloadGodSpin(sid);
    await auditLog({ userId: req.user?.id, serverId: sid, action: 'godspin.status', target: `godspin:${id}`, requestBody: req.body, response: { status, liveSync }, ip: req.ip });
    res.json({ ok: true, data: { id, status, liveSync } });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

router.delete('/:id', requirePermission('godspin.manage'), async (req, res) => {
  try {
    const sid = await serverId(req.query.serverId);
    const id = integer(req.params.id, 0, 1);
    const result = await exec('DELETE FROM panel_god_spin_configs WHERE id=? AND server_id=?', [id, sid]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Không tìm thấy cấu hình vòng quay.' });
    const liveSync = await reloadGodSpin(sid);
    await auditLog({ userId: req.user?.id, serverId: sid, action: 'godspin.delete', target: `godspin:${id}`, response: { liveSync }, ip: req.ip });
    res.json({ ok: true, data: { id, liveSync } });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

export default router;
