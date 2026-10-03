import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const TABS = [
  {
    id: 'transactions',
    label: '🤝 Giao Dịch Player (Trade P2P)',
    desc: 'Lịch sử giao dịch trực tiếp giữa 2 người chơi trong game.',
    help: 'Dữ liệu từ bảng history_transaction. Tự động ghi lại các cuộc trao đổi vàng, ngọc và vật phẩm.',
  },
  {
    id: 'napthe',
    label: '💳 Nạp Thẻ Cào',
    desc: 'Lịch sử nạp thẻ cào viễn thông (Viettel, Vina, Mobi, Zing...).',
    help: 'Bảng napthe — Trạng thái Thành Công (status=1) ghi nhận số tiền đã nạp vào tài khoản.',
  },
  {
    id: 'payments',
    label: '🌐 Cổng Thanh Toán (Gateway)',
    desc: 'Giao dịch qua cổng thanh toán API tích hợp tự động.',
    help: 'Bảng payments — is_credited = 1 tức là đã cộng tiền vào ví game của người chơi.',
  },
  {
    id: 'bank',
    label: '🏦 Chuyển Khoản Ngân Hàng',
    desc: 'Lịch sử chuyển khoản ngân hàng / ví điện tử Momo, ZaloPay.',
    help: 'Bảng bank_transfers — Tra cứu mã giao dịch, số tiền và tài khoản nhận.',
  },
  {
    id: 'consign',
    label: '🏪 Chợ Ký Gửi (Toàn Server)',
    desc: 'Quản lý toàn bộ vật phẩm đang treo bán trên Siêu Thị Ký Gửi.',
    help: 'Dữ liệu từ bảng shop_ky_gui. Cho phép Admin tra cứu giá bán, người ký gửi và thu hồi/xóa an toàn.',
  },
];

const LIMIT_OPTIONS = [25, 50, 100, 200];

const NAPTHE_STATUS = {
  0: { label: 'Chờ xử lý', cls: 'warn' },
  1: { label: 'Thành công', cls: 'ok' },
  2: { label: 'Thất bại', cls: 'bad' },
  3: { label: 'Sai mệnh giá', cls: 'bad' },
};

function formatNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN') : '—';
}

function formatTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('vi-VN');
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

