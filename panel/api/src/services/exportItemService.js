import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, exec, withTransaction } from '../db.js';
import { findIconFile } from './gameAssets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GAME_ROOT = path.resolve(__dirname, '../../../../');
const EXPORT_FILE_PATH = path.resolve(GAME_ROOT, 'export/item_template.txt');
const EXPORT_PART_FILE = path.resolve(GAME_ROOT, 'export/part.txt');
const EXPORT_HEAD_AVATAR_FILE = path.resolve(GAME_ROOT, 'export/head_avatar.txt');

const TYPE_NAMES = {
  0: 'Áo (Trang bị)',
  1: 'Quần (Trang bị)',
  2: 'Găng (Trang bị)',
  3: 'Giày (Trang bị)',
  4: 'Rada (Trang bị)',
  5: 'Thức ăn / Hồi phục',
  6: 'Đậu thần',
  7: 'Khác',
  8: 'Khác',
  11: 'Lồng đèn / Phụ kiện',
  12: 'Ngọc rồng',
  18: 'Pet / Thú cưng đeo sau lưng',
  21: 'Cải trang (Biến hình)',
  23: 'Thú cưỡi (Mount)',
  27: 'Hộp / Rương / Trứng / Vật phẩm mở',
  29: 'Vật phẩm bổ trợ (Bùa/Capsule)',
  30: 'Đá / Sao pha lê / Nâng cấp',
  36: 'Danh hiệu',
};

const GENDER_NAMES = {
  0: 'Trái Đất',
  1: 'Namek',
  2: 'Xayda',
  3: 'Dùng chung cho mọi tộc',
};

let cachedPartsMap = null;
let cachedPartsTime = 0;
let cachedFullPartsMap = null;
let cachedHeadAvatarsMap = null;
let cachedFullPartsTime = 0;

export function parsePartDataString(dataStr) {
  if (!dataStr) return [];
  try {
    let raw = String(dataStr).trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1).trim();
    }
    const parsed = typeof raw === 'string' ? JSON.parse(raw.replace(/\\"/g, '"')) : raw;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (Array.isArray(item)) {
          return { icon: Number(item[0]), dx: Number(item[1] || 0), dy: Number(item[2] || 0) };
        }
        return null;
      }).filter(Boolean);
    }
  } catch {
    const matches = [...String(dataStr).matchAll(/\[(\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)\]/g)];
    return matches.map((m) => ({ icon: Number(m[1]), dx: Number(m[2]), dy: Number(m[3]) }));
  }
  return [];
}

export function getPrimaryIconFromFrames(frames) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  const valid = frames.find((f) => f.icon > 0 && f.icon !== 2955 && f.icon !== 2954);
  if (valid) return valid.icon;
  return frames[0]?.icon > 0 ? frames[0].icon : null;
}

/**
 * Đọc file export/part.txt và nạp đầy đủ metadata & rawData
 */
export function loadExportPartsFullMap() {
  const now = Date.now();
  if (cachedFullPartsMap && now - cachedFullPartsTime < 60000) {
    return cachedFullPartsMap;
  }

  const map = new Map();
  if (fs.existsSync(EXPORT_PART_FILE)) {
    try {
      const content = fs.readFileSync(EXPORT_PART_FILE, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || (i === 0 && line.toLowerCase().startsWith('id\t'))) continue;
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const id = Number(parts[0]);
          const type = Number(parts[1]);
          const rawData = parts[2].trim();
          const frames = parsePartDataString(rawData);
          const mainIcon = getPrimaryIconFromFrames(frames);
          const entry = { id, type, data: rawData, mainIcon, frames: frames.map((f) => f.icon) };
          map.set(`${id}_${type}`, entry);
          if (!map.has(String(id))) map.set(String(id), entry);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc export/part.txt:', e.message);
    }
  }

  cachedFullPartsMap = map;
  cachedPartsMap = map;
  cachedFullPartsTime = now;
  cachedPartsTime = now;
  return map;
}

export function loadPartsMap() {
  return loadExportPartsFullMap();
}

/**
 * Đọc file export/head_avatar.txt
 */
