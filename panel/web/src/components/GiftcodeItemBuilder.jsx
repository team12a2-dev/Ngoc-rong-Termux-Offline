import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { OptionEditor, OptionChips, useOptionMap } from './OptionEditor';
import ItemIcon from './ItemIcon';

/** Gói quà preset — chỉnh ID theo server của bạn */
export const REWARD_PRESETS = [
  {
    id: 'starter',
    label: 'Gói tân thủ',
    desc: 'Thỏi vàng + ngọc cơ bản',
    items: [
      { id: 457, quantity: 10, name: 'Thỏi vàng', options: [] },
      { id: 16, quantity: 100, name: 'Ngọc', options: [] },
    ],
  },
  {
    id: 'vip',
    label: 'Gói VIP',
    desc: 'Thỏi vàng + ngọc lớn',
    items: [
      { id: 457, quantity: 50, name: 'Thỏi vàng', options: [] },
      { id: 16, quantity: 500, name: 'Ngọc', options: [] },
    ],
  },
  {
    id: 'event',
    label: 'Gói sự kiện',
    desc: 'Phần thưởng event phổ biến',
    items: [
      { id: 457, quantity: 20, name: 'Thỏi vàng', options: [] },
      { id: 16, quantity: 200, name: 'Ngọc', options: [] },
      { id: 14, quantity: 5, name: 'Item event', options: [] },
    ],
  },
];

const CATALOG_PAGE = 50;

