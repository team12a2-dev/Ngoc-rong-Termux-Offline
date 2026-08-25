import { useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const MAP_PRESETS = [
  [0, 'Làng Aru'], [1, 'Làng Mori'], [2, 'Làng Kakarot'], [3, 'Đảo Kame'],
  [8, 'Rừng tre'], [9, 'Thung lũng'], [11, 'Núi hoa vàng'], [15, 'Núi khỉ'],
  [16, 'Núi tuyết'], [17, 'Đảo Guru'], [63, 'Thung lũng Nappa'], [92, 'Tương lai'],
  [105, 'Cold'], [110, 'Cold cuối'], [152, 'Khi Gas'], [156, 'Thánh địa Kaio'],
  [157, 'Thánh địa Kaio 2'], [164, 'Map riêng tư'],
];

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function boolValue(value) {
  return value === true || value === 1 || value === '1';
}

function newItem(template = {}) {
  return {
    tempId: Number(template.id ?? template.tempId ?? 0),
    mobTempId: Number(template.mobTempId ?? template.mob_temp_id ?? -1),
    mobName: template.mobName || template.mobLabel || '',
    playerLevelMin: Number(template.playerLevelMin ?? template.player_level_min ?? 0),
    playerLevelMax: Number(template.playerLevelMax ?? template.player_level_max ?? 19),
    timeStartMin: Number(template.timeStartMin ?? template.time_start_min ?? 0),
    timeEndMin: Number(template.timeEndMin ?? template.time_end_min ?? 1440),
    itemName: template.name || template.itemName || '',
    iconId: template.iconId ?? null,
    enabled: template.enabled === undefined ? true : boolValue(template.enabled),
    chancePercent: Number(template.chancePercent ?? template.chance_percent ?? 1),
    quantityMin: Number(template.quantityMin ?? template.quantity_min ?? 1),
    quantityMax: Number(template.quantityMax ?? template.quantity_max ?? 1),
    options: Array.isArray(template.options) ? template.options : [],
  };
}

function newRule(mapId = 0) {
  return {
    mapId: Number(mapId),
    enabled: true,
    goldEnabled: false,
    goldChancePercent: 10,
    goldMin: 100,
    goldMax: 1000,
    activationEnabled: false,
    activationChancePercent: 0.01,
    items: [],
  };
}

function normalizeRule(row, fallbackMapId) {
  if (!row) return newRule(fallbackMapId);
  return {
    mapId: Number(row.mapId ?? fallbackMapId),
    enabled: boolValue(row.enabled),
    goldEnabled: boolValue(row.goldEnabled),
    goldChancePercent: Number(row.goldChancePercent ?? 0),
    goldMin: Number(row.goldMin ?? 0),
    goldMax: Number(row.goldMax ?? 0),
    activationEnabled: boolValue(row.activationEnabled),
    activationChancePercent: Number(row.activationChancePercent ?? 0),
    items: (row.items || []).map((item) => ({
      ...newItem(item),
      id: item.id,
      tempId: Number(item.tempId ?? item.temp_id ?? 0),
      mobTempId: Number(item.mobTempId ?? item.mob_temp_id ?? -1),
      playerLevelMin: Number(item.playerLevelMin ?? item.player_level_min ?? 0),
      playerLevelMax: Number(item.playerLevelMax ?? item.player_level_max ?? 19),
      timeStartMin: Number(item.timeStartMin ?? item.time_start_min ?? 0),
      timeEndMin: Number(item.timeEndMin ?? item.time_end_min ?? 1440),
      enabled: boolValue(item.enabled),
      chancePercent: Number(item.chancePercent ?? item.chance_percent ?? 0),
      quantityMin: Number(item.quantityMin ?? item.quantity_min ?? 1),
      quantityMax: Number(item.quantityMax ?? item.quantity_max ?? item.quantityMin ?? 1),
      options: Array.isArray(item.options) ? item.options : [],
    })),
  };
}

function optionText(options) {
  return (options || []).map((option) => `${option.id}:${option.param}`).join(', ');
}

function parseOptions(value) {
  return String(value || '')
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [id, param = 0] = chunk.split(':');
      return { id: numberValue(id, -1), param: numberValue(param, 0) };
    })
    .filter((option) => option.id >= 0);
}

