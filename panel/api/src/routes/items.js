import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';

const router = Router();
router.use(authMiddleware);

const ITEM_FIELDS = [
  'type', 'gender', 'NAME', 'description', 'level', 'icon_id', 'part',
  'is_up_to_up', 'power_require', 'gold', 'gem', 'head', 'body', 'leg',
];

function normalizeItem(body = {}, current = {}) {
  const type = Number(body.type ?? current.type ?? 0);
  const gender = Number(body.gender ?? current.gender ?? 3);
  const level = Number(body.level ?? current.level ?? 0);
  const iconId = Number(body.icon_id ?? current.icon_id ?? 0);
  const part = Number(body.part ?? current.part ?? -1);
  const isUp = Number(body.is_up_to_up ?? current.is_up_to_up ?? 0) ? 1 : 0;
  const power = Number(body.power_require ?? current.power_require ?? 0);
  const gold = Number(body.gold ?? current.gold ?? 0);
  const gem = Number(body.gem ?? current.gem ?? 0);
  const head = Number(body.head ?? current.head ?? -1);
  const bodyPart = Number(body.body ?? current.body ?? -1);
  const leg = Number(body.leg ?? current.leg ?? -1);
  const name = String(body.NAME ?? body.name ?? current.NAME ?? '').trim();
  const description = String(body.description ?? current.description ?? '').trim();
  if (!name || name.length > 255) throw new Error('Tên vật phẩm bắt buộc và tối đa 255 ký tự');
  if (description.length > 75) throw new Error('Mô tả tối đa 75 ký tự theo schema game');
  if (![type, level, iconId, power, gold, gem].every(Number.isInteger) || type < 0 || level < 0 || iconId < 0 || power < 0 || gold < 0 || gem < 0) {
    throw new Error('type/level/icon/power/gold/gem phải là số nguyên không âm');
  }
  if (!Number.isInteger(gender) || gender < 0 || gender > 3) throw new Error('gender phải từ 0 đến 3');
  if (![part, head, bodyPart, leg].every(Number.isInteger) || part < -1 || head < -1 || bodyPart < -1 || leg < -1) {
    throw new Error('part/head/body/leg không hợp lệ');
  }
  if (gold > 2_000_000_000 || gem > 2_000_000_000) throw new Error('gold/gem vượt giới hạn int của database');
  return { type, gender, NAME: name, description, level, icon_id: iconId, part, is_up_to_up: isUp, power_require: power, gold, gem, head, body: bodyPart, leg };
}

async function reloadRuntime(serverId) {
  return agentPost(Number(serverId || await getDefaultServerId()), '/reload/items', {});
}

async function readPersistedItem(id) {
  const rows = await query(
    `SELECT id, type, gender, NAME, description, level, icon_id, part, is_up_to_up,
            power_require, gold, gem, head, body, leg
     FROM item_template WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error(`Không đọc lại được item #${id} từ database ngocrong`);
  return rows[0];
}

async function reloadOrReportDatabaseSaved({ req, res, sid, item, action, status = 200 }) {
  let runtime;
  try {
    runtime = await reloadRuntime(sid);
  } catch (e) {
    try {
      await auditLog({ userId: req.user.id, serverId: sid, action, target: item.id, requestBody: item, response: { databaseSaved: true, runtimeReloaded: false, error: e.message }, ip: req.ip });
    } catch (auditError) {
      console.warn('[items] audit failed after database save:', auditError.message);
    }
    return res.status(503).json({
      ok: false,
      error: `Database ngocrong đã lưu item #${item.id}, nhưng Java runtime chưa reload: ${e.message}`,
      data: { databaseSaved: true, runtimeReloaded: false, database: 'ngocrong', item },
    });
  }
  try {
    await auditLog({ userId: req.user.id, serverId: sid, action, target: item.id, requestBody: item, response: { databaseSaved: true, runtimeReloaded: true, runtime }, ip: req.ip });
  } catch (auditError) {
    console.warn('[items] audit failed after item persistence:', auditError.message);
  }
  return res.status(status).json({ ok: true, data: { databaseSaved: true, runtimeReloaded: true, database: 'ngocrong', item, runtime } });
}

router.get('/', requirePermission('giftcode.manage'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  try {
    const like = `%${q}%`;
    const rows = await query(
      `SELECT id, type, gender, NAME, description, level, icon_id, part, is_up_to_up,
              power_require, gold, gem, head, body, leg
       FROM item_template
       WHERE (? = '' OR NAME LIKE ? OR CAST(id AS CHAR) LIKE ?)
       ORDER BY id LIMIT ? OFFSET ?`,
      [q, like, like, limit, offset]
    );
    const countRows = await query(
      'SELECT COUNT(*) AS total, COALESCE(MAX(id), -1) AS max_id FROM item_template'
    );
    res.json({ ok: true, data: { rows, total: Number(countRows[0]?.total || 0), nextId: Number(countRows[0]?.max_id ?? -1) + 1, limit, offset } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/options', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const rows = await query('SELECT id, NAME AS name FROM item_option_template ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const maxRows = await query('SELECT COUNT(*) AS count, COALESCE(MAX(id), -1) AS max_id FROM item_template');
    const count = Number(maxRows[0]?.count || 0);
    const maxId = Number(maxRows[0]?.max_id ?? -1);
    if (maxId + 1 !== count) {
      return res.status(409).json({ ok: false, error: 'item_template đang có ID bị khuyết; hãy khôi phục ID trước khi thêm item' });
    }
    const id = maxId + 1;
    const item = normalizeItem(req.body);
    await exec(
      `INSERT INTO item_template
       (id, type, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, item.type, item.gender, item.NAME, item.description, item.level, item.icon_id, item.part,
        item.is_up_to_up, item.power_require, item.gold, item.gem, item.head, item.body, item.leg]
    );
    const persisted = await readPersistedItem(id);
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    return reloadOrReportDatabaseSaved({ req, res, sid, item: persisted, action: 'item.create', status: 201 });
  } catch (e) {
    res.status(e.status ? e.status : 400).json({ ok: false, error: e.message });
  }
});

router.put('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0) return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
  try {
    const rows = await query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Item template không tồn tại' });
    const item = normalizeItem(req.body, rows[0]);
    await exec(
      `UPDATE item_template SET type=?, gender=?, NAME=?, description=?, level=?, icon_id=?, part=?,
       is_up_to_up=?, power_require=?, gold=?, gem=?, head=?, body=?, leg=? WHERE id=?`,
      [item.type, item.gender, item.NAME, item.description, item.level, item.icon_id, item.part,
        item.is_up_to_up, item.power_require, item.gold, item.gem, item.head, item.body, item.leg, id]
    );
    const persisted = await readPersistedItem(id);
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    return reloadOrReportDatabaseSaved({ req, res, sid, item: persisted, action: 'item.update' });
  } catch (e) {
    res.status(e.status || 400).json({ ok: false, error: e.message });
  }
});

router.post('/reload', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    const runtime = await reloadRuntime(sid);
    await auditLog({ userId: req.user.id, serverId: sid, action: 'item.reload', response: { database: 'ngocrong', loadedFromDatabase: true, runtime }, ip: req.ip });
    res.json({ ok: true, data: { database: 'ngocrong', loadedFromDatabase: true, runtime } });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