export function loadExportHeadAvatarsMap() {
  const now = Date.now();
  if (cachedHeadAvatarsMap && now - cachedFullPartsTime < 60000) {
    return cachedHeadAvatarsMap;
  }

  const map = new Map();
  if (fs.existsSync(EXPORT_HEAD_AVATAR_FILE)) {
    try {
      const content = fs.readFileSync(EXPORT_HEAD_AVATAR_FILE, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || (i === 0 && line.toLowerCase().startsWith('head_id\t'))) continue;
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const headId = Number(parts[0]);
          const avatarId = Number(parts[1]);
          if (Number.isInteger(headId) && Number.isInteger(avatarId)) {
            map.set(headId, avatarId);
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc export/head_avatar.txt:', e.message);
    }
  }

  cachedHeadAvatarsMap = map;
  return map;
}

/**
 * Ghi lại file binary data/update_data/part cho Java runtime
 */
export async function syncUpdateDataPartBinaryFile(conn) {
  try {
    const partFilePath = path.resolve(GAME_ROOT, 'data/update_data/part');
    let partRows = [];
    if (conn && typeof conn.query === 'function') {
      const [res] = await conn.query('SELECT id, type, data FROM part ORDER BY id ASC, type ASC');
      partRows = res;
    } else {
      partRows = await query('SELECT id, type, data FROM part ORDER BY id ASC, type ASC');
    }
    if (!partRows || partRows.length === 0) return false;

    const chunks = [];
    const countBuf = Buffer.alloc(2);
    countBuf.writeInt16BE(partRows.length, 0);
    chunks.push(countBuf);

    for (const r of partRows) {
      const type = Number(r.type) || 0;
      let raw = String(r.data || '[]').trim();
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        raw = raw.slice(1, -1).trim();
      }
      let partDetails = [];
      try {
        partDetails = JSON.parse(raw.replace(/\\"/g, '"'));
      } catch (e) {
        partDetails = [];
      }
      if (!Array.isArray(partDetails)) partDetails = [];

      const partBuf = Buffer.alloc(1 + partDetails.length * 4);
      partBuf.writeInt8(type, 0);
      let offset = 1;
      for (const pd of partDetails) {
        partBuf.writeInt16BE(Number(pd[0]) || 0, offset);
        partBuf.writeInt8(Number(pd[1]) || 0, offset + 2);
        partBuf.writeInt8(Number(pd[2]) || 0, offset + 3);
        offset += 4;
      }
      chunks.push(partBuf);
    }

    const finalBuf = Buffer.concat(chunks);
    const dir = path.dirname(partFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(partFilePath, finalBuf);
    return true;
  } catch (e) {
    console.error('Lỗi tạo file binary data/update_data/part:', e);
    return false;
  }
}

let cachedDbPartsMap = null;
let cachedDbPartsTime = 0;
let cachedDbHeadAvatarMap = null;
let cachedDbHeadAvatarTime = 0;

export async function loadDbPartsMap(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedDbPartsMap && (now - cachedDbPartsTime < 30000)) {
    return cachedDbPartsMap;
  }
  try {
    const rows = await query('SELECT id, type, data FROM part ORDER BY id ASC, type ASC');
    const map = new Map();
    for (const r of rows) {
      const id = Number(r.id);
      const type = Number(r.type);
      const rawData = String(r.data || '').trim();
      const frames = parsePartDataString(rawData);
      const mainIcon = getPrimaryIconFromFrames(frames);
      const entry = { id, type, data: rawData, mainIcon, frames: frames.map((f) => f.icon) };
      map.set(`${id}_${type}`, entry);
      if (!map.has(String(id))) map.set(String(id), entry);
    }
    cachedDbPartsMap = map;
    cachedDbPartsTime = now;
    return map;
  } catch (e) {
    console.warn('Lỗi loadDbPartsMap:', e.message);
    return cachedDbPartsMap || new Map();
  }
}

export async function loadDbHeadAvatarsMap(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedDbHeadAvatarMap && (now - cachedDbHeadAvatarTime < 30000)) {
    return cachedDbHeadAvatarMap;
  }
  try {
    const rows = await query('SELECT head_id, avatar_id FROM head_avatar');
    const map = new Map();
    for (const r of rows) {
      map.set(Number(r.head_id), Number(r.avatar_id));
    }
    cachedDbHeadAvatarMap = map;
    cachedDbHeadAvatarTime = now;
    return map;
  } catch (e) {
    console.warn('Lỗi loadDbHeadAvatarsMap:', e.message);
    return cachedDbHeadAvatarMap || new Map();
  }
}

export function evaluateItemPartAndAvatarStatus(item, dbPartsMap, expPartsMap, dbAvatarMap, expAvatarMap) {
  if (!item) return { partStatus: 'NO_PART', avatarStatus: 'NO_HEAD', partDetails: [], avatarAudit: null, hasPartMismatch: false, hasAvatarMismatch: false, hasAnyIssue: false };

  const headId = Number(item.head ?? -1);
  const bodyId = Number(item.body ?? -1);
  const legId = Number(item.leg ?? -1);
  const generalPartId = Number(item.part ?? -1);

  const partDetails = [];
  const checkSlot = (slotKey, label, partId, expectedType) => {
    if (partId < 0) return null;
    const dbPart = dbPartsMap.get(`${partId}_${expectedType}`) || dbPartsMap.get(String(partId)) || null;
    const expPart = expPartsMap.get(`${partId}_${expectedType}`) || expPartsMap.get(String(partId)) || null;
    const dbIcon = dbPart?.mainIcon || null;
    const expIcon = expPart?.mainIcon || null;
    const dbDataStr = dbPart?.data ? String(dbPart.data).replace(/\s+/g, '') : null;
    const expDataStr = expPart?.data ? String(expPart.data).replace(/\s+/g, '') : null;

    let matched = true;
    let issue = null;
    if (!dbPart && expPart) {
      matched = false;
      issue = `Chưa có part #${partId} trong bảng part MariaDB`;
    } else if (dbPart && !expPart) {
      matched = true;
    } else if (dbPart && expPart) {
      if (dbDataStr !== expDataStr) {
        matched = false;
        issue = `Sai lệch frame sprite (DB Icon #${dbIcon || '?'} ➔ Exp Icon #${expIcon || '?'})`;
      }
    }

    return {
      slot: slotKey,
      label,
      partId,
      expectedType,
      dbIcon,
      expIcon,
      dbData: dbPart?.data || null,
      expData: expPart?.data || null,
      dbExists: Boolean(dbPart),
      expExists: Boolean(expPart),
      matched,
      issue,
    };
  };

  const headPart = checkSlot('head', 'Đầu', headId, 0);
  const bodyPart = checkSlot('body', 'Thân', bodyId, 1);
  const legPart = checkSlot('leg', 'Chân', legId, 2);
  const genPart = checkSlot('part', 'Part', generalPartId, 0);

  if (headPart) partDetails.push(headPart);
  if (bodyPart) partDetails.push(bodyPart);
  if (legPart) partDetails.push(legPart);
  if (genPart && generalPartId !== headId && generalPartId !== bodyId && generalPartId !== legId) {
    partDetails.push(genPart);
  }

  const hasPartMismatch = partDetails.some((p) => !p.matched);
  const hasPartMissing = partDetails.some((p) => !p.dbExists && p.expExists);
  let partStatus = 'MATCHED';
  if (partDetails.length === 0) partStatus = 'NO_PART';
  else if (hasPartMissing) partStatus = 'MISSING_IN_DB';
  else if (hasPartMismatch) partStatus = 'MISMATCHED';

  // Head Avatar Audit
  const targetHeadId = headId >= 0 ? headId : (generalPartId >= 0 ? generalPartId : -1);
  let avatarAudit = null;
  let avatarStatus = 'NO_HEAD';
  let hasAvatarMismatch = false;

  if (targetHeadId >= 0) {
    const dbAvatarId = dbAvatarMap.get(targetHeadId) ?? null;
    const expAvatarId = expAvatarMap.get(targetHeadId) ?? null;
    let matched = true;
    let issue = null;
    if (expAvatarId !== null) {
      if (dbAvatarId === null) {
        matched = false;
        issue = `Chưa mapping avatar cho Head #${targetHeadId} trong MariaDB (Export là #${expAvatarId})`;
        avatarStatus = 'MISSING_IN_DB';
      } else if (dbAvatarId !== expAvatarId) {
        matched = false;
        issue = `Lệch avatar ID: MariaDB là #${dbAvatarId} ➔ Export là #${expAvatarId}`;
        avatarStatus = 'MISMATCHED';
      } else {
        avatarStatus = 'MATCHED';
      }
    } else {
      avatarStatus = dbAvatarId !== null ? 'MATCHED' : 'NO_MAP';
    }
    hasAvatarMismatch = !matched;
    avatarAudit = {
      headId: targetHeadId,
      dbAvatarId,
      expAvatarId,
      matched,
      issue,
      status: avatarStatus,
    };
  }

  return {
    partStatus,
    avatarStatus,
    partDetails,
    avatarAudit,
    hasPartMismatch,
    hasAvatarMismatch,
    hasAnyIssue: hasPartMismatch || hasAvatarMismatch || partStatus === 'MISSING_IN_DB' || avatarStatus === 'MISSING_IN_DB',
  };
}

/**
 * Kiểm tra xem một bản ghi part trong MariaDB có phải là ô TRỐNG / placeholder [[0,0,0],[0,0,0],[0,0,0]] hay không
 */
export function isPartPlaceholderOrEmpty(part) {
  if (!part) return true;
  const rawData = String(part.data || '').trim();
  if (!rawData || rawData === '[]' || rawData === 'null' || rawData === '""') return true;

  // Chuẩn hóa chuỗi (ví dụ: [[0,0,0],[0,0,0],[0,0,0]])
  const clean = rawData.replace(/\s+/g, '');
  if (
    clean === '[[0,0,0],[0,0,0],[0,0,0]]' ||
    clean === '[[0,0,0]]' ||
    clean === '[[0,0,0],[0,0,0]]' ||
    clean === '[[0,0,0],[0,0,0],[0,0,0],[0,0,0]]'
  ) {
    return true;
  }

  // Parse frames và kiểm tra nếu tất cả frame đều có icon <= 0
  const frames = Array.isArray(part.frames) && part.frames.length > 0
    ? part.frames
    : parsePartDataString(rawData).map((f) => f.icon);

  if (!frames || frames.length === 0) return true;
  const hasRealIcon = frames.some((ic) => Number(ic) > 0);
  if (!hasRealIcon) return true;

  return false;
}

/**
 * Tìm dải Part ID trống gần nhất (chưa từng có dữ liệu đồ họa thực trong DB, bao gồm các ID vắng mặt hoặc ID có data [[0,0,0],[0,0,0],[0,0,0]])
 */
export function findNearestFreePartIds(count = 1, dbPartsMap = null, maxPartId = 0, dbAvatarMap = null) {
  const occupied = new Set();
  if (dbPartsMap) {
    for (const [key, p] of dbPartsMap.entries()) {
      if (p && p.id != null && !isPartPlaceholderOrEmpty(p)) {
        occupied.add(Number(p.id));
      }
    }
  }
  if (dbAvatarMap) {
    for (const [hId, avId] of dbAvatarMap.entries()) {
      if (avId != null && Number(avId) > 0) {
        occupied.add(Number(hId));
      }
    }
  }
  const max = Math.max(Number(maxPartId) || 0, ...occupied, 0);

  // Tìm dải 'count' ID liên tiếp chưa có dữ liệu thực trong DB từ 0 đến max + 1
  for (let start = 0; start <= max + 1; start++) {
    let allFree = true;
    for (let offset = 0; offset < count; offset++) {
      const targetId = start + offset;
      if (occupied.has(targetId)) {
        allFree = false;
        break;
      }
    }
    if (allFree) {
      return start;
    }
  }
  return max + 1;
}

/**
 * Kiểm tra xem Part ID của 1 Export Item có bị xung đột / đè lên Part ID THỰC TẾ đã tồn tại trong Database hay không
 * Nếu Part ID trong DB là placeholder rỗng [[0,0,0],[0,0,0],[0,0,0]] thì KHÔNG bị xung đột (có thể ghi trực tiếp)
 * Nếu trong DB đã có sprite thực khác thì mới đề xuất chuyển sang Part ID trống gần nhất
 */
export function checkPartConflictForExportItem(expItem, dbPartsMap, maxPartId = 0, dbAvatarMap = null) {
  if (!expItem) return { hasConflict: false, conflictingSlots: [], suggestedNewParts: null, hasAvatarConflict: false };

  const headId = Number(expItem.head ?? -1);
  const bodyId = Number(expItem.body ?? -1);
  const legId = Number(expItem.leg ?? -1);
  const partId = Number(expItem.part ?? -1);

  if (headId < 0 && bodyId < 0 && legId < 0 && partId < 0) {
    return { hasConflict: false, conflictingSlots: [], suggestedNewParts: null, hasAvatarConflict: false };
  }

  const expPartsMap = loadExportPartsFullMap();
  const expAvatarMap = loadExportHeadAvatarsMap();
  const conflictingSlots = [];

  const checkSlot = (slotName, slotLabel, pId, expectedType) => {
    if (pId < 0) return;
    const expPart = expPartsMap.get(`${pId}_${expectedType}`) || expPartsMap.get(String(pId));
    const dbPartExact = dbPartsMap?.get(`${pId}_${expectedType}`);
    const dbPartAny = dbPartsMap?.get(String(pId));

    const dbPart = dbPartExact || dbPartAny;

    // Nếu trong DB Part này hoàn toàn trống (chưa có row, hoặc là placeholder [[0,0,0],[0,0,0],[0,0,0]])
    // thì KHÔNG coi là xung đột (có thể nạp trực tiếp vào Part ID này)
    if (!dbPart || isPartPlaceholderOrEmpty(dbPart)) {
      return;
    }

    // Nếu DB Part chứa dữ liệu đồ họa thực tế:
    if (dbPartExact) {
      const dbDataStr = String(dbPartExact.data || '').replace(/\s+/g, '');
      const expDataStr = String(expPart?.data || '').replace(/\s+/g, '');
      if (expDataStr && dbDataStr !== expDataStr) {
        conflictingSlots.push({
          slot: slotName,
          label: slotLabel,
          partId: pId,
          expectedType,
          reason: `${slotLabel} #${pId} (Type ${expectedType}) đã có trong DB với sprite thực khác (Icon DB #${dbPartExact.mainIcon || '?'} ≠ Export #${expPart?.mainIcon || '?'})`,
        });
      }
    } else if (dbPartAny) {
      conflictingSlots.push({
        slot: slotName,
        label: slotLabel,
        partId: pId,
        expectedType,
        reason: `${slotLabel} #${pId} trong DB đang là Type ${dbPartAny.type} với sprite thực (Export là Type ${expectedType})`,
      });
    }
  };

  checkSlot('head', 'Đầu (Head)', headId, 0);
  checkSlot('body', 'Thân (Body)', bodyId, 1);
  checkSlot('leg', 'Chân (Leg)', legId, 2);
  if (partId >= 0 && partId !== headId && partId !== bodyId && partId !== legId) {
    const expGenPart = expPartsMap.get(String(partId));
    checkSlot('part', 'Part', partId, expGenPart?.type ?? 0);
  }

  // Check Head Avatar Conflict
  let hasAvatarConflict = false;
  const targetHead = headId >= 0 ? headId : (partId >= 0 ? partId : -1);
  const expAvatarId = targetHead >= 0 ? expAvatarMap.get(targetHead) ?? null : null;
  if (targetHead >= 0 && dbAvatarMap) {
    const dbAvatarId = dbAvatarMap.get(targetHead) ?? null;
    if (dbAvatarId !== null && Number(dbAvatarId) > 0 && expAvatarId !== null && Number(dbAvatarId) !== Number(expAvatarId)) {
      hasAvatarConflict = true;
      conflictingSlots.push({
        slot: 'avatar',
        label: 'Head Avatar',
        partId: targetHead,
        reason: `Head Avatar #${targetHead} trong MariaDB đang map với Avatar #${dbAvatarId} (Export là #${expAvatarId})`,
      });
    }
  }

  const hasConflict = conflictingSlots.length > 0;

  let suggestedNewParts = null;
  if (hasConflict || headId >= 0 || bodyId >= 0 || legId >= 0 || partId >= 0) {
    let neededCount = 0;
    if (headId >= 0) neededCount++;
    if (bodyId >= 0) neededCount++;
    if (legId >= 0) neededCount++;
    if (partId >= 0 && partId !== headId && partId !== bodyId && partId !== legId) neededCount++;

    let nextId = findNearestFreePartIds(neededCount, dbPartsMap, maxPartId, dbAvatarMap);

    let newHead = headId >= 0 ? nextId++ : -1;
    let newBody = bodyId >= 0 ? nextId++ : -1;
    let newLeg = legId >= 0 ? nextId++ : -1;
    let newPart = -1;

    if (partId >= 0) {
      if (partId === headId && newHead >= 0) newPart = newHead;
      else if (partId === bodyId && newBody >= 0) newPart = newBody;
      else if (partId === legId && newLeg >= 0) newPart = newLeg;
      else newPart = nextId++;
    }

    const assignedIds = [newHead, newBody, newLeg, newPart].filter((n) => n >= 0);
    const startId = assignedIds.length > 0 ? Math.min(...assignedIds) : nextId;
    const endId = assignedIds.length > 0 ? Math.max(...assignedIds) : nextId;

    suggestedNewParts = {
      head: newHead,
      body: newBody,
      leg: newLeg,
      part: newPart,
      startId,
      endId,
      maxDbPartId: maxPartId,
      originalParts: { head: headId, body: bodyId, leg: legId, part: partId },
      expAvatarId,
      hasAvatarConflict,
    };
  }

  return {
    hasConflict,
    conflictingSlots,
    suggestedNewParts,
    hasAvatarConflict,
  };
}

export function resolveItemPartPreview(item, partsMap) {
  if (!item) return null;
  const pMap = partsMap || loadPartsMap();
  const res = {};

  const headId = Number(item.head ?? -1);
  const bodyId = Number(item.body ?? -1);
  const legId = Number(item.leg ?? -1);
  const partId = Number(item.part ?? -1);

  if (headId >= 0) {
    const p = pMap.get(`${headId}_0`) || pMap.get(String(headId));
    res.head = { id: headId, icon: p?.mainIcon ?? null, frames: p?.frames || [] };
  }
  if (bodyId >= 0) {
    const p = pMap.get(`${bodyId}_1`) || pMap.get(String(bodyId));
    res.body = { id: bodyId, icon: p?.mainIcon ?? null, frames: p?.frames || [] };
  }
  if (legId >= 0) {
    const p = pMap.get(`${legId}_2`) || pMap.get(String(legId));
    res.leg = { id: legId, icon: p?.mainIcon ?? null, frames: p?.frames || [] };
  }
  if (partId >= 0) {
    const p = pMap.get(String(partId)) || pMap.get(`${partId}_0`) || pMap.get(`${partId}_1`) || pMap.get(`${partId}_2`);
    res.part = { id: partId, icon: p?.mainIcon ?? null, frames: p?.frames || [] };
  }

  return Object.keys(res).length > 0 ? res : null;
}

/**
 * Đọc và parse toàn bộ file export/item_template.txt
 */
export function parseExportItemFile(filePath = EXPORT_FILE_PATH) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `File không tồn tại: ${filePath}`, items: [] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const items = [];
  const errors = [];
  const partsMap = loadPartsMap();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    if (i === 0 && rawLine.toLowerCase().startsWith('id\t')) {
      continue;
    }

    const parts = rawLine.split('\t');
    if (parts.length < 5) {
      const spaceParts = rawLine.split(/\s{2,}|\t+/);
      if (spaceParts.length < 5) {
        errors.push({ lineIndex: i + 1, content: rawLine, error: 'Không đủ số cột dữ liệu' });
        continue;
      }
    }

    const cols = parts.length >= 5 ? parts : rawLine.split(/\s{2,}|\t+/);

    const id = Number(cols[0]);
    if (!Number.isInteger(id) || id < 0) {
      if (i > 0) errors.push({ lineIndex: i + 1, content: rawLine, error: 'ID không hợp lệ' });
      continue;
    }

    const type = Number(cols[1] || 0);
    const gender = Number(cols[2] || 3);
    const name = String(cols[3] || '').trim();
    const description = String(cols[4] || '').trim();
    const level = Number(cols[5] || 0);
    const iconId = Number(cols[6] || 0);
    const part = Number(cols[7] ?? -1);
    const isUpToUp = Number(cols[8] || 0) ? 1 : 0;
    const powerRequire = Number(cols[9] || 0);
    const gold = Number(cols[10] || 0);
    const gem = Number(cols[11] || 0);
    const head = Number(cols[12] ?? -1);
    const body = Number(cols[13] ?? -1);
    const leg = Number(cols[14] ?? -1);

    const tempItem = {
      id,
      type: Number.isFinite(type) ? type : 0,
      gender: Number.isFinite(gender) ? gender : 3,
      NAME: name,
      name,
      description,
      level: Number.isFinite(level) ? level : 0,
      icon_id: Number.isFinite(iconId) ? iconId : 0,
      part: Number.isFinite(part) ? part : -1,
      is_up_to_up: isUpToUp,
      power_require: Number.isFinite(powerRequire) ? powerRequire : 0,
      gold: Number.isFinite(gold) ? gold : 0,
      gem: Number.isFinite(gem) ? gem : 0,
      head: Number.isFinite(head) ? head : -1,
      body: Number.isFinite(body) ? body : -1,
      leg: Number.isFinite(leg) ? leg : -1,
      _source: 'export',
    };

    tempItem.part_preview = resolveItemPartPreview(tempItem, partsMap);
    items.push(tempItem);
  }

  return {
    ok: true,
    filePath,
    totalLines: lines.length,
    items,
    errors,
  };
}

/**
 * Phân tích chuyên sâu độ lệch của từng trường dữ liệu
 */
