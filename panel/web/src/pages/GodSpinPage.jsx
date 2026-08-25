import React, { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import ItemIcon from '../components/ItemIcon';
import { OptionEditor } from '../components/OptionEditor';
import PageFeedback from '../components/PageFeedback';
import PageHeader from '../components/PageHeader';

const emptyItem = { tempId: '', name: '', iconId: 0, weight: 1, quantityMin: 1, quantityMax: 1, options: [], durationDays: '', vipOnly: false, enabled: true, maxWins: '', sortOrder: 0 };
const emptyForm = {
  spinKey: 'default', name: 'Vòng quay Thượng Đế', description: '', status: 'draft', enabled: false,
  startsAt: '', endsAt: '', timezone: 'Asia/Ho_Chi_Minh', currencyMode: 'both', costGem: 50, costGold: 2500000,
  costTicket: 0, ticketTempId: '', dailyLimit: 100, previewJson: [], configJson: {}, items: [],
};

const numberInput = (value) => value === '' ? '' : Number(value);
const pick = (value, fallback = '') => value == null ? fallback : value;

function cleanConfig(config) {
  if (!config) return { ...emptyForm, items: [] };
  return {
    ...emptyForm, ...config,
    spinKey: pick(config.spin_key, config.spinKey),
    startsAt: String(pick(config.starts_at, config.startsAt) || '').slice(0, 16),
    endsAt: String(pick(config.ends_at, config.endsAt) || '').slice(0, 16),
    currencyMode: pick(config.currency_mode, config.currencyMode || 'both'),
    costGem: Number(pick(config.cost_gem, config.costGem ?? 50)),
    costGold: Number(pick(config.cost_gold, config.costGold ?? 2500000)),
    costTicket: Number(pick(config.cost_ticket, config.costTicket ?? 0)),
    ticketTempId: pick(config.ticket_temp_id, config.ticketTempId) ?? '',
    dailyLimit: Number(pick(config.daily_limit, config.dailyLimit ?? 100)),
    previewJson: config.previewJson || config.preview_json || [],
    configJson: config.configJson || config.config_json || {},
    items: (config.items || []).map((item) => ({
      ...emptyItem, ...item,
      tempId: Number(pick(item.temp_id, item.tempId)),
      weight: Number(pick(item.weight, 1)),
      quantityMin: Number(pick(item.quantity_min, 1)),
      quantityMax: Number(pick(item.quantity_max, 1)),
      options: item.options || item.optionsJson || item.options_json || [],
      durationDays: pick(item.duration_days, item.durationDays) ?? '',
      vipOnly: Boolean(pick(item.vip_only, item.vipOnly)),
      enabled: item.enabled == null ? true : Boolean(item.enabled),
      maxWins: pick(item.max_wins, item.maxWins) ?? '',
    })),
  };
}

export default function GodSpinPage() {
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState(cleanConfig());
  const [selectedId, setSelectedId] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [tab, setTab] = useState('pool');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ msg: '', type: 'success' });
  const fb = { clear: () => setFeedback({ msg: '', type: 'success' }), success: (msg) => setFeedback({ msg, type: 'success' }), error: (msg) => setFeedback({ msg, type: 'error' }) };

  async function load() {
    try { const result = await api(`/god-spin?serverId=${getServerId()}`); setConfigs(result.data || []); }
    catch (error) { fb.error(error.message); }
  }
  async function openConfig(id) {
    try { const result = await api(`/god-spin/${id}?serverId=${getServerId()}`); setSelectedId(id); setForm(cleanConfig(result.data)); setTab('pool'); }
    catch (error) { fb.error(error.message); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!catalogOpen) return undefined;
    const timer = setTimeout(async () => {
      try { const result = await api(`/god-spin/catalog?q=${encodeURIComponent(catalogQuery)}&limit=30`); setCatalog(result.data || []); }
      catch (error) { fb.error(error.message); }
    }, 250);
    return () => clearTimeout(timer);
  }, [catalogOpen, catalogQuery]);

  const totalWeight = useMemo(() => form.items.filter((item) => item.enabled).reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0), [form.items]);
  const enabledCount = useMemo(() => form.items.filter((item) => item.enabled).length, [form.items]);
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const patchItem = (index, value) => setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item) }));
  const removeItem = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));

  function addCatalogItem(item) {
    if (form.items.some((reward) => Number(reward.tempId) === Number(item.id))) {
      fb.error(`Item #${item.id} đã có trong vòng quay.`);
      return;
    }
    patch('items', [...form.items, { ...emptyItem, tempId: Number(item.id), name: item.name, iconId: Number(item.iconId || 0), sortOrder: form.items.length }]);
    setCatalogOpen(false);
    setCatalogQuery('');
    fb.success(`Đã thêm ${item.name} (#${item.id}). Hãy chỉnh trọng số và option rồi lưu SQL.`);
  }
  function duplicateItem(index) {
    const source = form.items[index];
    patch('items', [...form.items, { ...source, tempId: '', name: `${source.name || 'Item'} — bản sao`, sortOrder: form.items.length }]);
  }
  function moveItem(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= form.items.length) return;
    const items = [...form.items];
    [items[index], items[next]] = [items[next], items[index]];
    patch('items', items.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })));
  }
  async function save(event) {
    event.preventDefault();
    if (!form.items.length) { fb.error('Hãy thêm ít nhất một item vào vòng quay.'); setTab('pool'); return; }
    if (!totalWeight) { fb.error('Cần ít nhất một item đang bật có trọng số > 0.'); setTab('pool'); return; }
    setLoading(true);
    try {
      const payload = { ...form, serverId: getServerId(), items: form.items.map(({ name, iconId, ...item }) => item) };
      const result = await api(selectedId ? `/god-spin/${selectedId}` : '/god-spin', { method: selectedId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const id = selectedId || result.data?.id;
      fb.success('Đã lưu cấu hình, item và option vào SQL; runtime đã được yêu cầu reload.');
      await load();
      if (id) await openConfig(id);
    } catch (error) { fb.error(error.message); }
    finally { setLoading(false); }
  }
  async function changeStatus(status) {
    if (!selectedId) return;
    try { await api(`/god-spin/${selectedId}/status`, { method: 'POST', body: JSON.stringify({ serverId: getServerId(), status }) }); fb.success(`Đã chuyển vòng quay sang ${status} và đồng bộ runtime.`); await load(); await openConfig(selectedId); }
    catch (error) { fb.error(error.message); }
  }
  async function remove() {
    if (!selectedId || !window.confirm('Xóa cấu hình và toàn bộ item vòng quay trong SQL?')) return;
    try { await api(`/god-spin/${selectedId}?serverId=${getServerId()}`, { method: 'DELETE' }); fb.success('Đã xóa cấu hình God Spin.'); setSelectedId(null); setForm(cleanConfig()); await load(); }
    catch (error) { fb.error(error.message); }
  }

  return (
    <div>
      <PageHeader
        title="Vòng quay Thượng Đế"
        description="Quản lý pool phần thưởng bằng SQL: thêm item từ catalog, trọng số, số lượng, option, thời hạn, giới hạn và lịch chạy."
        stats={<><span className="page-stat-pill"><strong>{configs.length}</strong> cấu hình</span><span className="page-stat-pill ok"><strong>{enabledCount}</strong> item đang bật</span><span className="page-stat-pill"><strong>{totalWeight}</strong> tổng trọng số</span></>}
        actions={<button className="btn primary" onClick={() => { setSelectedId(null); setForm(cleanConfig()); setTab('pool'); }}>+ Tạo vòng quay</button>}
      />
      <PageFeedback msg={feedback.msg} type={feedback.type} onDismiss={fb.clear} />
      <div className="events-layout god-spin-layout">
        <aside className="card section events-list">
          <div className="section-title"><h3>Cấu hình SQL</h3><button className="btn sm" onClick={load}>Refresh</button></div>
          {configs.length === 0 && <p className="muted">Chưa có cấu hình. Tạo vòng quay đầu tiên để bỏ hard-code phần thưởng.</p>}
          {configs.map((config) => <button type="button" key={config.id} className={`event-list-item ${selectedId === config.id ? 'active' : ''}`} onClick={() => openConfig(config.id)}><span><strong>{config.name}</strong><small>{config.spin_key} · {config.itemCount ?? config.item_count ?? 0} item · W={config.weightTotal ?? config.weight_total ?? 0}</small></span><span className={`badge ${config.status === 'active' ? 'ok' : config.status === 'draft' ? 'warn' : ''}`}>{config.status}</span></button>)}
        </aside>
        <form className="card section event-editor" onSubmit={save}>
          <div className="section-title"><div><h3>{selectedId ? `Sửa vòng quay #${selectedId}` : 'Tạo cấu hình vòng quay'}</h3><p className="card-hint">Mọi thay đổi lưu trực tiếp vào SQL; bộ nhớ Java chỉ giữ snapshot đọc lại và có thể reload bất kỳ lúc nào.</p></div>{selectedId && <div className="button-row"><button type="button" className="btn sm" onClick={() => changeStatus('active')}>Bật</button><button type="button" className="btn sm" onClick={() => changeStatus('paused')}>Tạm dừng</button><button type="button" className="btn sm danger" onClick={remove}>Xóa</button></div>}</div>
          <div className="editor-tabs"><button type="button" className={`tab ${tab === 'pool' ? 'active' : ''}`} onClick={() => setTab('pool')}>Pool item ({form.items.length})</button><button type="button" className={`tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>Giá, lịch & giới hạn</button></div>
          {tab === 'general' && <>
            <div className="form-grid"><label className="field">Mã vòng quay<input value={form.spinKey} onChange={(e) => patch('spinKey', e.target.value)} placeholder="default" required /></label><label className="field">Tên hiển thị<input value={form.name} onChange={(e) => patch('name', e.target.value)} required /></label><label className="field">Trạng thái<select value={form.status} onChange={(e) => patch('status', e.target.value)}><option value="draft">Nháp</option><option value="scheduled">Đã lên lịch</option><option value="active">Đang chạy</option><option value="paused">Tạm dừng</option><option value="ended">Đã kết thúc</option></select></label><label className="field">Tiền quay<select value={form.currencyMode} onChange={(e) => patch('currencyMode', e.target.value)}><option value="both">Ngọc hoặc vàng</option><option value="gem">Chỉ ngọc</option><option value="gold">Chỉ vàng</option></select></label></div>
            <label className="field">Mô tả<textarea rows="2" value={form.description} onChange={(e) => patch('description', e.target.value)} placeholder="Thông tin hiển thị cho admin / game client..." /></label>
            <div className="form-grid"><label className="field">Giá ngọc<input type="number" min="0" value={form.costGem} onChange={(e) => patch('costGem', numberInput(e.target.value))} /></label><label className="field">Giá vàng<input type="number" min="0" value={form.costGold} onChange={(e) => patch('costGold', numberInput(e.target.value))} /></label><label className="field">Giá vé<input type="number" min="0" value={form.costTicket} onChange={(e) => patch('costTicket', numberInput(e.target.value))} /></label><label className="field">ID vé (tùy chọn)<input type="number" min="0" value={form.ticketTempId} onChange={(e) => patch('ticketTempId', numberInput(e.target.value))} /></label></div>
            <div className="form-grid"><label className="field">Bắt đầu<input type="datetime-local" value={form.startsAt} onChange={(e) => patch('startsAt', e.target.value)} /></label><label className="field">Kết thúc<input type="datetime-local" value={form.endsAt} onChange={(e) => patch('endsAt', e.target.value)} /></label><label className="field">Múi giờ<input value={form.timezone} onChange={(e) => patch('timezone', e.target.value)} /></label><label className="field">Giới hạn/ngày/người<input type="number" min="1" value={form.dailyLimit} onChange={(e) => patch('dailyLimit', numberInput(e.target.value))} /></label></div>
            <label className="field">Ghi chú nâng cao JSON<textarea rows="3" value={JSON.stringify(form.configJson || {}, null, 2)} onChange={(e) => { try { patch('configJson', JSON.parse(e.target.value || '{}')); } catch { /* giữ dữ liệu cũ đến khi JSON hợp lệ */ } }} /></label>
          </>}
          {tab === 'pool' && <>
            <div className="spin-summary"><div><strong>{form.items.length}</strong><span>item trong pool</span></div><div><strong>{enabledCount}</strong><span>item đang bật</span></div><div><strong>{totalWeight}</strong><span>tổng trọng số</span></div><div><strong>{totalWeight ? '100%' : '0%'}</strong><span>phân phối chuẩn hóa</span></div></div>
            <div className="button-row spin-toolbar"><button type="button" className="btn primary" onClick={() => setCatalogOpen((open) => !open)}>+ Thêm item từ catalog</button><button type="button" className="btn" onClick={() => { if (form.items.length) patch('items', form.items.map((item) => ({ ...item, weight: 1 }))); }}>Đặt đều trọng số</button><span className="muted">Tổng trọng số càng lớn không làm item chắc chắn hơn tuyệt đối; xác suất = trọng số item / tổng trọng số.</span></div>
            {catalogOpen && <div className="card section spin-catalog"><div className="section-title"><div><h4>Chọn template item từ DB game</h4><p className="card-hint">Tìm theo tên hoặc ID, không cần nhớ ID thủ công.</p></div><button type="button" className="btn sm" onClick={() => setCatalogOpen(false)}>Đóng</button></div><input className="catalog-search" value={catalogQuery} onChange={(e) => setCatalogQuery(e.target.value)} placeholder="Tìm: cải trang, capsule, 532..." autoFocus />{catalog.length === 0 ? <p className="muted">Không có item phù hợp.</p> : <div className="spin-catalog-results">{catalog.map((item) => <button type="button" className="spin-catalog-item" key={item.id} onClick={() => addCatalogItem(item)}><ItemIcon iconId={item.iconId} tempId={item.id} name={item.name} size={38} /><span><strong>{item.name}</strong><small>#{item.id} · level {item.level ?? 0}</small></span><b>+ Thêm</b></button>)}</div>}</div>}
            {form.items.length === 0 && <div className="empty-state"><h4>Pool đang trống</h4><p>Thêm item bằng catalog để bắt đầu. Mỗi item có thể chỉnh option ngay trong cùng màn hình.</p></div>}
            {form.items.map((item, index) => { const percentage = totalWeight && item.enabled ? (Number(item.weight || 0) / totalWeight * 100) : 0; return <div className={`nested-editor spin-reward-card ${item.enabled ? '' : 'is-disabled'}`} key={`${item.tempId}-${index}`}><div className="spin-reward-head"><div className="spin-item-title"><ItemIcon iconId={item.iconId} tempId={item.tempId} name={item.name} size={46} /><div><strong>{item.name || `Item #${item.tempId || '?'}`}</strong><small>Template #{item.tempId || '?'} · {percentage.toFixed(3)}% theo trọng số</small></div></div><label className="switch-label"><input type="checkbox" checked={item.enabled} onChange={(e) => patchItem(index, { enabled: e.target.checked })} /> Bật</label></div><div className="form-grid"><label className="field">Item template ID<input type="number" min="0" value={item.tempId} onChange={(e) => patchItem(index, { tempId: numberInput(e.target.value) })} required /></label><label className="field">Trọng số<input type="number" min="1" value={item.weight} onChange={(e) => patchItem(index, { weight: numberInput(e.target.value) })} required /></label><label className="field">SL tối thiểu<input type="number" min="1" value={item.quantityMin} onChange={(e) => patchItem(index, { quantityMin: numberInput(e.target.value) })} /></label><label className="field">SL tối đa<input type="number" min="1" value={item.quantityMax} onChange={(e) => patchItem(index, { quantityMax: numberInput(e.target.value) })} /></label><label className="field">Thời hạn ngày<input type="number" min="1" value={item.durationDays} onChange={(e) => patchItem(index, { durationDays: numberInput(e.target.value) })} placeholder="Vĩnh viễn" /></label><label className="field">Giới hạn thắng item<input type="number" min="1" value={item.maxWins} onChange={(e) => patchItem(index, { maxWins: numberInput(e.target.value) })} placeholder="Không giới hạn" /></label></div><div className="check-grid"><label><input type="checkbox" checked={item.vipOnly} onChange={(e) => patchItem(index, { vipOnly: e.target.checked })} /> Chỉ người chơi VIP</label></div><OptionEditor options={item.options} onChange={(options) => patchItem(index, { options })} compact /><div className="button-row"><button type="button" className="btn sm" onClick={() => moveItem(index, -1)} disabled={index === 0}>↑ Ưu tiên</button><button type="button" className="btn sm" onClick={() => moveItem(index, 1)} disabled={index === form.items.length - 1}>↓ Hạ ưu tiên</button><button type="button" className="btn sm" onClick={() => duplicateItem(index)}>Nhân bản</button><button type="button" className="btn sm danger" onClick={() => removeItem(index)}>Xóa item</button></div></div>; })}
          </>}
          <div className="form-actions"><button className="btn primary" type="submit" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu SQL & reload runtime'}</button><span className="muted">Các option được lưu trong `options_json`; SQL vẫn là nguồn sự thật sau restart.</span></div>
        </form>
      </div>
    </div>
  );
}
