import { useEffect, useMemo, useRef, useState } from 'react';
import { api, getServerId } from '../api';
import {
  genderLabel,
  itemVisibleForRace,
  parseGenderOverride,
  patchShopItemGender,
} from '../utils/shopRace';
import {
  exportShopOrderText,
} from '../utils/shopItemOrder';
import ItemIcon from './ItemIcon';
import { OptionEditor, useOptionMap } from './OptionEditor';
import ShopRacePills from './ShopRacePills';
import { useShopRacePreview } from '../hooks/useShopRacePreview';

const TYPE_SELL = [
  { value: 0, label: '🟡 Vàng', color: '#eab308' },
  { value: 1, label: '🟢 Ngọc xanh', color: '#10b981' },
  { value: 3, label: '🔴 Hồng ngọc', color: '#ef4444' },
  { value: 4, label: '🎫 Coupon', color: '#8b5cf6' },
];

const PRESET_PACKS = [
  {
    id: 'dragon_balls',
    title: '🌟 Bộ 7 Viên Ngọc Rồng (1 - 7 Sao)',
    desc: 'Bao gồm trọn bộ ngọc rồng từ 1 sao đến 7 sao với giá bán chuẩn',
    items: [
      { temp_id: 14, name: 'Ngọc Rồng 1 Sao', cost: 5000000, type_sell: 0, options: [{ id: 30, param: 0 }] },
      { temp_id: 15, name: 'Ngọc Rồng 2 Sao', cost: 2000000, type_sell: 0, options: [{ id: 30, param: 0 }] },
      { temp_id: 16, name: 'Ngọc Rồng 3 Sao', cost: 1000000, type_sell: 0, options: [{ id: 30, param: 0 }] },
      { temp_id: 17, name: 'Ngọc Rồng 4 Sao', cost: 500000, type_sell: 0, options: [{ id: 30, param: 0 }] },
      { temp_id: 18, name: 'Ngọc Rồng 5 Sao', cost: 300000, type_sell: 0, options: [{ id: 30, param: 0 }] },
      { temp_id: 19, name: 'Ngọc Rồng 6 Sao', cost: 200000, type_sell: 0, options: [{ id: 30, param: 0 }] },
      { temp_id: 20, name: 'Ngọc Rồng 7 Sao', cost: 100000, type_sell: 0, options: [{ id: 30, param: 0 }] },
    ],
  },
  {
    id: 'god_set_td',
    title: '👑 Set Đồ Thần Linh (Trái Đất)',
    desc: 'Full 5 món Thần Linh: Áo, Quần, Găng, Giày, Rada Thần (Có chỉ số khủng)',
    items: [
      { temp_id: 555, name: 'Áo Thần Trái Đất', cost: 1000, type_sell: 3, options: [{ id: 47, param: 1200 }, { id: 77, param: 15 }, { id: 30, param: 0 }] },
      { temp_id: 556, name: 'Quần Thần Trái Đất', cost: 1000, type_sell: 3, options: [{ id: 22, param: 85000 }, { id: 103, param: 15 }, { id: 30, param: 0 }] },
      { temp_id: 562, name: 'Găng Thần Trái Đất', cost: 1500, type_sell: 3, options: [{ id: 0, param: 8500 }, { id: 14, param: 10 }, { id: 30, param: 0 }] },
      { temp_id: 563, name: 'Giày Thần Trái Đất', cost: 1000, type_sell: 3, options: [{ id: 23, param: 80000 }, { id: 30, param: 0 }] },
      { temp_id: 561, name: 'Rada Thần Linh', cost: 1500, type_sell: 3, options: [{ id: 14, param: 12 }, { id: 50, param: 10 }, { id: 30, param: 0 }] },
    ],
  },
  {
    id: 'hot_costumes',
    title: '🦹 Top Cải Trang Hot VIP',
    desc: 'Cải trang Yardrat, Black Goku, Broly (Kèm chỉ số SĐ, HP, KI, HSD 30 ngày)',
    items: [
      { temp_id: 545, name: 'Cải Trang Yardrat', cost: 500, type_sell: 1, is_new: 1, options: [{ id: 50, param: 25 }, { id: 77, param: 20 }, { id: 103, param: 20 }, { id: 93, param: 30 }] },
      { temp_id: 543, name: 'Cải Trang Black Goku', cost: 800, type_sell: 1, is_new: 1, options: [{ id: 50, param: 30 }, { id: 77, param: 30 }, { id: 93, param: 30 }] },
      { temp_id: 421, name: 'Cải Trang Broly', cost: 1000, type_sell: 1, is_new: 1, options: [{ id: 50, param: 35 }, { id: 77, param: 35 }, { id: 93, param: 30 }] },
    ],
  },
  {
    id: 'upgrade_stones',
    title: '💎 Pha Lê Ép Sao & Đá Nâng Cấp',
    desc: 'Trọn bộ 7 loại Pha Lê (Hút HP, Hút KI, Phản Dame, May Mắn, SĐ, HP, KI)',
    items: [
      { temp_id: 441, name: 'Pha Lê Hút Máu', cost: 50, type_sell: 1, options: [{ id: 95, param: 5 }, { id: 30, param: 0 }] },
      { temp_id: 442, name: 'Pha Lê Hút KI', cost: 50, type_sell: 1, options: [{ id: 96, param: 5 }, { id: 30, param: 0 }] },
      { temp_id: 443, name: 'Pha Lê Phản ST', cost: 50, type_sell: 1, options: [{ id: 97, param: 5 }, { id: 30, param: 0 }] },
      { temp_id: 444, name: 'Pha Lê May Mắn', cost: 50, type_sell: 1, options: [{ id: 100, param: 5 }, { id: 30, param: 0 }] },
      { temp_id: 445, name: 'Pha Lê Sức Đánh', cost: 80, type_sell: 1, options: [{ id: 50, param: 5 }, { id: 30, param: 0 }] },
      { temp_id: 446, name: 'Pha Lê Máu HP', cost: 80, type_sell: 1, options: [{ id: 77, param: 5 }, { id: 30, param: 0 }] },
      { temp_id: 447, name: 'Pha Lê KI Mana', cost: 80, type_sell: 1, options: [{ id: 103, param: 5 }, { id: 30, param: 0 }] },
    ],
  },
  {
    id: 'porata_beans',
    title: '💍 Bông Tai Porata & Đậu Thần Cấp 10',
    desc: 'Bông tai hợp thể Porata Cấp 1, Cấp 2, Thỏi Vàng và Đậu Thần cấp 10',
    items: [
      { temp_id: 454, name: 'Bông Tai Porata', cost: 200, type_sell: 1, options: [{ id: 72, param: 2 }, { id: 30, param: 0 }] },
      { temp_id: 921, name: 'Bông Tai Porata Cấp 2', cost: 1500, type_sell: 1, is_new: 1, options: [{ id: 72, param: 2 }, { id: 50, param: 15 }, { id: 77, param: 15 }] },
      { temp_id: 457, name: 'Thỏi Vàng', cost: 37500000, type_sell: 0, options: [{ id: 30, param: 0 }] },
      { temp_id: 9, name: 'Đậu Thần Cấp 10', cost: 10000, type_sell: 0, options: [{ id: 30, param: 0 }] },
    ],
  },
];

