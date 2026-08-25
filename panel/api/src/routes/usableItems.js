import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { reloadGameResource } from '../services/liveSync.js';
import { auditLog } from '../services/audit.js';
import { enrichOption } from '../services/itemOptionCatalog.js';

const router = Router();
router.use(authMiddleware);

const MAX_OPTIONS = 12;
const MAX_DURATION_SECONDS = 30 * 24 * 60 * 60;

function serverIdFrom(req) {
  return Number(req.body?.serverId || req.query?.serverId || 0);
}

async function resolvedServerId(requested) {
  return Number(requested || await getDefaultServerId());
}

function templateIdValue(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 0) throw new Error('templateId phải là số nguyên không âm');
  return id;
}

function integerValue(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} phải là số nguyên trong khoảng ${min}–${max}`);
  }
  return number;
}

function normalizeOptions(raw) {
  if (!Array.isArray(raw)) throw new Error('options phải là một mảng [{ id, param }]');
  if (raw.length === 0) throw new Error('Item bổ trợ phải có ít nhất một option chỉ số');
  if (raw.length > MAX_OPTIONS) throw new Error(`Một item chỉ được gán tối đa ${MAX_OPTIONS} option`);
  const seen = new Set();
  return raw.map((option, index) => {
    const id = integerValue(option?.id ?? option?.optionId, `options[${index}].id`);
    const param = integerValue(option?.param ?? 0, `options[${index}].param`, { min: -2147483648, max: 2147483647 });
    if (seen.has(id)) throw new Error(`Option #${id} bị lặp trong cùng item`);
    seen.add(id);
    return { id, param, sortOrder: index };
  });
}

async function loadRows() {
  const raw = await query(
    `SELECT u.id AS usable_item_id, u.template_id, u.duration_seconds, u.enabled,
            u.created_at, u.updated_at, it.NAME AS item_name, it.type,
            it.description, it.icon_id, o.option_id, o.option_param,
            o.sort_order, o.enabled AS option_enabled, ot.NAME AS option_name
     FROM panel_usable_items u
     LEFT JOIN item_template it ON it.id = u.template_id
     LEFT JOIN panel_usable_item_options o ON o.usable_item_id = u.id
     LEFT JOIN item_option_template ot ON ot.id = o.option_id
     ORDER BY u.template_id ASC, o.sort_order ASC, o.id ASC`
  );
  const grouped = new Map();
  for (const row of raw) {
    let item = grouped.get(row.usable_item_id);
    if (!item) {
      item = {
        id: row.usable_item_id,
        template_id: row.template_id,
        duration_seconds: Number(row.duration_seconds || 600),
        enabled: Number(row.enabled) === 1,
        created_at: row.created_at,
        updated_at: row.updated_at,
        item_name: row.item_name,
        type: row.type,
        description: row.description,
        icon_id: row.icon_id,
        options: [],
      };
      grouped.set(row.usable_item_id, item);
    }
    if (row.option_id != null && Number(row.option_enabled) !== 0) {
      item.options.push({ id: Number(row.option_id), param: Number(row.option_param || 0), name: row.option_name });
    }
  }
  return [...grouped.values()];
}

