import express from 'express';
import { exec, query, withTransaction } from '../db.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { auditLog } from '../services/audit.js';
import { reloadEvents } from '../services/liveSync.js';
import { getDefaultServerId } from '../services/serverRegistry.js';

const router = express.Router();
router.use(authMiddleware);

const asJson = (value, fallback = null) => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const jsonParam = (value) => (value == null ? null : JSON.stringify(value));
const intValue = (value, fallback = 0, min = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.trunc(n)) : fallback;
};
const boolValue = (value, fallback = false) => value == null ? fallback : (value === true || value === 1 || value === '1' || value === 'true');
const dateValue = (value) => value ? String(value).replace('T', ' ').slice(0, 19) : null;

async function resolveServerId(value) {
  return intValue(value, await getDefaultServerId(), 1);
}

function normalizePayload(body = {}) {
  const eventKey = String(body.eventKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const name = String(body.name || '').trim();
  if (!eventKey || eventKey.length > 80) throw new Error('eventKey không hợp lệ. Chỉ dùng chữ thường, số, dấu gạch ngang hoặc gạch dưới.');
  if (!name || name.length > 160) throw new Error('Tên sự kiện không hợp lệ.');
  const startsAt = dateValue(body.startsAt);
  const endsAt = dateValue(body.endsAt);
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
  const objectives = Array.isArray(body.objectives) ? body.objectives : [];
  const rewards = Array.isArray(body.rewards) ? body.rewards : [];
  const shops = Array.isArray(body.shops) ? body.shops : [];
  return {
    eventKey,
    name,
    description: String(body.description || '').trim() || null,
    eventType: String(body.eventType || 'custom').slice(0, 40),
    status: ['draft', 'scheduled', 'active', 'paused', 'ended'].includes(body.status) ? body.status : 'draft',
    enabled: boolValue(body.enabled, false) || body.status === 'active' || body.status === 'scheduled' ? 1 : 0,
    startsAt,
    endsAt,
    timezone: String(body.timezone || 'Asia/Ho_Chi_Minh').slice(0, 64),
    repeatRule: String(body.repeatRule || '').trim() || null,
    minLevel: intValue(body.minLevel, 0),
    minPower: intValue(body.minPower, 0),
    vipMin: intValue(body.vipMin, 0),
    requireClan: boolValue(body.requireClan, false) ? 1 : 0,
    minClanMembers: intValue(body.minClanMembers, 0),
    maxParticipants: body.maxParticipants == null || body.maxParticipants === '' ? null : intValue(body.maxParticipants, 0),
    oncePerPlayer: boolValue(body.oncePerPlayer, false) ? 1 : 0,
    cooldownSec: intValue(body.cooldownSec, 0),
    configJson: body.configJson || body.config || null,
    objectives,
    rewards,
    shops,
  };
}

async function insertChildren(conn, eventId, payload) {
  for (const [index, item] of payload.objectives.entries()) {
    await conn.execute(
      `INSERT INTO panel_event_objectives
       (event_id, objective_type, title, target_id, target_value, required_count, map_ids, zone_policy, recipe_json, config_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, String(item.objectiveType || 'collect').slice(0, 40), String(item.title || `Mục tiêu ${index + 1}`).slice(0, 180),
        item.targetId == null ? null : intValue(item.targetId), intValue(item.targetValue, 0), intValue(item.requiredCount, 1, 1),
        jsonParam(item.mapIds || []), String(item.zonePolicy || 'any').slice(0, 20), jsonParam(item.recipeJson || item.recipe), jsonParam(item.configJson || item.config), index]
    );
  }
  for (const [index, item] of payload.rewards.entries()) {
    await conn.execute(
      `INSERT INTO panel_event_rewards
       (event_id, reward_type, temp_id, quantity_min, quantity_max, chance_percent, duration_days, rank_min, rank_max, options_json, config_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, String(item.rewardType || 'item').slice(0, 30), item.tempId == null ? null : intValue(item.tempId), intValue(item.quantityMin, 1, 0),
        Math.max(intValue(item.quantityMin, 1, 0), intValue(item.quantityMax, 1, 0)), Number(item.chancePercent ?? 100),
        item.durationDays == null ? null : intValue(item.durationDays), item.rankMin == null ? null : intValue(item.rankMin, 1, 1),
        item.rankMax == null ? null : intValue(item.rankMax, 1, 1), jsonParam(item.optionsJson || item.options), jsonParam(item.configJson || item.config), index]
    );
  }
  for (const [index, shop] of payload.shops.entries()) {
    const [shopResult] = await conn.execute(
      `INSERT INTO panel_event_shops (event_id, name, currency_type, enabled, starts_at, ends_at, config_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eventId, String(shop.name || `Shop ${index + 1}`).slice(0, 120), String(shop.currencyType || 'event_point').slice(0, 30), boolValue(shop.enabled, true) ? 1 : 0,
        dateValue(shop.startsAt), dateValue(shop.endsAt), jsonParam(shop.configJson || shop.config)]
    );
    for (const item of (Array.isArray(shop.items) ? shop.items : [])) {
      await conn.execute(
        `INSERT INTO panel_event_shop_items (shop_id, temp_id, price, stock, limit_per_player, enabled, config_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [shopResult.insertId, intValue(item.tempId, 0), intValue(item.price, 0), item.stock == null ? null : intValue(item.stock),
          item.limitPerPlayer == null ? null : intValue(item.limitPerPlayer), boolValue(item.enabled, true) ? 1 : 0, jsonParam(item.configJson || item.config)]
      );
    }
  }
}

async function loadEvent(id, serverId) {
  const events = await query('SELECT * FROM panel_events WHERE id = ? AND server_id = ? LIMIT 1', [id, serverId]);
  if (!events.length) return null;
  const event = events[0];
  const [objectives, rewards, shops] = await Promise.all([
    query('SELECT * FROM panel_event_objectives WHERE event_id = ? ORDER BY sort_order, id', [id]),
    query('SELECT * FROM panel_event_rewards WHERE event_id = ? ORDER BY sort_order, id', [id]),
    query('SELECT * FROM panel_event_shops WHERE event_id = ? ORDER BY id', [id]),
  ]);
  const shopItems = [];
  for (const shop of shops) {
    const items = await query('SELECT * FROM panel_event_shop_items WHERE shop_id = ? ORDER BY id', [shop.id]);
    shopItems.push(...items);
  }
  return {
    ...event,
    configJson: asJson(event.config_json, {}),
    objectives: objectives.map((item) => ({ ...item, mapIds: asJson(item.map_ids, []), recipeJson: asJson(item.recipe_json, {}), configJson: asJson(item.config_json, {}) })),
    rewards: rewards.map((item) => ({ ...item, optionsJson: asJson(item.options_json, {}), configJson: asJson(item.config_json, {}) })),
    shops: shops.map((shop) => ({ ...shop, configJson: asJson(shop.config_json, {}), items: shopItems.filter((item) => item.shop_id === shop.id).map((item) => ({ ...item, configJson: asJson(item.config_json, {}) })) })),
  };
}

router.get('/', requirePermission('event.view'), async (req, res) => {
  try {
    const serverId = await resolveServerId(req.query.serverId);
    const rows = await query(
      `SELECT e.*, (SELECT COUNT(*) FROM panel_event_objectives o WHERE o.event_id = e.id) AS objective_count,
              (SELECT COUNT(*) FROM panel_event_rewards r WHERE r.event_id = e.id) AS reward_count,
              (SELECT COUNT(*) FROM panel_event_participants p WHERE p.event_id = e.id) AS participant_count
       FROM panel_events e WHERE e.server_id = ? ORDER BY e.updated_at DESC, e.id DESC`, [serverId]
    );
    res.json({ ok: true, data: rows.map((row) => ({ ...row, configJson: asJson(row.config_json, {}) })) });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.get('/:id/participants', requirePermission('event.view'), async (req, res) => {
  try {
    const serverId = await resolveServerId(req.query.serverId);
    const id = intValue(req.params.id, 0, 1);
    const limit = Math.min(100, Math.max(1, intValue(req.query.limit, 50, 1)));
    const offset = Math.max(0, intValue(req.query.offset, 0));
    const rows = await query(
      `SELECT p.* FROM panel_event_participants p JOIN panel_events e ON e.id = p.event_id
       WHERE p.event_id = ? AND e.server_id = ? ORDER BY p.points DESC, p.updated_at ASC LIMIT ? OFFSET ?`,
      [id, serverId, limit, offset]
    );
    res.json({ ok: true, data: rows.map((row) => ({ ...row, progressJson: asJson(row.progress_json, {}), claimsJson: asJson(row.claims_json, {}) })) });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.get('/:id', requirePermission('event.view'), async (req, res) => {
  try {
    const event = await loadEvent(intValue(req.params.id, 0, 1), await resolveServerId(req.query.serverId));
    if (!event) return res.status(404).json({ ok: false, error: 'Không tìm thấy sự kiện.' });
    res.json({ ok: true, data: event });
  } catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

router.post('/', requirePermission('event.manage'), async (req, res) => {
  try {
    const serverId = await resolveServerId(req.body?.serverId);
    const payload = normalizePayload(req.body);
    const created = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO panel_events
         (server_id, event_key, name, description, event_type, status, enabled, starts_at, ends_at, timezone, repeat_rule,
          min_level, min_power, vip_min, require_clan, min_clan_members, max_participants, once_per_player, cooldown_sec, config_json, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [serverId, payload.eventKey, payload.name, payload.description, payload.eventType, payload.status, payload.enabled, payload.startsAt, payload.endsAt,
          payload.timezone, payload.repeatRule, payload.minLevel, payload.minPower, payload.vipMin, payload.requireClan, payload.minClanMembers,
          payload.maxParticipants, payload.oncePerPlayer, payload.cooldownSec, jsonParam(payload.configJson), req.user?.id ?? null]
      );
      await insertChildren(conn, result.insertId, payload);
      await conn.execute('INSERT INTO panel_event_logs (event_id, action, payload, created_by) VALUES (?, ?, ?, ?)', [result.insertId, 'created', jsonParam(payload), req.user?.id ?? null]);
      return result.insertId;
    });
    const liveSync = await reloadEvents(serverId);
    const data = { id: created, serverId, eventKey: payload.eventKey, liveSync };
    await auditLog({ userId: req.user?.id, serverId, action: 'event.create', target: `event:${created}`, requestBody: req.body, response: data, ip: req.ip });
    res.status(201).json({ ok: true, data });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

router.put('/:id', requirePermission('event.manage'), async (req, res) => {
  try {
    const serverId = await resolveServerId(req.body?.serverId || req.query.serverId);
    const id = intValue(req.params.id, 0, 1);
    const payload = normalizePayload(req.body);
    const exists = await query('SELECT id FROM panel_events WHERE id = ? AND server_id = ? LIMIT 1', [id, serverId]);
    if (!exists.length) return res.status(404).json({ ok: false, error: 'Không tìm thấy sự kiện.' });
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE panel_events SET event_key = ?, name = ?, description = ?, event_type = ?, status = ?, enabled = ?, starts_at = ?, ends_at = ?,
         timezone = ?, repeat_rule = ?, min_level = ?, min_power = ?, vip_min = ?, require_clan = ?, min_clan_members = ?, max_participants = ?,
         once_per_player = ?, cooldown_sec = ?, config_json = ? WHERE id = ? AND server_id = ?`,
        [payload.eventKey, payload.name, payload.description, payload.eventType, payload.status, payload.enabled, payload.startsAt, payload.endsAt, payload.timezone,
          payload.repeatRule, payload.minLevel, payload.minPower, payload.vipMin, payload.requireClan, payload.minClanMembers, payload.maxParticipants,
          payload.oncePerPlayer, payload.cooldownSec, jsonParam(payload.configJson), id, serverId]
      );
      await conn.execute('DELETE FROM panel_event_objectives WHERE event_id = ?', [id]);
      await conn.execute('DELETE FROM panel_event_rewards WHERE event_id = ?', [id]);
      await conn.execute('DELETE FROM panel_event_shops WHERE event_id = ?', [id]);
      await insertChildren(conn, id, payload);
      await conn.execute('INSERT INTO panel_event_logs (event_id, action, payload, created_by) VALUES (?, ?, ?, ?)', [id, 'updated', jsonParam(payload), req.user?.id ?? null]);
    });
    const liveSync = await reloadEvents(serverId);
    await auditLog({ userId: req.user?.id, serverId, action: 'event.update', target: `event:${id}`, requestBody: req.body, response: liveSync, ip: req.ip });
    res.json({ ok: true, data: { id, liveSync } });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

router.post('/:id/status', requirePermission('event.manage'), async (req, res) => {
  try {
    const serverId = await resolveServerId(req.body?.serverId || req.query.serverId);
    const status = ['draft', 'scheduled', 'active', 'paused', 'ended'].includes(req.body?.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ ok: false, error: 'Trạng thái không hợp lệ.' });
    const result = await exec('UPDATE panel_events SET status = ?, enabled = ? WHERE id = ? AND server_id = ?', [status, status === 'active' || status === 'scheduled' ? 1 : 0, intValue(req.params.id, 0, 1), serverId]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Không tìm thấy sự kiện.' });
    const liveSync = await reloadEvents(serverId);
    await auditLog({ userId: req.user?.id, serverId, action: 'event.status', target: `event:${req.params.id}`, requestBody: req.body, response: liveSync, ip: req.ip });
    res.json({ ok: true, data: { status, liveSync } });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

router.delete('/:id', requirePermission('event.manage'), async (req, res) => {
  try {
    const serverId = await resolveServerId(req.query.serverId);
    const result = await exec('DELETE FROM panel_events WHERE id = ? AND server_id = ?', [intValue(req.params.id, 0, 1), serverId]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Không tìm thấy sự kiện.' });
    const liveSync = await reloadEvents(serverId);
    await auditLog({ userId: req.user?.id, serverId, action: 'event.delete', target: `event:${req.params.id}`, response: liveSync, ip: req.ip });
    res.json({ ok: true, data: { id: Number(req.params.id), liveSync } });
  } catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

export default router;
