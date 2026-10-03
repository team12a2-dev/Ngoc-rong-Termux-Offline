import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { stitchTileSet } from './tileStitcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Thư mục data game (chứa icon/x4/*.png) */
export function getGameDataPath() {
  if (process.env.GAME_DATA_PATH) {
    return path.resolve(process.env.GAME_DATA_PATH);
  }
  return path.resolve(__dirname, '../../../../data');
}

const ZOOM_ORDER = () => {
  const preferred = Number(process.env.GAME_ICON_ZOOM);
  const zooms = [4, 3, 2, 1];
  if (preferred && zooms.includes(preferred)) {
    return [preferred, ...zooms.filter((z) => z !== preferred)];
  }
  return zooms;
};

/** Tìm file PNG icon theo icon_id */
export function findIconFile(iconId) {
  const id = Number(iconId);
  if (!Number.isFinite(id) || id < 0) return null;
  const base = getGameDataPath();
  for (const z of ZOOM_ORDER()) {
    const file = path.join(base, 'icon', `x${z}`, `${id}.png`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

/** Tìm file PNG item_bg_temp theo bgId */
export function findItemBgFile(bgId) {
  const cleanId = String(bgId).replace(/[^a-zA-Z0-9$_-]/g, '');
  if (!cleanId) return null;
  const base = getGameDataPath();
  for (const z of ZOOM_ORDER()) {
    const candidates = [
      path.join(base, 'item_bg_temp', `x${z}`, `${cleanId}.png`),
      path.join(base, 'res', `x${z}`, `${z}bgItem${cleanId}`),
      path.join(base, 'res', `x${z}`, `${z}bgItem${cleanId}.png`),
      path.join(base, 'res', `x${z}`, `bgItem${cleanId}`),
      path.join(base, 'res', `x${z}`, `bgItem${cleanId}.png`),
      path.join(base, 'res', `x${z}`, `${cleanId}.png`),
      path.join(base, 'icon', `x${z}`, `${cleanId}.png`),
      path.join('C:/Users/bimat/Downloads/GirlkunToolCBRO/data/girlkun/icon', `x${z}`, `${cleanId}.png`),
      path.join('C:/Users/bimat/Downloads/Dragon ball_237b/Icon', `x${z}`, `${cleanId}.png`),
      path.join('C:/Users/bimat/Downloads/Dragon ball_237b/Data', `${z}bgItem${cleanId}.png`),
      path.join('C:/Users/bimat/Downloads/Dragon ball_237b/Data', `${z}bgItem${cleanId}`),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
  }
  return null;
}

/** Tìm file PNG sprite quái theo mobId */
export function findMobSpriteFile(mobId) {
  const cleanId = String(mobId).replace(/[^a-zA-Z0-9$_-]/g, '');
  if (!cleanId) return null;
  const base = getGameDataPath();

  // 1. Thư mục mob/{id}
  const mobDir = path.join(base, 'mob', cleanId);
  if (fs.existsSync(mobDir) && fs.statSync(mobDir).isDirectory()) {
    const default0 = path.join(mobDir, `${cleanId}_0.png`);
    if (fs.existsSync(default0)) return default0;
    const default1 = path.join(mobDir, `${cleanId}_1.png`);
    if (fs.existsSync(default1)) return default1;
    const files = fs.readdirSync(mobDir).filter((f) => f.endsWith('.png'));
    if (files.length > 0) return path.join(mobDir, files[0]);
  }

  // 2. Các vị trí khác
  const candidates = [
    path.join(base, 'mob', `${cleanId}.png`),
    path.join(base, 'mob', 'x4', `${cleanId}.png`),
    path.join(base, 'mob', 'x2', `${cleanId}.png`),
    path.join(base, 'icon', 'x4', `${cleanId}.png`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

/** Tìm file PNG tileset theo tileId (1..42+) */
export function findTileSetFile(tileId) {
  const cleanId = String(tileId).replace(/[^a-zA-Z0-9$_-]/g, '');
  if (!cleanId) return null;
  const base = getGameDataPath();
  const candidates = [
    path.join(base, 'tile', `${cleanId}.png`),
    path.join(base, 'tile', cleanId),
    path.join(base, 'map', 'tile', `${cleanId}.png`),
    path.join(base, 'map', 'tile', cleanId),
    path.join(base, 'tile', `x4`, `${cleanId}.png`),
    path.join(base, 'tile', `x2`, `${cleanId}.png`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }

  // Tự động ghép dải gạch từ data/res nếu có các mảnh {tileId}$1..N
  try {
    const ok = stitchTileSet(cleanId);
    if (ok) {
      const generated = path.join(base, 'tile', `${cleanId}.png`);
      if (fs.existsSync(generated)) return generated;
    }
  } catch (e) {
    console.error(`Auto-stitch tile set ${cleanId} failed:`, e.message);
  }

  return null;
}

/** Tìm file PNG hiệu ứng theo effId (ImgEffect_{id}.png) */
export function findEffectFile(effId) {
  const cleanId = String(effId).replace(/[^a-zA-Z0-9$_-]/g, '');
  if (!cleanId) return null;
  const base = getGameDataPath();
  for (const z of ZOOM_ORDER()) {
    const candidates = [
      path.join(base, 'effect', `x${z}`, `ImgEffect_${cleanId}.png`),
      path.join(base, 'effect', `x${z}`, `ImgEffect ${cleanId}.png`),
      path.join(base, 'effect', `x${z}`, `${cleanId}.png`),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
  }
  return null;
}

/** Tìm file PNG background theo tên file (b00.png, sun0.png, cl0.png, v.v.) */
export function findBgImageFile(fileName) {
  const cleanName = String(fileName).replace(/[^a-zA-Z0-9$_.-]/g, '');
  if (!cleanName) return null;
  const base = getGameDataPath();
  const candidates = [
    path.join(base, 'bg', cleanName),
    path.join(base, 'bg', `${cleanName}.png`),
    path.join(base, 'map', 'bg', cleanName),
    path.join(base, 'map', 'bg', `${cleanName}.png`),
    path.join('C:/Users/bimat/Downloads/GirlkunToolCBRO/data/bg', cleanName),
    path.join('C:/Users/bimat/Downloads/GirlkunToolCBRO/data/bg', `${cleanName}.png`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}


