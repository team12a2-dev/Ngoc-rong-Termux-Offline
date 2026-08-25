import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { reloadGameResource } from '../services/liveSync.js';
import { auditLog } from '../services/audit.js';

const router = Router();
router.use(authMiddleware);

const serverIdFrom = async (req) => Number(
  req.query.serverId || req.body?.serverId || await getDefaultServerId()
);

function intValue(value, fallback = 0, min = 0, max = 2147483647) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function percentValue(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Number(n.toFixed(4))));
}

function boolValue(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeOptions(value) {
  let raw = value;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option) => ({
      id: intValue(option?.id, -1, 0, 100000),
      param: intValue(option?.param, 0, -2147483648, 2147483647),
    }))
    .filter((option) => option.id >= 0);
}

function normalizeRule(input = {}) {
  const mapId = intValue(input.mapId ?? input.map_id, -1, 0, 9999);
  if (mapId < 0) throw new Error('mapId phải là số nguyên từ 0 đến 9999');
  const goldMin = intValue(input.goldMin ?? input.gold_min, 0, 0, 2147483647);
  const goldMax = intValue(input.goldMax ?? input.gold_max, goldMin, 0, 2147483647);
  return {
    mapId,
    enabled: boolValue(input.enabled, true) ? 1 : 0,
    goldEnabled: boolValue(input.goldEnabled ?? input.gold_enabled, false) ? 1 : 0,
    goldChancePercent: percentValue(input.goldChancePercent ?? input.gold_chance_percent),
    goldMin,
    goldMax: Math.max(goldMin, goldMax),
    activationEnabled: boolValue(input.activationEnabled ?? input.activation_enabled, false) ? 1 : 0,
    activationChancePercent: percentValue(input.activationChancePercent ?? input.activation_chance_percent),
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.map((item) => {
    const tempId = intValue(item?.tempId ?? item?.temp_id, -1, 0, 2147483647);
    const quantityMin = intValue(item?.quantityMin ?? item?.quantity_min, 1, 1, 2147483647);
    const quantityMax = intValue(item?.quantityMax ?? item?.quantity_max, quantityMin, 1, 2147483647);
    const mobTempId = intValue(item?.mobTempId ?? item?.mob_temp_id, -1, -1, 2147483647);
    return {
      tempId,
      mobTempId,
      enabled: boolValue(item?.enabled, true) ? 1 : 0,
      chancePercent: percentValue(item?.chancePercent ?? item?.chance_percent),
      quantityMin,
      quantityMax: Math.max(quantityMin, quantityMax),
      options: normalizeOptions(item?.options ?? item?.options_json),
    };
  }).filter((item) => {
    const key = `${item.tempId}:${item.mobTempId}`;
    if (item.tempId < 0 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mobLabel(mobTempId) {
  return Number(mobTempId) < 0 ? 'Tất cả quái' : `Mob #${mobTempId}`;
}

function parseOptions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadConfigs(serverId) {
  const configs = await query(
    `SELECT c.*, COUNT(i.id) AS item_count
     FROM panel_map_drop_configs c
     LEFT JOIN panel_map_drop_items i ON i.config_id = c.id
     WHERE c.server_id = ?
     GROUP BY c.id
     ORDER BY c.map_id ASC`,
    [serverId]
  );
  for (const config of configs) {
    const items = await query(
      `SELECT d.id, d.temp_id, d.mob_temp_id, d.enabled, d.chance_percent, d.quantity_min, d.quantity_max,
              d.options_json, it.NAME AS item_name, it.icon_id, it.gender, it.power_require
       FROM panel_map_drop_items d
       LEFT JOIN item_template it ON it.id = d.temp_id
       WHERE d.config_id = ?
       ORDER BY d.id ASC`,
      [config.id]
    );
    config.items = items.map((item) => ({
      id: item.id,
      tempId: item.temp_id,
      mobTempId: item.mob_temp_id,
      mobLabel: mobLabel(item.mob_temp_id),
      enabled: Number(item.enabled) === 1,
      chancePercent: Number(item.chance_percent),
      quantityMin: item.quantity_min,
      quantityMax: item.quantity_max,
      options: parseOptions(item.options_json),
      itemName: item.item_name || `Item #${item.temp_id}`,
      iconId: item.icon_id,
      gender: item.gender,
      powerRequire: item.power_require,
    }));
    delete config.item_count;
  }
  return configs.map((config) => ({
    id: config.id,
    serverId: config.server_id,
    mapId: config.map_id,
    enabled: Number(config.enabled) === 1,
    goldEnabled: Number(config.gold_enabled) === 1,
    goldChancePercent: Number(config.gold_chance_percent),
    goldMin: config.gold_min,
    goldMax: config.gold_max,
    activationEnabled: Number(config.activation_enabled) === 1,
    activationChancePercent: Number(config.activation_chance_percent),
    createdAt: config.created_at,
    updatedAt: config.updated_at,
    items: config.items,
  }));
}

router.get('/', requirePermission('server.config'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    res.json({ ok: true, data: await loadConfigs(serverId) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/item-templates', requirePermission('server.config'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 80, 1), 200);
    const like = `%${q}%`;
    const numeric = Number(q);
    const rows = await query(
      `SELECT id, NAME AS name, icon_id, gender, power_require
       FROM item_template
       WHERE (? = '' OR NAME LIKE ? OR id = ? OR CAST(id AS CHAR) LIKE ?)
       ORDER BY CASE WHEN id = ? THEN 0 WHEN NAME LIKE ? THEN 1 ELSE 2 END, id
       LIMIT ?`,
      [q, like, Number.isFinite(numeric) ? numeric : -1, like, Number.isFinite(numeric) ? numeric : -1, `${q}%`, limit]
    );
    res.json({
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        iconId: row.icon_id,
        gender: row.gender,
        powerRequire: row.power_require,
      })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/mobs', requirePermission('server.config'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
    const like = `%${q}%`;
    const numeric = Number(q);
    const rows = await query(
      `SELECT id, NAME AS name, TYPE AS mob_type, hp
       FROM mob_template
       WHERE (? = '' OR NAME LIKE ? OR id = ? OR CAST(id AS CHAR) LIKE ?)
       ORDER BY CASE WHEN id = ? THEN 0 WHEN NAME LIKE ? THEN 1 ELSE 2 END, id
       LIMIT ?`,
      [q, like, Number.isFinite(numeric) ? numeric : -1, like, Number.isFinite(numeric) ? numeric : -1, `${q}%`, limit]
    );
    res.json({
      ok: true,
      data: rows.map((row) => ({ id: row.id, name: row.name, type: row.mob_type, hp: row.hp })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/', requirePermission('server.config'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    const rule = normalizeRule(req.body?.rule || req.body);
    const items = normalizeItems(req.body?.items);
    const result = await exec(
      `INSERT INTO panel_map_drop_configs
         (server_id, map_id, enabled, gold_enabled, gold_chance_percent, gold_min, gold_max,
          activation_enabled, activation_chance_percent, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id), enabled = VALUES(enabled), gold_enabled = VALUES(gold_enabled),
         gold_chance_percent = VALUES(gold_chance_percent), gold_min = VALUES(gold_min),
         gold_max = VALUES(gold_max), activation_enabled = VALUES(activation_enabled),
         activation_chance_percent = VALUES(activation_chance_percent), updated_at = CURRENT_TIMESTAMP`,
      [serverId, rule.mapId, rule.enabled, rule.goldEnabled, rule.goldChancePercent, rule.goldMin,
        rule.goldMax, rule.activationEnabled, rule.activationChancePercent, req.user?.id ?? null]
    );
    const configId = result.insertId;
    await exec('DELETE FROM panel_map_drop_items WHERE config_id = ?', [configId]);
    for (const item of items) {
      await exec(
        `INSERT INTO panel_map_drop_items
           (config_id, temp_id, mob_temp_id, enabled, chance_percent, quantity_min, quantity_max, options_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [configId, item.tempId, item.mobTempId, item.enabled, item.chancePercent, item.quantityMin,
          item.quantityMax, JSON.stringify(item.options)]
      );
    }
    const liveSync = await reloadGameResource(serverId, 'drop-config');
    await auditLog({
      userId: req.user.id,
      serverId,
      action: 'drop-config.save',
      target: `map:${rule.mapId}`,
      requestBody: { ...rule, itemCount: items.length },
      ip: req.ip,
    });
    res.json({ ok: true, data: { mapId: rule.mapId, itemCount: items.length, liveSync } });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.delete('/:mapId', requirePermission('server.config'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    const mapId = intValue(req.params.mapId, -1, 0, 9999);
    if (mapId < 0) return res.status(400).json({ ok: false, error: 'mapId không hợp lệ' });
    await exec('DELETE FROM panel_map_drop_configs WHERE server_id = ? AND map_id = ?', [serverId, mapId]);
    const liveSync = await reloadGameResource(serverId, 'drop-config');
    await auditLog({ userId: req.user.id, serverId, action: 'drop-config.delete', target: `map:${mapId}`, ip: req.ip });
    res.json({ ok: true, data: { mapId, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/reload', requirePermission('server.config'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    const liveSync = await reloadGameResource(serverId, 'drop-config');
    res.json({ ok: true, data: liveSync });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
