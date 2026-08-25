import { useEffect, useMemo, useRef, useState } from 'react';
import { api, getServerId } from '../api';
import { formatLiveSync } from '../utils/liveSync';
import {
  genderLabel,
  hasGenderOverride,
  itemVisibleForRace,
  parseGenderOverride,
  patchShopItemGender,
} from '../utils/shopRace';
import {
  evaluateShopOrderImport,
  exportShopOrderText,
  extractImportTempIds,
  filterItemsForRace,
  formatOptionsString,
  parseImportPreviewForRace,
  parseShopOrderText,
  planStructuredImport,
  templateMapFromList,
  applyStructuredImportExact,
  alignCreatedItems,
  sortEntriesForImport,
  withImportSortOrder,
} from '../utils/shopItemOrder';
import ShopOrderPreview from './ShopOrderPreview';
import ItemIcon from './ItemIcon';
import { OptionEditor, OptionChips, useOptionMap } from './OptionEditor';
import ShopGenderField from './ShopGenderField';
import ShopPowerRequireField from './ShopPowerRequireField';
import ShopRacePills from './ShopRacePills';
import { useShopRacePreview } from '../hooks/useShopRacePreview';

const TYPE_SELL = [
  { value: 0, label: 'Vàng' },
  { value: 1, label: 'Ngọc' },
  { value: 3, label: 'Hồng ngọc' },
  { value: 4, label: 'Coupon' },
];

const CATALOG_PAGE = 50;

function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

function matchesItemQuery(it, qRaw) {
  const q = String(qRaw || '').trim().toLowerCase();
  if (!q) return true;
  const num = Number(q);
  if (!Number.isNaN(num) && Number(it.temp_id) === num) return true;
  if (String(it.temp_id).includes(q)) return true;
  return String(it.item_name || '').toLowerCase().includes(q);
}

function isShopItemNew(it) {
  return Number(it?.is_new) === 1;
}

