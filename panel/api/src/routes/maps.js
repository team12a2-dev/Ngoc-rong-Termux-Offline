import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { getGameDataPath } from '../services/gameAssets.js';
import { auditLog } from '../services/audit.js';
import { reloadGameResource } from '../services/liveSync.js';
import { syncTileSetToAllZooms, syncAllTileSetsToAllZooms, bumpGameVersions } from '../services/tileStitcher.js';

const router = Router();
router.use(authMiddleware);

function intValue(value, fallback = 0, min = -2147483648, max = 2147483647) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function stringValue(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

/** Đọc kích thước và ma trận ô gạch từ binary file data/map/tile_map_data/{mapId} */
function readTileMapData(mapId) {
  try {
    const filePath = path.join(getGameDataPath(), 'map', 'tile_map_data', String(mapId));
    if (!fs.existsSync(filePath)) {
      return { tmw: 60, tmh: 20, pxw: 1440, pxh: 480, hasFile: false, tiles: [] };
    }
    const buf = fs.readFileSync(filePath);
    if (buf.length < 2) {
      return { tmw: 60, tmh: 20, pxw: 1440, pxh: 480, hasFile: false, tiles: [] };
    }

    const b0 = buf[0];
    const b1 = buf[1];
    const b2 = buf.length > 2 ? buf[2] : 0;

    let tmw = 60;
    let tmh = 20;
    let startIdx = 2;

    if (b0 > 0 && b1 > 0 && Math.abs(buf.length - (2 + b0 * b1)) <= 5) {
      // Chuẩn 2-byte header: b0 = tmw, b1 = tmh
      tmw = b0;
      tmh = b1;
      startIdx = 2;
    } else if (b0 === 0 && b1 > 0 && b2 > 0 && Math.abs(buf.length - (3 + b1 * b2)) <= 5) {
      // Chuẩn 3-byte header: version 0, b1 = tmw, b2 = tmh
      tmw = b1;
      tmh = b2;
      startIdx = 3;
    } else {
      tmw = b0 > 0 ? b0 : (b1 > 0 ? b1 : 60);
      tmh = b1 > 0 ? b1 : (b2 > 0 ? b2 : 20);
      startIdx = 2;
    }

    const totalCells = tmw * tmh;
    const tiles = [];
    for (let i = 0; i < totalCells; i++) {
      const idx = startIdx + i;
      tiles.push(idx < buf.length ? buf[idx] : 0);
    }

    return {
      tmw,
      tmh,
      pxw: tmw * 24,
      pxh: tmh * 24,
      hasFile: true,
      tiles,
    };
  } catch (err) {
    console.error(`Error reading tile_map_data for map ${mapId}:`, err);
    return { tmw: 60, tmh: 20, pxw: 1440, pxh: 480, hasFile: false, tiles: [] };
  }
}

function readTileMapDimensions(mapId) {
  return readTileMapData(mapId);
}

/** Đọc danh sách background items / decor từ file binary data/map/item_bg_map_data/{mapId} */
function readItemBgMapData(mapId, bgTemplateMap = null) {
  try {
    const filePath = path.join(getGameDataPath(), 'map', 'item_bg_map_data', String(mapId));
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    if (buf.length < 2) return [];
    const count = buf.readInt16BE(0);
    const items = [];
    for (let i = 0; i < count; i++) {
      const offset = 2 + i * 6;
      if (offset + 6 > buf.length) break;
      const id = buf.readInt16BE(offset);
      const x = buf.readInt16BE(offset + 2);
      const y = buf.readInt16BE(offset + 4);

      const tmpl = bgTemplateMap?.get(id);
      const imageId = tmpl ? tmpl.image_id : id;
      const dx = tmpl ? tmpl.dx : 0;
      const dy = tmpl ? tmpl.dy : 0;
      const layer = tmpl ? tmpl.layer : 1;

      items.push({
        id: i + 1,
        bgTempId: id,
        imageId,
        layer,
        dx,
        dy,
        x,
        y,
        px: x * 24 + dx,
        py: y * 24 + dy,
        imageUrl: `/api/v1/assets/item-bg/${imageId}.png`,
      });
    }
    return items;
  } catch (err) {
    console.error(`Error reading item_bg_map_data for map ${mapId}:`, err);
    return [];
  }
}

/** Ghi danh sách background items / decor vào file binary data/map/item_bg_map_data/{mapId} */
async function writeItemBgMapData(mapId, items) {
  try {
    const base = getGameDataPath();
    const dir = path.join(base, 'map', 'item_bg_map_data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, String(mapId));

    if (!Array.isArray(items) || items.length === 0) {
      const buf = Buffer.alloc(2);
      buf.writeInt16BE(0, 0);
      fs.writeFileSync(filePath, buf);
      return true;
    }

    // Tra cứu danh mục template để lấy dx, dy và đồng bộ layer chuẩn xác
    const allTemplates = await query('SELECT id, image_id, layer, dx, dy FROM bg_item_template').catch(() => []);
    const tmplMap = new Map();
    allTemplates.forEach((t) => tmplMap.set(Number(t.id), t));

    const count = items.length;
    const buf = Buffer.alloc(2 + count * 6);
    buf.writeInt16BE(count, 0);
    for (let i = 0; i < count; i++) {
      const it = items[i];
      const offset = 2 + i * 6;
      let bgTempId = intValue(it.bgTempId ?? it.id, 0);
      let curTmpl = tmplMap.get(bgTempId);

      // Nếu người dùng chọn layer cụ thể (ví dụ L3 dưới gạch, L1 mặt đất, L2 tiền cảnh, L4 parallax):
      if (it.layer !== undefined && curTmpl && Number(curTmpl.layer) !== Number(it.layer)) {
        const targetLayer = Number(it.layer);
        let matchTmpl = allTemplates.find((t) => Number(t.image_id) === Number(curTmpl.image_id) && Number(t.layer) === targetLayer);
        if (!matchTmpl) {
          try {
            const maxRow = await query('SELECT MAX(id) as maxId FROM bg_item_template');
            const newId = ((maxRow && maxRow[0] && maxRow[0].maxId) || 597) + 1;
            await query(
              'INSERT INTO bg_item_template (id, image_id, layer, dx, dy) VALUES (?, ?, ?, ?, ?)',
              [newId, Number(curTmpl.image_id), targetLayer, curTmpl.dx || 0, curTmpl.dy || 0]
            );
            matchTmpl = { id: newId, image_id: Number(curTmpl.image_id), layer: targetLayer, dx: curTmpl.dx || 0, dy: curTmpl.dy || 0 };
            allTemplates.push(matchTmpl);
            tmplMap.set(newId, matchTmpl);
          } catch (e) {
            console.error('Error auto-creating bg_item_template for layer change:', e.message);
          }
        }
        if (matchTmpl) {
          bgTempId = matchTmpl.id;
          curTmpl = matchTmpl;
        }
      }

      const dx = curTmpl ? curTmpl.dx : (it.dx || 0);
      const dy = curTmpl ? curTmpl.dy : (it.dy || 0);

      // Khấu trừ chuẩn xác dx/dy khi tính toán toạ độ ô gạch: X_pixel = x_tile * 24 + dx
      let x = intValue(it.x, 0);
      let y = intValue(it.y, 0);
      if (it.px !== undefined && it.px !== null && Number.isFinite(Number(it.px))) {
        x = Math.max(0, Math.round((Number(it.px) - dx) / 24));
      }
      if (it.py !== undefined && it.py !== null && Number.isFinite(Number(it.py))) {
        y = Math.max(0, Math.round((Number(it.py) - dy) / 24));
      }

      buf.writeInt16BE(bgTempId, offset);
      buf.writeInt16BE(x, offset + 2);
      buf.writeInt16BE(y, offset + 4);
    }
    fs.writeFileSync(filePath, buf);
    return true;
  } catch (err) {
    console.error(`Error writing item_bg_map_data for map ${mapId}:`, err);
    return false;
  }
}

/** Đọc danh sách hiệu ứng bản đồ từ binary file data/map/eff_map/{mapId} */
function readEffMapData(mapId) {
  try {
    const filePath = path.join(getGameDataPath(), 'map', 'eff_map', String(mapId));
    if (!fs.existsSync(filePath)) return { effs: [], beffs: [] };
    const buf = fs.readFileSync(filePath);
    if (buf.length < 2) return { effs: [], beffs: [] };
    let offset = 0;
    const count = buf.readInt16BE(offset); offset += 2;
    const effs = [];
    const beffs = [];
    for (let i = 0; i < count; i++) {
      if (offset + 2 > buf.length) break;
      const kLen = buf.readInt16BE(offset); offset += 2;
      if (offset + kLen > buf.length) break;
      const key = buf.toString('utf8', offset, offset + kLen); offset += kLen;
      if (offset + 2 > buf.length) break;
      const vLen = buf.readInt16BE(offset); offset += 2;
      if (offset + vLen > buf.length) break;
      const val = buf.toString('utf8', offset, offset + vLen); offset += vLen;

      if (key === 'eff') {
        const parts = val.split('.');
        effs.push({
          id: effs.length + 1,
          effId: Number(parts[0]) || 0,
          layer: Number(parts[1]) || 1,
          x: Number(parts[2]) || 0,
          y: Number(parts[3]) || 0,
          loop: parts[4] !== undefined ? Number(parts[4]) : -1,
          delay: parts[5] !== undefined ? Number(parts[5]) : 0,
          extra: parts.slice(6).join('.'),
          raw: val,
        });
      } else if (key === 'beff') {
        beffs.push({
          id: beffs.length + 1,
          beffId: Number(val) || 0,
          val,
        });
      }
    }
    return { effs, beffs };
  } catch (err) {
    console.error(`Error reading eff_map for map ${mapId}:`, err);
    return { effs: [], beffs: [] };
  }
}

/** Ghi danh sách hiệu ứng bản đồ vào binary file data/map/eff_map/{mapId} */
function writeEffMapData(mapId, effects) {
  try {
    const base = getGameDataPath();
    const dir = path.join(base, 'map', 'eff_map');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, String(mapId));

    const effs = Array.isArray(effects?.effs) ? effects.effs : [];
    const beffs = Array.isArray(effects?.beffs) ? effects.beffs : [];
    const entries = [];

    for (const e of effs) {
      let val = `${intValue(e.effId, 0)}.${intValue(e.layer, 1)}.${intValue(e.x, 0)}.${intValue(e.y, 0)}`;
      const hasLoop = e.loop !== undefined && e.loop !== null && e.loop !== '';
      const hasDelay = e.delay !== undefined && e.delay !== null && e.delay !== '';
      const hasExtra = Boolean(e.extra);
      if (hasExtra) {
        val += `.${intValue(e.loop, -1)}.${intValue(e.delay, 0)}.${e.extra}`;
      } else if (hasDelay && Number(e.delay) > 0) {
        val += `.${intValue(e.loop, -1)}.${intValue(e.delay, 0)}`;
      } else if (hasLoop && Number(e.loop) !== -1) {
        val += `.${intValue(e.loop, -1)}`;
      }
      entries.push({ key: 'eff', val });
    }

    for (const b of beffs) {
      const beffId = b.beffId !== undefined ? b.beffId : (b.val || b);
      entries.push({ key: 'beff', val: String(intValue(beffId, 0)) });
    }

    const chunks = [];
    const header = Buffer.alloc(2);
    header.writeInt16BE(entries.length, 0);
    chunks.push(header);

    for (const entry of entries) {
      const kBuf = Buffer.from(entry.key, 'utf8');
      const kLen = Buffer.alloc(2); kLen.writeInt16BE(kBuf.length, 0);
      chunks.push(kLen, kBuf);

      const vBuf = Buffer.from(entry.val, 'utf8');
      const vLen = Buffer.alloc(2); vLen.writeInt16BE(vBuf.length, 0);
      chunks.push(vLen, vBuf);
    }

    fs.writeFileSync(filePath, Buffer.concat(chunks));
    return true;
  } catch (err) {
    console.error(`Error writing eff_map for map ${mapId}:`, err);
    return false;
  }
}


/** Ghi / Thay đổi kích thước Tile Map trong file binary data/map/tile_map_data/{mapId} */
function writeTileMapDimensions(mapId, newTmw, newTmh, newTiles = null) {
  try {
    const base = getGameDataPath();
    const dir = path.join(base, 'map', 'tile_map_data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, String(mapId));

    const current = readTileMapData(mapId);
    const tmw = Math.max(10, Math.min(250, intValue(newTmw, current.tmw)));
    const tmh = Math.max(5, Math.min(250, intValue(newTmh, current.tmh)));

    const totalCells = tmw * tmh;
    const newBuf = Buffer.alloc(2 + totalCells);
    newBuf[0] = tmw;
    newBuf[1] = tmh;

    if (Array.isArray(newTiles) && newTiles.length === totalCells) {
      for (let i = 0; i < totalCells; i++) {
        newBuf[2 + i] = intValue(newTiles[i], 0);
      }
    } else {
      const oldTmw = current.tmw;
      const oldTmh = current.tmh;
      const oldTiles = current.tiles || [];

      for (let row = 0; row < tmh; row++) {
        for (let col = 0; col < tmw; col++) {
          const newIdx = row * tmw + col;
          if (col < oldTmw && row < oldTmh) {
            const oldIdx = row * oldTmw + col;
            newBuf[2 + newIdx] = oldTiles[oldIdx] ?? 0;
          } else {
            newBuf[2 + newIdx] = 0;
          }
        }
      }
    }

    fs.writeFileSync(filePath, newBuf);
    return { tmw, tmh, pxw: tmw * 24, pxh: tmh * 24 };
  } catch (err) {
    console.error(`Error writing tile_map_data for map ${mapId}:`, err);
    return null;
  }
}

/** Parse JSON waypoints đa tầng từ chuỗi DB */
function parseWaypoints(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    let clean = String(raw)
      .replaceAll('["[', '[[')
      .replaceAll(']"]', ']]')
      .replaceAll('","', ',');
    let parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item, idx) => {
      let arr = item;
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch { arr = []; }
      }
      if (!Array.isArray(arr) || arr.length < 10) {
        return null;
      }
      return {
        id: idx + 1,
        name: String(arr[0] || ''),
        minX: intValue(arr[1], 0),
        minY: intValue(arr[2], 0),
        maxX: intValue(arr[3], 0),
        maxY: intValue(arr[4], 0),
        isEnter: intValue(arr[5], 0) === 1,
        isOffline: intValue(arr[6], 0) === 1,
        goMap: intValue(arr[7], 0),
        goX: intValue(arr[8], 0),
        goY: intValue(arr[9], 0),
      };
    }).filter(Boolean);
  } catch (err) {
    console.error('Error parsing waypoints:', err);
    return [];
  }
}