function mapLabel(mapId) {
  const preset = MAP_PRESETS.find(([id]) => id === Number(mapId));
  return preset ? `${preset[1]} (#${mapId})` : `Map #${mapId}`;
}

function itemLabel(item) {
  return item.itemName || `Item #${item.tempId}`;
}

function timeLabel(start, end) {
  if (Number(start) === Number(end) || (Number(start) === 0 && Number(end) === 1440)) return 'Cả ngày';
  const format = (minute) => `${String(Math.floor(Number(minute) / 60)).padStart(2, '0')}:${String(Number(minute) % 60).padStart(2, '0')}`;
  return `${format(start)}–${format(end)}`;
}

export default function DropConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [mapId, setMapId] = useState('');
  const [form, setForm] = useState(newRule(0));
  const [catalog, setCatalog] = useState([]);
  const [catalogQ, setCatalogQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const fb = useFeedback();

  const selectedConfig = configs.find((row) => Number(row.mapId) === Number(form.mapId));

  async function loadConfigs(preferredMapId = mapId) {
    setLoading(true);
    try {
      const res = await api(`/drop-config?serverId=${getServerId()}`);
      const rows = res.data || [];
      setConfigs(rows);
      if (preferredMapId !== '' && rows.some((row) => Number(row.mapId) === Number(preferredMapId))) {
        const row = rows.find((item) => Number(item.mapId) === Number(preferredMapId));
        setMapId(String(preferredMapId));
        setForm(normalizeRule(row, preferredMapId));
      } else if (rows.length > 0 && preferredMapId === '') {
        setMapId(String(rows[0].mapId));
        setForm(normalizeRule(rows[0], rows[0].mapId));
      }
    } catch (error) {
      fb.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfigs('').catch(() => {});
  }, []);

  function chooseMap(value) {
    const nextMapId = String(value);
    setMapId(nextMapId);
    const row = configs.find((item) => Number(item.mapId) === Number(nextMapId));
    setForm(normalizeRule(row, nextMapId));
  }

  function patch(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function patchItem(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItem(template = {}) {
    const next = newItem({ ...template, mobTempId: -1, playerLevelMin: 0, playerLevelMax: 19, timeStartMin: 0, timeEndMin: 1440 });
    if (!Number.isInteger(next.tempId) || next.tempId < 0) return;
    const duplicate = form.items.some((item) => Number(item.tempId) === next.tempId
      && Number(item.mobTempId) === -1 && Number(item.playerLevelMin) === 0
      && Number(item.playerLevelMax) === 19 && Number(item.timeStartMin) === 0 && Number(item.timeEndMin) === 1440);
    if (duplicate) {
      fb.error(`Item #${next.tempId} đã có trong cấu hình nhanh của map này.`);
      return;
    }
    setForm((prev) => ({ ...prev, items: [...prev.items, next] }));
  }

  function removeItem(index) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function searchCatalog(e) {
    e?.preventDefault();
    try {
      const res = await api(`/drop-config/item-templates?q=${encodeURIComponent(catalogQ)}&limit=80`);
      setCatalog(res.data || []);
    } catch (error) {
      fb.error(error.message);
    }
  }

  function applyGoldPreset(type) {
    if (type === 'safe') {
      patch('goldEnabled', true);
      patch('goldChancePercent', 10);
      patch('goldMin', 100);
      patch('goldMax', 1000);
    }
    if (type === 'farm') {
      patch('goldEnabled', true);
      patch('goldChancePercent', 25);
      patch('goldMin', 500);
      patch('goldMax', 5000);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!Number.isInteger(Number(form.mapId)) || Number(form.mapId) < 0) {
      fb.error('Hãy nhập Map ID hợp lệ trước khi lưu.');
      return;
    }
    setBusy(true);
    try {
      const res = await api('/drop-config', {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId(), rule: form, items: form.items }),
      });
      fb.success(`Đã lưu ${mapLabel(form.mapId)} với ${res.data?.itemCount ?? form.items.length} item và reload runtime.`);
      await loadConfigs(String(form.mapId));
    } catch (error) {
      fb.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeConfig() {
    if (!selectedConfig) return;
    if (!window.confirm(`Xóa toàn bộ cấu hình drop của ${mapLabel(form.mapId)}?`)) return;
    setBusy(true);
    try {
      await api(`/drop-config/${form.mapId}?serverId=${getServerId()}`, { method: 'DELETE' });
      fb.success(`Đã xóa cấu hình drop của ${mapLabel(form.mapId)}.`);
      setConfigs((prev) => prev.filter((row) => Number(row.mapId) !== Number(form.mapId)));
      setForm(newRule(form.mapId));
    } catch (error) {
      fb.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function reloadRuntime() {
    setBusy(true);
    try {
      const res = await api('/drop-config/reload', { method: 'POST', body: JSON.stringify({ serverId: getServerId() }) });
      fb.success(res.data?.reloaded ? 'Đã reload cấu hình Drop theo Map.' : `Reload chưa thành công: ${res.data?.error || 'Agent không phản hồi'}`);
    } catch (error) {
      fb.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  const enabledItems = form.items.filter((item) => item.enabled);

  return (
    <div>
      <PageHeader
        title="Drop theo Map"
        description="Cấu hình nhanh theo nguyên tắc: chọn map → thêm item → đặt tỷ lệ và số lượng → lưu. Điều kiện Mob, level và giờ chỉ mở khi thật sự cần."
        actions={<button className="btn" type="button" onClick={reloadRuntime} disabled={busy}>Reload runtime</button>}
      />
      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="help-box drop-quick-guide">
        <h4>Thiết lập nhanh trong 3 bước</h4>
        <p><strong>1.</strong> Chọn hoặc nhập Map ID. <strong>2.</strong> Tìm item và bấm <strong>Thêm</strong>; mặc định item áp dụng cho mọi quái, mọi level và cả ngày. <strong>3.</strong> Đặt tỷ lệ, số lượng rồi bấm <strong>Lưu & reload</strong>.</p>
        <p className="muted">Mặc định an toàn: vàng và sét đang tắt; item mới có tỷ lệ 1%, số lượng 1. Mở mục <strong>Nâng cao</strong> nếu cần lọc theo Mob, level, giờ hoặc option drop.</p>
      </div>

      <div className="drop-layout drop-simple-layout">
        <aside className="card drop-map-list">
          <div className="section-head">
            <div><h3>Chọn map</h3><p className="muted">{configs.length} map đã cấu hình</p></div>
            <button className="btn sm" type="button" onClick={() => { setMapId(''); setForm(newRule(0)); }} disabled={busy}>Map mới</button>
          </div>
          <div className="drop-map-new row">
            <input type="number" min="0" max="9999" placeholder="Map ID" value={mapId} onChange={(e) => setMapId(e.target.value)} />
            <button className="btn sm" type="button" onClick={() => chooseMap(mapId)} disabled={busy || mapId === ''}>Mở</button>
          </div>
          <label className="field">Map thường
            <select value="" onChange={(e) => chooseMap(e.target.value)}>
              <option value="">Chọn map nhanh...</option>
              {MAP_PRESETS.map(([id, name]) => <option key={id} value={id}>{name} · #{id}</option>)}
            </select>
          </label>
          <div className="drop-map-items">
            {configs.map((row) => (
              <button type="button" key={row.mapId} className={`drop-map-item${Number(row.mapId) === Number(form.mapId) ? ' active' : ''}`} onClick={() => chooseMap(String(row.mapId))}>
                <span><strong>{mapLabel(row.mapId)}</strong><small>{row.items?.length || 0} item · {row.enabled ? 'Bật' : 'Tắt'}</small></span>
                <i className={row.enabled ? 'status-dot ok' : 'status-dot'} />
              </button>
            ))}
            {!loading && configs.length === 0 && <p className="muted drop-empty">Chưa có map. Nhập Map ID để bắt đầu.</p>}
          </div>
        </aside>

        <main>
          <form className="control-card section" onSubmit={save}>
            <div className="section-head">
              <div><h3>{selectedConfig ? `Cấu hình ${mapLabel(form.mapId)}` : 'Tạo cấu hình drop mới'}</h3><p className="muted">Chỉ cần nhập các trường có nhu cầu; phần còn lại dùng mặc định.</p></div>
              <div className="row">
                {selectedConfig && <button className="btn sm danger" type="button" onClick={removeConfig} disabled={busy}>Xóa map</button>}
                <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu & reload'}</button>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">Map ID<input type="number" min="0" max="9999" value={form.mapId} onChange={(e) => { patch('mapId', numberValue(e.target.value)); setMapId(e.target.value); }} required /></label>
              <label className="field checkbox-field"><span>Trạng thái map</span><span><input type="checkbox" checked={form.enabled} onChange={(e) => patch('enabled', e.target.checked)} /> Áp dụng rule trên map</span></label>
              <div className="field field-note"><span>Đang cấu hình</span><p>{mapLabel(form.mapId)} · {enabledItems.length} item bật</p></div>
            </div>

            <div className="drop-section-card">
              <div className="section-head"><div><h4>Vàng rơi <span className="badge">Tùy chọn</span></h4><p className="muted">Mặc định giữ nguyên vàng gốc của game.</p></div><label className="toggle-empty"><input type="checkbox" checked={form.goldEnabled} onChange={(e) => patch('goldEnabled', e.target.checked)} /> Bật vàng custom</label></div>
              {form.goldEnabled && <>
                <div className="form-grid compact-form">
                  <label className="field">Tỷ lệ (%)<input type="number" min="0" max="100" step="0.01" value={form.goldChancePercent} onChange={(e) => patch('goldChancePercent', numberValue(e.target.value))} /></label>
                  <label className="field">Vàng từ<input type="number" min="0" max="2147483647" value={form.goldMin} onChange={(e) => patch('goldMin', numberValue(e.target.value))} /></label>
                  <label className="field">Vàng đến<input type="number" min="0" max="2147483647" value={form.goldMax} onChange={(e) => patch('goldMax', numberValue(e.target.value))} /></label>
                </div>
                <div className="row preset-row"><button className="btn sm" type="button" onClick={() => applyGoldPreset('safe')}>An toàn · 10% · 100–1.000</button><button className="btn sm" type="button" onClick={() => applyGoldPreset('farm')}>Farm · 25% · 500–5.000</button></div>
              </>}
            </div>

            <div className="drop-section-card">
              <div className="section-head"><div><h4>Item rơi</h4><p className="muted">Mặc định: mọi quái · level 0–19 · cả ngày. Mỗi item roll độc lập.</p></div></div>
              <div className="row drop-quick-catalog"><input placeholder="Tìm item theo tên hoặc ID, ví dụ: 457" value={catalogQ} onChange={(e) => setCatalogQ(e.target.value)} /><button className="btn" type="button" onClick={() => searchCatalog()}>Tìm item</button></div>
              {catalog.length > 0 && <div className="table-wrap drop-catalog-quick"><table className="compact"><thead><tr><th>ID</th><th>Tên</th><th /><th /></tr></thead><tbody>{catalog.map((item) => <tr key={item.id}><td><code>#{item.id}</code></td><td><strong>{item.name}</strong></td><td>{item.gender ?? '-'}</td><td><button className="btn sm" type="button" onClick={() => addItem(item)}>Thêm</button></td></tr>)}</tbody></table></div>}
              <div className="table-wrap drop-quick-items-table"><table className="compact"><thead><tr><th>Bật</th><th>Item</th><th>Tỷ lệ %</th><th>Số lượng từ</th><th>Số lượng đến</th><th /></tr></thead><tbody>
                {form.items.map((item, index) => <tr key={`${item.tempId}-${index}`}><td><input type="checkbox" checked={item.enabled} onChange={(e) => patchItem(index, 'enabled', e.target.checked)} /></td><td><strong>{itemLabel(item)}</strong><small>#{item.tempId}</small></td><td><input className="input-xs" type="number" min="0" max="100" step="0.01" value={item.chancePercent} onChange={(e) => patchItem(index, 'chancePercent', numberValue(e.target.value))} /></td><td><input className="input-xs" type="number" min="1" value={item.quantityMin} onChange={(e) => patchItem(index, 'quantityMin', numberValue(e.target.value, 1))} /></td><td><input className="input-xs" type="number" min="1" value={item.quantityMax} onChange={(e) => patchItem(index, 'quantityMax', numberValue(e.target.value, 1))} /></td><td><button className="btn sm danger" type="button" onClick={() => removeItem(index)}>Xóa</button></td></tr>)}
                {form.items.length === 0 && <tr><td colSpan={6} className="muted">Chưa có item. Tìm item ở trên rồi bấm Thêm.</td></tr>}
              </tbody></table></div>
            </div>

            <details className="drop-advanced-details">
              <summary>Nâng cao: sét, Mob, level, khung giờ và option drop</summary>
              <div className="drop-section-card">
                <div className="section-head"><div><h4>Sét kích hoạt</h4><p className="muted">Chỉ bật khi map cần tỷ lệ sét riêng; mặc định đang tắt.</p></div><label className="toggle-empty"><input type="checkbox" checked={form.activationEnabled} onChange={(e) => patch('activationEnabled', e.target.checked)} /> Bật sét</label></div>
                {form.activationEnabled && <label className="field">Tỷ lệ sét (%)<input type="number" min="0" max="100" step="0.01" value={form.activationChancePercent} onChange={(e) => patch('activationChancePercent', numberValue(e.target.value))} /></label>}
              </div>
              <div className="drop-section-card"><h4>Điều kiện từng item</h4><p className="muted">Chỉnh trực tiếp khi cần: Mob `-1` = mọi quái, level `0–19`, giờ tính theo phút từ đầu ngày, `00:00–24:00` = cả ngày.</p><div className="table-wrap drop-advanced-items-table"><table className="compact"><thead><tr><th>Item</th><th>Mob ID</th><th>Level từ</th><th>Level đến</th><th>Giờ từ (phút)</th><th>Giờ đến (phút)</th><th>Options</th></tr></thead><tbody>{form.items.map((item, index) => <tr key={`advanced-${item.tempId}-${index}`}><td>{itemLabel(item)}</td><td><input className="input-xs" type="number" value={item.mobTempId} onChange={(e) => patchItem(index, 'mobTempId', numberValue(e.target.value, -1))} /></td><td><input className="input-xs" type="number" min="0" max="19" value={item.playerLevelMin} onChange={(e) => patchItem(index, 'playerLevelMin', numberValue(e.target.value, 0))} /></td><td><input className="input-xs" type="number" min="0" max="19" value={item.playerLevelMax} onChange={(e) => patchItem(index, 'playerLevelMax', numberValue(e.target.value, 19))} /></td><td><input className="input-xs" type="number" min="0" max="1439" value={item.timeStartMin} onChange={(e) => patchItem(index, 'timeStartMin', numberValue(e.target.value, 0))} /></td><td><input className="input-xs" type="number" min="0" max="1440" value={item.timeEndMin} onChange={(e) => patchItem(index, 'timeEndMin', numberValue(e.target.value, 1440))} /></td><td><input className="input-options" placeholder="id:param" value={optionText(item.options)} onChange={(e) => patchItem(index, 'options', parseOptions(e.target.value))} /></td></tr>)}</tbody></table></div></div>
            </details>
          </form>

          <div className="drop-preview card section"><h3>Tóm tắt</h3><div className="drop-preview-grid"><div><strong>Map</strong><span>{mapLabel(form.mapId)}</span></div><div><strong>Vàng</strong><span>{form.goldEnabled ? `${form.goldChancePercent}% · ${form.goldMin.toLocaleString('vi-VN')}–${form.goldMax.toLocaleString('vi-VN')}` : 'Giữ mặc định'}</span></div><div><strong>Item</strong><span>{enabledItems.length} item bật · mặc định mọi quái/cả ngày</span></div></div></div>
        </main>
      </div>
    </div>
  );
}
