import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import ItemIcon from '../components/ItemIcon';

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function newRule(bossId = -1) {
  return {
    bossId: Number(bossId), enabled: true, mapIds: [], zonePolicy: 'random', zoneMin: 2, zoneMax: 99,
    spawnChancePercent: 100, respawnMinSec: 60, respawnMaxSec: 600, maxActive: 1, drops: [],
  };
}

function normalizeRule(row, bossId) {
  const base = newRule(bossId);
  if (!row) return base;
  return {
    ...base, ...row, bossId: Number(row.bossId ?? bossId), mapIds: (row.mapIds || []).map(Number),
    drops: (row.drops || []).map((drop) => ({
      ...drop, tempId: Number(drop.tempId), enabled: drop.enabled !== false,
      chancePercent: Number(drop.chancePercent ?? 100), quantityMin: Number(drop.quantityMin ?? 1),
      quantityMax: Number(drop.quantityMax ?? drop.quantityMin ?? 1), options: Array.isArray(drop.options) ? drop.options : [],
    })),
  };
}

function optionText(options) {
  return (options || []).map((option) => `${option.id}:${option.param}`).join(', ');
}

function parseOptions(value) {
  return String(value || '').split(',').map((part) => {
    const [id, param = 0] = part.trim().split(':');
    return { id: numberValue(id, -1), param: numberValue(param, 0) };
  }).filter((option) => option.id >= 0);
}

