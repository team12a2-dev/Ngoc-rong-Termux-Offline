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
let pngPromise;
async function getPng() {
  pngPromise ||= import('pngjs').then((module) => module.PNG || module.default?.PNG).catch(() => {
    throw new Error('Thiếu dependency pngjs. Hãy chạy npm install trong panel/api rồi khởi động lại panel.');
  });
  return pngPromise;
}

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
async function writeAllZooms(kind, filename, bytes, sourceZoom = 4) {
  await ensureDirs(kind);
  const PNG = await getPng();
  let source;
  try { source = PNG.sync.read(bytes); } catch { throw new Error('Không đọc được PNG hợp lệ'); }
  if (!source.width || !source.height) throw new Error('Không đọc được kích thước PNG');
  await Promise.all(ZOOMS.map(async (zoom) => {
    const width = Math.max(1, Math.round(source.width * zoom / sourceZoom));
    const height = Math.max(1, Math.round(source.height * zoom / sourceZoom));
    let output = bytes;
    if (zoom !== sourceZoom) {
      const target = new PNG({ width, height });
      for (let y = 0; y < height; y += 1) {
        const sourceY = Math.min(source.height - 1, Math.floor(y * source.height / height));
        for (let x = 0; x < width; x += 1) {
          const sourceX = Math.min(source.width - 1, Math.floor(x * source.width / width));
          const sourceIndex = (sourceY * source.width + sourceX) * 4;
          const targetIndex = (y * width + x) * 4;
          target.data[targetIndex] = source.data[sourceIndex];
          target.data[targetIndex + 1] = source.data[sourceIndex + 1];
          target.data[targetIndex + 2] = source.data[sourceIndex + 2];
          target.data[targetIndex + 3] = source.data[sourceIndex + 3];
        }
      }
      output = PNG.sync.write(target);
    }
    await fs.writeFile(path.join(getGameDataPath(), kind, `x${zoom}`, filename), output);
  }));
}
function publicPreview(kind, filename) {
  return `/api/v1/assets/data/${kind}/${encodeURIComponent(filename)}`;
}

router.get('/icons', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const zoom = zoomOf(req.query.zoom);
    const search = String(req.query.q || '').trim().toLowerCase();
    const dir = path.join(getGameDataPath(), 'icon', `x${zoom}`);
    const files = (await fs.readdir(dir).catch(() => [])).filter((file) => /^\d+\.png$/i.test(file)).sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
    const filtered = search ? files.filter((file) => file.toLowerCase().includes(search)) : files;
    const rows = filtered.slice(offset, offset + limit).map((file) => ({ id: Number.parseInt(file), filename: file, preview: publicPreview('icon', file) }));
    res.json({ ok: true, data: { rows, total: filtered.length, limit, offset, zoom } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/icons', async (req, res) => {
  try {
    const id = Number(req.body?.id);
    if (!Number.isInteger(id) || id < 0) throw new Error('Icon ID không hợp lệ');
    const bytes = decodePng(req.body?.imageBase64);
    const sourceZoom = zoomOf(req.body?.sourceZoom);
    await writeAllZooms('icon', `${id}.png`, bytes, sourceZoom);
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
    const search = `%${String(req.query.q || '').trim()}%`;
    const rows = await query("SELECT id, NAME AS name, n_frame FROM img_by_name WHERE (? = '' OR NAME LIKE ?) ORDER BY id LIMIT ? OFFSET ?", [String(req.query.q || '').trim(), search, limit, offset]);
    const countRows = await query("SELECT COUNT(*) AS total FROM img_by_name WHERE (? = '' OR NAME LIKE ?)", [String(req.query.q || '').trim(), search]);
    res.json({ ok: true, data: { rows: rows.map((row) => ({ ...row, preview: publicPreview('img_by_name', `${row.name}.png`) })), total: Number(countRows[0]?.total || 0), limit, offset } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/images-by-name', async (req, res) => {
  try {
    const name = safeName(req.body?.name);
    const nFrame = Number(req.body?.n_frame);
    if (!Number.isInteger(nFrame) || nFrame < 1 || nFrame > 255) throw new Error('n_frame phải từ 1 đến 255');
    const bytes = decodePng(req.body?.imageBase64);
    const sourceZoom = zoomOf(req.body?.sourceZoom);
    await writeAllZooms('img_by_name', `${name}.png`, bytes, sourceZoom);
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
