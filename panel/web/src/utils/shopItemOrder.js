export function normalizeItemName(name) {
  return String(name || '').trim().toLowerCase().normalize('NFC');
}

export function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '');
}

export function itemDisplayName(it) {
  return String(it?.item_name || '').trim();
}

/** Lọc item theo tộc player (gender + Chung) */
export function filterItemsForRace(items, raceFilter, itemVisibleForRace) {
  if (!raceFilter) return [...(items || [])];
  return (items || []).filter((it) => itemVisibleForRace(it.item_gender, raceFilter));
}

export function parseOptionsString(str) {
  const raw = String(str || '').trim();
  if (!raw) return [];
  return raw.split(';').map((part) => {
    const [id, param] = part.trim().split(':');
    const oid = Number(id);
    if (Number.isNaN(oid)) return null;
    return { id: oid, param: Number(param ?? 0) };
  }).filter(Boolean);
}

export function formatOptionsString(options) {
  return (options || [])
    .map((o) => `${o.id}:${o.param ?? 0}`)
    .join(';');
}

/** So sánh option không phụ thuộc thứ tự trong DB */
export function normalizeOptionsKey(options) {
  return (options || [])
    .map((o) => `${Number(o.id)}:${Number(o.param ?? 0)}`)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join(';');
}

export function optionsEqual(a, b) {
  return normalizeOptionsKey(a) === normalizeOptionsKey(b);
}

/** Dòng chuẩn: sort|temp_id|tên|opt_id:param;... (cột 0 = thứ tự dòng trong tab) */
export function formatStructuredLine(item, sortIndex) {
  const name = itemDisplayName(item) || `#${item.temp_id}`;
  const opts = formatOptionsString(item.options);
  return `${sortIndex}|${item.temp_id}|${name}|${opts}`;
}

export function buildExportHeader(meta = {}) {
  const npc = meta.npcId != null ? `NPC ${meta.npcId}` : 'NPC ?';
  const tag = meta.tagName ? ` ${meta.tagName}` : '';
  const tabId = meta.tabId ?? '?';
  const tabName = String(meta.tabName || '').replace(/<>/g, ' ').trim() || `Tab ${tabId}`;
  return `# ${npc}${tag} | Tab ${tabId}: ${tabName}`;
}

export function isStructuredOrderFormat(text) {
  return String(text || '')
    .split(/\r?\n/)
    .some((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return false;
      const parts = t.split('|');
      if (parts.length < 3) return false;
      return !Number.isNaN(Number(parts[1]));
    });
}

export function parseShopOrderText(text) {
  const headers = [];
  const entries = [];
  const nameOnlyLines = [];

  for (const raw of stripBom(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      headers.push(line);
      continue;
    }
    if (!line.includes('|')) {
      nameOnlyLines.push(line);
      continue;
    }
    const parts = line.split('|');
    if (parts.length < 3) {
      nameOnlyLines.push(line);
      continue;
    }
    const tempId = Number(parts[1]);
    if (Number.isNaN(tempId)) {
      nameOnlyLines.push(line);
      continue;
    }
    const hasOptionsColumn = parts.length > 3;
    entries.push({
      sortOrder: Number(parts[0]),
      tempId,
      name: parts[2]?.trim() ?? '',
      options: hasOptionsColumn ? parseOptionsString(parts.slice(3).join('|')) : null,
      hasOptionsColumn,
      lineIndex: entries.length,
      raw: line,
    });
  }

  const format = entries.length > 0 ? 'structured' : 'names';
  return { headers, entries, nameOnlyLines, format };
}

/** Sắp theo cột 0 rồi thứ tự dòng trong file (trên → dưới) */
export function sortEntriesForImport(entries) {
  return [...(entries || [])].sort((a, b) => {
    const ao = Number(a.sortOrder);
    const bo = Number(b.sortOrder);
    const aValid = !Number.isNaN(ao);
    const bValid = !Number.isNaN(bo);
    if (aValid && bValid && ao !== bo) return ao - bo;
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return (a.lineIndex ?? 0) - (b.lineIndex ?? 0);
  });
}

