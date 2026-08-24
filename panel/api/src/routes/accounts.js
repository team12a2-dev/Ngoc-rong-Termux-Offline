import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';

const router = Router();
router.use(authMiddleware);

router.get('/search', requirePermission('account.view'), async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  try {
    const rows = await query(
      `SELECT id, username, ban, is_admin, vnd, tongnap, vip, ip_address, last_time_login
       FROM account WHERE username LIKE ? ORDER BY id DESC LIMIT 50`,
      [q]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/:id', requirePermission('account.view'), async (req, res) => {
  try {
    const rows = await query('SELECT * FROM account WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/ban', requirePermission('account.ban'), async (req, res) => {
  try {
    await query('UPDATE account SET ban = 1 WHERE id = ?', [req.params.id]);
    await auditLog({ userId: req.user.id, action: 'account.ban', target: req.params.id, ip: req.ip });
    res.json({ ok: true, data: { banned: true } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/unban', requirePermission('account.ban'), async (req, res) => {
  try {
    await query('UPDATE account SET ban = 0 WHERE id = ?', [req.params.id]);
    await auditLog({ userId: req.user.id, action: 'account.unban', target: req.params.id, ip: req.ip });
    res.json({ ok: true, data: { banned: false } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id', requirePermission('account.edit'), async (req, res) => {
  const { vnd, vip, is_admin } = req.body || {};
  try {
    await query(
      'UPDATE account SET vnd = COALESCE(?, vnd), vip = COALESCE(?, vip), is_admin = COALESCE(?, is_admin) WHERE id = ?',
      [vnd ?? null, vip ?? null, is_admin ?? null, req.params.id]
    );
    await auditLog({ userId: req.user.id, action: 'account.edit', target: req.params.id, requestBody: req.body, ip: req.ip });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
