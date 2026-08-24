import { query, exec } from '../db.js';
import { getMetrics, pingAgent } from './agent.js';

const COOLDOWN_MS = Number(process.env.ALERT_COOLDOWN_MS || 300_000);
const lastFired = new Map();

export async function listAlertRules(serverId) {
  try {
    return await query(
      'SELECT * FROM panel_alert_rules WHERE server_id = ? ORDER BY id',
      [serverId]
    );
  } catch {
    return [];
  }
}

export async function createAlertRule(data) {
  const result = await exec(
    `INSERT INTO panel_alert_rules (server_id, name, rule_type, threshold, channel, webhook_url, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.server_id ?? 1,
      data.name,
      data.rule_type,
      data.threshold,
      data.channel || 'telegram',
      data.webhook_url || null,
      data.enabled !== false ? 1 : 0,
    ]
  );
  return result.insertId;
}

export async function updateAlertRule(id, data) {
  await exec(
    `UPDATE panel_alert_rules SET
       name = COALESCE(?, name),
       rule_type = COALESCE(?, rule_type),
       threshold = COALESCE(?, threshold),
       channel = COALESCE(?, channel),
       webhook_url = COALESCE(?, webhook_url),
       enabled = COALESCE(?, enabled)
     WHERE id = ?`,
    [
      data.name ?? null,
      data.rule_type ?? null,
      data.threshold ?? null,
      data.channel ?? null,
      data.webhook_url ?? null,
      data.enabled != null ? (data.enabled ? 1 : 0) : null,
      id,
    ]
  );
}

export async function deleteAlertRule(id) {
  await exec('DELETE FROM panel_alert_rules WHERE id = ?', [id]);
}

export async function listAlertHistory(limit = 50) {
  try {
    return await query(
      'SELECT * FROM panel_alert_history ORDER BY id DESC LIMIT ?',
      [limit]
    );
  } catch {
    return [];
  }
}

async function sendTelegram(webhookUrl, message) {
  if (!webhookUrl) return false;
  let url = webhookUrl.trim();
  let body;
  if (url.includes('api.telegram.org')) {
    if (!url.endsWith('/sendMessage')) {
      url = url.replace(/\/$/, '') + '/sendMessage';
    }
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      console.warn('[alert] TELEGRAM_CHAT_ID missing in .env');
      return false;
    }
    body = JSON.stringify({ chat_id: chatId, text: message });
  } else {
    body = JSON.stringify({ text: message });
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return res.ok;
}

async function fireAlert(rule, message) {
  const key = `${rule.id}:${rule.rule_type}`;
  const now = Date.now();
  if (lastFired.has(key) && now - lastFired.get(key) < COOLDOWN_MS) return;
  lastFired.set(key, now);

  if (rule.channel === 'telegram' && rule.webhook_url) {
    await sendTelegram(rule.webhook_url, message);
  }
  await exec('INSERT INTO panel_alert_history (rule_id, message) VALUES (?, ?)', [rule.id, message]);
}

function evalRule(rule, ctx) {
  switch (rule.rule_type) {
    case 'cpu_high':
      return ctx.cpuProcess >= rule.threshold;
    case 'ram_high':
      return ctx.ramJvmGb >= rule.threshold;
    case 'online_low':
      return ctx.onlineCount <= rule.threshold;
    case 'agent_down':
      return !ctx.agentOk;
    default:
      return false;
  }
}

export async function checkAlertsForServer(serverId) {
  const rules = await listAlertRules(serverId);
  const enabled = rules.filter((r) => r.enabled);
  if (!enabled.length) return;

  let agentOk = false;
  let metrics = {};
  try {
    const health = await pingAgent(serverId);
    agentOk = health?.data?.status === 'ok';
    const m = await getMetrics(serverId);
    metrics = m?.data || {};
  } catch {
    agentOk = false;
  }

  const ctx = {
    agentOk,
    cpuProcess: metrics.cpuProcess ?? 0,
    ramJvmGb: metrics.ramJvmGb ?? 0,
    onlineCount: metrics.onlineCount ?? 0,
  };

  for (const rule of enabled) {
    if (!evalRule(rule, ctx)) continue;
    const msg = `[NRO Panel] Server #${serverId} — ${rule.name}\n` +
      (rule.rule_type === 'agent_down'
        ? 'Game Agent không phản hồi!'
        : `cpu=${ctx.cpuProcess}% ram=${ctx.ramJvmGb}GB online=${ctx.onlineCount}`);
    await fireAlert(rule, msg);
  }
}

export async function startAlertMonitor() {
  const interval = Number(process.env.ALERT_CHECK_INTERVAL_MS || 60_000);
  setInterval(async () => {
    try {
      const servers = await query('SELECT id FROM panel_servers WHERE is_active = 1');
      for (const s of servers) {
        await checkAlertsForServer(s.id);
      }
    } catch (e) {
      console.warn('[alert-monitor]', e.message);
    }
  }, interval);
  console.log(`Alert monitor started (every ${interval / 1000}s)`);
}