/** Parse JSON mobs từ chuỗi DB */
function parseMobs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    let clean = String(raw).replace(/[\r\n\t]/g, ' ').trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      try { clean = JSON.parse(clean); } catch (_) {}
    }
    clean = clean.replaceAll('\\"', '"');
    let parsed = null;
    try {
      parsed = JSON.parse(clean);
    } catch (_) {
      // Fallback: extract arrays like [0, 1, 100, 200, 300]
      const matches = [...clean.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)[^\]]*\]/g)];
      if (matches.length > 0) {
        parsed = matches.map((m) => [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])]);
      }
    }
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item, idx) => {
      let arr = item;
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch { arr = []; }
      }
      if (!Array.isArray(arr) || arr.length < 5) {
        return null;
      }
      return {
        id: idx + 1,
        mobTempId: intValue(arr[0], 0),
        mobLevel: intValue(arr[1], 1),
        mobHp: intValue(arr[2], 100),
        mobX: intValue(arr[3], 0),
        mobY: intValue(arr[4], 0),
      };
    }).filter(Boolean);
  } catch (err) {
    return [];
  }
}

/** Parse JSON npcs từ chuỗi DB */
function parseNpcs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    let clean = String(raw).replaceAll('\\"', '');
    let parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item, idx) => {
      let arr = item;
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch { arr = []; }
      }
      if (!Array.isArray(arr) || arr.length < 3) {
        return null;
      }
      return {
        id: idx + 1,
        npcTempId: intValue(arr[0], 0),
        npcX: intValue(arr[1], 0),
        npcY: intValue(arr[2], 0),
      };
    }).filter(Boolean);
  } catch (err) {
    console.error('Error parsing npcs:', err);
    return [];
  }
}

/** Chuyển danh sách waypoints thành format chuỗi JSON cho DB */
function serializeWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) return '[]';
  const data = waypoints.map((w) => [
    stringValue(w.name, 'Qua map'),
    intValue(w.minX, 0),
    intValue(w.minY, 0),
    intValue(w.maxX, 24),
    intValue(w.maxY, 24),
    w.isEnter ? 1 : 0,
    w.isOffline ? 1 : 0,
    intValue(w.goMap, 0),
    intValue(w.goX, 0),
    intValue(w.goY, 0),
  ]);
  return JSON.stringify(data);
}

/** Chuyển danh sách mobs thành format chuỗi JSON cho DB */
function serializeMobs(mobs) {
  if (!Array.isArray(mobs)) return '[]';
  const data = mobs.map((m) => [
    intValue(m.mobTempId, 0),
    intValue(m.mobLevel, 1),
    intValue(m.mobHp, 100),
    intValue(m.mobX, 0),
    intValue(m.mobY, 0),
  ]);
  return JSON.stringify(data);
}

