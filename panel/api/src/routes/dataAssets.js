import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { exec, query } from '../db.js';
import { getGameDataPath } from '../services/gameAssets.js';
import { auditLog } from '../services/audit.js';

const router = Router();
router.use(authMiddleware, requirePermission('giftcode.manage'));
const ZOOMS = [4, 3, 2, 1];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function zoomOf(value) {
  const zoom = Number(value || 4);
  if (!ZOOMS.includes(zoom)) throw new Error('Zoom phải là một trong x4, x3, x2, x1');
  return zoom;
}
function safeName(value, max = 55) {
  const name = String(value || '').trim();
  if (!name || name.length > max || !/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error('Tên file chỉ được gồm chữ, số, _, -, .');
  return name;
}
function decodePng(value) {
  const raw = String(value || '').trim().replace(/^data:image\/png;base64,/, '');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length < 8 || bytes.length > MAX_IMAGE_BYTES || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error('Ảnh phải là PNG hợp lệ và không vượt quá 10MB');
  }
  return bytes;
}
async function ensureDirs(kind) {
  for (const zoom of ZOOMS) await fs.mkdir(path.join(getGameDataPath(), kind, `x${zoom}`), { recursive: true });
}
async function writeAllZooms(kind, filename, bytes) {
  await ensureDirs(kind);
  await Promise.all(ZOOMS.map((zoom) => fs.writeFile(path.join(getGameDataPath(), kind, `x${zoom}`, filename), bytes)));
}
function publicPreview(kind, filename) {
  return `/api/v1/assets/data/${kind}/${encodeURIComponent(filename)}`;
}

router.get('/icons', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const zoom = zoomOf(req.query.zoom);
    const dir = path.join(getGameDataPath(), 'icon', `x${zoom}`);
    const files = (await fs.readdir(dir).catch(() => [])).filter((file) => /^\d+\.png$/i.test(file)).sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
    const rows = files.slice(offset, offset + limit).map((file) => ({ id: Number.parseInt(file), filename: file, preview: publicPreview('icon', file) }));
    res.json({ ok: true, data: { rows, total: files.length, limit, offset, zoom } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/icons', async (req, res) => {
  try {
    const id = Number(req.body?.id);
    if (!Number.isInteger(id) || id < 0) throw new Error('Icon ID không hợp lệ');
    const bytes = decodePng(req.body?.imageBase64);
    await writeAllZooms('icon', `${id}.png`, bytes);
    await auditLog({ userId: req.user.id, action: 'data.icon.upsert', target: id, requestBody: { id, bytes: bytes.length, zooms: ZOOMS }, response: { databaseSaved: false, filesSaved: true }, ip: req.ip });
    res.json({ ok: true, data: { id, bytes: bytes.length, zooms: ZOOMS, preview: publicPreview('icon', `${id}.png`) } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.delete('/icons/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await Promise.all(ZOOMS.map((zoom) => fs.rm(path.join(getGameDataPath(), 'icon', `x${zoom}`, `${id}.png`), { force: true })));
    res.json({ ok: true, data: { id, deleted: true } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/images-by-name', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const rows = await query('SELECT id, NAME AS name, n_frame FROM img_by_name ORDER BY id LIMIT ? OFFSET ?', [limit, offset]);
    const countRows = await query('SELECT COUNT(*) AS total FROM img_by_name');
    res.json({ ok: true, data: { rows: rows.map((row) => ({ ...row, preview: publicPreview('img_by_name', `${row.name}.png`) })), total: Number(countRows[0]?.total || 0), limit, offset } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/images-by-name', async (req, res) => {
  try {
    const name = safeName(req.body?.name);
    const nFrame = Number(req.body?.n_frame);
    if (!Number.isInteger(nFrame) || nFrame < 1 || nFrame > 255) throw new Error('n_frame phải từ 1 đến 255');
    const bytes = decodePng(req.body?.imageBase64);
    await writeAllZooms('img_by_name', `${name}.png`, bytes);
    await exec('INSERT INTO img_by_name (NAME, n_frame) VALUES (?, ?) ON DUPLICATE KEY UPDATE n_frame = VALUES(n_frame)', [name, nFrame]);
    const rows = await query('SELECT id, NAME AS name, n_frame FROM img_by_name WHERE NAME = ? LIMIT 1', [name]);
    await auditLog({ userId: req.user.id, action: 'data.img_by_name.upsert', target: rows[0]?.id, requestBody: { name, nFrame, bytes: bytes.length, zooms: ZOOMS }, response: { databaseSaved: true, filesSaved: true }, ip: req.ip });
    res.json({ ok: true, data: { row: { ...rows[0], preview: publicPreview('img_by_name', `${name}.png`) }, bytes: bytes.length, zooms: ZOOMS } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.delete('/images-by-name/:name', async (req, res) => {
  try {
    const name = safeName(req.params.name);
    await exec('DELETE FROM img_by_name WHERE NAME = ?', [name]);
    await Promise.all(ZOOMS.map((zoom) => fs.rm(path.join(getGameDataPath(), 'img_by_name', `x${zoom}`, `${name}.png`), { force: true })));
    res.json({ ok: true, data: { name, deleted: true } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

export default router;
