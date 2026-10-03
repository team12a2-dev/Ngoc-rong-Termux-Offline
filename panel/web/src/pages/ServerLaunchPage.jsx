import { useEffect, useState, useMemo } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const RESTRICTION_ICONS = {
  block_socket_and_star_combine: '🔒',
  santa_no_gold_bars: '🚫',
  santa_no_lucky_star_tickets: '🎟️',
  restrict_gold_trading: '💰',
  black_ball_war_schedule: '🌑',
  black_ball_war_no_40b_limit: '⚡',
  block_shenron_power_wish: '🐉',
  block_tnsm_charms_x3_x4: '📜',
  disable_god_normal_spin: '🎡',
  block_star_crystal_item_drops: '✨',
};

function formatCountdown(targetDateStr) {
  if (!targetDateStr) return { expired: true, text: 'Chưa thiết lập' };
  const target = new Date(targetDateStr).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return { expired: true, text: 'Đã hoàn thành / Đã diễn ra' };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    expired: false,
    text: `${days > 0 ? `${days} ngày ` : ''}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
    days,
    hours,
    mins,
    secs,
  };
}

export default function ServerLaunchPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // Race Top Tab States
  const [selectedRace, setSelectedRace] = useState('mission'); // 'mission' | 'power' | 'recharge_points'
  const [rankings, setRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const fb = useFeedback();

  // Tick for countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api(`/server-launches?serverId=${getServerId()}`);
      if (res.ok && res.data) {
        setData(res.data);
      }
    } catch (e) {
      fb.error('Không thể tải dữ liệu Khai Mở Server: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRankings(category = selectedRace, q = searchQuery) {
    setLoadingRankings(true);
    try {
      const res = await api(`/server-launches/${getServerId()}/rankings?category=${category}&q=${encodeURIComponent(q)}&limit=100`);
      if (res.ok && res.data) {
        setRankings(res.data);
      }
    } catch (e) {
      fb.error('Lỗi khi tải bảng xếp hạng: ' + e.message);
    } finally {
      setLoadingRankings(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'race_top') {
      loadRankings(selectedRace, searchQuery);
    }
  }, [activeTab, selectedRace]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      await api('/server-launches', {
        method: 'POST',
        body: JSON.stringify({ ...data, server_id: getServerId() }),
      });
      fb.success('Đã lưu cấu hình Khai Mở Server thành công!');
      loadData();
    } catch (e) {
      fb.error('Lỗi khi lưu cấu hình: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyPreset() {
    if (!window.confirm('Áp dụng mẫu chuẩn "KHAI MỞ VŨ TRỤ 15"? Toàn bộ mốc thưởng, quy tắc và quà tặng sẽ được thiết lập theo đúng kịch bản.')) return;
    setSaving(true);
    try {
      const res = await api(`/server-launches/${getServerId()}/apply-preset`, { method: 'POST' });
      fb.success(res.message || 'Đã áp dụng mẫu chuẩn Vũ Trụ 15 thành công!');
      loadData();
    } catch (e) {
      fb.error('Lỗi khi áp dụng mẫu: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBroadcast() {
    const msg = broadcastMsg.trim() || `🚀 [THÔNG BÁO] Máy chủ ${data?.server_name || 'VŨ TRỤ 15'} đang diễn ra chuỗi sự kiện Đua Top nhận Set Kích Hoạt & Nhận quà Ván Bay MT vĩnh viễn tại NPC Chi Chi!`;
    setBroadcasting(true);
    try {
      await api(`/server-launches/${getServerId()}/broadcast`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });
      fb.success('Đã phát sóng thông báo Khai Mở Server vào game thành công!');
      setBroadcastMsg('');
    } catch (e) {
      fb.error('Lỗi khi phát thông báo: ' + e.message);
    } finally {
      setBroadcasting(false);
    }
  }

  async function handleDistributeRewards(category = selectedRace) {
    const catName = category === 'all' 
      ? 'TOÀN BỘ 3 HẠNG MỤC (Nhiệm Vụ, Sức Mạnh, Điểm Tích Lũy)' 
      : category === 'mission' 
      ? 'TOP Nhiệm Vụ' 
      : category === 'power' 
      ? 'TOP Sức Mạnh' 
      : 'TOP Điểm Tích Lũy';

    const ok = window.confirm(
      `XÁC NHẬN CHỐT & PHÁT QUÀ THẬT TỰ ĐỘNG?\n\n` +
      `- Hạng mục: ${catName}\n` +
      `- Phần thưởng: Cải trang CT Broly SSJ4 (VIP options), Capsule kích hoạt, Ra Đa Ngọc Rồng VIP, Giáp cấp 5, Pet Xên Bọ Hung MAX và Hồng Ngọc sẽ được tự động gửi trực tiếp vào túi đồ/tài khoản của người chơi đạt TOP.\n\n` +
      `Bạn có chắc chắn muốn tiến hành trao giải ngay bây giờ?`
    );
    if (!ok) return;

    setDistributing(true);
    try {
      const res = await api(`/server-launches/${getServerId()}/distribute-rewards`, {
        method: 'POST',
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        fb.success(res.message || 'Đã phát quà đua TOP thành công!');
        loadRankings(selectedRace, searchQuery);
      } else {
        fb.error(res.error || 'Lỗi khi phát quà');
      }
    } catch (e) {
      fb.error('Lỗi kết nối khi phát quà: ' + e.message);
    } finally {
      setDistributing(false);
    }
  }

  async function openHistoryModal() {
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api(`/server-launches/${getServerId()}/distribution-history`);
      if (res.ok && res.data) {
        setHistoryData(res.data);
      }
    } catch (e) {
      fb.error('Lỗi tải lịch sử trao giải: ' + e.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function toggleRestriction(key) {
    if (!data || !data.restrictions_config) return;
    const cur = data.restrictions_config[key];
    const newEnabled = !cur?.enabled;

    // Optimistic UI update
    setData((prev) => ({
      ...prev,
      restrictions_config: {
        ...prev?.restrictions_config,
        [key]: {
          ...cur,
          enabled: newEnabled,
        },
      },
    }));

    setTogglingKey(key);
    try {
      const res = await api(`/server-launches/${getServerId()}/toggle-restriction`, {
        method: 'POST',
        body: JSON.stringify({ key, enabled: newEnabled }),
      });
      fb.success(res.message || `Đã ${newEnabled ? 'bật' : 'tắt'} quy tắc ${cur?.title || key}!`);
    } catch (e) {
      fb.error('Lỗi khi lưu quy tắc: ' + e.message);
      loadData();
    } finally {
      setTogglingKey(null);
    }
  }

  async function updateRestrictionDate(key, field, dateStr) {
    if (!data || !data.restrictions_config) return;
    const cur = data.restrictions_config[key];

    // Optimistic UI update
    setData((prev) => ({
      ...prev,
      restrictions_config: {
        ...prev?.restrictions_config,
        [key]: {
          ...cur,
          [field]: dateStr,
        },
      },
    }));

    setTogglingKey(key);
    try {
      const res = await api(`/server-launches/${getServerId()}/toggle-restriction`, {
        method: 'POST',
        body: JSON.stringify({ key, [field]: dateStr }),
      });
      fb.success(res.message || `Đã cập nhật thời hạn cho "${cur?.title || key}"!`);
    } catch (e) {
      fb.error('Lỗi khi lưu thời gian: ' + e.message);
      loadData();
    } finally {
      setTogglingKey(null);
    }
  }

  async function bulkToggleRestrictions(enabled) {
    if (!window.confirm(`Bạn có chắc chắn muốn ${enabled ? 'BẬT' : 'TẮT'} toàn bộ 10 quy tắc giới hạn máy chủ?`)) return;
    setSaving(true);
    try {
      const res = await api(`/server-launches/${getServerId()}/bulk-toggle-restrictions`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      fb.success(res.message || `Đã ${enabled ? 'bật' : 'tắt'} toàn bộ 10 quy tắc!`);
      loadData();
    } catch (e) {
      fb.error('Lỗi: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeature(feature, enabled) {
    const fieldMap = {
      is_active: 'is_active',
      npc_gift: 'npc_gift_enabled',
      first_recharge: 'first_recharge_enabled',
      race: 'race_enabled',
      restrictions: 'restrictions_enabled',
    };
    const field = fieldMap[feature] || feature;

    setData((prev) => ({
      ...prev,
      [field]: enabled ? 1 : 0,
      ...(feature === 'is_active' ? { status: enabled ? 'active' : 'paused' } : {}),
    }));

    try {
      const res = await api(`/server-launches/${getServerId()}/toggle-feature`, {
        method: 'POST',
        body: JSON.stringify({ feature, enabled }),
      });
      fb.success(res.message || 'Đã cập nhật trạng thái chức năng và đồng bộ vào game!');
    } catch (e) {
      fb.error('Lỗi khi bật/tắt chức năng: ' + e.message);
      loadData();
    }
  }

  const cdOpen = useMemo(() => formatCountdown(data?.opens_at), [data?.opens_at, nowTick]);
  const cdTop = useMemo(() => formatCountdown(data?.top_race_ends_at), [data?.top_race_ends_at, nowTick]);
  const cdRestrict = useMemo(() => formatCountdown(data?.restrictions_end_at), [data?.restrictions_end_at, nowTick]);

  if (loading && !data) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <span className="ui-spinner" style={{ width: '32px', height: '32px' }} />
        <p className="muted" style={{ marginTop: '12px' }}>Đang tải cấu hình Khai Mở Server...</p>
      </div>
    );
  }

  const currentRaceConfig = data?.race_config?.categories?.[selectedRace];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Khai Mở Server & Đua Top"
        description="Cơ chế quản lý toàn diện khi khai mở máy chủ mới: Lịch trình, quà NPC Chi Chi, nạp đầu, 3 bảng Đua TOP (Nhiệm Vụ, Sức Mạnh, Nạp Ngọc) và 10 quy tắc giới hạn giai đoạn đầu."
        stats={
          <>
            <span className="page-stat-pill ok">
              <strong>{data?.server_name || 'VŨ TRỤ 15'}</strong>
            </span>
            <span className={`page-stat-pill ${data?.is_active && data?.status === 'active' ? 'ok' : 'warn'}`}>
              Trạng thái: <strong>{data?.is_active ? data?.status?.toUpperCase() || 'ACTIVE' : 'TẮT (INACTIVE)'}</strong>
            </span>
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={handleApplyPreset}
              title="Khôi phục toàn bộ cấu hình theo chuẩn Vũ Trụ 15"
            >
              ⚡ Áp Dụng Mẫu Vũ Trụ 15
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? '⏳ Đang lưu...' : '💾 Lưu Cấu Hình'}
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* COUNTDOWN TILES BANNER */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Khai Mở Server */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#93c5fd' }}>🚀 KHAI MỞ MÁY CHỦ</span>
            <span className={`badge sm ${cdOpen.expired ? 'bad' : 'ok'}`}>
              {cdOpen.expired ? 'Đã Mở' : 'Sắp Mở'}
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', color: '#60a5fa' }}>
            {cdOpen.text}
          </div>
          <div className="muted" style={{ fontSize: '0.78rem' }}>
            Thời gian: <strong>{data?.opens_at || '10:00 28/08/2026'}</strong>
          </div>
        </div>

        {/* Card 2: Chốt Đua TOP */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fde047' }}>🏆 CHỐT ĐUA TOP (3 HẠNG MỤC)</span>
            <span className={`badge sm ${cdTop.expired ? 'bad' : 'warn'}`}>
              {cdTop.expired ? 'Đã Chốt Top' : 'Đang Đua Top'}
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', color: '#facc15' }}>
            {cdTop.text}
          </div>
          <div className="muted" style={{ fontSize: '0.78rem' }}>
            Hạn chót: <strong>{data?.top_race_ends_at || '23:00 07/09/2026'}</strong>
          </div>
        </div>

        {/* Card 3: Hạn Chót Giới Hạn Server & Quà Chi Chi */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d8b4fe' }}>🛡️ GỠ BỎ HẠN CHẾ & HẾT HẠN QUÀ</span>
            <span className={`badge sm ${cdRestrict.expired ? 'bad' : 'ok'}`}>
              {cdRestrict.expired ? 'Đã Hết Hạn' : 'Đang Áp Dụng'}
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', color: '#c084fc' }}>
            {cdRestrict.text}
          </div>
          <div className="muted" style={{ fontSize: '0.78rem' }}>
            Hạn kết thúc: <strong>{data?.restrictions_end_at || '31/10/2026'}</strong>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="editor-tabs" style={{ marginBottom: '4px' }}>
        <button
          type="button"
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Tổng Quan & Lịch Trình
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'gifts' ? 'active' : ''}`}
          onClick={() => setActiveTab('gifts')}
        >
          🎁 Quà Chi Chi & Nạp Đầu
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'race_top' ? 'active' : ''}`}
          onClick={() => setActiveTab('race_top')}
        >
          🏆 Đua TOP Khai Mở (3 Bảng)
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'restrictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('restrictions')}
        >
          🛡️ Quy Tắc & Giới Hạn (10 Cơ Chế)
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'announcement' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcement')}
        >
          📢 Thông Báo & Phát Sóng Game
        </button>
      </div>

      {/* TAB 1: TỔNG QUAN & LỊCH TRÌNH */}
      {activeTab === 'overview' && (
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
            <div className="section-title" style={{ margin: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Thông Tin Cơ Bản Chiến Dịch Khai Mở</h3>
                <p className="card-hint" style={{ margin: '4px 0 0' }}>Cấu hình thời gian bắt đầu, chốt giải thưởng và trạng thái máy chủ.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: data?.is_active ? '#4ade80' : '#f87171' }}>
                {data?.is_active ? '🟢 Toàn Bộ Chiến Dịch: ĐANG BẬT' : '🔴 Toàn Bộ Chiến Dịch: ĐÃ TẮT'}
              </span>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={Boolean(data?.is_active)}
                  onChange={(e) => toggleFeature('is_active', e.target.checked)}
                />
                <span>{data?.is_active ? 'Bật' : 'Tắt'}</span>
              </label>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              Tên Máy Chủ
              <input
                className="input"
                value={data?.server_name || ''}
                onChange={(e) => setData({ ...data, server_name: e.target.value })}
                placeholder="VŨ TRỤ 15"
              />
            </label>

            <label className="field">
              Tiêu Đề Chiến Dịch
              <input
                className="input"
                value={data?.title || ''}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                placeholder="KHAI MỞ VŨ TRỤ 15"
              />
            </label>

            <label className="field">
              Trạng Thái Chiến Dịch
              <select
                className="input"
                value={data?.status || 'active'}
                onChange={(e) => setData({ ...data, status: e.target.value })}
              >
                <option value="draft">Nháp (Chưa công bố)</option>
                <option value="scheduled">Đã lên lịch (Đếm ngược mở)</option>
                <option value="active">Đang diễn ra (Khai mở & Đua top)</option>
                <option value="top_ended">Đã chốt Top (Đang phát thưởng)</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="paused">Tạm dừng</option>
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              Thời Gian Khai Mở (Giờ Mở Cửa Server)
              <input
                type="datetime-local"
                className="input"
                value={(data?.opens_at || '').slice(0, 16)}
                onChange={(e) => setData({ ...data, opens_at: e.target.value })}
              />
            </label>

            <label className="field">
              Thời Gian Chốt Đua TOP (Kết thúc nhận set kích hoạt)
              <input
                type="datetime-local"
                className="input"
                value={(data?.top_race_ends_at || '').slice(0, 16)}
                onChange={(e) => setData({ ...data, top_race_ends_at: e.target.value })}
              />
            </label>

            <label className="field">
              Hạn Chót Hạn Chế Server & Quà Chi Chi
              <input
                type="datetime-local"
                className="input"
                value={(data?.restrictions_end_at || '').slice(0, 16)}
                onChange={(e) => setData({ ...data, restrictions_end_at: e.target.value })}
              />
            </label>
          </div>

          <label className="field">
            Mô Tả / Lời Chúc Khai Mở
            <textarea
              className="input"
              rows={3}
              value={data?.description || ''}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="Lời chào mừng cư dân tham gia máy chủ mới..."
            />
          </label>
        </div>
      )}

      {/* TAB 2: QUÀ CHI CHI & NẠP ĐẦU */}
      {activeTab === 'gifts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Card Quà Chi Chi */}
          <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>🎁</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>1. Quà Tặng NPC Chi Chi</h3>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>Tặng miễn phí cho tất cả cư dân máy chủ mới</span>
                </div>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={Boolean(data?.npc_gift_enabled)}
                  onChange={(e) => toggleFeature('npc_gift', e.target.checked)}
                />
                <span>{data?.npc_gift_enabled ? 'Đang Bật' : 'Tắt'}</span>
              </label>
            </div>

            <div className="card-inner" style={{ padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">NPC Trao Quà:</span>
                <strong>NPC Chi Chi (ID: 81)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Vật Phẩm Trao Tặng:</span>
                <span className="badge ok">Ván Bay MT (Vĩnh Viễn)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Hạn Nhận Quà:</span>
                <strong>Đến hết ngày 31/10/2026</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Điều kiện:</span>
                <span>Mỗi nhân vật nhận 1 lần tại Nhà Chi Chi</span>
              </div>
            </div>

            <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: '#94a3b8' }}>
              💡 <em>Người chơi đối thoại với NPC Chi Chi trong làng để nhận ngay Ván Bay MT vĩnh viễn giúp di chuyển tốc độ cao từ đầu game.</em>
            </div>
          </div>

          {/* Card Khuyến Mãi Nạp Đầu */}
          <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>💎</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>2. Khuyến Mãi Nạp Đầu</h3>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>Thưởng lần nạp đầu tiên bất kỳ</span>
                </div>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={Boolean(data?.first_recharge_enabled)}
                  onChange={(e) => toggleFeature('first_recharge', e.target.checked)}
                />
                <span>{data?.first_recharge_enabled ? 'Đang Bật' : 'Tắt'}</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data?.first_recharge_config?.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="card-inner"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{idx === 0 ? '🚩' : idx === 1 ? '👗' : '🐛'}</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.92rem' }}>{item.name}</strong>
                      <span className="muted" style={{ fontSize: '0.78rem' }}>{item.desc}</span>
                    </div>
                  </div>
                  <span className={`badge ${item.duration === 'Vĩnh Viễn' ? 'ok' : 'warn'}`}>
                    {item.duration}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: '#94a3b8' }}>
              ⚡ <em>Bộ ba quà nạp đầu giúp tân thủ bứt phá sức mạnh và tốc độ làm nhiệm vụ cực nhanh trong giai đoạn Đua Top.</em>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ĐUA TOP KHAI MỞ */}
      {activeTab === 'race_top' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Master Race Toggle Bar */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: data?.race_enabled ? 'rgba(59, 130, 246, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: data?.race_enabled ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>🏆</span>
              <div>
                <strong style={{ fontSize: '1rem', color: data?.race_enabled ? '#93c5fd' : '#fca5a5' }}>
                  Tính Năng Đua TOP Máy Chủ Mới: {data?.race_enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                </strong>
                <span className="muted" style={{ display: 'block', fontSize: '0.78rem' }}>
                  Khi tắt, bảng xếp hạng và phát thưởng đua top sẽ tạm dừng hoạt động.
                </span>
              </div>
            </div>

            <label className="switch-label">
              <input
                type="checkbox"
                checked={Boolean(data?.race_enabled)}
                onChange={(e) => toggleFeature('race', e.target.checked)}
              />
              <span>{data?.race_enabled ? 'Đang Bật' : 'Tắt'}</span>
            </label>
          </div>

          {/* Sub-Tabs chọn hạng mục đua top */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '12px' }}>
              <button
                type="button"
                className={`btn sm ${selectedRace === 'mission' ? 'primary' : 'ghost'}`}
                onClick={() => setSelectedRace('mission')}
              >
                📜 1. TOP Nhiệm Vụ
              </button>
              <button
                type="button"
                className={`btn sm ${selectedRace === 'power' ? 'primary' : 'ghost'}`}
                onClick={() => setSelectedRace('power')}
              >
                💥 2. TOP Sức Mạnh
              </button>
              <button
                type="button"
                className={`btn sm ${selectedRace === 'recharge_points' ? 'primary' : 'ghost'}`}
                onClick={() => setSelectedRace('recharge_points')}
              >
                💎 3. TOP Điểm Tích Lũy
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                className="input sm"
                placeholder="Tìm tên nhân vật..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadRankings(selectedRace, searchQuery)}
                style={{ width: '200px' }}
              />
              <button
                type="button"
                className="btn sm"
                onClick={() => loadRankings(selectedRace, searchQuery)}
              >
                🔍 Lọc
              </button>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => loadRankings(selectedRace, '')}
                title="Làm mới bảng xếp hạng"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Race Header Banner */}
          <div
            className="card"
            style={{
              padding: '18px 24px',
              borderRadius: '14px',
              borderLeft: '4px solid #3b82f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#60a5fa' }}>
                {currentRaceConfig?.name || 'BẢNG XẾP HẠNG ĐUA TOP'}
              </h3>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
                {currentRaceConfig?.description}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge ok">
                Chốt Top: 23h00 ngày 07/09
              </span>
            </div>
          </div>

          {/* Bảng Cơ Cấu Giải Thưởng Tiers (Top 1 -> 100) */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎁</span> Cơ Cấu Giải Thưởng Chi Tiết ({currentRaceConfig?.name})
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px' }}>
              {currentRaceConfig?.tiers?.map((tier, idx) => (
                <div
                  key={idx}
                  className="card-inner"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderLeft: idx === 0 ? '3px solid #eab308' : idx === 1 ? '3px solid #94a3b8' : idx === 2 ? '3px solid #b45309' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: idx === 0 ? '#facc15' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#f97316' : '#93c5fd' }}>
                      {tier.rank}
                    </strong>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>Hạng {tier.rank_min} - {tier.rank_max}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                    {tier.rewards}
                  </div>
                </div>
              ))}
            </div>

            {/* Note giải thích vật phẩm */}
            <div
              className="card-inner"
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <strong style={{ color: '#facc15' }}>📌 Ghi Chú Vật Phẩm Đua TOP:</strong>
              <div>✨ <strong>Capsule 1 món kích hoạt tự chọn:</strong> Tự lựa chọn Áo / Quần / Găng / Giày / Rada ra ngẫu nhiên set kích hoạt (có thể ra đồ cấp cao).</div>
              <div>🥚 <strong>Trứng Xên Vàng:</strong> Được chọn 1 trong 3 pet xên có chỉ số max: <em>Xên Con 35.000 Ki</em>, <em>Xên Hoàn Hảo 25.000 Sức Đánh</em>, <em>Xên Max 150.000 HP</em>.</div>
              {selectedRace === 'recharge_points' && (
                <div>💎 <strong>Điều kiện tính Top Nạp:</strong> Nạp 1 ngọc = 1 điểm. Cần đạt tối thiểu <strong>20 điểm</strong> mới đủ điều kiện vào bảng xếp hạng.</div>
              )}
            </div>
          </div>

          {/* BẢNG XẾP HẠNG THỜI GIAN THỰC (LIVE LEADERBOARD) */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem' }}>
                  📊 Bảng Xếp Hạng Live Trực Tuyến ({rankings.length} nhân vật)
                </h4>
                <span className="muted" style={{ fontSize: '0.8rem' }}>Dữ liệu tự động đồng bộ từ Database MySQL theo thời gian thực</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                  onClick={openHistoryModal}
                >
                  📜 Lịch Sử Trao Giải
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '6px 14px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                  onClick={() => handleDistributeRewards(selectedRace)}
                  disabled={distributing || rankings.length === 0}
                >
                  {distributing ? 'Đang Trao Quà...' : `🎁 1-Click Trao Quà ${currentRaceConfig?.name || 'Hạng Mục Này'}`}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ fontSize: '0.82rem', padding: '6px 14px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                  onClick={() => handleDistributeRewards('all')}
                  disabled={distributing}
                >
                  👑 Trao Toàn Bộ 3 TOP (1-Click All)
                </button>
              </div>
            </div>

            {loadingRankings ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <span className="ui-spinner" />
                <p className="muted" style={{ marginTop: '8px' }}>Đang truy xuất bảng xếp hạng...</p>
              </div>
            ) : rankings.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center' }} className="muted">
                Chưa có dữ liệu xếp hạng cho hạng mục này hoặc chưa có người chơi thỏa mãn điều kiện.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '70px', textAlign: 'center' }}>Hạng</th>
                      <th>Nhân Vật</th>
                      <th>Tài Khoản</th>
                      <th>Bang Hội</th>
                      <th>Hành Tinh</th>
                      <th style={{ textAlign: 'right' }}>Chỉ Số / Điểm</th>
                      <th>Dự Kiến Thưởng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r) => {
                      const isTop1 = r.rank === 1;
                      const isTop2 = r.rank === 2;
                      const isTop3 = r.rank === 3;

                      // Tìm reward tier tương ứng
                      const matchedTier = currentRaceConfig?.tiers?.find(
                        (t) => r.rank >= t.rank_min && r.rank <= t.rank_max
                      );

                      return (
                        <tr
                          key={r.id}
                          style={{
                            background: isTop1
                              ? 'rgba(234, 179, 8, 0.12)'
                              : isTop2
                              ? 'rgba(148, 163, 184, 0.08)'
                              : isTop3
                              ? 'rgba(249, 115, 22, 0.08)'
                              : undefined,
                          }}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`badge ${isTop1 ? 'ok' : isTop2 || isTop3 ? 'warn' : ''}`}
                              style={{
                                fontWeight: 700,
                                minWidth: '32px',
                                display: 'inline-block',
                              }}
                            >
                              {isTop1 ? '🥇 1' : isTop2 ? '🥈 2' : isTop3 ? '🥉 3' : `#${r.rank}`}
                            </span>
                          </td>
                          <td>
                            <strong>{r.name}</strong>
                            {r.vip > 0 && <span className="badge sm ok" style={{ marginLeft: '6px' }}>VIP {r.vip}</span>}
                          </td>
                          <td className="muted">{r.username || '—'}</td>
                          <td>{r.clan_name ? <span className="badge sm secondary">{r.clan_name}</span> : <span className="muted">—</span>}</td>
                          <td>{r.gender === 0 ? 'Trái Đất' : r.gender === 1 ? 'Namếc' : 'Xayda'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#60a5fa' }}>
                            {r.score_display}
                          </td>
                          <td style={{ fontSize: '0.8rem', maxWidth: '300px' }} className="muted">
                            {matchedTier ? matchedTier.rank : 'Top ngoài mốc'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: 10 QUY TẮC & GIỚI HẠN SERVER */}
      {activeTab === 'restrictions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div className="section-title" style={{ margin: 0 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>10 Quy Tắc & Giới Hạn Máy Chủ Mới (Anti-P2W & Phase Progression)</h3>
                  <p className="card-hint" style={{ margin: '4px 0 0' }}>
                    Hệ thống kiểm soát cơ chế game giúp cân bằng trải nghiệm đua top, chống lạm phát và tạo sân chơi công bằng cho toàn bộ cư dân.
                  </p>
                </div>
              </div>

              {/* Master Restrictions Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.04)', padding: '8px 16px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: data?.restrictions_enabled ? '#4ade80' : '#f87171' }}>
                  {data?.restrictions_enabled ? '🛡️ Toàn Bộ Giới Hạn: ĐANG BẬT' : '🔓 Toàn Bộ Giới Hạn: ĐÃ TẮT'}
                </span>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={Boolean(data?.restrictions_enabled)}
                    onChange={(e) => toggleFeature('restrictions', e.target.checked)}
                  />
                  <span>{data?.restrictions_enabled ? 'Bật' : 'Tắt'}</span>
                </label>
              </div>
            </div>

            {/* Quick Bulk Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => bulkToggleRestrictions(false)}
                title="Tắt toàn bộ 10 quy tắc giới hạn (cho phép đục lỗ, quay thưởng, bán thỏi vàng...)"
              >
                🚫 Tắt Tất Cả 10 Giới Hạn
              </button>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => bulkToggleRestrictions(true)}
                title="Bật toàn bộ 10 quy tắc giới hạn theo chuẩn khai mở"
              >
                ✅ Bật Tất Cả 10 Giới Hạn
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '16px',
            }}
          >
            {Object.entries(data?.restrictions_config || {}).map(([key, item]) => {
              const icon = RESTRICTION_ICONS[key] || '⚙️';
              const isEnabled = item.enabled;
              const isBusy = togglingKey === key;
              const isStartDate = key === 'black_ball_war_schedule';
              const targetDateStr = isStartDate ? item.start_date : item.until;
              const cd = formatCountdown(targetDateStr);

              const isDateExpired = isStartDate ? !cd.expired : cd.expired;
              const rawDateVal = targetDateStr ? String(targetDateStr).replace(' ', 'T').slice(0, 16) : '';

              return (
                <div
                  key={key}
                  className="card"
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: isEnabled ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isEnabled ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.02rem', color: isEnabled ? '#93c5fd' : 'var(--text)' }}>
                          {item.title}
                        </h4>
                        <span className="muted" style={{ fontSize: '0.75rem' }}>Mã: {key}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      className={`btn sm ${isEnabled ? 'ok' : 'ghost'}`}
                      onClick={() => toggleRestriction(key)}
                      style={{ fontWeight: 600, minWidth: '96px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      {isBusy ? (
                        <span className="ui-spinner" style={{ width: '12px', height: '12px' }} />
                      ) : isEnabled ? (
                        '✓ Đang Bật'
                      ) : (
                        '✕ Đã Tắt'
                      )}
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                    {item.desc}
                  </p>

                  {/* Date Editor & Expiration status */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                        {isStartDate ? '📅 Mở từ ngày:' : '⏳ Áp dụng đến hết:'}
                      </span>
                      <span
                        className={`badge sm ${
                          !isEnabled ? 'ghost' : isDateExpired ? 'bad' : isStartDate ? 'warn' : 'ok'
                        }`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {!isEnabled
                          ? 'Đã tắt'
                          : isStartDate
                          ? (cd.expired ? '🔓 Đã mở giải' : `🔒 Mở sau: ${cd.text}`)
                          : (cd.expired ? '⏰ Đã hết hạn' : `🛡️ Còn: ${cd.text}`)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="datetime-local"
                        className="input sm"
                        style={{ fontSize: '0.82rem', padding: '4px 8px', width: '100%' }}
                        value={rawDateVal}
                        onChange={(e) => {
                          const val = e.target.value ? e.target.value.replace('T', ' ') + ':00' : '';
                          updateRestrictionDate(key, isStartDate ? 'start_date' : 'until', val);
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: THÔNG BÁO & PHÁT SÓNG GAME */}
      {activeTab === 'announcement' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {/* Card Soạn Bài Đăng Fanpage / Discord */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="section-title" style={{ margin: 0 }}>
              <div>
                <h3>Bài Viết Thông Báo Chuẩn Mẫu</h3>
                <p className="card-hint">Nội dung đã được biên soạn theo đúng mẫu thông báo chính thức để đăng bài.</p>
              </div>
            </div>

            <textarea
              className="input"
              rows={16}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: '1.5' }}
              value={`KHAI MỞ VŨ TRỤ 15
Chào các cư dân,
Admin sẽ "KHAI MỞ VŨ TRỤ 15" vào lúc 10h00 ngày 28/08/2026.
Nội dung đặc biệt chỉ dành cho máy chủ VŨ TRỤ 15:
1. Tặng Ván Bay MT vĩnh viễn tại NPC Chi Chi (đến hết ngày 31/10/2026)
2. Khuyến mãi nạp đầu nhận:
+ Cờ Thùng Rác Vĩnh Viễn
+ Cải trang Pan Vip 30 ngày
+ Pet Xên Hoàn Hảo 25,000 sức đánh(30 ngày)
3. Đua Top nhận set kích hoạt. (Thời gian diễn ra từ lúc mở máy chủ và chốt Top sẽ kết thúc lúc 23h00 ngày 07/09)
1. TOP NHIỆM VỤ
- TOP 1: 5 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 vĩnh viễn, 5.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 100, Giáp Luyện Tập Cấp 5
- TOP 2: 4 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 vĩnh viễn, 4.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 70
- TOP 3: 3 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 vĩnh viễn, 3.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 50
- TOP 4–5: 2 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 vĩnh viễn, 2.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 30
- TOP 6–10: 1 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 180 ngày, 1.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 20
- TOP 11–50: Cải Trang CT Broly SSJ4 90 ngày, 500 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 10
- TOP 51–100: Cải Trang CT Broly SSJ4 30 ngày, 200 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 5
2. TOP SỨC MẠNH
- TOP 1: 5 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 5.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 100, Giáp Luyện Tập Cấp 5
- TOP 2: 4 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 4.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 70
- TOP 3: 3 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 3.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 50
- TOP 4–5: 2 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 2.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 30
- TOP 6–10: 1 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 1.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 20
- TOP 11–50: Cánh Sấm Sét Hoàng Kim 90 ngày, 500 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 10
- TOP 51–100: Cánh Sấm Sét Hoàng Kim 30 ngày, 200 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 5
3. TOP ĐIỂM TÍCH LŨY
Nạp 1 ngọc = 1 điểm.
20 điểm mới vào top.
- TOP 1: Hộp quà Set kích hoạt 5 sao, Trứng Xên Vàng, 5.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 100, Giáp Luyện Tập Cấp 5, Bông Tai Cấp 3
- TOP 2: 4 Capsule 1 món kích hoạt, Pet MewTwo vĩnh viễn, 4.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 70, Giáp Luyện Tập Cấp 5, Bông Tai Cấp 3
- TOP 3: 3 Capsule 1 món kích hoạt, Pet MewTwo vĩnh viễn, 3.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 50, Giáp Luyện Tập Cấp 5, Bông Tai Cấp 3
- TOP 4–5: 2 Capsule 1 món kích hoạt, Pet MewTwo vĩnh viễn, 2.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 30
- TOP 6–10: 1 Capsule 1 món kích hoạt, Pet MewTwo vĩnh viễn, 1.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 20
- TOP 11–50: Pet MewTwo 180 ngày, 500 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 10
- TOP 51–100: Pet MewTwo 90 ngày, 200 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 5
Hãy chuẩn bị tinh thần để sẵn sàng chiến đấu 
 Capsule 1 món kích hoạt tự chọn: tự lựa chọn Áo/Quần/Găng/Giày/Rada ra món ngẫu nhiên set kích hoạt (có thể ra đồ cấp cao)
 Trứng Xên Vàng: Được Chọn 1 trong 3 pet xên có chỉ số max: Xên Con 35.000 Ki, Xên Hoàn Hảo 25.000 Sức Đánh, Xên Max 150.000 HP
 Lưu ý:
Trong quá trình Đua Top diễn ra ở VŨ TRỤ 15:
- Không sử dụng các chức năng đục lỗ và ép sao pha lê đến 31/10/2026
- Không bán thỏi vàng tại Santa
- Không bán Phiếu sao vàng may mắn đến 31/10/2026
- Giao dịch vàng đến 31/10/2026
- Giải Ngọc Rồng Sao Đen mở từ ngày 07/09/2026
- Không áp dụng sức mạnh trên 40 tỷ mới được vào Ngọc Rồng Sao Đen đến 31/10/2026
- Các cư dân sẽ không gọi được Rồng Thiêng để ban sức mạnh.
- Bùa x3, x4 TNSM sẽ không được áp dụng.
- Vòng quay thường tại NPC Thượng Đế sẽ không mở
- Không rơi đồ sao pha lê.
- Quyết định của BQT là quyết định cuối cùng.
Chúc các Cư dân sẽ có trải nghiệm thú vị và kết được thêm nhiều đồng đội mới`}
            />

            <button
              type="button"
              className="btn"
              onClick={() => {
                navigator.clipboard.writeText(`KHAI MỞ VŨ TRỤ 15...`);
                fb.success('Đã sao chép nội dung bài viết thông báo vào Clipboard!');
              }}
            >
              📋 Sao Chép Nội Dung Bài Viết
            </button>
          </div>

          {/* Card Phát Loa Thông Báo In-Game */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="section-title" style={{ margin: 0 }}>
              <div>
                <h3>Phát Thông Báo Vào Game Server</h3>
                <p className="card-hint">Gửi tin nhắn thông báo sự kiện / loa thế giới trực tiếp tới tất cả người chơi online.</p>
              </div>
            </div>

            <label className="field">
              Nội Dung Tin Nhắn Broadcast:
              <textarea
                className="input"
                rows={5}
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Nhập thông báo gửi đến toàn server (để trống sẽ sử dụng thông báo mặc định)..."
              />
            </label>

            <button
              type="button"
              className="btn primary"
              disabled={broadcasting}
              onClick={handleBroadcast}
              style={{ marginTop: 'auto' }}
            >
              {broadcasting ? '⏳ Đang gửi...' : '📢 Phát Sóng Tin Nhắn Vào Game'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL LỊCH SỬ TRAO GIẢI (SNAPSHOTS) */}
      {historyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setHistoryModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> Lịch Sử Các Lần Chốt & Trao Giải Đua TOP
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 10px' }}
                onClick={() => setHistoryModalOpen(false)}
              >
                ✕ Đóng
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <span className="ui-spinner" />
                <p className="muted" style={{ marginTop: '8px' }}>Đang tải lịch sử trao giải...</p>
              </div>
            ) : historyData.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }} className="muted">
                Chưa có lịch sử trao giải nào được lưu.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyData.map((h) => {
                  const catName =
                    h.race_category === 'mission'
                      ? 'TOP Nhiệm Vụ'
                      : h.race_category === 'power'
                      ? 'TOP Sức Mạnh'
                      : 'TOP Điểm Tích Lũy';

                  return (
                    <div
                      key={h.id}
                      className="card-inner"
                      style={{
                        padding: '14px 18px',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <strong style={{ color: '#60a5fa', fontSize: '1rem' }}>
                            {catName}
                          </strong>
                          <span className="muted" style={{ fontSize: '0.8rem', marginLeft: '10px' }}>
                            Đã phát lúc: {new Date(h.distributed_at).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <span className="badge ok">
                          Đã trao thưởng ({h.total_players} người chơi)
                        </span>
                      </div>

                      {/* Chi tiết người nhận */}
                      <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.85rem' }}>
                        <table className="table" style={{ width: '100%', margin: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ width: '60px' }}>Hạng</th>
                              <th>Nhân Vật</th>
                              <th>Vật Phẩm Nhận</th>
                              <th>Hồng Ngọc</th>
                              <th>Trạng Thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {h.snapshot_data?.map((p, idx) => (
                              <tr key={idx}>
                                <td><strong>#{p.rank}</strong></td>
                                <td>{p.name} (ID: {p.playerId})</td>
                                <td>{p.itemsCount} món đồ</td>
                                <td style={{ color: '#f43f5e' }}>+{p.ruby} Ruby</td>
                                <td>
                                  <span className={`badge ${p.status === 'success' ? 'ok' : 'err'}`}>
                                    {p.status === 'success' ? 'Thành công' : 'Lỗi'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
