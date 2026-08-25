import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { agentGet, agentPost } from '../services/agent.js';
import { auditLog } from '../services/audit.js';

const router = Router();
router.use(authMiddleware);

const serverIdFrom = async (req) => Number(req.query.serverId || req.body?.serverId || await getDefaultServerId());

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

function jsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

function normalizeMaps(value) {
  return [...new Set(jsonArray(value).map((id) => intValue(id, -1, 0, 9999)).filter((id) => id >= 0))].slice(0, 100);
}

function normalizeOptions(value) {
  return jsonArray(value).map((option) => ({
    id: intValue(option?.id, -1, 0, 100000),
    param: intValue(option?.param, 0, -2147483648, 2147483647),
  })).filter((option) => option.id >= 0);
}

function normalizeRule(input = {}) {
  const bossId = intValue(input.bossId ?? input.boss_id, -1, -2147483648, 0);
  if (bossId >= 0) throw new Error('bossId phải là số âm hợp lệ');
  const maps = normalizeMaps(input.mapIds ?? input.map_ids);
  if (!maps.length) throw new Error('Phải chọn ít nhất một map spawn');
  const zoneMin = intValue(input.zoneMin ?? input.zone_min, 2, 0, 99);
  const zoneMax = intValue(input.zoneMax ?? input.zone_max, 99, zoneMin, 99);
  const respawnMinSec = intValue(input.respawnMinSec ?? input.respawn_min_sec, 60, 0, 86400);
  const respawnMaxSec = intValue(input.respawnMaxSec ?? input.respawn_max_sec, 600, respawnMinSec, 86400);
  return {
    bossId,
    enabled: boolValue(input.enabled, true) ? 1 : 0,
    mapIds: maps,
    zonePolicy: ['random', 'fixed'].includes(String(input.zonePolicy ?? input.zone_policy)) ? String(input.zonePolicy ?? input.zone_policy) : 'random',
    zoneMin,
    zoneMax,
    spawnChancePercent: percentValue(input.spawnChancePercent ?? input.spawn_chance_percent, 100),
    respawnMinSec,
    respawnMaxSec,
    maxActive: intValue(input.maxActive ?? input.max_active, 1, 0, 100),
  };
}

function normalizeDrops(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).map((item) => {
    const tempId = intValue(item?.tempId ?? item?.temp_id, -1, 0, 2147483647);
    const quantityMin = intValue(item?.quantityMin ?? item?.quantity_min, 1, 1, 2147483647);
    const quantityMax = intValue(item?.quantityMax ?? item?.quantity_max, quantityMin, 1, 2147483647);
    return {
      tempId,
      enabled: boolValue(item?.enabled, true) ? 1 : 0,
      chancePercent: percentValue(item?.chancePercent ?? item?.chance_percent, 100),
      quantityMin,
      quantityMax: Math.max(quantityMin, quantityMax),
      options: normalizeOptions(item?.options),
    };
  }).filter((item) => {
    if (item.tempId < 0 || seen.has(item.tempId)) return false;
    seen.add(item.tempId);
    return true;
  });
}

function parseJson(value, fallback = []) {
  try { const parsed = JSON.parse(String(value || '')); return parsed ?? fallback; } catch { return fallback; }
}

async function loadConfigs(serverId) {
  const rows = await query('SELECT * FROM panel_boss_configs WHERE server_id = ? ORDER BY boss_id', [serverId]);
  const result = [];
  for (const row of rows) {
    const drops = await query(
      `SELECT d.*, it.NAME AS item_name, it.icon_id, it.gender, it.power_require
       FROM panel_boss_drop_items d LEFT JOIN item_template it ON it.id = d.temp_id
       WHERE d.boss_config_id = ? ORDER BY d.id`, [row.id]
    );
    result.push({
      id: row.id,
      serverId: row.server_id,
      bossId: row.boss_id,
      enabled: Number(row.enabled) === 1,
      mapIds: parseJson(row.map_ids, []),
      zonePolicy: row.zone_policy,
      zoneMin: row.zone_min,
      zoneMax: row.zone_max,
      spawnChancePercent: Number(row.spawn_chance_percent),
      respawnMinSec: row.respawn_min_sec,
      respawnMaxSec: row.respawn_max_sec,
      maxActive: row.max_active,
      updatedAt: row.updated_at,
      drops: drops.map((drop) => ({
        id: drop.id,
        tempId: drop.temp_id,
        enabled: Number(drop.enabled) === 1,
        chancePercent: Number(drop.chance_percent),
        quantityMin: drop.quantity_min,
        quantityMax: drop.quantity_max,
        options: parseJson(drop.options_json, []),
        itemName: drop.item_name || `Item #${drop.temp_id}`,
        iconId: drop.icon_id,
        gender: drop.gender,
        powerRequire: drop.power_require,
      })),
    });
  }
  return result;
}

async function syncToGame(serverId) {
  const rules = await loadConfigs(serverId);
  const payload = {
    version: 1,
    serverId,
    rules: rules.map((rule) => ({
      bossId: rule.bossId,
      enabled: rule.enabled,
      mapIds: rule.mapIds,
      zonePolicy: rule.zonePolicy,
      zoneMin: rule.zoneMin,
      zoneMax: rule.zoneMax,
      spawnChancePercent: rule.spawnChancePercent,
      respawnMinSec: rule.respawnMinSec,
      respawnMaxSec: rule.respawnMaxSec,
      maxActive: rule.maxActive,
      drops: rule.drops.map((drop) => ({
        tempId: drop.tempId,
        enabled: drop.enabled,
        chancePercent: drop.chancePercent,
        quantityMin: drop.quantityMin,
        quantityMax: drop.quantityMax,
        options: drop.options,
      })),
    })),
  };
  const written = await agentPost(serverId, '/config/files/boss_panel.json', { content: JSON.stringify(payload) });
  const reloaded = await agentPost(serverId, '/reload/boss-panel', {});
  return { rules: rules.length, written, reloaded };
}

