import { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import PageFeedback from '../components/PageFeedback';
import PageHeader from '../components/PageHeader';

const emptyTier = { thresholdAmount: 100000, gemBonus: 0, rubyBonus: 0, bonusPercent: 0, bonusJson: {} };
const emptyForm = { campaignKey: '', name: '', description: '', status: 'draft', enabled: false, startsAt: '', endsAt: '', timezone: 'Asia/Ho_Chi_Minh', sources: ['payments', 'bank_transfers', 'napthe'], tiers: [{ ...emptyTier }], configJson: {} };

function normalize(data) {
  if (!data) return { ...emptyForm, tiers: [{ ...emptyTier }] };
  return {
    ...emptyForm, ...data,
    campaignKey: data.campaign_key || data.campaignKey || '',
    startsAt: String(data.starts_at || data.startsAt || '').slice(0, 16),
    endsAt: String(data.ends_at || data.endsAt || '').slice(0, 16),
    sources: data.sources || data.sources_json || emptyForm.sources,
    tiers: (data.tiers || []).map((tier) => ({ ...emptyTier, ...tier, thresholdAmount: tier.threshold_amount ?? tier.thresholdAmount ?? 0, gemBonus: tier.gem_bonus ?? tier.gemBonus ?? 0, rubyBonus: tier.ruby_bonus ?? tier.rubyBonus ?? 0, bonusPercent: tier.bonus_percent ?? tier.bonusPercent ?? 0, bonusJson: tier.bonusJson || tier.bonus_json || {} })),
  };
}

const n = (value) => value === '' ? '' : Number(value);

export default function RechargePromotionsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(normalize());
  const [selectedId, setSelectedId] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ msg: '', type: 'success' });
  const fb = { success: (msg) => setFeedback({ msg, type: 'success' }), error: (msg) => setFeedback({ msg, type: 'error' }), clear: () => setFeedback({ msg: '', type: 'success' }) };

  async function load() {
    try { const result = await api(`/recharge-promotions?serverId=${getServerId()}`); setCampaigns(result.data || []); } catch (e) { fb.error(e.message); }
  }
  async function open(id) {
    try {
      const result = await api(`/recharge-promotions/${id}?serverId=${getServerId()}`);
      setSelectedId(id); setForm(normalize(result.data));
      const claimResult = await api(`/recharge-promotions/${id}/claims?serverId=${getServerId()}`);
      setClaims(claimResult.data || []);
    } catch (e) { fb.error(e.message); }
  }
  useEffect(() => { load(); }, []);
  const active = useMemo(() => campaigns.filter((item) => item.status === 'active').length, [campaigns]);
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const patchTier = (index, value) => setForm((current) => ({ ...current, tiers: current.tiers.map((tier, i) => i === index ? { ...tier, ...value } : tier) }));

  async function save(event) {
    event.preventDefault(); setLoading(true);
    try {
      const payload = { ...form, serverId: getServerId(), tiers: form.tiers.map((tier) => ({ ...tier, thresholdAmount: Number(tier.thresholdAmount) || 0, gemBonus: Number(tier.gemBonus) || 0, rubyBonus: Number(tier.rubyBonus) || 0, bonusPercent: Number(tier.bonusPercent) || 0 })) };
      const result = await api(selectedId ? `/recharge-promotions/${selectedId}` : '/recharge-promotions', { method: selectedId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const id = selectedId || result.data?.id; fb.success('Đã lưu campaign và mốc bonus vào SQL.'); await load(); if (id) await open(id);
    } catch (e) { fb.error(e.message); } finally { setLoading(false); }
  }
  async function changeStatus(status) {
    if (!selectedId) return;
    try { await api(`/recharge-promotions/${selectedId}/status`, { method: 'POST', body: JSON.stringify({ status, serverId: getServerId() }) }); fb.success(`Đã chuyển trạng thái: ${status}`); await load(); await open(selectedId); } catch (e) { fb.error(e.message); }
  }
  async function reconcile() {
    if (!selectedId) return;
    setLoading(true);
    try { const result = await api(`/recharge-promotions/${selectedId}/reconcile`, { method: 'POST', body: JSON.stringify({ serverId: getServerId(), source: 'payments' }) }); fb.success(`Đã xử lý ${result.data?.count || 0} giao dịch nạp xác nhận.`); await open(selectedId); } catch (e) { fb.error(e.message); } finally { setLoading(false); }
  }
  async function remove() {
    if (!selectedId || !window.confirm('Xóa campaign và toàn bộ mốc/claim trong SQL?')) return;
    try { await api(`/recharge-promotions/${selectedId}?serverId=${getServerId()}`, { method: 'DELETE' }); setSelectedId(null); setForm(normalize()); setClaims([]); fb.success('Đã xóa campaign.'); await load(); } catch (e) { fb.error(e.message); }
  }

  return <div>
    <PageHeader title="Nạp khuyến mãi" description="Tạo campaign nạp ngọc, hồng ngọc và bonus. Giao dịch xác nhận được ghi ledger SQL và phát thưởng chống trùng." stats={<><span className="page-stat-pill"><strong>{campaigns.length}</strong> campaign</span><span className="page-stat-pill ok"><strong>{active}</strong> đang chạy</span></>} actions={<button className="btn primary" onClick={() => { setSelectedId(null); setForm(normalize()); setClaims([]); }}>+ Campaign mới</button>} />
    <PageFeedback msg={feedback.msg} type={feedback.type} onDismiss={fb.clear} />
    <div className="events-layout">
      <aside className="card section events-list">
        <div className="section-title"><h3>Campaign</h3><button className="btn sm" onClick={load}>Refresh</button></div>
        {campaigns.length === 0 && <p className="muted">Chưa có campaign nạp.</p>}
        {campaigns.map((item) => <button type="button" key={item.id} className={`event-list-item ${selectedId === item.id ? 'active' : ''}`} onClick={() => open(item.id)}><span><strong>{item.name}</strong><small>{item.campaign_key}</small></span><span className={`badge ${item.status === 'active' ? 'ok' : item.status === 'draft' ? 'warn' : ''}`}>{item.status}</span></button>)}
      </aside>
      <form className="card section event-editor" onSubmit={save}>
        <div className="section-title"><div><h3>{selectedId ? `Sửa campaign #${selectedId}` : 'Tạo campaign nạp mới'}</h3><p className="card-hint">Campaign, mốc nạp, ledger và claim đều lưu trong SQL.</p></div>{selectedId && <div className="button-row"><button type="button" className="btn sm" onClick={() => changeStatus('active')}>Bật</button><button type="button" className="btn sm" onClick={() => changeStatus('paused')}>Tạm dừng</button><button type="button" className="btn sm" onClick={reconcile}>Đồng bộ nạp</button><button type="button" className="btn sm danger" onClick={remove}>Xóa</button></div>}</div>
        <div className="form-grid"><label className="field">Mã campaign<input required value={form.campaignKey} onChange={(e) => patch('campaignKey', e.target.value)} placeholder="nap-he-2026" /></label><label className="field">Tên hiển thị<input required value={form.name} onChange={(e) => patch('name', e.target.value)} placeholder="Nạp hè nhận bonus" /></label><label className="field">Trạng thái<select value={form.status} onChange={(e) => patch('status', e.target.value)}><option value="draft">Nháp</option><option value="scheduled">Đã lên lịch</option><option value="active">Đang chạy</option><option value="paused">Tạm dừng</option><option value="ended">Đã kết thúc</option></select></label><label className="field">Múi giờ<input value={form.timezone} onChange={(e) => patch('timezone', e.target.value)} /></label></div>
        <label className="field">Mô tả<textarea rows="2" value={form.description} onChange={(e) => patch('description', e.target.value)} placeholder="Nạp trong thời gian campaign để nhận ngọc, hồng ngọc và bonus." /></label>
        <div className="form-grid"><label className="field">Bắt đầu<input type="datetime-local" value={form.startsAt} onChange={(e) => patch('startsAt', e.target.value)} /></label><label className="field">Kết thúc<input type="datetime-local" value={form.endsAt} onChange={(e) => patch('endsAt', e.target.value)} /></label></div>
        <h4>Nguồn giao dịch được tính</h4><div className="check-grid">{[['payments', 'Gateway'], ['bank_transfers', 'Chuyển khoản'], ['napthe', 'Nạp thẻ']].map(([value, label]) => <label key={value}><input type="checkbox" checked={form.sources.includes(value)} onChange={(e) => patch('sources', e.target.checked ? [...new Set([...form.sources, value])] : form.sources.filter((source) => source !== value))} /> {label}</label>)}</div>
        <div className="section-title"><div><h4>Mốc nạp & bonus</h4><p className="card-hint">Mỗi giao dịch lấy mốc cao nhất không vượt quá số tiền nạp. Bonus % được tính trên số tiền giao dịch.</p></div><button type="button" className="btn sm" onClick={() => patch('tiers', [...form.tiers, { ...emptyTier, thresholdAmount: 0 }])}>+ Mốc</button></div>
        {form.tiers.map((tier, index) => <div className="nested-editor" key={`tier-${index}`}><div className="form-grid"><label className="field">Mốc nạp<input type="number" min="0" value={tier.thresholdAmount} onChange={(e) => patchTier(index, { thresholdAmount: n(e.target.value) })} /></label><label className="field">Bonus ngọc<input type="number" min="0" value={tier.gemBonus} onChange={(e) => patchTier(index, { gemBonus: n(e.target.value) })} /></label><label className="field">Bonus hồng ngọc<input type="number" min="0" value={tier.rubyBonus} onChange={(e) => patchTier(index, { rubyBonus: n(e.target.value) })} /></label><label className="field">Bonus theo %<input type="number" min="0" max="1000" step="0.01" value={tier.bonusPercent} onChange={(e) => patchTier(index, { bonusPercent: n(e.target.value) })} /></label></div>{form.tiers.length > 1 && <button type="button" className="btn sm danger" onClick={() => patch('tiers', form.tiers.filter((_, i) => i !== index))}>Xóa mốc</button>}</div>)}
        <div className="form-actions"><button className="btn primary" type="submit" disabled={loading}>{loading ? 'Đang xử lý...' : 'Lưu campaign vào SQL'}</button>{selectedId && <span className="muted">Nút Đồng bộ nạp xử lý payments đã xác nhận và phát bonus chống trùng.</span>}</div>
        {selectedId && <div className="card-inner"><div className="section-title"><h4>Claim gần đây ({claims.length})</h4><button type="button" className="btn sm" onClick={() => open(selectedId)}>Refresh</button></div>{claims.length === 0 ? <p className="muted">Chưa có giao dịch được ghi nhận.</p> : <div className="table-wrap"><table><thead><tr><th>Player</th><th>Transaction</th><th>Số tiền</th><th>Bonus</th><th>Trạng thái</th></tr></thead><tbody>{claims.map((claim) => <tr key={claim.id}><td>{claim.player_name}</td><td>{claim.transaction_key}</td><td>{Number(claim.amount || 0).toLocaleString()}</td><td>{Number(claim.grant?.gem || 0).toLocaleString()} ngọc · {Number(claim.grant?.ruby || 0).toLocaleString()} hồng ngọc</td><td><span className={`badge ${claim.status === 'delivered' ? 'ok' : 'warn'}`}>{claim.status}</span></td></tr>)}</tbody></table></div>}</div>}
      </form>
    </div>
  </div>;
}
