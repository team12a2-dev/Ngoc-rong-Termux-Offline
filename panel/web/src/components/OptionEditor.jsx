import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

export function formatOptionLabel(id, param, templateMap = {}) {
  const template = templateMap[id];
  if (!template) return `Chỉ số #${id}: ${param}`;
  if (!String(template).includes('#')) return String(template);
  return String(template).replace(/#/g, String(param ?? 0));
}

let catalogCache = null;

export async function loadOptionCatalog(force = false) {
  if (catalogCache && !force) return catalogCache;
  const qs = force ? '?refresh=1' : '';
  const res = await api(`/players/meta/item-options${qs}`);
  catalogCache = {
    all: res.data || [],
    quick: res.quick || (res.data || []).filter((o) => (res.quickIds || []).includes(o.id)),
    map: res.map || {},
    categories: res.categories || {},
    quickIds: res.quickIds || [],
    meta: res.meta || {},
  };
  return catalogCache;
}

function ParamDialog({ option, onConfirm, onCancel }) {
  const [param, setParam] = useState(option.suggestParam ?? 1);
  const preview = String(option.name).includes('#')
    ? String(option.name).replace(/#/g, String(param))
    : option.name;

  return (
    <div className="option-param-dialog">
      <div className="option-param-head">
        <strong>#{option.id} — {option.name}</strong>
        <span className="badge">{option.categoryLabel}</span>
      </div>
      <p className="option-param-hint">{option.paramHint}</p>
      <p className="muted option-param-desc">{option.categoryDesc}</p>
      {String(option.name).includes('#') && (
        <>
          <label className="field">
            <span>Nhập số thay cho #</span>
            <input type="number" value={param} onChange={(e) => setParam(Number(e.target.value))} />
          </label>
          <div className="option-preview-box">
            Trong game: <strong>{preview}</strong>
          </div>
        </>
      )}
      <div className="row">
        <button type="button" className="btn sm primary" onClick={() => onConfirm(param)}>Thêm vào item</button>
        <button type="button" className="btn sm" onClick={onCancel}>Hủy</button>
      </div>
    </div>
  );
}

export function OptionEditor({ options, onChange, hideIds = [], compact = false }) {
  const [catalog, setCatalog] = useState({ all: [], quick: [], map: {}, categories: {} });
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [pickOption, setPickOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [meta, setMeta] = useState({});

  const reloadCatalog = async () => {
    setLoading(true);
    setLoadError(null);
    catalogCache = null;
    try {
      const c = await loadOptionCatalog(true);
      setCatalog(c);
      setMeta(c.meta || {});
    } catch (e) {
      setLoadError(e.message || 'Không tải được item_option_template từ DB game');
      setCatalog({ all: [], quick: [], map: {}, categories: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadCatalog();
  }, []);

  const list = (options?.length ? options : []).filter((o) => !hideIds.includes(o.id));

  function setOpt(idx, patch) {
    const visible = list;
    const target = visible[idx];
    if (!target) return;
    onChange((options || []).map((o) => (o.id === target.id ? { ...o, ...patch } : o)));
  }

  function removeOpt(idx) {
    const target = list[idx];
    if (!target) return;
    onChange((options || []).filter((o) => o.id !== target.id));
  }

  function addOption(option, param) {
    const p = String(option.name).includes('#') ? param : (param || 0);
    const full = options || [];
    const exists = full.findIndex((o) => o.id === option.id);
    if (exists >= 0) {
      onChange(full.map((o, i) => (i === exists ? { ...o, param: p } : o)));
    } else {
      onChange([...full, { id: option.id, param: p }]);
    }
    setPickOption(null);
  }

  const filteredCatalog = useMemo(() => {
    let rows = catalog.all;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((o) => o.name.toLowerCase().includes(q) || String(o.id) === q);
    } else if (category && category !== 'all') {
      rows = rows.filter((o) => o.category === category);
    }
    return rows;
  }, [catalog.all, category, search]);

  const catEntries = Object.entries(catalog.categories || {});
  const alreadyIds = new Set((options || []).map((o) => o.id));

  return (
    <div className={`option-editor-v3 ${compact ? 'option-editor-compact' : ''}`}>
      <details className="option-help-details" open={compact ? false : undefined}>
        <summary>Hướng dẫn: buff / dòng chỉ số trên item</summary>
        <div className="option-help-box">
          <p>
            Mỗi item gắn các dòng từ bảng <strong>item_option_template</strong> (DB game).
            Chọn dòng bên dưới → nhập số → lưu slot.
          </p>
          <ul className="option-help-list">
            <li><code>Giáp+#</code> + số 5 → <em>Giáp+5</em></li>
            <li><code>HP+#</code> + 1000 → <em>HP+1000</em></li>
            <li><code>Sức đánh+#%</code> + 5 → <em>Sức đánh+5%</em></li>
          </ul>
        </div>
      </details>

      {list.length > 0 && (
        <div className="option-current">
          <h5>Đang gắn trên item ({list.length})</h5>
          <ul className="option-list-readable">
            {list.map((o, idx) => {
              const meta = catalog.all.find((x) => x.id === o.id);
              return (
                <li key={`cur-${o.id}-${idx}`} className="option-list-item">
                  <div className="option-preview">
                    <span className="muted">#{o.id}</span> {formatOptionLabel(o.id, o.param, catalog.map)}
                  </div>
                  {meta && <div className="muted option-meta-line">{meta.name} · {meta.paramHint}</div>}
                  <div className="option-edit-row">
                    {String(catalog.map[o.id] || '').includes('#') && (
                      <label className="field mini">
                        <span>Số</span>
                        <input type="number" value={o.param ?? 0} onChange={(e) => setOpt(idx, { param: Number(e.target.value) })} />
                      </label>
                    )}
                    <button type="button" className="btn sm ghost" onClick={() => removeOpt(idx)}>Gỡ</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="option-template-section">
        <div className="section-head">
          <div>
            <h5>Danh sách item_option_template</h5>
            <p className="muted section-sub">
              {loading
                ? 'Đang đồng bộ từ DB game...'
                : `${filteredCatalog.length} / ${catalog.all.length} dòng từ bảng item_option_template · bấm + Thêm để gắn vào item`}
            </p>
            {!loading && meta.syncedAt && (
              <p className="muted section-sub">
                DB game: {meta.count ?? catalog.all.length} dòng
                {meta.loadError ? ` · lỗi cache: ${meta.loadError}` : ''}
              </p>
            )}
          </div>
          <button type="button" className="btn sm" onClick={reloadCatalog} disabled={loading}>
            Làm mới DB
          </button>
        </div>

        {loadError && (
          <div className="alert error">
            {loadError}
            <span className="muted"> — Khởi động lại Panel API (panel\stop-panel.bat rồi start-panel.bat) nếu route chưa có.</span>
          </div>
        )}

        <input
          className="catalog-search"
          placeholder="Tìm theo ID hoặc tên: giáp, hp, tấn công, 47..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="category-tabs">
          <button type="button" className={`tab ${category === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>
            Tất cả
          </button>
          {catEntries.map(([key, val]) => (
            <button
              key={key}
              type="button"
              className={`tab ${category === key ? 'active' : ''}`}
              onClick={() => setCategory(key)}
              title={val.desc}
            >
              {val.label}
            </button>
          ))}
        </div>

        <div className="option-template-table-wrap">
          <table className="compact option-template-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên template (item_option_template)</th>
                <th>Nhóm</th>
                <th>Ví dụ</th>
                <th>Gợi ý nhập số</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((o) => (
                <tr key={o.id} className={alreadyIds.has(o.id) ? 'row-active' : ''}>
                  <td><strong>{o.id}</strong></td>
                  <td className="template-name">{o.name || '—'}</td>
                  <td><span className="chip sm">{o.categoryLabel}</span></td>
                  <td className="example-cell">{o.example}</td>
                  <td className="hint-cell muted">{o.paramHint}</td>
                  <td>
                    <button type="button" className="btn sm primary" onClick={() => setPickOption(o)}>
                      {alreadyIds.has(o.id) ? 'Sửa' : '+ Thêm'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !loadError && catalog.all.length === 0 && (
            <p className="muted empty-hint">
              Bảng item_option_template trống trên DB game. Kiểm tra Config.properties và chạy npm run db:sync trong panel/api.
            </p>
          )}
          {!loading && !loadError && catalog.all.length > 0 && filteredCatalog.length === 0 && (
            <p className="muted empty-hint">Không tìm thấy dòng nào. Thử từ khóa hoặc nhóm khác.</p>
          )}
        </div>
      </div>

      {pickOption && (
        <ParamDialog
          option={pickOption}
          onConfirm={(param) => addOption(pickOption, param)}
          onCancel={() => setPickOption(null)}
        />
      )}
    </div>
  );
}

export function OptionChips({ options, optionMap }) {
  if (!options?.length) return null;
  return (
    <div className="option-chips">
      {options.map((o, i) => (
        <span key={i} className="chip" title={`#${o.id}`}>
          {formatOptionLabel(o.id, o.param, optionMap)}
        </span>
      ))}
    </div>
  );
}

export function useOptionMap() {
  const [map, setMap] = useState({});
  useEffect(() => {
    loadOptionCatalog().then((c) => setMap(c.map || {}));
  }, []);
  return map;
}
