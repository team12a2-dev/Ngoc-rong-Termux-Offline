import express from 'express';
import { exec, query, withTransaction } from '../db.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { auditLog } from '../services/audit.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { agentGet, agentPost } from '../services/agent.js';
import { addInventoryCurrency } from '../services/playerData.js';

const router = express.Router();
router.use(authMiddleware);

const asJson = (value, fallback = null) => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const json = (value, fallback = null) => value == null ? fallback : JSON.stringify(value);
const intValue = (value, fallback = 0, min = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.trunc(n)) : fallback;
};
const amountValue = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};
const dateValue = (value) => value ? String(value).replace('T', ' ').slice(0, 19) : null;
const boolValue = (value, fallback = false) => value == null ? fallback : value === true || value === 1 || value === '1' || value === 'true';

async function serverIdOf(value) {
  return intValue(value, await getDefaultServerId(), 1);
}

function normalize(body = {}) {
  const campaignKey = String(body.campaignKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const name = String(body.name || '').trim();
  const startsAt = dateValue(body.startsAt);
  const endsAt = dateValue(body.endsAt);
  if (!campaignKey || campaignKey.length > 80) throw new Error('Mã campaign không hợp lệ.');
  if (!name || name.length > 160) throw new Error('Tên campaign không hợp lệ.');
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
  const tiers = Array.isArray(body.tiers) ? body.tiers : [];
  if (!tiers.length) throw new Error('Campaign cần ít nhất một mốc nạp.');
  return {
    campaignKey, name, description: String(body.description || '').trim() || null,
    status: ['draft', 'scheduled', 'active', 'paused', 'ended'].includes(body.status) ? body.status : 'draft',
    enabled: boolValue(body.enabled, false) ? 1 : 0, startsAt, endsAt,
    timezone: String(body.timezone || 'Asia/Ho_Chi_Minh').slice(0, 64),
    sources: Array.isArray(body.sources) && body.sources.length ? body.sources : ['payments', 'bank_transfers', 'napthe'],
    config: body.configJson || body.config || {},
    tiers: tiers.map((tier, index) => ({
      thresholdAmount: amountValue(tier.thresholdAmount ?? tier.threshold_amount),
      gemBonus: amountValue(tier.gemBonus ?? tier.gem_bonus),
      rubyBonus: amountValue(tier.rubyBonus ?? tier.ruby_bonus),
      bonusPercent: Math.min(1000, Math.max(0, Number(tier.bonusPercent ?? tier.bonus_percent ?? 0))),
      bonus: tier.bonusJson || tier.bonus || {}, sortOrder: index,
    })).sort((a, b) => a.thresholdAmount - b.thresholdAmount),
  };
}

async function loadCampaign(id, serverId) {
  const rows = await query('SELECT * FROM panel_recharge_campaigns WHERE id = ? AND server_id = ? LIMIT 1', [id, serverId]);
  if (!rows.length) return null;
  const tiers = await query('SELECT * FROM panel_recharge_tiers WHERE campaign_id = ? ORDER BY threshold_amount, sort_order, id', [id]);
  return { ...rows[0], sources: asJson(rows[0].sources_json, []), configJson: asJson(rows[0].config_json, {}), tiers: tiers.map((tier) => ({ ...tier, bonusJson: asJson(tier.bonus_json, {}) })) };
}

async function insertTiers(conn, campaignId, tiers) {
  for (const tier of tiers) {
    await conn.execute(
      `INSERT INTO panel_recharge_tiers (campaign_id, threshold_amount, gem_bonus, ruby_bonus, bonus_percent, bonus_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [campaignId, tier.thresholdAmount, tier.gemBonus, tier.rubyBonus, tier.bonusPercent, json(tier.bonus, {}), tier.sortOrder]
    );
  }
}

router.get('/', requirePermission('recharge.view'), async (req, res) => {
  try {
    const sid = await serverIdOf(req.query.serverId);
    const rows = await query(
      `SELECT c.*, COUNT(t.id) AS transaction_count, COUNT(DISTINCT cl.id) AS claim_count,
              SUM(CASE WHEN cl.status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count
       FROM panel_recharge_campaigns c
       LEFT JOIN panel_recharge_transactions t ON t.campaign_id = c.id
       LEFT JOIN panel_recharge_claims cl ON cl.campaign_id = c.id
       WHERE c.server_id = ? GROUP BY c.id ORDER BY c.updated_at DESC, c.id DESC`, [sid]
    );
    res.json({ ok: true, data: rows.map((row) => ({ ...row, sources: asJson(row.sources_json, []), configJson: asJson(row.config_json, {}) })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/:id', requirePermission('recharge.view'), async (req, res) => {
  try {
    const data = await loadCampaign(intValue(req.params.id, 0, 1), await serverIdOf(req.query.serverId));
    if (!data) return res.status(404).json({ ok: false, error: 'Không tìm thấy campaign.' });
    res.json({ ok: true, data });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/', requirePermission('recharge.manage'), async (req, res) => {
  try {
    const sid = await serverIdOf(req.body?.serverId);
    const payload = normalize(req.body);
    const id = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO panel_recharge_campaigns (server_id, campaign_key, name, description, status, enabled, starts_at, ends_at, timezone, sources_json, config_json, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sid, payload.campaignKey, payload.name, payload.description, payload.status, payload.enabled, payload.startsAt, payload.endsAt,
          payload.timezone, json(payload.sources, []), json(payload.config, {}), req.user?.id ?? null]
      );
      await insertTiers(conn, result.insertId, payload.tiers);
      await conn.execute('INSERT INTO panel_recharge_logs (campaign_id, action, payload, created_by) VALUES (?, ?, ?, ?)', [result.insertId, 'created', json(payload), req.user?.id ?? null]);
      return result.insertId;
    });
    const data = { id, serverId: sid, campaignKey: payload.campaignKey };
    await auditLog({ userId: req.user?.id, serverId: sid, action: 'recharge_campaign.create', target: `campaign:${id}`, requestBody: req.body, response: data, ip: req.ip });
    res.status(201).json({ ok: true, data });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.put('/:id', requirePermission('recharge.manage'), async (req, res) => {
  try {
    const sid = await serverIdOf(req.body?.serverId || req.query.serverId);
    const id = intValue(req.params.id, 0, 1);
    const payload = normalize(req.body);
    const exists = await query('SELECT id FROM panel_recharge_campaigns WHERE id = ? AND server_id = ? LIMIT 1', [id, sid]);
    if (!exists.length) return res.status(404).json({ ok: false, error: 'Không tìm thấy campaign.' });
    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE panel_recharge_campaigns SET campaign_key = ?, name = ?, description = ?, status = ?, enabled = ?, starts_at = ?, ends_at = ?, timezone = ?, sources_json = ?, config_json = ?
         WHERE id = ? AND server_id = ?`,
        [payload.campaignKey, payload.name, payload.description, payload.status, payload.enabled, payload.startsAt, payload.endsAt, payload.timezone, json(payload.sources, []), json(payload.config, {}), id, sid]
      );
      await conn.execute('DELETE FROM panel_recharge_tiers WHERE campaign_id = ?', [id]);
      await insertTiers(conn, id, payload.tiers);
      await conn.execute('INSERT INTO panel_recharge_logs (campaign_id, action, payload, created_by) VALUES (?, ?, ?, ?)', [id, 'updated', json(payload), req.user?.id ?? null]);
    });
    await auditLog({ userId: req.user?.id, serverId: sid, action: 'recharge_campaign.update', target: `campaign:${id}`, requestBody: req.body, ip: req.ip });
    res.json({ ok: true, data: { id } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/:id/status', requirePermission('recharge.manage'), async (req, res) => {
  try {
    const sid = await serverIdOf(req.body?.serverId || req.query.serverId);
    const status = ['draft', 'scheduled', 'active', 'paused', 'ended'].includes(req.body?.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ ok: false, error: 'Trạng thái không hợp lệ.' });
    const result = await exec('UPDATE panel_recharge_campaigns SET status = ?, enabled = ? WHERE id = ? AND server_id = ?', [status, status === 'active' || status === 'scheduled' ? 1 : 0, intValue(req.params.id, 0, 1), sid]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Không tìm thấy campaign.' });
    res.json({ ok: true, data: { status } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.delete('/:id', requirePermission('recharge.manage'), async (req, res) => {
  try {
    const sid = await serverIdOf(req.query.serverId);
    const result = await exec('DELETE FROM panel_recharge_campaigns WHERE id = ? AND server_id = ?', [intValue(req.params.id, 0, 1), sid]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'Không tìm thấy campaign.' });
    res.json({ ok: true, data: { deleted: true } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

async function sourceRows(source, sourceId) {
  const id = intValue(sourceId, 0, 1);
  if (source === 'payments') {
    return id ? query('SELECT id, name, refNo, date, declared_amount, detected_value, final_credited_amount, status_text, is_credited FROM payments WHERE id = ? AND is_credited = 1', [id])
      : query('SELECT id, name, refNo, date, declared_amount, detected_value, final_credited_amount, status_text, is_credited FROM payments WHERE is_credited = 1 ORDER BY date DESC LIMIT 200');
  }
  if (source === 'bank_transfers') {
    return id ? query('SELECT id, username, transaction_id, amount, description, created_at, is_credited FROM bank_transfers WHERE id = ? AND is_credited = 1', [id])
      : query('SELECT id, username, transaction_id, amount, description, created_at, is_credited FROM bank_transfers WHERE is_credited = 1 ORDER BY created_at DESC LIMIT 200');
  }
  if (source === 'napthe') {
    return id ? query('SELECT id, user_nap, request_id, amount, telco, serial, created_at, status FROM napthe WHERE id = ? AND status = 1', [id])
      : query('SELECT id, user_nap, request_id, amount, telco, serial, created_at, status FROM napthe WHERE status = 1 ORDER BY created_at DESC LIMIT 200');
  }
  throw new Error('Nguồn nạp không được hỗ trợ.');
}

function sourceData(source, row) {
  if (source === 'payments') return { sourceId: row.id, transactionKey: row.refNo || `payments:${row.id}`, payerKey: row.name, amount: amountValue(row.final_credited_amount || row.detected_value || row.declared_amount), raw: row };
  if (source === 'bank_transfers') return { sourceId: row.id, transactionKey: row.transaction_id || `bank_transfers:${row.id}`, payerKey: row.username, amount: amountValue(row.amount), raw: row };
  return { sourceId: row.id, transactionKey: row.request_id || `napthe:${row.id}`, payerKey: row.user_nap, amount: amountValue(row.amount), raw: row };
}

async function resolvePlayer(conn, payerKey) {
  const [rows] = await conn.execute(
    `SELECT p.id player_id, p.account_id, p.name, a.username FROM player p JOIN account a ON a.id = p.account_id
     WHERE a.username = ? OR p.name = ? ORDER BY p.id LIMIT 1`, [payerKey, payerKey]
  );
  return rows[0] || null;
}

async function reconcileOne(conn, campaignId, source, rawRow) {
  const data = sourceData(source, rawRow);
  if (data.amount <= 0) return { skipped: true, reason: 'amount_zero' };
  const [campaignRows] = await conn.execute('SELECT * FROM panel_recharge_campaigns WHERE id = ? AND enabled = 1 AND status IN (\'scheduled\', \'active\') AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at > NOW()) LIMIT 1', [campaignId]);
  if (!campaignRows.length) throw new Error('Campaign chưa active hoặc đã hết hạn.');
    const campaign = campaignRows[0];
  const allowedSources = asJson(campaign.sources_json, []);
  if (Array.isArray(allowedSources) && allowedSources.length && !allowedSources.includes(source)) {
    throw new Error(`Campaign chưa bật nguồn nạp: ${source}`);
  }
  const [tierRows] = await conn.execute
('SELECT * FROM panel_recharge_tiers WHERE campaign_id = ? AND threshold_amount <= ? ORDER BY threshold_amount DESC, sort_order DESC LIMIT 1', [campaignId, data.amount]);
  if (!tierRows.length) return { skipped: true, reason: 'no_matching_tier', amount: data.amount };
  const tier = tierRows[0];
  const player = await resolvePlayer(conn, data.payerKey);
  if (!player) return { skipped: true, reason: 'player_not_found', payerKey: data.payerKey };
  const [insert] = await conn.execute(
    `INSERT IGNORE INTO panel_recharge_transactions (campaign_id, source_table, source_id, transaction_key, payer_key, player_id, account_id, amount, raw_json, processed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [campaignId, source, data.sourceId, data.transactionKey, data.payerKey, player.player_id, player.account_id, data.amount, JSON.stringify(data.raw)]
  );
  let transactionId = insert.insertId;
  if (!transactionId) {
    const [existing] = await conn.execute('SELECT id, player_id FROM panel_recharge_transactions WHERE campaign_id = ? AND transaction_key = ? LIMIT 1', [campaignId, data.transactionKey]);
    transactionId = existing[0]?.id;
    if (!transactionId) throw new Error('Không xác định được transaction ledger.');
  }
  const bonusPercent = Number(tier.bonus_percent || 0);
  const grant = {
    gem: Number(tier.gem_bonus || 0) + Math.floor(data.amount * bonusPercent / 100),
    ruby: Number(tier.ruby_bonus || 0),
    bonus: asJson(tier.bonus_json, {}),
    amount: data.amount,
    tierId: tier.id,
  };
  await conn.execute(
    `INSERT INTO panel_recharge_claims (campaign_id, transaction_id, tier_id, player_id, grant_json)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE grant_json = VALUES(grant_json), updated_at = CURRENT_TIMESTAMP`,
    [campaignId, transactionId, tier.id, player.player_id, JSON.stringify(grant)]
  );
  return { transactionId, playerId: player.player_id, amount: data.amount, grant };
}

async function deliverClaim(claimId, serverId) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT c.*, p.name player_name, p.data_inventory FROM panel_recharge_claims c JOIN player p ON p.id = c.player_id
       WHERE c.id = ? AND (c.status = 'pending' OR (c.status = 'delivering' AND c.locked_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))) FOR UPDATE`, [claimId]
    );
    if (!rows.length) return { delivered: false, reason: 'already_delivered_or_locked' };
    const claim = rows[0];
    const grant = asJson(claim.grant_json, {});
    await conn.execute("UPDATE panel_recharge_claims SET status = 'delivering', attempts = attempts + 1, locked_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = ?", [claimId]);
    const gem = amountValue(grant.gem);
    const ruby = amountValue(grant.ruby);
    let channel = 'wallet';
    try {
      let online = false;
      try { online = Boolean((await agentGet(serverId, `/players/${encodeURIComponent(claim.player_name)}`))?.data); } catch (e) { throw new Error(`Không xác nhận được trạng thái player: ${e.message}`); }
      if (online) {
        await agentPost(serverId, `/players/${encodeURIComponent(claim.player_name)}/currency`, { gold: 0, gem, ruby });
        channel = 'online_agent';
      } else {
        const currency = addInventoryCurrency(claim.data_inventory, { gem, ruby });
        await conn.execute('UPDATE player SET data_inventory = ? WHERE id = ?', [currency.serialized, claim.player_id]);
        channel = 'database';
      }
      await conn.execute("UPDATE panel_recharge_claims SET status = 'delivered', delivery_channel = ?, delivered_at = CURRENT_TIMESTAMP, locked_at = NULL WHERE id = ?", [channel, claimId]);
      return { delivered: true, channel, gem, ruby };
    } catch (error) {
      await conn.execute("UPDATE panel_recharge_claims SET status = 'pending', last_error = ?, locked_at = NULL WHERE id = ?", [error.message.slice(0, 1000), claimId]);
      throw error;
    }
  });
}

router.post('/:id/reconcile', requirePermission('recharge.manage'), async (req, res) => {
  try {
    const sid = await serverIdOf(req.body?.serverId || req.query.serverId);
    const campaignId = intValue(req.params.id, 0, 1);
    const source = String(req.body?.source || 'payments');
    const rows = await sourceRows(source, req.body?.sourceId);
    const results = [];
    for (const row of rows) {
      try {
        const result = await withTransaction((conn) => reconcileOne(conn, campaignId, source, row));
        if (result?.transactionId) {
          const claims = await query('SELECT id FROM panel_recharge_claims WHERE campaign_id = ? AND transaction_id = ? LIMIT 1', [campaignId, result.transactionId]);
          if (claims[0]) {
            try { result.delivery = await deliverClaim(claims[0].id, sid); } catch (e) { result.delivery = { delivered: false, error: e.message }; }
          }
        }
        results.push(result);
      } catch (e) { results.push({ skipped: true, error: e.message }); }
    }
    await auditLog({ userId: req.user?.id, serverId: sid, action: 'recharge_campaign.reconcile', target: `campaign:${campaignId}`, requestBody: req.body, response: { source, count: results.length }, ip: req.ip });
    res.json({ ok: true, data: { source, count: results.length, results } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:id/claims', requirePermission('recharge.view'), async (req, res) => {
  try {
    const sid = await serverIdOf(req.query.serverId);
    const rows = await query(
      `SELECT c.*, p.name player_name, t.source_table, t.transaction_key, t.amount
       FROM panel_recharge_claims c JOIN panel_recharge_transactions t ON t.id = c.transaction_id JOIN player p ON p.id = c.player_id
       JOIN panel_recharge_campaigns cp ON cp.id = c.campaign_id
       WHERE c.campaign_id = ? AND cp.server_id = ? ORDER BY c.created_at DESC LIMIT 200`, [intValue(req.params.id, 0, 1), sid]
    );
    res.json({ ok: true, data: rows.map((row) => ({ ...row, grant: asJson(row.grant_json, {}) })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/claims/:claimId/deliver', requirePermission('recharge.manage'), async (req, res) => {
  try {
    const result = await deliverClaim(intValue(req.params.claimId, 0, 1), await serverIdOf(req.body?.serverId));
    res.json({ ok: true, data: result });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

export default router;