router.get('/', requirePermission('boss.control'), async (req, res) => {
  try { res.json({ ok: true, data: await loadConfigs(await serverIdFrom(req)) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/catalog', requirePermission('boss.control'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    const live = await agentGet(serverId, '/boss/list');
    const rows = (live?.data || []).map((boss) => ({ id: boss.id, name: boss.name, mapId: boss.mapId, zoneId: boss.zoneId, status: boss.status }));
    res.json({ ok: true, data: rows });
  } catch (e) { res.status(502).json({ ok: false, error: e.message }); }
});

router.get('/item-templates', requirePermission('boss.control'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 80, 1), 200);
    const like = `%${q}%`;
    const numeric = Number(q);
    const rows = await query(
      `SELECT id, NAME AS name, icon_id, gender, power_require FROM item_template
       WHERE (? = '' OR NAME LIKE ? OR id = ? OR CAST(id AS CHAR) LIKE ?)
       ORDER BY CASE WHEN id = ? THEN 0 WHEN NAME LIKE ? THEN 1 ELSE 2 END, id LIMIT ?`,
      [q, like, Number.isFinite(numeric) ? numeric : -1, like, Number.isFinite(numeric) ? numeric : -1, `${q}%`, limit]
    );
    res.json({ ok: true, data: rows.map((row) => ({ id: row.id, name: row.name, iconId: row.icon_id, gender: row.gender, powerRequire: row.power_require })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/', requirePermission('boss.control'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    const rule = normalizeRule(req.body?.rule || req.body);
    const drops = normalizeDrops(req.body?.drops);
    const result = await exec(
      `INSERT INTO panel_boss_configs
       (server_id, boss_id, enabled, map_ids, zone_policy, zone_min, zone_max, spawn_chance_percent, respawn_min_sec, respawn_max_sec, max_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), enabled = VALUES(enabled), map_ids = VALUES(map_ids), zone_policy = VALUES(zone_policy),
       zone_min = VALUES(zone_min), zone_max = VALUES(zone_max), spawn_chance_percent = VALUES(spawn_chance_percent), respawn_min_sec = VALUES(respawn_min_sec),
       respawn_max_sec = VALUES(respawn_max_sec), max_active = VALUES(max_active), updated_at = CURRENT_TIMESTAMP`,
      [serverId, rule.bossId, rule.enabled, JSON.stringify(rule.mapIds), rule.zonePolicy, rule.zoneMin, rule.zoneMax,
        rule.spawnChancePercent, rule.respawnMinSec, rule.respawnMaxSec, rule.maxActive, req.user?.id ?? null]
    );
    const configId = result.insertId;
    await exec('DELETE FROM panel_boss_drop_items WHERE boss_config_id = ?', [configId]);
    for (const drop of drops) {
      await exec(
        `INSERT INTO panel_boss_drop_items (boss_config_id, temp_id, enabled, chance_percent, quantity_min, quantity_max, options_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [configId, drop.tempId, drop.enabled, drop.chancePercent, drop.quantityMin, drop.quantityMax, JSON.stringify(drop.options)]
      );
    }
    const liveSync = await syncToGame(serverId);
    await auditLog({ userId: req.user.id, serverId, action: 'boss-config.save', target: `boss:${rule.bossId}`, requestBody: { ...rule, dropCount: drops.length }, response: liveSync, ip: req.ip });
    res.json({ ok: true, data: { bossId: rule.bossId, dropCount: drops.length, liveSync } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.delete('/:bossId', requirePermission('boss.control'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    const bossId = intValue(req.params.bossId, 1, -2147483648, -1);
    await exec('DELETE FROM panel_boss_configs WHERE server_id = ? AND boss_id = ?', [serverId, bossId]);
    const liveSync = await syncToGame(serverId);
    await auditLog({ userId: req.user.id, serverId, action: 'boss-config.delete', target: `boss:${bossId}`, response: liveSync, ip: req.ip });
    res.json({ ok: true, data: { bossId, liveSync } });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/reload', requirePermission('boss.control'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    const liveSync = await syncToGame(serverId);
    res.json({ ok: true, data: liveSync });
  } catch (e) { res.status(502).json({ ok: false, error: e.message }); }
});

router.post('/spawn-at', requirePermission('boss.control'), async (req, res) => {
  try {
    const serverId = await serverIdFrom(req);
    const bossId = intValue(req.body?.bossId, 1, -2147483648, -1);
    const mapId = intValue(req.body?.mapId, -1, 0, 9999);
    const zoneId = intValue(req.body?.zoneId, -1, 0, 99);
    if (mapId < 0 || zoneId < 0) return res.status(400).json({ ok: false, error: 'Cần mapId và zoneId hợp lệ' });
    const result = await agentPost(serverId, '/boss/spawn-at', { bossId, mapId, zoneId });
    await auditLog({ userId: req.user.id, serverId, action: 'boss.spawn_at', target: `boss:${bossId}@map:${mapId}/zone:${zoneId}`, requestBody: req.body, response: result, ip: req.ip });
    res.json(result);
  } catch (e) { res.status(502).json({ ok: false, error: e.message }); }
});

export default router;
