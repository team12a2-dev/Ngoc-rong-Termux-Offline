import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

const JWT_SECRET = () => process.env.JWT_SECRET || 'nro-panel-change-me';
const JWT_EXPIRES = () => process.env.JWT_EXPIRES || '7d';

export function getJwtSecret() {
  return JWT_SECRET();
}

export function getJwtExpires() {
  return JWT_EXPIRES();
}

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
    JWT_SECRET(),
    { expiresIn: JWT_EXPIRES() }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET());
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const perms = req.user?.permissions || [];
    if (perms.includes('*') || perms.includes(permission)) {
      return next();
    }
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  };
}

export async function login(username, password) {
  const rows = await query(
    `SELECT u.id, u.username, u.password_hash, r.name AS role, r.permissions
     FROM panel_users u
     JOIN panel_roles r ON r.id = u.role_id
     WHERE u.username = ? LIMIT 1`,
    [username]
  );
  if (!rows.length) {
    return null;
  }
  const user = rows[0];
  const permissions = typeof user.permissions === 'string'
    ? JSON.parse(user.permissions)
    : user.permissions;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return null;
  }
  await query('UPDATE panel_users SET last_login = NOW() WHERE id = ?', [user.id]);
  const token = signUserToken({
    id: user.id,
    username: user.username,
    role: user.role,
    permissions,
  });
  return { token, user: { id: user.id, username: user.username, role: user.role, permissions } };
}

export async function getMe(userId) {
  const rows = await query(
    `SELECT u.id, u.username, r.name AS role, r.permissions
     FROM panel_users u JOIN panel_roles r ON r.id = u.role_id
     WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) return null;
  const user = rows[0];
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions,
  };
}

// Dev fallback when panel_users table missing
export async function devLogin(username, password) {
  if (username === 'admin' && password === 'admin123') {
    const permissions = ['*'];
    const token = signUserToken({ id: 0, username: 'admin', role: 'owner', permissions });
    return { token, user: { id: 0, username: 'admin', role: 'owner', permissions } };
  }
  return null;
}

/** Re-issue JWT when signature valid (allows expired tokens for panel refresh). */
export function refreshSession(token) {
  if (!token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET(), { ignoreExpiration: true });
    if (!payload?.username) {
      return null;
    }
    return signUserToken({
      id: payload.id,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions || ['*'],
    });
  } catch {
    return null;
  }
}
