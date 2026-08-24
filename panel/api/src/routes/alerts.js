import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import {
  listAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  listAlertHistory,
  checkAlertsForServer,
} from '../services/alertMonitor.js';
import { auditLog } from '../services/audit.js';

const router = Router();
router.use(authMiddleware);

router.get('/rules', requirePermission('logs.view'), async (req, res) => {
  const serverId = Number(req.query.serverId || 1);
  res.json({ ok: true, data: await listAlertRules(serverId) });
});

router.post('/rules', requirePermission('server.config'), async (req, res) => {
  try {
    const id = await createAlertRule(req.body);
    await auditLog({ userId: req.user.id, action: 'alert.create', target: String(id), requestBody: req.body, ip: req.ip });
    res.json({ ok: true, data: { id } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/rules/:id', requirePermission('server.config'), async (req, res) => {
  try {
    await updateAlertRule(req.params.id, req.body);
    await auditLog({ userId: req.user.id, action: 'alert.update', target: req.params.id, requestBody: req.body, ip: req.ip });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/rules/:id', requirePermission('server.config'), async (req, res) => {
  await deleteAlertRule(req.params.id);
  await auditLog({ userId: req.user.id, action: 'alert.delete', target: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

router.get('/history', requirePermission('logs.view'), async (req, res) => {
  res.json({ ok: true, data: await listAlertHistory(Number(req.query.limit || 50)) });
});

router.post('/check/:serverId', requirePermission('server.config'), async (req, res) => {
  await checkAlertsForServer(Number(req.params.serverId));
  res.json({ ok: true, message: 'Check completed' });
});

export default router;
