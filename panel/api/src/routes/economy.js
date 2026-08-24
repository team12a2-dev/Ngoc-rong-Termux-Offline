import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();
router.use(authMiddleware);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const ECONOMY_TABS = {
  transactions: {
    table: 'history_transaction',
    permission: 'logs.view',
    label: 'Giao dịch player',
    searchColumn: 'player_1',
  },
  napthe: {
    table: 'napthe',
    permission: 'account.view',
    label: 'Nạp thẻ',
    searchColumn: 'user_nap',
  },
  payments: {
    table: 'payments',
    permission: 'account.view',
    label: 'Thanh toán gateway',
    searchColumn: 'name',
  },
  bank: {
    table: 'bank_transfers',
    permission: 'account.view',
    label: 'Chuyển khoản',
    searchColumn: 'username',
  },
};

function parseLimit(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function parseSearch(raw) {
  const q = String(raw ?? '').trim();
  return q.length >= 1 ? q : null;
}

function meta(type, extra = {}) {
  return { type, updatedAt: new Date().toISOString(), ...extra };
}

async function tableExists(table) {
  try {
    await query(`SELECT 1 FROM \`${table}\` LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function safeQuery(sql, params) {
  return query(sql, params);
}

router.get('/meta', (_req, res) => {
  res.json({ ok: true, data: { tabs: ECONOMY_TABS, limits: { default: DEFAULT_LIMIT, max: MAX_LIMIT } } });
});

router.get('/summary', requirePermission('account.view'), async (_req, res) => {
  const out = { napthe: null, payments: null, bank: null, transactions: null };
  try {
    if (await tableExists('napthe')) {
      const [row] = await query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS success_count,
                SUM(CASE WHEN status = 1 THEN amount ELSE 0 END) AS success_amount
         FROM napthe`
      );
      out.napthe = row;
    }
    if (await tableExists('payments')) {
      const [row] = await query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN is_credited = 1 THEN 1 ELSE 0 END) AS credited_count,
                SUM(COALESCE(final_credited_amount, 0)) AS credited_amount
         FROM payments`
      );
      out.payments = row;
    }
    if (await tableExists('bank_transfers')) {
      const [row] = await query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN is_credited = 1 THEN 1 ELSE 0 END) AS credited_count,
                SUM(CASE WHEN is_credited = 1 THEN amount ELSE 0 END) AS credited_amount
         FROM bank_transfers`
      );
      out.bank = row;
    }
    if (await tableExists('history_transaction')) {
      const [row] = await query('SELECT COUNT(*) AS total FROM history_transaction');
      out.transactions = row;
    }
    res.json({ ok: true, data: out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/transactions', requirePermission('logs.view'), async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const q = parseSearch(req.query.q);
  const params = [];
  let where = 'WHERE 1=1';
  if (q) {
    where += ' AND (player_1 LIKE ? OR player_2 LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  try {
    const rows = await safeQuery(
      `SELECT id, player_1, player_2, item_player_1, item_player_2, time_tran
       FROM history_transaction ${where}
       ORDER BY time_tran DESC, id DESC
       LIMIT ?`,
      [...params, limit]
    );
    res.json({ ok: true, data: rows, meta: meta('transactions', { limit, q, count: rows.length }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/napthe', requirePermission('account.view'), async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const q = parseSearch(req.query.q);
  const status = req.query.status;
  const params = [];
  let where = 'WHERE 1=1';
  if (q) {
    where += ' AND user_nap LIKE ?';
    params.push(`%${q}%`);
  }
  if (status !== undefined && status !== '') {
    where += ' AND status = ?';
    params.push(Number(status));
  }
  try {
    const rows = await safeQuery(
      `SELECT id, user_nap, telco, serial, amount, status, request_id, created_at
       FROM napthe ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [...params, limit]
    );
    res.json({ ok: true, data: rows, meta: meta('napthe', { limit, q, status, count: rows.length }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/payments', requirePermission('account.view'), async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const q = parseSearch(req.query.q);
  const credited = req.query.credited;
  const params = [];
  let where = 'WHERE 1=1';
  if (q) {
    where += ' AND (name LIKE ? OR refNo LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (credited === '1' || credited === '0') {
    where += ' AND is_credited = ?';
    params.push(Number(credited));
  }
  try {
    const rows = await safeQuery(
      `SELECT id, name, refNo, date, declared_amount, detected_value, final_credited_amount,
              status_text, api_status_code, card_telco, is_credited
       FROM payments ${where}
       ORDER BY date DESC, id DESC
       LIMIT ?`,
      [...params, limit]
    );
    res.json({ ok: true, data: rows, meta: meta('payments', { limit, q, credited, count: rows.length }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/bank', requirePermission('account.view'), async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const q = parseSearch(req.query.q);
  const credited = req.query.credited;
  const params = [];
  let where = 'WHERE 1=1';
  if (q) {
    where += ' AND (username LIKE ? OR transaction_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (credited === '1' || credited === '0') {
    where += ' AND is_credited = ?';
    params.push(Number(credited));
  }
  try {
    if (!(await tableExists('bank_transfers'))) {
      res.json({ ok: true, data: [], meta: meta('bank', { limit, q, count: 0, unavailable: true }) });
      return;
    }
    const rows = await safeQuery(
      `SELECT id, transaction_id, username, amount, description, status, sender_bank_name, created_at, is_credited
       FROM bank_transfers ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [...params, limit]
    );
    res.json({ ok: true, data: rows, meta: meta('bank', { limit, q, credited, count: rows.length }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
