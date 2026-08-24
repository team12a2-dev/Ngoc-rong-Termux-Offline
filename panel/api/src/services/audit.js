import { query } from '../db.js';

export async function auditLog({ userId, serverId, action, target, requestBody, response, ip }) {
  try {
    await query(
      `INSERT INTO panel_audit_logs (user_id, server_id, action, target, request_body, response, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId ?? null,
        serverId ?? null,
        action,
        target ?? null,
        requestBody ? JSON.stringify(requestBody) : null,
        response ? JSON.stringify(response) : null,
        ip ?? null,
      ]
    );
  } catch (e) {
    console.warn('[audit] skip:', e.message);
  }
}

export async function saveMetrics(serverId, data) {
  try {
    await query(
      `INSERT INTO panel_server_metrics
       (server_id, online_count, session_count, cpu_process, cpu_system, ram_jvm_gb, ram_os_gb, thread_count, exp_rate, admin_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        serverId,
        data.onlineCount ?? 0,
        data.sessionCount ?? 0,
        data.cpuProcess ?? 0,
        data.cpuSystem ?? 0,
        data.ramJvmGb ?? 0,
        data.ramOsUsedGb ?? 0,
        data.threadCount ?? 0,
        data.expRate ?? 1,
        data.adminMode ? 1 : 0,
      ]
    );
  } catch (e) {
    // metrics table may not exist yet
  }
}

export async function getMetricsHistory(serverId, hours = 24) {
  try {
    return await query(
      `SELECT * FROM panel_server_metrics
       WHERE server_id = ? AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY recorded_at ASC`,
      [serverId, hours]
    );
  } catch {
    return [];
  }
}
