import { Router } from 'express';
import { query } from '../db.js';
import { findIconFile, findItemBgFile, findTileSetFile, findMobSpriteFile, findEffectFile, findBgImageFile, getGameDataPath } from '../services/gameAssets.js';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const router = Router();

function sendIconPng(res, file) {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.type('png');
  return res.sendFile(file);
}

function resizeNearestPng(srcPng, targetWidth, targetHeight) {
  const dstPng = new PNG({ width: targetWidth, height: targetHeight });
  const sw = srcPng.width;
  const sh = srcPng.height;
  for (let y = 0; y < targetHeight; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / targetHeight));
    for (let x = 0; x < targetWidth; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / targetWidth));
      const sIdx = (sy * sw + sx) << 2;
      const dIdx = (y * targetWidth + x) << 2;
      dstPng.data[dIdx] = srcPng.data[sIdx];
      dstPng.data[dIdx + 1] = srcPng.data[sIdx + 1];
      dstPng.data[dIdx + 2] = srcPng.data[sIdx + 2];
      dstPng.data[dIdx + 3] = srcPng.data[sIdx + 3];
    }
  }
  return dstPng;
}

/** Check danh sách icon_id xem file PNG có tồn tại trên disk không */
router.get('/icons/check', (req, res) => {
  const idsParam = String(req.query.ids || '');
  const ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n >= 0);
  const result = {};
  for (const id of ids) {
    const file = findIconFile(id);
    result[id] = Boolean(file);
  }
  res.json({ ok: true, data: result });
});

