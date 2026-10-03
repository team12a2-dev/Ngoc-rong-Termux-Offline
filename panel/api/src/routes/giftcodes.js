import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { reloadGiftcode } from '../services/liveSync.js';
import { generateGiftcodeWithAi } from '../services/aiGiftcodeService.js';

const router = Router();
router.use(authMiddleware);

function tryParse(v) {
  try { return JSON.parse(v); } catch { return null; }
}

const SPECIAL_CURRENCY_NAMES = {
  [-1]: 'Vàng',
  [-2]: 'Ngọc xanh',
  [-3]: 'Hồng ngọc',
};

function summarizeDetail(detail) {
  const parsed = tryParse(detail);
  if (!Array.isArray(parsed)) return { itemCount: 0, items: [] };
  return {
    itemCount: parsed.length,
    items: parsed.slice(0, 8).map((it) => ({
      id: it.id,
      quantity: it.quantity ?? 1,
      optionCount: it.options?.length ?? 0,
      name: SPECIAL_CURRENCY_NAMES[Number(it.id)] || null,
    })),
  };
}

async function attachItemNames(rows) {
  const positiveIds = new Set();
  for (const row of rows) {
    const sum = summarizeDetail(row.detail);
    row.itemCount = sum.itemCount;
    row.itemsPreview = sum.items;
    row.detailParsed = tryParse(row.detail) || [];
    sum.items.forEach((it) => {
      const numId = Number(it.id);
      if (numId > 0) positiveIds.add(numId);
    });
    if (Array.isArray(row.detailParsed)) {
      row.detailParsed.forEach((it) => {
        if (it && it.id) {
          const numId = Number(it.id);
          if (numId > 0) positiveIds.add(numId);
        }
      });
    }
  }

  let dbNameMap = {};
  if (positiveIds.size) {
    const placeholders = [...positiveIds].map(() => '?').join(',');
    const templates = await query(
      `SELECT id, NAME FROM item_template WHERE id IN (${placeholders})`,
      [...positiveIds]
    );
    dbNameMap = Object.fromEntries(templates.map((t) => [t.id, t.NAME]));
  }

  const nameMap = { ...SPECIAL_CURRENCY_NAMES, ...dbNameMap };

  for (const row of rows) {
    if (row.itemsPreview) {
      row.itemsPreview = row.itemsPreview.map((it) => ({
        ...it,
        name: nameMap[it.id] || it.name || null,
      }));
    }
    if (Array.isArray(row.detailParsed)) {
      row.detailParsed = row.detailParsed.map((it) => ({
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

router.get('/ai-config', requirePermission('giftcode.manage'), async (_req, res) => {
  const envKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  res.json({
    ok: true,
    data: {
      configured: Boolean(envKey),
      defaultModel: 'deepseek-chat',
      availableModels: ['deepseek-chat', 'deepseek-reasoner'],
    },
  });
});

router.post('/ai-generate', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const {
      prompt,
      code,
      prefix = 'NRO',
      count_left,
      expired,
      apiKey,
      model,
      autoSave = false,
      serverId,
    } = req.body || {};

    const generated = await generateGiftcodeWithAi({
      prompt,
      code,
      prefix,
      count_left,
      expired,
      apiKey,
      model,
    });

    let saved = false;
    let liveSync = null;
    let insertId = null;

    if (autoSave) {
      const detailPayload = generated.items.map((it) => ({
        id: Number(it.id),
        quantity: Number(it.quantity) || 1,
        options: (it.options || []).map((o) => ({ id: Number(o.id), param: Number(o.param) || 0 })),
      }));

      let finalCode = generated.code;
      const dup = await query('SELECT id FROM giftcode WHERE code = ? LIMIT 1', [finalCode]);
      if (dup.length > 0) {
        finalCode = `${finalCode}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        generated.code = finalCode;
      }

      const result = await exec(
        'INSERT INTO giftcode (code, count_left, detail, expired) VALUES (?, ?, ?, ?)',
        [
          finalCode,
          generated.count_left,
          JSON.stringify(detailPayload),
          generated.expired,
        ]
      );
      insertId = result.insertId;
      saved = true;

      await auditLog({
        userId: req.user.id,
        action: 'giftcode.ai_generate',
        target: finalCode,
        requestBody: { prompt, autoSave: true, code: finalCode },
        ip: req.ip,
      });

      liveSync = await reloadGiftcode(serverId);
    }

    res.json({
      ok: true,
      data: {
        ...generated,
        saved,
        insertId,
        liveSync,
      },
    });
  } catch (e) {
    console.error('[giftcodes/ai-generate] error:', e);
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
      const positiveIds = row.detailParsed
        .map((it) => Number(it.id))
        .filter((id) => Number.isFinite(id) && id > 0);
      let dbNameMap = {};
      if (positiveIds.length) {
        const placeholders = positiveIds.map(() => '?').join(',');
        const templates = await query(
          `SELECT id, NAME FROM item_template WHERE id IN (${placeholders})`,
          positiveIds
        );
        dbNameMap = Object.fromEntries(templates.map((t) => [t.id, t.NAME]));
      }
      const nameMap = { ...SPECIAL_CURRENCY_NAMES, ...dbNameMap };
      row.detailParsed = row.detailParsed.map((it) => ({
        ...it,
        name: nameMap[it.id] || it.name || null,
      }));
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

router.get('/:id/claimers', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const rows = await query('SELECT code FROM giftcode WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Giftcode không tồn tại' });
    const code = rows[0].code;
    const pattern = `%"${code}"%`;
    const players = await query(
      'SELECT id, name, gender, account_id FROM player WHERE gift_code LIKE ? LIMIT 200',
      [pattern]
    );
    res.json({ ok: true, data: { code, total: players.length, players } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/bulk-generate', requirePermission('giftcode.manage'), async (req, res) => {
  const { prefix, count, count_left, detail, expired } = req.body || {};
  const numCount = Math.min(Math.max(Number(count) || 10, 1), 1000);
  const pref = String(prefix || 'NRO').trim().toUpperCase();
  const left = count_left != null ? Number(count_left) : 1;
  const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail || []);
  const exp = expired || '2030-01-01 00:00:00';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  try {
    const codes = [];
    const existingRows = await query('SELECT code FROM giftcode');
    const existingSet = new Set(existingRows.map((r) => r.code));

    while (codes.length < numCount) {
      let randomPart = '';
      for (let i = 0; i < 6; i++) randomPart += chars[Math.floor(Math.random() * chars.length)];
      const code = `${pref}_${randomPart}`;
      if (!existingSet.has(code)) {
        existingSet.add(code);
        codes.push(code);
      }
    }

    for (const code of codes) {
      await query(
        'INSERT INTO giftcode (code, count_left, detail, expired) VALUES (?, ?, ?, ?)',
        [code, left, detailStr, exp]
      );
    }

    await auditLog({
      userId: req.user.id,
      action: 'giftcode.bulk_generate',
      target: pref,
      requestBody: { count: codes.length },
      ip: req.ip,
    });
    const liveSync = await reloadGiftcode(req.body?.serverId);
    res.json({ ok: true, data: { count: codes.length, codes, liveSync } });
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