router.get('/options', requirePermission('server.config'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit || 300), 1), 500);
  try {
    const like = `%${q}%`;
    const rows = await query(
      `SELECT id, NAME AS name
       FROM item_option_template
       WHERE (? = '' OR NAME LIKE ? OR CAST(id AS CHAR) LIKE ?)
       ORDER BY id LIMIT ?`,
      [q, like, like, limit]
    );
    res.json({ ok: true, data: rows.map(enrichOption) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/templates', requirePermission('server.config'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);
  try {
    const like = `%${q}%`;
    const rows = await query(
      `SELECT id, NAME AS name, type, description, icon_id AS iconId, gender, level, power_require AS powerRequire
       FROM item_template
       WHERE type = 29 AND (? = '' OR NAME LIKE ? OR CAST(id AS CHAR) LIKE ?)
       ORDER BY id ASC LIMIT ?`,
      [q, like, like, limit]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/', requirePermission('server.config'), async (_req, res) => {
  try {
    res.json({ ok: true, data: { rows: await loadRows() } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/', requirePermission('server.config'), async (req, res) => {
  try {
    const templateId = templateIdValue(req.body?.templateId ?? req.body?.template_id);
    const durationSeconds = integerValue(req.body?.durationSeconds ?? req.body?.duration_seconds ?? 600, 'durationSeconds', { min: 1, max: MAX_DURATION_SECONDS });
    const enabled = req.body?.enabled === false || req.body?.enabled === 0 || req.body?.enabled === '0' ? 0 : 1;
    const options = normalizeOptions(req.body?.options);
    const templates = await query(
      'SELECT id, type, NAME AS name, description, icon_id AS iconId FROM item_template WHERE id = ? LIMIT 1',
      [templateId]
    );
    if (!templates.length) return res.status(404).json({ ok: false, error: `Item template #${templateId} không tồn tại` });
    if (Number(templates[0].type) !== 29) return res.status(400).json({ ok: false, error: `Item #${templateId} không phải type 29 (item bổ trợ)` });

    const optionIds = options.map((option) => option.id);
    const placeholders = optionIds.map(() => '?').join(',');
    const optionRows = await query(`SELECT id FROM item_option_template WHERE id IN (${placeholders})`, optionIds);
    const validIds = new Set(optionRows.map((row) => Number(row.id)));
    const missing = optionIds.find((id) => !validIds.has(id));
    if (missing != null) return res.status(400).json({ ok: false, error: `Option template #${missing} không tồn tại` });

    await exec(
      `INSERT INTO panel_usable_items (template_id, duration_seconds, enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE duration_seconds = VALUES(duration_seconds), enabled = VALUES(enabled)`,
      [templateId, durationSeconds, enabled]
    );
    const mapping = await query('SELECT id FROM panel_usable_items WHERE template_id = ? LIMIT 1', [templateId]);
    const usableItemId = Number(mapping[0]?.id);
    await exec('DELETE FROM panel_usable_item_options WHERE usable_item_id = ?', [usableItemId]);
    for (const option of options) {
      await exec(
        `INSERT INTO panel_usable_item_options (usable_item_id, option_id, option_param, sort_order, enabled)
         VALUES (?, ?, ?, ?, 1)`,
        [usableItemId, option.id, option.param, option.sortOrder]
      );
    }

    const sid = await resolvedServerId(serverIdFrom(req));
    const runtime = await reloadGameResource(sid, 'usable-items');
    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'usable-item.save',
      target: templateId,
      requestBody: { templateId, durationSeconds, enabled, options },
      response: { runtime },
      ip: req.ip,
    });
    res.json({ ok: true, data: { item: templates[0], templateId, durationSeconds, enabled, options, runtime } });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.delete('/:templateId', requirePermission('server.config'), async (req, res) => {
  try {
    const templateId = templateIdValue(req.params.templateId);
    await exec('DELETE FROM panel_usable_items WHERE template_id = ?', [templateId]);
    const sid = await resolvedServerId(serverIdFrom(req));
    const runtime = await reloadGameResource(sid, 'usable-items');
    await auditLog({ userId: req.user.id, serverId: sid, action: 'usable-item.delete', target: templateId, response: { runtime }, ip: req.ip });
    res.json({ ok: true, data: { templateId, runtime } });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/reload', requirePermission('server.config'), async (req, res) => {
  try {
    const sid = await resolvedServerId(serverIdFrom(req));
    const runtime = await reloadGameResource(sid, 'usable-items');
    await auditLog({ userId: req.user.id, serverId: sid, action: 'usable-item.reload', response: { runtime }, ip: req.ip });
    res.json({ ok: true, data: { runtime } });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
