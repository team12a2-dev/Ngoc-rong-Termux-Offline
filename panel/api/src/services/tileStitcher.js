import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getGameDataPath() {
  if (process.env.GAME_DATA_PATH) {
    return path.resolve(process.env.GAME_DATA_PATH);
  }
  return path.resolve(__dirname, '../../../../data');
}

export const TILE_BASE_SIZE = 24;
export const MASTER_TILE_SIZE = 96; // x4 standard master resolution (96x96 px)

/**
 * Thuật toán Resampling điểm ảnh chuẩn Pixel Art (Point / Nearest Neighbor Sampling)
 * Tuyệt đối KHÔNG làm mờ, KHÔNG nội suy trộn màu hay khử răng cưa làm nhòe viền gạch
 */
export function resamplePixelArt(srcPng, targetW, targetH) {
  if (srcPng.width === targetW && srcPng.height === targetH) {
    const clone = new PNG({ width: targetW, height: targetH });
    srcPng.data.copy(clone.data);
    return clone;
  }

  const dstPng = new PNG({ width: targetW, height: targetH });
  const sw = srcPng.width;
  const sh = srcPng.height;

  for (let dy = 0; dy < targetH; dy++) {
    const sy = Math.min(sh - 1, Math.floor((dy * sh) / targetH));
    for (let dx = 0; dx < targetW; dx++) {
      const sx = Math.min(sw - 1, Math.floor((dx * sw) / targetW));
      const sIdx = (sy * sw + sx) * 4;
      const dIdx = (dy * targetW + dx) * 4;

      dstPng.data[dIdx] = srcPng.data[sIdx];
      dstPng.data[dIdx + 1] = srcPng.data[sIdx + 1];
      dstPng.data[dIdx + 2] = srcPng.data[sIdx + 2];
      dstPng.data[dIdx + 3] = srcPng.data[sIdx + 3];
    }
  }

  return dstPng;
}

/**
 * Tìm số lượng mảnh gạch tối đa của một TileSet
 */
export function getTileCountForSet(tileId) {
  const cleanId = String(tileId).replace(/[^a-zA-Z0-9$_-]/g, '');
  if (!cleanId) return 0;
  const base = getGameDataPath();

  // 1. Kiểm tra dải gạch chuẩn 24px
  const normStrip = path.join(base, 'tile', `${cleanId}.png`);
  if (fs.existsSync(normStrip)) {
    try {
      const buf = fs.readFileSync(normStrip);
      if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
        const h = buf.readUInt32BE(20);
        const count = Math.floor(h / TILE_BASE_SIZE);
        if (count > 0) return count;
      }
    } catch (_) {}
  }

  // 2. Kiểm tra dải gạch x4 master
  const x4Strip = path.join(base, 'tile', 'x4', `${cleanId}.png`);
  if (fs.existsSync(x4Strip)) {
    try {
      const buf = fs.readFileSync(x4Strip);
      if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
        const h = buf.readUInt32BE(20);
        const count = Math.floor(h / MASTER_TILE_SIZE);
        if (count > 0) return count;
      }
    } catch (_) {}
  }

  // 3. Quét các file mảnh res/x4, res/x3, res/x2, res/x1
  let maxIdx = 0;
  for (const z of ['x4', 'x3', 'x2', 'x1']) {
    const dir = path.join(base, 'res', z);
    if (!fs.existsSync(dir)) continue;
    const allFiles = fs.readdirSync(dir);
    for (const f of allFiles) {
      if (f.startsWith(`${cleanId}$`)) {
        const idx = parseInt(f.split('$')[1], 10);
        if (!isNaN(idx) && idx > maxIdx) maxIdx = idx;
      }
    }
  }

  return maxIdx;
}

/**
 * ĐỒNG BỘ TILESET TOÀN DIỆN (CẢ TỪNG MẢNH $ VÀ TOÀN BỘ DẢI STRIP NGUYÊN BẢN) CHO X1, X2, X3, X4
 * - Đảm bảo data/res/x4/{id}$1..N là 96x96 VÀ data/res/x4/{id} cũng là 96px width (không bị co nhỏ 24px gây mờ)
 * - Đảm bảo data/res/x3/{id}$1..N là 72x72 VÀ data/res/x3/{id} cũng là 72px width
 * - Đảm bảo data/res/x2/{id}$1..N là 48x48 VÀ data/res/x2/{id} cũng là 48px width
 * - Đảm bảo data/res/x1/{id}$1..N là 24x24 VÀ data/res/x1/{id} cũng là 24px width
 */
