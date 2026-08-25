import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import ItemIcon from './ItemIcon';
import { OptionEditor, OptionChips, useOptionMap } from './OptionEditor';

const BODY_SLOT_LABELS = [
  'Áo', 'Quần', 'Giày', 'Rada', 'Găng tay', 'Cải trang',
  'Pet / Phụ kiện 1', 'Pet / Phụ kiện 2', 'Pet / Phụ kiện 3', 'Pet / Phụ kiện 4',
  'Pet / Phụ kiện 5', 'Pet / Phụ kiện 6',
];

/** item_option_template: 107 = lỗ sao pha lê, 102 = sao đã ép */
const STAR_HOLE_ID = 107;
const STAR_FILLED_ID = 102;
const STAR_OPTION_IDS = [STAR_HOLE_ID, STAR_FILLED_ID];

function getOptionParam(options, id) {
  return options?.find((o) => o.id === id)?.param ?? 0;
}

function upsertOption(options, id, param) {
  const next = (options || []).filter((o) => o.id !== id);
  if (param > 0) next.push({ id, param: Number(param) });
  return next;
}

function parseOptionsText(text) {
  if (!text?.trim()) return [];
  return text.split(',').map((part) => {
    const [id, param] = part.trim().split(':');
    const oid = Number(id);
    if (Number.isNaN(oid)) return null;
    return { id: oid, param: Number(param ?? 0) };
  }).filter(Boolean);
}

