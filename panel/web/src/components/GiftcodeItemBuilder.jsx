import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { OptionEditor, OptionChips, useOptionMap } from './OptionEditor';
import ItemIcon from './ItemIcon';

/** Danh mục tiền tệ đặc biệt trong game NRO */
export const CURRENCY_TEMPLATES = [
  { id: -1, name: 'Vàng (Gold)', icon_id: null, isCurrency: true, defaultQty: 50000000 },
  { id: -2, name: 'Ngọc xanh (Gem)', icon_id: null, isCurrency: true, defaultQty: 10000 },
  { id: -3, name: 'Hồng ngọc (Ruby / Ngọc khóa)', icon_id: null, isCurrency: true, defaultQty: 5000 },
  { id: 457, name: 'Thỏi vàng', icon_id: 4028, isCurrency: false, defaultQty: 50 },
];

/** Gói quà preset chuẩn kinh tế NRO */
export const REWARD_PRESETS = [
  {
    id: 'starter',
    label: 'Gói tân thủ',
    desc: '50M Vàng + 5.000 Ngọc xanh + 20 Thỏi vàng',
    items: [
      { id: -1, quantity: 50000000, name: 'Vàng', options: [] },
      { id: -2, quantity: 5000, name: 'Ngọc xanh', options: [] },
      { id: 457, quantity: 20, name: 'Thỏi vàng', options: [] },
    ],
  },
  {
    id: 'vip',
    label: 'Gói VIP',
    desc: '500M Vàng + 50.000 Ngọc xanh + 20.000 Hồng ngọc + 100 Thỏi vàng',
    items: [
      { id: -1, quantity: 500000000, name: 'Vàng', options: [] },
      { id: -2, quantity: 50000, name: 'Ngọc xanh', options: [] },
      { id: -3, quantity: 20000, name: 'Hồng ngọc', options: [] },
      { id: 457, quantity: 100, name: 'Thỏi vàng', options: [] },
    ],
  },
  {
    id: 'event',
    label: 'Gói sự kiện',
    desc: '100M Vàng + 10.000 Ngọc xanh + 50 Thỏi vàng + Ngọc rồng 1 sao',
    items: [
      { id: -1, quantity: 100000000, name: 'Vàng', options: [] },
      { id: -2, quantity: 10000, name: 'Ngọc xanh', options: [] },
      { id: 457, quantity: 50, name: 'Thỏi vàng', options: [] },
      { id: 14, quantity: 5, name: 'Ngọc rồng 1 sao', options: [] },
    ],
  },
];

const CATALOG_PAGE = 50;

