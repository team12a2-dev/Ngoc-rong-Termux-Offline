import { Router } from 'express';
import { login, devLogin, refreshSession } from '../middleware/auth.js';
import { exec, query } from '../db.js';

const router = Router();

router.post('/register', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!/^[a-z0-9]{5,20}$/.test(username)) {
    return res.status(400).json({ ok: false, error: 'Tên tài khoản phải dài 5–20 ký tự và chỉ gồm a-z, 0-9.' });
  }
  if (password.length < 6 || password.length > 100) {
    return res.status(400).json({ ok: false, error: 'Mật khẩu phải dài từ 6 đến 100 ký tự.' });
  }

  try {
    const exists = await query('SELECT id FROM account WHERE username = ? LIMIT 1', [username]);
    if (exists.length) {
      return res.status(409).json({ ok: false, error: 'Tên tài khoản đã tồn tại.' });
    }

    await exec(
      `INSERT INTO account (username, password, email, ban, is_admin, active, server_login, is_gift_box, gift_time, token, xsrf_token, newpass)
       VALUES (?, ?, '', 0, 0, 1, -1, 0, '0', '', '', '')`,
      [username, password]
    );
    return res.status(201).json({ ok: true, message: 'Đăng ký tài khoản thành công.' });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, error: 'Tên tài khoản đã tồn tại.' });
    }
    return res.status(500).json({ ok: false, error: 'Không thể tạo tài khoản lúc này.' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'username and password required' });
  }
  try {
    let result = await login(username, password);
    if (!result) {
      result = await devLogin(username, password);
    }
    if (!result) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/refresh', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.body?.token;
  const newToken = await refreshSession(token);
  if (!newToken) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }
  res.json({ ok: true, data: { token: newToken } });
});

export default router;