export default function ShopTabEditor({ tab, shopId, shopMeta, onRefresh, onFeedback }) {
  const [items, setItems] = useState(tab.items || []);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterQ, setFilterQ] = useState('');
  const [raceFilter, setRaceFilter] = useShopRacePreview();

  // Quick Add state
  const [quickSearch, setQuickSearch] = useState('');
  const [quickResults, setQuickResults] = useState([]);
  const [selectedQuickTemplate, setSelectedQuickTemplate] = useState(null);
  const [quickCost, setQuickCost] = useState(1000);
  const [quickTypeSell, setQuickTypeSell] = useState(0);

  // Selected for bulk
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ cost: '', type_sell: '', is_new: '', is_sell: '' });

  // Option editor modal
  const [optModalItem, setOptModalItem] = useState(null);
  const [optModalIdx, setOptModalIdx] = useState(null);

  // Preset modal
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  // Order IO modal
  const [orderIoOpen, setOrderIoOpen] = useState(false);
  const [orderIoText, setOrderIoText] = useState('');

  const optionMap = useOptionMap();
  const itemsDirtyRef = useRef(false);

  useEffect(() => {
    itemsDirtyRef.current = false;
    setIsDirty(false);
    setItems(tab.items || []);
    setSelectedItemIds(new Set());
  }, [tab.id]);

  useEffect(() => {
    if (itemsDirtyRef.current) return;
    setItems(tab.items || []);
  }, [tab.items]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Autocomplete for quick search
  useEffect(() => {
    const q = quickSearch.trim();
    if (!q) {
      setQuickResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await api('/shops/meta/item-templates?limit=15&q=' + encodeURIComponent(q));
        if (!cancelled) setQuickResults(res.data || []);
      } catch {
        if (!cancelled) setQuickResults([]);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [quickSearch]);

  function withServer(body = {}) {
    return JSON.stringify({ ...body, serverId: getServerId() });
  }

  function markDirty() {
    itemsDirtyRef.current = true;
    setIsDirty(true);
  }

  function patchItem(idx, patch) {
    markDirty();
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function moveItem(from, to) {
    if (to < 0 || to >= items.length) return;
    markDirty();
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  }

  function cloneItem(idx) {
    const it = items[idx];
    if (!it) return;
    markDirty();
    const copy = {
      ...it,
      id: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      options: (it.options || []).map((o) => ({ ...o })),
    };
    const next = [...items];
    next.splice(idx + 1, 0, copy);
    setItems(next);
    onFeedback?.(`Đã nhân bản "${it.item_name || it.temp_id}". Nhớ bấm "Lưu Vào Database"!`, 'success');
  }

  function deleteItem(idx) {
    const it = items[idx];
    if (!confirm(`Xóa "${it.item_name || it.temp_id}" khỏi shop?`)) return;
    markDirty();
    setItems((prev) => prev.filter((_, i) => i !== idx));
    onFeedback?.('Đã xóa item khỏi danh sách. Nhớ bấm "Lưu Vào Database"!', 'success');
  }

  async function handleQuickAdd() {
    let tpl = selectedQuickTemplate;
    const q = quickSearch.trim();
    if (!tpl && q) {
      const num = Number(q.replace(/^[#\s]+/, ''));
      if (!Number.isNaN(num) && num > 0) {
        try {
          const res = await api('/shops/meta/item-templates?limit=1&q=' + num);
          if (res.data?.[0]) tpl = res.data[0];
        } catch {}
      }
      if (!tpl && quickResults.length > 0) {
        tpl = quickResults[0];
      }
    }
    if (!tpl) {
      if (q) {
        onFeedback?.(`Không tìm thấy vật phẩm nào khớp với "${q}". Vui lòng chọn từ gợi ý tìm kiếm.`, 'error');
      } else {
        onFeedback?.('Vui lòng nhập tên hoặc ID vật phẩm để thêm vào shop!', 'error');
      }
      return;
    }
    markDirty();
    const newItem = {
      id: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      temp_id: tpl.id,
      item_name: tpl.name,
      icon_id: tpl.icon_id,
      cost: Number(quickCost) || 0,
      type_sell: Number(quickTypeSell) || 0,
      is_sell: 1,
      is_new: 1,
      gender_override: null,
      options: [],
    };
    setItems((prev) => [newItem, ...prev]);
    setSelectedQuickTemplate(null);
    setQuickSearch('');
    setQuickResults([]);
    onFeedback?.(`Đã thêm "${tpl.name}" (ID #${tpl.id}) vào tab! Bấm nút "💾 Lưu Vào Database" để lưu vĩnh viễn vào MySQL.`, 'success');
  }

  function handleAddPreset(preset) {
    markDirty();
    const newItems = preset.items.map((it, i) => ({
      id: 'preset_' + Date.now() + '_' + i,
      temp_id: it.temp_id,
      item_name: it.name,
      cost: it.cost,
      type_sell: it.type_sell,
      is_sell: 1,
      is_new: it.is_new ? 1 : 0,
      gender_override: null,
      options: it.options || [],
    }));
    setItems((prev) => [...prev, ...newItems]);
    setPresetModalOpen(false);
    onFeedback?.(`Đã thêm gói "${preset.title}" (${newItems.length} item) vào tab. Nhớ bấm "Lưu Vào Database"!`, 'success');
  }

  // Option Editor Modal handlers
  function openOptionModal(it, idx) {
    setOptModalItem(JSON.parse(JSON.stringify(it)));
    setOptModalIdx(idx);
  }

  async function saveOptionModal(andSaveToDb = false) {
    if (optModalIdx == null || !optModalItem) return;
    const nextOptions = (optModalItem.options || []).map((o) => ({
      id: Number(o.id),
      param: Number(o.param) || 0,
      ...(o.min != null && o.max != null ? { min: Number(o.min), max: Number(o.max) } : {}),
    }));
    const nextItems = items.map((it, i) => (i === optModalIdx ? { ...it, options: nextOptions } : it));
    setItems(nextItems);
    setOptModalItem(null);
    setOptModalIdx(null);
    if (andSaveToDb) {
      await handleSaveToDatabase(nextItems);
    } else {
      markDirty();
      onFeedback?.('Đã cập nhật chỉ số vào danh sách! Hãy bấm "Lưu Vào Database" để lưu vĩnh viễn.', 'success');
    }
  }

  // Bulk Edit
  function applyBulkEdit() {
    if (!selectedItemIds.size) return;
    markDirty();
    setItems((prev) => prev.map((it) => {
      if (!selectedItemIds.has(it.id)) return it;
      const patch = {};
      if (bulkForm.cost !== '') patch.cost = Number(bulkForm.cost);
      if (bulkForm.type_sell !== '') patch.type_sell = Number(bulkForm.type_sell);
      if (bulkForm.is_new !== '') patch.is_new = Number(bulkForm.is_new);
      if (bulkForm.is_sell !== '') patch.is_sell = Number(bulkForm.is_sell);
      return { ...it, ...patch };
    }));
    setBulkModalOpen(false);
    setSelectedItemIds(new Set());
    setBulkForm({ cost: '', type_sell: '', is_new: '', is_sell: '' });
    onFeedback?.('Đã áp dụng thay đổi hàng loạt. Nhớ bấm "Lưu Vào Database"!', 'success');
  }

  function toggleSelectAll(checked) {
    if (checked) {
      setSelectedItemIds(new Set(items.map((it) => it.id)));
    } else {
      setSelectedItemIds(new Set());
    }
  }

  function toggleSelectItem(id) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // SAVE TO DATABASE MYSQL (100% PERSISTENCE)
  async function handleSaveToDatabase(customItems = null) {
    const listToSave = Array.isArray(customItems) ? customItems : items;
    setSaving(true);
    try {
      const payloadItems = listToSave.map((it) => ({
        id: (typeof it.id === 'string' && (it.id.startsWith('new_') || it.id.startsWith('preset_'))) ? undefined : it.id,
        temp_id: Number(it.temp_id),
        cost: Number(it.cost) || 0,
        type_sell: Number(it.type_sell) || 0,
        is_sell: it.is_sell ? 1 : 0,
        icon_spec: Number(it.icon_spec) || 0,
        is_new: it.is_new ? 1 : 0,
        gender_override: parseGenderOverride(it.gender_override),
        options: (it.options || []).map((o) => ({ id: Number(o.id), param: Number(o.param) || 0 })),
      }));

      await api(`/shops/tabs/${tab.id}/items/bulk`, {
        method: 'PUT',
        body: withServer({ items: payloadItems }),
      });

      await api('/shops/reload', {
        method: 'POST',
        body: withServer(),
      }).catch(() => null);

      itemsDirtyRef.current = false;
      setIsDirty(false);
      onFeedback?.(`🎉 ĐÃ LƯU ${listToSave.length} VẬT PHẨM VÀO DATABASE VĨNH VIỄN & LIVE-SYNC IN-GAME!`, 'success');
      await onRefresh?.();
    } catch (e) {
      onFeedback?.('Lỗi khi lưu vào Database: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (raceFilter && !itemVisibleForRace(it.gender_override ?? it.gender, raceFilter)) return false;
      if (!filterQ) return true;
      const q = filterQ.toLowerCase();
      return (
        String(it.temp_id).includes(q) ||
        String(it.item_name || '').toLowerCase().includes(q)
      );
    });
  }, [items, raceFilter, filterQ]);

  return (
    <div className="shop-studio-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. TOP TOOLBAR & STATUS */}
      <div className="card-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--card-glass, rgba(26, 35, 50, 0.8))', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-accent, rgba(59, 130, 246, 0.2))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🏪</span>
            <strong style={{ fontSize: '1.05rem', color: '#60a5fa' }}>Tab: {tab.name}</strong>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>{items.length} vật phẩm</span>
          </div>

          {isDirty ? (
            <div style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.5)', padding: '4px 10px', borderRadius: '8px', color: '#fde047', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span>CHƯA LƯU VÀO DATABASE!</span>
            </div>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '4px 10px', borderRadius: '8px', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🛡️</span>
              <span>Dữ liệu đã lưu an toàn trên MySQL</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn sm secondary"
            onClick={() => setPresetModalOpen(true)}
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: '#fff', border: 'none', fontWeight: 600 }}
            title="Thêm nhanh các gói vật phẩm hot có sẵn (Ngọc rồng, Đồ thần linh, Cải trang...)"
          >
            ⚡ Mẫu Có Sẵn (Presets)
          </button>

          {selectedItemIds.size > 0 && (
            <button
              type="button"
              className="btn sm"
              onClick={() => setBulkModalOpen(true)}
              style={{ background: '#0284c7', color: '#fff' }}
            >
              ✨ Chỉnh Sửa Hàng Loạt ({selectedItemIds.size})
            </button>
          )}

          <button
            type="button"
            className="btn sm"
            onClick={() => {
              const text = exportShopOrderText(items, { tabId: tab.id, tabName: tab.name });
              setOrderIoText(text);
              setOrderIoOpen(true);
            }}
            title="Xuất/Nhập danh sách vật phẩm dạng Text"
          >
            📋 Import / Export
          </button>

          <button
            type="button"
            className="btn sm primary"
            disabled={saving}
            onClick={handleSaveToDatabase}
            style={{
              background: isDirty ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
              boxShadow: isDirty ? '0 0 14px rgba(16, 185, 129, 0.6)' : undefined,
              fontWeight: 700,
              fontSize: '0.92rem',
              padding: '7px 16px',
            }}
          >
            {saving ? '⏳ Đang Lưu MySQL...' : `💾 Lưu Vào Database (${items.length} item)`}
          </button>
        </div>
      </div>

      {/* 2. QUICK ADD BAR - THÊM VẬT PHẨM TỨC THÌ */}
      <div className="card-inner" style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>➕ Thêm Vật Phẩm Mới Vào Shop:</strong>
          <span className="muted" style={{ fontSize: '0.82rem' }}>Gõ tên hoặc ID item để thêm nhanh chỉ trong 1 thao tác</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 2.5fr) minmax(140px, 1fr) minmax(150px, 1.2fr) auto', gap: '10px', alignItems: 'center' }}>
          {/* Ô tìm kiếm Autocomplete */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              placeholder="🔍 Gõ tên hoặc ID: Cải trang, Thỏi vàng, 457, 545..."
              value={quickSearch}
              onChange={(e) => {
                setQuickSearch(e.target.value);
                setSelectedQuickTemplate(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAdd();
                }
              }}
            />

            {/* Dropdown gợi ý */}
            {quickResults.length > 0 && !selectedQuickTemplate && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: '#1e293b',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  marginTop: '4px',
                }}
              >
                {quickResults.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedQuickTemplate(t);
                      setQuickSearch(`#${t.id} - ${t.name}`);
                      setQuickResults([]);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <ItemIcon iconId={t.icon_id} size={28} />
                    <div style={{ flex: 1 }}>
                      <strong>{t.name}</strong>
                      <span className="muted" style={{ marginLeft: '8px', fontSize: '0.8rem' }}>ID: #{t.id}</span>
                    </div>
                    <span className="badge sm">{genderLabel(t.gender)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ô nhập Giá Bán */}
          <div>
            <input
              type="number"
              className="input"
              style={{ width: '100%' }}
              min={0}
              placeholder="Giá bán..."
              value={quickCost}
              onChange={(e) => setQuickCost(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAdd();
                }
              }}
            />
          </div>

          {/* Chọn Loại Tiền */}
          <div>
            <select
              className="input"
              style={{ width: '100%' }}
              value={quickTypeSell}
              onChange={(e) => setQuickTypeSell(Number(e.target.value))}
            >
              {TYPE_SELL.map((ts) => (
                <option key={ts.value} value={ts.value}>{ts.label}</option>
              ))}
            </select>
          </div>

          {/* Nút Thêm */}
          <button
            type="button"
            className="btn primary"
            disabled={!selectedQuickTemplate && !quickSearch.trim()}
            onClick={handleQuickAdd}
            style={{ fontWeight: 600, padding: '8px 18px' }}
          >
            + Thêm Vào Shop
          </button>
        </div>
      </div>

      {/* 3. BỘ LỌC TỘC VÀ TÌM KIẾM TRONG TAB */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <ShopRacePills value={raceFilter} onChange={setRaceFilter} />
        <div style={{ width: '260px' }}>
          <input
            type="text"
            className="input sm"
            style={{ width: '100%' }}
            placeholder="🔎 Lọc item trong tab..."
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
          />
        </div>
      </div>

      {/* 4. SMART INTERACTIVE TABLE - BẢNG ĐIỀU KHIỂN CHÍNH */}
      <div className="table-wrap card-inner" style={{ padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
        <table className="compact" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedItemIds.size === items.length}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ width: '60px', textAlign: 'center' }}>Vị Trí</th>
              <th style={{ minWidth: '220px' }}>Vật Phẩm (Item)</th>
              <th style={{ width: '140px' }}>Giá Bán</th>
              <th style={{ width: '140px' }}>Loại Tiền</th>
              <th style={{ minWidth: '240px' }}>Chỉ Số (Options)</th>
              <th style={{ width: '120px' }}>Tộc Mua</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Trạng Thái</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
                  {items.length === 0
                    ? 'Chưa có vật phẩm nào trong Tab này. Hãy dùng thanh "Thêm Vật Phẩm" ở trên hoặc bấm "Mẫu Có Sẵn"!'
                    : 'Không tìm thấy vật phẩm nào khớp với bộ lọc.'}
                </td>
              </tr>
            ) : (
              filteredItems.map((it, idx) => {
                const realIdx = items.findIndex((orig) => orig === it || orig.id === it.id);
                const isSelected = selectedItemIds.has(it.id);

                return (
                  <tr
                    key={it.id || idx}
                    style={{
                      background: isSelected ? 'rgba(59, 130, 246, 0.1)' : idx % 2 === 1 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(it.id)}
                      />
                    </td>

                    {/* Vị trí & Nút ⬆️ ⬇️ */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          className="btn sm ghost"
                          style={{ padding: '0 4px', fontSize: '0.7rem', lineHeight: '1' }}
                          disabled={realIdx === 0}
                          onClick={() => moveItem(realIdx, realIdx - 1)}
                          title="Di chuyển lên trên"
                        >
                          ▲
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>{realIdx + 1}</span>
                        <button
                          type="button"
                          className="btn sm ghost"
                          style={{ padding: '0 4px', fontSize: '0.7rem', lineHeight: '1' }}
                          disabled={realIdx === items.length - 1}
                          onClick={() => moveItem(realIdx, realIdx + 1)}
                          title="Di chuyển xuống dưới"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    {/* Tên & Icon */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ItemIcon iconId={it.icon_id} size={36} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{it.item_name || `Item #${it.temp_id}`}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span className="badge sm" style={{ fontSize: '0.75rem' }}>ID: {it.temp_id}</span>
                            {it.icon_spec > 0 && <span className="badge sm">Icon: {it.icon_spec}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sửa Giá Trực Tiếp (Inline Cost) */}
                    <td>
                      <input
                        type="number"
                        className="input sm"
                        style={{ width: '100%', fontWeight: 600 }}
                        min={0}
                        value={it.cost}
                        onChange={(e) => patchItem(realIdx, { cost: Number(e.target.value) })}
                      />
                    </td>

                    {/* Chọn Loại Tiền Trực Tiếp */}
                    <td>
                      <select
                        className="input sm"
                        style={{ width: '100%', fontWeight: 500 }}
                        value={it.type_sell}
                        onChange={(e) => patchItem(realIdx, { type_sell: Number(e.target.value) })}
                      >
                        {TYPE_SELL.map((ts) => (
                          <option key={ts.value} value={ts.value}>{ts.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Options (Chỉ số) */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(it.options || []).length === 0 ? (
                            <span className="muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>Không có chỉ số</span>
                          ) : (
                            (it.options || []).map((o, oi) => (
                              <span
                                key={oi}
                                className="badge sm"
                                style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', fontSize: '0.75rem' }}
                              >
                                {optionMap[o.id]
                                  ? String(optionMap[o.id]).replace('#', o.param)
                                  : `#${o.id}: ${o.param}`}
                              </span>
                            ))
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn sm ghost"
                          style={{ padding: '2px 8px', fontSize: '0.78rem', border: '1px solid rgba(255,255,255,0.1)' }}
                          onClick={() => openOptionModal(it, realIdx)}
                          title="Chỉnh sửa chỉ số / option chi tiết"
                        >
                          ✏️ Sửa ({(it.options || []).length})
                        </button>
                      </div>
                    </td>

                    {/* Tộc Mua */}
                    <td>
                      <select
                        className="input sm"
                        style={{ width: '100%', fontSize: '0.8rem' }}
                        value={it.gender_override ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          patchItem(realIdx, patchShopItemGender(it, val));
                        }}
                      >
                        <option value="">Theo Gốc</option>
                        <option value="3">Tất cả Tộc</option>
                        <option value="0">Trái Đất</option>
                        <option value="1">Namec</option>
                        <option value="2">Xayda</option>
                      </select>
                    </td>

                    {/* Trạng thái Bán & NEW */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className={`badge sm ${it.is_new ? 'ok' : 'muted'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          onClick={() => patchItem(realIdx, { is_new: it.is_new ? 0 : 1 })}
                          title="Bật/Tắt nhãn NEW đỏ trong game"
                        >
                          {it.is_new ? '🔥 NEW' : 'Cũ'}
                        </button>
                        <button
                          type="button"
                          className={`badge sm ${it.is_sell ? 'ok' : 'danger'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          onClick={() => patchItem(realIdx, { is_sell: it.is_sell ? 0 : 1 })}
                          title="Bật/Tắt bán trong shop"
                        >
                          {it.is_sell ? 'Bán' : 'Ẩn'}
                        </button>
                      </div>
                    </td>

                    {/* Thao tác (Clone, Delete) */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn sm ghost"
                          style={{ padding: '3px 6px', fontSize: '0.85rem' }}
                          onClick={() => cloneItem(realIdx)}
                          title="Nhân bản item này"
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          className="btn sm ghost danger"
                          style={{ padding: '3px 6px', fontSize: '0.85rem', color: '#ef4444' }}
                          onClick={() => deleteItem(realIdx)}
                          title="Xóa khỏi shop"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. STICKY BOTTOM FLOATING BAR - BẬT LÊN KHI CÓ THAY ĐỔI */}
      {isDirty && (
        <div
          style={{
            position: 'sticky',
            bottom: '16px',
            zIndex: 100,
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '2px solid #10b981',
            borderRadius: '14px',
            padding: '12px 24px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            <div>
              <strong style={{ color: '#fde047', fontSize: '1rem' }}>Bạn có thay đổi chưa lưu vào Database MySQL!</strong>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Các chỉnh sửa chỉ lưu vĩnh viễn và có hiệu lực in-game khi bạn bấm nút Lưu bên phải.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                if (confirm('Hủy các thay đổi chưa lưu và tải lại từ Database?')) {
                  itemsDirtyRef.current = false;
                  setIsDirty(false);
                  setItems(tab.items || []);
                }
              }}
            >
              ↩️ Hoàn Tác
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={handleSaveToDatabase}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '10px 22px',
              }}
            >
              {saving ? '⏳ Đang Lưu MySQL...' : `💾 LƯU NGAY VÀO DATABASE (${items.length} item)`}
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL PRESET PACKS */}
      {presetModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '700px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>⚡ Mẫu Vật Phẩm Có Sẵn (NRO Presets)</h3>
              <button type="button" className="btn sm ghost" onClick={() => setPresetModalOpen(false)}>✕</button>
            </div>
            <p className="muted" style={{ marginTop: '6px', fontSize: '0.88rem' }}>
              Chọn gói vật phẩm thông dụng để thêm ngay vào tab hiện tại với cấu hình chỉ số chuẩn nhất.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              {PRESET_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="card-inner"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '1rem', color: '#60a5fa' }}>{pack.title}</strong>
                    <div className="muted" style={{ fontSize: '0.84rem', marginTop: '3px' }}>{pack.desc}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                      Bao gồm {pack.items.length} item: {pack.items.map((i) => i.name).join(', ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => handleAddPreset(pack)}
                    style={{ whiteSpace: 'nowrap', fontWeight: 600 }}
                  >
                    + Thêm Gói Này
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CHỈNH SỬA OPTION CHI TIẾT */}
      {optModalItem && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content card" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ItemIcon iconId={optModalItem.icon_id} size={28} />
                <h3 style={{ margin: 0 }}>
                  ✏️ Chỉnh Sửa Chỉ Số: <span style={{ color: '#60a5fa' }}>{optModalItem.item_name || `Item #${optModalItem.temp_id}`}</span>
                </h3>
              </div>
              <button type="button" className="btn sm ghost" onClick={() => setOptModalItem(null)}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <OptionEditor
                options={optModalItem.options || []}
                onChange={(nextOpts) => setOptModalItem((prev) => ({ ...prev, options: nextOpts }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button type="button" className="btn sm ghost" onClick={() => setOptModalItem(null)}>
                Đóng / Hủy
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => saveOptionModal(false)}
                  title="Cập nhật vào danh sách tạm (cần bấm Lưu Database ở dưới)"
                >
                  ✓ Áp Dụng Tạm
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={saving}
                  onClick={() => saveOptionModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    fontWeight: 700,
                  }}
                  title="Lưu ngay lập tức vào MySQL Database và đồng bộ in-game"
                >
                  {saving ? '⏳ Đang Lưu...' : '💾 Lưu Ngay Vào Database'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL BULK EDIT */}
      {bulkModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '440px', width: '90%' }}>
            <div className="modal-header">
              <h3>✨ Chỉnh Sửa Hàng Loạt ({selectedItemIds.size} item đã chọn)</h3>
              <button type="button" className="btn sm ghost" onClick={() => setBulkModalOpen(false)}>✕</button>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Đặt Lại Giá Bán (để trống nếu không đổi):</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  placeholder="Giữ nguyên giá hiện tại"
                  value={bulkForm.cost}
                  onChange={(e) => setBulkForm((p) => ({ ...p, cost: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Đổi Loại Tiền (để trống nếu không đổi):</label>
                <select
                  className="input"
                  value={bulkForm.type_sell}
                  onChange={(e) => setBulkForm((p) => ({ ...p, type_sell: e.target.value }))}
                >
                  <option value="">-- Giữ nguyên --</option>
                  {TYPE_SELL.map((ts) => (
                    <option key={ts.value} value={ts.value}>{ts.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Gán Nhãn NEW:</label>
                <select
                  className="input"
                  value={bulkForm.is_new}
                  onChange={(e) => setBulkForm((p) => ({ ...p, is_new: e.target.value }))}
                >
                  <option value="">-- Giữ nguyên --</option>
                  <option value="1">Bật nhãn NEW</option>
                  <option value="0">Tắt nhãn NEW</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setBulkModalOpen(false)}>Hủy</button>
                <button type="button" className="btn primary" onClick={applyBulkEdit}>Áp Dụng Cho Tất Cả</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL IMPORT / EXPORT TEXT */}
      {orderIoOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header">
              <h3>📋 Nhập / Xuất Danh Sách Vật Phẩm</h3>
              <button type="button" className="btn sm ghost" onClick={() => setOrderIoOpen(false)}>✕</button>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Bạn có thể sao chép văn bản bên dưới để lưu trữ hoặc dán danh sách ID/vật phẩm mới vào đây.
              </p>
              <textarea
                className="input"
                style={{ width: '100%', height: '220px', fontFamily: 'monospace', fontSize: '0.82rem' }}
                value={orderIoText}
                onChange={(e) => setOrderIoText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn sm secondary"
                  onClick={() => {
                    navigator.clipboard?.writeText(orderIoText);
                    onFeedback?.('Đã sao chép vào Clipboard!', 'success');
                  }}
                >
                  📄 Sao Chép
                </button>
                <button type="button" className="btn" onClick={() => setOrderIoOpen(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