export function analyzeFieldDifference(field, dbVal, expVal, dbItem, expItem) {
  let severity = 'INFO';
  let category = 'Chỉ số chung';
  let whatChanged = '';
  let impact = '';

  switch (field) {
    case 'type':
      severity = 'CRITICAL';
      category = 'Cơ chế loại trang bị';
      whatChanged = `Đổi loại item từ Type ${dbVal} (${TYPE_NAMES[dbVal] || 'Khác'}) sang Type ${expVal} (${TYPE_NAMES[expVal] || 'Khác'})`;
      impact = `RẤT QUAN TRỌNG: Thay đổi cách sử dụng của vật phẩm trong game. Nếu chuyển từ Type 27 (Hộp/Rương) sang Type 18 (Pet) hoặc 21 (Cải trang), người chơi sẽ có thể đeo vật phẩm vào ô trang bị thay vì mở ra quà.`;
      break;

    case 'part':
      severity = 'WARNING';
      category = 'Đồ họa & Ngoại hình';
      whatChanged = `Đổi Part từ ${dbVal} sang ${expVal}`;
      impact = dbVal === -1 && expVal !== -1
        ? `Thêm bộ part hiển thị ngoại hình #${expVal} cho nhân vật/pet khi trang bị.`
        : `Thay đổi mô hình part đồ họa từ #${dbVal} sang #${expVal}.`;
      break;

    case 'head':
    case 'body':
    case 'leg':
      severity = 'WARNING';
      category = 'Bộ phận Avatar / Sprite';
      whatChanged = `Đổi bộ phận ${field.toUpperCase()} từ ${dbVal} sang ${expVal}`;
      impact = dbVal === -1 && expVal !== -1
        ? `Gán mã đồ họa ${field} #${expVal} để hiển thị đầy đủ hình dạng 3 phần khi mang item.`
        : `Thay đổi mã hiển thị ${field} từ #${dbVal} sang #${expVal}.`;
      break;

    case 'icon_id':
      severity = 'WARNING';
      category = 'Ảnh đại diện Icon';
      whatChanged = `Đổi Icon ID từ #${dbVal} sang #${expVal}`;
      impact = `Hình ảnh hiển thị trong túi đồ và shop sẽ thay đổi sang icon #${expVal}.`;
      break;

    case 'gender':
      severity = 'WARNING';
      category = 'Giới hạn Tộc';
      whatChanged = `Đổi tộc sử dụng từ ${dbVal} (${GENDER_NAMES[dbVal] || 'Khác'}) sang ${expVal} (${GENDER_NAMES[expVal] || 'Khác'})`;
      impact = `Quy định tộc nhân vật có thể trang bị hoặc sử dụng item này.`;
      break;

    case 'NAME':
      severity = 'WARNING';
      category = 'Tên gọi';
      whatChanged = `Đổi tên từ "${dbVal}" sang "${expVal}"`;
      impact = `Thay đổi tên hiển thị của vật phẩm trong game.`;
      break;

    case 'power_require':
      severity = 'INFO';
      category = 'Sức mạnh yêu cầu';
      whatChanged = `Sức mạnh yêu cầu thay đổi từ ${Number(dbVal).toLocaleString('vi-VN')} sang ${Number(expVal).toLocaleString('vi-VN')}`;
      impact = `Yêu cầu sức mạnh của người chơi để sử dụng/mặc trang bị.`;
      break;

    case 'level':
      severity = 'INFO';
      category = 'Cấp độ';
      whatChanged = `Level yêu cầu đổi từ ${dbVal} sang ${expVal}`;
      impact = `Cấp độ yêu cầu của nhân vật để sử dụng item.`;
      break;

    case 'gold':
    case 'gem':
      severity = 'INFO';
      category = 'Kinh tế & Giá cả';
      whatChanged = `Giá ${field === 'gold' ? 'vàng' : 'ngọc'} đổi từ ${dbVal} sang ${expVal}`;
      impact = `Giá bán mặc định trong hệ thống cửa hàng.`;
      break;

    case 'is_up_to_up':
      severity = 'INFO';
      category = 'Nâng cấp';
      whatChanged = `Cho phép nâng cấp đổi từ ${dbVal ? 'Bật' : 'Tắt'} sang ${expVal ? 'Bật' : 'Tắt'}`;
      impact = `Quy định item có thể nâng cấp tại NPC Bà Hạt Mít hay không.`;
      break;

    case 'description':
      severity = 'INFO';
      category = 'Mô tả';
      whatChanged = `Mô tả thay đổi: "${dbVal}" ➔ "${expVal}"`;
      impact = `Thay đổi nội dung chú thích khi người chơi xem thông tin item.`;
      break;

    default:
      whatChanged = `Trường ${field} thay đổi từ ${dbVal} sang ${expVal}`;
      impact = `Cập nhật dữ liệu template của vật phẩm.`;
      break;
  }

  return { severity, category, whatChanged, impact };
}

/**
 * So sánh 2 item và tạo bản phân tích chẩn đoán toàn diện
 */
export function compareItemFields(dbItem, exportItem) {
  const diffs = [];
  const fieldsToCheck = [
    { key: 'NAME', label: 'Tên vật phẩm', normalize: (v) => String(v || '').trim() },
    { key: 'type', label: 'Loại (type)', normalize: (v) => Number(v ?? 0) },
    { key: 'gender', label: 'Tộc (gender)', normalize: (v) => Number(v ?? 3) },
    { key: 'icon_id', label: 'Icon ID', normalize: (v) => Number(v ?? 0) },
    { key: 'part', label: 'Part', normalize: (v) => Number(v ?? -1) },
    { key: 'level', label: 'Level', normalize: (v) => Number(v ?? 0) },
    { key: 'power_require', label: 'Sức mạnh yêu cầu', normalize: (v) => Number(v ?? 0) },
    { key: 'gold', label: 'Vàng', normalize: (v) => Number(v ?? 0) },
    { key: 'gem', label: 'Ngọc', normalize: (v) => Number(v ?? 0) },
    { key: 'head', label: 'Head Part', normalize: (v) => Number(v ?? -1) },
    { key: 'body', label: 'Body Part', normalize: (v) => Number(v ?? -1) },
    { key: 'leg', label: 'Leg Part', normalize: (v) => Number(v ?? -1) },
    { key: 'is_up_to_up', label: 'Cho phép nâng cấp', normalize: (v) => (Number(v || 0) ? 1 : 0) },
    { key: 'description', label: 'Mô tả', normalize: (v) => String(v || '').trim() },
  ];

  for (const f of fieldsToCheck) {
    const dbVal = f.normalize(dbItem[f.key]);
    const expVal = f.normalize(exportItem[f.key]);
    if (dbVal !== expVal) {
      const diag = analyzeFieldDifference(f.key, dbVal, expVal, dbItem, exportItem);
      diffs.push({
        field: f.key,
        label: f.label,
        dbValue: dbVal,
        exportValue: expVal,
        severity: diag.severity,
        category: diag.category,
        whatChanged: diag.whatChanged,
        impact: diag.impact,
      });
    }
  }

  let riskLevel = 'LOW';
  let hasTypeChange = diffs.some((d) => d.field === 'type');
  let hasGraphicsChange = diffs.some((d) => ['part', 'head', 'body', 'leg', 'icon_id'].includes(d.field));
  let hasNameChange = diffs.some((d) => d.field === 'NAME');

  if (hasTypeChange || hasNameChange) {
    riskLevel = 'HIGH';
  } else if (hasGraphicsChange) {
    riskLevel = 'MEDIUM';
  }

  let rootCause = '';
  if (hasGraphicsChange && dbItem.part === -1 && exportItem.part !== -1) {
    rootCause = `Bản dựng Export đã bổ sung đầy đủ bộ Part đồ họa (#${exportItem.part}) và Head/Body/Leg (#${exportItem.head}/#${exportItem.body}/#${exportItem.leg}), trong khi Database hiện tại đang để giá trị -1 chưa gán ngoại hình.`;
  } else if (hasTypeChange) {
    rootCause = `Bản dựng Export phân loại item này là ${TYPE_NAMES[exportItem.type] || 'Loại ' + exportItem.type}, trong khi Database đang phân loại là ${TYPE_NAMES[dbItem.type] || 'Loại ' + dbItem.type}.`;
  } else {
    rootCause = `Lệch các chỉ số phụ (cấp độ, giá vàng, ngọc hoặc sức mạnh yêu cầu) giữa cấu hình DB và bản dựng Export.`;
  }

  const safetyAssessment = `Đồng bộ item_template KHÔNG làm mất item của người chơi trong túi đồ. Các thông số option (sao pha lê, chỉ số phụ) của item người chơi lưu theo temp_id #${dbItem.id} vẫn giữ nguyên 100%.`;

  return {
    diffs,
    analysis: {
      riskLevel,
      riskText: riskLevel === 'HIGH' ? '🔴 Chú ý: Thay đổi cơ chế sử dụng / Loại trang bị' : riskLevel === 'MEDIUM' ? '🟡 Thay đổi hiển thị ngoại hình / Đồ họa' : '🟢 An toàn: Lệch chỉ số phụ & giá cả',
      rootCause,
      safetyAssessment,
      hasTypeChange,
      hasGraphicsChange,
    },
  };
}

/**
 * Kiểm tra xem có bao nhiêu người chơi trong DB đang sở hữu item này trong hành trang/rương
 */