function moveItem(items, from, to) {
  if (!Array.isArray(items) || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export default function GiftcodeItemBuilder({ items = [], onChange }) {
  const safeItems = Array.isArray(items) ? items : [];
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

  // Tích hợp các loại tiền tệ đặc biệt khi tìm kiếm
  const matchedCurrencies = useMemo(() => {
    const q = catalogQ.trim().toLowerCase();
    if (!q) return [];
    return CURRENCY_TEMPLATES.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchId = String(c.id).includes(q);
      const matchKey =
        (q.includes('vang') || q.includes('gold')) && c.id === -1 ||
        (q.includes('ngoc') || q.includes('gem')) && c.id === -2 ||
        (q.includes('hong') || q.includes('ruby')) && c.id === -3;
      return matchName || matchId || matchKey;
    });
  }, [catalogQ]);

  const catalogSlice = catalog.slice(catalogPage * CATALOG_PAGE, (catalogPage + 1) * CATALOG_PAGE);

  const selectedItem = selectedIdx != null && safeItems[selectedIdx] ? safeItems[selectedIdx] : null;
  const rewardIds = useMemo(() => new Set(safeItems.map((it) => it?.id).filter((id) => id != null)), [safeItems]);

  function updateItem(idx, patch) {
    if (typeof onChange !== 'function') return;
    onChange(safeItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem(template) {
    if (!template) return;
    const existing = safeItems.findIndex((it) => it?.id === template.id);
    if (existing >= 0) {
      setSelectedIdx(existing);
      return;
    }
    const next = [
      ...safeItems,
      {
        id: template.id,
        name: template.name,
        icon_id: template.icon_id,
        quantity: template.defaultQty || defaultQty || 1,
        options: [],
      },
    ];
    if (typeof onChange === 'function') onChange(next);
    setSelectedIdx(next.length - 1);
  }

  function addPreset(preset) {
    if (!preset || !Array.isArray(preset.items)) return;
    const next = [...safeItems];
    let lastIdx = next.length - 1;
    for (const it of preset.items) {
      if (!next.some((x) => x?.id === it.id)) {
        next.push({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          options: [...(it.options || [])],
        });
        lastIdx = next.length - 1;
      }
    }
    if (typeof onChange === 'function') onChange(next);
    if (lastIdx >= 0) setSelectedIdx(lastIdx);
  }

  function removeItem(idx) {
    if (typeof onChange !== 'function') return;
    onChange(safeItems.filter((_, i) => i !== idx));
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx != null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
  }

  function duplicateItem(idx) {
    if (typeof onChange !== 'function') return;
    const it = safeItems[idx];
    if (!it) return;
    const next = [...safeItems.slice(0, idx + 1), { ...it, options: [...(it.options || [])] }, ...safeItems.slice(idx + 1)];
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

          {/* Quick Currency Bar */}
          <div style={{ marginBottom: '10px', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
              💰 Tiền tệ & Thỏi vàng nhanh:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {CURRENCY_TEMPLATES.map((c) => {
                const isAdded = rewardIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`btn sm ${isAdded ? 'secondary' : 'primary'}`}
                    style={{
                      fontSize: '0.78rem',
                      padding: '3px 8px',
                      border: c.id === -1 ? '1px solid rgba(234, 179, 8, 0.5)' : c.id === -2 ? '1px solid rgba(16, 185, 129, 0.5)' : c.id === -3 ? '1px solid rgba(244, 63, 94, 0.5)' : '1px solid rgba(245, 158, 11, 0.5)',
                      background: isAdded ? 'rgba(255, 255, 255, 0.05)' : undefined,
                    }}
                    onClick={() => addItem(c)}
                  >
                    {c.id === -1 && '🪙 + Vàng'}
                    {c.id === -2 && '💎 + Ngọc xanh'}
                    {c.id === -3 && '🔴 + Hồng ngọc'}
                    {c.id === 457 && '🏷️ + Thỏi vàng'}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            className="catalog-search"
            placeholder="Tìm theo tên hoặc ID: vàng, ngọc, thỏi vàng, 457..."
            value={catalogQ}
            onChange={(e) => setCatalogQ(e.target.value)}
          />
          <div className="option-template-table-wrap giftcode-catalog-table">
            <table className="compact">
              <thead>
                <tr><th>Icon</th><th>ID</th><th>Tên item</th><th /></tr>
              </thead>
              <tbody>
                {/* Hiển thị tiền tệ nếu khớp tìm kiếm */}
                {matchedCurrencies.map((it) => (
                  <tr key={it.id} className={rewardIds.has(it.id) ? 'row-active' : ''} style={{ background: 'rgba(234, 179, 8, 0.05)' }}>
                    <td><ItemIcon iconId={it.icon_id} tempId={it.id} name={it.name} size={32} /></td>
                    <td><strong style={{ color: it.id < 0 ? '#facc15' : 'inherit' }}>{it.id}</strong></td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{it.name}</span>
                      <span className="badge sm" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>Tiền tệ</span>
                    </td>
                    <td>
                      <button type="button" className="btn sm primary" onClick={() => addItem(it)}>
                        {rewardIds.has(it.id) ? 'Chọn' : '+ Thêm'}
                      </button>
                    </td>
                  </tr>
                ))}

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
                {!catalogLoading && catalog.length === 0 && matchedCurrencies.length === 0 && (
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
              <h4>Phần thưởng giftcode ({safeItems.length})</h4>
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

          {safeItems.length === 0 ? (
            <p className="muted empty-hint">Chưa có item. Chọn từ danh sách bên trái hoặc gói nhanh ở trên.</p>
          ) : (
            <ul className="giftcode-item-list">
              {safeItems.map((it, idx) => {
                const isCurrency = Number(it.id) < 0;
                let currencyLabel = null;
                if (Number(it.id) === -1) currencyLabel = '🪙 Vàng (Gold)';
                else if (Number(it.id) === -2) currencyLabel = '💎 Ngọc xanh (Gem)';
                else if (Number(it.id) === -3) currencyLabel = '🔴 Hồng ngọc (Ruby)';

                return (
                  <li
                    key={`${it.id}-${idx}`}
                    className={`giftcode-item-row ${selectedIdx === idx ? 'selected' : ''}`}
                    onClick={() => setSelectedIdx(idx)}
                    style={{
                      borderLeft: isCurrency
                        ? it.id === -1
                          ? '3px solid #facc15'
                          : it.id === -2
                          ? '3px solid #34d399'
                          : '3px solid #fb7185'
                        : undefined,
                    }}
                  >
                    <div className="giftcode-item-main">
                      <ItemIcon iconId={it.icon_id ?? it.iconId} tempId={it.id} name={it.name || currencyLabel} size={40} />
                      <div className="giftcode-item-info">
                        <strong>#{it.id}</strong>
                        <span className="giftcode-item-name">
                          {currencyLabel || it.name || 'Item'}
                        </span>
                        {isCurrency && (
                          <span className="badge sm ok" style={{ fontSize: '0.68rem', padding: '1px 6px', marginTop: '2px' }}>
                            Ví nhân vật
                          </span>
                        )}
                      </div>
                      <label className="field mini" onClick={(e) => e.stopPropagation()}>
                        SL
                        <input
                          type="number"
                          min={1}
                          style={{ width: isCurrency ? '110px' : '70px', fontWeight: isCurrency ? 700 : 'normal' }}
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 1 })}
                        />
                      </label>
                      {!isCurrency && <OptionChips options={it.options} optionMap={optionMap} />}
                      <div className="giftcode-item-actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn sm" disabled={idx === 0} onClick={() => onChange(moveItem(safeItems, idx, idx - 1))}>↑</button>
                        <button type="button" className="btn sm" disabled={idx === safeItems.length - 1} onClick={() => onChange(moveItem(safeItems, idx, idx + 1))}>↓</button>
                        <button type="button" className="btn sm" onClick={() => duplicateItem(idx)}>⧉</button>
                        <button type="button" className="btn danger sm" onClick={() => removeItem(idx)}>Xóa</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {safeItems.length > 0 && (
            <p className="muted items-intro">
              Cần {safeItems.filter((it) => Number(it.id) >= 0).length} ô trống trong hành trang player (tiền tệ âm vào thẳng ví)
            </p>
          )}
        </div>
      </div>

      {/* Option editor — hiển thị theo loại item */}
      <div className="giftcode-option-panel card-inner">
        {selectedItem ? (
          Number(selectedItem.id) < 0 ? (
            <div className="giftcode-option-empty" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>
                {Number(selectedItem.id) === -1 ? '🪙' : Number(selectedItem.id) === -2 ? '💎' : '🔴'}
              </div>
              <h4 style={{ color: Number(selectedItem.id) === -1 ? '#facc15' : Number(selectedItem.id) === -2 ? '#34d399' : '#fb7185' }}>
                {Number(selectedItem.id) === -1
                  ? 'Tiền Tệ: Vàng (Gold)'
                  : Number(selectedItem.id) === -2
                  ? 'Tiền Tệ: Ngọc Xanh (Gem)'
                  : 'Tiền Tệ: Hồng Ngọc (Ruby)'}
              </h4>
              <p className="muted" style={{ maxWidth: '520px', margin: '8px auto 0 auto', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Phần thưởng này sẽ được game NRO tự động cộng trực tiếp vào ví nhân vật (túi vàng / ngọc xanh / hồng ngọc),
                không chiếm ô trống hành trang và không cần gán chỉ số trang bị (Option).
              </p>
            </div>
          ) : (
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
          )
        ) : (
          <div className="giftcode-option-empty">
            <h4>Tùy chỉnh option item</h4>
            <p className="muted">
              {safeItems.length === 0
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
  const list = Array.isArray(items) ? items : detailJsonToItems(items);
  return JSON.stringify(
    list.map((it) => ({
      id: Number(it.id),
      quantity: Number(it.quantity) || 1,
      options: (Array.isArray(it.options) ? it.options : []).map((o) => ({ id: Number(o.id), param: Number(o.param) || 0 })),
    }))
  );
}

export function detailJsonToItems(detail) {
  try {
    if (!detail) return [];
    const parsed = typeof detail === 'string' ? JSON.parse(detail) : detail;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((it) => {
      const numId = Number(it.id);
      let defName = it.name || null;
      if (!defName) {
        if (numId === -1) defName = 'Vàng';
        else if (numId === -2) defName = 'Ngọc xanh';
        else if (numId === -3) defName = 'Hồng ngọc';
      }
      return {
        id: numId,
        name: defName,
        quantity: Number(it.quantity) || 1,
        options: Array.isArray(it.options) ? it.options : [],
      };
    });
  } catch {
    return [];
  }
}

export function previewItemsText(items, optionMap = {}) {
  const list = Array.isArray(items) ? items : detailJsonToItems(items);
  if (!list || !list.length) return 'Không có phần thưởng';
  return list.map((it) => {
    if (!it || typeof it !== 'object') return '';
    const numId = Number(it.id);
    const qtyStr = Number(it.quantity ?? 1).toLocaleString();
    if (numId === -1) return `• 🪙 Vàng: x${qtyStr}`;
    if (numId === -2) return `• 💎 Ngọc xanh: x${qtyStr}`;
    if (numId === -3) return `• 🔴 Hồng ngọc: x${qtyStr}`;

    const opts = (Array.isArray(it.options) ? it.options : [])
      .map((o) => {
        if (!o || typeof o !== 'object') return '';
        const tpl = optionMap[o.id];
        if (tpl && String(tpl).includes('#')) return String(tpl).replace(/#/g, String(o.param ?? 0));
        return tpl ? String(tpl) : `#${o.id}:${o.param ?? 0}`;
      })
      .filter(Boolean)
      .join(', ');
    const opt = opts ? `\n    ↳ ${opts}` : '';
    return `• ${it.name || `#${it.id}`} x${qtyStr}${opt}`;
  }).filter(Boolean).join('\n');
}
