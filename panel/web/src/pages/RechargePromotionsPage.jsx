import { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import PageHeader from '../components/PageHeader';

const PRESET_TIERS = [
  { label: '50K', amount: 50000, gem: 50, ruby: 20, percent: 10 },
  { label: '100K', amount: 100000, gem: 120, ruby: 50, percent: 15 },
  { label: '200K', amount: 200000, gem: 260, ruby: 120, percent: 20 },
  { label: '500K', amount: 500000, gem: 700, ruby: 350, percent: 30 },
  { label: '1 Triệu', amount: 1000000, gem: 1500, ruby: 800, percent: 40 },
  { label: '2 Triệu', amount: 2000000, gem: 3500, ruby: 2000, percent: 50 },
];

const emptyTier = { thresholdAmount: 100000, gemBonus: 0, rubyBonus: 0, bonusPercent: 0, bonusJson: {} };
const emptyForm = {
  campaignKey: '',
  name: '',
  description: '',
  status: 'draft',
  enabled: false,
  startsAt: '',
  endsAt: '',
  timezone: 'Asia/Ho_Chi_Minh',
  sources: ['payments', 'bank_transfers', 'napthe'],
  tiers: [{ ...emptyTier }],
  configJson: {},
};

function normalize(data) {
  if (!data) return { ...emptyForm, tiers: [{ ...emptyTier }] };
  return {
    ...emptyForm,
    ...data,
    campaignKey: data.campaign_key || data.campaignKey || '',
    startsAt: String(data.starts_at || data.startsAt || '').slice(0, 16),
    endsAt: String(data.ends_at || data.endsAt || '').slice(0, 16),
    sources: data.sources || data.sources_json || emptyForm.sources,
    tiers: (data.tiers || []).map((tier) => ({
      ...emptyTier,
      ...tier,
      thresholdAmount: tier.threshold_amount ?? tier.thresholdAmount ?? 0,
      gemBonus: tier.gem_bonus ?? tier.gemBonus ?? 0,
      rubyBonus: tier.ruby_bonus ?? tier.rubyBonus ?? 0,
      bonusPercent: tier.bonus_percent ?? tier.bonusPercent ?? 0,
      bonusJson: tier.bonusJson || tier.bonus_json || {},
    })),
  };
}

const n = (value) => (value === '' ? '' : Number(value));

export default function RechargePromotionsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(normalize());
  const [selectedId, setSelectedId] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const fb = useFeedback();

  async function load() {
    try {
      const result = await api(`/recharge-promotions?serverId=${getServerId()}`);
      setCampaigns(result.data || []);
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function open(id) {
    try {
      const result = await api(`/recharge-promotions/${id}?serverId=${getServerId()}`);
      setSelectedId(id);
      setForm(normalize(result.data));
      const claimResult = await api(`/recharge-promotions/${id}/claims?serverId=${getServerId()}`);
      setClaims(claimResult.data || []);
    } catch (e) {
      fb.error(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeCount = useMemo(() => campaigns.filter((c) => c.status === 'active').length, [campaigns]);
  const totalClaims = useMemo(() => claims.length, [claims]);
  const totalBonusAmount = useMemo(() => {
    return claims.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  }, [claims]);

  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const patchTier = (index, value) =>
    setForm((current) => ({
      ...current,
      tiers: current.tiers.map((tier, i) => (i === index ? { ...tier, ...value } : tier)),
    }));

  function addPresetTier(p) {
    const exists = form.tiers.some((t) => Number(t.thresholdAmount) === p.amount);
    if (exists) {
      fb.error(`Mốc ${p.label} đã có trong danh sách!`);
      return;
    }
    const newTier = {
      thresholdAmount: p.amount,
      gemBonus: p.gem,
      rubyBonus: p.ruby,
      bonusPercent: p.percent,
      bonusJson: {},
    };
    const nextTiers = [...form.tiers, newTier].sort((a, b) => Number(a.thresholdAmount) - Number(b.thresholdAmount));
    patch('tiers', nextTiers);
    fb.success(`Đã thêm mốc nạp ${p.label} vào cấu hình!`);
  }

  async function save(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        serverId: getServerId(),
        tiers: form.tiers.map((tier) => ({
          ...tier,
          thresholdAmount: Number(tier.thresholdAmount) || 0,
          gemBonus: Number(tier.gemBonus) || 0,
          rubyBonus: Number(tier.rubyBonus) || 0,
          bonusPercent: Number(tier.bonusPercent) || 0,
        })),
      };
      const result = await api(selectedId ? `/recharge-promotions/${selectedId}` : '/recharge-promotions', {
        method: selectedId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const id = selectedId || result.data?.id;
      fb.success('Đã lưu chiến dịch và toàn bộ mốc khuyến mãi vào MySQL bền vững!');
      await load();
      if (id) await open(id);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(status) {
    if (!selectedId) return;
    try {
      await api(`/recharge-promotions/${selectedId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, serverId: getServerId() }),
      });
      fb.success(`Đã cập nhật trạng thái chiến dịch thành: ${status.toUpperCase()}`);
      await load();
      await open(selectedId);
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function reconcile() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const result = await api(`/recharge-promotions/${selectedId}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId(), source: 'payments' }),
      });
      fb.success(`Đã kiểm tra & xử lý phát thưởng ${result.data?.count || 0} giao dịch nạp xác nhận!`);
      await open(selectedId);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!selectedId || !window.confirm('Xóa chiến dịch này và toàn bộ mốc/claim khỏi Database MySQL?')) return;
    try {
      await api(`/recharge-promotions/${selectedId}?serverId=${getServerId()}`, { method: 'DELETE' });
      setSelectedId(null);
      setForm(normalize());
      setClaims([]);
      fb.success('Đã xóa chiến dịch thành công!');
      await load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Khuyến Mãi Nạp (Recharge Promotions)"
        description="Tạo các sự kiện nạp ngọc, hồng ngọc và thưởng mốc nạp tích lũy. Tự động đối chiếu giao dịch và trao thưởng chống trùng lặp."
        stats={
          <>
            <span className="page-stat-pill">
              <strong>{campaigns.length}</strong> chiến dịch
            </span>
            <span className="page-stat-pill ok">
              <strong>{activeCount}</strong> đang kích hoạt
            </span>
          </>
        }
        actions={
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setSelectedId(null);
              setForm(normalize());
              setClaims([]);
            }}
          >
            ➕ Tạo Chiến Dịch Mới
          </button>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* KPI METRICS OVERVIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '16px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>🎯 Tổng Chiến Dịch</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>{campaigns.length}</div>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>{activeCount} chiến dịch đang chạy</div>
        </div>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '16px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>🎁 Lượt Nhận Thưởng (Claims)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>{totalClaims.toLocaleString('vi-VN')}</div>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>Giao dịch đã nhận bonus</div>
        </div>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '12px', padding: '16px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>💰 Tổng Doanh Thu Nạp Ghi Nhận</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#facc15', marginTop: '4px' }}>{totalBonusAmount.toLocaleString('vi-VN')} đ</div>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>Theo chiến dịch đang mở</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(450px, 2.4fr)', gap: '20px', alignItems: 'start' }}>
        {/* DANH SÁCH CHIẾN DỊCH BÊN TRÁI */}
        <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Danh Sách Chiến Dịch</h3>
            <button type="button" className="btn sm" onClick={load} title="Tải lại danh sách">
              🔄 Tải lại
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="card-inner" style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--muted)' }}>
              Chưa có chiến dịch khuyến mãi nào trong Database. Bấm "+ Tạo Chiến Dịch Mới" ở trên.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {campaigns.map((item) => {
                const isSelected = selectedId === item.id;
                const isActive = item.status === 'active';
                return (
                  <div
                    key={item.id}
                    onClick={() => open(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.06)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isSelected ? '#60a5fa' : 'var(--text)' }}>
                        {item.name}
                      </div>
                      <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                        Mã: <code>{item.campaign_key}</code>
                      </div>
                    </div>
                    <span
                      className={`badge sm ${
                        isActive ? 'ok' : item.status === 'draft' ? 'warn' : item.status === 'paused' ? 'admin' : ''
                      }`}
                    >
                      {item.status === 'active'
                        ? '🟢 Đang chạy'
                        : item.status === 'draft'
                        ? '🟡 Nháp'
                        : item.status === 'paused'
                        ? '⏸️ Tạm dừng'
                        : item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* EDITOR CHI TIẾT CHIẾN DỊCH BÊN PHẢI */}
        <form className="card" style={{ padding: '22px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '18px' }} onSubmit={save}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                {selectedId ? `Chỉnh Sửa Chiến Dịch #${selectedId}` : 'Tạo Chiến Dịch Khuyến Mãi Mới'}
              </h3>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.84rem' }}>
                Cấu hình mốc nạp, quà bonus và tỷ lệ % khuyến mãi. Tự động lưu bền vững vào MySQL.
              </p>
            </div>

            {selectedId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" className="btn sm ok" onClick={() => changeStatus('active')} title="Bật chiến dịch ngay">
                  ▶️ Bật
                </button>
                <button type="button" className="btn sm warn" onClick={() => changeStatus('paused')} title="Tạm dừng nhận thưởng">
                  ⏸️ Tạm dừng
                </button>
                <button type="button" className="btn sm secondary" onClick={reconcile} title="Xử lý các payments hợp lệ">
                  🔄 Đồng bộ nạp
                </button>
                <button type="button" className="btn sm danger" onClick={remove} title="Xóa chiến dịch">
                  🗑️ Xóa
                </button>
              </div>
            )}
          </div>

          {/* FORM GRID THÔNG TIN CƠ BẢN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label className="label">Mã Chiến Dịch (Key):</label>
              <input
                className="input"
                required
                value={form.campaignKey}
                onChange={(e) => patch('campaignKey', e.target.value)}
                placeholder="VD: nap-tet-2026, khuyen-mai-50"
              />
            </div>
            <div>
              <label className="label">Tên Hiển Thị:</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => patch('name', e.target.value)}
                placeholder="VD: Sự kiện Nạp Vàng Nhận Ngọc Khủng"
              />
            </div>
            <div>
              <label className="label">Trạng Thái:</label>
              <select className="input" value={form.status} onChange={(e) => patch('status', e.target.value)}>
                <option value="draft">Nháp (Draft)</option>
                <option value="scheduled">Đã lên lịch</option>
                <option value="active">Đang kích hoạt (Active)</option>
                <option value="paused">Tạm dừng (Paused)</option>
                <option value="ended">Đã kết thúc</option>
              </select>
            </div>
            <div>
              <label className="label">Múi Giờ:</label>
              <input className="input" value={form.timezone} onChange={(e) => patch('timezone', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Mô Tả Chiến Dịch:</label>
            <textarea
              className="input"
              rows="2"
              value={form.description}
              onChange={(e) => patch('description', e.target.value)}
              placeholder="Nội dung hiển thị cho người chơi: Nạp trong thời gian này nhận ngay quà tặng siêu khủng..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="label">Thời Gian Bắt Đầu:</label>
              <input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => patch('startsAt', e.target.value)} />
            </div>
            <div>
              <label className="label">Thời Gian Kết Thúc:</label>
              <input type="datetime-local" className="input" value={form.endsAt} onChange={(e) => patch('endsAt', e.target.value)} />
            </div>
          </div>

          {/* NGUỒN GIAO DỊCH */}
          <div className="card-inner" style={{ padding: '12px 16px', borderRadius: '10px' }}>
            <strong style={{ fontSize: '0.9rem', color: '#93c5fd' }}>💳 Nguồn Giao Dịch Được Áp Dụng:</strong>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
              {[
                ['payments', 'Gateway Tích Hợp (payments)'],
                ['bank_transfers', 'Chuyển Khoản Ngân Hàng (bank_transfers)'],
                ['napthe', 'Nạp Thẻ Cào (napthe)'],
              ].map(([value, label]) => (
                <label key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.sources.includes(value)}
                    onChange={(e) =>
                      patch(
                        'sources',
                        e.target.checked
                          ? [...new Set([...form.sources, value])]
                          : form.sources.filter((source) => source !== value)
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* QUẢN LÝ MỐC NẠP & BONUS */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div>
                <strong style={{ fontSize: '1.05rem', color: '#facc15' }}>🎁 Các Mốc Nạp &amp; Quà Tặng (Tiers)</strong>
                <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>
                  Hệ thống tự động xét mốc cao nhất không vượt quá số tiền nạp. Có thể thưởng thêm Ngọc xanh, Hồng ngọc và % giá trị nạp.
                </p>
              </div>
              <button
                type="button"
                className="btn sm"
                onClick={() => patch('tiers', [...form.tiers, { ...emptyTier, thresholdAmount: 0 }])}
              >
                + Thêm Mốc Tùy Chỉnh
              </button>
            </div>

            {/* PRESETS BUTTONS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span className="muted" style={{ fontSize: '0.82rem' }}>Thêm nhanh mốc chuẩn:</span>
              {PRESET_TIERS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="btn sm secondary"
                  onClick={() => addPresetTier(p)}
                  style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                >
                  +{p.label}
                </button>
              ))}
            </div>

            {/* TIERS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {form.tiers.map((tier, index) => (
                <div
                  key={`tier-${index}`}
                  className="card-inner"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(160px, 1.4fr) minmax(110px, 1fr) minmax(110px, 1fr) minmax(110px, 1fr) auto',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>Mốc nạp (VNĐ):</span>
                    <input
                      type="number"
                      className="input sm"
                      style={{ fontWeight: 600 }}
                      min="0"
                      step="1000"
                      value={tier.thresholdAmount}
                      onChange={(e) => patchTier(index, { thresholdAmount: n(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>🟢 Ngọc Xanh:</span>
                    <input
                      type="number"
                      className="input sm"
                      min="0"
                      value={tier.gemBonus}
                      onChange={(e) => patchTier(index, { gemBonus: n(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>🔴 Hồng Ngọc:</span>
                    <input
                      type="number"
                      className="input sm"
                      min="0"
                      value={tier.rubyBonus}
                      onChange={(e) => patchTier(index, { rubyBonus: n(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>📈 Khuyến mãi %:</span>
                    <input
                      type="number"
                      className="input sm"
                      min="0"
                      max="1000"
                      step="0.5"
                      value={tier.bonusPercent}
                      onChange={(e) => patchTier(index, { bonusPercent: n(e.target.value) })}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '16px' }}>
                    {form.tiers.length > 1 && (
                      <button
                        type="button"
                        className="btn sm ghost danger"
                        onClick={() => patch('tiers', form.tiers.filter((_, i) => i !== index))}
                        title="Xóa mốc này"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              💾 Mọi thay đổi đều được lưu vào cơ sở dữ liệu MySQL và áp dụng ngay lập tức.
            </span>
            <button className="btn primary" type="submit" disabled={loading} style={{ fontWeight: 700, padding: '9px 24px' }}>
              {loading ? '⏳ Đang Lưu...' : '💾 Lưu Chiến Dịch Vào MySQL'}
            </button>
          </div>

          {/* BẢNG LỊCH SỬ NHẬN THƯỞNG CLAIMS */}
          {selectedId && (
            <div className="card-inner" style={{ marginTop: '14px', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.95rem' }}>📋 Lịch Sử Nhận Khuyến Mãi Gần Đây ({claims.length})</strong>
                <button type="button" className="btn sm" onClick={() => open(selectedId)}>
                  🔄 Làm mới
                </button>
              </div>

              {claims.length === 0 ? (
                <p className="muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                  Chưa có người chơi nào nhận khuyến mãi từ chiến dịch này.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="compact">
                    <thead>
                      <tr>
                        <th>Nhân Vật</th>
                        <th>Mã Giao Dịch</th>
                        <th>Số Tiền Nạp</th>
                        <th>Thưởng Nhận Được</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map((claim) => (
                        <tr key={claim.id}>
                          <td><strong>{claim.player_name || '—'}</strong></td>
                          <td><code>{claim.transaction_key}</code></td>
                          <td><strong style={{ color: '#facc15' }}>{Number(claim.amount || 0).toLocaleString()} đ</strong></td>
                          <td>
                            {Number(claim.grant?.gem || 0) > 0 && <span className="badge sm ok">{claim.grant.gem} ngọc</span>}{' '}
                            {Number(claim.grant?.ruby || 0) > 0 && <span className="badge sm bad">{claim.grant.ruby} hồng ngọc</span>}
                          </td>
                          <td>
                            <span className={`badge sm ${claim.status === 'delivered' ? 'ok' : 'warn'}`}>
                              {claim.status === 'delivered' ? 'Đã phát' : claim.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