export async function checkItemUsageInPlayers(tempId) {
  const idNum = Number(tempId);
  if (!Number.isInteger(idNum) || idNum < 0) return { count: 0, players: [] };

  try {
    const pattern = `%\\[${idNum},%`;
    const rows = await query(
      `SELECT id, name, items_body, items_bag, items_box
       FROM player
       WHERE items_body LIKE ? OR items_bag LIKE ? OR items_box LIKE ?
       LIMIT 10`,
      [pattern, pattern, pattern]
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM player
       WHERE items_body LIKE ? OR items_bag LIKE ? OR items_box LIKE ?`,
      [pattern, pattern, pattern]
    );

    return {
      totalHolders: Number(countRows[0]?.total || 0),
      samplePlayers: rows.map((r) => ({ id: r.id, name: r.name })),
    };
  } catch (e) {
    console.warn('Lỗi kiểm tra item usage in players:', e.message);
    return { totalHolders: 0, samplePlayers: [] };
  }
}

export function normalizeDbRow(r) {
  if (!r) return null;
  return {
    id: Number(r.id ?? r.ID ?? 0),
    type: Number(r.type ?? r.TYPE ?? 0),
    gender: Number(r.gender ?? r.GENDER ?? 3),
    NAME: String(r.NAME ?? r.name ?? ''),
    name: String(r.NAME ?? r.name ?? ''),
    description: String(r.description ?? r.DESCRIPTION ?? ''),
    level: Number(r.level ?? r.LEVEL ?? 0),
    icon_id: Number(r.icon_id ?? r.ICON_ID ?? 0),
    part: Number(r.part ?? r.PART ?? -1),
    is_up_to_up: Number(r.is_up_to_up ?? r.IS_UP_TO_UP ?? 0) ? 1 : 0,
    power_require: Number(r.power_require ?? r.POWER_REQUIRE ?? 0),
    gold: Number(r.gold ?? r.GOLD ?? 0),
    gem: Number(r.gem ?? r.GEM ?? 0),
    head: Number(r.head ?? r.HEAD ?? -1),
    body: Number(r.body ?? r.BODY ?? -1),
    leg: Number(r.leg ?? r.LEG ?? -1),
  };
}

export function isItemPlaceholderOrEmpty(item) {
  if (!item) return true;
  const name = String(item.NAME ?? item.name ?? '').trim();
  const iconId = Number(item.icon_id ?? 0);
  const type = Number(item.type ?? 0);
  if (!name || name === 'null' || name.toLowerCase() === 'item trống' || name.toLowerCase() === 'trống') return true;
  if (type === 75 && iconId === 0 && (!item.description || item.description.trim() === '')) return true;
  return false;
}

/**
 * Thực hiện so sánh đối chiếu toàn bộ DB item_template với export/item_template.txt
 */
export async function compareDatabaseWithExport() {
  const exportParsed = parseExportItemFile();
  if (!exportParsed.ok || !exportParsed.items.length) {
    return {
      ok: false,
      error: exportParsed.error || `Không tìm thấy hoặc không đọc được file export tại: ${EXPORT_FILE_PATH}`,
    };
  }
  const exportItems = exportParsed.items;

  const rawDbRows = await query(
    `SELECT id, type, gender, NAME, description, level, icon_id, part, is_up_to_up,
            power_require, gold, gem, head, body, leg
     FROM item_template
     ORDER BY id ASC`
  );
  const dbRows = rawDbRows.map(normalizeDbRow);

  const partsMap = loadPartsMap();
  const dbPartsMap = await loadDbPartsMap(true);
  const dbAvatarMap = await loadDbHeadAvatarsMap(true);
  const expPartsMap = loadExportPartsFullMap();
  const expAvatarMap = loadExportHeadAvatarsMap();

  let maxDbPartId = 0;
  for (const p of dbPartsMap.values()) {
    if (Number(p.id) > maxDbPartId) maxDbPartId = Number(p.id);
  }

  const dbMap = new Map();
  for (const r of dbRows) {
    const enriched = {
      ...r,
      part_preview: resolveItemPartPreview(r, partsMap),
      part_avatar_audit: evaluateItemPartAndAvatarStatus(r, dbPartsMap, expPartsMap, dbAvatarMap, expAvatarMap),
    };
    dbMap.set(r.id, enriched);
  }

  const exportMap = new Map();
  for (const exp of exportItems) {
    exportMap.set(exp.id, exp);
  }

  const iconUsageMap = new Map();
  for (const r of dbRows) {
    const iconId = Number(r.icon_id || 0);
    if (!iconUsageMap.has(iconId)) {
      iconUsageMap.set(iconId, { iconId, dbItems: [], exportItems: [] });
    }
    iconUsageMap.get(iconId).dbItems.push(r);
  }
  for (const exp of exportItems) {
    const iconId = Number(exp.icon_id || 0);
    if (!iconUsageMap.has(iconId)) {
      iconUsageMap.set(iconId, { iconId, dbItems: [], exportItems: [] });
    }
    iconUsageMap.get(iconId).exportItems.push(exp);
  }

  const dbByNameIcon = new Map();
  const dbByIcon = new Map();
  const dbByName = new Map();
  for (const r of dbRows) {
    const nameTrim = String(r.NAME || '').trim().toLowerCase();
    const key = `${nameTrim}_${r.icon_id}`;
    if (!dbByNameIcon.has(key)) dbByNameIcon.set(key, []);
    dbByNameIcon.get(key).push(r);

    const iconId = Number(r.icon_id || 0);
    if (!dbByIcon.has(iconId)) dbByIcon.set(iconId, []);
    dbByIcon.get(iconId).push(r);

    if (nameTrim) {
      if (!dbByName.has(nameTrim)) dbByName.set(nameTrim, []);
      dbByName.get(nameTrim).push(r);
    }
  }

  const exportByNameIcon = new Map();
  const exportByIcon = new Map();
  const exportByName = new Map();
  for (const exp of exportItems) {
    const nameTrim = String(exp.NAME || '').trim().toLowerCase();
    const key = `${nameTrim}_${exp.icon_id}`;
    if (!exportByNameIcon.has(key)) exportByNameIcon.set(key, []);
    exportByNameIcon.get(key).push(exp);

    const iconId = Number(exp.icon_id || 0);
    if (!exportByIcon.has(iconId)) exportByIcon.set(iconId, []);
    exportByIcon.get(iconId).push(exp);

    if (nameTrim) {
      if (!exportByName.has(nameTrim)) exportByName.set(nameTrim, []);
      exportByName.get(nameTrim).push(exp);
    }
  }

  const allIds = Array.from(new Set([...dbMap.keys(), ...exportMap.keys()])).sort((a, b) => a - b);

  let matchedCount = 0;
  let mismatchedCount = 0;
  let partAvatarMismatchCount = 0;
  let sameIconCount = 0;
  let onlyDbCount = 0;
  let onlyExportCount = 0;
  let shiftedCount = 0;
  let emptyDbSlotCount = 0;

  const emptyDbSlots = dbRows.filter((r) => isItemPlaceholderOrEmpty(r));
  const comparison = [];

  for (const id of allIds) {
    const dbItem = dbMap.get(id);
    const expItem = exportMap.get(id);
    const targetItem = dbItem || expItem;
    const partAvatarAudit = evaluateItemPartAndAvatarStatus(targetItem, dbPartsMap, expPartsMap, dbAvatarMap, expAvatarMap);
    const partConflict = expItem ? checkPartConflictForExportItem(expItem, dbPartsMap, maxDbPartId, dbAvatarMap) : null;

    // Phân tích Cụm Icon cho DB Item
    let dbIconCluster = null;
    if (dbItem) {
      const dbIconId = Number(dbItem.icon_id || 0);
      const c = iconUsageMap.get(dbIconId);
      const otherDb = (c?.dbItems || []).filter((it) => it.id !== id);
      const otherExp = (c?.exportItems || []).filter((it) => it.id !== id);
      const isShared = otherDb.length > 0 || otherExp.length > 0;
      dbIconCluster = {
        iconId: dbIconId,
        isSharedIcon: isShared,
        otherDbMatches: otherDb.map((m) => ({ id: m.id, name: m.NAME, type: m.type, icon_id: m.icon_id })),
        otherExportMatches: otherExp.map((m) => ({ id: m.id, name: m.NAME, type: m.type, icon_id: m.icon_id })),
        totalItemsWithThisIcon: (c?.dbItems?.length || 0) + (c?.exportItems?.length || 0),
      };
    }

    // Phân tích Cụm Icon cho Export Item
    let expIconCluster = null;
    if (expItem) {
      const expIconId = Number(expItem.icon_id || 0);
      const c = iconUsageMap.get(expIconId);
      const otherDb = (c?.dbItems || []).filter((it) => it.id !== id);
      const otherExp = (c?.exportItems || []).filter((it) => it.id !== id);
      const isShared = otherDb.length > 0 || otherExp.length > 0;
      expIconCluster = {
        iconId: expIconId,
        isSharedIcon: isShared,
        otherDbMatches: otherDb.map((m) => ({ id: m.id, name: m.NAME, type: m.type, icon_id: m.icon_id })),
        otherExportMatches: otherExp.map((m) => ({ id: m.id, name: m.NAME, type: m.type, icon_id: m.icon_id })),
        totalItemsWithThisIcon: (c?.dbItems?.length || 0) + (c?.exportItems?.length || 0),
      };
    }

    const isSharedIcon = Boolean(dbIconCluster?.isSharedIcon || expIconCluster?.isSharedIcon);
    if (isSharedIcon) sameIconCount++;

    const isIconMismatch = Boolean(dbItem && expItem && Number(dbItem.icon_id) !== Number(expItem.icon_id));

    // Dò tìm chéo vị trí thực tế của dbItem trong file Export
    let possibleExportMatch = null;
    if (dbItem && !isItemPlaceholderOrEmpty(dbItem)) {
      const dbNameTrim = String(dbItem.NAME || '').trim().toLowerCase();
      const exactExp = exportByNameIcon.get(`${dbNameTrim}_${dbItem.icon_id}`)?.find((e) => e.id !== id);
      if (exactExp) {
        possibleExportMatch = { id: exactExp.id, name: exactExp.NAME, icon_id: exactExp.icon_id, isExactNameAndIcon: true };
      } else {
        const byName = exportByName.get(dbNameTrim)?.find((e) => e.id !== id);
        if (byName) {
          possibleExportMatch = { id: byName.id, name: byName.NAME, icon_id: byName.icon_id, isExactNameAndIcon: false };
        }
      }
    }

    // Dò tìm chéo vị trí thực tế của expItem trong MariaDB
    let possibleDbMatch = null;
    if (expItem && !isItemPlaceholderOrEmpty(expItem)) {
      const expNameTrim = String(expItem.NAME || '').trim().toLowerCase();
      const exactDb = dbByNameIcon.get(`${expNameTrim}_${expItem.icon_id}`)?.find((d) => d.id !== id && !isItemPlaceholderOrEmpty(d));
      if (exactDb) {
        possibleDbMatch = { id: exactDb.id, name: exactDb.NAME, icon_id: exactDb.icon_id, isExactNameAndIcon: true };
      } else {
        const byName = dbByName.get(expNameTrim)?.find((d) => d.id !== id && !isItemPlaceholderOrEmpty(d));
        if (byName) {
          possibleDbMatch = { id: byName.id, name: byName.NAME, icon_id: byName.icon_id, isExactNameAndIcon: false };
        }
      }
    }

    const isDbEmpty = !dbItem || isItemPlaceholderOrEmpty(dbItem);
    const isExpEmpty = !expItem || isItemPlaceholderOrEmpty(expItem);

    const alreadyExistsInDb = Boolean(possibleDbMatch?.isExactNameAndIcon);
    const canFillFromExport = isDbEmpty && expItem && !isExpEmpty && !alreadyExistsInDb;
    if (canFillFromExport) emptyDbSlotCount++;

    // Kiểm tra trường hợp: Export item tại slot id này là 1 vật phẩm hợp lệ, chưa từng có trong MariaDB,
    // nhưng tại MariaDB ô id này đã bị chiếm bởi 1 vật phẩm KHÁC (ví dụ #1790 DB là Mẹ Rồng còn Exp là Hộp trang bị Thần)
    let uncreatedExportRedirect = null;
    if (expItem && !isExpEmpty && dbItem && !isDbEmpty && !alreadyExistsInDb) {
      const sortedEmpty = [...emptyDbSlots].sort((a, b) => Math.abs(a.id - id) - Math.abs(b.id - id));
      const nearest = sortedEmpty[0] || null;
      const nearestList = sortedEmpty.slice(0, 5);

      if (nearest) {
        uncreatedExportRedirect = {
          exportItem: {
            id: expItem.id,
            name: expItem.NAME,
            icon_id: expItem.icon_id,
            type: expItem.type,
            gender: expItem.gender,
            description: expItem.description,
            part: expItem.part,
            head: expItem.head,
            body: expItem.body,
            leg: expItem.leg,
            level: expItem.level,
            power_require: expItem.power_require,
            gold: expItem.gold,
            gem: expItem.gem,
          },
          currentDbOccupant: {
            id: dbItem.id,
            name: dbItem.NAME,
            icon_id: dbItem.icon_id,
          },
          nearestEmptySlotId: nearest.id,
          nearbyEmptySlots: nearestList.map((s) => s.id),
          partConflict,
        };
      }
    }

    // Đề xuất đồng bộ Tên & Mô tả từ Export cho các item có cùng Icon ID
    const dbIconId = Number(dbItem?.icon_id ?? 0);
    const matchedExportByIcon = dbIconId > 0
      ? (exportByIcon.get(dbIconId) || [])
      : [];

    const iconSyncSuggestions = matchedExportByIcon.map((exp) => {
      const isSameItemId = exp.id === id;
      const hasNameDiff = String(dbItem?.NAME || '').trim() !== String(exp.NAME || '').trim();
      const hasDescDiff = String(dbItem?.description || '').trim() !== String(exp.description || '').trim();
      const itemPartConflict = checkPartConflictForExportItem(exp, dbPartsMap, maxDbPartId, dbAvatarMap);
      return {
        exportId: exp.id,
        exportName: exp.NAME,
        exportDescription: exp.description || '',
        exportType: exp.type,
        exportIconId: exp.icon_id,
        exportPart: exp.part,
        exportHead: exp.head,
        exportBody: exp.body,
        exportLeg: exp.leg,
        isSameItemId,
        hasNameDifference: hasNameDiff,
        hasDescDifference: hasDescDiff,
        shouldSuggest: hasNameDiff || hasDescDiff || isDbEmpty,
        partConflict: itemPartConflict,
      };
    }).filter((s) => s.shouldSuggest);

    const exportSuggestion = canFillFromExport ? {
      id: expItem.id,
      name: expItem.NAME,
      icon_id: expItem.icon_id,
      type: expItem.type,
      part: expItem.part,
      head: expItem.head,
      body: expItem.body,
      leg: expItem.leg,
      level: expItem.level,
      description: expItem.description,
      partConflict,
    } : null;

    if (dbItem && expItem) {
      const { diffs, analysis } = compareItemFields(dbItem, expItem);
      const isTemplateMatched = diffs.length === 0;
      const isPartAvatarMatched = !partAvatarAudit.hasAnyIssue;

      if (canFillFromExport) {
        mismatchedCount++;
        comparison.push({
          id,
          status: 'EMPTY_DB_SLOT',
          statusText: `📭 Ô ID Trống (Có thể nạp "${expItem.NAME}")`,
          dbItem,
          exportItem: expItem,
          diffs,
          partAvatarAudit,
          dbIconCluster,
          expIconCluster,
          iconCluster: dbIconCluster || expIconCluster,
          isIconMismatch,
          possibleExportMatch,
          possibleDbMatch,
          iconSyncSuggestions,
          isDbEmpty: true,
          canFillFromExport: true,
          exportSuggestion,
          uncreatedExportRedirect,
          analysis: {
            riskLevel: 'LOW',
            riskText: `📭 Ô ID trống trong MariaDB - Đề xuất nạp "${expItem.NAME}" từ Export`,
            rootCause: `ID #${id} hiện tại là ô trống trong Database (type: ${dbItem.type}, tên rỗng). Trong file export/item_template.txt có vật phẩm "${expItem.NAME}" (Icon #${expItem.icon_id}, Type ${expItem.type}).`,
            safetyAssessment: 'Nạp vật phẩm này từ Export vào Database giúp hoàn thiện các item còn thiếu mà không gây ảnh hưởng tới túi đồ người chơi.',
          },
        });
      } else if (isTemplateMatched && isPartAvatarMatched) {
        matchedCount++;
        comparison.push({
          id,
          status: 'MATCHED',
          statusText: 'Khớp hoàn toàn',
          dbItem,
          exportItem: expItem,
          diffs: [],
          partAvatarAudit,
          dbIconCluster,
          expIconCluster,
          iconCluster: dbIconCluster || expIconCluster,
          isIconMismatch: false,
          possibleExportMatch,
          possibleDbMatch,
          iconSyncSuggestions,
          isDbEmpty,
          canFillFromExport: false,
          exportSuggestion: null,
          uncreatedExportRedirect,
          analysis: { riskLevel: 'NONE', riskText: '🟢 Khớp 100%' },
        });
      } else if (isTemplateMatched && !isPartAvatarMatched) {
        partAvatarMismatchCount++;
        comparison.push({
          id,
          status: 'PART_AVATAR_MISMATCH',
          statusText: partAvatarAudit.hasPartMismatch ? '⚠️ Lệch Sprite Part DB' : (partAvatarAudit.hasAvatarMismatch ? '⚠️ Lệch Head Avatar DB' : '⚠️ Thiếu Part/Avatar DB'),
          dbItem,
          exportItem: expItem,
          diffs: [],
          partAvatarAudit,
          dbIconCluster,
          expIconCluster,
          iconCluster: dbIconCluster || expIconCluster,
          isIconMismatch: false,
          possibleExportMatch,
          possibleDbMatch,
          iconSyncSuggestions,
          isDbEmpty,
          canFillFromExport: false,
          exportSuggestion: null,
          uncreatedExportRedirect,
          analysis: {
            riskLevel: 'MEDIUM',
            riskText: '🟡 Lệch dữ liệu Part Sprites hoặc Head Avatar trong MariaDB',
            rootCause: partAvatarAudit.partDetails.filter((p) => !p.matched).map((p) => p.issue).concat(partAvatarAudit.avatarAudit && !partAvatarAudit.avatarAudit.matched ? [partAvatarAudit.avatarAudit.issue] : []).join('; '),
            safetyAssessment: 'Đồng bộ Part & Head Avatar từ export vào DB để hiển thị đúng trang phục và avatar.',
          },
        });
      } else {
        mismatchedCount++;
        if (possibleExportMatch || possibleDbMatch) shiftedCount++;
        comparison.push({
          id,
          status: 'MISMATCHED',
          statusText: !isPartAvatarMatched ? `Lệch ${diffs.length} thuộc tính & Lệch Part/Avatar DB` : `Lệch ${diffs.length} thuộc tính`,
          dbItem,
          exportItem: expItem,
          diffs,
          partAvatarAudit,
          dbIconCluster,
          expIconCluster,
          iconCluster: dbIconCluster || expIconCluster,
          isIconMismatch,
          possibleExportMatch,
          possibleDbMatch,
          iconSyncSuggestions,
          isDbEmpty,
          canFillFromExport: false,
          exportSuggestion: null,
          uncreatedExportRedirect,
          analysis,
        });
      }
    } else if (dbItem && !expItem) {
      onlyDbCount++;
      if (possibleExportMatch) shiftedCount++;

      comparison.push({
        id,
        status: 'ONLY_IN_DB',
        statusText: possibleExportMatch ? `Chỉ có ở DB (khớp tên với Export #${possibleExportMatch.id})` : 'Chỉ có trong Database',
        dbItem,
        exportItem: null,
        diffs: [],
        partAvatarAudit,
        dbIconCluster,
        expIconCluster: null,
        iconCluster: dbIconCluster,
        isIconMismatch: false,
        possibleExportMatch,
        possibleDbMatch: null,
        iconSyncSuggestions,
        isDbEmpty,
        canFillFromExport: false,
        exportSuggestion: null,
        uncreatedExportRedirect: null,
        analysis: {
          riskLevel: 'LOW',
          riskText: '🔵 Vật phẩm chỉ có trong MariaDB',
          rootCause: `ID #${id} tồn tại trong Database nhưng không có dòng tương ứng trong file export/item_template.txt.`,
          safetyAssessment: 'Item này có thể là custom của server. Giữ nguyên không ảnh hưởng.',
        },
      });
    } else if (!dbItem && expItem) {
      onlyExportCount++;
      const isExactMatch = Boolean(possibleDbMatch?.isExactNameAndIcon);
      if (possibleDbMatch) shiftedCount++;

      comparison.push({
        id,
        status: canFillFromExport ? 'EMPTY_DB_SLOT' : (isExactMatch ? 'SHIFTED' : 'ONLY_IN_EXPORT'),
        statusText: canFillFromExport
          ? `📭 Ô ID Chưa Có Trong DB (Có sẵn "${expItem.NAME}")`
          : (isExactMatch
              ? `Đã có ở DB #${possibleDbMatch.id} (Trùng tên & Icon #${expItem.icon_id})`
              : (possibleDbMatch ? `Chỉ có ở Export (khớp tên với DB #${possibleDbMatch.id})` : 'Chưa có trong Database')),
        dbItem: null,
        exportItem: expItem,
        diffs: [],
        partAvatarAudit,
        dbIconCluster: null,
        expIconCluster,
        iconCluster: expIconCluster,
        isIconMismatch: false,
        possibleExportMatch: null,
        possibleDbMatch,
        iconSyncSuggestions,
        isDbEmpty: true,
        canFillFromExport,
        exportSuggestion,
        analysis: {
          riskLevel: 'LOW',
          riskText: canFillFromExport
            ? `📭 Khuyết ID #${id} trong MariaDB - Đề xuất nạp "${expItem.NAME}"`
            : (isExactMatch
                ? `🔵 Đã có trong MariaDB #${possibleDbMatch.id} - Không cần nạp lại từ Export`
                : '🟠 Item mới trong Export chưa nạp vào DB'),
          rootCause: isExactMatch
            ? `Vật phẩm "${expItem.NAME}" (Icon #${expItem.icon_id}) đã tồn tại trong MariaDB tại ID #${possibleDbMatch.id}. Bản dựng Export ở ID #${id} là bản ghi dời ID hoặc trùng lặp, không cần đề xuất nạp thêm.`
            : `Item #${id} có trong file export nhưng bảng item_template chưa có dòng này.`,
          safetyAssessment: isExactMatch
            ? 'Item đã có sẵn trong Database, giữ nguyên an toàn không cần nạp đề xuất.'
            : 'Nạp item này vào Database hoàn toàn an toàn và mở khóa thêm vật phẩm mới cho server.',
        },
      });
    }
  }

  return {
    ok: true,
    filePath: EXPORT_FILE_PATH,
    summary: {
      totalCompared: allIds.length,
      totalDb: dbRows.length,
      totalExport: exportItems.length,
      matchedCount,
      mismatchedCount,
      partAvatarMismatchCount,
      sameIconCount,
      onlyDbCount,
      onlyExportCount,
      shiftedCount,
      emptyDbSlotCount,
      hasDiscrepancy: mismatchedCount > 0 || partAvatarMismatchCount > 0 || onlyDbCount > 0 || onlyExportCount > 0 || emptyDbSlotCount > 0,
    },
    comparison,
  };
}

