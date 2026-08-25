import { useEffect, useMemo, useState } from 'react';
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
    itemName: template.name || template.itemName || '',
    iconId: template.iconId ?? null,
    enabled: true,
    chancePercent: 1,
    quantityMin: 1,
    quantityMax: 1,
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
      mobTempId: Number(item.mobTempId ?? item.mob_temp_id ?? -1),
      mobName: item.mobName || item.mobLabel || '',
      playerLevelMin: Number(item.playerLevelMin ?? item.player_level_min ?? 0),
      playerLevelMax: Number(item.playerLevelMax ?? item.player_level_max ?? 19),
      enabled: boolValue(item.enabled),
      chancePercent: Number(item.chancePercent ?? 0),
      quantityMin: Number(item.quantityMin ?? 1),
      quantityMax: Number(item.quantityMax ?? item.quantityMin ?? 1),
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

function mobDropLabel(mobTempId, mobName = '') {
  return Number(mobTempId) < 0 ? 'Tất cả quái' : mobName ? `${mobName} · #${mobTempId}` : `Mob #${mobTempId}`;
}

export default function DropConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [mapId, setMapId] = useState('');
  const [form, setForm] = useState(newRule(0));
  const [catalog, setCatalog] = useState([]);
  const [catalogQ, setCatalogQ] = useState('');
  const [mobs, setMobs] = useState([]);
  const [mobQ, setMobQ] = useState('');
  const [selectedMob, setSelectedMob] = useState({ id: -1, name: 'Tất cả quái' });
  const [selectedLevelRange, setSelectedLevelRange] = useState({ min: 0, max: 19 });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const fb = useFeedback();

  const selectedConfig = useMemo(
    () => configs.find((row) => Number(row.mapId) === Number(mapId)),
    [configs, mapId],
  );

  async function loadConfigs(preferredMapId = mapId) {
    setLoading(true);
    try {
      const res = await api(`/drop-config?serverId=${getServerId()}`);
      const rows = res.data || [];
      setConfigs(rows);
      if (preferredMapId !== '' && rows.some((row) => Number(row.mapId) === Number(preferredMapId))) {
        const row = rows.find((item) => Number(item.mapId) === Number(preferredMapId));
        setForm(normalizeRule(row, preferredMapId));
      } else if (rows.length > 0 && preferredMapId === '') {
        setMapId(String(rows[0].mapId));
        setForm(normalizeRule(rows[0], rows[0].mapId));
      }
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfigs('').catch(() => {});
  }, []);

  useEffect(() => {
    searchMobs().catch(() => {});
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
    const tempId = Number(template.id ?? template.tempId ?? 0);
    const mobTempId = Number(template.mobTempId ?? selectedMob.id ?? -1);
    if (!Number.isInteger(tempId) || tempId < 0) return;
    const levelMin = Number(template.playerLevelMin ?? selectedLevelRange.min ?? 0);
    const levelMax = Math.max(levelMin, Number(template.playerLevelMax ?? selectedLevelRange.max ?? 19));
    if (form.items.some((item) => Number(item.tempId) === tempId && Number(item.mobTempId) === mobTempId
      && Number(item.playerLevelMin) === levelMin && Number(item.playerLevelMax) === levelMax)) {
      fb.error(`Item #${tempId} đã có cho ${mobDropLabel(mobTempId, selectedMob.name)} và level ${levelMin}–${levelMax}.`);
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem({
        ...template,
        mobTempId,
        mobName: selectedMob.name,
        playerLevelMin: levelMin,
        playerLevelMax: levelMax,
      })],
    }));
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

  async function searchMobs(e) {
    e?.preventDefault();
    try {
      const res = await api(`/drop-config/mobs?q=${encodeURIComponent(mobQ)}&limit=100`);
      setMobs(res.data || []);
    } catch (error) {
      fb.error(error.message);
    }
  }

  function applyPreset(type) {
    if (type === 'gold-safe') {
      patch('goldEnabled', true);
      patch('goldChancePercent', 10);
      patch('goldMin', 100);
      patch('goldMax', 1000);
    }
    if (type === 'gold-high') {
      patch('goldEnabled', true);
      patch('goldChancePercent', 25);
      patch('goldMin', 500);
      patch('goldMax', 5000);
    }
    if (type === 'activation-low') {
      patch('activationEnabled', true);
      patch('activationChancePercent', 0.01);
    }
    if (type === 'activation-event') {
      patch('activationEnabled', true);
      patch('activationChancePercent', 0.1);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (mapId === '' || !Number.isInteger(Number(form.mapId))) {
      fb.error('Hãy nhập Map ID hợp lệ trước khi lưu.');
      return;
    }
    setBusy(true);
    try {
      const res = await api('/drop-config', {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId(), rule: form, items: form.items }),
      });
      fb.success(`Đã lưu ${mapLabel(form.mapId)} với ${res.data?.itemCount ?? form.items.length} item. Java runtime đã được yêu cầu reload.`);
      await loadConfigs(String(form.mapId));
    } catch (e2) {
      fb.error(e2.message);
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
      fb.success(`Đã xóa cấu hình drop của ${mapLabel(form.mapId)} và reload runtime.`);
      setConfigs((prev) => prev.filter((row) => Number(row.mapId) !== Number(form.mapId)));
      setForm(newRule(form.mapId));
    } catch (e) {
      fb.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function reloadRuntime() {
    setBusy(true);
    try {
      const res = await api('/drop-config/reload', { method: 'POST', body: JSON.stringify({ serverId: getServerId() }) });
      fb.success(`Đã yêu cầu reload ${res.data?.type || 'drop-config'} trên Java runtime.`);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const itemCount = form.items.length;
  const enabledItemCount = form.items.filter((item) => item.enabled).length;

  return (
    <div>
      <PageHeader
        title="Drop theo Map"
        description="Cấu hình vàng, sét kích hoạt và vật phẩm rơi theo từng map bằng form trực quan; panel tự lưu database rồi reload Java runtime."
        actions={<button className="btn" type="button" onClick={reloadRuntime} disabled={busy}>Reload runtime</button>}
      />
      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="help-box">
        <h4>Logic áp dụng</h4>
        <p>Mỗi map có tối đa một rule. Khi rule được bật, gold mặc định và sét kích hoạt mặc định của map đó sẽ được thay bằng cấu hình trong form; các item custom sẽ được roll độc lập theo tỷ lệ phần trăm sau mỗi lần quái thường chết. Boss, player và drop đặc biệt của dungeon không bị thay đổi.</p>
        <p className="muted">Tỷ lệ dùng phần trăm thực: `0.01%` là một phần mười nghìn, `1%` là một phần trăm, `100%` luôn rơi. Lượng vàng dùng khoảng số nguyên min–max; item dùng quantity min–max.</p>
      </div>

      <div className="drop-layout">
        <aside className="card drop-map-list">
          <div className="section-head">
            <div><h3>Map đã cấu hình</h3><p className="muted">{configs.length} rule</p></div>
            <button className="btn sm" type="button" onClick={() => { setMapId(''); setForm(newRule(0)); }} disabled={busy}>+ Map mới</button>
          </div>
          <div className="drop-map-new row">
            <input type="number" min="0" max="9999" placeholder="Map ID" value={mapId} onChange={(e) => setMapId(e.target.value)} />
            <button className="btn sm" type="button" onClick={() => chooseMap(mapId)} disabled={busy || mapId === ''}>Mở</button>
          </div>
          <div className="drop-map-presets">
            <label className="field">Map thường
              <select value="" onChange={(e) => chooseMap(e.target.value)}>
                <option value="">Chọn map nhanh...</option>
                {MAP_PRESETS.map(([id, name]) => <option key={id} value={id}>{name} · #{id}</option>)}
              </select>
            </label>
          </div>
          <div className="drop-map-items">
            {configs.map((row) => (
              <button
                type="button"
                key={row.mapId}
                className={`drop-map-item${Number(row.mapId) === Number(mapId) ? ' active' : ''}`}
                onClick={() => chooseMap(String(row.mapId))}
              >
                <span><strong>{mapLabel(row.mapId)}</strong><small>{row.items?.length || 0} item · {row.enabled ? 'Bật' : 'Tắt'}</small></span>
                <i className={row.enabled ? 'status-dot ok' : 'status-dot'} />
              </button>
            ))}
            {!loading && configs.length === 0 && <p className="muted drop-empty">Chưa có rule. Chọn Map ID để tạo cấu hình đầu tiên.</p>}
          </div>
        </aside>

        <main>
          <form className="control-card section" onSubmit={save}>
            <div className="section-head">
              <div><h3>{selectedConfig ? `Cấu hình ${mapLabel(form.mapId)}` : 'Tạo cấu hình drop mới'}</h3><p className="muted">Một lần lưu sẽ cập nhật toàn bộ rule và yêu cầu Java Agent reload.</p></div>
              <div className="row">
                {selectedConfig && <button className="btn sm danger" type="button" onClick={removeConfig} disabled={busy}>Xóa rule</button>}
                <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Đang lưu/reload...' : 'Lưu & reload'}</button>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">Map ID<input type="number" min="0" max="9999" value={form.mapId} onChange={(e) => { patch('mapId', numberValue(e.target.value)); setMapId(e.target.value); }} required /></label>
              <label className="field">Tên gợi nhớ<select value={MAP_PRESETS.find(([id]) => id === Number(form.mapId))?.[0] ?? ''} onChange={(e) => { if (e.target.value !== '') { chooseMap(e.target.value); } }}><option value="">Tự động theo Map ID</option>{MAP_PRESETS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
              <label className="field checkbox-field"><span>Áp dụng rule trên map</span><input type="checkbox" checked={form.enabled} onChange={(e) => patch('enabled', e.target.checked)} /></label>
            </div>

            <div className="drop-section-card">
              <div className="section-head"><div><h4>Vàng rơi</h4><p className="muted">Bật để thay tỷ lệ vàng mặc định của map bằng cấu hình này.</p></div><label className="toggle-empty"><input type="checkbox" checked={form.goldEnabled} onChange={(e) => patch('goldEnabled', e.target.checked)} /> Bật tùy chỉnh</label></div>
              <div className="form-grid compact-form">
                <label className="field">Tỷ lệ rơi (%)<input type="number" min="0" max="100" step="0.01" value={form.goldChancePercent} disabled={!form.goldEnabled} onChange={(e) => patch('goldChancePercent', numberValue(e.target.value))} /></label>
                <label className="field">Vàng tối thiểu<input type="number" min="0" max="2147483647" value={form.goldMin} disabled={!form.goldEnabled} onChange={(e) => patch('goldMin', numberValue(e.target.value))} /></label>
                <label className="field">Vàng tối đa<input type="number" min="0" max="2147483647" value={form.goldMax} disabled={!form.goldEnabled} onChange={(e) => patch('goldMax', numberValue(e.target.value))} /></label>
              </div>
              <div className="row preset-row"><button className="btn sm" type="button" onClick={() => applyPreset('gold-safe')}>Preset an toàn 10% · 100–1.000</button><button className="btn sm" type="button" onClick={() => applyPreset('gold-high')}>Preset farm 25% · 500–5.000</button></div>
            </div>

            <div className="drop-section-card">
              <div className="section-head"><div><h4>Sét kích hoạt</h4><p className="muted">Giữ nguyên bộ chọn item theo giới tính hiện tại của Java server.</p></div><label className="toggle-empty"><input type="checkbox" checked={form.activationEnabled} onChange={(e) => patch('activationEnabled', e.target.checked)} /> Bật rơi sét</label></div>
              <div className="form-grid compact-form">
                <label className="field">Tỷ lệ rơi sét (%)<input type="number" min="0" max="100" step="0.01" value={form.activationChancePercent} disabled={!form.activationEnabled} onChange={(e) => patch('activationChancePercent', numberValue(e.target.value))} /></label>
                <div className="field field-note"><span>Ý nghĩa</span><p>{form.activationEnabled ? `${form.activationChancePercent}% cho mỗi lần quái thường chết tại map này.` : 'Đang tắt; không rơi sét từ rule custom.'}</p></div>
              </div>
              <div className="row preset-row"><button className="btn sm" type="button" onClick={() => applyPreset('activation-low')}>Preset thấp 0,01%</button><button className="btn sm" type="button" onClick={() => applyPreset('activation-event')}>Preset sự kiện 0,1%</button></div>
            </div>

            <div className="drop-section-card">
              <div className="section-head"><div><h4>Vật phẩm rơi tại map</h4><p className="muted">{enabledItemCount}/{itemCount} item đang bật · mỗi item roll độc lập · Mob ID `-1` = áp dụng mọi quái.</p></div><button className="btn sm" type="button" onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, newItem()] }))}>+ Thêm dòng</button></div>
              <div className="table-wrap drop-items-table-wrap">
                <table className="compact drop-items-table"><thead><tr><th>Bật</th><th>Mob ID</th><th>Level từ</th><th>Level đến</th><th>Item ID</th><th>Tên</th><th>Tỷ lệ %</th><th>SL từ</th><th>SL đến</th><th>Options</th><th /></tr></thead>
                  <tbody>
                    {form.items.map((item, index) => (
                      <tr key={`${item.tempId}-${item.mobTempId}-${item.playerLevelMin}-${item.playerLevelMax}-${index}`}>
                        <td><input type="checkbox" checked={item.enabled} onChange={(e) => patchItem(index, 'enabled', e.target.checked)} /></td>
                        <td><input className="input-xs" type="number" min="-1" value={item.mobTempId} title="-1 = tất cả quái" onChange={(e) => patchItem(index, 'mobTempId', numberValue(e.target.value, -1))} /></td>
                        <td><input className="input-xs" type="number" min="0" max="19" value={item.playerLevelMin} onChange={(e) => patchItem(index, 'playerLevelMin', numberValue(e.target.value, 0))} /></td>
                        <td><input className="input-xs" type="number" min="0" max="19" value={item.playerLevelMax} onChange={(e) => patchItem(index, 'playerLevelMax', numberValue(e.target.value, 19))} /></td>
                        <td><input className="input-xs" type="number" min="0" value={item.tempId} onChange={(e) => patchItem(index, 'tempId', numberValue(e.target.value))} /></td>
                        <td><span className="drop-item-name">{item.itemName || `Item #${item.tempId}`}<small>{mobDropLabel(item.mobTempId)}</small></span></td>
                        <td><input className="input-xs" type="number" min="0" max="100" step="0.01" value={item.chancePercent} onChange={(e) => patchItem(index, 'chancePercent', numberValue(e.target.value))} /></td>
                        <td><input className="input-xs" type="number" min="1" value={item.quantityMin} onChange={(e) => patchItem(index, 'quantityMin', numberValue(e.target.value, 1))} /></td>
                        <td><input className="input-xs" type="number" min="1" value={item.quantityMax} onChange={(e) => patchItem(index, 'quantityMax', numberValue(e.target.value, 1))} /></td>
                        <td><input className="input-options" placeholder="id:param, ..." value={optionText(item.options)} onChange={(e) => patchItem(index, 'options', parseOptions(e.target.value))} /></td>
                        <td><button className="btn sm danger" type="button" onClick={() => removeItem(index)}>Xóa</button></td>
                      </tr>
                    ))}
                    {form.items.length === 0 && <tr><td colSpan={11} className="muted">Chưa có item custom. Dùng catalog bên dưới để thêm nhanh.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </form>

          <div className="card section">
            <div className="section-head"><div><h3>Loại quái áp dụng</h3><p className="muted">Chọn Mob ID trước khi thêm item. `-1` áp dụng cho mọi loại quái trong map.</p></div><form className="row" onSubmit={searchMobs}><input placeholder="Tìm tên quái hoặc Mob ID" value={mobQ} onChange={(e) => setMobQ(e.target.value)} /><button className="btn" type="submit">Tìm quái</button></form></div>
            <div className="drop-mob-selected"><button type="button" className={`btn sm${selectedMob.id < 0 ? ' primary' : ''}`} onClick={() => setSelectedMob({ id: -1, name: 'Tất cả quái' })}>Tất cả quái</button><strong>Đang chọn: {mobDropLabel(selectedMob.id, selectedMob.name)}</strong></div>
            <div className="drop-level-default form-grid compact-form">
              <label className="field">Level người chơi từ<input type="number" min="0" max="19" value={selectedLevelRange.min} onChange={(e) => setSelectedLevelRange((prev) => ({ ...prev, min: numberValue(e.target.value, 0) }))} /></label>
              <label className="field">Level người chơi đến<input type="number" min="0" max="19" value={selectedLevelRange.max} onChange={(e) => setSelectedLevelRange((prev) => ({ ...prev, max: numberValue(e.target.value, 19) }))} /></label>
              <div className="field field-note"><span>Áp dụng khi thêm item</span><p>Item mới từ Catalog sẽ nhận level {selectedLevelRange.min}–{Math.max(selectedLevelRange.min, selectedLevelRange.max)}.</p></div>
            </div>
            <div className="table-wrap"><table className="compact"><thead><tr><th>Mob ID</th><th>Tên quái</th><th>Type</th><th>HP</th><th /></tr></thead><tbody>
              {mobs.map((mob) => <tr key={mob.id}><td><code>#{mob.id}</code></td><td><strong>{mob.name}</strong></td><td>{mob.type}</td><td>{Number(mob.hp || 0).toLocaleString('vi-VN')}</td><td><button className={`btn sm${Number(selectedMob.id) === Number(mob.id) ? ' primary' : ''}`} type="button" onClick={() => setSelectedMob({ id: Number(mob.id), name: mob.name })}>{Number(selectedMob.id) === Number(mob.id) ? 'Đang chọn' : 'Chọn'}</button></td></tr>)}
              {mobs.length === 0 && <tr><td colSpan={5} className="muted">Nhập từ khóa rồi bấm Tìm quái để nạp danh sách.</td></tr>}
            </tbody></table></div>
          </div>

          <div className="card section">
            <div className="section-head"><div><h3>Catalog item</h3><p className="muted">Tìm item theo ID/tên rồi thêm vào rule mà không cần mở database.</p></div><form className="row" onSubmit={searchCatalog}><input placeholder="Ví dụ: 457 hoặc thỏi vàng" value={catalogQ} onChange={(e) => setCatalogQ(e.target.value)} /><button className="btn" type="submit">Tìm</button></form></div>
            <div className="table-wrap"><table className="compact"><thead><tr><th>ID</th><th>Tên</th><th>Gender</th><th>Power</th><th /></tr></thead><tbody>
              {catalog.map((item) => <tr key={item.id}><td><code>#{item.id}</code></td><td><strong>{item.name}</strong></td><td>{item.gender}</td><td>{Number(item.powerRequire || 0).toLocaleString('vi-VN')}</td><td><button className="btn sm" type="button" onClick={() => addItem(item)} disabled={form.items.some((row) => Number(row.tempId) === Number(item.id) && Number(row.mobTempId) === Number(selectedMob.id) && Number(row.playerLevelMin) === Number(selectedLevelRange.min) && Number(row.playerLevelMax) === Math.max(Number(selectedLevelRange.min), Number(selectedLevelRange.max)))}>Thêm</button></td></tr>)}
              {catalog.length === 0 && <tr><td colSpan={5} className="muted">Nhập từ khóa rồi bấm Tìm để nạp catalog.</td></tr>}
            </tbody></table></div>
          </div>

          <div className="drop-preview card section">
            <h3>Preview logic của {mapLabel(form.mapId)}</h3>
            <div className="drop-preview-grid">
              <div><strong>Vàng</strong><span>{form.goldEnabled ? `${form.goldChancePercent}% · ${form.goldMin.toLocaleString('vi-VN')}–${form.goldMax.toLocaleString('vi-VN')}` : 'Tắt override'}</span></div>
              <div><strong>Sét kích hoạt</strong><span>{form.activationEnabled ? `${form.activationChancePercent}% · chọn theo gender` : 'Tắt'}</span></div>
              <div><strong>Item custom</strong><span>{enabledItemCount} item · roll độc lập</span></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
