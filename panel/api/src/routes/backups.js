import { Router } from 'express';
import fs from 'fs';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { createBackup, listBackups, getBackupFile } from '../services/backup.js';
import { auditLog } from '../services/audit.js';

const router = Router();
router.use(authMiddleware);

router.get('/:serverId', requirePermission('server.config'), async (req, res) => {
  res.json({ ok: true, data: await listBackups(Number(req.params.serverId)) });
});

router.post('/:serverId', requirePermission('server.config'), async (req, res) => {
  try {
    const result = await createBackup(Number(req.params.serverId), req.body?.label || 'manual');
    await auditLog({ userId: req.user.id, serverId: Number(req.params.serverId), action: 'backup.create', target: result.fileName, ip: req.ip });
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/download/:id', requirePermission('server.config'), async (req, res) => {
  try {
    const b = await getBackupFile(req.params.id);
    res.download(b.file_path, b.file_name);
  } catch (e) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

router.post('/restore/:id', requirePermission('server.config'), async (req, res) => {
  try {
    const b = await getBackupFile(req.params.id);
    if (!req.body?.confirm) {
      return res.status(400).json({ ok: false, error: 'Send { confirm: true } to restore' });
    }
    const { restoreBackup } = await import('../services/backup.js');
    await restoreBackup(Number(req.params.id));
    await auditLog({ userId: req.user.id, serverId: b.server_id, action: 'backup.restore', target: b.file_name, ip: req.ip });
    res.json({ ok: true, message: 'Restored' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
