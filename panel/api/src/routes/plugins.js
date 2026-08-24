import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { listPluginsFromDisk, executePlugin } from '../services/pluginEngine.js';
import { auditLog } from '../services/audit.js';

const router = Router();
router.use(authMiddleware);

router.get('/', requirePermission('server.config'), async (_req, res) => {
  try {
    res.json({ ok: true, data: listPluginsFromDisk() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/execute', requirePermission('server.config'), async (req, res) => {
  try {
    const plugins = listPluginsFromDisk();
    const manifest = plugins.find((p) => p.id === req.params.id);
    if (!manifest) return res.status(404).json({ ok: false, error: 'Plugin not found' });
    const results = await executePlugin(manifest, req.body || {}, req.body?.serverId);
    await auditLog({ userId: req.user.id, action: 'plugin.execute', target: req.params.id, requestBody: req.body, response: results, ip: req.ip });
    res.json({ ok: true, data: results });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