/**
 * Đồng bộ dữ liệu Part và Head Avatar cho danh sách item (hỗ trợ customPartMapping để tạo Part ID mới)
 */
export async function syncPartsAndHeadAvatarForItems(items, conn = null, customPartMapping = null) {
  const expPartsMap = loadExportPartsFullMap();
  const expAvatarsMap = loadExportHeadAvatarsMap();

  const executeSql = async (sql, params = []) => {
    if (conn && typeof conn.execute === 'function') {
      return conn.execute(sql, params);
    }
    if (conn && typeof conn.query === 'function') {
      return conn.query(sql, params);
    }
    return exec(sql, params);
  };

  let partSynced = 0;
  let avatarSynced = 0;

  for (const item of items) {
    if (!item) continue;
    const mapping = (customPartMapping && (customPartMapping[item.id] || customPartMapping[String(item.id)])) || null;

    const origHeadId = Number(mapping?.origHead ?? item.head ?? -1);
    const origBodyId = Number(mapping?.origBody ?? item.body ?? -1);
    const origLegId = Number(mapping?.origLeg ?? item.leg ?? -1);
    const origPartId = Number(mapping?.origPart ?? item.part ?? -1);

    const targetHeadId = Number(mapping?.head ?? origHeadId);
    const targetBodyId = Number(mapping?.body ?? origBodyId);
    const targetLegId = Number(mapping?.leg ?? origLegId);
    const targetPartId = Number(mapping?.part ?? origPartId);

    // 1. Sync Head Part (type 0)
    if (targetHeadId >= 0 && origHeadId >= 0) {
      const expHead = expPartsMap.get(`${origHeadId}_0`) || expPartsMap.get(String(origHeadId));
      if (expHead) {
        await executeSql(
          `INSERT INTO part (id, type, data) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [targetHeadId, 0, expHead.data]
        );
        partSynced++;
      }
    }

    // 2. Sync Body Part (type 1)
    if (targetBodyId >= 0 && origBodyId >= 0) {
      const expBody = expPartsMap.get(`${origBodyId}_1`) || expPartsMap.get(String(origBodyId));
      if (expBody) {
        await executeSql(
          `INSERT INTO part (id, type, data) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [targetBodyId, 1, expBody.data]
        );
        partSynced++;
      }
    }

    // 3. Sync Leg Part (type 2)
    if (targetLegId >= 0 && origLegId >= 0) {
      const expLeg = expPartsMap.get(`${origLegId}_2`) || expPartsMap.get(String(origLegId));
      if (expLeg) {
        await executeSql(
          `INSERT INTO part (id, type, data) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [targetLegId, 2, expLeg.data]
        );
        partSynced++;
      }
    }

    // 4. Sync General Part (if defined and distinct)
    if (targetPartId >= 0 && origPartId >= 0 && targetPartId !== targetHeadId && targetPartId !== targetBodyId && targetPartId !== targetLegId) {
      const expPart = expPartsMap.get(String(origPartId)) || expPartsMap.get(`${origPartId}_0`) || expPartsMap.get(`${origPartId}_1`) || expPartsMap.get(`${origPartId}_2`);
      if (expPart) {
        await executeSql(
          `INSERT INTO part (id, type, data) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [targetPartId, expPart.type, expPart.data]
        );
        partSynced++;
      }
    }

    // 5. Sync Head Avatar mapping
    if (targetHeadId >= 0 && origHeadId >= 0) {
      const expAvatarId = expAvatarsMap.get(origHeadId);
      if (expAvatarId != null) {
        await executeSql(
          `INSERT INTO head_avatar (head_id, avatar_id) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE avatar_id = VALUES(avatar_id)`,
          [targetHeadId, expAvatarId]
        );
        avatarSynced++;
      }
    } else if (targetPartId >= 0 && origPartId >= 0) {
      const expAvatarId = expAvatarsMap.get(origPartId);
      if (expAvatarId != null) {
        await executeSql(
          `INSERT INTO head_avatar (head_id, avatar_id) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE avatar_id = VALUES(avatar_id)`,
          [targetPartId, expAvatarId]
        );
        avatarSynced++;
      }
    }
  }

  // 6. Rewrite binary data/update_data/part file
  await syncUpdateDataPartBinaryFile(conn);

  // Invalidate in-memory caches
  cachedDbPartsMap = null;
  cachedDbHeadAvatarMap = null;

  return { partSynced, avatarSynced };
}

/**
 * Phân tích chuyên sâu 3 tầng: Item Template + Part Sprites + Head Avatar + Player Inventory
 */
export async function getDeepAnalysis(id) {
  const dbRows = await query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [id]);
  const exportParsed = parseExportItemFile();
  if (!exportParsed.ok) throw new Error(exportParsed.error);

  const expItem = exportParsed.items.find((it) => it.id === id);
  const dbItem = dbRows.length > 0 ? dbRows[0] : null;

  if (!dbItem && !expItem) {
    throw new Error(`Không tìm thấy item #${id} ở cả Database lẫn Export`);
  }

  const expPartsMap = loadExportPartsFullMap();
  const expAvatarsMap = loadExportHeadAvatarsMap();

  if (dbItem) dbItem.part_preview = resolveItemPartPreview(dbItem, expPartsMap);
  if (expItem) expItem.part_preview = resolveItemPartPreview(expItem, expPartsMap);

  // 1. Template fields difference
  let comparisonResult = null;
  if (dbItem && expItem) {
    comparisonResult = compareItemFields(dbItem, expItem);
  }

  // 2. Part Sprites Detailed Analysis (Head, Body, Leg, Part)
  const partIds = new Set();
  if (dbItem) {
    if (Number(dbItem.head) >= 0) partIds.add(Number(dbItem.head));
    if (Number(dbItem.body) >= 0) partIds.add(Number(dbItem.body));
    if (Number(dbItem.leg) >= 0) partIds.add(Number(dbItem.leg));
    if (Number(dbItem.part) >= 0) partIds.add(Number(dbItem.part));
  }
  if (expItem) {
    if (Number(expItem.head) >= 0) partIds.add(Number(expItem.head));
    if (Number(expItem.body) >= 0) partIds.add(Number(expItem.body));
    if (Number(expItem.leg) >= 0) partIds.add(Number(expItem.leg));
    if (Number(expItem.part) >= 0) partIds.add(Number(expItem.part));
  }

  const partIdList = [...partIds];
  let dbPartsRows = [];
  if (partIdList.length > 0) {
    dbPartsRows = await query(
      `SELECT id, type, data FROM part WHERE id IN (${partIdList.map(() => '?').join(',')})`,
      partIdList
    );
  }

  const dbPartsMap = new Map();
  for (const r of dbPartsRows) {
    const frames = parsePartDataString(r.data);
    const mainIcon = getPrimaryIconFromFrames(frames);
    dbPartsMap.set(`${r.id}_${r.type}`, { id: r.id, type: r.type, data: r.data, frames: frames.map((f) => f.icon), mainIcon });
    if (!dbPartsMap.has(String(r.id))) {
      dbPartsMap.set(String(r.id), { id: r.id, type: r.type, data: r.data, frames: frames.map((f) => f.icon), mainIcon });
    }
  }

  // Slots evaluation: head (0), body (1), leg (2), part
  const targetItem = expItem || dbItem;
  const partDetails = [];

  const checkSlot = (slotName, slotLabel, partId, expectedType) => {
    if (partId == null || partId < 0) return null;
    const expPart = expPartsMap.get(`${partId}_${expectedType}`) || expPartsMap.get(String(partId));
    const dbPart = dbPartsMap.get(`${partId}_${expectedType}`) || dbPartsMap.get(String(partId));

    const expDataStr = expPart?.data || null;
    const dbDataStr = dbPart?.data || null;
    const expIcon = expPart?.mainIcon || null;
    const dbIcon = dbPart?.mainIcon || null;

    let matched = true;
    let issue = null;

    if (!dbPart && expPart) {
      matched = false;
      issue = `Chưa có bản ghi Part #${partId} trong bảng part của MariaDB.`;
    } else if (dbPart && !expPart) {
      matched = false;
      issue = `Part #${partId} chỉ tồn tại trong DB, không có trong file export.`;
    } else if (dbPart && expPart) {
      const normDb = String(dbDataStr || '').replace(/\s+/g, '');
      const normExp = String(expDataStr || '').replace(/\s+/g, '');
      if (normDb !== normExp || dbIcon !== expIcon) {
        matched = false;
        issue = `Dữ liệu sprite bị lệch: DB đang dùng icon #${dbIcon || '?'} trong khi Export gốc dùng icon #${expIcon || '?'}.`;
      }
    }

    return {
      slot: slotName,
      label: slotLabel,
      partId,
      expectedType,
      dbPart,
      expPart,
      dbIcon,
      expIcon,
      dbData: dbDataStr,
      expData: expDataStr,
      matched,
      issue,
    };
  };

  const headPartInfo = checkSlot('head', 'Đầu (Head)', targetItem.head, 0);
  const bodyPartInfo = checkSlot('body', 'Thân (Body)', targetItem.body, 1);
  const legPartInfo = checkSlot('leg', 'Chân (Leg)', targetItem.leg, 2);
  const generalPartInfo = checkSlot('part', 'Phụ kiện / Cải trang (Part)', targetItem.part, 0);

  if (headPartInfo) partDetails.push(headPartInfo);
  if (bodyPartInfo) partDetails.push(bodyPartInfo);
  if (legPartInfo) partDetails.push(legPartInfo);
  if (generalPartInfo && targetItem.part !== targetItem.head && targetItem.part !== targetItem.body && targetItem.part !== targetItem.leg) {
    partDetails.push(generalPartInfo);
  }

  const hasPartMismatch = partDetails.some((p) => !p.matched);

  // 3. Head Avatar Detailed Analysis
  const headIdsToCheck = [];
  if (targetItem.head >= 0) headIdsToCheck.push(targetItem.head);
  if (targetItem.part >= 0 && !headIdsToCheck.includes(targetItem.part)) headIdsToCheck.push(targetItem.part);

  let dbAvatarsRows = [];
  if (headIdsToCheck.length > 0) {
    dbAvatarsRows = await query(
      `SELECT head_id, avatar_id FROM head_avatar WHERE head_id IN (${headIdsToCheck.map(() => '?').join(',')})`,
      headIdsToCheck
    );
  }

  const dbAvatarMap = new Map();
  for (const r of dbAvatarsRows) {
    dbAvatarMap.set(r.head_id, r.avatar_id);
  }

  const headAvatarDetails = [];
  for (const hId of headIdsToCheck) {
    const dbAvatarId = dbAvatarMap.get(hId) ?? null;
    const expAvatarId = expAvatarsMap.get(hId) ?? null;
    const matched = dbAvatarId === expAvatarId && dbAvatarId != null;
    headAvatarDetails.push({
      headId: hId,
      dbAvatarId,
      expAvatarId,
      matched,
      issue: !matched ? (dbAvatarId == null ? `Chưa có mapping avatar cho Head #${hId} trong DB` : `Lệch Avatar ID: DB là #${dbAvatarId} ➔ Export là #${expAvatarId}`) : null,
    });
  }

  const hasAvatarMismatch = headAvatarDetails.some((a) => !a.matched);

  // 4. Check player inventory usage
  const playerUsage = await checkItemUsageInPlayers(id);

  return {
    id,
    dbItem,
    exportItem: expItem,
    diffs: comparisonResult?.diffs || [],
    analysis: comparisonResult?.analysis || null,
    partDetails,
    hasPartMismatch,
    headAvatarDetails,
    hasAvatarMismatch,
    playerUsage,
    dbIconExist: dbItem ? Boolean(findIconFile(dbItem.icon_id)) : false,
    expIconExist: expItem ? Boolean(findIconFile(expItem.icon_id)) : false,
  };
}

