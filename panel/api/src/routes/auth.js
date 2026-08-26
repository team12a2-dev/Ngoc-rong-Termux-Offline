import { Router } from 'express';
import { login, devLogin, refreshSession } from '../middleware/auth.js';

const router = Router();

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