function ItemSearchPicker({
  onSelect,
  placeholder = 'Tìm item theo tên hoặc ID...',
  searchPath = '/players/item-templates',
  showIcons = true,
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api(`${searchPath}?q=${encodeURIComponent(q.trim())}`);
        setResults(res.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(item) {
    onSelect?.(item);
    setQ('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="item-search" ref={wrapRef}>
      <input
        value={q}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim() && setOpen(true)}
      />
      {loading && <span className="item-search-hint">Đang tìm...</span>}
      {open && results.length > 0 && (
        <ul className="item-search-results">
          {results.map((it) => (
            <li key={it.id}>
              <button type="button" onClick={() => pick(it)}>
                {showIcons && (
                  <ItemIcon iconId={it.icon_id} tempId={it.id} name={it.name} size={28} />
                )}
                <strong>#{it.id}</strong>
                <span>{it.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim() && !loading && results.length === 0 && (
        <div className="item-search-empty">Không tìm thấy item</div>
      )}
    </div>
  );
}

function SlotEditor({ slotLabel, item, itemNames, onApply, onCancel }) {
  const [templateId, setTemplateId] = useState(item?.empty ? '' : String(item?.templateId ?? ''));
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [options, setOptions] = useState(item?.options?.length ? [...item.options] : []);
  const [changeItem, setChangeItem] = useState(false);

  const name = itemNames?.[Number(templateId)] || (templateId ? `#${templateId}` : '');
  const starHoles = getOptionParam(options, STAR_HOLE_ID);
  const starFilled = getOptionParam(options, STAR_FILLED_ID);

  function setStarHoles(value) {
    setOptions(upsertOption(options, STAR_HOLE_ID, value));
  }

  function setStarFilled(value) {
    setOptions(upsertOption(options, STAR_FILLED_ID, value));
  }

  return (
    <div className="slot-editor">
      <div className="slot-editor-head">
        <div>
          <span className="slot-label">{slotLabel}</span>
          <h4 className="slot-item-title">{name || 'Chưa chọn item'}</h4>
        </div>
        <button type="button" className="btn sm ghost" onClick={onCancel}>✕ Đóng</button>
      </div>

      <div className="slot-editor-section">
        <div className="row slot-editor-fields">
          <label className="field">
            <span>Số lượng</span>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </label>
          {!changeItem ? (
            <button type="button" className="btn sm" onClick={() => setChangeItem(true)}>Đổi item khác</button>
          ) : null}
        </div>
        {changeItem && (
          <div className="slot-change-item">
            <ItemSearchPicker placeholder="Tìm item thay thế..." onSelect={(it) => { setTemplateId(String(it.id)); setChangeItem(false); }} />
          </div>
        )}
      </div>

      <div className="slot-editor-section star-slot-section">
        <h5 className="star-slot-title">Lỗ sao pha lê</h5>
        <p className="muted star-slot-hint">
          Số lỗ đục trên trang bị (#{STAR_HOLE_ID}) và sao pha lê đã ép (#{STAR_FILLED_ID}). Thông thường 0–8 lỗ; sao đã ép không được vượt số lỗ.
        </p>
        <div className="row star-slot-fields">
          <label className="field">
            <span>Số lỗ sao</span>
            <input
              type="number"
              min={0}
              max={15}
              value={starHoles}
              onChange={(e) => setStarHoles(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label className="field">
            <span>Sao đã ép</span>
            <input
              type="number"
              min={0}
              max={starHoles || 15}
              value={starFilled}
              onChange={(e) => setStarFilled(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          {(starHoles > 0 || starFilled > 0) && (
            <div className="star-slot-preview">
              {starFilled}/{starHoles || '—'} sao
            </div>
          )}
        </div>
      </div>

      <OptionEditor options={options} onChange={setOptions} hideIds={STAR_OPTION_IDS} />

      <div className="slot-editor-footer">
        <button
          type="button"
          className="btn primary"
          onClick={() => onApply({
            templateId: Number(templateId),
            quantity: Number(quantity) || 1,
            options,
            createTime: item?.createTime || 0,
            empty: !templateId || Number(templateId) === -1,
            name: itemNames?.[Number(templateId)] || `#${templateId}`,
          })}
        >
          Lưu slot & đồng bộ
        </button>
        <button type="button" className="btn" onClick={onCancel}>Hủy</button>
      </div>
    </div>
  );
}

function normalizeSlots(items, minSlots) {
  const list = (items || []).map((it, i) => ({
    ...it,
    slot: it.slot ?? i,
    options: [...(it.options || [])],
  }));
  while (list.length < minSlots) {
    list.push({ slot: list.length, templateId: -1, quantity: 0, options: [], empty: true });
  }
  return list;
}

export default function ItemInventoryEditor({
  title,
  containerKey,
  items,
  setItems,
  itemNames,
  onSave,
  busy,
  minSlots = 0,
  slotLabels = null,
  fixedSlots = false,
}) {
  const [editIdx, setEditIdx] = useState(null);
  const [showEmpty, setShowEmpty] = useState(fixedSlots);
  const [quickQty, setQuickQty] = useState(1);
  const optionMap = useOptionMap();
  const list = normalizeSlots(items, minSlots);

  function updateSlot(idx, patch) {
    let nextList;
    setItems((prev) => {
      const base = normalizeSlots(prev, minSlots);
      base[idx] = { ...base[idx], ...patch, slot: idx, empty: patch.empty ?? patch.templateId === -1 };
      nextList = base;
      return base;
    });
    setEditIdx(null);
    if (onSave && nextList) {
      onSave(containerKey, nextList);
    }
  }

  function clearSlot(idx) {
    if (!window.confirm('Xóa item ở slot này?')) return;
    updateSlot(idx, { templateId: -1, quantity: 0, options: [], empty: true, name: '—' });
  }

  function addToFirstEmpty(item) {
    setItems((prev) => {
      const base = normalizeSlots(prev, minSlots);
      let idx = base.findIndex((it) => it.empty);
      if (idx < 0) {
        idx = base.length;
        base.push({ slot: idx, empty: true, templateId: -1, quantity: 0, options: [] });
      }
      base[idx] = {
        slot: idx,
        templateId: item.id,
        quantity: quickQty,
        options: [],
        empty: false,
        name: item.name,
      };
      return base;
    });
  }

  const filledCount = list.filter((it) => !it.empty).length;

  function slotLabel(idx) {
    if (slotLabels?.[idx]) return `${idx} · ${slotLabels[idx]}`;
    return `Slot ${idx}`;
  }

  return (
    <div className="section item-inventory-editor">
      <div className="section-head">
        <div>
          <h4>{title}</h4>
          <p className="muted section-sub">{filledCount} item · {list.length} slot</p>
        </div>
        <button className="btn sm primary" type="button" disabled={busy} onClick={() => onSave(containerKey, list)}>
          Lưu tất cả slot
        </button>
      </div>

      <div className="item-quick-add">
        <ItemSearchPicker onSelect={addToFirstEmpty} placeholder="🔍 Tìm và thêm item vào slot trống..." />
        <label className="field qty-field">
          <span>SL</span>
          <input type="number" min={1} value={quickQty} onChange={(e) => setQuickQty(Number(e.target.value) || 1)} />
        </label>
      </div>

      {!fixedSlots && (
        <label className="toggle-empty">
          <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />
          Hiện slot trống
        </label>
      )}

      <div className={`item-slot-grid ${fixedSlots ? 'fixed-slots' : ''}`}>
        {list.map((it, realIdx) => {
          if (!showEmpty && it.empty) return null;
          const tid = it.empty ? null : Number(it.templateId);
          const name = it.name || itemNames?.[tid] || (tid ? `#${tid}` : null);
          const isEditing = editIdx === realIdx;

          return (
            <div key={`${containerKey}-${realIdx}`} className={`item-slot-card ${it.empty ? 'empty' : 'filled'} ${isEditing ? 'editing' : ''}`}>
              {!isEditing ? (
                <>
                  <div className="slot-card-top">
                    <span className="slot-label">{slotLabel(realIdx)}</span>
                    {!it.empty && <span className="slot-qty">×{it.quantity ?? 1}</span>}
                  </div>
                  {it.empty ? (
                    <button type="button" className="slot-add-btn" onClick={() => setEditIdx(realIdx)}>
                      + Thêm item
                    </button>
                  ) : (
                    <>
                      <div className="slot-item-name" title={name}>{name}</div>
                      <div className="slot-item-id muted">ID {tid}</div>
                      {(getOptionParam(it.options, STAR_HOLE_ID) > 0 || getOptionParam(it.options, STAR_FILLED_ID) > 0) && (
                        <div className="star-slot-badge">
                          ★ {getOptionParam(it.options, STAR_FILLED_ID)}/{getOptionParam(it.options, STAR_HOLE_ID)} sao
                        </div>
                      )}
                      {(it.options?.length > 0) && (
                        <OptionChips
                          options={it.options.filter((o) => !STAR_OPTION_IDS.includes(o.id))}
                          optionMap={optionMap}
                        />
                      )}
                      <div className="slot-actions">
                        <button type="button" className="btn sm" onClick={() => setEditIdx(realIdx)}>Sửa</button>
                        <button type="button" className="btn sm ghost" onClick={() => clearSlot(realIdx)}>Xóa</button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <SlotEditor
                  slotLabel={slotLabel(realIdx)}
                  item={list[realIdx]}
                  itemNames={itemNames}
                  onApply={(patch) => updateSlot(realIdx, patch)}
                  onCancel={() => setEditIdx(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {!showEmpty && filledCount === 0 && (
        <p className="muted empty-hint">Chưa có item. Dùng ô tìm kiếm phía trên để thêm.</p>
      )}
    </div>
  );
}

export {
  parseOptionsText,
  BODY_SLOT_LABELS,
  ItemSearchPicker,
  STAR_HOLE_ID,
  STAR_FILLED_ID,
  getOptionParam,
  upsertOption,
};
export { OptionEditor } from './OptionEditor';