export default function ShopTabEditor({ tab, shopId, shopMeta, onRefresh, onFeedback }) {
  const [items, setItems] = useState(tab.items || []);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [catalogQ, setCatalogQ] = useState('');
  const [shopItemQ, setShopItemQ] = useState('');
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState(() => new Set());
  const [selectedShopIds, setSelectedShopIds] = useState(() => new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({ cost: '', type_sell: '', is_sell: '', is_new: '' });
  const [defaultCost, setDefaultCost] = useState(1000);
  const [defaultTypeSell, setDefaultTypeSell] = useState(0);
  const [saving, setSaving] = useState(false);
  const [raceFilter, setRaceFilter] = useShopRacePreview();
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);
  const [orderIoOpen, setOrderIoOpen] = useState(false);
  const [orderIoText, setOrderIoText] = useState('');
  const [importTemplates, setImportTemplates] = useState({});
  const [importTemplatesLoading, setImportTemplatesLoading] = useState(false);
  const optionMap = useOptionMap();
  const itemsDirtyRef = useRef(false);

  useEffect(() => {
    itemsDirtyRef.current = false;
    setItems(tab.items || []);
  }, [tab.id]);

  useEffect(() => {
    if (itemsDirtyRef.current) return;
    setItems(tab.items || []);
  }, [tab.items]);

  useEffect(() => {
    setSelectedIdx(null);
    setShopItemQ('');
    setCatalogQ('');
    setDragIdx(null);
    setDropIdx(null);
    setOrderIoOpen(false);
    setOrderIoText('');
    setSelectedCatalogIds(new Set());
    setSelectedShopIds(new Set());
    setBulkEditOpen(false);
    setBulkEditForm({ cost: '', type_sell: '', is_sell: '', is_new: '' });
  }, [tab.id]);

  useEffect(() => {
    let cancelled = false;
    const q = catalogQ.trim();
    const t = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const params = new URLSearchParams({ limit: '80' });
        if (q) params.set('q', q);
        if (raceFilter) params.set('race', raceFilter);
        const res = await api(`/shops/meta/item-templates?${params}`);
        if (!cancelled) {
          setCatalog(res.data || []);
          setCatalogPage(0);
        }
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [catalogQ, raceFilter]);

  const catalogFiltered = useMemo(
    () => catalog.filter((it) => itemVisibleForRace(it.gender, raceFilter)),
    [catalog, raceFilter]
  );
  const catalogPages = Math.max(1, Math.ceil(catalogFiltered.length / CATALOG_PAGE));
  const catalogSlice = catalogFiltered.slice(
    catalogPage * CATALOG_PAGE,
    (catalogPage + 1) * CATALOG_PAGE
  );
  const shopRows = useMemo(
    () => items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => itemVisibleForRace(it.item_gender, raceFilter)),
    [items, raceFilter]
  );
  const shopRowsVisible = useMemo(
    () => shopRows.filter(({ it }) => matchesItemQuery(it, shopItemQ)),
    [shopRows, shopItemQ]
  );
  const visibleCatalogIds = useMemo(() => catalogSlice.map((it) => it.id), [catalogSlice]);
  const visibleShopIds = useMemo(() => shopRowsVisible.map(({ it }) => it.id), [shopRowsVisible]);
  const allVisibleCatalogSelected = visibleCatalogIds.length > 0
    && visibleCatalogIds.every((id) => selectedCatalogIds.has(id));
  const allVisibleShopSelected = visibleShopIds.length > 0
    && visibleShopIds.every((id) => selectedShopIds.has(id));
  const hiddenCount = items.length - shopRows.length;
  const selected = selectedIdx != null ? items[selectedIdx] : null;
  const inShopIds = useMemo(() => new Set(items.map((it) => it.temp_id)), [items]);
  const addableCatalogCount = catalog.filter((it) => selectedCatalogIds.has(it.id) && !inShopIds.has(it.id)).length;
  const selectedExistingCatalogCount = selectedCatalogIds.size - addableCatalogCount;

  const raceSummary = raceFilter === ''
    ? `Toàn bộ DB · tab ${items.length} item`
    : `Player ${genderLabel(raceFilter)}: ${shopRows.length}/${items.length} item trong tab${
        hiddenCount ? ` · ${hiddenCount} ẩn` : ''
      }`;

  const canDragReorder = !shopItemQ.trim();
  const importTempIds = useMemo(
    () => (orderIoOpen ? extractImportTempIds(orderIoText) : []),
    [orderIoOpen, orderIoText]
  );

  useEffect(() => {
    if (!orderIoOpen || !importTempIds.length) {
      setImportTemplates({});
      setImportTemplatesLoading(false);
      return undefined;
    }
    let cancelled = false;
    setImportTemplatesLoading(true);
    (async () => {
      try {
        const res = await api(`/shops/meta/item-templates/batch?ids=${importTempIds.join(',')}`);
        if (!cancelled) setImportTemplates(templateMapFromList(res.data || []));
      } catch {
        if (!cancelled) setImportTemplates({});
      } finally {
        if (!cancelled) setImportTemplatesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderIoOpen, importTempIds.join(',')]);

  const orderImportPreview = useMemo(
    () => parseImportPreviewForRace(items, orderIoText, '', itemVisibleForRace, importTemplates, {
      templatesLoading: importTemplatesLoading,
    }),
    [items, orderIoText, importTemplates, importTemplatesLoading]
  );
  const orderIoSummary = `Import thứ tự: ${orderImportPreview.lineCount || 0} dòng file · tab hiện ${items.length} item`;
  const importApplyBlocked = importTemplatesLoading
    && orderImportPreview.format === 'structured'
    && orderImportPreview.lineCount > 0
    && (orderImportPreview.willAdd > 0 || orderImportPreview.rows?.some((r) => r.pendingTemplate));

  useEffect(() => {
    setCatalogPage(0);
    setSelectedCatalogIds(new Set());
  }, [catalogQ, raceFilter]);

  function patchLocal(idx, patch) {
    itemsDirtyRef.current = true;
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function withServer(body = {}) {
    return JSON.stringify({ ...body, serverId: getServerId() });
  }

  function toggleSelection(setter, id) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleSelection(setter, ids, shouldSelect) {
    setter((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (shouldSelect ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function toggleCatalogSelection(id) {
    toggleSelection(setSelectedCatalogIds, id);
  }

  function toggleShopSelection(id) {
    toggleSelection(setSelectedShopIds, id);
  }

  async function addSelectedCatalog() {
    const templates = catalog.filter((it) => selectedCatalogIds.has(it.id) && !inShopIds.has(it.id));
    if (!templates.length) {
      onFeedback?.('Các item đã chọn đều đang có trong tab — không thêm trùng.', 'info');
      return;
    }
    setSaving(true);
    try {
      const res = await api(`/shops/tabs/${tab.id}/items/bulk-create`, {
        method: 'POST',
        body: withServer({
          items: templates.map((template) => ({
            temp_id: template.id,
            cost: defaultCost,
            type_sell: defaultTypeSell,
            is_sell: 1,
            options: [],
          })),
        }),
      });
      const count = res.data?.count ?? templates.length;
      onFeedback?.(`Đã thêm ${count} item vào tab với giá mặc định${formatLiveSync(res?.data)}`, 'success');
      setSelectedCatalogIds(new Set());
      await onRefresh?.();
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function applyBulkEdit() {
    const ids = new Set([...selectedShopIds]);
    const hasPatch = Object.values(bulkEditForm).some((value) => value !== '');
    if (!ids.size || !hasPatch) return;
    const next = items.map((it) => {
      if (!ids.has(it.id)) return it;
      const patch = {};
      if (bulkEditForm.cost !== '') patch.cost = Number(bulkEditForm.cost);
      if (bulkEditForm.type_sell !== '') patch.type_sell = Number(bulkEditForm.type_sell);
      if (bulkEditForm.is_sell !== '') patch.is_sell = Number(bulkEditForm.is_sell);
      if (bulkEditForm.is_new !== '') patch.is_new = Number(bulkEditForm.is_new);
      return { ...it, ...patch };
    });
    setSaving(true);
    try {
      const res = await api(`/shops/tabs/${tab.id}/items/bulk`, {
        method: 'PUT',
        body: withServer({ items: next.filter((it) => ids.has(it.id)).map(itemSavePayload) }),
      });
      setItems(next);
      itemsDirtyRef.current = false;
      const count = res.data?.saved ?? ids.size;
      onFeedback?.(`Đã cập nhật nhanh ${count} item${formatLiveSync(res?.data)} — đóng shop rồi mở lại NPC`, 'success');
      setSelectedShopIds(new Set());
      setBulkEditOpen(false);
      setBulkEditForm({ cost: '', type_sell: '', is_sell: '', is_new: '' });
      await onRefresh?.();
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function fetchImportTemplateMap(tempIds) {
    const ids = [...new Set((tempIds || []).filter((id) => id > 0 && !Number.isNaN(Number(id))))];
    if (!ids.length) return {};
    const merged = [];
    for (let i = 0; i < ids.length; i += 80) {
      const chunk = ids.slice(i, i + 80);
      const res = await api(`/shops/meta/item-templates/batch?ids=${chunk.join(',')}`);
      merged.push(...(res.data || []));
    }
    return templateMapFromList(merged);
  }

  async function persistOrder(nextItems) {
    const order = nextItems
      .map((it) => Number(it.id))
      .filter((id) => !Number.isNaN(id) && id > 0);
    if (!order.length) return null;
    const res = await api(`/shops/tabs/${tab.id}/reorder`, {
      method: 'POST',
      body: withServer({ order }),
    });
    return res;
  }

  async function moveAndSave(from, to) {
    if (from === to) return;
    const next = moveItem(items, from, to);
    await applyOrder(next, from, to);
  }

  function remapSelectedIdx(from, to, prevSelected) {
    if (prevSelected == null) return null;
    if (prevSelected === from) return to;
    if (from < prevSelected && to >= prevSelected) return prevSelected - 1;
    if (from > prevSelected && to <= prevSelected) return prevSelected + 1;
    return prevSelected;
  }

  async function applyOrder(next, from = null, to = null) {
    const prevSelected = selectedIdx;
    itemsDirtyRef.current = true;
    setItems(next);
    if (from != null && to != null) {
      setSelectedIdx(remapSelectedIdx(from, to, prevSelected));
    } else if (selected?.id != null) {
      const ni = next.findIndex((it) => it.id === selected.id);
      setSelectedIdx(ni >= 0 ? ni : null);
    }
    try {
      const res = await persistOrder(next);
      const syncNote = formatLiveSync(res?.data);
      itemsDirtyRef.current = false;
      onFeedback?.(`Đã cập nhật thứ tự trong SQL${syncNote} — đóng shop trong game rồi mở lại NPC`, 'success');
      await onRefresh?.();
    } catch (e) {

      onFeedback?.(e.message, 'error');
      onRefresh?.();
    }
  }

  function handleExportOrderList() {
    const text = exportShopOrderText(items, {
      npcId: shopMeta?.npcId ?? shopId,
      tagName: shopMeta?.tagName,
      tabId: tab.id,
      tabName: tab.name,
    });
    setOrderIoText(text);
    setOrderIoOpen(true);
    if (text && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    onFeedback?.(
      `Đã xuất ${items.length} dòng toàn tab — sort|temp_id|tên|option`,
      'success'
    );
  }

  async function handleImportOrderList() {
    const parsed = parseShopOrderText(orderIoText);
    const importEntries = parsed.format === 'structured'
      ? sortEntriesForImport(parsed.entries)
      : parsed.entries;

    let tmap = importTemplates;
    if (parsed.format === 'structured' && importEntries.length) {
      try {
        tmap = await fetchImportTemplateMap(importEntries.map((e) => e.tempId));
        setImportTemplates(tmap);
      } catch (e) {
        onFeedback?.(e.message, 'error');
        return;
      }
    }

    const result = evaluateShopOrderImport(
      items,
      orderIoText,
      '',
      itemVisibleForRace,
      tmap
    );
    const {
      matched,
      willAdd,
      missingTemplate,
      lineCount,
      format,
      changed,
    } = result;

    if (format === 'structured' && matched === 0 && willAdd === 0) {
      onFeedback?.(
        lineCount > 0
          ? missingTemplate > 0
            ? `Không thêm được (${missingTemplate} temp_id không có trong item_template)`
            : 'Không khớp dòng nào — kiểm tra temp_id hoặc đợi tải template'
          : 'Không có dòng structured — cần sort|temp_id|tên|option (dòng # là comment)',
        'error'
      );
      return;
    }
    if (!changed) {
      onFeedback?.(
        format === 'structured'
          ? `Đã khớp ${matched}/${lineCount} dòng — thứ tự và option trùng file, không cần lưu`
          : 'Thứ tự đã khớp — không cần lưu',
        'success'
      );
      return;
    }

    const selectedId = selected?.id;
    setSaving(true);
    try {
      let working = [...items];
      let addedCount = 0;

      if (format === 'structured' && importEntries.length) {
        const plan = planStructuredImport(working, importEntries, tmap);
        if (plan.toCreate.length) {
          const createRes = await api(`/shops/tabs/${tab.id}/items/bulk-create`, {
            method: 'POST',
            body: withServer({
              items: plan.toCreate.map(({ entry }) => ({
                temp_id: entry.tempId,
                cost: defaultCost,
                type_sell: defaultTypeSell,
                is_sell: 1,
                options: entry.hasOptionsColumn && entry.options != null ? entry.options : [],
              })),
            }),
          });
          const created = alignCreatedItems(plan.toCreate, createRes.data?.created || []);
          working = [...working, ...created];
          addedCount = created.length;
        }
      }

      const next = withImportSortOrder(
        format === 'structured'
          ? applyStructuredImportExact(working, importEntries)
          : result.next
      );

      let removedCount = 0;
      if (format === 'structured') {
        const keepIds = new Set(
          next.map((it) => Number(it.id)).filter((id) => !Number.isNaN(id) && id > 0)
        );
        const toRemove = items.filter((it) => it.id && !keepIds.has(Number(it.id)));
        for (const it of toRemove) {
          await api(`/shops/items/${it.id}`, { method: 'DELETE', body: withServer({}) });
          removedCount += 1;
        }
      }

      setItems(next);
      if (selectedId != null) {
        const ni = next.findIndex((it) => it.id === selectedId);
        setSelectedIdx(ni >= 0 ? ni : null);
      }

      await persistOrder(next);
      const res = await api(`/shops/tabs/${tab.id}/items/bulk`, {
        method: 'PUT',
        body: withServer({ items: next.map(itemSavePayload) }),
      });

      const skipNote = missingTemplate > 0 ? ` · bỏ qua ${missingTemplate} dòng (không có template)` : '';
      const removedNote = removedCount > 0 ? ` · xóa ${removedCount} item không trong file` : '';
      itemsDirtyRef.current = false;
      onFeedback?.(
        `Đã lưu ${next.length} item vào SQL${addedCount ? ` (+${addedCount} mới)` : ''}${removedNote}${skipNote}${formatLiveSync(res?.data)} — đóng shop rồi mở lại NPC`,
        'success'
      );
      setOrderIoOpen(false);

      await onRefresh?.();
    } catch (e) {
      onFeedback?.(e.message, 'error');
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(idx, e) {
    if (!canDragReorder || saving) {
      e.preventDefault();
      return;
    }
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function handleDragOver(idx, e) {
    if (!canDragReorder || dragIdx == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropIdx !== idx) setDropIdx(idx);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setDropIdx(null);
  }

  async function handleDrop(idx, e) {
    e.preventDefault();
    const from = dragIdx;
    handleDragEnd();
    if (from == null || from === idx) return;
    await moveAndSave(from, idx);
  }

  async function addFromCatalog(template) {
    setSaving(true);
    try {
      const res = await api(`/shops/tabs/${tab.id}/items`, {
        method: 'POST',
        body: withServer({
          temp_id: template.id,
          cost: defaultCost,
          type_sell: defaultTypeSell,
          is_sell: 1,
          options: [],
        }),
      });
      onFeedback?.(`Đã thêm ${template.name}${formatLiveSync(res?.data)}`, 'success');
      await onRefresh?.();
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function itemSavePayload(it) {
    return {
      id: it.id,
      cost: Number(it.cost),
      type_sell: Number(it.type_sell),
      is_sell: it.is_sell ? 1 : 0,
      icon_spec: Number(it.icon_spec) || 0,
      is_new: isShopItemNew(it) ? 1 : 0,
      gender_override: parseGenderOverride(it.gender_override),
      options: (it.options || []).map((o) => ({ id: o.id, param: o.param ?? 0 })),
    };
  }

  function patchItemGender(idx, genderOverride) {
    itemsDirtyRef.current = true;
    setItems((prev) => prev.map((it, i) => (
      i === idx ? { ...it, ...patchShopItemGender(it, genderOverride) } : it
    )));
  }

  async function saveItem(idx) {
    const it = items[idx];
    setSaving(true);
    try {
      const res = await api(`/shops/items/${it.id}`, {
        method: 'PUT',
        body: withServer(itemSavePayload(it)),
      });
      const raceNote = hasGenderOverride(it.gender_override) ? ' · đã lưu tộc ghi đè' : '';
      onFeedback?.(
        `Đã lưu item shop${raceNote}${isShopItemNew(it) ? ' · nhãn NEW bật trong game' : ''}${formatLiveSync(res?.data)} — đóng shop rồi mở lại NPC`,
        'success'
      );
      itemsDirtyRef.current = false;
      await onRefresh?.();
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveAllItems() {
    if (!items.length) return;
    setSaving(true);
    try {
      const res = await api(`/shops/tabs/${tab.id}/items/bulk`, {
        method: 'PUT',
        body: withServer({ items: items.map(itemSavePayload) }),
      });
      const n = res?.data?.saved ?? items.length;
      onFeedback?.(
        `Đã lưu ${n} item trong tab${formatLiveSync(res?.data)} — đóng shop rồi mở lại NPC`,
        'success'
      );
      itemsDirtyRef.current = false;
      await onRefresh?.();
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(idx) {
    const it = items[idx];
    if (!confirm(`Xóa "${it.item_name || it.temp_id}" khỏi shop?`)) return;
    setSaving(true);
    try {
      const res = await api(`/shops/items/${it.id}`, {
        method: 'DELETE',
        body: withServer({}),
      });
      onFeedback?.(`Đã xóa item${formatLiveSync(res?.data)}`, 'success');
      setSelectedIdx(null);
      await onRefresh?.();
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shop-tab-editor">
      <div className="shop-toolbar">
        <div className="shop-toolbar-steps muted">
          <span>1. Tộc</span>
          <span>2. Thêm</span>
          <span>3. Tab shop</span>
          <span>4. Chi tiết</span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            className="btn sm primary shop-toolbar-save-all"
            disabled={saving}
            onClick={saveAllItems}
          >
            Lưu tất cả ({items.length})
          </button>
        )}
      </div>

      <ShopRacePills value={raceFilter} onChange={setRaceFilter} summary={raceSummary} />

      <div className="shop-workspace">
        <section className="shop-panel shop-panel-catalog card-inner" aria-label="Thêm item">
          <div className="shop-panel-head">
            <h4>① Thêm item</h4>
            <span className="muted shop-panel-hint">item_template</span>
          </div>
          <div className="row shop-defaults">
            <label className="field mini">
              Giá mặc định
              <input type="number" min={0} value={defaultCost} onChange={(e) => setDefaultCost(Number(e.target.value))} />
            </label>
            <label className="field mini">
              Loại tiền
              <select value={defaultTypeSell} onChange={(e) => setDefaultTypeSell(Number(e.target.value))}>
                {TYPE_SELL.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <input
            className="catalog-search"
            placeholder="Tìm theo tên hoặc ID: thỏi vàng, 457, ngọc..."
            value={catalogQ}
            onChange={(e) => setCatalogQ(e.target.value)}
          />
          <div className="shop-bulk-bar">
            <label className="toggle-empty shop-select-all">
              <input
                type="checkbox"
                checked={allVisibleCatalogSelected}
                onChange={(e) => toggleVisibleSelection(setSelectedCatalogIds, visibleCatalogIds, e.target.checked)}
                disabled={catalogLoading || visibleCatalogIds.length === 0 || saving}
              />
              Chọn trang này
            </label>
            <span className="muted">
              {selectedCatalogIds.size
                ? `Đã chọn ${selectedCatalogIds.size} item${selectedExistingCatalogCount ? ` · ${selectedExistingCatalogCount} đã có` : ''}`
                : 'Chọn nhiều item để thêm một lần'}
            </span>
            {selectedCatalogIds.size > 0 && (
              <button type="button" className="btn sm primary" disabled={saving || addableCatalogCount === 0} onClick={addSelectedCatalog}>
                + Thêm {addableCatalogCount} item mới
              </button>
            )}
          </div>
          <div className="option-template-table-wrap giftcode-catalog-table shop-catalog-table">
            <table className="compact">
              <thead><tr><th className="col-check" /><th className="col-icon" /><th>ID</th><th>Tên</th><th>Tộc</th><th /></tr></thead>
              <tbody>
                {catalogLoading && <tr><td colSpan={6} className="muted">Đang tải danh sách item...</td></tr>}
                {!catalogLoading && catalogFiltered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      {raceFilter
                        ? `Không có item cho ${genderLabel(raceFilter)} (và Chung). Thử từ khóa khác hoặc đổi bộ lọc tộc.`
                        : 'Không tìm thấy item. Thử ID hoặc tên khác.'}
                    </td>
                  </tr>
                )}
                {!catalogLoading && catalogSlice.map((it) => (
                  <tr key={it.id} className={inShopIds.has(it.id) ? 'row-active' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${it.name}`}
                        checked={selectedCatalogIds.has(it.id)}
                        onChange={() => toggleCatalogSelection(it.id)}
                        disabled={saving}
                      />
                    </td>
                    <td><ItemIcon iconId={it.icon_id} tempId={it.id} name={it.name} size={32} /></td>
                    <td><strong>{it.id}</strong></td>
                    <td>{it.name}</td>
                    <td><span className="badge">{genderLabel(it.gender)}</span></td>
                    <td>
                      <button type="button" className="btn sm primary" disabled={saving} onClick={() => addFromCatalog(it)}>
                        {inShopIds.has(it.id) ? '+ Nữa' : '+ Thêm'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {catalogFiltered.length > CATALOG_PAGE && (
            <div className="row catalog-pagination">
              <button type="button" className="btn sm" disabled={catalogPage <= 0} onClick={() => setCatalogPage((p) => p - 1)}>←</button>
              <span className="muted">
                Trang {catalogPage + 1}/{catalogPages} · {catalogFiltered.length} item
                {raceFilter ? ` · ${genderLabel(raceFilter)}` : ''}
                {catalogQ.trim() ? '' : ' (mẫu — gõ tìm thêm)'}
              </span>
              <button type="button" className="btn sm" disabled={catalogPage >= catalogPages - 1} onClick={() => setCatalogPage((p) => p + 1)}>→</button>
            </div>
          )}
        </section>

        <section className="shop-panel shop-panel-items card-inner" aria-label="Item trong tab">
          <div className="shop-panel-head">
            <h4>
              ② Tab shop
              {' '}
              <span className="shop-count-badge">
                {shopItemQ.trim()
                  ? `${shopRowsVisible.length}/${shopRows.length}`
                  : raceFilter
                    ? shopRows.length
                    : items.length}
              </span>
            </h4>
            {items.length > 0 && (
              <div className="shop-panel-head-actions">
                <button type="button" className="btn sm" disabled={saving} onClick={handleExportOrderList}>
                  Xuất tên
                </button>
                <button type="button" className="btn sm" disabled={saving} onClick={() => {
                  setOrderIoOpen((o) => !o);
                  if (!orderIoOpen && !orderIoText) {
                    setOrderIoText(exportShopOrderText(items, {
                      npcId: shopMeta?.npcId ?? shopId,
                      tagName: shopMeta?.tagName,
                      tabId: tab.id,
                      tabName: tab.name,
                    }));
                  }
                }}>
                  Nhập thứ tự
                </button>
              </div>
            )}
          </div>
          <p className="muted shop-panel-hint shop-panel-hint-block">
            {canDragReorder
              ? 'Kéo ⋮⋮ để sắp xếp · ↑↓ · bấm dòng → chi tiết'
              : 'Tắt bộ lọc tìm để kéo thả sắp xếp · bấm dòng → chi tiết'}
          </p>
          {orderIoOpen && (
            <div className="shop-order-io">
              <p className="muted shop-order-io-scope">{orderIoSummary}</p>
              <div className="shop-order-io-split">
                <label className="field shop-order-io-text">
                  <span>
                    Định dạng:
                    {' '}
                    <code>thứ tự|temp_id|tên|option_id:param;...</code>
                    {' '}
                    · áp dụng toàn tab, thêm item thiếu, đúng thứ tự file
                  </span>
                  <textarea
                    rows={10}
                    value={orderIoText}
                    onChange={(e) => setOrderIoText(e.target.value)}
                    placeholder={'# NPC 39 Santa | Tab 1: Cải\n0|885|CT Lích Tên béo|210:4;38:0\n1|878|Cải trang Cooler vàng|50:23;103:19'}
                    className="shop-order-io-code"
                  />
                </label>
                <ShopOrderPreview
                  title="Xem trước (trên → dưới)"
                  rows={orderImportPreview.rows}
                  trailing={orderImportPreview.trailingItems}
                  hidden={orderImportPreview.hiddenItems}
                  genderLabel={genderLabel}
                  showTrailing={false}
                />
              </div>
              <p className="muted shop-order-io-hint">
                {orderImportPreview.format === 'structured' ? 'Structured: sort|temp_id|tên|option' : 'Chỉ tên (legacy)'}
                {importTemplatesLoading ? ' · đang tra template…' : ''}
                {' · '}
                Khớp {orderImportPreview.matched}/
                {orderImportPreview.format === 'structured' ? orderImportPreview.lineCount : orderImportPreview.scopedCount}
                {orderImportPreview.willAdd > 0 ? ` · +${orderImportPreview.willAdd} sẽ thêm vào tab` : ''}
                {orderImportPreview.missingTemplate > 0
                  ? ` · ${orderImportPreview.missingTemplate} không có template`
                  : ''}
                {orderImportPreview.trailing > 0
                  ? ` · ${orderImportPreview.trailing} item tab cũ sẽ bỏ (không có trong file)`
                  : ''}
              </p>
              <div className="row shop-order-io-actions">
                <button type="button" className="btn sm" onClick={handleExportOrderList}>Xuất lại</button>
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={saving || importApplyBlocked}
                  onClick={handleImportOrderList}
                >
                  Áp dụng thứ tự + option
                </button>
                <button type="button" className="btn sm ghost" onClick={() => setOrderIoOpen(false)}>Đóng</button>
              </div>
            </div>
          )}
          {items.length > 0 && shopRows.length > 0 && (
            <input
              className="catalog-search shop-in-tab-search"
              placeholder="Tìm trong tab: tên, ID (vd. lích, 1566)..."
              value={shopItemQ}
              onChange={(e) => setShopItemQ(e.target.value)}
            />
          )}
          {items.length > 0 && shopRowsVisible.length > 0 && (
            <div className="shop-bulk-bar shop-bulk-existing">
              <label className="toggle-empty shop-select-all">
                <input
                  type="checkbox"
                  checked={allVisibleShopSelected}
                  onChange={(e) => toggleVisibleSelection(setSelectedShopIds, visibleShopIds, e.target.checked)}
                  disabled={saving}
                />
                Chọn item hiển thị
              </label>
              <span className="muted">{selectedShopIds.size ? `Đã chọn ${selectedShopIds.size}` : 'Chọn nhiều để sửa giá/trạng thái'}</span>
              {selectedShopIds.size > 0 && (
                <>
                  <button type="button" className="btn sm" disabled={saving} onClick={() => setBulkEditOpen((open) => !open)}>
                    {bulkEditOpen ? 'Đóng chỉnh nhanh' : 'Chỉnh nhanh'}
                  </button>
                  <button type="button" className="btn sm ghost" disabled={saving} onClick={() => setSelectedShopIds(new Set())}>
                    Bỏ chọn
                  </button>
                </>
              )}
            </div>
          )}
          {bulkEditOpen && selectedShopIds.size > 0 && (
            <div className="shop-bulk-editor card-inner">
              <div className="shop-bulk-editor-head">
                <strong>Chỉnh nhanh {selectedShopIds.size} item</strong>
                <span className="muted">Để trống nếu không muốn thay đổi trường đó</span>
              </div>
              <div className="row">
                <label className="field mini">
                  <span>Giá chung</span>
                  <input type="number" min={0} placeholder="Không đổi" value={bulkEditForm.cost} onChange={(e) => setBulkEditForm({ ...bulkEditForm, cost: e.target.value })} />
                </label>
                <label className="field mini">
                  <span>Loại tiền</span>
                  <select value={bulkEditForm.type_sell} onChange={(e) => setBulkEditForm({ ...bulkEditForm, type_sell: e.target.value })}>
                    <option value="">Không đổi</option>
                    {TYPE_SELL.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className="field mini">
                  <span>Trạng thái bán</span>
                  <select value={bulkEditForm.is_sell} onChange={(e) => setBulkEditForm({ ...bulkEditForm, is_sell: e.target.value })}>
                    <option value="">Không đổi</option>
                    <option value="1">Đang bán</option>
                    <option value="0">Tạm ẩn</option>
                  </select>
                </label>
                <label className="field mini">
                  <span>Nhãn NEW</span>
                  <select value={bulkEditForm.is_new} onChange={(e) => setBulkEditForm({ ...bulkEditForm, is_new: e.target.value })}>
                    <option value="">Không đổi</option>
                    <option value="1">Bật</option>
                    <option value="0">Tắt</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={saving || !Object.values(bulkEditForm).some((value) => value !== '')}
                  onClick={applyBulkEdit}
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}
          {items.length === 0 ? (
            <p className="muted empty-hint">Tab trống. Thêm item từ danh sách bên trái.</p>
          ) : shopRows.length === 0 ? (
            <p className="muted empty-hint">Không có item nào cho tộc đã chọn — đổi bộ lọc hoặc thêm item đúng gender trong item_template.</p>
          ) : shopRowsVisible.length === 0 ? (
            <p className="muted empty-hint">Không khớp &quot;{shopItemQ.trim()}&quot; — thử ID hoặc tên khác.</p>
          ) : (
            <ul className="shop-item-list">
              {shopRowsVisible.map(({ it, idx }) => (
                <li
                  key={it.id}
                  className={`shop-item-card ${selectedIdx === idx ? 'selected' : ''} ${dragIdx === idx ? 'dragging' : ''} ${dropIdx === idx && dragIdx !== idx ? 'drop-target' : ''}`}
                  onDragOver={(e) => handleDragOver(idx, e)}
                  onDrop={(e) => handleDrop(idx, e)}
                >
                  <div className="shop-item-card-top">
                    <label className="shop-item-select" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${it.item_name || `item ${it.temp_id}`}`}
                        checked={selectedShopIds.has(it.id)}
                        onChange={() => toggleShopSelection(it.id)}
                        disabled={saving}
                      />
                    </label>
                    <span
                      className={`shop-drag-handle ${canDragReorder && !saving ? '' : 'disabled'}`}
                      draggable={canDragReorder && !saving}
                      title={canDragReorder ? 'Kéo để đổi thứ tự' : 'Tắt ô tìm để kéo thả'}
                      onDragStart={(e) => handleDragStart(idx, e)}
                      onDragEnd={handleDragEnd}
                      aria-hidden="true"
                    >
                      ⋮⋮
                    </span>
                    <button
                      type="button"
                      className="shop-item-card-select"
                      onClick={() => setSelectedIdx(idx)}
                    >
                      <ItemIcon iconId={it.icon_id} iconSpec={it.icon_spec} tempId={it.temp_id} name={it.item_name} size={44} />
                      <div className="shop-item-card-title">
                        <span className="shop-item-name">{it.item_name || `Item #${it.temp_id}`}</span>
                        <span className="shop-item-meta muted">
                          #{it.temp_id} · {genderLabel(it.item_gender)} · #{idx + 1}
                        </span>
                        <div className="shop-item-badges">
                          {isShopItemNew(it) && <span className="badge badge-new">NEW</span>}
                          {(it.options || []).length > 0 && (
                            <span className="badge">{it.options.length} opt</span>
                          )}
                        </div>
                      </div>
                    </button>
                    <div className="shop-item-card-fields" onClick={(e) => e.stopPropagation()}>
                      <label className="field mini">
                        <span>Giá</span>
                        <input type="number" min={0} value={it.cost} onChange={(e) => patchLocal(idx, { cost: Number(e.target.value) })} />
                      </label>
                      <label className="field mini">
                        <span>Tiền</span>
                        <select value={it.type_sell ?? 0} onChange={(e) => patchLocal(idx, { type_sell: Number(e.target.value) })}>
                          {TYPE_SELL.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </label>
                      <label className="field toggle-field compact">
                        <span>Bán</span>
                        <input type="checkbox" checked={it.is_sell !== 0} onChange={(e) => patchLocal(idx, { is_sell: e.target.checked ? 1 : 0 })} />
                      </label>
                      <label className="field toggle-field compact" title="Nhãn NEW in-game">
                        <span>New</span>
                        <input
                          type="checkbox"
                          checked={isShopItemNew(it)}
                          onChange={(e) => patchLocal(idx, { is_new: e.target.checked ? 1 : 0 })}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="shop-item-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn sm" title="Lên" disabled={idx === 0 || saving} onClick={() => moveAndSave(idx, idx - 1)}>↑</button>
                    <button type="button" className="btn sm" title="Xuống" disabled={idx === items.length - 1 || saving} onClick={() => moveAndSave(idx, idx + 1)}>↓</button>
                    <button type="button" className="btn sm primary" disabled={saving} onClick={() => saveItem(idx)}>Lưu</button>
                    <button type="button" className="btn danger sm" disabled={saving} onClick={() => removeItem(idx)}>Xóa</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="shop-panel shop-panel-detail card-inner" aria-label="Chi tiết item">
          <div className="shop-panel-head">
            <h4>③ Chi tiết</h4>
            {selected && (
              <button type="button" className="btn sm primary" disabled={saving} onClick={() => saveItem(selectedIdx)}>
                Lưu
              </button>
            )}
          </div>
          {selected ? (
            <div className="shop-detail-body">
              <div className="shop-detail-hero">
                <ItemIcon iconId={selected.icon_id} iconSpec={selected.icon_spec} tempId={selected.temp_id} name={selected.item_name} size={52} />
                <div>
                  <strong className="shop-detail-name">{selected.item_name || `#${selected.temp_id}`}</strong>
                  <p className="muted">
                    #{selected.temp_id} · {genderLabel(selected.item_gender)}
                    {hasGenderOverride(selected.gender_override) ? ' · ghi đè tộc' : ''}
                  </p>
                  <OptionChips options={selected.options} optionMap={optionMap} />
                </div>
              </div>
              <div className="shop-detail-quick row">
                <label className="field mini">
                  <span>icon_spec</span>
                  <input
                    type="number"
                    min={0}
                    value={selected.icon_spec ?? 0}
                    onChange={(e) => patchLocal(selectedIdx, { icon_spec: Number(e.target.value) })}
                  />
                </label>
                <label className="field toggle-field compact">
                  <span>NEW</span>
                  <input
                    type="checkbox"
                    checked={isShopItemNew(selected)}
                    onChange={(e) => patchLocal(selectedIdx, { is_new: e.target.checked ? 1 : 0 })}
                  />
                </label>
              </div>
              <ShopGenderField
                itemId={selected.id}
                templateGender={selected.template_gender ?? selected.item_gender}
                genderOverride={selected.gender_override}
                onChange={(genderOverride) => patchItemGender(selectedIdx, genderOverride)}
              />
              <ShopPowerRequireField
                strRequire={selected.item_str_require ?? 0}
                options={selected.options || []}
                onChange={(options) => patchLocal(selectedIdx, { options })}
              />
              <div className="shop-option-scroll">
                <OptionEditor
                  compact
                  options={selected.options || []}
                  onChange={(options) => patchLocal(selectedIdx, { options })}
                />
              </div>
            </div>
          ) : (
            <div className="shop-detail-empty">
              <p className="muted">Chọn một item ở cột «Tab shop» để chỉnh tộc, option, sức mạnh yêu cầu và icon.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
