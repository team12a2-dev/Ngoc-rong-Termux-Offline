import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { reloadGiftcode } from '../services/liveSync.js';

const router = Router();
router.use(authMiddleware);

function tryParse(v) {
  try { return JSON.parse(v); } catch { return null; }
}

function summarizeDetail(detail) {
  const parsed = tryParse(detail);
  if (!Array.isArray(parsed)) return { itemCount: 0, items: [] };
  return {
    itemCount: parsed.length,
    items: parsed.slice(0, 8).map((it) => ({
      id: it.id,
      quantity: it.quantity ?? 1,
      optionCount: it.options?.length ?? 0,
    })),
  };
}

async function attachItemNames(rows) {
  const ids = new Set();
  for (const row of rows) {
    const sum = summarizeDetail(row.detail);
    row.itemCount = sum.itemCount;
    row.itemsPreview = sum.items;
    sum.items.forEach((it) => ids.add(it.id));
  }
  if (!ids.size) return rows;
  const placeholders = [...ids].map(() => '?').join(',');
  const templates = await query(
    `SELECT id, NAME FROM item_template WHERE id IN (${placeholders})`,
    [...ids]
  );
  const nameMap = Object.fromEntries(templates.map((t) => [t.id, t.NAME]));
  for (const row of rows) {
    if (row.itemsPreview) {
      row.itemsPreview = row.itemsPreview.map((it) => ({
        ...it,
        name: nameMap[it.id] || null,
      }));
    }
  }
  return rows;
}

router.get('/', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const status = req.query.status || '';
    let sql = 'SELECT id, code, count_left, detail, datecreate, expired FROM giftcode';
    const params = [];
    const where = [];
    if (q) {
      where.push('code LIKE ?');
      params.push(`%${q}%`);
    }
    if (status === 'active') {
      where.push('count_left > 0 AND expired > NOW()');
    } else if (status === 'expired') {
      where.push('expired <= NOW()');
    } else if (status === 'empty') {
      where.push('count_left <= 0');
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY id DESC LIMIT 300';
    let rows = await query(sql, params);
    rows = await attachItemNames(rows);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const rows = await query('SELECT * FROM giftcode WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const row = rows[0];
    row.detailParsed = tryParse(row.detail);
    if (Array.isArray(row.detailParsed)) {
      const ids = row.detailParsed.map((it) => it.id).filter(Boolean);
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        const templates = await query(
          `SELECT id, NAME FROM item_template WHERE id IN (${placeholders})`,
          ids
        );
        const nameMap = Object.fromEntries(templates.map((t) => [t.id, t.NAME]));
        row.detailParsed = row.detailParsed.map((it) => ({
          ...it,
          name: nameMap[it.id] || null,
        }));
      }
    }
    res.json({ ok: true, data: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/', requirePermission('giftcode.manage'), async (req, res) => {
  const { code, count_left, detail, expired } = req.body || {};
  try {
    const exists = await query('SELECT id FROM giftcode WHERE code = ? LIMIT 1', [code]);
    if (exists.length) return res.status(400).json({ ok: false, error: 'Mã code đã tồn tại' });
    const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail || []);
    const result = await exec(
      'INSERT INTO giftcode (code, count_left, detail, expired) VALUES (?, ?, ?, ?)',
      [code, count_left ?? 1000, detailStr, expired || '2030-01-01 00:00:00']
    );
    await auditLog({ userId: req.user.id, action: 'giftcode.create', target: code, requestBody: req.body, ip: req.ip });
    const liveSync = await reloadGiftcode(req.body?.serverId);
    res.json({ ok: true, data: { id: result.insertId, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  const { code, count_left, detail, expired } = req.body || {};
  try {
    if (code) {
      const dup = await query('SELECT id FROM giftcode WHERE code = ? AND id != ? LIMIT 1', [code, req.params.id]);
      if (dup.length) return res.status(400).json({ ok: false, error: 'Mã code đã tồn tại' });
    }
    const detailStr = detail != null ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : null;
    await query(
      `UPDATE giftcode SET
         code = COALESCE(?, code),
         count_left = COALESCE(?, count_left),
         detail = COALESCE(?, detail),
         expired = COALESCE(?, expired)
       WHERE id = ?`,
      [code ?? null, count_left ?? null, detailStr, expired ?? null, req.params.id]
    );
    await auditLog({ userId: req.user.id, action: 'giftcode.update', target: req.params.id, requestBody: req.body, ip: req.ip });
    const liveSync = await reloadGiftcode(req.body?.serverId);
    res.json({ ok: true, data: { liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/clone', requirePermission('giftcode.manage'), async (req, res) => {
  const { code, count_left } = req.body || {};
  try {
    const rows = await query('SELECT * FROM giftcode WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const src = rows[0];
    const newCode = code || `${src.code}_COPY`;
    const dup = await query('SELECT id FROM giftcode WHERE code = ? LIMIT 1', [newCode]);
    if (dup.length) return res.status(400).json({ ok: false, error: 'Mã code đã tồn tại' });
    const result = await exec(
      'INSERT INTO giftcode (code, count_left, detail, expired) VALUES (?, ?, ?, ?)',
      [newCode, count_left ?? src.count_left, src.detail, src.expired]
    );
    await auditLog({ userId: req.user.id, action: 'giftcode.clone', target: newCode, requestBody: { from: src.id }, ip: req.ip });
    const liveSync = await reloadGiftcode(req.body?.serverId);
    res.json({ ok: true, data: { id: result.insertId, code: newCode, liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/topup', requirePermission('giftcode.manage'), async (req, res) => {
  const amount = Number(req.body?.amount ?? 0);
  if (!amount) return res.status(400).json({ ok: false, error: 'Cần số lượt cộng thêm' });
  try {
    await query('UPDATE giftcode SET count_left = count_left + ? WHERE id = ?', [amount, req.params.id]);
    await auditLog({ userId: req.user.id, action: 'giftcode.topup', target: req.params.id, requestBody: { amount }, ip: req.ip });
    const liveSync = await reloadGiftcode(req.body?.serverId);
    res.json({ ok: true, data: { liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    await query('DELETE FROM giftcode WHERE id = ?', [req.params.id]);
    await auditLog({ userId: req.user.id, action: 'giftcode.delete', target: req.params.id, ip: req.ip });
    const liveSync = await reloadGiftcode(req.body?.serverId);
    res.json({ ok: true, data: { liveSync } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/reload', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    const result = await agentPost(sid, '/reload/giftcode', {});
    await auditLog({ userId: req.user.id, action: 'giftcode.reload', ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