/** Tìm ID icon lớn nhất và đề xuất ID trống tiếp theo */
router.get('/icons/next-id', (_req, res) => {
  try {
    const base = getGameDataPath();
    let maxId = 0;
    const allIds = new Set();
    for (const z of [4, 1, 2, 3]) {
      const dir = path.join(base, 'icon', `x${z}`);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (f.endsWith('.png')) {
            const num = parseInt(f.replace('.png', ''), 10);
            if (!isNaN(num) && num >= 0) {
              allIds.add(num);
              if (num > maxId) maxId = num;
            }
          }
        }
      }
    }
    res.json({
      ok: true,
      data: {
        maxId,
        nextId: maxId + 1,
        totalIcons: allIds.size,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Lấy kích thước chi tiết (width, height, size) của icon ở cả 4 thư mục */
router.get('/icons/dimensions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'ID không hợp lệ' });
  }
  const base = getGameDataPath();
  const zooms = {};
  for (const z of [1, 2, 3, 4]) {
    const p = path.join(base, 'icon', `x${z}`, `${id}.png`);
    if (fs.existsSync(p)) {
      try {
        const buf = fs.readFileSync(p);
        const png = PNG.sync.read(buf);
        zooms[`x${z}`] = {
          exists: true,
          width: png.width,
          height: png.height,
          size: buf.length,
          url: `/api/v1/assets/icons/raw/${z}/${id}.png`,
        };
      } catch (e) {
        zooms[`x${z}`] = {
          exists: true,
          error: e.message,
          size: fs.statSync(p).size,
          url: `/api/v1/assets/icons/raw/${z}/${id}.png`,
        };
      }
    } else {
      zooms[`x${z}`] = { exists: false, width: 0, height: 0, size: 0, url: null };
    }
  }
  res.json({ ok: true, data: { id, zooms } });
});

/** Danh sách icon trong thư mục data/icon kèm phân trang và tìm kiếm */
router.get('/icons/list', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit || '30', 10)));
    const search = String(req.query.search || '').trim();
    const rangeMin = req.query.min ? parseInt(req.query.min, 10) : null;
    const rangeMax = req.query.max ? parseInt(req.query.max, 10) : null;

    const base = getGameDataPath();
    const idMap = new Map();

    for (const z of [4, 1, 2, 3]) {
      const dir = path.join(base, 'icon', `x${z}`);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (f.endsWith('.png')) {
            const num = parseInt(f.replace('.png', ''), 10);
            if (!isNaN(num) && num >= 0) {
              if (!idMap.has(num)) {
                idMap.set(num, { id: num, zooms: {} });
              }
              idMap.get(num).zooms[`x${z}`] = true;
            }
          }
        }
      }
    }

    let allList = Array.from(idMap.values()).sort((a, b) => a.id - b.id);

    if (search) {
      allList = allList.filter((item) => String(item.id).includes(search));
    }
    if (rangeMin !== null && !isNaN(rangeMin)) {
      allList = allList.filter((item) => item.id >= rangeMin);
    }
    if (rangeMax !== null && !isNaN(rangeMax)) {
      allList = allList.filter((item) => item.id <= rangeMax);
    }

    const total = allList.length;
    const start = (page - 1) * limit;
    const paged = allList.slice(start, start + limit);

    // Bổ sung thông tin kích thước cho trang hiện tại
    const items = paged.map((item) => {
      const zoomInfo = {};
      for (const z of [1, 2, 3, 4]) {
        const p = path.join(base, 'icon', `x${z}`, `${item.id}.png`);
        if (fs.existsSync(p)) {
          try {
            const buf = fs.readFileSync(p);
            // Quick PNG header read width & height (bytes 16..24)
            if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
              zoomInfo[`x${z}`] = {
                exists: true,
                width: buf.readUInt32BE(16),
                height: buf.readUInt32BE(20),
                size: buf.length,
              };
            } else {
              zoomInfo[`x${z}`] = { exists: true, size: buf.length };
            }
          } catch (_) {
            zoomInfo[`x${z}`] = { exists: true };
          }
        } else {
          zoomInfo[`x${z}`] = { exists: false };
        }
      }
      return {
        id: item.id,
        zooms: zoomInfo,
        url: `/api/v1/assets/icons/raw/4/${item.id}.png`,
      };
    });

    res.json({
      ok: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Lưu 1 icon vào 4 thư mục zoom (x1, x2, x3, x4) */
router.post('/icons/save-single', (req, res) => {
  try {
    const { id, images, image, sourceZoom = 4, targetBaseWidth, targetBaseHeight } = req.body;
    const parsedId = Number(id);
    if (!Number.isFinite(parsedId) || parsedId < 0) {
      return res.status(400).json({ ok: false, error: 'ID icon không hợp lệ' });
    }

    const base = getGameDataPath();
    const savedZooms = [];

    if (images && typeof images === 'object') {
      // Đã có sẵn 4 ảnh base64 x1, x2, x3, x4
      for (const z of [1, 2, 3, 4]) {
        const dataUri = images[`x${z}`];
        if (dataUri) {
          const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const dir = path.join(base, 'icon', `x${z}`);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${parsedId}.png`), buffer);
          savedZooms.push(`x${z}`);
        }
      }
    } else if (image) {
      // Nhận 1 ảnh duy nhất và tự resize sang 4 zoom
      const rawBase64 = String(image).replace(/^data:image\/\w+;base64,/, '');
      const srcBuf = Buffer.from(rawBase64, 'base64');
      const srcPng = PNG.sync.read(srcBuf);

      const baseW = targetBaseWidth || Math.max(1, Math.round(srcPng.width / (Number(sourceZoom) || 4)));
      const baseH = targetBaseHeight || Math.max(1, Math.round(srcPng.height / (Number(sourceZoom) || 4)));

      const zooms = [
        { z: 1, w: baseW, h: baseH },
        { z: 2, w: baseW * 2, h: baseH * 2 },
        { z: 3, w: baseW * 3, h: baseH * 3 },
        { z: 4, w: baseW * 4, h: baseH * 4 },
      ];

      for (const item of zooms) {
        const zDir = path.join(base, 'icon', `x${item.z}`);
        if (!fs.existsSync(zDir)) fs.mkdirSync(zDir, { recursive: true });
        let outPng;
        if (item.w === srcPng.width && item.h === srcPng.height) {
          outPng = srcPng;
        } else {
          outPng = resizeNearestPng(srcPng, item.w, item.h);
        }
        fs.writeFileSync(path.join(zDir, `${parsedId}.png`), PNG.sync.write(outPng));
        savedZooms.push(`x${item.z}`);
      }
    } else {
      return res.status(400).json({ ok: false, error: 'Thiếu dữ liệu hình ảnh (images hoặc image)' });
    }

    return res.json({
      ok: true,
      message: `Đã lưu thành công icon #${parsedId} vào ${savedZooms.join(', ')}`,
      data: {
        id: parsedId,
        savedZooms,
      },
    });
  } catch (err) {
    console.error('Error saving single icon:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/** Xóa icon khỏi 4 thư mục zoom */
router.delete('/icons/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 0) {
      return res.status(400).json({ ok: false, error: 'ID không hợp lệ' });
    }

    const base = getGameDataPath();
    const deletedZooms = [];

    for (const z of [1, 2, 3, 4]) {
      const p = path.join(base, 'icon', `x${z}`, `${id}.png`);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        deletedZooms.push(`x${z}`);
      }
    }

    if (deletedZooms.length === 0) {
      return res.status(404).json({ ok: false, error: `Không tìm thấy file icon #${id}` });
    }

    res.json({
      ok: true,
      message: `Đã xóa icon #${id} khỏi ${deletedZooms.join(', ')}`,
      data: { id, deletedZooms },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Upload hàng loạt ảnh icon và đồng bộ vào data/icon/x4, x3, x2, x1 */
router.post('/icons/upload-batch', (req, res) => {
  const { items = [] } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: 'Không có dữ liệu ảnh để lưu' });
  }

  const base = getGameDataPath();
  const saved = [];
  const errors = [];

  for (const item of items) {
    const id = Number(item.id);
    if (!Number.isFinite(id) || id < 0) {
      errors.push({ id: item.id, error: 'ID không hợp lệ' });
      continue;
    }

    const { x4, x3, x2, x1 } = item.images || {};
    const writtenZooms = [];

    const writeZoom = (zoomLevel, dataUriOrBase64) => {
      if (!dataUriOrBase64) return;
      const base64Data = dataUriOrBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const dir = path.join(base, 'icon', `x${zoomLevel}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${id}.png`);
      fs.writeFileSync(filePath, buffer);
      writtenZooms.push(`x${zoomLevel}`);
    };

    try {
      if (x4) writeZoom(4, x4);
      if (x3) writeZoom(3, x3);
      if (x2) writeZoom(2, x2);
      if (x1) writeZoom(1, x1);
      saved.push({ id, zooms: writtenZooms });
    } catch (err) {
      errors.push({ id, error: err.message });
    }
  }

  res.json({
    ok: true,
    data: {
      total: items.length,
      savedCount: saved.length,
      saved,
      errors,
    },
  });
});

/** Tra cứu chi tiết sự tồn tại của icon trên cả 4 thư mục x4, x3, x2, x1 */
router.get('/icons/inspect/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'ID không hợp lệ' });
  }
  const base = getGameDataPath();
  const zooms = {};
  for (const z of [4, 3, 2, 1]) {
    const p = path.join(base, 'icon', `x${z}`, `${id}.png`);
    const exists = fs.existsSync(p);
    zooms[`x${z}`] = {
      exists,
      path: exists ? p : null,
      size: exists ? fs.statSync(p).size : 0,
      url: `/api/v1/assets/icons/raw/${z}/${id}.png`,
    };
  }
  res.json({ ok: true, data: { id, zooms } });
});

/** Serve file icon theo từng thư mục zoom cụ thể */
router.get('/icons/raw/:zoom/:id.png', (req, res) => {
  const zoom = Number(req.params.zoom);
  const id = Number(req.params.id);
  if (![1, 2, 3, 4].includes(zoom) || !Number.isFinite(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'Tham số không hợp lệ' });
  }
  const base = getGameDataPath();
  const file = path.join(base, 'icon', `x${zoom}`, `${id}.png`);
  if (!fs.existsSync(file)) {
    return res.status(404).json({ ok: false, error: 'Icon file not found' });
  }
  return sendIconPng(res, file);
});

/** Icon theo icon_id — data/icon/x4/{id}.png */
router.get('/icons/:id.png', (req, res) => {
  const file = findIconFile(req.params.id);
  if (!file) return res.status(404).json({ ok: false, error: 'Icon not found' });
  return sendIconPng(res, file);
});

/** Icon theo item template id — tra icon_id trong DB rồi serve PNG */
router.get('/items/:tempId/icon.png', async (req, res) => {
  try {
    const rows = await query(
      'SELECT icon_id FROM item_template WHERE id = ? LIMIT 1',
      [req.params.tempId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Item not found' });
    const iconId = rows[0].icon_id;
    if (iconId == null || iconId < 0) {
      return res.status(404).json({ ok: false, error: 'No icon_id' });
    }
    const file = findIconFile(iconId);
    if (!file) return res.status(404).json({ ok: false, error: 'Icon file not found' });
    return sendIconPng(res, file);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** Icon cờ bang hội — clan.img_id → flag_bag.icon_id → PNG */
router.get('/clan-flags/:imgId/icon.png', async (req, res) => {
  try {
    const rows = await query(
      'SELECT icon_id FROM flag_bag WHERE id = ? LIMIT 1',
      [req.params.imgId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Flag not found' });
    const file = findIconFile(rows[0].icon_id);
    if (!file) return res.status(404).json({ ok: false, error: 'Icon file not found' });
    return sendIconPng(res, file);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** Icon bang theo clan id */
router.get('/clans/:clanId/icon.png', async (req, res) => {
  try {
    const rows = await query('SELECT img_id FROM clan WHERE id = ? LIMIT 1', [req.params.clanId]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Clan not found' });
    const flagRows = await query(
      'SELECT icon_id FROM flag_bag WHERE id = ? LIMIT 1',
      [rows[0].img_id ?? 0]
    );
    if (!flagRows.length) return res.status(404).json({ ok: false, error: 'Flag not found' });
    const file = findIconFile(flagRows[0].icon_id);
    if (!file) return res.status(404).json({ ok: false, error: 'Icon file not found' });
    return sendIconPng(res, file);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** Serve ảnh item_bg_temp (Nhà cửa, cây cối, địa hình, decor...) */
router.get('/item-bg/:id.png', (req, res) => {
  const file = findItemBgFile(req.params.id);
  if (!file) return res.status(404).json({ ok: false, error: 'Item BG image not found' });
  return sendIconPng(res, file);
});

/** Danh mục toàn bộ các template item_bg_temp có sẵn */
router.get('/item-bg-catalog', async (_req, res) => {
  try {
    const rows = await query('SELECT id, image_id, layer, dx, dy FROM bg_item_template ORDER BY id ASC').catch(() => []);
    if (rows && rows.length > 0) {
      const items = rows.map((r) => ({
        id: r.id,
        imageId: r.image_id,
        layer: r.layer,
        dx: r.dx,
        dy: r.dy,
        fileName: `${r.image_id}.png`,
        url: `/api/v1/assets/item-bg/${r.image_id}.png`,
      }));
      return res.json({ ok: true, data: items });
    }

    const base = getGameDataPath();
    const dir = path.join(base, 'item_bg_temp', 'x4');
    if (!fs.existsSync(dir)) {
      return res.json({ ok: true, data: [] });
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
    const items = files.map((f) => {
      const idStr = f.replace('.png', '');
      return {
        id: Number(idStr),
        imageId: Number(idStr),
        layer: 1,
        dx: 0,
        dy: 0,
        fileName: f,
        url: `/api/v1/assets/item-bg/${idStr}.png`,
      };
    }).sort((a, b) => Number(a.id) - Number(b.id));

    res.json({ ok: true, data: items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Tải lên hình ảnh vật thể nền / decor mới (data/item_bg_temp) và đăng ký vào bg_item_template */
router.post('/item-bg/upload', async (req, res) => {
  try {
    const { image, layer = 1, dx = 0, dy = 0, customId } = req.body;
    if (!image) {
      return res.status(400).json({ ok: false, error: 'Thiếu dữ liệu hình ảnh (base64)' });
    }

    const base = getGameDataPath();
    const x4Dir = path.join(base, 'item_bg_temp', 'x4');
    if (!fs.existsSync(x4Dir)) fs.mkdirSync(x4Dir, { recursive: true });

    // Tính toán max imageId từ thư mục disk và DB
    let maxFileId = 0;
    try {
      const files = fs.readdirSync(x4Dir).filter((f) => f.endsWith('.png'));
      for (const f of files) {
        const num = parseInt(f.replace('.png', ''), 10);
        if (!isNaN(num) && num > maxFileId) maxFileId = num;
      }
    } catch (_) {}

    const maxDbRows = await query('SELECT MAX(id) as maxId, MAX(image_id) as maxImgId FROM bg_item_template').catch(() => []);
    const maxDbId = maxDbRows[0]?.maxId ? Number(maxDbRows[0].maxId) : 0;
    const maxDbImgId = maxDbRows[0]?.maxImgId ? Number(maxDbRows[0].maxImgId) : 0;

    let nextImageId = Math.max(maxFileId, maxDbImgId) + 1;
    let nextId = Math.max(maxDbId, nextImageId) + 1;

    if (customId !== undefined && customId !== null && Number.isFinite(Number(customId))) {
      const parsedCustom = Number(customId);
      if (parsedCustom >= 0) {
        nextImageId = parsedCustom;
        nextId = parsedCustom;
      }
    }

    // Ghi file PNG vào các thư mục zoomLevel (x4, x3, x2, x1) với tỉ lệ chuẩn xác
    const rawBase64 = String(image).replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');
    let srcPng = null;
    try {
      srcPng = PNG.sync.read(buffer);
    } catch (_) {}

    if (srcPng) {
      // Nếu ảnh <= 1440 thì xem là ảnh thiết kế 1x (1 tile = 24px)
      // Nếu ảnh > 1440 thì xem là ảnh thiết kế 4x
      let baseW = srcPng.width;
      let baseH = srcPng.height;
      if (srcPng.width > 1440) {
        baseW = Math.round(srcPng.width / 4);
        baseH = Math.round(srcPng.height / 4);
      }
      const zooms = [
        { z: 1, w: baseW, h: baseH },
        { z: 2, w: baseW * 2, h: baseH * 2 },
        { z: 3, w: baseW * 3, h: baseH * 3 },
        { z: 4, w: baseW * 4, h: baseH * 4 },
      ];
      for (const item of zooms) {
        const zDir = path.join(base, 'item_bg_temp', `x${item.z}`);
        if (!fs.existsSync(zDir)) fs.mkdirSync(zDir, { recursive: true });
        let outPng;
        if (item.w === srcPng.width && item.h === srcPng.height) {
          outPng = srcPng;
        } else {
          outPng = resizeNearestPng(srcPng, item.w, item.h);
        }
        fs.writeFileSync(path.join(zDir, `${nextImageId}.png`), PNG.sync.write(outPng));
      }
    } else {
      const zoomLevels = ['x4', 'x3', 'x2', 'x1'];
      for (const z of zoomLevels) {
        const zDir = path.join(base, 'item_bg_temp', z);
        if (!fs.existsSync(zDir)) fs.mkdirSync(zDir, { recursive: true });
        fs.writeFileSync(path.join(zDir, `${nextImageId}.png`), buffer);
      }
    }

    // Đăng ký vào bảng bg_item_template
    const parsedLayer = Number(layer) || 1;
    const parsedDx = Number(dx) || 0;
    const parsedDy = Number(dy) || 0;

    const existing = await query('SELECT id FROM bg_item_template WHERE id = ?', [nextId]).catch(() => []);
    if (existing && existing.length > 0) {
      await query(
        'UPDATE bg_item_template SET image_id = ?, layer = ?, dx = ?, dy = ? WHERE id = ?',
        [nextImageId, parsedLayer, parsedDx, parsedDy, nextId]
      );
    } else {
      await query(
        'INSERT INTO bg_item_template (id, image_id, layer, dx, dy) VALUES (?, ?, ?, ?, ?)',
        [nextId, nextImageId, parsedLayer, parsedDx, parsedDy]
      );
    }

    return res.json({
      ok: true,
      message: `Đã thêm thành công vật thể nền #${nextId} (ảnh ${nextImageId}.png, Lớp L${parsedLayer})`,
      data: {
        id: nextId,
        imageId: nextImageId,
        layer: parsedLayer,
        dx: parsedDx,
        dy: parsedDy,
        fileName: `${nextImageId}.png`,
        url: `/api/v1/assets/item-bg/${nextImageId}.png`,
      },
    });
  } catch (err) {
    console.error('Error uploading item-bg:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/** Serve ảnh tileset texture strip (1..36) */
router.get('/tile-set/:tileId.png', (req, res) => {
  const file = findTileSetFile(req.params.tileId);
  if (!file) return res.status(404).json({ ok: false, error: 'Tile set image not found' });
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.type('png');
  return res.sendFile(file);
});

/** Danh mục các bộ tileset có sẵn */
router.get('/tile-set-catalog', (_req, res) => {
  try {
    const base = getGameDataPath();
    const dir = path.join(base, 'tile');
    if (!fs.existsSync(dir)) {
      return res.json({ ok: true, data: [] });
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
    const items = files.map((f) => {
      const id = Number(f.replace('.png', ''));
      const filePath = path.join(dir, f);
      let tileCount = 30;
      try {
        const buf = fs.readFileSync(filePath);
        if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
          const h = buf.readUInt32BE(20);
          tileCount = Math.floor(h / 24);
        }
      } catch (_) {}
      return {
        id,
        tileCount,
        fileName: f,
        url: `/api/v1/assets/tile-set/${id}.png`,
      };
    }).filter((t) => Number.isFinite(t.id) && t.id > 0)
      .sort((a, b) => a.id - b.id);

    res.json({ ok: true, data: items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Serve ảnh sprite quái vật (0_0.png...) */
router.get('/mob/:id.png', (req, res) => {
  const file = findMobSpriteFile(req.params.id);
  if (!file) return res.status(404).json({ ok: false, error: 'Mob sprite image not found' });
  return sendIconPng(res, file);
});

/** Serve ảnh hiệu ứng (ImgEffect_{id}.png) */
router.get('/effect/:id.png', (req, res) => {
  const file = findEffectFile(req.params.id);
  if (!file) return res.status(404).json({ ok: false, error: 'Effect image not found' });
  return sendIconPng(res, file);
});

/** Parse & serve binary DataEffect_{id} metadata (frames, sub-images, animation loop sequence) */
router.get('/effect-data/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 0) {
      return res.status(400).json({ ok: false, error: 'ID hiệu ứng không hợp lệ' });
    }
    const base = getGameDataPath();
    const filePath = path.join(base, 'effdata', `DataEffect_${id}`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'DataEffect file not found' });
    }

    const buf = fs.readFileSync(filePath);
    let offset = 0;
    const readByte = () => buf.readUInt8(offset++);
    const readShort = () => { const v = buf.readInt16BE(offset); offset += 2; return v; };

    const numSmallImage = readByte();
    const smallImages = [];
    let maxX = 0, maxY = 0;
    for (let i = 0; i < numSmallImage && offset + 4 <= buf.length; i++) {
      const imgId = readByte();
      const x = readByte();
      const y = readByte();
      const w = readByte();
      const h = readByte();
      smallImages.push({ id: imgId, x, y, w, h });
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }

    let numFrame = 0;
    const frames = [];
    let minDx = 9999, minDy = 9999, maxDx = -9999, maxDy = -9999;
    if (offset + 2 <= buf.length) {
      numFrame = readShort();
      for (let i = 0; i < numFrame && offset < buf.length; i++) {
        const numParts = readByte();
        const parts = [];
        for (let j = 0; j < numParts && offset + 5 <= buf.length; j++) {
          const dx = readShort();
          const dy = readShort();
          const idImg = readByte();
          parts.push({ dx, dy, idImg });
          const img = smallImages[idImg] || { w: 20, h: 20 };
          if (dx < minDx) minDx = dx;
          if (dy < minDy) minDy = dy;
          if (dx + img.w > maxDx) maxDx = dx + img.w;
          if (dy + img.h > maxDy) maxDy = dy + img.h;
        }
        frames.push(parts);
      }
    }

    const animSequence = [];
    if (offset + 2 <= buf.length) {
      const numSequence = readShort();
      for (let i = 0; i < numSequence && offset + 2 <= buf.length; i++) {
        animSequence.push(readShort());
      }
    }

    if (animSequence.length === 0 && numFrame > 0) {
      for (let i = 0; i < numFrame; i++) animSequence.push(i);
    }

    const bounds = {
      minDx: minDx === 9999 ? -25 : minDx,
      minDy: minDy === 9999 ? -15 : minDy,
      maxDx: maxDx === -9999 ? 25 : maxDx,
      maxDy: maxDy === -9999 ? 15 : maxDy,
      width: (maxDx - minDx) > 0 ? (maxDx - minDx) : (maxX || 50),
      height: (maxDy - minDy) > 0 ? (maxDy - minDy) : (maxY || 25),
    };

    res.json({
      ok: true,
      data: {
        id,
        numSmallImage,
        smallImages,
        numFrame,
        frames,
        animSequence,
        bounds,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Danh mục các hiệu ứng có sẵn trên hệ thống */
router.get('/effects-catalog', (_req, res) => {
  try {
    const base = getGameDataPath();
    const dir = path.join(base, 'effect', 'x4');
    if (!fs.existsSync(dir)) {
      return res.json({ ok: true, data: [] });
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
    const items = [];
    for (const f of files) {
      const match = f.match(/(?:ImgEffect[_\s]|)(\d+)\.png/i);
      if (match) {
        const id = Number(match[1]);
        if (Number.isFinite(id)) {
          items.push({
            id,
            fileName: f,
            url: `/api/v1/assets/effect/${id}.png`,
          });
        }
      }
    }
    items.sort((a, b) => a.id - b.id);
    res.json({ ok: true, data: items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Serve ảnh background (b00.png, b01.png, sun0.png, cl0.png, v.v.) */
router.get('/bg/:fileName', (req, res) => {
  const file = findBgImageFile(req.params.fileName);
  if (!file) return res.status(404).json({ ok: false, error: 'Background image not found' });
  return sendIconPng(res, file);
});

const PRESET_BG_METADATA = {
  0: { name: 'Làng Aru & Rừng Xanh', desc: 'Bầu trời xanh trong, đồi cỏ hoa lá, núi mờ phía xa của Trái Đất', planetId: 0, tag: 'Trái Đất' },
  1: { name: 'Đồi Hoa Cúc & Vách Đá', desc: 'Vách đá dốc màu tím hồng, thung lũng hoa cúc rực rỡ', planetId: 0, tag: 'Trái Đất' },
  2: { name: 'Thảo Nguyên & Đảo Bay Namếc', desc: 'Bầu trời xanh ngọc bích, các cụm đảo bay và nấm khổng lồ', planetId: 1, tag: 'Namếc' },
  3: { name: 'Thành Phố Đô Thị', desc: 'Tòa nhà cao tầng, đường cao tốc và ánh đèn đô thị hiện đại', planetId: 0, tag: 'Trái Đất' },
  4: { name: 'Sa Mạc & Cồn Cát Vàng', desc: 'Cồn cát vàng trải dài, núi đá sa thạch và ánh nắng gay gắt', planetId: 0, tag: 'Sa Mạc' },
  5: { name: 'Quần Đảo & Bờ Biển Xanh', desc: 'Đại dương trong vắt, bãi cát trắng và rạn san hô', planetId: 0, tag: 'Biển Đảo' },
  6: { name: 'Núi Băng Tuyết Nam Cực', desc: 'Băng giá vĩnh cửu, đỉnh núi tuyết phủ trắng xóa và gió tuyết', planetId: 0, tag: 'Băng Tuyết' },
  7: { name: 'Địa Ngục & Núi Lửa Dung Nham', desc: 'Bầu trời đỏ rực, dòng nham thạch sôi sục và vách đá quỷ', planetId: 2, tag: 'Địa Ngục' },
  8: { name: 'Thánh Địa Kaio & Thần Điện', desc: 'Bầu trời tiên cảnh thanh bình, mây trắng bồng bềnh', planetId: 0, tag: 'Thần Giới' },
  9: { name: 'Hành Tinh Xayda Hoang Tàn', desc: 'Đất đỏ cằn cỗi, bầu trời u ám và hẻm vực hiểm trở', planetId: 2, tag: 'Xayda' },
  10: { name: 'Vũ Trụ Không Gian & Tinh Vân', desc: 'Vũ trụ huyền bí sâu thẳm với ngàn vì sao và dải ngân hà', planetId: 3, tag: 'Vũ Trụ' },
  11: { name: 'Hang Động & Vách Đá Ngầm', desc: 'Hang đá tối tăm, thạch nhũ rủ xuống và vòm hang hiểm trở', planetId: 0, tag: 'Hang Động' },
  12: { name: 'Võ Đài Thi Đấu Đại Hội', desc: 'Bầu trời rộng lớn trên sàn đấu võ thuật đỉnh cao', planetId: 0, tag: 'Võ Đài' },
  13: { name: 'Tháp Karin & Cung Điện Kami', desc: 'Tầng mây cao vút giữa trời đất nhìn xuống trần gian', planetId: 0, tag: 'Trái Đất' },
  14: { name: 'Rừng Đại Thụ Nguyên Sinh', desc: 'Cây cổ thụ nghìn năm khổng lồ, thảm thực vật rậm rạp', planetId: 0, tag: 'Rừng Rậm' },
};

/** Lấy toàn bộ danh sách bộ background có trong data/bg kèm các lớp layer và decor */
router.get('/map-backgrounds', (_req, res) => {
  try {
    const base = getGameDataPath();
    const bgDir = path.join(base, 'bg');
    if (!fs.existsSync(bgDir)) {
      return res.json({ ok: true, data: { backgrounds: [], decorFiles: [] } });
    }

    const files = fs.readdirSync(bgDir);
    const bgMap = {};
    const decorFiles = [];

    for (const f of files) {
      const match = f.match(/^b(\d+)(\d)\.png$/i);
      if (match) {
        const bgId = parseInt(match[1], 10);
        const layer = parseInt(match[2], 10);
        if (!bgMap[bgId]) {
          const meta = PRESET_BG_METADATA[bgId] || {
            name: `Bộ Phông Nền #${bgId}`,
            desc: `Bộ phông nền đa tầng custom ID ${bgId}`,
            planetId: 0,
            tag: 'Tùy Chỉnh',
          };
          bgMap[bgId] = {
            bgId,
            name: meta.name,
            desc: meta.desc,
            planetId: meta.planetId,
            tag: meta.tag,
            layers: [],
          };
        }
        bgMap[bgId].layers.push({
          layer,
          fileName: f,
          url: `/api/v1/assets/bg/${f}`,
        });
      } else if (f.endsWith('.png')) {
        let decorType = 'other';
        if (f.startsWith('sun')) decorType = 'sun';
        else if (f.startsWith('cl')) decorType = 'cloud';
        else if (f.startsWith('fog')) decorType = 'fog';
        else if (f.startsWith('lacay')) decorType = 'leaf';
        else if (f.startsWith('mua')) decorType = 'rain';
        else if (f.startsWith('tuyet')) decorType = 'snow';
        else if (f.startsWith('fire')) decorType = 'fire';
        else if (f.startsWith('sao')) decorType = 'star';

        decorFiles.push({
          name: f,
          type: decorType,
          url: `/api/v1/assets/bg/${f}`,
        });
      }
    }

    const backgrounds = Object.values(bgMap).map((b) => {
      b.layers.sort((a, b) => a.layer - b.layer);
      return b;
    });
    backgrounds.sort((a, b) => a.bgId - b.bgId);
    decorFiles.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      ok: true,
      data: {
        backgrounds,
        decorFiles,
        totalSets: backgrounds.length,
        totalDecor: decorFiles.length,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Lấy chi tiết các lớp background cho bgId cụ thể */
router.get('/map-backgrounds/:bgId', (req, res) => {
  try {
    const bgId = Number(req.params.bgId);
    const layers = [];
    for (let l = 0; l <= 5; l++) {
      const fileName = `b${bgId}${l}.png`;
      const file = findBgImageFile(fileName);
      if (file) {
        layers.push({
          layer: l,
          fileName,
          url: `/api/v1/assets/bg/${fileName}`,
        });
      }
    }
    const meta = PRESET_BG_METADATA[bgId] || {
      name: `Bộ Phông Nền #${bgId}`,
      desc: `Bộ phông nền đa tầng custom ID ${bgId}`,
      planetId: 0,
      tag: 'Tùy Chỉnh',
    };

    res.json({
      ok: true,
      data: {
        bgId,
        name: meta.name,
        desc: meta.desc,
        planetId: meta.planetId,
        tag: meta.tag,
        layers,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Upload hoặc thay thế ảnh background / decor vào data/bg */
router.post('/map-backgrounds/upload', (req, res) => {
  try {
    const { bgId, layer, fileName, image, layers } = req.body;
    const base = getGameDataPath();
    const bgDir = path.join(base, 'bg');
    if (!fs.existsSync(bgDir)) {
      fs.mkdirSync(bgDir, { recursive: true });
    }

    const savedFiles = [];

    const saveBase64Image = (targetFileName, base64Data) => {
      const cleanFileName = String(targetFileName).replace(/[^a-zA-Z0-9$_.-]/g, '');
      if (!cleanFileName) throw new Error(`Tên file ${targetFileName} không hợp lệ`);
      const rawBase64 = String(base64Data).replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(rawBase64, 'base64');
      const targetPath = path.join(bgDir, cleanFileName);
      fs.writeFileSync(targetPath, buffer);
      savedFiles.push({
        fileName: cleanFileName,
        path: targetPath,
        url: `/api/v1/assets/bg/${cleanFileName}`,
      });
    };

    // 1. Upload cả bộ layers: [{ layer: 0, image: '...' }, ...]
    if (Array.isArray(layers) && layers.length > 0 && bgId !== undefined) {
      const parsedBgId = Number(bgId);
      if (!Number.isFinite(parsedBgId) || parsedBgId < 0) {
        return res.status(400).json({ ok: false, error: 'Background ID không hợp lệ' });
      }
      for (const item of layers) {
        if (item.image && item.layer !== undefined) {
          saveBase64Image(`b${parsedBgId}${item.layer}.png`, item.image);
        }
      }
    }
    // 2. Upload 1 layer lẻ: bgId + layer + image
    else if (bgId !== undefined && layer !== undefined && image) {
      const parsedBgId = Number(bgId);
      const parsedLayer = Number(layer);
      if (!Number.isFinite(parsedBgId) || parsedBgId < 0) {
        return res.status(400).json({ ok: false, error: 'Background ID không hợp lệ' });
      }
      saveBase64Image(`b${parsedBgId}${parsedLayer}.png`, image);
    }
    // 3. Upload file decor tự do: fileName + image
    else if (fileName && image) {
      saveBase64Image(fileName, image);
    } else {
      return res.status(400).json({ ok: false, error: 'Dữ liệu tải lên không đầy đủ (cần bgId + layer/layers + image hoặc fileName + image)' });
    }

    res.json({
      ok: true,
      message: `Đã lưu thành công ${savedFiles.length} tệp background vào data/bg`,
      data: {
        savedFiles,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/icons/meta', (_req, res) => {
  res.json({
    ok: true,
    data: {
      gameDataPath: getGameDataPath(),
      zoomOrder: process.env.GAME_ICON_ZOOM ? [Number(process.env.GAME_ICON_ZOOM)] : [4, 3, 2, 1],
    },
  });
});

export default router;

