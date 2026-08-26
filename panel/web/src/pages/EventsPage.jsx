import { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import PageFeedback from '../components/PageFeedback';
import PageHeader from '../components/PageHeader';

const EVENT_TYPES = [
  ['seasonal', 'Sự kiện mùa/lễ'],
  ['collection', 'Thu thập vật phẩm'],
  ['crafting', 'Chế tạo'],
  ['ranking', 'Đua TOP'],
  ['clan', 'Hoạt động bang hội'],
  ['shop', 'Shop sự kiện'],
  ['custom', 'Tùy chỉnh'],
];
const emptyObjective = { objectiveType: 'collect', title: '', targetId: '', targetValue: 0, requiredCount: 1, mapIds: [], zonePolicy: 'any' };
const emptyReward = { rewardType: 'item', tempId: '', quantityMin: 1, quantityMax: 1, chancePercent: 100, durationDays: '', rankMin: '', rankMax: '', optionsJson: {} };
const emptyShop = { name: '', currencyType: 'event_point', enabled: true, items: [{ tempId: '', price: 1, stock: '', limitPerPlayer: '' }] };
const emptyForm = {
  eventKey: '', name: '', description: '', eventType: 'seasonal', status: 'draft', enabled: false,
  startsAt: '', endsAt: '', timezone: 'Asia/Ho_Chi_Minh', repeatRule: '', minLevel: 0, minPower: 0,
  vipMin: 0, requireClan: false, minClanMembers: 0, maxParticipants: '', oncePerPlayer: false, cooldownSec: 0,
  configJson: {}, objectives: [{ ...emptyObjective }], rewards: [{ ...emptyReward }], shops: [],
};

function cleanForm(event) {
  if (!event) return { ...emptyForm, objectives: [{ ...emptyObjective }], rewards: [{ ...emptyReward }], shops: [] };
  return {
    ...emptyForm, ...event,
    eventKey: event.event_key || event.eventKey || '',
    eventType: event.event_type || event.eventType || 'custom',
    startsAt: (event.starts_at || event.startsAt || '').slice(0, 16),
    endsAt: (event.ends_at || event.endsAt || '').slice(0, 16),
    repeatRule: event.repeat_rule || event.repeatRule || '',
    minLevel: event.min_level ?? event.minLevel ?? 0,
    minPower: event.min_power ?? event.minPower ?? 0,
    vipMin: event.vip_min ?? event.vipMin ?? 0,
    requireClan: Boolean(event.require_clan ?? event.requireClan),
    minClanMembers: event.min_clan_members ?? event.minClanMembers ?? 0,
    maxParticipants: event.max_participants ?? event.maxParticipants ?? '',
    oncePerPlayer: Boolean(event.once_per_player ?? event.oncePerPlayer),
    cooldownSec: event.cooldown_sec ?? event.cooldownSec ?? 0,
    configJson: event.configJson || event.config_json || {},
    objectives: (event.objectives || []).map((item) => ({ ...emptyObjective, ...item, objectiveType: item.objective_type || item.objectiveType || 'collect', targetId: item.target_id ?? item.targetId ?? '', targetValue: item.target_value ?? item.targetValue ?? 0, requiredCount: item.required_count ?? item.requiredCount ?? 1, mapIds: item.mapIds || [] })),
    rewards: (event.rewards || []).map((item) => ({ ...emptyReward, ...item, rewardType: item.reward_type || item.rewardType || 'item', tempId: item.temp_id ?? item.tempId ?? '', quantityMin: item.quantity_min ?? item.quantityMin ?? 1, quantityMax: item.quantity_max ?? item.quantityMax ?? 1, chancePercent: item.chance_percent ?? item.chancePercent ?? 100, durationDays: item.duration_days ?? item.durationDays ?? '', rankMin: item.rank_min ?? item.rankMin ?? '', rankMax: item.rank_max ?? item.rankMax ?? '', optionsJson: item.optionsJson || {} })),
    shops: (event.shops || []).map((shop) => ({ ...emptyShop, ...shop, items: shop.items || [] })),
  };
}

const numberInput = (value) => value === '' ? '' : Number(value);

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(cleanForm());
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('general');
  const [feedback, setFeedback] = useState({ msg: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const fb = { clear: () => setFeedback({ msg: '', type: 'success' }), success: (msg) => setFeedback({ msg, type: 'success' }), error: (msg) => setFeedback({ msg, type: 'error' }) };

  async function load() {
    try { const result = await api(`/events?serverId=${getServerId()}`); setEvents(result.data || []); } catch (e) { fb.error(e.message); }
  }
  async function openEvent(id) {
    try { const result = await api(`/events/${id}?serverId=${getServerId()}`); setSelectedId(id); setForm(cleanForm(result.data)); setTab('general'); } catch (e) { fb.error(e.message); }
  }
  useEffect(() => { load(); }, []);
  const activeCount = useMemo(() => events.filter((event) => event.status === 'active').length, [events]);
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const patchArray = (key, index, value) => setForm((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item) }));
  const removeArray = (key, index) => setForm((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }));

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, serverId: getServerId(), maxParticipants: form.maxParticipants === '' ? null : Number(form.maxParticipants) };
      const result = await api(selectedId ? `/events/${selectedId}` : '/events', { method: selectedId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const id = selectedId || result.data?.id;
      fb.success('Đã lưu sự kiện vào SQL và đồng bộ server.');
      await load();
      if (id) await openEvent(id);
    } catch (error) { fb.error(error.message); } finally { setLoading(false); }
  }
  async function changeStatus(status) {
    if (!selectedId) return;
    const turningOff = status !== 'active' && status !== 'scheduled';
    if (turningOff && !window.confirm('Xác nhận tắt sự kiện này? Sự kiện sẽ được lưu enabled=0 trong SQL và dừng trong runtime.')) return;
    try {
      const result = await api(`/events/${selectedId}/status`, {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId(), status }),
      });
      const reloadFailed = result.data?.liveSync?.reloaded === false;
      fb.success(`${turningOff ? 'Đã tắt' : 'Đã bật'} sự kiện trong SQL${reloadFailed ? '; server sẽ nhận ở lần reload kế tiếp' : ' và đã đồng bộ server'}.`);
      await load();
      await openEvent(selectedId);
    } catch (e) { fb.error(e.message); }
  }
  async function remove() {
    if (!selectedId || !window.confirm('Xóa sự kiện và toàn bộ cấu hình con trong SQL?')) return;
    try { await api(`/events/${selectedId}?serverId=${getServerId()}`, { method: 'DELETE' }); fb.success('Đã xóa sự kiện.'); setSelectedId(null); setForm(cleanForm()); await load(); } catch (e) { fb.error(e.message); }
  }
  function newEvent() { setSelectedId(null); setForm(cleanForm()); setTab('general'); }

  return (
    <div>
      <PageHeader title="Quản lý sự kiện" description="Tạo sự kiện theo dữ liệu SQL: lịch chạy, điều kiện, nhiệm vụ, phần thưởng, shop, BXH và bang hội. Lưu là đồng bộ server." stats={<><span className="page-stat-pill"><strong>{events.length}</strong> sự kiện</span><span className="page-stat-pill ok"><strong>{activeCount}</strong> đang chạy</span></>} actions={<button className="btn primary" onClick={newEvent}>+ Tạo sự kiện</button>} />
      <PageFeedback msg={feedback.msg} type={feedback.type} onDismiss={fb.clear} />
      <div className="events-layout">
        <aside className="card section events-list">
          <div className="section-title"><h3>Danh sách</h3><button className="btn sm" onClick={load}>Refresh</button></div>
          {events.length === 0 && <p className="muted">Chưa có sự kiện. Hãy tạo sự kiện đầu tiên.</p>}
          {events.map((event) => <button type="button" key={event.id} className={`event-list-item ${selectedId === event.id ? 'active' : ''}`} onClick={() => openEvent(event.id)}><span><strong>{event.name}</strong><small>{event.event_key} · {event.event_type}</small></span><span className={`badge ${event.status === 'active' ? 'ok' : event.status === 'draft' ? 'warn' : ''}`}>{event.status}</span></button>)}
        </aside>
        <form className="card section event-editor" onSubmit={save}>
          <div className="section-title"><div><h3>{selectedId ? `Sửa sự kiện #${selectedId}` : 'Tạo sự kiện mới'}</h3><p className="card-hint">Cấu hình được lưu bền vững trong SQL, không mất khi restart server.</p></div>{selectedId && <div className="button-row"><button type="button" className="btn sm" onClick={() => changeStatus('active')}>Bật</button><button type="button" className="btn sm danger" onClick={() => changeStatus('paused')}>Tắt sự kiện</button><button type="button" className="btn sm danger" onClick={remove}>Xóa</button></div>}</div>
          <div className="editor-tabs"><button type="button" className={`tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>Thông tin & điều kiện</button><button type="button" className={`tab ${tab === 'objectives' ? 'active' : ''}`} onClick={() => setTab('objectives')}>Mục tiêu</button><button type="button" className={`tab ${tab === 'rewards' ? 'active' : ''}`} onClick={() => setTab('rewards')}>Phần thưởng</button><button type="button" className={`tab ${tab === 'shops' ? 'active' : ''}`} onClick={() => setTab('shops')}>Shop & nâng cao</button></div>
          {tab === 'general' && <>
            <div className="form-grid"><label className="field">Mã sự kiện<input value={form.eventKey} onChange={(e) => patch('eventKey', e.target.value)} placeholder="trung-thu-2026" required /></label><label className="field">Tên hiển thị<input value={form.name} onChange={(e) => patch('name', e.target.value)} placeholder="Trung Thu 2026" required /></label><label className="field">Loại sự kiện<select value={form.eventType} onChange={(e) => patch('eventType', e.target.value)}>{EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field">Trạng thái<select value={form.status} onChange={(e) => patch('status', e.target.value)}><option value="draft">Nháp</option><option value="scheduled">Đã lên lịch</option><option value="active">Đang chạy</option><option value="paused">Tạm dừng</option><option value="ended">Đã kết thúc</option></select></label></div>
            <label className="field">Mô tả sự kiện<textarea rows="3" value={form.description} onChange={(e) => patch('description', e.target.value)} placeholder="Nội dung hiển thị cho người chơi..." /></label>
            <div className="form-grid"><label className="field">Bắt đầu<input type="datetime-local" value={form.startsAt} onChange={(e) => patch('startsAt', e.target.value)} /></label><label className="field">Kết thúc<input type="datetime-local" value={form.endsAt} onChange={(e) => patch('endsAt', e.target.value)} /></label><label className="field">Múi giờ<input value={form.timezone} onChange={(e) => patch('timezone', e.target.value)} /></label><label className="field">Lặp lại<input value={form.repeatRule} onChange={(e) => patch('repeatRule', e.target.value)} placeholder="daily / weekly / cron..." /></label></div>
            <h4>Điều kiện tham gia</h4><div className="form-grid"><label className="field">Level tối thiểu<input type="number" min="0" value={form.minLevel} onChange={(e) => patch('minLevel', numberInput(e.target.value))} /></label><label className="field">Power tối thiểu<input type="number" min="0" value={form.minPower} onChange={(e) => patch('minPower', numberInput(e.target.value))} /></label><label className="field">VIP tối thiểu<input type="number" min="0" value={form.vipMin} onChange={(e) => patch('vipMin', numberInput(e.target.value))} /></label><label className="field">Giới hạn người tham gia<input type="number" min="1" value={form.maxParticipants} onChange={(e) => patch('maxParticipants', e.target.value === '' ? '' : numberInput(e.target.value))} placeholder="Không giới hạn" /></label></div><div className="check-grid"><label><input type="checkbox" checked={form.requireClan} onChange={(e) => patch('requireClan', e.target.checked)} /> Bắt buộc trong bang hội</label><label><input type="checkbox" checked={form.oncePerPlayer} onChange={(e) => patch('oncePerPlayer', e.target.checked)} /> Mỗi nhân vật chỉ tham gia một lần</label></div>
          </>}
          {tab === 'objectives' && <div><div className="section-title"><p className="card-hint">Mỗi mục tiêu có thể là thu thập, tiêu diệt, chế tạo, đổi vật phẩm, hoạt động bang hoặc tính điểm BXH.</p><button type="button" className="btn sm" onClick={() => patch('objectives', [...form.objectives, { ...emptyObjective }])}>+ Mục tiêu</button></div>{form.objectives.map((item, index) => <div className="nested-editor" key={`objective-${index}`}><div className="form-grid"><label className="field">Cơ chế<select value={item.objectiveType} onChange={(e) => patchArray('objectives', index, { objectiveType: e.target.value })}><option value="collect">Thu thập</option><option value="kill">Diệt quái/boss</option><option value="craft">Chế tạo</option><option value="exchange">Đổi vật phẩm</option><option value="activity">Hoạt động</option><option value="ranking">Tính điểm BXH</option><option value="clan">Bang hội</option></select></label><label className="field">Tên mục tiêu<input value={item.title} onChange={(e) => patchArray('objectives', index, { title: e.target.value })} placeholder="Thu thập Hộp Bánh Trung Thu" /></label><label className="field">ID đích<input type="number" value={item.targetId} onChange={(e) => patchArray('objectives', index, { targetId: numberInput(e.target.value) })} placeholder="Item/Boss/Map ID" /></label><label className="field">Số lượng cần<input type="number" min="1" value={item.requiredCount} onChange={(e) => patchArray('objectives', index, { requiredCount: numberInput(e.target.value) })} /></label></div><button type="button" className="btn sm danger" onClick={() => removeArray('objectives', index)}>Xóa mục tiêu</button></div>)}</div>}
          {tab === 'rewards' && <div><div className="section-title"><p className="card-hint">Roll độc lập theo tỷ lệ; có thể đặt thời hạn, khoảng hạng và options JSON.</p><button type="button" className="btn sm" onClick={() => patch('rewards', [...form.rewards, { ...emptyReward }])}>+ Phần thưởng</button></div>{form.rewards.map((item, index) => <div className="nested-editor" key={`reward-${index}`}><div className="form-grid"><label className="field">Loại<select value={item.rewardType} onChange={(e) => patchArray('rewards', index, { rewardType: e.target.value })}><option value="item">Vật phẩm</option><option value="currency">Vàng/Ngọc</option><option value="title">Danh hiệu</option><option value="buff">Buff</option><option value="pet">Pet</option><option value="rank">Thưởng BXH</option></select></label><label className="field">Item/giá trị ID<input type="number" value={item.tempId} onChange={(e) => patchArray('rewards', index, { tempId: numberInput(e.target.value) })} /></label><label className="field">SL từ<input type="number" min="0" value={item.quantityMin} onChange={(e) => patchArray('rewards', index, { quantityMin: numberInput(e.target.value) })} /></label><label className="field">SL đến<input type="number" min="0" value={item.quantityMax} onChange={(e) => patchArray('rewards', index, { quantityMax: numberInput(e.target.value) })} /></label><label className="field">Tỷ lệ %<input type="number" min="0" max="100" step="0.01" value={item.chancePercent} onChange={(e) => patchArray('rewards', index, { chancePercent: numberInput(e.target.value) })} /></label><label className="field">Thời hạn ngày<input type="number" min="1" value={item.durationDays} onChange={(e) => patchArray('rewards', index, { durationDays: numberInput(e.target.value) })} placeholder="Vĩnh viễn" /></label></div><button type="button" className="btn sm danger" onClick={() => removeArray('rewards', index)}>Xóa phần thưởng</button></div>)}</div>}
          {tab === 'shops' && <div><div className="section-title"><p className="card-hint">Shop là dữ liệu con của sự kiện, có tiền tệ riêng, stock và giới hạn mua mỗi người.</p><button type="button" className="btn sm" onClick={() => patch('shops', [...form.shops, { ...emptyShop, items: [{ ...emptyShop.items[0] }] }])}>+ Shop</button></div>{form.shops.map((shop, shopIndex) => <div className="nested-editor" key={`shop-${shopIndex}`}><div className="form-grid"><label className="field">Tên shop<input value={shop.name} onChange={(e) => patchArray('shops', shopIndex, { name: e.target.value })} /></label><label className="field">Loại tiền<select value={shop.currencyType} onChange={(e) => patchArray('shops', shopIndex, { currencyType: e.target.value })}><option value="event_point">Điểm sự kiện</option><option value="gold">Vàng</option><option value="gem">Ngọc</option><option value="item">Vật phẩm</option></select></label></div>{shop.items.map((item, itemIndex) => <div className="inline-editor" key={`shop-${shopIndex}-item-${itemIndex}`}><input type="number" placeholder="Item ID" value={item.tempId} onChange={(e) => { const items = shop.items.map((old, idx) => idx === itemIndex ? { ...old, tempId: numberInput(e.target.value) } : old); patchArray('shops', shopIndex, { items }); }} /><input type="number" placeholder="Giá" value={item.price} onChange={(e) => { const items = shop.items.map((old, idx) => idx === itemIndex ? { ...old, price: numberInput(e.target.value) } : old); patchArray('shops', shopIndex, { items }); }} /><input type="number" placeholder="Giới hạn" value={item.limitPerPlayer} onChange={(e) => { const items = shop.items.map((old, idx) => idx === itemIndex ? { ...old, limitPerPlayer: numberInput(e.target.value) } : old); patchArray('shops', shopIndex, { items }); }} /></div>)}<div className="button-row"><button type="button" className="btn sm" onClick={() => patchArray('shops', shopIndex, { items: [...shop.items, { tempId: '', price: 1, stock: '', limitPerPlayer: '' }] })}>+ Item shop</button><button type="button" className="btn sm danger" onClick={() => removeArray('shops', shopIndex)}>Xóa shop</button></div></div>)}</div>}
          <div className="form-actions"><button className="btn primary" type="submit" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu vào SQL & đồng bộ server'}</button>{selectedId && <span className="muted">Mọi thay đổi được audit và gửi reload tới server.</span>}</div>
        </form>
      </div>
    </div>
  );
}