function findItemIndex(remaining, entry, pickCount) {
  if (entry.tempId != null && !Number.isNaN(entry.tempId)) {
    const want = entry.name ? normalizeItemName(entry.name) : '';
    const indices = [];
    for (let i = 0; i < remaining.length; i++) {
      const it = remaining[i];
      if (Number(it.temp_id) !== entry.tempId) continue;
      if (want) {
        const sameTemp = remaining.filter((r) => Number(r.temp_id) === entry.tempId);
        if (sameTemp.length > 1 && normalizeItemName(it.item_name) !== want) continue;
      }
      indices.push(i);
    }
    const nth = pickCount.get(entry.tempId) ?? 0;
    if (nth < indices.length) {
      pickCount.set(entry.tempId, nth + 1);
      return indices[nth];
    }
    return -1;
  }
  if (entry.name) {
    const want = normalizeItemName(entry.name);
    const indices = [];
    for (let i = 0; i < remaining.length; i++) {
      if (normalizeItemName(remaining[i].item_name) === want) indices.push(i);
    }
    const key = `name:${want}`;
    const nth = pickCount.get(key) ?? 0;
    if (nth < indices.length) {
      pickCount.set(key, nth + 1);
      return indices[nth];
    }
  }
  return -1;
}

/** Ghép item mới tạo đúng thứ tự dòng trong file */
export function alignCreatedItems(toCreate, created) {
  const pool = [...(created || [])];
  const aligned = [];
  for (const row of toCreate || []) {
    const entry = row.entry ?? row;
    const i = pool.findIndex((c) => Number(c.temp_id) === entry.tempId);
    if (i >= 0) aligned.push(pool.splice(i, 1)[0]);
  }
  return [...aligned, ...pool];
}

export function withImportSortOrder(items) {
  return (items || []).map((it, i) => ({ ...it, sort_order: i }));
}

function applyPatches(item, entry) {
  const next = { ...item };
  if (entry.hasOptionsColumn && entry.options != null) {
    next.options = [...entry.options];
  }
  return next;
}

export function extractImportTempIds(text) {
  const { entries, format } = parseShopOrderText(text);
  if (format !== 'structured') return [];
  return [...new Set(entries.map((e) => e.tempId).filter((id) => id > 0 && !Number.isNaN(id)))];
}

/** Chỉ giữ item theo thứ tự file (không giữ item thừa trong tab) */
export function applyStructuredImportExact(allItems, entries) {
  const { ordered } = applyStructuredImportCore(allItems, entries);
  return ordered;
}

export function templateMapFromList(templates) {
  const map = {};
  for (const t of templates || []) {
    if (t?.id != null) map[Number(t.id)] = t;
  }
  return map;
}

/** Item ảo để preview / lên kế hoạch thêm mới */
export function stubShopItemFromTemplate(entry, tpl) {
  const g = tpl?.gender != null ? Number(tpl.gender) : 3;
  return {
    id: null,
    temp_id: entry.tempId,
    item_name: tpl?.name || entry.name || `#${entry.tempId}`,
    icon_id: tpl?.icon_id ?? null,
    item_gender: g,
    icon_spec: 0,
    cost: 0,
    type_sell: 0,
    is_sell: 1,
    options: entry.hasOptionsColumn && entry.options != null ? [...entry.options] : [],
    _importNew: true,
  };
}

/** Kế hoạch import structured: khớp tab, thêm mới, thiếu template */
function applyStructuredImportCore(allItems, entries) {
  const remaining = [...(allItems || [])];
  const ordered = [];
  const pickCount = new Map();
  const sorted = sortEntriesForImport(entries);

  for (const entry of sorted) {
    const idx = findItemIndex(remaining, entry, pickCount);
    if (idx < 0) continue;
    const [item] = remaining.splice(idx, 1);
    ordered.push(applyPatches(item, entry));
  }

  return { ordered, remaining, sorted };
}