/** Chuyển danh sách npcs thành format chuỗi JSON cho DB */
function serializeNpcs(npcs) {
  if (!Array.isArray(npcs)) return '[]';
  const data = npcs.map((n) => [
    intValue(n.npcTempId, 0),
    intValue(n.npcX, 0),
    intValue(n.npcY, 0),
  ]);
  return JSON.stringify(data);
}

/** Đọc cấu hình vật phẩm rơi (Drop items) của Map từ panel_map_drop_configs & panel_map_drop_items */
async function readMapDropConfig(mapId) {
  try {
    const configRows = await query(
      `SELECT * FROM panel_map_drop_configs WHERE map_id = ? AND server_id = 1 LIMIT 1`,
      [mapId]
    ).catch(() => []);

    if (!configRows || configRows.length === 0) {
      return {
        enabled: true,
        goldEnabled: false,
        goldChancePercent: 10,
        goldMin: 100,
        goldMax: 1000,
        activationEnabled: false,
        activationChancePercent: 0.1,
        items: [],
      };
    }

    const conf = configRows[0];
    const itemRows = await query(
      `SELECT d.*, it.NAME AS item_name, it.icon_id, it.gender, it.power_require
       FROM panel_map_drop_items d
       LEFT JOIN item_template it ON it.id = d.temp_id
       WHERE d.config_id = ?
       ORDER BY d.id ASC`,
      [conf.id]
    ).catch(() => []);

    const items = itemRows.map((it) => {
      let options = [];
      try {
        options = typeof it.options_json === 'string' ? JSON.parse(it.options_json) : (it.options_json || []);
        if (!Array.isArray(options)) options = [];
      } catch {
        options = [];
      }
      return {
        id: it.id,
        tempId: it.temp_id,
        itemName: it.item_name || `Vật phẩm #${it.temp_id}`,
        iconId: it.icon_id,
        mobTempId: it.mob_temp_id !== undefined ? it.mob_temp_id : -1,
        chancePercent: Number(it.chance_percent) || 1,
        quantityMin: it.quantity_min || 1,
        quantityMax: it.quantity_max || 1,
        spreadCountMin: it.spread_count_min ?? 1,
        spreadCountMax: it.spread_count_max ?? 1,
        spreadDistance: it.spread_distance ?? 25,
        playerLevelMin: it.player_level_min ?? 0,
        playerLevelMax: it.player_level_max ?? 19,
        timeStartMin: it.time_start_min ?? 0,
        timeEndMin: it.time_end_min ?? 1440,
        enabled: Number(it.enabled) === 1,
        options,
      };
    });

    return {
      id: conf.id,
      enabled: Number(conf.enabled) === 1,
      goldEnabled: Number(conf.gold_enabled) === 1,
      goldChancePercent: Number(conf.gold_chance_percent) || 0,
      goldMin: conf.gold_min || 0,
      goldMax: conf.gold_max || 0,
      activationEnabled: Number(conf.activation_enabled) === 1,
      activationChancePercent: Number(conf.activation_chance_percent) || 0,
      items,
    };
  } catch (err) {
    console.error(`Error reading drop config for map ${mapId}:`, err);
    return {
      enabled: true,
      goldEnabled: false,
      goldChancePercent: 10,
      goldMin: 100,
      goldMax: 1000,
      activationEnabled: false,
      activationChancePercent: 0.1,
      items: [],
    };
  }
}

