import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec } from '../db.js';
import { auditLog } from '../services/audit.js';
import { agentPost } from '../services/agent.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { findIconFile } from '../services/gameAssets.js';
import {
  parseExportItemFile,
  compareDatabaseWithExport,
  compareItemFields,
  syncSingleItemFromExport,
  syncBatchFromExport,
  fillEmptySlotsFromExport,
  isItemPlaceholderOrEmpty,
  exportDatabaseToFile,
  checkItemUsageInPlayers,
  updateExportItemFromDatabase,
  updateItemNameAndDescription,
  syncItemFromDifferentExportId,
  normalizeDbRow,
  loadPartsMap,
  loadDbPartsMap,
  loadDbHeadAvatarsMap,
  loadExportPartsFullMap,
  loadExportHeadAvatarsMap,
  evaluateItemPartAndAvatarStatus,
  resolveItemPartPreview,
  getDeepAnalysis,
  checkPartConflictForExportItem,
  deleteItemAndAssociatedData,
  deleteBatchItemsAndAssociatedData,
  repairMissingItemGaps,
  getAllPartsCatalog,
  getAllHeadAvatarsCatalog,
  importExportItemsToDbCustomIds,
} from '../services/exportItemService.js';

const router = Router();
router.use(authMiddleware);

function normalizeItem(body = {}, current = {}) {
  const type = Number(body.type ?? body.TYPE ?? current.type ?? current.TYPE ?? 0);
  const gender = Number(body.gender ?? body.GENDER ?? current.gender ?? current.GENDER ?? 3);
  const level = Number(body.level ?? body.LEVEL ?? current.level ?? current.LEVEL ?? 0);
  const iconId = Number(body.icon_id ?? body.ICON_ID ?? current.icon_id ?? current.ICON_ID ?? 0);
  const part = Number(body.part ?? body.PART ?? current.part ?? current.PART ?? -1);
  const isUp = Number(body.is_up_to_up ?? body.IS_UP_TO_UP ?? current.is_up_to_up ?? current.IS_UP_TO_UP ?? 0) ? 1 : 0;
  const power = Number(body.power_require ?? body.POWER_REQUIRE ?? current.power_require ?? current.POWER_REQUIRE ?? 0);
  const gold = Number(body.gold ?? body.GOLD ?? current.gold ?? current.GOLD ?? 0);
  const gem = Number(body.gem ?? body.GEM ?? current.gem ?? current.GEM ?? 0);
  const head = Number(body.head ?? body.HEAD ?? current.head ?? current.HEAD ?? -1);
  const bodyPart = Number(body.body ?? body.BODY ?? current.body ?? current.BODY ?? -1);
  const leg = Number(body.leg ?? body.LEG ?? current.leg ?? current.LEG ?? -1);
  const name = String(body.NAME ?? body.name ?? current.NAME ?? current.name ?? '').trim();
  const description = String(body.description ?? body.DESCRIPTION ?? current.description ?? current.DESCRIPTION ?? '').trim();
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

/**
 * GET / - Danh sách vật phẩm có trong MariaDB item_template (kèm part_preview icon)
 */
router.get('/', requirePermission('giftcode.manage'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const typeParam = req.query.type;
  const genderParam = req.query.gender;
  const hasIconParam = req.query.has_icon;
  const minIcon = req.query.min_icon ? Number(req.query.min_icon) : null;
  const maxIcon = req.query.max_icon ? Number(req.query.max_icon) : null;
  const exactIcon = req.query.exact_icon !== undefined && req.query.exact_icon !== '' ? Number(req.query.exact_icon) : null;
  const partIdParam = req.query.part_id !== undefined && req.query.part_id !== '' && req.query.part_id !== 'all' ? Number(req.query.part_id) : null;
  const headAvatarParam = req.query.head_avatar_id !== undefined && req.query.head_avatar_id !== '' && req.query.head_avatar_id !== 'all' ? Number(req.query.head_avatar_id) : null;

  const sortBy = String(req.query.sort_by || 'id').toLowerCase();
  const sortDir = String(req.query.sort_dir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 5000);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  try {
    let whereClauses = [];
    let params = [];

    if (q) {
      const isNum = !isNaN(Number(q));
      if (isNum) {
        whereClauses.push('(id = ? OR icon_id = ? OR NAME LIKE ?)');
        params.push(Number(q), Number(q), `%${q}%`);
      } else {
        whereClauses.push('(NAME LIKE ? OR description LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
      }
    }

    if (exactIcon !== null && Number.isFinite(exactIcon)) {
      whereClauses.push('icon_id = ?');
      params.push(exactIcon);
    }

    if (typeParam !== undefined && typeParam !== '' && typeParam !== 'all') {
      whereClauses.push('type = ?');
      params.push(Number(typeParam));
    }

    if (genderParam !== undefined && genderParam !== '' && genderParam !== 'all') {
      whereClauses.push('gender = ?');
      params.push(Number(genderParam));
    }

    if (minIcon !== null && Number.isFinite(minIcon)) {
      whereClauses.push('icon_id >= ?');
      params.push(minIcon);
    }

    if (maxIcon !== null && Number.isFinite(maxIcon)) {
      whereClauses.push('icon_id <= ?');
      params.push(maxIcon);
    }

    if (partIdParam !== null && Number.isFinite(partIdParam)) {
      whereClauses.push('(part = ? OR head = ? OR body = ? OR leg = ?)');
      params.push(partIdParam, partIdParam, partIdParam, partIdParam);
    }

    if (headAvatarParam !== null && Number.isFinite(headAvatarParam)) {
      whereClauses.push('(head = ? OR head IN (SELECT head_id FROM head_avatar WHERE avatar_id = ?))');
      params.push(headAvatarParam, headAvatarParam);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRows = await query(
      `SELECT COUNT(*) AS total, COALESCE(MAX(id), -1) AS max_id FROM item_template ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const maxId = Number(countRows[0]?.max_id ?? -1);

    let orderColumn = 'id';
    if (sortBy === 'icon_id') orderColumn = 'icon_id';
    else if (sortBy === 'name') orderColumn = 'NAME';
    else if (sortBy === 'level') orderColumn = 'level';
    else if (sortBy === 'part') orderColumn = 'part';
    else if (sortBy === 'power_require') orderColumn = 'power_require';
    else if (sortBy === 'gold') orderColumn = 'gold';
    else if (sortBy === 'gem') orderColumn = 'gem';
    else if (sortBy === 'type') orderColumn = 'type';

    const orderSql = `ORDER BY ${orderColumn} ${sortDir}, id ASC`;

    const rows = await query(
      `SELECT id, type, gender, NAME, description, level, icon_id, part, is_up_to_up,
              power_require, gold, gem, head, body, leg
       FROM item_template
       ${whereSql}
       ${orderSql}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const partsMap = loadPartsMap();
    const dbPartsMap = await loadDbPartsMap();
    const dbAvatarMap = await loadDbHeadAvatarsMap();
    const expPartsMap = loadExportPartsFullMap();
    const expAvatarMap = loadExportHeadAvatarsMap();

    const exportParsed = parseExportItemFile();
    const exportMap = new Map();
    const exportItemsList = (exportParsed.ok && Array.isArray(exportParsed.items)) ? exportParsed.items : [];
    for (const exp of exportItemsList) {
      exportMap.set(exp.id, exp);
    }

    let maxDbPartId = 0;
    for (const p of dbPartsMap.values()) {
      if (Number(p.id) > maxDbPartId) maxDbPartId = Number(p.id);
    }

    const dbByNameIcon = new Map();
    for (const r of rows) {
      const key = `${String(r.NAME || '').trim().toLowerCase()}_${r.icon_id}`;
      if (!dbByNameIcon.has(key)) {
        dbByNameIcon.set(key, []);
      }
      dbByNameIcon.get(key).push(r);
    }

    const rowsWithMeta = rows.map((r) => {
      const hasIcon = Boolean(findIconFile(r.icon_id));
      const partPreview = resolveItemPartPreview(r, partsMap);
      const partAvatarAudit = evaluateItemPartAndAvatarStatus(r, dbPartsMap, expPartsMap, dbAvatarMap, expAvatarMap);
      const isPlaceholder = isItemPlaceholderOrEmpty(r);
      const expItem = exportMap.get(r.id);
      const partConflict = (isPlaceholder && expItem) ? checkPartConflictForExportItem(expItem, dbPartsMap, maxDbPartId) : null;

      let expAlreadyInDb = false;
      if (expItem && !isItemPlaceholderOrEmpty(expItem)) {
        const nameKey = `${String(expItem.NAME || '').trim().toLowerCase()}_${expItem.icon_id}`;
        const matches = dbByNameIcon.get(nameKey) || [];
        expAlreadyInDb = matches.some((other) => other.id !== r.id && !isItemPlaceholderOrEmpty(other));
      }

      const expSuggestion = (isPlaceholder && expItem && !isItemPlaceholderOrEmpty(expItem) && !expAlreadyInDb) ? {
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

      // Tìm tất cả item trong export có cùng icon_id để đề xuất đồng bộ Tên & Mô tả (kể cả khác ID)
      const iconSyncSuggestions = (r.icon_id > 0)
        ? exportItemsList
            .filter((exp) => exp.icon_id === r.icon_id)
            .map((exp) => {
              const hasNameDiff = String(r.NAME || '').trim() !== String(exp.NAME || '').trim();
              const hasDescDiff = String(r.description || '').trim() !== String(exp.description || '').trim();
              const itemPartConflict = checkPartConflictForExportItem(exp, dbPartsMap, maxDbPartId);
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
                isSameItemId: exp.id === r.id,
                hasNameDifference: hasNameDiff,
                hasDescDifference: hasDescDiff,
                shouldSuggest: hasNameDiff || hasDescDiff || isPlaceholder,
                partConflict: itemPartConflict,
              };
            })
            .filter((s) => s.shouldSuggest)
        : [];

      return {
        ...r,
        has_icon_file: hasIcon,
        part_preview: partPreview,
        part_avatar_audit: partAvatarAudit,
        is_empty_slot: isPlaceholder,
        export_suggestion: expSuggestion,
        iconSyncSuggestions,
      };
    });

    let finalRows = rowsWithMeta;
    if (hasIconParam === '1') {
      finalRows = finalRows.filter((r) => r.has_icon_file);
    } else if (hasIconParam === '0') {
      finalRows = finalRows.filter((r) => !r.has_icon_file);
    }

    const partStatusParam = String(req.query.part_status || '').toLowerCase();
    if (partStatusParam === 'mismatch') {
      finalRows = finalRows.filter((r) => r.part_avatar_audit?.hasAnyIssue);
    } else if (partStatusParam === 'matched') {
      finalRows = finalRows.filter((r) => !r.part_avatar_audit?.hasAnyIssue);
    }

    const slotStatusParam = String(req.query.slot_status || '').toLowerCase();
    if (slotStatusParam === 'empty_only') {
      finalRows = finalRows.filter((r) => r.is_empty_slot);
    } else if (slotStatusParam === 'has_export') {
      finalRows = finalRows.filter((r) => r.export_suggestion != null);
    } else if (slotStatusParam === 'filled_only') {
      finalRows = finalRows.filter((r) => !r.is_empty_slot);
    }

    res.json({
      ok: true,
      data: {
        rows: finalRows,
        total,
        nextId: maxId + 1,
        limit,
        offset,
        sortBy,
        sortDir,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /parts-map - Tra cứu icon cho danh sách Part IDs
 */
/**
 * GET /parts-map - Tra cứu icon cho danh sách Part IDs
 */
router.get('/parts-map', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const pMap = loadPartsMap();
    const result = {};
    for (const [key, val] of pMap.entries()) {
      result[key] = val;
    }
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /parts-catalog - Danh sách đầy đủ toàn bộ các Part ID kèm metadata và icon
 */
router.get('/parts-catalog', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const list = await getAllPartsCatalog();
    res.json({ ok: true, data: list });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /head-avatars-catalog - Danh sách đầy đủ toàn bộ mapping Head Avatar kèm icon
 */
router.get('/head-avatars-catalog', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const list = await getAllHeadAvatarsCatalog();
    res.json({ ok: true, data: list });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /options - Danh sách item_option_template
 */
router.get('/options', requirePermission('giftcode.manage'), async (_req, res) => {
  try {
    const rows = await query('SELECT id, NAME AS name FROM item_option_template ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /compare - So sánh đối chiếu toàn bộ DB item_template với export/item_template.txt
 */
router.get('/compare', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const statusFilter = String(req.query.status || 'all');
    const q = String(req.query.q || '').trim().toLowerCase();
    const typeParam = req.query.type;
    const genderParam = req.query.gender;
    const minIcon = req.query.min_icon ? Number(req.query.min_icon) : null;
    const maxIcon = req.query.max_icon ? Number(req.query.max_icon) : null;
    const exactIcon = req.query.exact_icon !== undefined && req.query.exact_icon !== '' ? Number(req.query.exact_icon) : null;
    const partIdParam = req.query.part_id !== undefined && req.query.part_id !== '' && req.query.part_id !== 'all' ? Number(req.query.part_id) : null;
    const headAvatarParam = req.query.head_avatar_id !== undefined && req.query.head_avatar_id !== '' && req.query.head_avatar_id !== 'all' ? Number(req.query.head_avatar_id) : null;
    const iconMismatchOnly = req.query.icon_mismatch === '1';

    const sortBy = String(req.query.sort_by || 'id').toLowerCase();
    const sortDir = String(req.query.sort_dir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 5000);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const result = await compareDatabaseWithExport();
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error });
    }

    let filtered = result.comparison;

    if (typeParam !== undefined && typeParam !== '' && typeParam !== 'all') {
      const targetType = Number(typeParam);
      filtered = filtered.filter((c) => {
        const tDb = c.dbItem?.type !== undefined ? Number(c.dbItem.type) : null;
        const tExp = c.exportItem?.type !== undefined ? Number(c.exportItem.type) : null;
        return tDb === targetType || tExp === targetType;
      });
    }

    if (genderParam !== undefined && genderParam !== '' && genderParam !== 'all') {
      const targetGender = Number(genderParam);
      filtered = filtered.filter((c) => {
        const gDb = c.dbItem?.gender !== undefined ? Number(c.dbItem.gender) : null;
        const gExp = c.exportItem?.gender !== undefined ? Number(c.exportItem.gender) : null;
        return gDb === targetGender || gExp === targetGender;
      });
    }

    if (exactIcon !== null && Number.isFinite(exactIcon)) {
      filtered = filtered.filter((c) => (c.dbItem?.icon_id === exactIcon || c.exportItem?.icon_id === exactIcon));
    }

    if (partIdParam !== null && Number.isFinite(partIdParam)) {
      filtered = filtered.filter((c) => {
        const pDb = c.dbItem ? [c.dbItem.part, c.dbItem.head, c.dbItem.body, c.dbItem.leg].map(Number) : [];
        const pExp = c.exportItem ? [c.exportItem.part, c.exportItem.head, c.exportItem.body, c.exportItem.leg].map(Number) : [];
        return pDb.includes(partIdParam) || pExp.includes(partIdParam);
      });
    }

    if (headAvatarParam !== null && Number.isFinite(headAvatarParam)) {
      const expAvatars = loadExportHeadAvatarsMap();
      const dbAvatars = await loadDbHeadAvatarsMap();
      filtered = filtered.filter((c) => {
        const hDb = c.dbItem?.head != null ? Number(c.dbItem.head) : null;
        const hExp = c.exportItem?.head != null ? Number(c.exportItem.head) : null;
        const avDb = hDb != null ? dbAvatars.get(hDb) : null;
        const avExp = hExp != null ? expAvatars.get(hExp) : null;
        return hDb === headAvatarParam || hExp === headAvatarParam || avDb === headAvatarParam || avExp === headAvatarParam;
      });
    }

    if (statusFilter === 'diff_only') {
      filtered = filtered.filter((c) => c.status !== 'MATCHED');
    } else if (statusFilter === 'SHIFTED') {
      filtered = filtered.filter((c) => c.possibleExportMatch || c.possibleDbMatch);
    } else if (statusFilter === 'SAME_ICON') {
      filtered = filtered.filter((c) => c.iconCluster?.isSharedIcon);
    } else if (statusFilter === 'EMPTY_DB_SLOT' || statusFilter === 'EMPTY_SLOT') {
      filtered = filtered.filter((c) => c.status === 'EMPTY_DB_SLOT' || c.canFillFromExport || c.isDbEmpty);
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (iconMismatchOnly) {
      filtered = filtered.filter((c) => c.isIconMismatch || c.diffs?.some((d) => d.field === 'icon_id'));
    }

    if (minIcon !== null && Number.isFinite(minIcon)) {
      filtered = filtered.filter((c) => {
        const iconA = c.dbItem?.icon_id ?? c.exportItem?.icon_id ?? 0;
        const iconB = c.exportItem?.icon_id ?? c.dbItem?.icon_id ?? 0;
        return iconA >= minIcon || iconB >= minIcon;
      });
    }

    if (maxIcon !== null && Number.isFinite(maxIcon)) {
      filtered = filtered.filter((c) => {
        const iconA = c.dbItem?.icon_id ?? c.exportItem?.icon_id ?? 0;
        const iconB = c.exportItem?.icon_id ?? c.dbItem?.icon_id ?? 0;
        return iconA <= maxIcon || iconB <= maxIcon;
      });
    }

    if (q) {
      filtered = filtered.filter((c) => {
        const idStr = String(c.id);
        const dbName = String(c.dbItem?.NAME || '').toLowerCase();
        const expName = String(c.exportItem?.NAME || '').toLowerCase();
        const dbIcon = String(c.dbItem?.icon_id || '');
        const expIcon = String(c.exportItem?.icon_id || '');
        return idStr.includes(q) || dbName.includes(q) || expName.includes(q) || dbIcon.includes(q) || expIcon.includes(q);
      });
    }

    filtered.sort((a, b) => {
      let valA = a.id;
      let valB = b.id;

      if (sortBy === 'same_icon_grouped' || sortBy === 'same_icon') {
        const iconA = a.dbItem?.icon_id ?? a.exportItem?.icon_id ?? 0;
        const iconB = b.dbItem?.icon_id ?? b.exportItem?.icon_id ?? 0;
        if (iconA !== iconB) {
          return sortDir === 'ASC' ? iconA - iconB : iconB - iconA;
        }
        return a.id - b.id;
      } else if (sortBy === 'db_icon_id') {
        valA = a.dbItem?.icon_id ?? 999999;
        valB = b.dbItem?.icon_id ?? 999999;
      } else if (sortBy === 'exp_icon_id' || sortBy === 'icon_id') {
        valA = a.exportItem?.icon_id ?? 999999;
        valB = b.exportItem?.icon_id ?? 999999;
      } else if (sortBy === 'name') {
        valA = String(a.dbItem?.NAME || a.exportItem?.NAME || '').toLowerCase();
        valB = String(b.dbItem?.NAME || b.exportItem?.NAME || '').toLowerCase();
        return sortDir === 'ASC' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'diffs') {
        valA = a.diffs?.length || 0;
        valB = b.diffs?.length || 0;
      }

      if (valA < valB) return sortDir === 'ASC' ? -1 : 1;
      if (valA > valB) return sortDir === 'ASC' ? 1 : -1;
      return a.id - b.id;
    });

    const totalFiltered = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    const enhancedList = paginated.map((item) => {
      const dbIconExist = item.dbItem ? Boolean(findIconFile(item.dbItem.icon_id)) : false;
      const expIconExist = item.exportItem ? Boolean(findIconFile(item.exportItem.icon_id)) : false;
      return {
        ...item,
        dbIconExist,
        expIconExist,
      };
    });

    res.json({
      ok: true,
      data: {
        summary: result.summary,
        totalFiltered,
        limit,
        offset,
        sortBy,
        sortDir,
        items: enhancedList,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /:id/deep-analysis - Phân tích chi tiết độ lệch 3 tầng (Item Template, Part Sprites, Head Avatar, Người chơi giữ)
 */
router.get('/:id/deep-analysis', requirePermission('giftcode.manage'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
  }

  try {
    const analysisData = await getDeepAnalysis(id);
    res.json({
      ok: true,
      data: analysisData,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /export-data - Lấy danh sách item từ file export/item_template.txt
 */
router.get('/export-data', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const typeParam = req.query.type;
    const genderParam = req.query.gender;
    const minIcon = req.query.min_icon ? Number(req.query.min_icon) : null;
    const maxIcon = req.query.max_icon ? Number(req.query.max_icon) : null;
    const exactIcon = req.query.exact_icon !== undefined && req.query.exact_icon !== '' ? Number(req.query.exact_icon) : null;
    const partIdParam = req.query.part_id !== undefined && req.query.part_id !== '' && req.query.part_id !== 'all' ? Number(req.query.part_id) : null;
    const headAvatarParam = req.query.head_avatar_id !== undefined && req.query.head_avatar_id !== '' && req.query.head_avatar_id !== 'all' ? Number(req.query.head_avatar_id) : null;

    const sortBy = String(req.query.sort_by || 'id').toLowerCase();
    const sortDir = String(req.query.sort_dir || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 5000);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const parsed = parseExportItemFile();
    if (!parsed.ok) {
      return res.status(500).json({ ok: false, error: parsed.error });
    }

    let list = parsed.items;
    if (q) {
      list = list.filter((it) => {
        return String(it.id).includes(q) || String(it.NAME || '').toLowerCase().includes(q) || String(it.icon_id).includes(q);
      });
    }

    if (exactIcon !== null && Number.isFinite(exactIcon)) {
      list = list.filter((it) => it.icon_id === exactIcon);
    }

    if (typeParam !== undefined && typeParam !== '' && typeParam !== 'all') {
      const targetType = Number(typeParam);
      if (Number.isFinite(targetType)) {
        list = list.filter((it) => it.type === targetType);
      }
    }

    if (genderParam !== undefined && genderParam !== '' && genderParam !== 'all') {
      const targetGender = Number(genderParam);
      if (Number.isFinite(targetGender)) {
        list = list.filter((it) => it.gender === targetGender);
      }
    }

    if (partIdParam !== null && Number.isFinite(partIdParam)) {
      list = list.filter((it) => {
        const pList = [it.part, it.head, it.body, it.leg].map(Number);
        return pList.includes(partIdParam);
      });
    }

    if (headAvatarParam !== null && Number.isFinite(headAvatarParam)) {
      const expAvatars = loadExportHeadAvatarsMap();
      list = list.filter((it) => {
        const h = it.head != null ? Number(it.head) : null;
        const av = h != null ? expAvatars.get(h) : null;
        return h === headAvatarParam || av === headAvatarParam;
      });
    }

    if (minIcon !== null && Number.isFinite(minIcon)) {
      list = list.filter((it) => it.icon_id >= minIcon);
    }

    if (maxIcon !== null && Number.isFinite(maxIcon)) {
      list = list.filter((it) => it.icon_id <= maxIcon);
    }

    list.sort((a, b) => {
      let valA = a.id;
      let valB = b.id;

      if (sortBy === 'icon_id') {
        valA = a.icon_id;
        valB = b.icon_id;
      } else if (sortBy === 'type') {
        valA = a.type;
        valB = b.type;
      } else if (sortBy === 'name') {
        valA = String(a.NAME || '').toLowerCase();
        valB = String(b.NAME || '').toLowerCase();
        return sortDir === 'ASC' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'level') {
        valA = a.level;
        valB = b.level;
      }

      if (valA < valB) return sortDir === 'ASC' ? -1 : 1;
      if (valA > valB) return sortDir === 'ASC' ? 1 : -1;
      return a.id - b.id;
    });

    const total = list.length;
    const paginated = list.slice(offset, offset + limit).map((it) => ({
      ...it,
      has_icon_file: Boolean(findIconFile(it.icon_id)),
    }));

    res.json({
      ok: true,
      data: {
        total,
        totalInFile: parsed.items.length,
        filePath: parsed.filePath,
        limit,
        offset,
        sortBy,
        sortDir,
        rows: paginated,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /sync-one - Đồng bộ 1 item từ Export vào Database (hỗ trợ đồng bộ template, part, head_avatar)
 */
router.post('/sync-one', requirePermission('giftcode.manage'), async (req, res) => {
  const id = Number(req.body?.id);
  const selectedFields = req.body?.fields || null;
  // Tuyệt đối không can thiệp vào cột part và bảng head_avatar
  const options = {
    syncTemplate: req.body?.syncTemplate !== false,
    syncParts: false,
    syncHeadAvatar: false,
    useNewPartIds: false,
    customPartIds: null,
  };

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
  }

  try {
    const persisted = await syncSingleItemFromExport(id, selectedFields, options);
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    return reloadOrReportDatabaseSaved({ req, res, sid, item: persisted, action: 'item.sync_one', status: 200 });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * POST /update-export-from-db - Cập nhật file export theo dữ liệu DB cho 1 item
 */
router.post('/update-export-from-db', requirePermission('giftcode.manage'), async (req, res) => {
  const id = Number(req.body?.id);
  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
  }

  try {
    const result = await updateExportItemFromDatabase(id);
    await auditLog({
      userId: req.user.id,
      serverId: Number(req.body?.serverId || await getDefaultServerId()),
      action: 'item.update_export_from_db',
      requestBody: { id },
      response: result,
      ip: req.ip,
    });
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /sync-batch - Đồng bộ nhiều item từ Export vào Database (bảo toàn Part và Head Avatar)
 */
router.post('/sync-batch', requirePermission('giftcode.manage'), async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n >= 0) : null;
  // Tuyệt đối không can thiệp vào cột part và bảng head_avatar
  const options = {
    syncTemplate: req.body?.syncTemplate !== false,
    syncParts: false,
    syncHeadAvatar: false,
  };

  try {
    const result = await syncBatchFromExport(ids, options);
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    let runtime;
    try {
      runtime = await reloadRuntime(sid);
    } catch (e) {
      return res.status(200).json({
        ok: true,
        data: {
          ...result,
          databaseSaved: true,
          runtimeReloaded: false,
          error: `Đã lưu database nhưng runtime chưa reload: ${e.message}`,
        },
      });
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.sync_batch',
      requestBody: { idsCount: ids ? ids.length : 'all', options },
      response: { result, runtime },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        ...result,
        databaseSaved: true,
        runtimeReloaded: true,
        runtime,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /fill-empty-slots - Tự động nạp dữ liệu từ export/item_template.txt vào các ô ID trống trong Database
 */
router.post('/fill-empty-slots', requirePermission('giftcode.manage'), async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n >= 0) : null;
  const sid = Number(req.body?.serverId || await getDefaultServerId());

  try {
    const result = await fillEmptySlotsFromExport({ ids, serverId: sid });
    let runtime = null;
    let runtimeReloaded = false;
    try {
      runtime = await reloadRuntime(sid);
      runtimeReloaded = true;
    } catch (e) {
      console.warn('Runtime reload error:', e.message);
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.fill_empty_slots',
      requestBody: { idsCount: ids ? ids.length : 'all_empty' },
      response: { result, runtimeReloaded },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        ...result,
        databaseSaved: true,
        runtimeReloaded,
        runtime,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /import-export-range - Nạp danh sách item từ Export vào Database với dải ID chỉ định hoặc ánh xạ tùy chọn
 */
router.post('/import-export-range', requirePermission('giftcode.manage'), async (req, res) => {
  const mappings = Array.isArray(req.body?.mappings) ? req.body.mappings : [];
  const sid = Number(req.body?.serverId || await getDefaultServerId());

  if (mappings.length === 0) {
    return res.status(400).json({ ok: false, error: 'Danh sách ánh xạ vật phẩm không được để trống' });
  }

  try {
    const result = await importExportItemsToDbCustomIds(mappings);

    let runtime = null;
    let runtimeReloaded = false;
    try {
      runtime = await reloadRuntime(sid);
      runtimeReloaded = true;
    } catch (e) {
      console.warn('Runtime reload error:', e.message);
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.import_export_range',
      requestBody: { total: mappings.length, sampleMappings: mappings.slice(0, 20) },
      response: { result, runtimeReloaded },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        ...result,
        databaseSaved: true,
        runtimeReloaded,
        runtime,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});



/**
 * POST /export-to-file - Xuất toàn bộ bảng item_template ra file export/item_template.txt
 */
router.post('/export-to-file', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const result = await exportDatabaseToFile();
    await auditLog({
      userId: req.user.id,
      serverId: Number(req.body?.serverId || await getDefaultServerId()),
      action: 'item.export_to_file',
      response: result,
      ip: req.ip,
    });
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST / - Tạo item mới vào Database
 */
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

/**
 * PUT /:id - Cập nhật item trong Database (tùy chọn cập nhật cả export file nếu syncExport = true)
 */
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

    let exportResult = null;
    if (req.body?.syncExport || req.body?.updateExport) {
      try {
        exportResult = await updateExportItemFromDatabase(id);
      } catch (expErr) {
        console.warn('Lỗi ghi file export khi update item:', expErr.message);
      }
    }

    const persisted = await readPersistedItem(id);
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    return reloadOrReportDatabaseSaved({ req, res, sid, item: persisted, action: 'item.update' });
  } catch (e) {
    res.status(e.status || 400).json({ ok: false, error: e.message });
  }
});

/**
 * POST /:id/quick-text - Cập nhật nhanh Tên và Mô tả trực tiếp (vào Database, Export, hoặc cả hai)
 */
router.post('/:id/quick-text', requirePermission('giftcode.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, target = 'both' } = req.body || {};
  const sid = Number(req.body?.serverId || await getDefaultServerId());

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
  }

  try {
    const result = await updateItemNameAndDescription({ id, name, description, target });
    let runtime = null;
    let runtimeReloaded = false;

    if (result.dbUpdated) {
      try {
        runtime = await reloadRuntime(sid);
        runtimeReloaded = true;
      } catch (e) {
        console.warn('Runtime reload error:', e.message);
      }
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.quick_text_update',
      target: id,
      requestBody: { id, name, description, target },
      response: { result, runtimeReloaded },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        ...result,
        runtimeReloaded,
        runtime,
      },
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * POST /:id/sync-from-export-item - Đồng bộ item trong DB theo 1 item bất kỳ từ Export (ví dụ cùng icon_id nhưng khác item ID)
 */
router.post('/:id/sync-from-export-item', requirePermission('giftcode.manage'), async (req, res) => {
  const dbId = Number(req.params.id);
  const exportId = Number(req.body?.exportId);
  const fields = req.body?.fields || 'name_desc_only'; // 'name_desc_only' | 'all'
  // Tuyệt đối không can thiệp vào cột part và bảng head_avatar
  const syncParts = false;
  const syncHeadAvatar = false;
  const sid = Number(req.body?.serverId || await getDefaultServerId());

  if (!Number.isInteger(dbId) || dbId < 0 || !Number.isInteger(exportId) || exportId < 0) {
    return res.status(400).json({ ok: false, error: 'dbId và exportId không hợp lệ' });
  }

  try {
    const result = await syncItemFromDifferentExportId({
      dbId,
      exportId,
      fields,
      syncParts: false,
      syncHeadAvatar: false,
      useNewPartIds: false,
      customPartIds: null,
    });

    let runtime = null;
    let runtimeReloaded = false;
    try {
      runtime = await reloadRuntime(sid);
      runtimeReloaded = true;
    } catch (e) {
      console.warn('Runtime reload error:', e.message);
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.sync_from_export_item',
      target: dbId,
      requestBody: { dbId, exportId, fields, syncParts, syncHeadAvatar },
      response: { result, runtimeReloaded },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        ...result,
        runtimeReloaded,
        runtime,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * DELETE /:id - Xóa item khỏi MariaDB (kèm Part và Head Avatar liên kết)
 */
router.delete('/:id', requirePermission('giftcode.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const deleteParts = req.query.delete_parts !== '0' && req.body?.deleteParts !== false;
  const deleteHeadAvatar = req.query.delete_avatar !== '0' && req.body?.deleteHeadAvatar !== false;
  const force = req.query.force === '1' || Boolean(req.body?.force);
  const sid = Number(req.body?.serverId || req.query.serverId || await getDefaultServerId());

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
  }

  try {
    const result = await deleteItemAndAssociatedData({ id, deleteParts, deleteHeadAvatar, force });

    let runtime = null;
    let runtimeReloaded = false;
    try {
      runtime = await reloadRuntime(sid);
      runtimeReloaded = true;
    } catch (e) {
      console.warn('Runtime reload error sau khi xóa item:', e.message);
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.delete',
      target: id,
      requestBody: { id, deleteParts, deleteHeadAvatar, force },
      response: { result, runtimeReloaded },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        ...result,
        runtimeReloaded,
        runtime,
      },
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * POST /:id/delete - Xóa item khỏi MariaDB (hỗ trợ client gọi POST)
 */
router.post('/:id/delete', requirePermission('giftcode.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const deleteParts = req.body?.deleteParts !== false;
  const deleteHeadAvatar = req.body?.deleteHeadAvatar !== false;
  const force = Boolean(req.body?.force);
  const sid = Number(req.body?.serverId || await getDefaultServerId());

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ ok: false, error: 'ID item không hợp lệ' });
  }

  try {
    const result = await deleteItemAndAssociatedData({ id, deleteParts, deleteHeadAvatar, force });

    let runtime = null;
    let runtimeReloaded = false;
    try {
      runtime = await reloadRuntime(sid);
      runtimeReloaded = true;
    } catch (e) {
      console.warn('Runtime reload error sau khi xóa item:', e.message);
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.delete',
      target: id,
      requestBody: { id, deleteParts, deleteHeadAvatar, force },
      response: { result, runtimeReloaded },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        ...result,
        runtimeReloaded,
        runtime,
      },
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * POST /delete-batch - Xóa hàng loạt item khỏi MariaDB (kèm Part và Head Avatar)
 */
router.post('/delete-batch', requirePermission('giftcode.manage'), async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const deleteParts = req.body?.deleteParts !== false;
  const deleteHeadAvatar = req.body?.deleteHeadAvatar !== false;
  const force = Boolean(req.body?.force);
  const sid = Number(req.body?.serverId || await getDefaultServerId());

  if (ids.length === 0) {
    return res.status(400).json({ ok: false, error: 'Vui lòng chọn ít nhất 1 item để xóa' });
  }

  try {
    const result = await deleteBatchItemsAndAssociatedData({ ids, deleteParts, deleteHeadAvatar, force });

    let runtime = null;
    let runtimeReloaded = false;
    try {
      runtime = await reloadRuntime(sid);
      runtimeReloaded = true;
    } catch (e) {
      console.warn('Runtime reload error sau khi xóa hàng loạt item:', e.message);
    }

    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.delete-batch',
      target: ids.join(','),
      requestBody: { ids, deleteParts, deleteHeadAvatar, force },
      response: { result, runtimeReloaded },
      ip: req.ip,
    });

    res.json({
      ok: true,
      data: {
        ...result,
        runtimeReloaded,
        runtime,
      },
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/**
 * POST /repair-gaps - Tự động bù tất cả các ô ID bị khuyết/thiếu trong item_template
 */
router.post('/repair-gaps', requirePermission('giftcode.manage'), async (req, res) => {
  try {
    const sid = Number(req.body?.serverId || await getDefaultServerId());
    const result = await repairMissingItemGaps();
    let runtime = null;
    let runtimeReloaded = false;
    try {
      runtime = await reloadRuntime(sid);
      runtimeReloaded = true;
    } catch (e) {
      console.warn('Runtime reload error sau khi repair gaps:', e.message);
    }
    await auditLog({
      userId: req.user.id,
      serverId: sid,
      action: 'item.repair-gaps',
      response: { result, runtimeReloaded },
      ip: req.ip,
    });
    res.json({ ok: true, data: { ...result, runtimeReloaded, runtime } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /reload - Reload Java runtime
 */
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
