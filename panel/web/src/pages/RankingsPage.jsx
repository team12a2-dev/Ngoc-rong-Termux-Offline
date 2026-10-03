import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const TABS = [
  {
    id: 'power',
    label: '⚡ Top Sức Mạnh',
    desc: 'Bảng xếp hạng lực chiến & sức mạnh nhân vật (Power Point).',
  },
  {
    id: 'nap',
    label: '💎 Top Nạp Tiền (Whales)',
    desc: 'Xếp hạng các đại gia nạp tiền (Tổng nạp & số dư VND tài khoản).',
  },
  {
    id: 'event',
    label: '🎯 Top Đua Sự Kiện',
    desc: 'Xếp hạng điểm số các sự kiện đang diễn ra trong game.',
  },
  {
    id: 'clan',
    label: '🛡️ Top Bang Hội',
    desc: 'Xếp hạng các bang hội hùng mạnh nhất theo lực chiến & điểm số.',
  },
  {
    id: 'super-rank',
    label: '🏆 Đấu Trường Siêu Hạng',
    desc: 'Bảng xếp hạng Super Rank võ đài PVP cao cấp.',
  },
];

const LIMIT_OPTIONS = [10, 25, 50, 100];

const DEFAULT_EVENT_METRICS = {
  event_point: { label: 'Điểm event chính' },
  point_sukien: { label: 'Điểm sự kiện' },
  point_sukien1: { label: 'Điểm sự kiện 1' },
  point_sukien2: { label: 'Điểm sự kiện 2' },
  point_maydam: { label: 'Điểm máy đầm' },
  lucky_round_point: { label: 'Lucky round' },
};

const CLAN_SORT_OPTIONS = {
  power_point: { label: 'Tổng sức mạnh bang' },
  clan_point: { label: 'Điểm bang' },
  LEVEL: { label: 'Cấp bang' },
};

