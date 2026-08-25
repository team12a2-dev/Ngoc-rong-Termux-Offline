import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { reloadGameResource } from '../services/liveSync.js';
import { auditLog } from '../services/audit.js';

const router = Router();
router.use(authMiddleware);

const BEHAVIORS = {
  bo_huyet: {
    label: 'Bổ huyết',
    description: 'Tăng 100% HP tối đa trong 10 phút; dùng chung nhóm với item 382.',
  },
  bo_huyet_2: {
    label: 'Bổ huyết 2',
    description: 'Tăng 120% HP tối đa trong 10 phút; dùng chung nhóm với item 1152.',
  },
};

function serverIdFrom(req) {
  return Number(req.body?.serverId || req.query?.serverId || 0);
}

function behaviorValue(value) {
  const key = String(value || 'bo_huyet').trim().toLowerCase();
  if (!BEHAVIORS[key]) throw new Error('behaviorKey không hợp lệ');
  return key;
}

function templateIdValue(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 0) throw new Error('templateId phải là số nguyên không âm');
  return id;
}

async function resolvedServerId(requested) {
  return Number(requested || await getDefaultServerId());
}

async function loadRows() {
  return query(
    `SELECT u.id, u.template_id, u.behavior_key, u.enabled, u.created_at, u.updated_at,
            it.NAME AS item_name, it.type, it.description, it.icon_id, it.gender, it.level, it.power_require
     FROM panel_usable_items u
     LEFT JOIN item_template it ON it.id = u.template_id
     ORDER BY u.template_id ASC`
  );
}

router.get('/behaviors', requirePermission('server.config'), async (_req, res) => {
  res.json({ ok: true, data: Object.entries(BEHAVIORS).map(([key, value]) => ({ key, ...value })) });
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
    res.json({ ok: true, data: { rows: await loadRows(), behaviors: BEHAVIORS } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/', requirePermission('server.config'), async (req, res) => {
  try {
    const templateId = templateIdValue(req.body?.templateId ?? req.body?.template_id);
    const behaviorKey = behaviorValue(req.body?.behaviorKey ?? req.body?.behavior_key);
    const enabled = req.body?.enabled === false || req.body?.enabled === 0 || req.body?.enabled === '0' ? 0 : 1;
    const templates = await query(
      'SELECT id, type, NAME AS name, description, icon_id AS iconId FROM item_template WHERE id = ? LIMIT 1',
      [templateId]
    );
    if (!templates.length) return res.status(404).json({ ok: false, error: `Item template #${templateId} không tồn tại` });
    if (Number(templates[0].type) !== 29) return res.status(400).json({ ok: false, error: `Item #${templateId} không phải type 29 (item bổ trợ)` });

    await exec(
      `INSERT INTO panel_usable_items (template_id, behavior_key, enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE behavior_key = VALUES(behavior_key), enabled = VALUES(enabled)`,
      [templateId, behaviorKey, enabled]
    );
    const sid = await resolvedServerId(serverIdFrom(req));
    const runtime = await reloadGameResource(sid, 'usable-items');
    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'usable-item.save',
      target: templateId,
      requestBody: { templateId, behaviorKey, enabled },
      response: { runtime },
      ip: req.ip,
    });
    res.json({ ok: true, data: { item: templates[0], templateId, behaviorKey, enabled, runtime } });
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
    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'usable-item.delete',
      target: templateId,
      response: { runtime },
      ip: req.ip,
    });
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