/** Ghi cấu hình vật phẩm rơi (Drop items) của Map vào DB và trigger live sync */
async function writeMapDropConfig(mapId, dropConfig, userId = null) {
  if (!dropConfig) return;
  try {
    const enabled = dropConfig.enabled ? 1 : 0;
    const goldEnabled = dropConfig.goldEnabled ? 1 : 0;
    const goldChance = Number(dropConfig.goldChancePercent) || 0;
    const goldMin = Math.max(0, Number(dropConfig.goldMin) || 0);
    const goldMax = Math.max(goldMin, Number(dropConfig.goldMax) || goldMin);
    const actEnabled = dropConfig.activationEnabled ? 1 : 0;
    const actChance = Number(dropConfig.activationChancePercent) || 0;

    const result = await exec(
      `INSERT INTO panel_map_drop_configs
         (server_id, map_id, enabled, gold_enabled, gold_chance_percent, gold_min, gold_max,
          activation_enabled, activation_chance_percent, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id), enabled = VALUES(enabled), gold_enabled = VALUES(gold_enabled),
         gold_chance_percent = VALUES(gold_chance_percent), gold_min = VALUES(gold_min),
         gold_max = VALUES(gold_max), activation_enabled = VALUES(activation_enabled),
         activation_chance_percent = VALUES(activation_chance_percent), updated_at = CURRENT_TIMESTAMP`,
      [1, mapId, enabled, goldEnabled, goldChance, goldMin, goldMax, actEnabled, actChance, userId]
    );

    let configId = result.insertId;
    if (!configId) {
      const existing = await query('SELECT id FROM panel_map_drop_configs WHERE map_id = ? AND server_id = 1', [mapId]);
      if (existing.length) configId = existing[0].id;
    }

    if (configId) {
      await exec('DELETE FROM panel_map_drop_items WHERE config_id = ?', [configId]);
      const items = Array.isArray(dropConfig.items) ? dropConfig.items : [];
      for (const it of items) {
        const tempId = Number(it.tempId);
        if (!Number.isFinite(tempId) || tempId < 0) continue;
        const mobTempId = it.mobTempId !== undefined ? Number(it.mobTempId) : -1;
        const pLevelMin = Math.max(0, Number(it.playerLevelMin) || 0);
        const pLevelMax = Math.min(19, Math.max(pLevelMin, Number(it.playerLevelMax) || 19));
        const tStart = Math.max(0, Number(it.timeStartMin) || 0);
        const tEnd = Math.min(1440, Math.max(tStart, Number(it.timeEndMin) || 1440));
        const itemEnabled = it.enabled !== false ? 1 : 0;
        const chance = Math.min(100, Math.max(0, Number(it.chancePercent) || 1));
        const qMin = Math.max(1, Number(it.quantityMin) || 1);
        const qMax = Math.max(qMin, Number(it.quantityMax) || qMin);
        const sMin = Math.max(1, Number(it.spreadCountMin) || 1);
        const sMax = Math.max(sMin, Number(it.spreadCountMax) || sMin);
        const sDist = Math.max(5, Math.min(2000, Number(it.spreadDistance) || 25));
        const optionsJson = JSON.stringify(Array.isArray(it.options) ? it.options : []);

        await exec(
          `INSERT INTO panel_map_drop_items
             (config_id, temp_id, mob_temp_id, player_level_min, player_level_max, time_start_min, time_end_min, enabled,
              chance_percent, quantity_min, quantity_max, spread_count_min, spread_count_max, spread_distance, options_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [configId, tempId, mobTempId, pLevelMin, pLevelMax, tStart, tEnd, itemEnabled, chance, qMin, qMax, sMin, sMax, sDist, optionsJson]
        );
      }
    }

    try {
      await reloadGameResource(1, 'drop-config');
    } catch {
      // Game server sync
    }
  } catch (err) {
    console.error(`Error saving drop config for map ${mapId}:`, err);
  }
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

/** 1. Lấy danh mục metadata template (mob_template, npc_template, all maps, item_bg_temp, item_template, item_option_template) */
router.get('/meta/options', async (req, res) => {
  try {
    const [mobRows, npcRows, mapRows, bgTemplateRows, itemRows, optionRows] = await Promise.all([
      query('SELECT id, name, type, hp, range_move, speed, dart_Type, percent_dame, percent_tiem_nang FROM mob_template ORDER BY id ASC'),
      query('SELECT id, name, head, body, leg, avatar FROM npc_template ORDER BY id ASC'),
      query('SELECT id, name, planet_id, type FROM map_template ORDER BY id ASC'),
      query('SELECT id, image_id, layer, dx, dy FROM bg_item_template ORDER BY id ASC').catch(() => []),
      query('SELECT id, NAME AS name, type, gender, icon_id, power_require FROM item_template ORDER BY id ASC').catch(() => []),
      query('SELECT id, NAME AS name, type FROM item_option_template ORDER BY id ASC').catch(() => []),
    ]);

    let itemBgList = [];
    if (bgTemplateRows && bgTemplateRows.length > 0) {
      itemBgList = bgTemplateRows.map((t) => ({
        id: t.id,
        imageId: t.image_id,
        layer: t.layer,
        dx: t.dx,
        dy: t.dy,
        fileName: `${t.image_id}.png`,
        url: `/api/v1/assets/item-bg/${t.image_id}.png`,
      }));
    } else {
      // Fallback lấy danh mục các file item_bg_temp có sẵn trên ổ đĩa
      const base = getGameDataPath();
      const itemBgDir = path.join(base, 'item_bg_temp', 'x4');
      if (fs.existsSync(itemBgDir)) {
        const files = fs.readdirSync(itemBgDir).filter((f) => f.endsWith('.png'));
        itemBgList = files.map((f) => {
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
      }
    }

    // Danh mục các hiệu ứng ảnh và hiệu ứng môi trường
    const effectsCatalog = [];
    const effDir = path.join(getGameDataPath(), 'effect', 'x4');
    if (fs.existsSync(effDir)) {
      const effFiles = fs.readdirSync(effDir).filter((f) => f.endsWith('.png'));
      for (const f of effFiles) {
        const match = f.match(/(?:ImgEffect[_\s]|)(\d+)\.png/i);
        if (match) {
          const id = Number(match[1]);
          if (Number.isFinite(id)) {
            effectsCatalog.push({
              id,
              fileName: f,
              url: `/api/v1/assets/effect/${id}.png`,
            });
          }
        }
      }
      effectsCatalog.sort((a, b) => a.id - b.id);
    }

    const ambientEffects = [
      { id: 0, name: 'Mưa rơi (Rain)', icon: '🌧️', desc: 'Hiệu ứng mưa rơi rải rác ngoài trời (beff 0)' },
      { id: 11, name: 'Tuyết rơi (Snow)', icon: '❄️', desc: 'Hiệu ứng bông tuyết trắng rơi rải rác (beff 11)' },
      { id: 1, name: 'Lá cây bay (Falling Leaves)', icon: '🍂', desc: 'Hiệu ứng lá cây chao liệng trong gió (beff 1)' },
      { id: 15, name: 'Hoa đào bay (Cherry Blossom)', icon: '🌸', desc: 'Hiệu ứng cánh hoa đào bay bổng (beff 15)' },
      { id: 13, name: 'Mây trôi (Clouds)', icon: '☁️', desc: 'Hiệu ứng mây trôi lơ lửng trên bầu trời (beff 13)' },
      { id: 14, name: 'Dải sương mù (Mist / Fog)', icon: '🌫️', desc: 'Hiệu ứng sương mù mờ ảo che phủ (beff 14)' },
      { id: 4, name: 'Bầu trời ngàn sao (Stars)', icon: '✨', desc: 'Hiệu ứng sao đêm lấp lánh (beff 4)' },
      { id: 9, name: 'Đom đóm / Đốm sáng (Fireflies)', icon: '🌟', desc: 'Hiệu ứng đốm sáng lơ lửng bay (beff 9)' },
      { id: 3, name: 'Sấm chớp (Thunderstorm)', icon: '⚡', desc: 'Hiệu ứng chớp điện rạch trời giật sáng (beff 3)' },
      { id: 8, name: 'Phi thuyền bay (Space Ship)', icon: '🚀', desc: 'Hiệu ứng phi thuyền bay ngang bầu trời (beff 8)' },
    ];

    // Danh mục background sets có sẵn
    const bgDir = path.join(getGameDataPath(), 'bg');
    const backgroundSets = [];
    if (fs.existsSync(bgDir)) {
      const bgFiles = fs.readdirSync(bgDir).filter((f) => f.endsWith('.png'));
      const bgMap = new Map();
      for (const f of bgFiles) {
        const m = f.match(/^b(\d+)(\d)\.png$/);
        if (m) {
          const bId = Number(m[1]);
          const layer = Number(m[2]);
          if (!bgMap.has(bId)) bgMap.set(bId, []);
          bgMap.get(bId).push({ layer, fileName: f, url: `/api/v1/assets/bg/${f}` });
        }
      }
      for (const [id, layers] of bgMap.entries()) {
        layers.sort((a, b) => a.layer - b.layer);
        backgroundSets.push({ id, name: `Phông nền #${id}`, layers });
      }
      backgroundSets.sort((a, b) => a.id - b.id);
    }

    res.json({
      ok: true,
      data: {
        mobTemplates: mobRows,
        npcTemplates: npcRows,
        maps: mapRows,
        itemBgTemplates: itemBgList,
        itemTemplates: itemRows,
        itemOptionTemplates: optionRows,
        effectsCatalog,
        ambientEffects,
        backgroundSets,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 2. Quét kiểm tra toàn bộ map (Map Validator / Health Check) */
router.get('/system/validate-all', async (req, res) => {
  try {
    const rows = await query('SELECT id, name, waypoints, mobs, npcs FROM map_template ORDER BY id ASC');
    const existingMapIds = new Set(rows.map((r) => r.id));
    const issues = [];

    for (const r of rows) {
      const dim = readTileMapDimensions(r.id);
      const wps = parseWaypoints(r.waypoints);
      const mobs = parseMobs(r.mobs);
      const npcs = parseNpcs(r.npcs);

      // Check waypoints
      wps.forEach((wp, idx) => {
        if (!existingMapIds.has(wp.goMap)) {
          issues.push({
            severity: 'error',
            type: 'broken_waypoint',
            mapId: r.id,
            mapName: r.name,
            element: `Waypoint #${idx + 1} (${wp.name || 'Không tên'})`,
            message: `Trỏ tới Map ID ${wp.goMap} không tồn tại trong CSDL!`,
          });
        }
        if (wp.minX < 0 || wp.maxX > dim.pxw || wp.minY < 0 || wp.maxY > dim.pxh) {
          issues.push({
            severity: 'warning',
            type: 'out_of_bounds_waypoint',
            mapId: r.id,
            mapName: r.name,
            element: `Waypoint #${idx + 1} (${wp.name || 'Không tên'})`,
            message: `Vùng tọa độ [${wp.minX},${wp.minY} -> ${wp.maxX},${wp.maxY}] vượt quá kích thước map (${dim.pxw}x${dim.pxh}px)`,
          });
        }
      });

      // Check mobs
      mobs.forEach((m, idx) => {
        if (m.mobX < 0 || m.mobX > dim.pxw || m.mobY < 0 || m.mobY > dim.pxh) {
          issues.push({
            severity: 'warning',
            type: 'out_of_bounds_mob',
            mapId: r.id,
            mapName: r.name,
            element: `Quái #${idx + 1} (Mob ID: ${m.mobTempId})`,
            message: `Tọa độ (${m.mobX}, ${m.mobY}) nằm ngoài biên bản đồ (${dim.pxw}x${dim.pxh}px)`,
          });
        }
      });

      // Check npcs
      npcs.forEach((n, idx) => {
        if (n.npcX < 0 || n.npcX > dim.pxw || n.npcY < 0 || n.npcY > dim.pxh) {
          issues.push({
            severity: 'warning',
            type: 'out_of_bounds_npc',
            mapId: r.id,
            mapName: r.name,
            element: `NPC #${idx + 1} (NPC ID: ${n.npcTempId})`,
            message: `Tọa độ (${n.npcX}, ${n.npcY}) nằm ngoài biên bản đồ (${dim.pxw}x${dim.pxh}px)`,
          });
        }
      });
    }

    res.json({
      ok: true,
      data: {
        totalMaps: rows.length,
        totalIssues: issues.length,
        errorCount: issues.filter((i) => i.severity === 'error').length,
        warningCount: issues.filter((i) => i.severity === 'warning').length,
        issues,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 3. Lấy danh sách toàn bộ map kèm thống kê */
router.get('/', async (req, res) => {
  try {
    const { search = '', planetId = '', type = '' } = req.query;

    let sql = `
      SELECT id, name, zones, max_player, type, planet_id, bg_type, tile_id, bg_id,
             is_map_double, waypoints, mobs, npcs
      FROM map_template
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (id = ? OR name LIKE ?)';
      params.push(Number.isFinite(Number(search)) ? Number(search) : -1, `%${search}%`);
    }

    if (planetId !== '' && planetId !== undefined && planetId !== 'all') {
      sql += ' AND planet_id = ?';
      params.push(Number(planetId));
    }

    if (type !== '' && type !== undefined && type !== 'all') {
      sql += ' AND type = ?';
      params.push(Number(type));
    }

    sql += ' ORDER BY id ASC';

    const rows = await query(sql, params);

    const data = rows.map((r) => {
      const dim = readTileMapDimensions(r.id);
      const wps = parseWaypoints(r.waypoints);
      const mobs = parseMobs(r.mobs);
      const npcs = parseNpcs(r.npcs);

      return {
        id: r.id,
        name: r.name,
        zones: r.zones,
        maxPlayer: r.max_player,
        type: r.type,
        planetId: r.planet_id,
        bgType: r.bg_type,
        tileId: r.tile_id,
        bgId: r.bg_id,
        isMapDouble: r.is_map_double === 1,
        waypointCount: wps.length,
        mobCount: mobs.length,
        npcCount: npcs.length,
        tmw: dim.tmw,
        tmh: dim.tmh,
        pxw: dim.pxw,
        pxh: dim.pxh,
        hasTileFile: dim.hasFile,
      };
    });

    res.json({
      ok: true,
      data,
      summary: {
        total: data.length,
        totalMobs: data.reduce((acc, m) => acc + m.mobCount, 0),
        totalNpcs: data.reduce((acc, m) => acc + m.npcCount, 0),
        totalWaypoints: data.reduce((acc, m) => acc + m.waypointCount, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 4. Lấy chi tiết 1 map kèm background items & layout & effects */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: 'ID map không hợp lệ' });
    }

    const rows = await query('SELECT * FROM map_template WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: `Không tìm thấy map ID ${id}` });
    }

    const map = rows[0];
    const dim = readTileMapDimensions(map.id);
    const waypoints = parseWaypoints(map.waypoints);
    const mobs = parseMobs(map.mobs);
    const npcs = parseNpcs(map.npcs);
    const [allMapRows, mobRows, npcRows, bgItemRows, dropConfig] = await Promise.all([
      query('SELECT id, name FROM map_template'),
      query('SELECT id, name, hp, percent_dame, percent_tiem_nang FROM mob_template'),
      query('SELECT id, name, avatar, head, body, leg FROM npc_template'),
      query('SELECT id, image_id, layer, dx, dy FROM bg_item_template ORDER BY id ASC').catch(() => []),
      readMapDropConfig(map.id),
    ]);

    const bgTemplateMap = new Map((bgItemRows || []).map((b) => [b.id, b]));
    const bgItems = readItemBgMapData(map.id, bgTemplateMap);
    const effects = readEffMapData(map.id);

    const mapNameMap = new Map(allMapRows.map((m) => [m.id, m.name]));
    const enrichedWaypoints = waypoints.map((w) => ({
      ...w,
      goMapName: mapNameMap.get(w.goMap) || `Map ID ${w.goMap}`,
    }));

    // Bổ sung thông tin tên mob, máu gốc, % dame và sát thương
    const mobInfoMap = new Map((mobRows || []).map((m) => [m.id, m]));

    const enrichedMobs = mobs.map((m) => {
      const info = mobInfoMap.get(m.mobTempId);
      const percentDame = info ? (info.percent_dame ?? 10) : 10;
      const calculatedDame = Math.max(1, Math.round(((m.mobHp || 100) * percentDame) / 100));
      return {
        ...m,
        mobName: info ? info.name : `Quái #${m.mobTempId}`,
        defaultHp: info ? info.hp : 100,
        percentDame,
        mobDame: m.mobDame !== undefined ? m.mobDame : calculatedDame,
      };
    });

    // Bổ sung thông tin tên npc
    const npcInfoMap = new Map((npcRows || []).map((n) => [n.id, n]));

    const enrichedNpcs = npcs.map((n) => {
      const info = npcInfoMap.get(n.npcTempId);
      return {
        ...n,
        npcName: info ? info.name : `NPC #${n.npcTempId}`,
        avatar: info ? info.avatar : 0,
        head: info ? info.head : 0,
      };
    });

    res.json({
      ok: true,
      data: {
        id: map.id,
        name: map.name || map.NAME || `Bản đồ ${map.id}`,
        zones: map.zones,
        maxPlayer: map.max_player,
        type: map.type,
        planetId: map.planet_id ?? map.planetId ?? 0,
        bgType: map.bg_type ?? map.bgType ?? 0,
        tileId: map.tile_id ?? map.tileId ?? 1,
        bgId: map.bg_id ?? map.bgId ?? 0,
        isMapDouble: map.is_map_double === 1,
        tmw: dim.tmw,
        tmh: dim.tmh,
        pxw: dim.pxw,
        pxh: dim.pxh,
        hasTileFile: dim.hasFile,
        tileMatrix: dim.tiles || [],
        waypoints: enrichedWaypoints,
        mobs: enrichedMobs,
        npcs: enrichedNpcs,
        bgItems,
        effects,
        dropConfig,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 5. Cập nhật cấu hình map + background items + effects + tile dimensions + drop configs */
router.put('/:id', requirePermission('manage_game_config'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: 'ID map không hợp lệ' });
    }

    const {
      name,
      zones = 10,
      maxPlayer = 15,
      type = 0,
      planetId = 0,
      bgType = 0,
      tileId = 1,
      bgId = 0,
      isMapDouble = false,
      waypoints = [],
      mobs = [],
      npcs = [],
      bgItems = [],
      effects,
      tileMatrix,
      tmw,
      tmh,
      dropConfig,
    } = req.body;

    let mapName = stringValue(name);
    if (!mapName) {
      const existing = await query('SELECT name FROM map_template WHERE id = ?', [id]);
      if (existing.length > 0 && existing[0].name && String(existing[0].name).trim()) {
        mapName = String(existing[0].name).trim();
      } else {
        mapName = `Bản đồ ${id}`;
      }
    }

    const waypointsJson = serializeWaypoints(waypoints);
    const mobsJson = serializeMobs(mobs);
    const npcsJson = serializeNpcs(npcs);

    await exec(
      `UPDATE map_template
       SET name = ?,
           zones = ?,
           max_player = ?,
           type = ?,
           planet_id = ?,
           bg_type = ?,
           tile_id = ?,
           bg_id = ?,
           is_map_double = ?,
           waypoints = ?,
           mobs = ?,
           npcs = ?
       WHERE id = ?`,
      [
        mapName,
        intValue(zones, 10, 1, 100),
        intValue(maxPlayer, 15, 1, 100),
        intValue(type, 0, 0, 50),
        intValue(planetId, 0, 0, 10),
        intValue(bgType, 0, 0, 20),
        intValue(tileId, 1, 1, 50),
        intValue(bgId, 0, 0, 50),
        isMapDouble ? 1 : 0,
        waypointsJson,
        mobsJson,
        npcsJson,
        id,
      ]
    );

    // Ghi file binary background items (data/map/item_bg_map_data/{id})
    await writeItemBgMapData(id, bgItems);

    // Ghi file binary effects map (data/map/eff_map/{id}) nếu có
    if (effects !== undefined) {
      writeEffMapData(id, effects);
    }

    // Ghi kích thước tile map & ma trận tile map nếu có yêu cầu
    if (tmw !== undefined && tmh !== undefined) {
      writeTileMapDimensions(id, tmw, tmh, tileMatrix);
    }

    // Ghi cấu hình vật phẩm rơi (Drop items) nếu có
    if (dropConfig) {
      await writeMapDropConfig(id, dropConfig, req.user?.id);
    }

    // Tự động đồng bộ TileSet sang toàn bộ các phiên bản zoom x1, x2, x3, x4
    const finalTileId = intValue(tileId, 1);
    syncTileSetToAllZooms(finalTileId);

    // Tự động tăng phiên bản vsMap và vsRes để buộc Android & PC xoá cache cũ và đồng bộ mới
    const bumped = bumpGameVersions();

    const effCount = (effects?.effs?.length || 0) + (effects?.beffs?.length || 0);
    await auditLog(
      req.user?.id || 1,
      'UPDATE_MAP',
      `Cập nhật cấu hình map ID ${id} (${mapName}): ${waypoints.length} waypoints, ${mobs.length} quái, ${npcs.length} NPCs, ${bgItems.length} vật thể layout, ${effCount} hiệu ứng, ${dropConfig?.items?.length || 0} drop items (Đồng bộ x1..x4 TileSet #${finalTileId}, vsMap=${bumped?.vsMap})`
    );

    res.json({
      ok: true,
      message: `Đã lưu thành công cấu hình Map [${id}] ${mapName} và tự động đồng bộ tài nguyên sang tất cả phiên bản (x1, x2, x3, x4)!`,
      data: { id, vsMap: bumped?.vsMap, vsRes: bumped?.vsRes },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 5.1. Lấy riêng cấu hình Drop của Map */
router.get('/:id/drops', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID map không hợp lệ' });
    const dropConfig = await readMapDropConfig(id);
    res.json({ ok: true, data: dropConfig });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 5.2. Cập nhật riêng cấu hình Drop của Map */
router.put('/:id/drops', requirePermission('manage_game_config'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'ID map không hợp lệ' });
    await writeMapDropConfig(id, req.body, req.user?.id);
    res.json({ ok: true, message: `Đã lưu cấu hình Drop cho Map [${id}] thành công` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 6. Tạo mới hoặc sao chép map */
router.post('/', requirePermission('manage_game_config'), async (req, res) => {
  try {
    const {
      id,
      name,
      zones = 10,
      maxPlayer = 15,
      type = 0,
      planetId = 0,
      bgType = 0,
      tileId = 1,
      bgId = 0,
      isMapDouble = false,
      waypoints = [],
      mobs = [],
      npcs = [],
      bgItems = [],
      cloneFromId,
    } = req.body;

    const mapId = Number(id);
    if (!Number.isFinite(mapId) || mapId < 0) {
      return res.status(400).json({ ok: false, error: 'Map ID phải là số nguyên không âm' });
    }

    // Kiểm tra xem ID đã tồn tại chưa
    const existing = await query('SELECT id FROM map_template WHERE id = ?', [mapId]);
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, error: `Map ID ${mapId} đã tồn tại trong hệ thống` });
    }

    let mapName = stringValue(name);
    let finalZones = intValue(zones, 10);
    let finalMaxPlayer = intValue(maxPlayer, 15);
    let finalType = intValue(type, 0);
    let finalPlanetId = intValue(planetId, 0);
    let finalBgType = intValue(bgType, 0);
    let finalTileId = intValue(tileId, 1);
    let finalBgId = intValue(bgId, 0);
    let finalIsDouble = isMapDouble ? 1 : 0;
    let waypointsJson = serializeWaypoints(waypoints);
    let mobsJson = serializeMobs(mobs);
    let npcsJson = serializeNpcs(npcs);
    let finalBgItems = bgItems;

    // Nếu clone từ map khác
    if (cloneFromId !== undefined && cloneFromId !== null && cloneFromId !== '') {
      const source = await query('SELECT * FROM map_template WHERE id = ? LIMIT 1', [Number(cloneFromId)]);
      if (source.length > 0) {
        const src = source[0];
        if (!mapName) mapName = `${src.name} (Copy)`;
        finalZones = src.zones;
        finalMaxPlayer = src.max_player;
        finalType = src.type;
        finalPlanetId = src.planet_id;
        finalBgType = src.bg_type;
        finalTileId = src.tile_id;
        finalBgId = src.bg_id;
        finalIsDouble = src.is_map_double;
        waypointsJson = src.waypoints;
        mobsJson = src.mobs;
        npcsJson = src.npcs;
        finalBgItems = readItemBgMapData(src.id);

        // Sao chép cả tile_map_data binary file
        const base = getGameDataPath();
        const srcTileFile = path.join(base, 'map', 'tile_map_data', String(src.id));
        const dstTileFile = path.join(base, 'map', 'tile_map_data', String(mapId));
        if (fs.existsSync(srcTileFile)) {
          fs.copyFileSync(srcTileFile, dstTileFile);
        }
      }
    }

    if (!mapName) mapName = `Bản đồ mới ${mapId}`;

    await exec(
      `INSERT INTO map_template (id, name, zones, max_player, type, planet_id, bg_type, tile_id, bg_id, is_map_double, data, waypoints, mobs, npcs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)`,
      [
        mapId,
        mapName,
        finalZones,
        finalMaxPlayer,
        finalType,
        finalPlanetId,
        finalBgType,
        finalTileId,
        finalBgId,
        finalIsDouble,
        waypointsJson,
        mobsJson,
        npcsJson,
      ]
    );

    // Ghi file binary background items cho map mới
    await writeItemBgMapData(mapId, finalBgItems);

    // Ghi file tile_map_data (hỗ trợ cả ma trận gạch được AI sinh ra từ client)
    const base = getGameDataPath();
    const { tmw = 60, tmh = 20, tileMatrix } = req.body;
    const finalTmw = Math.max(10, Math.min(250, intValue(tmw, 60)));
    const finalTmh = Math.max(5, Math.min(250, intValue(tmh, 20)));

    if (Array.isArray(tileMatrix) && tileMatrix.length === finalTmw * finalTmh) {
      writeTileMapDimensions(mapId, finalTmw, finalTmh, tileMatrix);
    } else {
      const dstTileFile = path.join(base, 'map', 'tile_map_data', String(mapId));
      if (!fs.existsSync(dstTileFile)) {
        writeTileMapDimensions(mapId, finalTmw, finalTmh);
      }
    }

    // Tự động đồng bộ TileSet sang toàn bộ các phiên bản zoom x1, x2, x3, x4 (Mặc định X4 Master)
    syncTileSetToAllZooms(finalTileId);

    // Tự động tăng phiên bản vsMap và vsRes để buộc Android & PC xoá cache cũ và đồng bộ mới
    const bumped = bumpGameVersions();

    await auditLog(req.user?.id || 1, 'CREATE_MAP', `Tạo mới map template ID ${mapId} (${mapName}) (Mặc định X4 Master UHD -> Đồng bộ x3, x2, x1 TileSet #${finalTileId}, vsMap=${bumped?.vsMap})`);

    res.json({
      ok: true,
      message: `Đã tạo thành công Map [${mapId}] ${mapName} (Mặc định X4 Master UHD -> Tự động đồng bộ sắc nét sang X3, X2, X1)!`,
      data: { id: mapId, masterZoom: 'x4', syncedZooms: ['x4', 'x3', 'x2', 'x1'], vsMap: bumped?.vsMap, vsRes: bumped?.vsRes },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 7. Xoá map */
router.delete('/:id', requirePermission('manage_game_config'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: 'ID map không hợp lệ' });
    }

    const rows = await query('SELECT name FROM map_template WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: `Map ID ${id} không tồn tại` });
    }

    await exec('DELETE FROM map_template WHERE id = ?', [id]);

    // An toàn: Tự động chuyển tất cả người chơi đang lưu tọa độ ở map này về nhà (Map 21/22/23)
    try {
      const players = await query('SELECT id, gender, data_location FROM player');
      for (const p of players) {
        try {
          const loc = JSON.parse(p.data_location || '[]');
          if (Array.isArray(loc) && loc.length >= 3 && Number(loc[0]) === id) {
            const homeMapId = (Number(p.gender) || 0) + 21;
            const newLoc = JSON.stringify([homeMapId, 300, 336]);
            await exec('UPDATE player SET data_location = ? WHERE id = ?', [newLoc, p.id]);
          }
        } catch (e) { }
      }
    } catch (e) { }

    // Xoá các file binary liên quan nếu có
    const base = getGameDataPath();
    const itemBgFile = path.join(base, 'map', 'item_bg_map_data', String(id));
    if (fs.existsSync(itemBgFile)) {
      try { fs.unlinkSync(itemBgFile); } catch (e) { }
    }
    const tileMapFile = path.join(base, 'map', 'tile_map_data', String(id));
    if (fs.existsSync(tileMapFile)) {
      try { fs.unlinkSync(tileMapFile); } catch (e) { }
    }
    const effMapFile = path.join(base, 'map', 'eff_map', String(id));
    if (fs.existsSync(effMapFile)) {
      try { fs.unlinkSync(effMapFile); } catch (e) { }
    }

    await auditLog(req.user?.id || 1, 'DELETE_MAP', `Xoá map template ID ${id} (${rows[0].name}) và giải cứu player về nhà`);

    res.json({
      ok: true,
      message: `Đã xoá map [${id}] ${rows[0].name} và giải cứu người chơi về nhà an toàn`,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 8. Xuất câu lệnh SQL Insert/Update */
router.get('/:id/export-sql', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query('SELECT * FROM map_template WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'Map không tồn tại' });
    }

    const m = rows[0];
    const escapeStr = (s) => `'${String(s).replace(/'/g, "\\'")}'`;

    const sql = `INSERT INTO \`map_template\` (\`id\`, \`name\`, \`zones\`, \`max_player\`, \`data\`, \`type\`, \`planet_id\`, \`bg_type\`, \`tile_id\`, \`bg_id\`, \`waypoints\`, \`mobs\`, \`npcs\`, \`is_map_double\`)
VALUES (${m.id}, ${escapeStr(m.name)}, ${m.zones}, ${m.max_player}, '${m.data || '[]'}', ${m.type}, ${m.planet_id}, ${m.bg_type}, ${m.tile_id}, ${m.bg_id}, ${escapeStr(m.waypoints)}, ${escapeStr(m.mobs)}, ${escapeStr(m.npcs)}, ${m.is_map_double || 0})
ON DUPLICATE KEY UPDATE
  \`name\` = VALUES(\`name\`),
  \`zones\` = VALUES(\`zones\`),
  \`max_player\` = VALUES(\`max_player\`),
  \`type\` = VALUES(\`type\`),
  \`planet_id\` = VALUES(\`planet_id\`),
  \`bg_type\` = VALUES(\`bg_type\`),
  \`tile_id\` = VALUES(\`tile_id\`),
  \`bg_id\` = VALUES(\`bg_id\`),
  \`waypoints\` = VALUES(\`waypoints\`),
  \`mobs\` = VALUES(\`mobs\`),
  \`npcs\` = VALUES(\`npcs\`),
  \`is_map_double\` = VALUES(\`is_map_double\`);`;

    res.json({
      ok: true,
      data: {
        mapId: m.id,
        sql,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Helper: Trích xuất và phân tích cú pháp JSON an toàn từ phản hồi của LLM (hỗ trợ markdown, trailing commas, reasoning text) */
function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Phân tích trực tiếp
  try {
    return JSON.parse(trimmed);
  } catch (e) {}

  // 2. Phân tích trong khối code markdown ```json ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const blockContent = codeBlockMatch[1].trim();
    try {
      return JSON.parse(blockContent);
    } catch (e) {
      try {
        const cleaned = blockContent.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
      } catch (e2) {}
    }
  }

  // 3. Phân tích trong cặp ngoặc nhọn ngoài cùng { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      try {
        const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
      } catch (e2) {}
    }
  }

  return null;
}

/** 9. AI DeepSeek Map Studio: Kết nối LLM DeepSeek để phân tích & tự động thiết kế map chuẩn NRO theo nguyên mẫu Map 161 */
router.post('/ai-deepseek', async (req, res) => {
  try {
    const {
      prompt = '',
      apiKey = process.env.DEEPSEEK_API_KEY || '',
      model = 'deepseek-chat',
      tmw = 80,
      tmh = 40,
      preset = 'forest_multi_tier',
      mobLevel = 10,
      tileId = 1,
    } = req.body;

    const trimmedKey = (apiKey || '').trim().replace(/^Bearer\s+/i, '').replace(/^['"]|['"]$/g, '');
    if (!trimmedKey) {
      return res.status(400).json({
        ok: false,
        error: 'Vui lòng cung cấp DeepSeek API Key (hoặc cấu hình DEEPSEEK_API_KEY trong hệ thống).',
      });
    }

    const finalTmw = Math.max(30, Math.min(150, Number(tmw) || 80));
    const finalTmh = Math.max(15, Math.min(80, Number(tmh) || 40));

    const systemPrompt = `Bạn là Chuyên gia Thiết kế Bản đồ Trò chơi 2D Platformer thế giới Ngọc Rồng Online (NRO / Dragon Boy).
Nhiệm vụ của bạn là nghiên cứu cấu trúc thiết kế của Bản đồ Masterpiece Map 161 (Bìa Rừng Nguyên Thủy) và thiết kế một bản đồ mới hoàn chỉnh, mỹ thuật, cân bằng và có tính khám phá cao.

Quy chuẩn hình học NRO:
- Kích thước bản đồ: ${finalTmw} cột (tiles) x ${finalTmh} hàng (tiles). Mỗi tile = 24x24 pixel.
- Tọa độ: cột x (0 đến ${finalTmw - 1}), hàng y (0 đến ${finalTmh - 1}). Hàng 0 là trên đỉnh trời, hàng ${finalTmh - 1} là đáy sâu nhất.
- Cấu trúc kiến trúc Đa Tầng kiểu Map 161:
  + Sàn đáy ngầm (Ground Base): Hàng (${finalTmh - 5} đến ${finalTmh - 1}) là lớp đất vững chắc kéo dài toàn map hoặc có hốc vực sâu.
  + Các tầng sàn / cành cây lớn treo lơ lửng (Canopy Platforms): 3-5 tầng sàn ở các cao độ khác nhau (vd: hàng 8, 16, 24, 32), mỗi sàn dài từ 6 đến 22 ô, sắp xếp so le ziczac để người chơi nhảy parkour tự nhiên.
  + Cột trụ thân cây / Tháp đá (Vertical Trunk Pillars): 1-3 cột trụ bản rộng 3-5 ô kết nối xuyên qua các tầng sàn từ đáy lên cao.
  + Vị trí Quái vật (Mobs): Mỗi quái vật phải đứng chính xác trên một sàn (cột col, hàng row của sàn đó).
  + Vị trí Cổng dịch chuyển (Waypoints): 1 cổng ở mép trái (col: 0..2) và 1 cổng ở mép phải (col: ${finalTmw - 3}..${finalTmw - 1}) tiếp đất an toàn.
  + Vật thể trang trí (Decor bgItems): Cây cối, nấm khổng lồ, đá tảng đặt ngay trên bề mặt sàn.

Hãy trả về DUY NHẤT một JSON hợp lệ tuân thủ cấu trúc sau (không kèm lời dẫn mở đầu hay kết thúc):
{
  "mapName": "Tên bản đồ sống động",
  "planetId": 0,
  "tileId": ${tileId || 1},
  "bgId": 0,
  "concept": "Tóm tắt ý tưởng thiết kế",
  "platforms": [
    { "row": ${finalTmh - 5}, "startCol": 0, "endCol": ${finalTmw - 1}, "thickness": 5, "type": "ground" },
    { "row": 24, "startCol": 12, "endCol": 38, "thickness": 2, "type": "canopy_branch" },
    { "row": 14, "startCol": 45, "endCol": 70, "thickness": 2, "type": "canopy_branch" }
  ],
  "pillars": [
    { "col": 28, "width": 4, "topRow": 12, "botRow": ${finalTmh - 5}, "type": "tree_trunk" }
  ],
  "mobs": [
    { "mobTempId": 1, "col": 20, "row": 24, "level": ${mobLevel} },
    { "mobTempId": 1, "col": 55, "row": 14, "level": ${mobLevel} }
  ],
  "bgItems": [
    { "bgTempId": 52, "col": 15, "row": 22 },
    { "bgTempId": 90, "col": 50, "row": 12 }
  ],
  "waypoints": [
    { "name": "Về Làng Aru", "isLeft": true, "goMap": 0 },
    { "name": "Sang Rừng Hoa", "isLeft": false, "goMap": 1 }
  ]
}`;

    const userPrompt = prompt.trim() || `Hãy thiết kế một bản đồ đa tầng hùng vĩ, thẩm mỹ cao theo phong cách Bìa Rừng Nguyên Thủy (Map 161) với kích thước ${finalTmw}x${finalTmh}, có các tầng cành cây to nối liền bởi thân cây đại thụ, quái vật tuần tra trên cành và lối đi parkour thú vị.`;

    const isReasoner = (model || '').toLowerCase().includes('reasoner') || (model || '').toLowerCase().includes('r1');

    // Xây dựng payload gọi API DeepSeek tối ưu theo loại model
    const requestBody = {
      model: model || 'deepseek-chat',
      messages: isReasoner
        ? [
            {
              role: 'user',
              content: `${systemPrompt}\n\n---\n[Yêu Cầu Thiết Kế Cụ Thể]:\n${userPrompt}\n\nLƯU Ý: Trả về DUY NHẤT một chuỗi JSON hợp lệ theo đúng cấu trúc ở trên.`,
            },
          ]
        : [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
      max_tokens: isReasoner ? 8192 : 4096,
    };

    // DeepSeek Reasoner không hỗ trợ response_format và temperature
    if (!isReasoner) {
      requestBody.response_format = { type: 'json_object' };
      requestBody.temperature = 0.7;
    }

    // Gọi API DeepSeek
    const fetchResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!fetchResponse.ok) {
      const errText = await fetchResponse.text();
      return res.status(fetchResponse.status).json({
        ok: false,
        error: `DeepSeek API Error (${fetchResponse.status}): ${errText}`,
      });
    }

    const aiData = await fetchResponse.json();
    const choice = aiData.choices?.[0];
    const contentStr = choice?.message?.content || '';
    const reasoningStr = choice?.message?.reasoning_content || '';

    // Thử trích xuất JSON từ content hoặc reasoning_content
    let parsedPlan = extractJsonFromText(contentStr);
    if (!parsedPlan && reasoningStr) {
      parsedPlan = extractJsonFromText(reasoningStr);
    }

    if (!parsedPlan) {
      if (choice?.finish_reason === 'length') {
        return res.status(500).json({
          ok: false,
          error: 'DeepSeek đã đạt giới hạn độ dài token trong quá trình sinh dữ liệu (finish_reason: length). Hãy thử lại hoặc chọn model deepseek-chat.',
        });
      }

      if (!contentStr && !reasoningStr) {
        return res.status(500).json({
          ok: false,
          error: `DeepSeek không trả về nội dung hợp lệ (finish_reason: ${choice?.finish_reason || 'unknown'}). Vui lòng kiểm tra lại API Key hoặc đổi sang model deepseek-chat.`,
        });
      }

      return res.status(500).json({
        ok: false,
        error: 'Không thể phân tích cấu trúc JSON từ kết quả của DeepSeek. Phản hồi nhận được: ' + (contentStr || reasoningStr).substring(0, 200),
      });
    }

    // Chuẩn hóa cấu trúc blueprint đảm bảo luôn an toàn cho frontend
    const validatedPlan = {
      mapName: parsedPlan.mapName || 'Bản Đồ Mới (AI DeepSeek)',
      planetId: Number(parsedPlan.planetId) || 0,
      tileId: Number(parsedPlan.tileId) || tileId || 1,
      bgId: Number(parsedPlan.bgId) || 0,
      concept: parsedPlan.concept || 'Kiến trúc đa tầng kiểu Map 161',
      platforms: Array.isArray(parsedPlan.platforms) ? parsedPlan.platforms : [],
      pillars: Array.isArray(parsedPlan.pillars) ? parsedPlan.pillars : [],
      mobs: Array.isArray(parsedPlan.mobs) ? parsedPlan.mobs : [],
      bgItems: Array.isArray(parsedPlan.bgItems) ? parsedPlan.bgItems : [],
      waypoints: Array.isArray(parsedPlan.waypoints) ? parsedPlan.waypoints : [],
    };

    res.json({
      ok: true,
      data: validatedPlan,
      usage: aiData.usage,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 10. AI Vision Map Layout Recognition: Phân tích ảnh chụp bản đồ bằng AI Vision đa phương thức */
router.post('/ai-vision-recognize', async (req, res) => {
  try {
    const {
      imageBase64 = '',
      prompt = '',
      apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '',
      provider = 'openai', // 'openai' | 'gemini' | 'openrouter'
      model = '',
      tmw = 60,
      tmh = 20,
      tileId = 1,
      mobLevel = 10,
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        ok: false,
        error: 'Vui lòng cung cấp dữ liệu ảnh (Base64).',
      });
    }

    const trimmedKey = (apiKey || '').trim().replace(/^Bearer\s+/i, '').replace(/^['"]|['"]$/g, '');
    const finalTmw = Math.max(20, Math.min(200, Number(tmw) || 60));
    const finalTmh = Math.max(10, Math.min(100, Number(tmh) || 20));

    // Clean base64 string
    let cleanBase64 = imageBase64;
    let mimeType = 'image/png';
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/png';
      cleanBase64 = parts[1];
    }

    const systemPrompt = `Bạn là Chuyên gia Trí Tuệ Nhân Tạo Thị Giác (AI Computer Vision) hàng đầu về phân tích bố cục bản đồ trò chơi 2D Platformer thế giới Ngọc Rồng Online (NRO / Dragon Boy).
Nhiệm vụ của bạn là xem bức ảnh chụp bản đồ được cung cấp và nhận diện chính xác 100% toàn bộ bố cục hình học không gian của bản đồ:
1. Bố cục địa hình gạch (Platforms, Floors, Stairs, Pillars):
   - Kích thước lưới: ${finalTmw} cột (x từ 0 đến ${finalTmw - 1}) x ${finalTmh} hàng (y từ 0 đến ${finalTmh - 1}). Hàng 0 là đỉnh trời, hàng ${finalTmh - 1} là đáy dưới cùng.
   - Nhận diện các mặt sàn ngang (platforms): xác định rõ hàng 'row' (độ cao tính theo tile row), cột bắt đầu 'startCol', cột kết thúc 'endCol', độ dày 'thickness' (thường từ 2-4 ô), loại 'type' ('ground' cho đất chính, 'floating_island' cho đảo bay, 'stair' cho bậc thang, 'canopy_branch' cho cành cây).
   - Nhận diện các cột trụ đứng / vách đá dốc (pillars): 'col', 'width', 'topRow', 'botRow'.
2. Quái vật (Mobs) xuất hiện trong ảnh:
   - Xác định tọa độ cột 'col', hàng 'row' trên sàn nơi quái đang đứng.
   - Ước lượng mobTempId phù hợp (vd: 1-10 cho quái thường, 80-81 cho quái rừng, v.v.).
3. Vật thể trang trí / Decor (bgItems):
   - Cây cối lớn, nấm khổng lồ, bụi cây, tảng đá: tọa độ cột 'col', hàng 'row'.
4. Cổng chuyển map (Waypoints):
   - Vị trí lối ra/vào ở mép trái (isLeft: true) hoặc mép phải (isLeft: false).

Hãy phân tích kỹ lưỡng các tầng địa hình, cầu thang bậc thang và các đảo lơ lửng trong ảnh và trả về DUY NHẤT một JSON hợp lệ tuân thủ schema:
{
  "mapName": "Tên bản đồ nhận diện từ ảnh",
  "planetId": 0,
  "tileId": ${tileId || 1},
  "bgId": 0,
  "concept": "Mô tả nhận diện bố cục từ ảnh",
  "platforms": [
    { "row": 16, "startCol": 0, "endCol": ${finalTmw - 1}, "thickness": 4, "type": "ground" },
    { "row": 8, "startCol": 10, "endCol": 25, "thickness": 2, "type": "floating_island" },
    { "row": 11, "startCol": 32, "endCol": 50, "thickness": 2, "type": "floating_island" }
  ],
  "pillars": [
    { "col": 20, "width": 3, "topRow": 8, "botRow": 16, "type": "cliff_wall" }
  ],
  "mobs": [
    { "mobTempId": 1, "col": 15, "row": 8, "level": ${mobLevel} },
    { "mobTempId": 1, "col": 40, "row": 11, "level": ${mobLevel} }
  ],
  "bgItems": [
    { "bgTempId": 0, "col": 12, "row": 6 },
    { "bgTempId": 1, "col": 35, "row": 9 }
  ],
  "waypoints": [
    { "name": "Cổng Về", "isLeft": true, "goMap": 0 },
    { "name": "Cổng Sang", "isLeft": false, "goMap": 1 }
  ]
}`;

    let parsedPlan = null;

    if (provider === 'gemini' && trimmedKey) {
      const geminiModel = model || 'gemini-1.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${trimmedKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: systemPrompt + '\n\n' + (prompt || 'Hãy nhận diện và phân tích toàn bộ bố cục map trong ảnh này.') },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2,
        },
      };

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini Vision API error (${geminiRes.status}): ${errText}`);
      }

      const geminiData = await geminiRes.json();
      const textOut = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      parsedPlan = extractJsonFromText(textOut);
    } else if (trimmedKey) {
      // OpenAI / OpenRouter Vision API format
      const isCustomRouter = provider === 'openrouter';
      const endpoint = isCustomRouter
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const visionModel = model || (isCustomRouter ? 'google/gemini-2.0-flash-001' : 'gpt-4o-mini');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`,
      };
      if (isCustomRouter) {
        headers['HTTP-Referer'] = 'http://localhost:3000';
        headers['X-Title'] = 'NRO Map Vision Studio';
      }

      const openAiRes = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: visionModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: systemPrompt + '\n\n' + (prompt || 'Hãy nhận diện và xuất bản vẽ JSON bố cục map từ ảnh đính kèm.') },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${cleanBase64}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      if (!openAiRes.ok) {
        const errText = await openAiRes.text();
        throw new Error(`Vision API error (${openAiRes.status}): ${errText}`);
      }

      const aiData = await openAiRes.json();
      const textOut = aiData.choices?.[0]?.message?.content || '';
      parsedPlan = extractJsonFromText(textOut);
    }

    if (!parsedPlan) {
      return res.status(500).json({
        ok: false,
        error: 'Không thể phân tích dữ liệu bố cục từ ảnh qua AI Vision. Vui lòng thử lại hoặc sử dụng bộ quét Computer Vision tích hợp sẵn trong trình duyệt.',
      });
    }

    const validatedPlan = {
      mapName: parsedPlan.mapName || 'Bản Đồ Quét Từ Ảnh',
      planetId: Number(parsedPlan.planetId) || 0,
      tileId: Number(parsedPlan.tileId) || tileId || 1,
      bgId: Number(parsedPlan.bgId) || 0,
      concept: parsedPlan.concept || 'Nhận diện thị giác tự động từ ảnh',
      platforms: Array.isArray(parsedPlan.platforms) ? parsedPlan.platforms : [],
      pillars: Array.isArray(parsedPlan.pillars) ? parsedPlan.pillars : [],
      mobs: Array.isArray(parsedPlan.mobs) ? parsedPlan.mobs : [],
      bgItems: Array.isArray(parsedPlan.bgItems) ? parsedPlan.bgItems : [],
      waypoints: Array.isArray(parsedPlan.waypoints) ? parsedPlan.waypoints : [],
    };

    res.json({
      ok: true,
      data: validatedPlan,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