export default function EconomyPage() {
  const [tab, setTab] = useState('transactions');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creditedFilter, setCreditedFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const fb = useFeedback();

  async function deleteConsignItem(id) {
    if (!window.confirm(`Xóa món đồ ký gửi #${id} khỏi chợ toàn server?`)) return;
    try {
      await api(`/economy/consign/${id}`, { method: 'DELETE' });
      fb.success(`Đã xóa đồ ký gửi #${id} thành công!`);
      load();
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function loadSummary() {
    try {
      const res = await api('/economy/summary');
      setSummary(res.data);
    } catch {
      // Bỏ qua lỗi summary
    }
  }

  async function load() {
    setLoading(true);
    setExpandedId(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (search) params.set('q', search);
      if (statusFilter !== '') params.set('status', statusFilter);
      if (creditedFilter !== '') params.set('credited', creditedFilter);

      const res = await api(`/economy/${tab}?${params.toString()}`);
      setRows(res.data || []);
    } catch (err) {
      fb.error(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    load();
  }, [tab, limit, search, statusFilter, creditedFilter]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  const currentTabInfo = useMemo(() => TABS.find((t) => t.id === tab), [tab]);

  // Handle Export CSV
  function handleExportCsv() {
    if (!rows.length) {
      fb.error('Không có dữ liệu để xuất CSV.');
      return;
    }
    let headers = [];
    let mappedRows = [];
    if (tab === 'transactions') {
      headers = ['ID', 'Player 1', 'Player 2', 'Nội dung', 'Thời gian'];
      mappedRows = rows.map((r) => [r.id, r.player_1, r.player_2, r.detail, r.time]);
    } else if (tab === 'napthe') {
      headers = ['ID', 'Tài khoản', 'Nhà mạng', 'Mã thẻ', 'Seri', 'Mệnh giá', 'Trạng thái', 'Thời gian'];
      mappedRows = rows.map((r) => [r.id, r.user_nap, r.nha_mang, r.ma_the, r.seri, r.amount, r.status, r.time]);
    } else if (tab === 'bank') {
      headers = ['ID', 'Username', 'Mã GD', 'Số tiền', 'Đã cộng ví', 'Thời gian'];
      mappedRows = rows.map((r) => [r.id, r.username, r.transaction_id, r.amount, r.is_credited, r.created_at]);
    } else if (tab === 'payments') {
      headers = ['ID', 'Tên', 'Mã GD', 'Số tiền', 'Thực nhận', 'Đã cộng', 'Thời gian'];
      mappedRows = rows.map((r) => [r.id, r.name, r.order_id, r.amount, r.final_credited_amount, r.is_credited, r.created_at]);
    } else if (tab === 'consign') {
      headers = ['ID', 'Player ID', 'Tab', 'Item ID', 'Giá vàng', 'Giá ngọc', 'Số lượng'];
      mappedRows = rows.map((r) => [r.id, r.player_id, r.tab, r.item_id, r.gold_sell, r.gem_sell, r.quantity]);
    }
    downloadCsv(`economy_${tab}_${Date.now()}.csv`, headers, mappedRows);
    fb.success(`Đã xuất ${rows.length} dòng dữ liệu ra file CSV!`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Kinh Tế & Giao Dịch (Economy Studio)"
        description="Theo dõi toàn cảnh dòng tiền server: nạp thẻ cào, chuyển khoản ngân hàng, gateway, giao dịch P2P và chợ ký gửi."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn secondary" onClick={handleExportCsv} title="Xuất toàn bộ bảng ra file CSV">
              📥 Xuất CSV
            </button>
            <button type="button" className="btn primary" onClick={() => { loadSummary(); load(); }}>
              🔄 Tải Lại Dữ Liệu
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* 4 THẺ THỐNG KÊ TỔNG QUAN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>💳 Nạp Thẻ Cào (Napthe)</span>
            <span style={{ fontSize: '1.4rem' }}>💳</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa', marginTop: '6px' }}>
            {formatNum(summary?.napthe?.success_amount || 0)} đ
          </div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            {summary?.napthe?.success_count || 0} / {summary?.napthe?.total || 0} thẻ nạp thành công
          </div>
        </div>

        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>🏦 Chuyển Khoản Ngân Hàng</span>
            <span style={{ fontSize: '1.4rem' }}>🏦</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>
            {formatNum(summary?.bank?.credited_amount || 0)} đ
          </div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            {summary?.bank?.credited_count || 0} / {summary?.bank?.total || 0} giao dịch xác nhận
          </div>
        </div>

        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>🌐 Gateway Thanh Toán</span>
            <span style={{ fontSize: '1.4rem' }}>🌐</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#facc15', marginTop: '6px' }}>
            {formatNum(summary?.payments?.credited_amount || 0)} đ
          </div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            {summary?.payments?.credited_count || 0} / {summary?.payments?.total || 0} GD đã cộng ví
          </div>
        </div>

        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '14px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>🤝 Giao Dịch P2P Trong Game</span>
            <span style={{ fontSize: '1.4rem' }}>🤝</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#c084fc', marginTop: '6px' }}>
            {formatNum(summary?.transactions?.total || 0)}
          </div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Lượt trao đổi hoàn tất giữa player</div>
        </div>
      </div>

      {/* THANH CHỌN TAB HIỆN ĐẠI */}
      <div className="card" style={{ padding: '14px 18px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn sm ${tab === t.id ? 'primary' : 'ghost'}`}
              style={{
                fontWeight: tab === t.id ? 700 : 500,
                borderRadius: '8px',
                padding: '8px 16px',
              }}
              onClick={() => {
                setTab(t.id);
                setSearch('');
                setSearchInput('');
                setStatusFilter('');
                setCreditedFilter('');
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {currentTabInfo && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong style={{ color: '#93c5fd', fontSize: '0.95rem' }}>{currentTabInfo.desc}</strong>
              <div className="muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{currentTabInfo.help}</div>
            </div>

            {/* BỘ LỌC TÌM KIẾM */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                className="input sm"
                style={{ width: '220px' }}
                placeholder="🔍 Tìm username, mã GD..."
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

              {/* Lọc theo status nếu là napthe */}
              {tab === 'napthe' && (
                <select className="input sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="1">🟢 Thành công</option>
                  <option value="0">🟡 Chờ xử lý</option>
                  <option value="2">🔴 Thất bại</option>
                </select>
              )}

              {/* Lọc theo credited nếu là payments/bank */}
              {(tab === 'payments' || tab === 'bank') && (
                <select className="input sm" value={creditedFilter} onChange={(e) => setCreditedFilter(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="1">🟢 Đã cộng ví</option>
                  <option value="0">🟡 Chưa cộng</option>
                </select>
              )}

              <select className="input sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {LIMIT_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l} dòng</option>
                ))}
              </select>
            </form>
          </div>
        )}
      </div>

      {/* BẢNG DỮ LIỆU CHÍNH */}
      <div className="table-wrap card" style={{ padding: 0, borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            ⏳ Đang tải dữ liệu lịch sử từ Database MySQL...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            Không có dữ liệu giao dịch nào khớp với điều kiện tìm kiếm.
          </div>
        ) : (
          <table className="compact" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid var(--border)' }}>
                {tab === 'transactions' && (
                  <>
                    <th style={{ width: '80px' }}>ID</th>
                    <th>Người Giao Dịch 1</th>
                    <th>Người Giao Dịch 2</th>
                    <th>Chi Tiết Vật Phẩm / Tiền</th>
                    <th style={{ width: '160px' }}>Thời Gian</th>
                  </>
                )}
                {tab === 'napthe' && (
                  <>
                    <th style={{ width: '80px' }}>ID</th>
                    <th>Tài Khoản</th>
                    <th>Nhà Mạng</th>
                    <th>Mã Thẻ / Seri</th>
                    <th>Mệnh Giá</th>
                    <th>Trạng Thái</th>
                    <th style={{ width: '160px' }}>Thời Gian</th>
                  </>
                )}
                {tab === 'bank' && (
                  <>
                    <th style={{ width: '80px' }}>ID</th>
                    <th>Tài Khoản</th>
                    <th>Mã Giao Dịch</th>
                    <th>Số Tiền</th>
                    <th>Cộng Ví</th>
                    <th style={{ width: '160px' }}>Thời Gian</th>
                  </>
                )}
                {tab === 'payments' && (
                  <>
                    <th style={{ width: '80px' }}>ID</th>
                    <th>Tài Khoản</th>
                    <th>Mã Giao Dịch</th>
                    <th>Số Tiền Gốc</th>
                    <th>Thực Nhận</th>
                    <th>Trạng Thái</th>
                    <th style={{ width: '160px' }}>Thời Gian</th>
                  </>
                )}
                {tab === 'consign' && (
                  <>
                    <th style={{ width: '80px' }}>ID</th>
                    <th>Người Bán (Player ID)</th>
                    <th>Tab Chợ</th>
                    <th>ID Vật Phẩm</th>
                    <th>Giá Vàng</th>
                    <th>Giá Ngọc</th>
                    <th>Số Lượng</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Thao Tác</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: idx % 2 === 1 ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                  }}
                >
                  {tab === 'transactions' && (
                    <>
                      <td>#{row.id}</td>
                      <td>
                        <strong>{row.player_1}</strong>
                        {row.id_player_1 && <div className="muted" style={{ fontSize: '0.75rem' }}>ID: {row.id_player_1}</div>}
                      </td>
                      <td>
                        <strong>{row.player_2}</strong>
                        {row.id_player_2 && <div className="muted" style={{ fontSize: '0.75rem' }}>ID: {row.id_player_2}</div>}
                      </td>
                      <td>
                        <div
                          style={{
                            maxWidth: '480px',
                            whiteSpace: expandedId === row.id ? 'pre-wrap' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                          title="Bấm để xem đầy đủ / thu gọn"
                        >
                          {row.detail || '—'}
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: '0.82rem' }}>{formatTime(row.time)}</td>
                    </>
                  )}

                  {tab === 'napthe' && (
                    <>
                      <td>#{row.id}</td>
                      <td>
                        <strong>{row.user_nap || '—'}</strong>
                      </td>
                      <td><span className="badge sm secondary">{row.nha_mang}</span></td>
                      <td>
                        <div><code>{row.ma_the}</code></div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>Seri: {row.seri}</div>
                      </td>
                      <td><strong style={{ color: '#facc15' }}>{formatNum(row.amount)} đ</strong></td>
                      <td>
                        <span className={`badge sm ${NAPTHE_STATUS[row.status]?.cls || ''}`}>
                          {NAPTHE_STATUS[row.status]?.label || `Code ${row.status}`}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: '0.82rem' }}>{formatTime(row.time)}</td>
                    </>
                  )}

                  {tab === 'bank' && (
                    <>
                      <td>#{row.id}</td>
                      <td><strong>{row.username || '—'}</strong></td>
                      <td><code>{row.transaction_id || '—'}</code></td>
                      <td><strong style={{ color: '#34d399' }}>{formatNum(row.amount)} đ</strong></td>
                      <td>
                        <span className={`badge sm ${row.is_credited ? 'ok' : 'warn'}`}>
                          {row.is_credited ? 'Đã cộng' : 'Chưa'}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: '0.82rem' }}>{formatTime(row.created_at)}</td>
                    </>
                  )}

                  {tab === 'payments' && (
                    <>
                      <td>#{row.id}</td>
                      <td><strong>{row.name || '—'}</strong></td>
                      <td><code>{row.order_id || '—'}</code></td>
                      <td><strong style={{ color: '#93c5fd' }}>{formatNum(row.amount)} đ</strong></td>
                      <td><strong style={{ color: '#34d399' }}>{formatNum(row.final_credited_amount || row.amount)} đ</strong></td>
                      <td>
                        <span className={`badge sm ${row.is_credited ? 'ok' : 'warn'}`}>
                          {row.is_credited ? 'Thành công' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: '0.82rem' }}>{formatTime(row.created_at)}</td>
                    </>
                  )}

                  {tab === 'consign' && (
                    <>
                      <td>#{row.id}</td>
                      <td>
                        <Link to={`/players-db?open=${row.player_id}`} style={{ fontWeight: 600, color: '#60a5fa' }}>
                          Player #{row.player_id}
                        </Link>
                      </td>
                      <td><span className="badge sm">Tab {row.tab}</span></td>
                      <td><strong>Item #{row.item_id}</strong></td>
                      <td><span style={{ color: '#facc15', fontWeight: 600 }}>{formatNum(row.gold_sell)} vàng</span></td>
                      <td><span style={{ color: '#34d399', fontWeight: 600 }}>{formatNum(row.gem_sell)} ngọc</span></td>
                      <td>{formatNum(row.quantity || 1)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn sm danger"
                          onClick={() => deleteConsignItem(row.id)}
                          title="Hủy/Thu hồi vật phẩm ký gửi khỏi chợ"
                        >
                          Thu hồi
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