export default function BossManagementPage() {
  const [configs, setConfigs] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedBossId, setSelectedBossId] = useState(-1);
  const [form, setForm] = useState(newRule(-1));
  const [catalogQ, setCatalogQ] = useState('');
  const [itemCatalog, setItemCatalog] = useState([]);
  const [busy, setBusy] = useState(false);
  const fb = useFeedback();

  async function load() {
    try {
      const [rules, bosses] = await Promise.all([
        api(`/boss-config?serverId=${getServerId()}`),
        api(`/boss-config/catalog?serverId=${getServerId()}`),
      ]);
      setConfigs(rules.data || []);
      setCatalog(bosses.data || []);
      const row = (rules.data || []).find((item) => Number(item.bossId) === Number(selectedBossId));
      if (row) setForm(normalizeRule(row, selectedBossId));
    } catch (error) { fb.error(error.message); }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  function chooseBoss(value) {
    const id = Number(value);
    setSelectedBossId(id);
    setForm(normalizeRule(configs.find((row) => Number(row.bossId) === id), id));
  }

  function patch(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function patchDrop(index, key, value) { setForm((prev) => ({ ...prev, drops: prev.drops.map((drop, i) => i === index ? { ...drop, [key]: value } : drop) })); }
  function addMap() {
    const value = window.prompt('Nhập Map ID cần cho boss này:');
    const id = Number(value);
    if (!Number.isInteger(id) || id < 0 || id > 9999 || form.mapIds.includes(id)) return;
    patch('mapIds', [...form.mapIds, id]);
  }
  function removeMap(id) { patch('mapIds', form.mapIds.filter((mapId) => mapId !== id)); }
  function addDrop(item) {
    if (form.drops.some((drop) => Number(drop.tempId) === Number(item.id))) return;
    patch('drops', [...form.drops, { tempId: Number(item.id), itemName: item.name, iconId: item.iconId, enabled: true, chancePercent: 10, quantityMin: 1, quantityMax: 1, options: [] }]);
  }
  function removeDrop(index) { patch('drops', form.drops.filter((_, i) => i !== index)); }

  async function searchItems(e) {
    e?.preventDefault();
    try {
      const res = await api(`/boss-config/item-templates?q=${encodeURIComponent(catalogQ)}&limit=80`);
      setItemCatalog(res.data || []);
    } catch (error) { fb.error(error.message); }
  }

  async function save(e) {
    e.preventDefault();
    if (form.mapIds.length === 0) return fb.error('Hãy thêm ít nhất một map spawn.');
    if (!Number.isInteger(Number(form.bossId)) || Number(form.bossId) >= 0) return fb.error('Boss ID phải là số âm.');
    setBusy(true);
    try {
      await api('/boss-config', { method: 'POST', body: JSON.stringify({ serverId: getServerId(), rule: form, drops: form.drops }) });
      fb.success('Đã lưu cấu hình boss, đồng bộ runtime và reload tự động.');
      await load();
    } catch (error) { fb.error(error.message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`Xóa rule của boss #${form.bossId}? Boss sẽ quay về logic mặc định.`)) return;
    setBusy(true);
    try {
      await api(`/boss-config/${form.bossId}?serverId=${getServerId()}`, { method: 'DELETE' });
      setForm(newRule(form.bossId));
      fb.success('Đã xóa rule boss và reload runtime.');
      await load();
    } catch (error) { fb.error(error.message); } finally { setBusy(false); }
  }

  async function spawnAt() {
    const mapId = numberValue(window.prompt('Map ID spawn test:'), -1);
    const zoneId = numberValue(window.prompt('Khu ID spawn test:'), -1);
    if (mapId < 0 || zoneId < 0) return;
    try {
      await api('/boss-config/spawn-at', { method: 'POST', body: JSON.stringify({ serverId: getServerId(), bossId: form.bossId, mapId, zoneId }) });
      fb.success(`Đã gửi yêu cầu spawn boss #${form.bossId} tại map ${mapId}, khu ${zoneId}.`);
    } catch (error) { fb.error(error.message); }
  }

  const currentBoss = catalog.find((boss) => Number(boss.id) === Number(form.bossId));
  const configured = configs.some((row) => Number(row.bossId) === Number(form.bossId));

  return (
    <div>
      <PageHeader title="Boss Management" description="Cấu hình boss theo rule: map được phép, khu random/fixed, tỷ lệ xuất hiện, nhịp respawn, giới hạn active và vật phẩm rơi — lưu là đồng bộ runtime, không sửa file thủ công." actions={<button className="btn" onClick={load}>Refresh</button>} />
      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="help-box">
        <h4>Logic vận hành tự động</h4>
        <p>Boss chỉ chọn trong các map đã cấu hình. Với chế độ <strong>random</strong>, runtime lọc các khu trống trong khoảng khu min–max rồi chọn ngẫu nhiên; vì vậy một map có thể chứa nhiều boss ở các khu khác nhau nhưng không trùng khu. Tỷ lệ spawn được roll khi boss đủ cooldown; nếu trượt, hệ thống tự tạo thời gian retry ngẫu nhiên. Mỗi item rơi được roll độc lập theo tỷ lệ và số lượng riêng.</p>
      </div>

      <div className="control-card section">
        <div className="section-head"><div><h3>Chọn boss</h3><p className="muted">Danh sách lấy trực tiếp từ runtime; có thể nhập boss ID âm để tạo rule mới.</p></div><span className={`badge ${configured ? 'ok' : 'warn'}`}>{configured ? 'Đã cấu hình' : 'Mặc định'}</span></div>
        <div className="form-grid">
          <label className="field">Boss runtime<select value={selectedBossId} onChange={(e) => chooseBoss(e.target.value)}><option value={-1}>Chọn boss...</option>{catalog.map((boss) => <option key={boss.id} value={boss.id}>{boss.name || 'Boss'} · #{boss.id} · {boss.status}</option>)}</select></label>
          <label className="field">Boss ID âm<input type="number" value={form.bossId} onChange={(e) => { const id = numberValue(e.target.value, -1); setSelectedBossId(id); patch('bossId', id); }} /></label>
          <div className="field field-note"><span>Runtime hiện tại</span><p>{currentBoss ? `${currentBoss.name} · ${currentBoss.mapId != null ? `map ${currentBoss.mapId}, khu ${currentBoss.zoneId}` : 'đang REST'}` : 'Chưa chọn boss đang sống'}</p></div>
        </div>
      </div>

      <form className="control-card section" onSubmit={save}>
        <div className="section-head"><div><h3>Rule spawn</h3><p className="muted">Thay đổi có hiệu lực sau khi API ghi cấu hình và gọi reload runtime.</p></div><div className="row"><button type="button" className="btn sm" onClick={spawnAt} disabled={busy}>Spawn test tại map/khu</button>{configured && <button type="button" className="btn sm danger" onClick={remove} disabled={busy}>Xóa rule</button>}<button className="btn primary" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu & áp dụng'}</button></div></div>
        <label className="toggle-field field"><input type="checkbox" checked={form.enabled} onChange={(e) => patch('enabled', e.target.checked)} /> Bật rule boss này</label>
        <div className="form-grid">
          <label className="field">Tỷ lệ xuất hiện (%)<input type="number" min="0" max="100" step="0.01" value={form.spawnChancePercent} onChange={(e) => patch('spawnChancePercent', numberValue(e.target.value))} /><span className="field-hint-inline">100 = luôn cho phép khi đủ điều kiện; 0 = tắt spawn tự động.</span></label>
          <label className="field">Respawn tối thiểu (giây)<input type="number" min="0" max="86400" value={form.respawnMinSec} onChange={(e) => patch('respawnMinSec', numberValue(e.target.value))} /></label>
          <label className="field">Respawn tối đa (giây)<input type="number" min="0" max="86400" value={form.respawnMaxSec} onChange={(e) => patch('respawnMaxSec', numberValue(e.target.value))} /></label>
          <label className="field">Max active boss<input type="number" min="0" max="100" value={form.maxActive} onChange={(e) => patch('maxActive', numberValue(e.target.value))} /><span className="field-hint-inline">0 = không giới hạn riêng cho boss này.</span></label>
        </div>

        <div className="drop-section-card"><div className="section-head"><div><h4>Map và khu xuất hiện</h4><p className="muted">Không giới hạn một boss/map; mỗi lần chọn khu sẽ bỏ qua khu đang có boss.</p></div><button type="button" className="btn sm" onClick={addMap}>+ Thêm map</button></div><div className="preset-row">{form.mapIds.map((mapId) => <button type="button" className="btn sm chip-btn active" key={mapId} onClick={() => removeMap(mapId)}>Map #{mapId} ×</button>)}{form.mapIds.length === 0 && <span className="muted">Chưa có map.</span>}</div><div className="form-grid compact-form"><label className="field">Chế độ khu<select value={form.zonePolicy} onChange={(e) => patch('zonePolicy', e.target.value)}><option value="random">Random khu trống</option><option value="fixed">Ưu tiên khu đầu tiên trống</option></select></label><label className="field">Khu từ<input type="number" min="0" max="99" value={form.zoneMin} onChange={(e) => patch('zoneMin', numberValue(e.target.value))} /></label><label className="field">Khu đến<input type="number" min="0" max="99" value={form.zoneMax} onChange={(e) => patch('zoneMax', numberValue(e.target.value))} /></label></div></div>

        <div className="drop-section-card"><div className="section-head"><div><h4>Vật phẩm rơi theo boss</h4><p className="muted">Mỗi item roll độc lập; cấu hình tỷ lệ, số lượng và option. Không ảnh hưởng drop theo map.</p></div></div><div className="row"><input placeholder="Tìm item theo tên hoặc ID" value={catalogQ} onChange={(e) => setCatalogQ(e.target.value)} /><button className="btn" type="button" onClick={() => searchItems()}>Tìm item</button></div>{itemCatalog.length > 0 && <div className="table-wrap"><table className="compact"><thead><tr><th>Icon</th><th>ID</th><th>Tên</th><th /></tr></thead><tbody>{itemCatalog.map((item) => <tr key={item.id}><td><ItemIcon iconId={item.iconId} tempId={item.id} name={item.name} size={34} /></td><td>#{item.id}</td><td>{item.name}</td><td><button type="button" className="btn sm" onClick={() => addDrop(item)}>Thêm</button></td></tr>)}</tbody></table></div>}<div className="table-wrap"><table className="compact"><thead><tr><th>Bật</th><th>Item</th><th>Tỷ lệ %</th><th>SL từ</th><th>SL đến</th><th>Options id:param</th><th /></tr></thead><tbody>{form.drops.map((drop, index) => <tr key={`${drop.tempId}-${index}`}><td><input type="checkbox" checked={drop.enabled} onChange={(e) => patchDrop(index, 'enabled', e.target.checked)} /></td><td><strong>{drop.itemName || `Item #${drop.tempId}`}</strong><small>#{drop.tempId}</small></td><td><input className="input-xs" type="number" min="0" max="100" step="0.01" value={drop.chancePercent} onChange={(e) => patchDrop(index, 'chancePercent', numberValue(e.target.value))} /></td><td><input className="input-xs" type="number" min="1" value={drop.quantityMin} onChange={(e) => patchDrop(index, 'quantityMin', numberValue(e.target.value, 1))} /></td><td><input className="input-xs" type="number" min="1" value={drop.quantityMax} onChange={(e) => patchDrop(index, 'quantityMax', numberValue(e.target.value, 1))} /></td><td><input className="input-options" value={optionText(drop.options)} placeholder="id:param" onChange={(e) => patchDrop(index, 'options', parseOptions(e.target.value))} /></td><td><button type="button" className="btn sm danger" onClick={() => removeDrop(index)}>Xóa</button></td></tr>)}{form.drops.length === 0 && <tr><td colSpan="7" className="muted">Chưa cấu hình item rơi.</td></tr>}</tbody></table></div></div>
      </form>
    </div>
  );
}