export function planStructuredImport(allItems, entries, templateMap = {}) {
  const remaining = [...(allItems || [])];
  const ordered = [];
  const toCreate = [];
  const missingTemplate = [];
  let matched = 0;
  const pickCount = new Map();
  const sorted = sortEntriesForImport(entries);

  for (const entry of sorted) {
    const idx = findItemIndex(remaining, entry, pickCount);
    if (idx >= 0) {
      const [item] = remaining.splice(idx, 1);
      ordered.push(applyPatches(item, entry));
      matched += 1;
      continue;
    }
    const tpl = templateMap[entry.tempId];
    if (!tpl) {
      missingTemplate.push(entry);
      continue;
    }
    const stub = stubShopItemFromTemplate(entry, tpl);
    ordered.push(stub);
    toCreate.push({ entry, stub });
  }

  return {
    ordered: [...ordered, ...remaining],
    toCreate,
    missingTemplate,
    matched,
    willAdd: toCreate.length,
  };
}

/** Ghép thứ tự + option từ file structured (thứ tự dòng trên → dưới) */
export function applyStructuredImport(allItems, entries) {
  const { ordered, remaining } = applyStructuredImportCore(allItems, entries);
  return [...ordered, ...remaining];
}

/** Legacy: chỉ tên từng dòng */
export function reorderItemsByNameList(items, text) {
  const { nameOnlyLines, entries, format } = parseShopOrderText(text);
  if (format === 'structured') return applyStructuredImport(items, entries);

  const lines = nameOnlyLines.length
    ? nameOnlyLines
    : String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const remaining = [...(items || [])];
  const ordered = [];

  for (const line of lines) {
    const want = normalizeItemName(line);
    const idx = remaining.findIndex((it) => normalizeItemName(it.item_name) === want);
    if (idx >= 0) {
      ordered.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }

  return [...ordered, ...remaining];
}

export function reorderItemsByNameListForRace(allItems, text, raceFilter, itemVisibleForRace) {
  if (!raceFilter) return reorderItemsByNameList(allItems, text);

  const isInScope = (it) => itemVisibleForRace(it.item_gender, raceFilter);
  const scoped = (allItems || []).filter(isInScope);
  const reorderedScoped = reorderItemsByNameList(scoped, text);
  let si = 0;
  return (allItems || []).map((it) => (isInScope(it) ? reorderedScoped[si++] : it));
}

/** Import đầy đủ: thứ tự + options (structured) hoặc tên (legacy) */
export function applyShopOrderImport(allItems, text, raceFilter, itemVisibleForRace) {
  const parsed = parseShopOrderText(text);

  // Structured: luôn áp dụng toàn tab (file xuất theo tab, không theo lọc tộc)
  if (parsed.format === 'structured') {
    return applyStructuredImportExact(allItems, sortEntriesForImport(parsed.entries));
  }

  return reorderItemsByNameListForRace(allItems, text, raceFilter, itemVisibleForRace);
}

/** Kết quả import + thống kê khớp dòng */
export function evaluateShopOrderImport(allItems, text, raceFilter, itemVisibleForRace, templateMap = {}) {
  const parsed = parseShopOrderText(text);
  const preview = parseImportPreviewForRace(allItems, text, raceFilter, itemVisibleForRace, templateMap);
  const next = applyShopOrderImport(allItems, text, raceFilter, itemVisibleForRace);
  let changed = itemsDataChanged(allItems, next);
  let plan = null;

  if (parsed.format === 'structured') {
    plan = planStructuredImport(allItems, sortEntriesForImport(parsed.entries), templateMap);
    changed = changed || plan.willAdd > 0;
  }

  return {
    next,
    preview,
    plan,
    format: parsed.format,
    changed,
    matched: preview.matched,
    willAdd: preview.willAdd ?? 0,
    missingTemplate: preview.missingTemplate ?? 0,
    unknown: preview.unknown,
    lineCount: preview.lineCount,
  };
}

/** Xuất structured + header */
export function exportShopOrderText(items, meta = {}) {
  const header = buildExportHeader(meta);
  const lines = (items || []).map((it, i) => formatStructuredLine(it, i));
  return [header, ...lines].join('\n');
}

export function orderChanged(before, after) {
  if (!before?.length || before.length !== after?.length) return true;
  return before.some((it, i) => it.id !== after[i]?.id);
}

export function itemsDataChanged(before, after) {
  if (orderChanged(before, after)) return true;
  const map = new Map((before || []).map((it) => [it.id, it]));
  return (after || []).some((it) => {
    const prev = map.get(it.id);
    return prev && !optionsEqual(prev.options, it.options);
  });
}

export function buildImportPreviewRows(items, text, templateMap = {}, { templatesLoading = false } = {}) {
  const { entries, nameOnlyLines, format } = parseShopOrderText(text);

  if (format === 'structured') {
    const remaining = [...(items || [])];
    const rows = [];
    const pickCount = new Map();
    let rowNum = 0;
    for (const entry of sortEntriesForImport(entries)) {
      rowNum += 1;
      const idx = findItemIndex(remaining, entry, pickCount);
      if (idx >= 0) {
        const item = remaining[idx];
        rows.push({
          line: entry.raw,
          fileIndex: rowNum,
          item: applyPatches(item, entry),
          matched: true,
          willAdd: false,
          entry,
        });
        remaining.splice(idx, 1);
      } else {
        const tpl = templateMap[entry.tempId];
        if (tpl) {
          rows.push({
            line: entry.raw,
            fileIndex: rowNum,
            item: stubShopItemFromTemplate(entry, tpl),
            matched: false,
            willAdd: true,
            entry,
          });
        } else if (templatesLoading) {
          rows.push({
            line: entry.raw,
            fileIndex: rowNum,
            item: null,
            matched: false,
            willAdd: false,
            pendingTemplate: true,
            entry,
          });
        } else {
          rows.push({
            line: entry.raw,
            fileIndex: rowNum,
            item: null,
            matched: false,
            willAdd: false,
            missingTemplate: true,
            entry,
          });
        }
      }
    }
    return { rows, trailing: remaining, format };
  }

  const lines = nameOnlyLines;
  const remaining = [...(items || [])];
  const rows = [];

  for (const line of lines) {
    const want = normalizeItemName(line);
    const idx = remaining.findIndex((it) => normalizeItemName(it.item_name) === want);
    if (idx >= 0) {
      rows.push({ line, item: remaining[idx], matched: true });
      remaining.splice(idx, 1);
    } else {
      rows.push({ line, item: null, matched: false });
    }
  }

  return { rows, trailing: remaining, format: 'names' };
}

export function parseImportPreview(items, text, templateMap = {}, opts = {}) {
  const { rows, trailing, format } = buildImportPreviewRows(items, text, templateMap, opts);
  const matched = rows.filter((r) => r.matched).length;
  const willAdd = rows.filter((r) => r.willAdd).length;
  const missingTemplate = rows.filter((r) => r.missingTemplate).length;
  const unknown = rows.filter((r) => !r.matched && !r.willAdd).length;
  return {
    lineCount: rows.length,
    matched,
    willAdd,
    missingTemplate,
    unknown,
    trailing: trailing.length,
    rows,
    trailingItems: trailing,
    format,
  };
}

export function parseImportPreviewForRace(allItems, text, raceFilter, itemVisibleForRace, templateMap = {}, opts = {}) {
  const { format } = parseShopOrderText(text);
  const totalCount = (allItems || []).length;

  if (format === 'structured') {
    const base = parseImportPreview(allItems, text, templateMap, opts);
    return {
      ...base,
      scopedCount: totalCount,
      totalCount,
      hiddenCount: 0,
      hiddenItems: [],
      appliesToFullTab: true,
    };
  }

  const scoped = filterItemsForRace(allItems, raceFilter, itemVisibleForRace);
  const hiddenItems = raceFilter
    ? (allItems || []).filter((it) => !itemVisibleForRace(it.item_gender, raceFilter))
    : [];
  const base = parseImportPreview(scoped, text, templateMap);
  return {
    ...base,
    scopedCount: scoped.length,
    totalCount,
    hiddenCount: hiddenItems.length,
    hiddenItems,
    appliesToFullTab: false,
  };
}

/** @deprecated — dùng exportShopOrderText */
export function exportShopItemNames(items) {
  return exportShopOrderText(items, {});
}
