import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';

const router = Router();
router.use(authMiddleware);

router.post('/', requirePermission('account.edit'), async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!/^[a-z0-9]{5,20}$/.test(username)) {
    return res.status(400).json({ ok: false, error: 'Username phải dài 5–20 ký tự và chỉ gồm a-z, 0-9.' });
  }
  if (password.length < 6 || password.length > 100) {
    return res.status(400).json({ ok: false, error: 'Mật khẩu phải dài từ 6 đến 100 ký tự.' });
  }

  try {
    const exists = await query('SELECT id FROM account WHERE username = ? LIMIT 1', [username]);
    if (exists.length) return res.status(409).json({ ok: false, error: 'Username đã tồn tại.' });

    const result = await exec(
      `INSERT INTO account (username, password, email, ban, is_admin, active, server_login, is_gift_box, gift_time, token, xsrf_token, newpass)
       VALUES (?, ?, '', 0, 0, 1, -1, 0, '0', '', '', '')`,
      [username, password]
    );
    await auditLog({ userId: req.user.id, action: 'account.create', target: String(result.insertId), requestBody: { username }, ip: req.ip });
    return res.status(201).json({ ok: true, data: { id: result.insertId, username } });
  } catch (e) {
    if (e?.code === 'ER_DUP_ENTRY') return res.status(409).json({ ok: false, error: 'Username đã tồn tại.' });
    return res.status(500).json({ ok: false, error: e.message });
  }
});

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
