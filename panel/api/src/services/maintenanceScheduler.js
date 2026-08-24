import { query, exec } from '../db.js';
import { agentPost, pingAgent } from './agent.js';

const CHECK_MS = Number(process.env.MAINT_SCHEDULE_INTERVAL_MS || 30_000);
let migrated = false;

async function ensureSchema() {
  if (migrated) return;
  try {
    await query('SELECT schedule_type FROM panel_maintenance_schedules LIMIT 1');
  } catch {
    try {
      await query('SELECT starts_at FROM panel_maintenance_schedules LIMIT 1');
    } catch {
      try {
        await exec(`
          ALTER TABLE panel_maintenance_schedules
            ADD COLUMN name VARCHAR(100) DEFAULT 'Bảo trì' AFTER server_id,
            ADD COLUMN starts_at DATETIME NULL AFTER cron_expr,
            ADD COLUMN ends_at DATETIME NULL AFTER starts_at,
            ADD COLUMN status VARCHAR(20) DEFAULT 'pending' AFTER enabled,
            ADD COLUMN started_at TIMESTAMP NULL AFTER status,
            ADD COLUMN ended_at TIMESTAMP NULL AFTER started_at,
            ADD COLUMN notify_message TEXT NULL AFTER ended_at
        `);
      } catch (e) {
        console.warn('[maint-scheduler] Window columns:', e.message);
      }
    }
    try {
      await exec(`
        ALTER TABLE panel_maintenance_schedules
          ADD COLUMN schedule_type VARCHAR(20) DEFAULT 'window' AFTER name,
          ADD COLUMN daily_start_time VARCHAR(5) NULL AFTER ends_at,
          ADD COLUMN daily_end_time VARCHAR(5) NULL AFTER daily_start_time,
          ADD COLUMN repeat_days VARCHAR(30) NULL AFTER daily_end_time
      `);
      console.log('[maint-scheduler] Applied schedule type columns');
    } catch (e) {
      console.warn('[maint-scheduler] Type columns:', e.message);
    }
  }
  migrated = true;
}

function toDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function parseHm(str) {
  if (!str) return null;
  const [h, m] = String(str).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function cronFieldMatches(field, value) {
  if (field === '*') return true;
  return field.split(',').some((part) => {
    const p = part.trim();
    if (p.includes('-')) {
      const [a, b] = p.split('-').map(Number);
      return value >= a && value <= b;
    }
    if (p.startsWith('*/')) {
      const step = Number(p.slice(2));
      return step > 0 && value % step === 0;
    }
    return Number(p) === value;
  });
}

export function cronMatches(expr, date = new Date()) {
  const parts = String(expr || '').trim().split(/\s+/);
  if (parts.length < 5) return false;
  const [min, hour, dom, mon, dow] = parts;
  return cronFieldMatches(min, date.getMinutes())
    && cronFieldMatches(hour, date.getHours())
    && cronFieldMatches(dom, date.getDate())
    && cronFieldMatches(mon, date.getMonth() + 1)
    && cronFieldMatches(dow, date.getDay());
}

function repeatDayMatches(repeatDays, date = new Date()) {
  if (!repeatDays) return true;
  const days = String(repeatDays).split(',').map((d) => Number(d.trim()));
  return days.includes(date.getDay());
}

function normalizeType(data) {
  const t = data.schedule_type || 'window';
  if (['window', 'daily', 'weekly', 'cron'].includes(t)) return t;
  return 'window';
}

export async function listMaintenanceSchedules(serverId) {
  await ensureSchema();
  try {
    return await query(
      `SELECT * FROM panel_maintenance_schedules
       WHERE server_id = ?
       ORDER BY COALESCE(starts_at, created_at) DESC, id DESC
       LIMIT 100`,
      [serverId]
    );
  } catch {
    return [];
  }
}

export async function createMaintenanceSchedule(data) {
  await ensureSchema();
  const type = normalizeType(data);
  const countdown = Number(data.countdown_seconds ?? data.seconds ?? 60);
  const name = data.name || 'Bảo trì';
  const enabled = data.enabled !== false ? 1 : 0;

  let startsAt = null;
  let endsAt = null;
  let cronExpr = data.cron_expr || '';
  let dailyStart = data.daily_start_time || null;
  let dailyEnd = data.daily_end_time || null;
  let repeatDays = data.repeat_days || null;

  if (type === 'window') {
    startsAt = data.starts_at?.replace('T', ' ').slice(0, 19);
    endsAt = data.ends_at?.replace('T', ' ').slice(0, 19);
    if (!startsAt || !endsAt) throw new Error('Cần thời gian bắt đầu và kết thúc');
    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
  } else if (type === 'daily') {
    if (!dailyStart || !dailyEnd) throw new Error('Cần giờ bắt đầu và kết thúc (HH:mm)');
    if (parseHm(dailyEnd) <= parseHm(dailyStart)) {
      throw new Error('Giờ kết thúc phải sau giờ bắt đầu');
    }
  } else if (type === 'weekly') {
    if (!dailyStart || !dailyEnd) throw new Error('Cần giờ bắt đầu và kết thúc (HH:mm)');
    if (!repeatDays) throw new Error('Chọn ít nhất một ngày trong tuần');
    if (parseHm(dailyEnd) <= parseHm(dailyStart)) {
      throw new Error('Giờ kết thúc phải sau giờ bắt đầu');
    }
  } else if (type === 'cron') {
    if (!cronExpr.trim()) throw new Error('Cần cron expression (vd: 0 4 * * *)');
  }

  const result = await exec(
    `INSERT INTO panel_maintenance_schedules
       (server_id, name, schedule_type, cron_expr, starts_at, ends_at,
        daily_start_time, daily_end_time, repeat_days, seconds, enabled, status, notify_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      data.server_id ?? 1,
      name,
      type,
      cronExpr,
      startsAt,
      endsAt,
      dailyStart,
      dailyEnd,
      repeatDays,
      countdown,
      enabled,
      data.notify_message || null,
    ]
  );
  return result.insertId;
}

export async function updateMaintenanceSchedule(id, data) {
  await ensureSchema();
  if (data.cancel) {
    await exec(
      `UPDATE panel_maintenance_schedules SET status = 'cancelled', enabled = 0
       WHERE id = ? AND status IN ('pending', 'started')`,
      [id]
    );
    return;
  }
  await exec(
    `UPDATE panel_maintenance_schedules SET
       name = COALESCE(?, name),
       enabled = COALESCE(?, enabled),
       notify_message = COALESCE(?, notify_message)
     WHERE id = ?`,
    [
      data.name ?? null,
      data.enabled != null ? (data.enabled ? 1 : 0) : null,
      data.notify_message ?? null,
      id,
    ]
  );
}

export async function deleteMaintenanceSchedule(id) {
  await ensureSchema();
  await exec('DELETE FROM panel_maintenance_schedules WHERE id = ?', [id]);
}

async function triggerMaintenanceStart(schedule) {
  const serverId = schedule.server_id;
  const countdown = Math.max(Number(schedule.seconds) || 60, 10);
  const msg = schedule.notify_message || buildDefaultMessage(schedule);

  try {
    await agentPost(serverId, '/broadcast', { message: msg });
  } catch { /* agent down */ }

  try {
    await agentPost(serverId, '/maintenance', { seconds: countdown });
  } catch (e) {
    console.warn(`[maint-scheduler] Start failed #${schedule.id}:`, e.message);
    return false;
  }

  await exec(
    `UPDATE panel_maintenance_schedules SET status = 'started', started_at = NOW(), last_run = NOW() WHERE id = ?`,
    [schedule.id]
  );
  console.log(`[maint-scheduler] Started #${schedule.id} (${schedule.schedule_type}, countdown ${countdown}s)`);
  return true;
}

async function triggerMaintenanceEnd(schedule, resetPending = false) {
  const serverId = schedule.server_id;
  const msg = `Server đã mở lại sau bảo trì. Chúc bạn chơi game vui vẻ!`;

  try {
    const health = await pingAgent(serverId);
    if (health?.data?.status === 'ok') {
      await agentPost(serverId, '/admin-mode', { enabled: false });
      await agentPost(serverId, '/broadcast', { message: msg });
    }
  } catch { /* server still down */ }

  if (resetPending) {
    await exec(
      `UPDATE panel_maintenance_schedules SET status = 'pending', ended_at = NOW() WHERE id = ?`,
      [schedule.id]
    );
  } else {
    await exec(
      `UPDATE panel_maintenance_schedules SET status = 'completed', ended_at = NOW() WHERE id = ?`,
      [schedule.id]
    );
  }
  console.log(`[maint-scheduler] Ended #${schedule.id}${resetPending ? ' (recurring reset)' : ''}`);
}

function buildDefaultMessage(schedule) {
  const type = schedule.schedule_type || 'window';
  if (type === 'window') {
    return `Server bảo trì từ ${fmt(schedule.starts_at)} đến ${fmt(schedule.ends_at)}. Vui lòng thoát game.`;
  }
  if (type === 'daily' || type === 'weekly') {
    return `Server bảo trì hôm nay ${schedule.daily_start_time}–${schedule.daily_end_time}. Vui lòng thoát game.`;
  }
  return 'Server sẽ bảo trì theo lịch. Vui lòng thoát game.';
}

function fmt(v) {
  const d = toDate(v);
  if (!d) return '—';
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function isSameMinute(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
    && a.getHours() === b.getHours()
    && a.getMinutes() === b.getMinutes();
}

async function tickWindowSchedules() {
  const pending = await query(
    `SELECT * FROM panel_maintenance_schedules
     WHERE enabled = 1 AND schedule_type = 'window' AND status = 'pending'
       AND starts_at IS NOT NULL AND starts_at <= NOW()`
  );
  for (const s of pending) await triggerMaintenanceStart(s);

  const active = await query(
    `SELECT * FROM panel_maintenance_schedules
     WHERE enabled = 1 AND schedule_type = 'window' AND status = 'started'
       AND ends_at IS NOT NULL AND ends_at <= NOW()`
  );
  for (const s of active) await triggerMaintenanceEnd(s, false);
}

async function tickRecurringSchedules(type) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayKey(now);

  const rows = await query(
    `SELECT * FROM panel_maintenance_schedules
     WHERE enabled = 1 AND schedule_type = ? AND status IN ('pending', 'started')`,
    [type]
  );

  for (const s of rows) {
    if (type === 'weekly' && !repeatDayMatches(s.repeat_days, now)) continue;

    const startMin = parseHm(s.daily_start_time);
    const endMin = parseHm(s.daily_end_time);
    if (startMin == null || endMin == null) continue;

    const lastRun = s.last_run ? toDate(s.last_run) : null;
    const lastRunDay = lastRun ? todayKey(lastRun) : null;

    if (s.status === 'pending' && nowMin >= startMin && lastRunDay !== today) {
      await triggerMaintenanceStart(s);
      continue;
    }

    if (s.status === 'started' && nowMin >= endMin && lastRunDay === today) {
      await triggerMaintenanceEnd(s, true);
    }
  }
}

async function tickCronSchedules() {
  const now = new Date();
  const rows = await query(
    `SELECT * FROM panel_maintenance_schedules
     WHERE enabled = 1 AND schedule_type = 'cron' AND cron_expr != ''`
  );

  for (const s of rows) {
    if (!cronMatches(s.cron_expr, now)) continue;
    const lastRun = s.last_run ? toDate(s.last_run) : null;
    if (lastRun && isSameMinute(lastRun, now)) continue;

    const countdown = Math.max(Number(s.seconds) || 60, 10);
    const msg = s.notify_message || 'Server sẽ bảo trì theo lịch cron. Vui lòng thoát game.';
    try {
      await agentPost(s.server_id, '/broadcast', { message: msg });
      await agentPost(s.server_id, '/maintenance', { seconds: countdown });
      await exec('UPDATE panel_maintenance_schedules SET last_run = NOW() WHERE id = ?', [s.id]);
      console.log(`[maint-scheduler] Cron triggered #${s.id} (${s.cron_expr})`);
    } catch (e) {
      console.warn(`[maint-scheduler] Cron failed #${s.id}:`, e.message);
    }
  }
}

export async function tickMaintenanceSchedules() {
  await ensureSchema();
  try {
    await tickWindowSchedules();
    await tickRecurringSchedules('daily');
    await tickRecurringSchedules('weekly');
    await tickCronSchedules();
  } catch (e) {
    console.warn('[maint-scheduler] tick error:', e.message);
  }
}

export function startMaintenanceScheduler() {
  ensureSchema().then(() => {
    tickMaintenanceSchedules();
    setInterval(() => tickMaintenanceSchedules().catch((e) => {
      console.warn('[maint-scheduler]', e.message);
    }), CHECK_MS);
    console.log(`Maintenance scheduler started (every ${CHECK_MS / 1000}s)`);
  });
}

export function scheduleTypeLabel(type) {
  const map = {
    window: 'Một lần',
    daily: 'Hàng ngày',
    weekly: 'Hàng tuần',
    cron: 'Cron',
  };
  return map[type] || type || '—';
}

export function scheduleSummary(s) {
  const type = s.schedule_type || (s.starts_at ? 'window' : s.cron_expr ? 'cron' : 'window');
  if (type === 'window') {
    return `${fmt(s.starts_at)} → ${fmt(s.ends_at)}`;
  }
  if (type === 'daily') {
    return `Mỗi ngày ${s.daily_start_time} → ${s.daily_end_time}`;
  }
  if (type === 'weekly') {
    const days = (s.repeat_days || '').split(',').map(dayLabel).filter(Boolean).join(', ');
    return `${days || '—'} · ${s.daily_start_time} → ${s.daily_end_time}`;
  }
  if (type === 'cron') {
    return s.cron_expr;
  }
  return s.cron_expr || '—';
}

function dayLabel(d) {
  const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const n = Number(d);
  return map[n] ?? '';
}