function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export default function GiftcodeItemBuilder({ items, onChange }) {
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogQ, setCatalogQ] = useState('');
  const [catalogPage, setCatalogPage] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [defaultQty, setDefaultQty] = useState(1);
  const optionMap = useOptionMap();

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const q = catalogQ.trim();
        const url = q
          ? `/players/item-templates?q=${encodeURIComponent(q)}`
          : '/players/item-templates';
        const res = await api(url);
        if (!cancelled) {
          setCatalog(res.data || []);
          setCatalogPage(0);
        }
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, catalogQ.trim() ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [catalogQ]);

  const catalogPages = Math.max(1, Math.ceil(catalog.length / CATALOG_PAGE));
  const catalogSlice = catalog.slice(catalogPage * CATALOG_PAGE, (catalogPage + 1) * CATALOG_PAGE);

  const selectedItem = selectedIdx != null ? items[selectedIdx] : null;
  const rewardIds = useMemo(() => new Set(items.map((it) => it.id)), [items]);

  function updateItem(idx, patch) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem(template) {
    const existing = items.findIndex((it) => it.id === template.id);
    if (existing >= 0) {
      setSelectedIdx(existing);
      return;
    }
    const next = [
      ...items,
      {
        id: template.id,
        name: template.name,
        icon_id: template.icon_id,
        quantity: defaultQty || 1,
        options: [],
      },
    ];
    onChange(next);
    setSelectedIdx(next.length - 1);
  }

  function addPreset(preset) {
    const next = [...items];
    let lastIdx = next.length - 1;
    for (const it of preset.items) {
      if (!next.some((x) => x.id === it.id)) {
        next.push({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          options: [...(it.options || [])],
        });
        lastIdx = next.length - 1;
      }
    }
    onChange(next);
    if (lastIdx >= 0) setSelectedIdx(lastIdx);
  }

  function removeItem(idx) {
    onChange(items.filter((_, i) => i !== idx));
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx != null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
  }

  function duplicateItem(idx) {
    const it = items[idx];
    const next = [...items.slice(0, idx + 1), { ...it, options: [...(it.options || [])] }, ...items.slice(idx + 1)];
    onChange(next);
    setSelectedIdx(idx + 1);
  }

  return (
    <div className="giftcode-builder">
      <div className="giftcode-builder-split">
        {/* Danh sách item từ DB */}
        <div className="giftcode-catalog card-inner">
          <div className="section-head">
            <div>
              <h4>Danh sách item</h4>
              <p className="muted section-sub">Bảng item_template — bấm + để thêm vào giftcode</p>
            </div>
          </div>
          <input
            className="catalog-search"
            placeholder="Tìm theo tên hoặc ID: thỏi vàng, 457, ngọc..."
            value={catalogQ}
            onChange={(e) => setCatalogQ(e.target.value)}
          />
          <div className="option-template-table-wrap giftcode-catalog-table">
            <table className="compact">
              <thead>
                <tr><th>Icon</th><th>ID</th><th>Tên item</th><th /></tr>
              </thead>
              <tbody>
                {catalogLoading && (
                  <tr><td colSpan={4} className="muted">Đang tải danh sách item...</td></tr>
                )}
                {!catalogLoading && catalogSlice.map((it) => (
<tr key={it.id} className={rewardIds.has(it.id) ? 'row-active' : ''}>
                    <td><ItemIcon iconId={it.icon_id} tempId={it.id} name={it.name} size={32} /></td>
                    <td><strong>{it.id}</strong></td>
                    <td>{it.name}</td>
                    <td>
                      <button type="button" className="btn sm primary" onClick={() => addItem(it)}>
                        {rewardIds.has(it.id) ? 'Chọn' : '+ Thêm'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!catalogLoading && catalog.length === 0 && (
                  <tr><td colSpan={4} className="muted">Không có item. Kiểm tra DB game hoặc thử từ khóa khác.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {catalog.length > CATALOG_PAGE && (
            <div className="row catalog-pagination">
              <button type="button" className="btn sm" disabled={catalogPage <= 0} onClick={() => setCatalogPage((p) => p - 1)}>← Trước</button>
              <span className="muted">Trang {catalogPage + 1}/{catalogPages} · {catalog.length} item</span>
              <button type="button" className="btn sm" disabled={catalogPage >= catalogPages - 1} onClick={() => setCatalogPage((p) => p + 1)}>Sau →</button>
            </div>
          )}
        </div>

        {/* Phần thưởng đã chọn */}
        <div className="giftcode-rewards-panel card-inner">
          <div className="section-head">
            <div>
              <h4>Phần thưởng giftcode ({items.length})</h4>
              <p className="muted section-sub">Chọn item bên trái → chỉnh số lượng & option bên dưới</p>
            </div>
            <label className="field mini qty-field">
              SL mặc định
              <input type="number" min={1} value={defaultQty} onChange={(e) => setDefaultQty(Number(e.target.value) || 1)} />
            </label>
          </div>

          <div className="giftcode-presets">
            <span className="muted">Gói nhanh:</span>
            <div className="preset-row">
              {REWARD_PRESETS.map((p) => (
                <button key={p.id} type="button" className="btn sm" title={p.desc} onClick={() => addPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <p className="muted empty-hint">Chưa có item. Chọn từ danh sách bên trái hoặc gói nhanh ở trên.</p>
          ) : (
            <ul className="giftcode-item-list">
              {items.map((it, idx) => (
                <li
                  key={`${it.id}-${idx}`}
                  className={`giftcode-item-row ${selectedIdx === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <div className="giftcode-item-main">
                    <ItemIcon iconId={it.icon_id ?? it.iconId} tempId={it.id} name={it.name} size={40} />
                    <div className="giftcode-item-info">
                      <strong>#{it.id}</strong>
                      <span className="giftcode-item-name">{it.name || 'Item'}</span>
                    </div>
                    <label className="field mini" onClick={(e) => e.stopPropagation()}>
                      SL
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 1 })}
                      />
                    </label>
                    <OptionChips options={it.options} optionMap={optionMap} />
                    <div className="giftcode-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn sm" disabled={idx === 0} onClick={() => onChange(moveItem(items, idx, idx - 1))}>↑</button>
                      <button type="button" className="btn sm" disabled={idx === items.length - 1} onClick={() => onChange(moveItem(items, idx, idx + 1))}>↓</button>
                      <button type="button" className="btn sm" onClick={() => duplicateItem(idx)}>⧉</button>
                      <button type="button" className="btn danger sm" onClick={() => removeItem(idx)}>Xóa</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && (
            <p className="muted items-intro">Cần {items.length} ô trống trong hành trang player</p>
          )}
        </div>
      </div>

      {/* Option editor — luôn hiển thị khi chọn item */}
      <div className="giftcode-option-panel card-inner">
        {selectedItem ? (
          <>
            <div className="section-head">
              <div>
                <h4>Tùy chỉnh option — #{selectedItem.id} {selectedItem.name}</h4>
                <p className="muted section-sub">
                  Chọn dòng từ item_option_template, nhập param (SD, HP, Giáp...) — lưu vào giftcode khi bấm Tạo/Cập nhật
                </p>
              </div>
            </div>
            <OptionEditor
              options={selectedItem.options || []}
              onChange={(options) => updateItem(selectedIdx, { options })}
            />
          </>
        ) : (
          <div className="giftcode-option-empty">
            <h4>Tùy chỉnh option item</h4>
            <p className="muted">
              {items.length === 0
                ? 'Thêm item vào phần thưởng trước, sau đó bấm vào item để chỉnh option (dòng chỉ số buff).'
                : 'Bấm vào một item trong danh sách phần thưởng để mở trình chỉnh option.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function itemsToDetailJson(items) {
  return JSON.stringify(
    items.map((it) => ({
      id: Number(it.id),
      quantity: Number(it.quantity) || 1,
      options: (it.options || []).map((o) => ({ id: o.id, param: o.param ?? 0 })),
    }))
  );
}

export function detailJsonToItems(detail) {
  try {
    const parsed = typeof detail === 'string' ? JSON.parse(detail) : detail;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((it) => ({
      id: it.id,
      name: it.name || null,
      quantity: it.quantity ?? 1,
      options: it.options || [],
    }));
  } catch {
    return [];
  }
}

export function previewItemsText(items, optionMap = {}) {
  if (!items?.length) return 'Không có phần thưởng';
  return items.map((it) => {
    const opts = (it.options || [])
      .map((o) => {
        const tpl = optionMap[o.id];
        if (tpl && String(tpl).includes('#')) return String(tpl).replace(/#/g, String(o.param ?? 0));
        return tpl ? String(tpl) : `#${o.id}:${o.param}`;
      })
      .join(', ');
    const opt = opts ? `\n    ↳ ${opts}` : '';
    return `• ${it.name || `#${it.id}`} x${it.quantity}${opt}`;
  }).join('\n');
}
