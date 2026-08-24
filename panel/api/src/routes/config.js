import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { agentGet, agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { query, exec } from '../db.js';
import { auditLog } from '../services/audit.js';
import { reloadAfterConfigSave } from '../services/liveSync.js';
import {
  listMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from '../services/maintenanceScheduler.js';

const router = Router();
router.use(authMiddleware);

const serverId = async (req) => Number(req.query.serverId || req.body?.serverId || await getDefaultServerId());

router.get('/files', requirePermission('server.config'), async (req, res) => {
  try {
    res.json(await agentGet(await serverId(req), '/config/files'));
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/files/:name', requirePermission('server.config'), async (req, res) => {
  try {
    res.json(await agentGet(await serverId(req), `/config/files/${encodeURIComponent(req.params.name)}`));
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.put('/files/:name', requirePermission('server.config'), async (req, res) => {
  const { content } = req.body || {};
  const sid = await serverId(req);
  try {
    const current = await agentGet(sid, `/config/files/${encodeURIComponent(req.params.name)}`);
    await exec(
      'INSERT INTO panel_config_snapshots (server_id, file_name, content, created_by) VALUES (?, ?, ?, ?)',
      [sid, req.params.name, current?.data?.content || '', req.user?.id ?? null]
    );
    const result = await agentPost(sid, `/config/files/${encodeURIComponent(req.params.name)}`, { content });
    const liveSync = await reloadAfterConfigSave(req.params.name, sid);
    await auditLog({
      userId: req.user.id,
      action: 'config.save',
      target: req.params.name,
      requestBody: { length: content?.length },
      ip: req.ip,
    });
    res.json({ ...result, liveSync });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/snapshots', requirePermission('server.config'), async (_req, res) => {
  try {
    const rows = await query(
      'SELECT id, file_name, created_at FROM panel_config_snapshots ORDER BY id DESC LIMIT 50'
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.json({ ok: true, data: [] });
  }
});

router.get('/snapshots/:id', requirePermission('server.config'), async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, file_name, content, created_at FROM panel_config_snapshots WHERE id = ? LIMIT 1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/snapshots/:id/rollback', requirePermission('server.config'), async (req, res) => {
  try {
    const sid = await serverId(req);
    const rows = await query('SELECT file_name, content FROM panel_config_snapshots WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const snap = rows[0];
    const result = await agentPost(sid, `/config/files/${encodeURIComponent(snap.file_name)}`, { content: snap.content });
    const liveSync = await reloadAfterConfigSave(snap.file_name, sid);
    await auditLog({ userId: req.user.id, serverId: sid, action: 'config.rollback', target: snap.file_name, ip: req.ip });
    res.json({ ...result, liveSync });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/broadcast-templates', requirePermission('server.broadcast'), async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM panel_broadcast_templates ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.json({ ok: true, data: [] });
  }
});

router.get('/maintenance-schedules', requirePermission('server.maint'), async (req, res) => {
  try {
    const sid = await serverId(req);
    const rows = await listMaintenanceSchedules(sid);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.json({ ok: true, data: [] });
  }
});

router.post('/maintenance-schedules', requirePermission('server.maint'), async (req, res) => {
  try {
    const sid = await serverId(req);
    const id = await createMaintenanceSchedule({ ...req.body, server_id: sid });
    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'maintenance.schedule.create',
      target: String(id),
      requestBody: req.body,
      ip: req.ip,
    });
    res.json({ ok: true, data: { id } });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.put('/maintenance-schedules/:id', requirePermission('server.maint'), async (req, res) => {
  try {
    await updateMaintenanceSchedule(req.params.id, req.body);
    await auditLog({
      userId: req.user.id,
      action: 'maintenance.schedule.update',
      target: req.params.id,
      requestBody: req.body,
      ip: req.ip,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.delete('/maintenance-schedules/:id', requirePermission('server.maint'), async (req, res) => {
  try {
    await deleteMaintenanceSchedule(req.params.id);
    await auditLog({
      userId: req.user.id,
      action: 'maintenance.schedule.delete',
      target: req.params.id,
      ip: req.ip,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
