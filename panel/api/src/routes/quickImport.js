import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec, withTransaction } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GAME_ROOT = path.resolve(__dirname, '../../../..');

export async function syncUpdateDataPartFile(conn) {
  try {
    const partFilePath = path.resolve(GAME_ROOT, 'data/update_data/part');
    const [rows] = await conn.query('SELECT id, type, data FROM part ORDER BY id ASC, type ASC');
    if (!rows || rows.length === 0) return false;

    const chunks = [];
    const countBuf = Buffer.alloc(2);
    countBuf.writeInt16BE(rows.length, 0);
    chunks.push(countBuf);

    for (const r of rows) {
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
    console.error('Failed to sync data/update_data/part:', e);
    return false;
  }
}

const router = Router();
router.use(authMiddleware);

/**
 * Helper to split a line by tab or comma (unless enclosed in quotes or brackets)
 */
function splitTokens(rawLine) {
  const line = rawLine.trim();
  if (!line) return [];

  // If contains tabs, tab is highest priority delimiter
  if (line.includes('\t')) {
    return line.split('\t').map((s) => s.trim());
  }

  // Check if it's SQL INSERT syntax
  const sqlMatch = line.match(/VALUES\s*\((.*)\)/i);
  if (sqlMatch) {
    const inside = sqlMatch[1];
    const tokens = [];
    let cur = '';
    let inQuote = false;
    let quoteChar = '';
    let bracketDepth = 0;
    for (let i = 0; i < inside.length; i++) {
      const c = inside[i];
      if ((c === "'" || c === '"') && bracketDepth === 0) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = c;
        } else if (quoteChar === c) {
          inQuote = false;
        } else {
          cur += c;
        }
      } else if (c === '[' && !inQuote) {
        bracketDepth++;
        cur += c;
      } else if (c === ']' && !inQuote) {
        bracketDepth--;
        cur += c;
      } else if (c === ',' && !inQuote && bracketDepth === 0) {
        tokens.push(cur.trim().replace(/^['"]|['"]$/g, ''));
        cur = '';
      } else {
        cur += c;
      }
    }
    if (cur.trim()) tokens.push(cur.trim().replace(/^['"]|['"]$/g, ''));
    return tokens;
  }

  // Tokenize preserving JSON arrays [...] or quoted strings
  const tokens = [];
  let cur = '';
  let inQuote = false;
  let quoteChar = '';
  let bracketDepth = 0;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' || c === "'") {
      if (!inQuote) {
        inQuote = true;
        quoteChar = c;
      } else if (quoteChar === c) {
        inQuote = false;
      } else {
        cur += c;
      }
    } else if (c === '[' && !inQuote) {
      bracketDepth++;
      cur += c;
    } else if (c === ']' && !inQuote) {
      bracketDepth--;
      cur += c;
    } else if ((c === ',' || c === ' ' || c === '\t') && !inQuote && bracketDepth === 0) {
      if (cur.trim()) {
        tokens.push(cur.trim().replace(/^['"]|['"]$/g, ''));
        cur = '';
      }
    } else {
      cur += c;
    }
  }
  if (cur.trim()) tokens.push(cur.trim().replace(/^['"]|['"]$/g, ''));

  return tokens;
}

/**
 * Normalize and parse Part JSON data
 */
function normalizePartData(raw) {
  if (!raw) return '[]';
  let str = String(raw).trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed);
    }
  } catch {
    const unescaped = str.replace(/\\"/g, '"');
    try {
      const parsed = JSON.parse(unescaped);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      // Fallback
    }
  }
  return str;
}

/**
 * Parse an item_template line
 */
function parseItemTemplateTokens(tokens) {
  if (tokens.length < 13) return null;
  const id = Number(tokens[0]);
  const type = Number(tokens[1]);
  const gender = Number(tokens[2]);
  const name = String(tokens[3] || '').trim();
  const description = String(tokens[4] || '').trim();
  const level = Number(tokens[5]);
  const icon_id = Number(tokens[6]);
  const part = Number(tokens[7]);
  const is_up_to_up = Number(tokens[8]) ? 1 : 0;
  const power_require = Number(tokens[9]);
  const gold = Number(tokens[10]);
  const gem = Number(tokens[11]);
  const head = Number(tokens[12]);
  const body = tokens.length >= 14 ? Number(tokens[13]) : -1;
  const leg = tokens.length >= 15 ? Number(tokens[14]) : -1;

  if (Number.isNaN(id) || !name) return null;

  return {
    id,
    type: Number.isNaN(type) ? 0 : type,
    gender: Number.isNaN(gender) ? 3 : gender,
    name,
    description,
    level: Number.isNaN(level) ? 0 : level,
    icon_id: Number.isNaN(icon_id) ? 0 : icon_id,
    part: Number.isNaN(part) ? -1 : part,
    is_up_to_up,
    power_require: Number.isNaN(power_require) ? 0 : power_require,
    gold: Number.isNaN(gold) ? 0 : gold,
    gem: Number.isNaN(gem) ? 0 : gem,
    head: Number.isNaN(head) ? -1 : head,
    body: Number.isNaN(body) ? -1 : body,
    leg: Number.isNaN(leg) ? -1 : leg,
  };
}

/**
 * Parse a part line: id, type (0=Head, 1=Body, 2=Leg), data ([[icon,dx,dy],...])
 */
function parsePartTokens(tokens, rawLine = '') {
  if (tokens.length >= 3) {
    const id = Number(tokens[0]);
    const type = Number(tokens[1]);
    if (!Number.isNaN(id) && !Number.isNaN(type) && [0, 1, 2, 3, 4, 5].includes(type)) {
      const dataRaw = tokens.slice(2).join(' ').trim();
      if (dataRaw.startsWith('[') && dataRaw.endsWith(']')) {
        return { id, type, data: normalizePartData(dataRaw) };
      }
    }
  }

  const partMatch = rawLine.trim().match(/^(\d+)[\s\t,]+([0-5])[\s\t,]+(\[.+\])$/);
  if (partMatch) {
    return {
      id: Number(partMatch[1]),
      type: Number(partMatch[2]),
      data: normalizePartData(partMatch[3]),
    };
  }

  return null;
}

/**
 * Parse head_avatar: head_id, avatar_id
 */
function parseHeadAvatarTokens(tokens) {
  if (tokens.length === 2) {
    const head_id = Number(tokens[0]);
    const avatar_id = Number(tokens[1]);
    if (!Number.isNaN(head_id) && !Number.isNaN(avatar_id) && head_id >= 0 && avatar_id >= 0) {
      return { head_id, avatar_id };
    }
  }
  return null;
}

/**
 * Parse flag_bag: id, icon_data, name, gold, gem, icon_id
 */
function parseFlagBagTokens(tokens) {
  if (tokens.length >= 6) {
    const id = Number(tokens[0]);
    const icon_data = String(tokens[1] || '').trim();
    const name = String(tokens[2] || '').trim();
    const gold = Number(tokens[3]);
    const gem = Number(tokens[4]);
    const icon_id = Number(tokens[5]);

    if (!Number.isNaN(id) && name) {
      return {
        id,
        icon_data,
        name,
        gold: Number.isNaN(gold) ? 0 : gold,
        gem: Number.isNaN(gem) ? 0 : gem,
        icon_id: Number.isNaN(icon_id) ? 0 : icon_id,
      };
    }
  }
  return null;
}

/**
 * Smart universal parser for multi-block or mixed text
 */
function parseMultiContent(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result = {
    items: [],
    parts: [],
    headAvatars: [],
    flagBags: [],
    unrecognized: [],
  };

  let activeSection = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    const lower = line.toLowerCase();
    if (lower.startsWith('---') || lower.startsWith('###') || lower.startsWith('//') || lower.startsWith('--')) {
      if (lower.includes('item_template') || lower.includes('item')) {
        activeSection = 'item_template';
        continue;
      }
      if (lower.includes('head_avatar') || lower.includes('avatar')) {
        activeSection = 'head_avatar';
        continue;
      }
      if (lower.includes('flag_bag') || lower.includes('flag')) {
        activeSection = 'flag_bag';
        continue;
      }
      if (lower.includes('part')) {
        activeSection = 'part';
        continue;
      }
    }

    if (lower.startsWith('item_template:') || lower.startsWith('[item_template]')) {
      activeSection = 'item_template';
      const rem = line.substring(line.indexOf(':') + 1).trim();
      if (!rem) continue;
    } else if (lower.startsWith('part:') || lower.startsWith('[part]')) {
      activeSection = 'part';
      const rem = line.substring(line.indexOf(':') + 1).trim();
      if (!rem) continue;
    } else if (lower.startsWith('head_avatar:') || lower.startsWith('[head_avatar]')) {
      activeSection = 'head_avatar';
      const rem = line.substring(line.indexOf(':') + 1).trim();
      if (!rem) continue;
    } else if (lower.startsWith('flag_bag:') || lower.startsWith('[flag_bag]')) {
      activeSection = 'flag_bag';
      const rem = line.substring(line.indexOf(':') + 1).trim();
      if (!rem) continue;
    }

    const tokens = splitTokens(line);

    // 1. Check Part first if it has array structure [[...]]
    const partObj = parsePartTokens(tokens, line);
    if (partObj && (activeSection === 'part' || activeSection === null || tokens.length <= 4)) {
      result.parts.push(partObj);
      continue;
    }

    // 2. Check Item Template (typically >= 13 tokens)
    if (tokens.length >= 13) {
      const itemObj = parseItemTemplateTokens(tokens);
      if (itemObj) {
        result.items.push(itemObj);
        continue;
      }
    }

    // 3. Check Head Avatar (2 numbers)
    if (tokens.length === 2 && (activeSection === 'head_avatar' || activeSection === null)) {
      const haObj = parseHeadAvatarTokens(tokens);
      if (haObj) {
        result.headAvatars.push(haObj);
        continue;
      }
    }

    // 4. Check Flag Bag
    if (tokens.length >= 6 && (activeSection === 'flag_bag' || activeSection === null)) {
      const fbObj = parseFlagBagTokens(tokens);
      if (fbObj) {
        result.flagBags.push(fbObj);
        continue;
      }
    }

    // Explicit section fallbacks
    if (activeSection === 'item_template') {
      const itemObj = parseItemTemplateTokens(tokens);
      if (itemObj) {
        result.items.push(itemObj);
        continue;
      }
    } else if (activeSection === 'part') {
      if (partObj) {
        result.parts.push(partObj);
        continue;
      }
    } else if (activeSection === 'head_avatar') {
      const haObj = parseHeadAvatarTokens(tokens);
      if (haObj) {
        result.headAvatars.push(haObj);
        continue;
      }
    } else if (activeSection === 'flag_bag') {
      const fbObj = parseFlagBagTokens(tokens);
      if (fbObj) {
        result.flagBags.push(fbObj);
        continue;
      }
    }

    result.unrecognized.push({ lineIndex: idx + 1, raw: line });
  }

  return result;
}

/**
 * GET /api/v1/quick-import/stats
 */
/**
 * Helper to compute next available IDs across all tables
 */
async function computeNextIds(conn = null) {
  const runner = conn ? (sql, params) => conn.execute(sql, params).then(([rows]) => rows) : query;
  const [itemStats] = await runner('SELECT COUNT(*) AS total, COALESCE(MAX(id), -1) AS max_id FROM item_template');
  const [partStats] = await runner('SELECT COUNT(*) AS total, COALESCE(MAX(id), -1) AS max_id FROM part');
  const [haStats] = await runner('SELECT COUNT(*) AS total, COALESCE(MAX(head_id), -1) AS max_head_id FROM head_avatar');
  const [fbStats] = await runner('SELECT COUNT(*) AS total, COALESCE(MAX(id), -1) AS max_id FROM flag_bag');

  return {
    item_template: {
      total: Number(itemStats.total || 0),
      maxId: Number(itemStats.max_id ?? -1),
      nextId: Number(itemStats.max_id ?? -1) + 1,
    },
    part: {
      total: Number(partStats.total || 0),
      maxId: Number(partStats.max_id ?? -1),
      nextId: Number(partStats.max_id ?? -1) + 1,
    },
    head_avatar: {
      total: Number(haStats.total || 0),
      maxHeadId: Number(haStats.max_head_id ?? -1),
      nextHeadId: Number(haStats.max_head_id ?? -1) + 1,
    },
    flag_bag: {
      total: Number(fbStats.total || 0),
      maxId: Number(fbStats.max_id ?? -1),
      nextId: Number(fbStats.max_id ?? -1) + 1,
    },
  };
}

/**
 * Perform smart remapping of conflicting IDs to next available IDs
 */
function buildRemappedData(parsed, itemMap, partMap, haMap, fbMap, nextIds) {
  let curItemId = nextIds.item_template.nextId;
  let curPartId = nextIds.part.nextId;
  let curHaHeadId = nextIds.head_avatar.nextHeadId;
  let curFbId = nextIds.flag_bag.nextId;

  const partIdMap = new Map(); // oldPartId -> newPartId
  const itemIdMap = new Map(); // oldItemId -> newItemId

  // Remap parts that conflict or when linked parts have conflicts
  const parts = parsed.parts.map((p) => {
    const isConflict = partMap.has(p.id);
    let targetId = p.id;
    if (isConflict) {
      if (!partIdMap.has(p.id)) {
        partIdMap.set(p.id, curPartId++);
      }
      targetId = partIdMap.get(p.id);
    }
    return {
      ...p,
      originalId: p.id,
      id: targetId,
      wasRemapped: targetId !== p.id,
      exists: isConflict,
      existingData: partMap.get(p.id) || null,
    };
  });

  // Remap head_avatar: sync head_id with part head if part was remapped
  const headAvatars = parsed.headAvatars.map((ha) => {
    const isConflict = haMap.has(ha.head_id);
    let targetHeadId = ha.head_id;
    if (partIdMap.has(ha.head_id)) {
      targetHeadId = partIdMap.get(ha.head_id);
    } else if (isConflict) {
      targetHeadId = curHaHeadId++;
    }
    return {
      ...ha,
      originalHeadId: ha.head_id,
      head_id: targetHeadId,
      wasRemapped: targetHeadId !== ha.head_id,
      exists: isConflict,
      existingData: haMap.get(ha.head_id) || null,
    };
  });

  // Remap items: update id and linked part IDs (part, head, body, leg)
  const items = parsed.items.map((it) => {
    const isConflict = itemMap.has(it.id);
    let targetId = it.id;
    if (isConflict) {
      targetId = curItemId++;
      itemIdMap.set(it.id, targetId);
    }

    const head = partIdMap.has(it.head) ? partIdMap.get(it.head) : it.head;
    const body = partIdMap.has(it.body) ? partIdMap.get(it.body) : it.body;
    const leg = partIdMap.has(it.leg) ? partIdMap.get(it.leg) : it.leg;
    const part = partIdMap.has(it.part) ? partIdMap.get(it.part) : it.part;

    return {
      ...it,
      originalId: it.id,
      id: targetId,
      head,
      body,
      leg,
      part,
      wasRemapped: targetId !== it.id || head !== it.head || body !== it.body || leg !== it.leg || part !== it.part,
      exists: isConflict,
      existingData: itemMap.get(it.id) || null,
    };
  });

  // Remap flag bags
  const flagBags = parsed.flagBags.map((fb) => {
    const isConflict = fbMap.has(fb.id);
    let targetId = fb.id;
    if (isConflict) {
      targetId = curFbId++;
    }
    return {
      ...fb,
      originalId: fb.id,
      id: targetId,
      wasRemapped: targetId !== fb.id,
      exists: isConflict,
      existingData: fbMap.get(fb.id) || null,
    };
  });

  return {
    items,
    parts,
    headAvatars,
    flagBags,
    partIdMap: Object.fromEntries(partIdMap),
    itemIdMap: Object.fromEntries(itemIdMap),
  };
}

/**
 * GET /api/v1/quick-import/stats
 */
router.get('/stats', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const stats = await computeNextIds();
    res.json({ ok: true, data: stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/quick-import/preview
 */
router.post('/preview', requirePermission('giftcode.manage'), async (req, res) => {
  const { rawText, customData } = req.body;
  try {
    const parsed = customData || parseMultiContent(rawText || '');
    const nextIds = await computeNextIds();

    // Check item_template existence
    const itemIds = parsed.items.map((it) => it.id);
    let existingItems = [];
    if (itemIds.length > 0) {
      existingItems = await query(
        `SELECT id, name, type, icon_id, part FROM item_template WHERE id IN (${itemIds.map(() => '?').join(',')})`,
        itemIds
      );
    }
    const itemMap = new Map(existingItems.map((r) => [r.id, r]));

    // Check part existence
    const partIds = parsed.parts.map((p) => p.id);
    let existingParts = [];
    if (partIds.length > 0) {
      existingParts = await query(
        `SELECT id, type FROM part WHERE id IN (${partIds.map(() => '?').join(',')})`,
        partIds
      );
    }
    const partMap = new Map(existingParts.map((r) => [r.id, r]));

    // Check head_avatar existence
    const headIds = parsed.headAvatars.map((h) => h.head_id);
    let existingHeadAvatars = [];
    if (headIds.length > 0) {
      existingHeadAvatars = await query(
        `SELECT head_id, avatar_id FROM head_avatar WHERE head_id IN (${headIds.map(() => '?').join(',')})`,
        headIds
      );
    }
    const haMap = new Map(existingHeadAvatars.map((r) => [r.head_id, r]));

    // Check flag_bag existence
    const fbIds = parsed.flagBags.map((f) => f.id);
    let existingFlagBags = [];
    if (fbIds.length > 0) {
      existingFlagBags = await query(
        `SELECT id, name FROM flag_bag WHERE id IN (${fbIds.map(() => '?').join(',')})`,
        fbIds
      );
    }
    const fbMap = new Map(existingFlagBags.map((r) => [r.id, r]));

    // Decorate items (original IDs)
    const items = parsed.items.map((it) => ({
      ...it,
      exists: itemMap.has(it.id),
      existingData: itemMap.get(it.id) || null,
    }));

    // Decorate parts
    const parts = parsed.parts.map((p) => ({
      ...p,
      exists: partMap.has(p.id),
      existingData: partMap.get(p.id) || null,
    }));

    // Decorate headAvatars
    const headAvatars = parsed.headAvatars.map((ha) => ({
      ...ha,
      exists: haMap.has(ha.head_id),
      existingData: haMap.get(ha.head_id) || null,
    }));

    // Decorate flagBags
    const flagBags = parsed.flagBags.map((fb) => ({
      ...fb,
      exists: fbMap.has(fb.id),
      existingData: fbMap.get(fb.id) || null,
    }));

    const itemsConflicts = items.filter((i) => i.exists).length;
    const partsConflicts = parts.filter((p) => p.exists).length;
    const headAvatarsConflicts = headAvatars.filter((h) => h.exists).length;
    const flagBagsConflicts = flagBags.filter((f) => f.exists).length;
    const totalConflicts = itemsConflicts + partsConflicts + headAvatarsConflicts + flagBagsConflicts;

    // Generate pre-calculated remapped dataset
    const remappedData = buildRemappedData(parsed, itemMap, partMap, haMap, fbMap, nextIds);

    res.json({
      ok: true,
      data: {
        summary: {
          itemsCount: items.length,
          partsCount: parts.length,
          headAvatarsCount: headAvatars.length,
          flagBagsCount: flagBags.length,
          unrecognizedCount: parsed.unrecognized.length,
          itemsConflicts,
          partsConflicts,
          headAvatarsConflicts,
          flagBagsConflicts,
          totalConflicts,
          hasConflicts: totalConflicts > 0,
        },
        items,
        parts,
        headAvatars,
        flagBags,
        nextSuggestedIds: {
          nextItemId: nextIds.item_template.nextId,
          nextPartId: nextIds.part.nextId,
          nextHeadAvatarId: nextIds.head_avatar.nextHeadId,
          nextFlagBagId: nextIds.flag_bag.nextId,
        },
        remappedData,
        unrecognized: parsed.unrecognized,
      },
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/quick-import/execute
 */
router.post('/execute', requirePermission('giftcode.manage'), async (req, res) => {
  const {
    items = [],
    parts = [],
    headAvatars = [],
    flagBags = [],
    conflictMode = 'upsert', // 'upsert' | 'ignore' | 'strict'
    serverId,
    reloadAfter = true,
  } = req.body;

  if (!items.length && !parts.length && !headAvatars.length && !flagBags.length) {
    return res.status(400).json({ ok: false, error: 'Không có dữ liệu hợp lệ nào để nạp' });
  }

  try {
    const report = {
      itemsSaved: 0,
      partsSaved: 0,
      headAvatarsSaved: 0,
      flagBagsSaved: 0,
    };

    await withTransaction(async (conn) => {
      let itemsToInsert = items;
      let partsToInsert = parts;
      let headAvatarsToInsert = headAvatars;
      let flagBagsToInsert = flagBags;

      if (conflictMode === 'auto_remap') {
        const nextIds = await computeNextIds(conn);

        const itemIds = items.map((it) => it.id).filter((id) => id !== undefined);
        let existingItems = [];
        if (itemIds.length > 0) {
          const [rows] = await conn.execute(
            `SELECT id FROM item_template WHERE id IN (${itemIds.map(() => '?').join(',')})`,
            itemIds
          );
          existingItems = rows;
        }
        const itemMap = new Map(existingItems.map((r) => [r.id, r]));

        const partIds = parts.map((p) => p.id).filter((id) => id !== undefined);
        let existingParts = [];
        if (partIds.length > 0) {
          const [rows] = await conn.execute(
            `SELECT id FROM part WHERE id IN (${partIds.map(() => '?').join(',')})`,
            partIds
          );
          existingParts = rows;
        }
        const partMap = new Map(existingParts.map((r) => [r.id, r]));

        const headIds = headAvatars.map((h) => h.head_id).filter((id) => id !== undefined);
        let existingHeadAvatars = [];
        if (headIds.length > 0) {
          const [rows] = await conn.execute(
            `SELECT head_id FROM head_avatar WHERE head_id IN (${headIds.map(() => '?').join(',')})`,
            headIds
          );
          existingHeadAvatars = rows;
        }
        const haMap = new Map(existingHeadAvatars.map((r) => [r.head_id, r]));

        const fbIds = flagBags.map((f) => f.id).filter((id) => id !== undefined);
        let existingFlagBags = [];
        if (fbIds.length > 0) {
          const [rows] = await conn.execute(
            `SELECT id FROM flag_bag WHERE id IN (${fbIds.map(() => '?').join(',')})`,
            fbIds
          );
          existingFlagBags = rows;
        }
        const fbMap = new Map(existingFlagBags.map((r) => [r.id, r]));

        const remapped = buildRemappedData(
          { items, parts, headAvatars, flagBags },
          itemMap,
          partMap,
          haMap,
          fbMap,
          nextIds
        );
        itemsToInsert = remapped.items;
        partsToInsert = remapped.parts;
        headAvatarsToInsert = remapped.headAvatars;
        flagBagsToInsert = remapped.flagBags;
        report.remapped = {
          partIdMap: remapped.partIdMap,
          itemIdMap: remapped.itemIdMap,
        };
      }

      // 1. Insert / Upsert item_template
      for (const it of itemsToInsert) {
        if (conflictMode === 'upsert' || conflictMode === 'auto_remap') {
          await conn.execute(
            `INSERT INTO item_template
             (id, type, gender, name, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               type = VALUES(type),
               gender = VALUES(gender),
               name = VALUES(name),
               description = VALUES(description),
               level = VALUES(level),
               icon_id = VALUES(icon_id),
               part = VALUES(part),
               is_up_to_up = VALUES(is_up_to_up),
               power_require = VALUES(power_require),
               gold = VALUES(gold),
               gem = VALUES(gem),
               head = VALUES(head),
               body = VALUES(body),
               leg = VALUES(leg)`,
            [
              Number(it.id),
              Number(it.type ?? 0),
              Number(it.gender ?? 3),
              String(it.name || '').trim(),
              String(it.description || '').trim(),
              Number(it.level ?? 0),
              Number(it.icon_id ?? 0),
              Number(it.part ?? -1),
              Number(it.is_up_to_up ?? 0) ? 1 : 0,
              Number(it.power_require ?? 0),
              Number(it.gold ?? 0),
              Number(it.gem ?? 0),
              Number(it.head ?? -1),
              Number(it.body ?? -1),
              Number(it.leg ?? -1),
            ]
          );
        } else if (conflictMode === 'ignore') {
          await conn.execute(
            `INSERT IGNORE INTO item_template
             (id, type, gender, name, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              Number(it.id),
              Number(it.type ?? 0),
              Number(it.gender ?? 3),
              String(it.name || '').trim(),
              String(it.description || '').trim(),
              Number(it.level ?? 0),
              Number(it.icon_id ?? 0),
              Number(it.part ?? -1),
              Number(it.is_up_to_up ?? 0) ? 1 : 0,
              Number(it.power_require ?? 0),
              Number(it.gold ?? 0),
              Number(it.gem ?? 0),
              Number(it.head ?? -1),
              Number(it.body ?? -1),
              Number(it.leg ?? -1),
            ]
          );
        } else {
          await conn.execute(
            `INSERT INTO item_template
             (id, type, gender, name, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              Number(it.id),
              Number(it.type ?? 0),
              Number(it.gender ?? 3),
              String(it.name || '').trim(),
              String(it.description || '').trim(),
              Number(it.level ?? 0),
              Number(it.icon_id ?? 0),
              Number(it.part ?? -1),
              Number(it.is_up_to_up ?? 0) ? 1 : 0,
              Number(it.power_require ?? 0),
              Number(it.gold ?? 0),
              Number(it.gem ?? 0),
              Number(it.head ?? -1),
              Number(it.body ?? -1),
              Number(it.leg ?? -1),
            ]
          );
        }
        report.itemsSaved++;
      }

      // 2. Insert / Upsert part
      for (const p of partsToInsert) {
        const dataStr = normalizePartData(p.data);
        if (conflictMode === 'upsert' || conflictMode === 'auto_remap') {
          const [exists] = await conn.execute('SELECT 1 FROM part WHERE id = ? LIMIT 1', [Number(p.id)]);
          if (exists && exists.length > 0) {
            // Update in-place to preserve row order
            await conn.execute(
              'UPDATE part SET type = ?, data = ? WHERE id = ?',
              [Number(p.type), dataStr, Number(p.id)]
            );
          } else {
            await conn.execute(
              'INSERT INTO part (id, type, data) VALUES (?, ?, ?)',
              [Number(p.id), Number(p.type), dataStr]
            );
          }
        } else if (conflictMode === 'ignore') {
          const [exists] = await conn.execute('SELECT 1 FROM part WHERE id = ? LIMIT 1', [Number(p.id)]);
          if (!exists || exists.length === 0) {
            await conn.execute(
              'INSERT INTO part (id, type, data) VALUES (?, ?, ?)',
              [Number(p.id), Number(p.type), dataStr]
            );
          }
        } else {
          await conn.execute(
            'INSERT INTO part (id, type, data) VALUES (?, ?, ?)',
            [Number(p.id), Number(p.type), dataStr]
          );
        }
        report.partsSaved++;
      }

      // 3. Insert / Upsert head_avatar
      for (const ha of headAvatarsToInsert) {
        if (conflictMode === 'upsert' || conflictMode === 'auto_remap') {
          await conn.execute(
            `INSERT INTO head_avatar (head_id, avatar_id)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE avatar_id = VALUES(avatar_id)`,
            [Number(ha.head_id), Number(ha.avatar_id)]
          );
        } else if (conflictMode === 'ignore') {
          await conn.execute(
            `INSERT IGNORE INTO head_avatar (head_id, avatar_id)
             VALUES (?, ?)`,
            [Number(ha.head_id), Number(ha.avatar_id)]
          );
        } else {
          await conn.execute(
            'INSERT INTO head_avatar (head_id, avatar_id) VALUES (?, ?)',
            [Number(ha.head_id), Number(ha.avatar_id)]
          );
        }
        report.headAvatarsSaved++;
      }

      // 4. Insert / Upsert flag_bag
      for (const fb of flagBagsToInsert) {
        if (conflictMode === 'upsert' || conflictMode === 'auto_remap') {
          await conn.execute(
            `INSERT INTO flag_bag (id, icon_data, name, gold, gem, icon_id)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               icon_data = VALUES(icon_data),
               name = VALUES(name),
               gold = VALUES(gold),
               gem = VALUES(gem),
               icon_id = VALUES(icon_id)`,
            [
              Number(fb.id),
              String(fb.icon_data || '').trim(),
              String(fb.name || '').trim(),
              Number(fb.gold ?? 0),
              Number(fb.gem ?? 0),
              Number(fb.icon_id ?? 0),
            ]
          );
        } else if (conflictMode === 'ignore') {
          await conn.execute(
            `INSERT IGNORE INTO flag_bag (id, icon_data, name, gold, gem, icon_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              Number(fb.id),
              String(fb.icon_data || '').trim(),
              String(fb.name || '').trim(),
              Number(fb.gold ?? 0),
              Number(fb.gem ?? 0),
              Number(fb.icon_id ?? 0),
            ]
          );
        } else {
          await conn.execute(
            `INSERT INTO flag_bag (id, icon_data, name, gold, gem, icon_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              Number(fb.id),
              String(fb.icon_data || '').trim(),
              String(fb.name || '').trim(),
              Number(fb.gold ?? 0),
              Number(fb.gem ?? 0),
              Number(fb.icon_id ?? 0),
            ]
          );
        }
        report.flagBagsSaved++;
      }

      // Sync binary data/update_data/part file to keep client and server synchronized
      await syncUpdateDataPartFile(conn);
    });

    const sid = Number(serverId || await getDefaultServerId());
    let runtimeReload = null;
    if (reloadAfter) {
      try {
        runtimeReload = await agentPost(sid, '/reload/items', {});
      } catch (err) {
        runtimeReload = { success: false, error: err.message };
      }
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'quick_import.execute',
      target: 'database_multi_import',
      requestBody: { report, conflictMode },
      response: { ok: true, report, runtimeReload },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        report,
        databaseSaved: true,
        runtimeReload,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