/**
 * Đồng bộ 1 item từ Export sang Database (hỗ trợ đồng bộ chọn lọc trường hoặc toàn bộ, kèm tạo Part ID mới nếu xung đột)
 */
export async function syncSingleItemFromExport(id, selectedFields = null, options = {}) {
  const exportParsed = parseExportItemFile();
  if (!exportParsed.ok) throw new Error(exportParsed.error);

  const expItem = exportParsed.items.find((it) => it.id === id);
  if (!expItem) throw new Error(`Không tìm thấy item #${id} trong file export/item_template.txt`);

  const syncTemplate = options.syncTemplate !== false;
  const syncParts = options.syncParts !== false;
  const syncHeadAvatar = options.syncHeadAvatar !== false;

  let persisted = null;

  await withTransaction(async (conn) => {
    let finalHead = expItem.head;
    let finalBody = expItem.body;
    let finalLeg = expItem.leg;
    let finalPart = expItem.part;
    let customPartMapping = null;

    if (options.useNewPartIds) {
      const [partRows] = await conn.query('SELECT id, type, data FROM part');
      const [avatarRows] = await conn.query('SELECT head_id, avatar_id FROM head_avatar');
      const occupied = new Set();
      for (const r of partRows) {
        if (!isPartPlaceholderOrEmpty(r)) {
          occupied.add(Number(r.id));
        }
      }
      for (const r of avatarRows) {
        if (r.avatar_id != null && Number(r.avatar_id) > 0) {
          occupied.add(Number(r.head_id));
        }
      }
      const maxPartId = Math.max(0, ...occupied);

      let neededCount = 0;
      if (Number(expItem.head) >= 0) neededCount++;
      if (Number(expItem.body) >= 0) neededCount++;
      if (Number(expItem.leg) >= 0) neededCount++;
      if (Number(expItem.part) >= 0 && expItem.part !== expItem.head && expItem.part !== expItem.body && expItem.part !== expItem.leg) neededCount++;

      let nextId = maxPartId + 1;
      for (let start = 0; start <= maxPartId + 1; start++) {
        let allFree = true;
        for (let offset = 0; offset < neededCount; offset++) {
          if (occupied.has(start + offset)) {
            allFree = false;
            break;
          }
        }
        if (allFree) {
          nextId = start;
          break;
        }
      }

      const newHead = Number(expItem.head) >= 0 ? nextId++ : -1;
      const newBody = Number(expItem.body) >= 0 ? nextId++ : -1;
      const newLeg = Number(expItem.leg) >= 0 ? nextId++ : -1;
      let newPart = -1;
      if (Number(expItem.part) >= 0) {
        if (expItem.part === expItem.head && newHead >= 0) newPart = newHead;
        else if (expItem.part === expItem.body && newBody >= 0) newPart = newBody;
        else if (expItem.part === expItem.leg && newLeg >= 0) newPart = newLeg;
        else newPart = nextId++;
      }
      finalHead = newHead;
      finalBody = newBody;
      finalLeg = newLeg;
      finalPart = newPart;
      customPartMapping = {
        [expItem.id]: {
          head: newHead,
          body: newBody,
          leg: newLeg,
          part: newPart,
          origHead: expItem.head,
          origBody: expItem.body,
          origLeg: expItem.leg,
          origPart: expItem.part,
        },
      };
    } else if (options.customPartIds) {
      finalHead = options.customPartIds.head ?? expItem.head;
      finalBody = options.customPartIds.body ?? expItem.body;
      finalLeg = options.customPartIds.leg ?? expItem.leg;
      finalPart = options.customPartIds.part ?? expItem.part;
      customPartMapping = {
        [expItem.id]: {
          head: finalHead,
          body: finalBody,
          leg: finalLeg,
          part: finalPart,
          origHead: expItem.head,
          origBody: expItem.body,
          origLeg: expItem.leg,
          origPart: expItem.part,
        },
      };
    }

    if (syncTemplate) {
      const [existing] = await conn.query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [id]);
      if (existing.length > 0) {
        const current = existing[0];
        const fieldsToApply = Array.isArray(selectedFields) && selectedFields.length > 0 ? selectedFields : null;
        const pick = (f) => {
          // Tuyệt đối KHÔNG can thiệp vào cột part: luôn giữ nguyên giá trị part hiện có trong DB
          if (f === 'part') return current.part;
          if (f === 'head') return fieldsToApply && !fieldsToApply.includes('head') ? current.head : finalHead;
          if (f === 'body') return fieldsToApply && !fieldsToApply.includes('body') ? current.body : finalBody;
          if (f === 'leg') return fieldsToApply && !fieldsToApply.includes('leg') ? current.leg : finalLeg;
          return fieldsToApply ? (fieldsToApply.includes(f) ? expItem[f] : current[f]) : expItem[f];
        };

        await conn.execute(
          `UPDATE item_template
           SET type=?, gender=?, NAME=?, description=?, level=?, icon_id=?, part=?,
               is_up_to_up=?, power_require=?, gold=?, gem=?, head=?, body=?, leg=?
           WHERE id=?`,
          [
            pick('type'), pick('gender'), pick('NAME'), pick('description'), pick('level'),
            pick('icon_id'), current.part, pick('is_up_to_up'), pick('power_require'),
            pick('gold'), pick('gem'), pick('head'), pick('body'), pick('leg'), id,
          ]
        );
      } else {
        // Với item mới thêm vào DB: tuyệt đối không lấy part từ export, mặc định -1
        await conn.execute(
          `INSERT INTO item_template
           (id, type, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, expItem.type, expItem.gender, expItem.NAME, expItem.description, expItem.level,
            expItem.icon_id, -1, expItem.is_up_to_up, expItem.power_require,
            expItem.gold, expItem.gem, finalHead, finalBody, finalLeg,
          ]
        );
      }
    }

    // Tuyệt đối không can thiệp vào bảng part và head_avatar khi nạp item
    // Bỏ qua syncPartsAndHeadAvatarForItems để bảo vệ dữ liệu Part sprites & mapping Head Avatar trong DB

    const [rows] = await conn.query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [id]);
    persisted = rows[0] || expItem;
  });

  return persisted;
}

/**
 * Đồng bộ dữ liệu từ một Item ID trong Export sang một Item ID khác trong MariaDB (hỗ trợ đồng bộ theo Icon trùng khớp & tạo Part ID mới)
 */
export async function syncItemFromDifferentExportId({ dbId, exportId, fields = 'name_desc_only', syncParts = true, syncHeadAvatar = true, useNewPartIds = false, customPartIds = null }) {
  const targetDbId = Number(dbId);
  const sourceExpId = Number(exportId);

  if (!Number.isInteger(targetDbId) || targetDbId < 0) throw new Error('ID Database không hợp lệ');
  if (!Number.isInteger(sourceExpId) || sourceExpId < 0) throw new Error('ID Export không hợp lệ');

  const exportParsed = parseExportItemFile();
  if (!exportParsed.ok) throw new Error(exportParsed.error);

  const expItem = exportParsed.items.find((it) => it.id === sourceExpId);
  if (!expItem) throw new Error(`Không tìm thấy item #${sourceExpId} trong file export/item_template.txt`);

  let persisted = null;

  await withTransaction(async (conn) => {
    let finalHead = expItem.head;
    let finalBody = expItem.body;
    let finalLeg = expItem.leg;
    let finalPart = expItem.part;
    let customPartMapping = null;

    if (useNewPartIds) {
      const [partRows] = await conn.query('SELECT id, type, data FROM part');
      const [avatarRows] = await conn.query('SELECT head_id, avatar_id FROM head_avatar');
      const occupied = new Set();
      for (const r of partRows) {
        if (!isPartPlaceholderOrEmpty(r)) {
          occupied.add(Number(r.id));
        }
      }
      for (const r of avatarRows) {
        if (r.avatar_id != null && Number(r.avatar_id) > 0) {
          occupied.add(Number(r.head_id));
        }
      }
      const maxPartId = Math.max(0, ...occupied);

      let neededCount = 0;
      if (Number(expItem.head) >= 0) neededCount++;
      if (Number(expItem.body) >= 0) neededCount++;
      if (Number(expItem.leg) >= 0) neededCount++;
      if (Number(expItem.part) >= 0 && expItem.part !== expItem.head && expItem.part !== expItem.body && expItem.part !== expItem.leg) neededCount++;

      let nextId = maxPartId + 1;
      for (let start = 0; start <= maxPartId + 1; start++) {
        let allFree = true;
        for (let offset = 0; offset < neededCount; offset++) {
          if (occupied.has(start + offset)) {
            allFree = false;
            break;
          }
        }
        if (allFree) {
          nextId = start;
          break;
        }
      }

      const newHead = Number(expItem.head) >= 0 ? nextId++ : -1;
      const newBody = Number(expItem.body) >= 0 ? nextId++ : -1;
      const newLeg = Number(expItem.leg) >= 0 ? nextId++ : -1;
      let newPart = -1;
      if (Number(expItem.part) >= 0) {
        if (expItem.part === expItem.head && newHead >= 0) newPart = newHead;
        else if (expItem.part === expItem.body && newBody >= 0) newPart = newBody;
        else if (expItem.part === expItem.leg && newLeg >= 0) newPart = newLeg;
        else newPart = nextId++;
      }
      finalHead = newHead;
      finalBody = newBody;
      finalLeg = newLeg;
      finalPart = newPart;
      customPartMapping = {
        [expItem.id]: {
          head: newHead,
          body: newBody,
          leg: newLeg,
          part: newPart,
          origHead: expItem.head,
          origBody: expItem.body,
          origLeg: expItem.leg,
          origPart: expItem.part,
        },
      };
    } else if (customPartIds) {
      finalHead = customPartIds.head ?? expItem.head;
      finalBody = customPartIds.body ?? expItem.body;
      finalLeg = customPartIds.leg ?? expItem.leg;
      finalPart = customPartIds.part ?? expItem.part;
      customPartMapping = {
        [expItem.id]: {
          head: finalHead,
          body: finalBody,
          leg: finalLeg,
          part: finalPart,
          origHead: expItem.head,
          origBody: expItem.body,
          origLeg: expItem.leg,
          origPart: expItem.part,
        },
      };
    }

    const [existing] = await conn.query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [targetDbId]);
    if (!existing.length) {
      // Với item mới: tuyệt đối không lấy part từ export, mặc định -1
      await conn.execute(
        `INSERT INTO item_template
         (id, type, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetDbId, expItem.type, expItem.gender, expItem.NAME, expItem.description, expItem.level,
          expItem.icon_id, -1, expItem.is_up_to_up, expItem.power_require,
          expItem.gold, expItem.gem, finalHead, finalBody, finalLeg,
        ]
      );
    } else if (fields === 'name_desc_only') {
      await conn.execute(
        `UPDATE item_template SET NAME = ?, description = ? WHERE id = ?`,
        [expItem.NAME, expItem.description || '', targetDbId]
      );
    } else {
      // Tuyệt đối giữ nguyên cột part hiện có trong DB, không ghi đè
      const currentPart = existing[0].part;
      await conn.execute(
        `UPDATE item_template
         SET type=?, gender=?, NAME=?, description=?, level=?, icon_id=?, part=?,
             is_up_to_up=?, power_require=?, gold=?, gem=?, head=?, body=?, leg=?
         WHERE id=?`,
        [
          expItem.type, expItem.gender, expItem.NAME, expItem.description, expItem.level,
          expItem.icon_id, currentPart, expItem.is_up_to_up, expItem.power_require,
          expItem.gold, expItem.gem, finalHead, finalBody, finalLeg, targetDbId,
        ]
      );
    }

    // Tuyệt đối không can thiệp vào bảng part và head_avatar khi nạp item
    // Bỏ qua syncPartsAndHeadAvatarForItems

    const [rows] = await conn.query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [targetDbId]);
    persisted = normalizeDbRow(rows[0]);
  });

  return {
    ok: true,
    dbId: targetDbId,
    exportId: sourceExpId,
    fields,
    item: persisted,
    exportItem: expItem,
  };
}

/**
 * Cập nhật ngược lại 1 item từ Database vào file export/item_template.txt
 */
export async function updateExportItemFromDatabase(id) {
  const rows = await query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) throw new Error(`Không tìm thấy item #${id} trong database`);

  const dbItem = normalizeDbRow(rows[0]);
  const exportParsed = parseExportItemFile();
  if (!exportParsed.ok) throw new Error(exportParsed.error);

  const lines = fs.readFileSync(EXPORT_FILE_PATH, 'utf8').split(/\r?\n/);
  let updated = false;

  const header = 'id\tTYPE\tgender\tNAME\tdescription\tlevel\ticon_id\tpart\tis_up_to_up\tpower_require\tgold\tgem\thead\tbody\tleg';
  const newRowStr = [
    dbItem.id,
    dbItem.type ?? 0,
    dbItem.gender ?? 3,
    dbItem.NAME ?? '',
    dbItem.description ?? '',
    dbItem.level ?? 0,
    dbItem.icon_id ?? 0,
    dbItem.part ?? -1,
    Number(dbItem.is_up_to_up || 0) ? 1 : 0,
    dbItem.power_require ?? 0,
    dbItem.gold ?? 0,
    dbItem.gem ?? 0,
    dbItem.head ?? -1,
    dbItem.body ?? -1,
    dbItem.leg ?? -1,
  ].join('\t');

  const newLines = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    if (i === 0 && raw.toLowerCase().startsWith('id\t')) {
      newLines.push(header);
      continue;
    }
    const cols = raw.split('\t');
    if (Number(cols[0]) === id) {
      newLines.push(newRowStr);
      updated = true;
    } else {
      newLines.push(raw);
    }
  }

  if (!updated) {
    newLines.push(newRowStr);
  }

  fs.writeFileSync(EXPORT_FILE_PATH, newLines.join('\n') + '\n', 'utf8');
  return { ok: true, id, item: dbItem };
}

/**
 * Cập nhật trực tiếp Tên và Mô tả của 1 item (vào Database, file Export, hoặc cả hai)
 */
export async function updateItemNameAndDescription({ id, name, description, target = 'both' }) {
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum < 0) throw new Error('ID item không hợp lệ');

  const cleanName = String(name || '').trim();
  const cleanDesc = String(description ?? '').trim();
  if (!cleanName) throw new Error('Tên vật phẩm không được để trống');
  if (cleanName.length > 255) throw new Error('Tên vật phẩm tối đa 255 ký tự');
  if (cleanDesc.length > 75) throw new Error('Mô tả tối đa 75 ký tự theo schema game');

  let dbUpdated = false;
  let exportUpdated = false;
  let dbResult = null;
  let exportResult = null;

  // 1. Cập nhật vào MariaDB nếu target là 'db' hoặc 'both'
  if (target === 'db' || target === 'both') {
    const existing = await query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [idNum]);
    if (existing.length > 0) {
      await exec('UPDATE item_template SET NAME = ?, description = ? WHERE id = ?', [cleanName, cleanDesc, idNum]);
      const [updatedDb] = await query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [idNum]);
      dbResult = normalizeDbRow(updatedDb);
      dbUpdated = true;
    } else if (target === 'db') {
      throw new Error(`Không tìm thấy item #${idNum} trong MariaDB để sửa`);
    }
  }

  // 2. Cập nhật vào file export/item_template.txt nếu target là 'export' hoặc 'both'
  if (target === 'export' || target === 'both') {
    const exportParsed = parseExportItemFile();
    if (!exportParsed.ok) throw new Error(exportParsed.error);

    const lines = fs.readFileSync(EXPORT_FILE_PATH, 'utf8').split(/\r?\n/);
    const header = 'id\tTYPE\tgender\tNAME\tdescription\tlevel\ticon_id\tpart\tis_up_to_up\tpower_require\tgold\tgem\thead\tbody\tleg';
    let lineFound = false;

    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.trim()) continue;
      if (i === 0 && raw.toLowerCase().startsWith('id\t')) {
        newLines.push(header);
        continue;
      }
      const cols = raw.split('\t');
      if (Number(cols[0]) === idNum) {
        cols[3] = cleanName;
        cols[4] = cleanDesc;
        newLines.push(cols.join('\t'));
        lineFound = true;
        exportResult = {
          id: idNum,
          type: Number(cols[1] || 0),
          gender: Number(cols[2] || 3),
          NAME: cleanName,
          name: cleanName,
          description: cleanDesc,
          level: Number(cols[5] || 0),
          icon_id: Number(cols[6] || 0),
          part: Number(cols[7] ?? -1),
          is_up_to_up: Number(cols[8] || 0) ? 1 : 0,
          power_require: Number(cols[9] || 0),
          gold: Number(cols[10] || 0),
          gem: Number(cols[11] || 0),
          head: Number(cols[12] ?? -1),
          body: Number(cols[13] ?? -1),
          leg: Number(cols[14] ?? -1),
        };
      } else {
        newLines.push(raw);
      }
    }

    if (!lineFound) {
      if (dbResult) {
        const newRowStr = [
          idNum,
          dbResult.type ?? 0,
          dbResult.gender ?? 3,
          cleanName,
          cleanDesc,
          dbResult.level ?? 0,
          dbResult.icon_id ?? 0,
          dbResult.part ?? -1,
          Number(dbResult.is_up_to_up || 0) ? 1 : 0,
          dbResult.power_require ?? 0,
          dbResult.gold ?? 0,
          dbResult.gem ?? 0,
          dbResult.head ?? -1,
          dbResult.body ?? -1,
          dbResult.leg ?? -1,
        ].join('\t');
        newLines.push(newRowStr);
        lineFound = true;
        exportResult = { ...dbResult, NAME: cleanName, name: cleanName, description: cleanDesc };
      }
    }

    fs.writeFileSync(EXPORT_FILE_PATH, newLines.join('\n') + '\n', 'utf8');
    exportUpdated = true;
  }

  return {
    ok: true,
    id: idNum,
    name: cleanName,
    description: cleanDesc,
    target,
    dbUpdated,
    exportUpdated,
    dbItem: dbResult,
    exportItem: exportResult,
  };
}

/**
 * Đồng bộ toàn bộ hoặc danh sách ID từ Export sang Database (kèm Part và Head Avatar)
 */
export async function syncBatchFromExport(targetIds = null, options = {}) {
  const exportParsed = parseExportItemFile();
  if (!exportParsed.ok) throw new Error(exportParsed.error);

  let itemsToSync = exportParsed.items;
  if (Array.isArray(targetIds) && targetIds.length > 0) {
    const idSet = new Set(targetIds.map(Number));
    itemsToSync = itemsToSync.filter((it) => idSet.has(it.id));
  }

  if (itemsToSync.length === 0) {
    return { updated: 0, inserted: 0, total: 0, partSynced: 0, avatarSynced: 0 };
  }

  let updated = 0;
  let inserted = 0;
  let partStats = { partSynced: 0, avatarSynced: 0 };

  const syncTemplate = options.syncTemplate !== false;
  const syncParts = options.syncParts !== false;
  const syncHeadAvatar = options.syncHeadAvatar !== false;

  await withTransaction(async (conn) => {
    if (syncTemplate) {
      for (const expItem of itemsToSync) {
        const [existing] = await conn.query('SELECT id, part FROM item_template WHERE id = ? LIMIT 1', [expItem.id]);
        if (existing.length > 0) {
          // Tuyệt đối giữ nguyên cột part hiện có trong DB
          const currentPart = existing[0].part;
          await conn.execute(
            `UPDATE item_template
             SET type=?, gender=?, NAME=?, description=?, level=?, icon_id=?, part=?,
                 is_up_to_up=?, power_require=?, gold=?, gem=?, head=?, body=?, leg=?
             WHERE id=?`,
            [
              expItem.type, expItem.gender, expItem.NAME, expItem.description, expItem.level,
              expItem.icon_id, currentPart, expItem.is_up_to_up, expItem.power_require,
              expItem.gold, expItem.gem, expItem.head, expItem.body, expItem.leg, expItem.id,
            ]
          );
          updated++;
        } else {
          // Với item mới: tuyệt đối không lấy part từ export, mặc định -1
          await conn.execute(
            `INSERT INTO item_template
             (id, type, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              expItem.id, expItem.type, expItem.gender, expItem.NAME, expItem.description, expItem.level,
              expItem.icon_id, -1, expItem.is_up_to_up, expItem.power_require,
              expItem.gold, expItem.gem, expItem.head, expItem.body, expItem.leg,
            ]
          );
          inserted++;
        }
      }
    }

    // Tuyệt đối không can thiệp vào bảng part và head_avatar khi nạp item
    // Bỏ qua syncPartsAndHeadAvatarForItems
  });

  return {
    updated,
    inserted,
    total: itemsToSync.length,
    partSynced: partStats.partSynced,
    avatarSynced: partStats.avatarSynced,
  };
}

/**
 * Xuất toàn bộ bảng item_template từ Database ra file export/item_template.txt
 */
export async function exportDatabaseToFile(customPath = EXPORT_FILE_PATH) {
  const rows = await query(
    `SELECT id, type, gender, NAME, description, level, icon_id, part, is_up_to_up,
            power_require, gold, gem, head, body, leg
     FROM item_template
     ORDER BY id ASC`
  );

  const dir = path.dirname(customPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(customPath)) {
    const backupPath = `${customPath}.bak_${Date.now()}`;
    fs.copyFileSync(customPath, backupPath);
  }

  const header = 'id\tTYPE\tgender\tNAME\tdescription\tlevel\ticon_id\tpart\tis_up_to_up\tpower_require\tgold\tgem\thead\tbody\tleg';
  const lines = [header];

  for (const r of rows) {
    const isUp = Number(r.is_up_to_up || 0) ? 1 : 0;
    const line = [
      r.id,
      r.type ?? 0,
      r.gender ?? 3,
      r.NAME ?? '',
      r.description ?? '',
      r.level ?? 0,
      r.icon_id ?? 0,
      r.part ?? -1,
      isUp,
      r.power_require ?? 0,
      r.gold ?? 0,
      r.gem ?? 0,
      r.head ?? -1,
      r.body ?? -1,
      r.leg ?? -1,
    ].join('\t');
    lines.push(line);
  }

  fs.writeFileSync(customPath, lines.join('\n') + '\n', 'utf8');

  return {
    ok: true,
    totalItems: rows.length,
    filePath: customPath,
  };
}

/**
 * Tự động tìm và nạp tất cả các ô ID trống trong Database từ dữ liệu của file export/item_template.txt
 */
export async function fillEmptySlotsFromExport({ ids = null, serverId = null } = {}) {
  const result = await compareDatabaseWithExport();
  if (!result.ok) throw new Error(result.error);

  const emptyItemsToFill = result.comparison.filter(
    (c) => c.canFillFromExport && (ids === null || ids.includes(c.id))
  );

  if (emptyItemsToFill.length === 0) {
    return { ok: true, filledCount: 0, message: 'Không có ô item trống nào cần nạp từ Export.' };
  }

  const exportItemIds = emptyItemsToFill.map((c) => c.id);
  const syncResult = await syncBatchFromExport(exportItemIds);

  return {
    ok: true,
    filledCount: emptyItemsToFill.length,
    syncResult,
    filledItems: emptyItemsToFill.map((c) => ({
      id: c.id,
      name: c.exportItem?.NAME,
      icon_id: c.exportItem?.icon_id,
      type: c.exportItem?.type,
    })),
  };
}

/**
 * Xóa một item khỏi MariaDB Thực Tế, đồng thời tự động xóa các Part ID và Head Avatar liên kết
 */
export async function deleteItemAndAssociatedData({ id, deleteParts = true, deleteHeadAvatar = true, force = false }) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 0) {
    throw new Error('ID item không hợp lệ');
  }

  const rows = await query('SELECT * FROM item_template WHERE id = ? LIMIT 1', [numId]);
  if (!rows.length) {
    throw new Error(`Item #${numId} không tồn tại trong MariaDB`);
  }
  const item = rows[0];

  // 1. Thu thập danh sách Part IDs của item này
  const itemPartIds = new Set();
  if (item.part != null && Number(item.part) >= 0) itemPartIds.add(Number(item.part));
  if (item.head != null && Number(item.head) >= 0) itemPartIds.add(Number(item.head));
  if (item.body != null && Number(item.body) >= 0) itemPartIds.add(Number(item.body));
  if (item.leg != null && Number(item.leg) >= 0) itemPartIds.add(Number(item.leg));

  // 2. Thu thập danh sách Head IDs cho head_avatar
  const itemHeadIds = new Set();
  if (item.head != null && Number(item.head) >= 0) itemHeadIds.add(Number(item.head));
  if (item.part != null && Number(item.part) >= 0) itemHeadIds.add(Number(item.part));

  // 3. Kiểm tra xem các Part/Head này có đang được dùng bởi item KHÁC trong item_template không
  let partsToDelete = Array.from(itemPartIds);
  let headAvatarsToDelete = Array.from(itemHeadIds);
  const partsKeptDueToSharing = [];
  const headAvatarsKeptDueToSharing = [];

  if (!force && (partsToDelete.length > 0 || headAvatarsToDelete.length > 0)) {
    const otherItems = await query(
      `SELECT id, NAME, part, head, body, leg FROM item_template WHERE id != ?`,
      [numId]
    );

    const usedPartsInOther = new Set();
    const usedHeadsInOther = new Set();
    for (const other of otherItems) {
      if (other.part != null && other.part >= 0) usedPartsInOther.add(Number(other.part));
      if (other.head != null && other.head >= 0) {
        usedPartsInOther.add(Number(other.head));
        usedHeadsInOther.add(Number(other.head));
      }
      if (other.body != null && other.body >= 0) usedPartsInOther.add(Number(other.body));
      if (other.leg != null && other.leg >= 0) usedPartsInOther.add(Number(other.leg));
    }

    // Lọc part an toàn
    const safeParts = [];
    for (const pid of partsToDelete) {
      if (usedPartsInOther.has(pid)) {
        partsKeptDueToSharing.push(pid);
      } else {
        safeParts.push(pid);
      }
    }
    partsToDelete = safeParts;

    // Lọc head_avatar an toàn
    const safeHeads = [];
    for (const hid of headAvatarsToDelete) {
      if (usedHeadsInOther.has(hid)) {
        headAvatarsKeptDueToSharing.push(hid);
      } else {
        safeHeads.push(hid);
      }
    }
    headAvatarsToDelete = safeHeads;
  }

  let deletedPartsCount = 0;
  let deletedHeadAvatarsCount = 0;

  await withTransaction(async (conn) => {
    // 1. Reset bản ghi trong item_template về ô ID trống (TYPE 75, gender 3, part -1...) để bảo toàn chuỗi ID liên tục
    await conn.execute(
      `INSERT INTO item_template (id, TYPE, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
       VALUES (?, 75, 3, '', '', 0, 0, -1, 0, 0, 0, 0, -1, -1, -1)
       ON DUPLICATE KEY UPDATE TYPE = 75, gender = 3, NAME = '', description = '', level = 0, icon_id = 0, part = -1, is_up_to_up = 0, power_require = 0, gold = 0, gem = 0, head = -1, body = -1, leg = -1`,
      [numId]
    );

    // 2. Xóa các Part liên kết trong bảng part (nếu bật deleteParts)
    if (deleteParts && partsToDelete.length > 0) {
      const placeholders = partsToDelete.map(() => '?').join(',');
      const [res] = await conn.query(`DELETE FROM part WHERE id IN (${placeholders})`, partsToDelete);
      deletedPartsCount = res?.affectedRows || partsToDelete.length;
    }

    // 3. Xóa các Head Avatar liên kết trong bảng head_avatar (nếu bật deleteHeadAvatar)
    if (deleteHeadAvatar && headAvatarsToDelete.length > 0) {
      const placeholders = headAvatarsToDelete.map(() => '?').join(',');
      const [res] = await conn.query(`DELETE FROM head_avatar WHERE head_id IN (${placeholders})`, headAvatarsToDelete);
      deletedHeadAvatarsCount = res?.affectedRows || headAvatarsToDelete.length;
    }

    // 4. Đồng bộ lại file nhị phân data/update_data/part nếu có xóa part
    if (deleteParts && deletedPartsCount > 0) {
      await syncUpdateDataPartBinaryFile(conn);
    }
  });

  // Xóa cache trong bộ nhớ
  cachedDbPartsMap = null;
  cachedDbHeadAvatarMap = null;

  return {
    ok: true,
    deletedItem: {
      id: item.id,
      name: item.NAME,
      icon_id: item.icon_id,
      part: item.part,
      head: item.head,
      body: item.body,
      leg: item.leg,
    },
    deletedParts: partsToDelete,
    deletedPartsCount,
    deletedHeadAvatars: headAvatarsToDelete,
    deletedHeadAvatarsCount,
    partsKeptDueToSharing,
    headAvatarsKeptDueToSharing,
  };
}

/**
 * Xóa hàng loạt item khỏi MariaDB Thực Tế, đồng thời tự động xóa các Part ID và Head Avatar liên kết
 */
export async function deleteBatchItemsAndAssociatedData({ ids, deleteParts = true, deleteHeadAvatar = true, force = false }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Danh sách ID xóa không hợp lệ hoặc rỗng');
  }
  const numIds = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n >= 0))];
  if (numIds.length === 0) {
    throw new Error('Không có ID hợp lệ để xóa');
  }

  const placeholders = numIds.map(() => '?').join(',');
  const items = await query(`SELECT * FROM item_template WHERE id IN (${placeholders})`, numIds);
  if (!items.length) {
    throw new Error(`Không tìm thấy item nào trong MariaDB với danh sách ID đã chọn`);
  }

  // 1. Thu thập danh sách Part IDs & Head IDs của TẤT CẢ các item cần xóa
  const itemPartIds = new Set();
  const itemHeadIds = new Set();

  for (const item of items) {
    if (item.part != null && Number(item.part) >= 0) itemPartIds.add(Number(item.part));
    if (item.head != null && Number(item.head) >= 0) {
      itemPartIds.add(Number(item.head));
      itemHeadIds.add(Number(item.head));
    }
    if (item.body != null && Number(item.body) >= 0) itemPartIds.add(Number(item.body));
    if (item.leg != null && Number(item.leg) >= 0) itemPartIds.add(Number(item.leg));
    if (item.part != null && Number(item.part) >= 0) itemHeadIds.add(Number(item.part));
  }

  let partsToDelete = Array.from(itemPartIds);
  let headAvatarsToDelete = Array.from(itemHeadIds);
  const partsKeptDueToSharing = [];
  const headAvatarsKeptDueToSharing = [];

  // 2. Kiểm tra xem các Part/Head này có đang được dùng bởi các item CÒN LẠI (không nằm trong danh sách xóa) không
  if (!force && (partsToDelete.length > 0 || headAvatarsToDelete.length > 0)) {
    const otherItems = await query(
      `SELECT id, NAME, part, head, body, leg FROM item_template WHERE id NOT IN (${placeholders})`,
      numIds
    );

    const usedPartsInOther = new Set();
    const usedHeadsInOther = new Set();
    for (const other of otherItems) {
      if (other.part != null && other.part >= 0) usedPartsInOther.add(Number(other.part));
      if (other.head != null && other.head >= 0) {
        usedPartsInOther.add(Number(other.head));
        usedHeadsInOther.add(Number(other.head));
      }
      if (other.body != null && other.body >= 0) usedPartsInOther.add(Number(other.body));
      if (other.leg != null && other.leg >= 0) usedPartsInOther.add(Number(other.leg));
    }

    // Safe parts
    const safeParts = [];
    for (const pid of partsToDelete) {
      if (usedPartsInOther.has(pid)) {
        partsKeptDueToSharing.push(pid);
      } else {
        safeParts.push(pid);
      }
    }
    partsToDelete = safeParts;

    // Safe head avatars
    const safeHeads = [];
    for (const hid of headAvatarsToDelete) {
      if (usedHeadsInOther.has(hid)) {
        headAvatarsKeptDueToSharing.push(hid);
      } else {
        safeHeads.push(hid);
      }
    }
    headAvatarsToDelete = safeHeads;
  }

  let deletedItemsCount = 0;
  let deletedPartsCount = 0;
  let deletedHeadAvatarsCount = 0;

  await withTransaction(async (conn) => {
    // 1. Reset các bản ghi trong item_template về ô ID trống (TYPE 75, gender 3, part -1...) để bảo toàn chuỗi ID liên tục
    for (const id of numIds) {
      await conn.execute(
        `INSERT INTO item_template (id, TYPE, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
         VALUES (?, 75, 3, '', '', 0, 0, -1, 0, 0, 0, 0, -1, -1, -1)
         ON DUPLICATE KEY UPDATE TYPE = 75, gender = 3, NAME = '', description = '', level = 0, icon_id = 0, part = -1, is_up_to_up = 0, power_require = 0, gold = 0, gem = 0, head = -1, body = -1, leg = -1`,
        [id]
      );
    }
    deletedItemsCount = numIds.length;

    // 2. Xóa trong part
    if (deleteParts && partsToDelete.length > 0) {
      const pPlaceholders = partsToDelete.map(() => '?').join(',');
      const [resParts] = await conn.query(`DELETE FROM part WHERE id IN (${pPlaceholders})`, partsToDelete);
      deletedPartsCount = resParts?.affectedRows || partsToDelete.length;
    }

    // 3. Xóa trong head_avatar
    if (deleteHeadAvatar && headAvatarsToDelete.length > 0) {
      const hPlaceholders = headAvatarsToDelete.map(() => '?').join(',');
      const [resHeads] = await conn.query(`DELETE FROM head_avatar WHERE head_id IN (${hPlaceholders})`, headAvatarsToDelete);
      deletedHeadAvatarsCount = resHeads?.affectedRows || headAvatarsToDelete.length;
    }

    // 4. Đồng bộ binary file part nếu có xóa part
    if (deleteParts && deletedPartsCount > 0) {
      await syncUpdateDataPartBinaryFile(conn);
    }
  });

  cachedDbPartsMap = null;
  cachedDbHeadAvatarMap = null;

  return {
    ok: true,
    deletedItemIds: numIds,
    deletedItemsCount,
    deletedItems: items.map((i) => ({ id: i.id, name: i.NAME, icon_id: i.icon_id })),
    deletedParts: partsToDelete,
    deletedPartsCount,
    deletedHeadAvatars: headAvatarsToDelete,
    deletedHeadAvatarsCount,
    partsKeptDueToSharing,
    headAvatarsKeptDueToSharing,
  };
}

/**
 * Tự động bù tất cả các ô ID bị trống/bị khuyết (gap) trong dải ID từ 0 đến MAX ID vào bảng item_template
 */
export async function repairMissingItemGaps() {
  const [maxRow] = await query('SELECT COALESCE(MAX(id), 0) AS max_id FROM item_template');
  const maxId = Math.max(Number(maxRow?.max_id || 0), 2085);
  const rows = await query('SELECT id FROM item_template');
  const existingSet = new Set(rows.map((r) => Number(r.id)));
  const missingIds = [];
  for (let i = 0; i <= maxId; i++) {
    if (!existingSet.has(i)) {
      missingIds.push(i);
    }
  }

  if (missingIds.length > 0) {
    await withTransaction(async (conn) => {
      for (const id of missingIds) {
        await conn.execute(
          `INSERT INTO item_template (id, TYPE, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
           VALUES (?, 75, 3, '', '', 0, 0, -1, 0, 0, 0, 0, -1, -1, -1)
           ON DUPLICATE KEY UPDATE TYPE = 75`,
          [id]
        );
      }
    });
  }

  return {
    ok: true,
    restoredCount: missingIds.length,
    restoredIds: missingIds,
  };
}

/**
 * Lấy danh sách toàn bộ các Part ID từ cả MariaDB và Export (phân loại Đầu, Thân, Chân, kèm Icon và Frame)
 */
export async function getAllPartsCatalog() {
  const dbMap = await loadDbPartsMap();
  const expMap = loadExportPartsFullMap();
  const expAvatars = loadExportHeadAvatarsMap();
  const dbAvatars = await loadDbHeadAvatarsMap();

  const allKeys = new Set([...dbMap.keys(), ...expMap.keys()]);
  const partsList = [];

  for (const key of allKeys) {
    if (!key.includes('_')) continue;
    const [idStr, typeStr] = key.split('_');
    const id = Number(idStr);
    const type = Number(typeStr);
    if (!Number.isFinite(id) || !Number.isFinite(type)) continue;

    const dbPart = dbMap.get(key);
    const expPart = expMap.get(key);
    const mainIcon = expPart?.mainIcon || dbPart?.mainIcon || null;
    const frames = expPart?.frames || dbPart?.frames || [];
    const avatarId = expAvatars.get(id) ?? dbAvatars.get(id) ?? null;

    let source = 'both';
    if (dbPart && !expPart) source = 'db';
    else if (!dbPart && expPart) source = 'export';

    partsList.push({
      id,
      type,
      typeName: type === 0 ? 'Đầu (Head)' : type === 1 ? 'Thân (Body)' : type === 2 ? 'Chân (Leg)' : `Part ${type}`,
      typeIcon: type === 0 ? '🧢' : type === 1 ? '🥋' : type === 2 ? '👖' : '🧩',
      mainIcon,
      frames,
      avatarId: type === 0 ? avatarId : null,
      source,
    });
  }

  partsList.sort((a, b) => a.id - b.id || a.type - b.type);
  return partsList;
}

/**
 * Lấy danh sách toàn bộ Head Avatar từ cả MariaDB và Export
 */
export async function getAllHeadAvatarsCatalog() {
  const expAvatars = loadExportHeadAvatarsMap();
  const dbAvatars = await loadDbHeadAvatarsMap();
  const partsMap = loadPartsMap();

  const allHeadIds = new Set([...expAvatars.keys(), ...dbAvatars.keys()]);
  const list = [];

  for (const headId of allHeadIds) {
    const expAvatarId = expAvatars.get(headId);
    const dbAvatarId = dbAvatars.get(headId);
    const avatarId = expAvatarId ?? dbAvatarId;

    const headPart = partsMap.get(`${headId}_0`) || partsMap.get(String(headId));
    const headMainIcon = headPart?.mainIcon || null;

    let source = 'both';
    if (dbAvatarId !== undefined && expAvatarId === undefined) source = 'db';
    else if (dbAvatarId === undefined && expAvatarId !== undefined) source = 'export';

    list.push({
      headId: Number(headId),
      avatarId: Number(avatarId),
      dbAvatarId: dbAvatarId !== undefined ? Number(dbAvatarId) : null,
      expAvatarId: expAvatarId !== undefined ? Number(expAvatarId) : null,
      headMainIcon,
      source,
    });
  }

  list.sort((a, b) => a.headId - b.headId);
  return list;
}

/**
 * Nạp danh sách item từ Export vào MariaDB với dải ID Database chỉ định hoặc mappings cụ thể
 * @param {Array<{exportId: number, dbId: number}>} mappings
 * @param {Object} options
 */
export async function importExportItemsToDbCustomIds(mappings = [], options = {}) {
  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new Error('Danh sách vật phẩm nạp vào database không được để trống');
  }

  const exportParsed = parseExportItemFile();
  if (!exportParsed.ok) throw new Error(exportParsed.error);

  const expMap = new Map();
  for (const it of exportParsed.items) {
    expMap.set(it.id, it);
  }

  let updated = 0;
  let inserted = 0;
  const processedItems = [];

  await withTransaction(async (conn) => {
    for (const mapping of mappings) {
      const exportId = Number(mapping.exportId);
      const targetDbId = Number(mapping.dbId);

      if (!Number.isInteger(exportId) || exportId < 0) continue;
      if (!Number.isInteger(targetDbId) || targetDbId < 0) continue;

      const expItem = expMap.get(exportId);
      if (!expItem) {
        throw new Error(`Không tìm thấy item export #${exportId} trong file export/item_template.txt`);
      }

      const [existing] = await conn.query('SELECT id, part FROM item_template WHERE id = ? LIMIT 1', [targetDbId]);
      if (existing.length > 0) {
        // Cập nhật bản ghi hiện tại: tuyệt đối giữ nguyên cột part hiện có trong DB
        const currentPart = existing[0].part;
        await conn.execute(
          `UPDATE item_template
           SET type=?, gender=?, NAME=?, description=?, level=?, icon_id=?, part=?,
               is_up_to_up=?, power_require=?, gold=?, gem=?, head=?, body=?, leg=?
           WHERE id=?`,
          [
            expItem.type,
            expItem.gender,
            expItem.NAME,
            expItem.description || '',
            expItem.level,
            expItem.icon_id,
            currentPart,
            expItem.is_up_to_up,
            expItem.power_require,
            expItem.gold,
            expItem.gem,
            expItem.head,
            expItem.body,
            expItem.leg,
            targetDbId,
          ]
        );
        updated++;
      } else {
        // Thêm bản ghi mới: part mặc định -1
        await conn.execute(
          `INSERT INTO item_template
           (id, type, gender, NAME, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            targetDbId,
            expItem.type,
            expItem.gender,
            expItem.NAME,
            expItem.description || '',
            expItem.level,
            expItem.icon_id,
            -1,
            expItem.is_up_to_up,
            expItem.power_require,
            expItem.gold,
            expItem.gem,
            expItem.head,
            expItem.body,
            expItem.leg,
          ]
        );
        inserted++;
      }

      processedItems.push({
        exportId,
        dbId: targetDbId,
        name: expItem.NAME,
        iconId: expItem.icon_id,
        isNew: existing.length === 0,
      });
    }
  });

  return {
    ok: true,
    total: processedItems.length,
    updated,
    inserted,
    items: processedItems,
  };
}