const GENDER_LABEL = { 0: 'Trái Đất', 1: 'Namek', 2: 'Xayda' };
const GENDER_BADGE_STYLE = {
  0: { background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' },
  1: { background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' },
  2: { background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' },
};

function formatNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN') : '—';
}

function downloadCsv(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RankingsPage() {
  const [tab, setTab] = useState('power');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [eventMetric, setEventMetric] = useState('event_point');
  const [clanSort, setClanSort] = useState('power_point');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [eventMetrics, setEventMetrics] = useState(DEFAULT_EVENT_METRICS);
  const fb = useFeedback();

  // Modal Trao Thưởng Đua Top
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    targetRank: 'top1',
    rewardType: 'gold', // 'gold' | 'gem' | 'ruby'
    rewardAmount: 10000000,
    note: 'Thưởng Đua Top',
  });
  const [rewardSending, setRewardSending] = useState(false);

  useEffect(() => {
    api('/rankings/meta')
      .then((res) => {
        if (res.data?.eventMetrics) setEventMetrics(res.data.eventMetrics);
      })
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (search) params.set('q', search);
      if (tab === 'event') params.set('metric', eventMetric);
      if (tab === 'clan') params.set('sort', clanSort);

      const res = await api(`/rankings/${tab}?${params.toString()}`);
      setRows(res.data || []);
    } catch (err) {
      fb.error(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tab, limit, search, eventMetric, clanSort]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, tab, limit, search, eventMetric, clanSort]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  // Filter rows by gender locally if set
  const filteredRows = useMemo(() => {
    if (genderFilter === '' || tab === 'clan') return rows;
    return rows.filter((r) => String(r.gender) === String(genderFilter));
  }, [rows, genderFilter, tab]);

  // Top 3 for Podium
  const top1 = filteredRows[0];
  const top2 = filteredRows[1];
  const top3 = filteredRows[2];

  // Xuất file CSV
  function handleExportCsv() {
    if (!filteredRows.length) {
      fb.error('Không có dữ liệu để xuất CSV.');
      return;
    }
    const headers = ['Hạng', 'Tên', 'Hành tinh', 'Điểm số / Lực chiến', 'ID'];
    const mapped = filteredRows.map((r, i) => [
      i + 1,
      r.name || r.NAME,
      GENDER_LABEL[r.gender] || '—',
      r.power || r.tongnap || r.point || r.power_point || '—',
      r.id || r.player_id,
    ]);
    downloadCsv(`rankings_${tab}_${Date.now()}.csv`, headers, mapped);
    fb.success(`Đã xuất ${filteredRows.length} dòng BXH ra CSV!`);
  }

  // Trao thưởng
  async function handleSendReward(e) {
    e.preventDefault();
    setRewardSending(true);
    try {
      let targetPlayer = null;
      if (rewardForm.targetRank === 'top1') targetPlayer = top1;
      else if (rewardForm.targetRank === 'top2') targetPlayer = top2;
      else if (rewardForm.targetRank === 'top3') targetPlayer = top3;

      if (!targetPlayer) {
        throw new Error('Chưa chọn nhân vật nhận thưởng hợp lệ!');
      }

      const playerId = targetPlayer.id || targetPlayer.player_id;
      // Cộng thưởng vào tài khoản / nhân vật
      await api(`/players/${playerId}/grant`, {
        method: 'POST',
        body: JSON.stringify({
          type: rewardForm.rewardType,
          amount: Number(rewardForm.rewardAmount),
          reason: rewardForm.note,
          serverId: getServerId(),
        }),
      });

      fb.success(`Đã trao thưởng ${formatNum(rewardForm.rewardAmount)} ${rewardForm.rewardType} cho ${targetPlayer.name || targetPlayer.NAME}!`);
      setRewardModalOpen(false);
    } catch (err) {
      fb.error(err.message || 'Lỗi khi phát thưởng!');
    } finally {
      setRewardSending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Bảng Xếp Hạng & Đua Top (Hall of Fame)"
        description="Vinh danh các cao thủ lực chiến, đại gia nạp tiền, bang hội và bảng đấu trường siêu hạng."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setRewardModalOpen(true)}
              style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', color: '#000', fontWeight: 700, border: 'none' }}
              title="Trao thưởng nhanh cho Quán quân hoặc TOP đua sự kiện"
            >
              🎁 Trao Thưởng Đua Top
            </button>
            <button type="button" className="btn secondary" onClick={handleExportCsv}>
              📥 Xuất CSV
            </button>
            <button type="button" className="btn primary" onClick={load}>
              🔄 Làm Mới
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* TOP PODIUM (TOP 1, 2, 3 RỰC RỠ) */}
      {filteredRows.length >= 3 && !search && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            alignItems: 'end',
            marginBottom: '4px',
          }}
        >
          {/* TOP 2 - BẠC */}
          <div
            className="card-inner"
            style={{
              background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(30, 41, 59, 0.7) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '2rem' }}>🥈</div>
            <span className="badge sm" style={{ background: '#94a3b8', color: '#0f172a', fontWeight: 800 }}>
              Á QUÂN (TOP 2)
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', color: '#e2e8f0' }}>
              {top2?.name || top2?.NAME || '—'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
              {GENDER_LABEL[top2?.gender] || 'Bang hội'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '10px' }}>
              {formatNum(top2?.power || top2?.tongnap || top2?.point || top2?.power_point || 0)}
            </div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>
              {tab === 'power' ? 'Điểm sức mạnh' : tab === 'nap' ? 'VNĐ đã nạp' : 'Điểm tích lũy'}
            </div>
          </div>

          {/* TOP 1 - VÀNG QUÁN QUÂN */}
          <div
            className="card-inner"
            style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(30, 41, 59, 0.85) 100%)',
              border: '2px solid #eab308',
              borderRadius: '18px',
              padding: '26px 20px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(234, 179, 8, 0.25)',
              transform: 'scale(1.03)',
            }}
          >
            <div style={{ fontSize: '2.6rem' }}>👑</div>
            <span className="badge" style={{ background: '#facc15', color: '#713f12', fontWeight: 900, fontSize: '0.85rem' }}>
              🥇 QUÁN QUÂN (TOP 1)
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '10px', color: '#fef08a' }}>
              {top1?.name || top1?.NAME || '—'}
            </div>
            <div style={{ color: '#fde047', fontSize: '0.85rem', marginTop: '2px' }}>
              {GENDER_LABEL[top1?.gender] || 'Bang hội'}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#facc15', marginTop: '10px' }}>
              {formatNum(top1?.power || top1?.tongnap || top1?.point || top1?.power_point || 0)}
            </div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              {tab === 'power' ? 'Lực chiến vô địch' : tab === 'nap' ? 'Đại gia Server (VNĐ)' : 'Điểm sự kiện cao nhất'}
            </div>
          </div>

          {/* TOP 3 - ĐỒNG */}
          <div
            className="card-inner"
            style={{
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(30, 41, 59, 0.7) 100%)',
              border: '1px solid rgba(217, 119, 6, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '2rem' }}>🥉</div>
            <span className="badge sm" style={{ background: '#d97706', color: '#fff', fontWeight: 800 }}>
              HẠNG 3 (TOP 3)
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', color: '#fed7aa' }}>
              {top3?.name || top3?.NAME || '—'}
            </div>
            <div style={{ color: '#fdba74', fontSize: '0.85rem', marginTop: '2px' }}>
              {GENDER_LABEL[top3?.gender] || 'Bang hội'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fb923c', marginTop: '10px' }}>
              {formatNum(top3?.power || top3?.tongnap || top3?.point || top3?.power_point || 0)}
            </div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>
              {tab === 'power' ? 'Điểm sức mạnh' : tab === 'nap' ? 'VNĐ đã nạp' : 'Điểm tích lũy'}
            </div>
          </div>
        </div>
      )}

      {/* THANH CHỌN TAB & BỘ LỌC */}
      <div className="card" style={{ padding: '14px 18px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn sm ${tab === t.id ? 'primary' : 'ghost'}`}
              style={{ fontWeight: tab === t.id ? 700 : 500, borderRadius: '8px', padding: '8px 16px' }}
              onClick={() => {
                setTab(t.id);
                setSearch('');
                setSearchInput('');
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          {/* Lọc theo Tộc nếu không phải tab clan */}
          {tab !== 'clan' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Hành tinh:</span>
              <button
                type="button"
                className={`btn sm ${genderFilter === '' ? 'primary' : 'ghost'}`}
                onClick={() => setGenderFilter('')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`btn sm ${genderFilter === '0' ? 'primary' : 'ghost'}`}
                onClick={() => setGenderFilter('0')}
              >
                Trái Đất
              </button>
              <button
                type="button"
                className={`btn sm ${genderFilter === '1' ? 'primary' : 'ghost'}`}
                onClick={() => setGenderFilter('1')}
              >
                Namek
              </button>
              <button
                type="button"
                className={`btn sm ${genderFilter === '2' ? 'primary' : 'ghost'}`}
                onClick={() => setGenderFilter('2')}
              >
                Xayda
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Sắp xếp theo:</span>
              <select className="input sm" value={clanSort} onChange={(e) => setClanSort(e.target.value)}>
                {Object.entries(CLAN_SORT_OPTIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nếu là tab event, chọn loại điểm */}
          {tab === 'event' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Sự kiện:</span>
              <select className="input sm" value={eventMetric} onChange={(e) => setEventMetric(e.target.value)}>
                {Object.entries(eventMetrics).map(([k, v]) => (
                  <option key={k} value={k}>{v.label || k}</option>
                ))}
              </select>
            </div>
          )}

          {/* Ô TÌM KIẾM */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              className="input sm"
              style={{ width: '220px' }}
              placeholder="🔍 Tìm theo tên nhân vật..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn sm">Tìm</button>
            {search && (
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                }}
              >
                ✕ Xóa lọc
              </button>
            )}
            <select className="input sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {LIMIT_OPTIONS.map((l) => (
                <option key={l} value={l}>{l} top</option>
              ))}
            </select>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              <span>Auto 15s</span>
            </label>
          </form>
        </div>
      </div>

      {/* BẢNG BXH */}
      <div className="table-wrap card" style={{ padding: 0, borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            ⏳ Đang tải bảng xếp hạng từ Database...
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            Không tìm thấy nhân vật nào phù hợp.
          </div>
        ) : (
          <table className="compact" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ width: '80px', textAlign: 'center' }}>Thứ Hạng</th>
                <th>Nhân Vật / Bang Hội</th>
                {tab !== 'clan' && <th style={{ width: '130px' }}>Hành Tinh</th>}
                <th>
                  {tab === 'power' && 'Sức Mạnh (Power)'}
                  {tab === 'nap' && 'Tổng Nạp (VNĐ)'}
                  {tab === 'event' && 'Điểm Sự Kiện'}
                  {tab === 'clan' && 'Lực Chiến / Điểm Bang'}
                  {tab === 'super-rank' && 'Thứ Hạng Siêu Hạng'}
                </th>
                {tab === 'nap' && <th style={{ width: '140px' }}>Số Dư VND</th>}
                <th style={{ width: '100px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => {
                const rank = idx + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;

                return (
                  <tr
                    key={r.id || idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      background: isTop1
                        ? 'rgba(234, 179, 8, 0.08)'
                        : isTop2
                        ? 'rgba(148, 163, 184, 0.06)'
                        : isTop3
                        ? 'rgba(217, 119, 6, 0.06)'
                        : idx % 2 === 1
                        ? 'rgba(255, 255, 255, 0.015)'
                        : 'transparent',
                    }}
                  >
                    {/* Rank Number */}
                    <td style={{ textAlign: 'center' }}>
                      {isTop1 && <span style={{ fontSize: '1.2rem' }}>🥇</span>}
                      {isTop2 && <span style={{ fontSize: '1.2rem' }}>🥈</span>}
                      {isTop3 && <span style={{ fontSize: '1.2rem' }}>🥉</span>}
                      {!isTop1 && !isTop2 && !isTop3 && (
                        <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '0.95rem' }}>
                          #{rank}
                        </span>
                      )}
                    </td>

                    {/* Name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{r.name || r.NAME}</strong>
                        {r.id && <span className="muted" style={{ fontSize: '0.75rem' }}>#{r.id}</span>}
                      </div>
                    </td>

                    {/* Gender */}
                    {tab !== 'clan' && (
                      <td>
                        <span className="badge sm" style={GENDER_BADGE_STYLE[r.gender] || {}}>
                          {GENDER_LABEL[r.gender] || '—'}
                        </span>
                      </td>
                    )}

                    {/* Primary Metric */}
                    <td>
                      <strong style={{ fontSize: '1rem', color: isTop1 ? '#facc15' : '#38bdf8' }}>
                        {formatNum(r.power || r.tongnap || r.point || r.power_point || r.rank || 0)}
                      </strong>
                    </td>

                    {/* VND balance if nap */}
                    {tab === 'nap' && (
                      <td>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>{formatNum(r.vnd || 0)} đ</span>
                      </td>
                    )}

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      {r.id ? (
                        <Link to={`/players-db?open=${r.id}`} className="btn sm ghost" title="Xem chi tiết người chơi">
                          Quản lý
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL TRAO THƯỞNG ĐUA TOP */}
      {rewardModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '480px', width: '90%' }}>
            <div className="modal-header">
              <h3>🎁 Trao Thưởng Đua Top Cho Quán Quân</h3>
              <button type="button" className="btn sm ghost" onClick={() => setRewardModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSendReward} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div>
                <label className="label">Chọn Nhân Vật Nhận Thưởng:</label>
                <select
                  className="input"
                  value={rewardForm.targetRank}
                  onChange={(e) => setRewardForm((p) => ({ ...p, targetRank: e.target.value }))}
                >
                  <option value="top1">🥇 TOP 1 (Quán quân): {top1?.name || top1?.NAME || 'Chưa có'}</option>
                  <option value="top2">🥈 TOP 2 (Á quân): {top2?.name || top2?.NAME || 'Chưa có'}</option>
                  <option value="top3">🥉 TOP 3 (Hạng ba): {top3?.name || top3?.NAME || 'Chưa có'}</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                <div>
                  <label className="label">Loại Thưởng:</label>
                  <select
                    className="input"
                    value={rewardForm.rewardType}
                    onChange={(e) => setRewardForm((p) => ({ ...p, rewardType: e.target.value }))}
                  >
                    <option value="gold">🟡 Vàng</option>
                    <option value="gem">🟢 Ngọc Xanh</option>
                    <option value="ruby">🔴 Hồng Ngọc</option>
                  </select>
                </div>
                <div>
                  <label className="label">Số Lượng:</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    value={rewardForm.rewardAmount}
                    onChange={(e) => setRewardForm((p) => ({ ...p, rewardAmount: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Ghi Chú Lý Do Thưởng:</label>
                <input
                  className="input"
                  value={rewardForm.note}
                  onChange={(e) => setRewardForm((p) => ({ ...p, note: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setRewardModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn primary" disabled={rewardSending}>
                  {rewardSending ? '⏳ Đang Phát Thưởng...' : 'Trao Quà Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
