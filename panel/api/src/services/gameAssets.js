import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