export function syncTileSetToAllZooms(tileId) {
  const cleanId = String(tileId).replace(/[^a-zA-Z0-9$_-]/g, '');
  if (!cleanId) return false;

  const base = getGameDataPath();
  const tileCount = getTileCountForSet(cleanId);
  if (tileCount <= 0) return false;

  // Chuẩn bị thư mục đích
  for (const z of [1, 2, 3, 4]) {
    const dir = path.join(base, 'res', `x${z}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const tileDir = path.join(base, 'tile');
  const tileX4Dir = path.join(base, 'tile', 'x4');
  if (!fs.existsSync(tileDir)) fs.mkdirSync(tileDir, { recursive: true });
  if (!fs.existsSync(tileX4Dir)) fs.mkdirSync(tileX4Dir, { recursive: true });

  // Kiểm tra nếu có sẵn Standard Strip 24 hoặc Master Strip x4
  let standardStrip24 = null;
  const stdStripPath = path.join(tileDir, `${cleanId}.png`);
  if (fs.existsSync(stdStripPath)) {
    try {
      standardStrip24 = PNG.sync.read(fs.readFileSync(stdStripPath));
    } catch (_) {}
  }

  let masterStrip96 = null;
  const x4StripPath = path.join(tileX4Dir, `${cleanId}.png`);
  if (fs.existsSync(x4StripPath)) {
    try {
      masterStrip96 = PNG.sync.read(fs.readFileSync(x4StripPath));
    } catch (_) {}
  }

  try {
    // Khởi tạo các dải texture strip chuẩn cho từng độ phân giải x1 (24px), x2 (48px), x3 (72px), x4 (96px)
    const strips = {
      1: new PNG({ width: 24, height: tileCount * 24 }),
      2: new PNG({ width: 48, height: tileCount * 48 }),
      3: new PNG({ width: 72, height: tileCount * 72 }),
      4: new PNG({ width: 96, height: tileCount * 96 }),
    };
    strips[1].data.fill(0);
    strips[2].data.fill(0);
    strips[3].data.fill(0);
    strips[4].data.fill(0);

    const hasHDStrip = masterStrip96 && masterStrip96.width === MASTER_TILE_SIZE;

    for (let i = 1; i <= tileCount; i++) {
      let tile24 = null;
      let tile96 = null;

      if (hasHDStrip) {
        const startY96 = (i - 1) * MASTER_TILE_SIZE;
        tile96 = new PNG({ width: MASTER_TILE_SIZE, height: MASTER_TILE_SIZE });
        PNG.bitblt(masterStrip96, tile96, 0, startY96, MASTER_TILE_SIZE, MASTER_TILE_SIZE, 0, 0);
        tile24 = resamplePixelArt(tile96, 24, 24);
      } else if (standardStrip24 && standardStrip24.width === TILE_BASE_SIZE) {
        const startY24 = (i - 1) * TILE_BASE_SIZE;
        tile24 = new PNG({ width: TILE_BASE_SIZE, height: TILE_BASE_SIZE });
        PNG.bitblt(standardStrip24, tile24, 0, startY24, TILE_BASE_SIZE, TILE_BASE_SIZE, 0, 0);
        tile96 = resamplePixelArt(tile24, 96, 96);
      } else {
        const x4File = path.join(base, 'res', 'x4', `${cleanId}$${i}`);
        const x1File = path.join(base, 'res', 'x1', `${cleanId}$${i}`);
        if (fs.existsSync(x4File)) {
          tile96 = PNG.sync.read(fs.readFileSync(x4File));
          tile24 = resamplePixelArt(tile96, 24, 24);
        } else if (fs.existsSync(x1File)) {
          tile24 = PNG.sync.read(fs.readFileSync(x1File));
          tile96 = resamplePixelArt(tile24, 96, 96);
        } else {
          tile24 = new PNG({ width: 24, height: 24 });
          tile24.data.fill(0);
          tile96 = new PNG({ width: 96, height: 96 });
          tile96.data.fill(0);
        }
      }

      const tile48 = resamplePixelArt(tile24, 48, 48);
      const tile72 = resamplePixelArt(tile24, 72, 72);

      // 1. Ghi các mảnh {id}$i riêng rẽ cho từng zoom
      fs.writeFileSync(path.join(base, 'res', 'x1', `${cleanId}$${i}`), PNG.sync.write(tile24));
      fs.writeFileSync(path.join(base, 'res', 'x2', `${cleanId}$${i}`), PNG.sync.write(tile48));
      fs.writeFileSync(path.join(base, 'res', 'x3', `${cleanId}$${i}`), PNG.sync.write(tile72));
      fs.writeFileSync(path.join(base, 'res', 'x4', `${cleanId}$${i}`), PNG.sync.write(tile96));

      // 2. Blit vào các dải texture strips x1, x2, x3, x4 tương ứng
      PNG.bitblt(tile24, strips[1], 0, 0, 24, 24, 0, (i - 1) * 24);
      PNG.bitblt(tile48, strips[2], 0, 0, 48, 48, 0, (i - 1) * 48);
      PNG.bitblt(tile72, strips[3], 0, 0, 72, 72, 0, (i - 1) * 72);
      PNG.bitblt(tile96, strips[4], 0, 0, 96, 96, 0, (i - 1) * 96);
    }

    // 3. Ghi toàn bộ các dải strip nguyên khối {id} và {id}.png vào TỪNG THƯ MỤC res/x1, x2, x3, x4
    for (const z of [1, 2, 3, 4]) {
      const stripBuf = PNG.sync.write(strips[z]);
      const resDir = path.join(base, 'res', `x${z}`);
      fs.writeFileSync(path.join(resDir, `${cleanId}`), stripBuf);
      fs.writeFileSync(path.join(resDir, `${cleanId}.png`), stripBuf);
    }

    // 4. Ghi dải texture master strip x4 (96px) và standard strip x1 (24px) trong data/tile
    const masterStripBuf = PNG.sync.write(strips[4]);
    fs.writeFileSync(path.join(tileX4Dir, `${cleanId}.png`), masterStripBuf);
    fs.writeFileSync(path.join(tileX4Dir, cleanId), masterStripBuf);

    const stdStripBuf = PNG.sync.write(strips[1]);
    fs.writeFileSync(path.join(tileDir, `${cleanId}.png`), stdStripBuf);
    fs.writeFileSync(path.join(tileDir, cleanId), stdStripBuf);

    return { ok: true, tileCount };
  } catch (err) {
    console.error(`Error in syncTileSetToAllZooms for tileId ${cleanId}:`, err);
    return false;
  }
}

/**
 * Stitch và đồng bộ TileSet từ các mảnh riêng rẽ
 */
export function stitchTileSet(setId) {
  const res = syncTileSetToAllZooms(setId);
  return Boolean(res && res.ok);
}

/**
 * Đồng bộ toàn bộ các bộ gạch (TileSets 1..42+) sang x1, x2, x3, x4 chuẩn sắc nét
 */
export function syncAllTileSetsToAllZooms() {
  const base = getGameDataPath();
  const allIds = new Set();

  // Quét từ data/tile
  const tileDir = path.join(base, 'tile');
  if (fs.existsSync(tileDir)) {
    const files = fs.readdirSync(tileDir);
    for (const f of files) {
      if (f.endsWith('.png')) {
        const id = parseInt(f.replace('.png', ''), 10);
        if (!isNaN(id) && id > 0) allIds.add(id);
      }
    }
  }

  let synced = 0;
  for (const id of Array.from(allIds).sort((a, b) => a - b)) {
    const res = syncTileSetToAllZooms(id);
    if (res && res.ok) {
      synced++;
    }
  }
  return synced;
}

/**
 * Tự động tăng phiên bản vsMap và vsRes trong DataGame.java để buộc Android/PC xoá cache cũ và đồng bộ mới.
 */
export function bumpGameVersions() {
  try {
    const rootPath = path.resolve(getGameDataPath(), '..');
    const dataGamePath = path.join(rootPath, 'src', 'nro', 'models', 'data', 'DataGame.java');
    if (!fs.existsSync(dataGamePath)) return false;

    let content = fs.readFileSync(dataGamePath, 'utf8');
    let vsMap = 2;
    let vsRes = 2;

    content = content.replace(/public\s+static\s+byte\s+vsMap\s*=\s*(\d+);/, (match, p1) => {
      vsMap = (parseInt(p1, 10) % 120) + 1;
      return `public static byte vsMap = ${vsMap};`;
    });

    content = content.replace(/public\s+static\s+int\s+vsRes\s*=\s*(\d+);/, (match, p1) => {
      vsRes = parseInt(p1, 10) + 1;
      return `public static int vsRes = ${vsRes};`;
    });

    fs.writeFileSync(dataGamePath, content, 'utf8');
    return { vsMap, vsRes };
  } catch (err) {
    console.error('Error bumping game versions in DataGame.java:', err.message);
    return false;
  }
}
