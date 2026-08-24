import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const TABS = [
  {
    id: 'transactions',
    label: 'Giao dịch player',
    desc: 'Lịch sử trade P2P — ghi khi 2 người chơi hoàn tất giao dịch trong game.',
    help: 'Dữ liệu từ bảng history_transaction. Game tự xóa log cũ theo chu kỳ — nếu trống là chưa có trade hoặc đã bị dọn.',
  },
  {
    id: 'napthe',
    label: 'Nạp thẻ',
    desc: 'Lịch sử nạp thẻ cào qua API/card.',
    help: 'Bảng napthe — status 1 thường là thành công. Chỉnh VND tài khoản tại trang Accounts.',
  },
  {
    id: 'payments',
    label: 'Thanh toán',
    desc: 'Giao dịch payment gateway (thẻ/API tích hợp).',
    help: 'Bảng payments — cột is_credited = 1 nghĩa đã cộng tiền vào game.',
  },
  {
    id: 'bank',
    label: 'Chuyển khoản',
    desc: 'Lịch sử chuyển khoản ngân hàng.',
    help: 'Bảng bank_transfers — đối chiếu mã giao dịch với username nạp.',
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

function truncate(text, max = 80) {
  const s = String(text ?? '').trim();
  if (!s) return '—';
  return s.length > max ? `${s.slice(0, max)}…` : s;
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
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creditedFilter, setCreditedFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const fb = useFeedback();

  const tabInfo = TABS.find((t) => t.id === tab);

  useEffect(() => {
    api('/economy/summary')
      .then((res) => setSummary(res.data || null))
      .catch(() => {});
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fb.clear();

    const params = new URLSearchParams({ limit: String(limit) });
    if (search) params.set('q', search);
    if (tab === 'napthe' && statusFilter !== '') params.set('status', statusFilter);
    if ((tab === 'payments' || tab === 'bank') && creditedFilter !== '') params.set('credited', creditedFilter);

    api(`/economy/${tab}?${params}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data || []);
        setMeta(res.meta || null);
        if (res.meta?.unavailable) fb.show('Bảng bank_transfers chưa có trên database này.', 'info');
      })
      .catch((e) => {
        if (cancelled) return;
        setRows([]);
        setMeta(null);
        const msg = /404/.test(e.message)
          ? 'Panel API chưa có route mới. Chạy panel\\stop-panel.bat rồi panel\\start-panel.bat.'
          : e.message;
        fb.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tab, limit, search, statusFilter, creditedFilter]);

  function reload() {
    setSearch(searchInput.trim());
  }

  function applySearch(e) {
    e?.preventDefault();
    reload();
  }

  const csvData = useMemo(() => {
    if (tab === 'transactions') {
      return {
        headers: ['ID', 'Người gửi', 'Người nhận', 'Item gửi', 'Item nhận', 'Thời gian'],
        rows: rows.map((r) => [r.id, r.player_1, r.player_2, r.item_player_1, r.item_player_2, r.time_tran]),
      };
    }
    if (tab === 'napthe') {
      return {
        headers: ['ID', 'Username', 'Telco', 'Mệnh giá', 'Status', 'Thời gian'],
        rows: rows.map((r) => [r.id, r.user_nap, r.telco, r.amount, r.status, r.created_at]),
      };
    }
    if (tab === 'payments') {
      return {
        headers: ['ID', 'Tên/Mã', 'Ref', 'Khai báo', 'Cộng thực tế', 'Trạng thái', 'Đã cộng', 'Ngày'],
        rows: rows.map((r) => [r.id, r.name, r.refNo, r.declared_amount, r.final_credited_amount, r.status_text, r.is_credited, r.date]),
      };
    }
    return {
      headers: ['ID', 'Mã GD', 'Username', 'Số tiền', 'Trạng thái', 'Ngân hàng', 'Đã cộng', 'Thời gian'],
      rows: rows.map((r) => [r.id, r.transaction_id, r.username, r.amount, r.status, r.sender_bank_name, r.is_credited, r.created_at]),
    };
  }, [tab, rows]);

  function exportCsv() {
    if (!rows.length) {
      fb.show('Không có dữ liệu để xuất.', 'info');
      return;
    }
    downloadCsv(`economy-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, csvData.headers, csvData.rows);
    fb.success('Đã xuất CSV.');
  }

  const summaryLine = useMemo(() => {
    if (!summary) return null;
    if (tab === 'transactions' && summary.transactions) {
      return `Tổng ${Number(summary.transactions.total || 0).toLocaleString('vi-VN')} giao dịch trong DB`;
    }
    if (tab === 'napthe' && summary.napthe) {
      const s = summary.napthe;
      return `Tổng ${formatNum(s.total)} thẻ · ${formatNum(s.success_count)} thành công · ${formatNum(s.success_amount)} VND thẻ OK`;
    }
    if (tab === 'payments' && summary.payments) {
      const s = summary.payments;
      return `Tổng ${formatNum(s.total)} GD · ${formatNum(s.credited_count)} đã cộng · ${formatNum(s.credited_amount)} VND`;
    }
    if (tab === 'bank' && summary.bank) {
      const s = summary.bank;
      return `Tổng ${formatNum(s.total)} CK · ${formatNum(s.credited_count)} đã cộng · ${formatNum(s.credited_amount)} VND`;
    }
    return null;
  }, [tab, summary]);

  return (
    <div>
      <PageHeader
        title="Kinh tế & Giao dịch"
        description="Theo dõi trade, nạp thẻ, payment và chuyển khoản — đọc trực tiếp từ database game, không cần SQL thủ công."
        actions={
          <>
            <button type="button" className="btn" onClick={reload} disabled={loading}>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
            <button type="button" className="btn" onClick={exportCsv} disabled={!rows.length}>
              Xuất CSV
            </button>
          </>
        }
      />

      <div className="help-box">
        <h4>Cách vận hành</h4>
        <ul>
          <li>Mỗi tab đọc từ <strong>bảng DB khác nhau</strong> — chọn đúng loại giao dịch cần tra cứu.</li>
          <li>Dùng <strong>Tìm kiếm</strong> theo tên player hoặc username; lọc trạng thái trên tab Nạp thẻ / Thanh toán.</li>
          <li>Bảng trống có thể do chưa phát sinh giao dịch, hoặc game đã dọn log cũ (đặc biệt tab Giao dịch player).</li>
          <li>Chỉnh số dư tài khoản tại <Link to="/accounts">Accounts</Link> — trang này chỉ xem lịch sử.</li>
        </ul>
        {tabInfo?.help && <p className="muted" style={{ margin: '8px 0 0' }}>{tabInfo.help}</p>}
      </div>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {summaryLine && <p className="muted" style={{ marginBottom: 12 }}>{summaryLine}</p>}

      <div className="editor-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted">{tabInfo?.desc}</p>

      <form className="row filters" onSubmit={applySearch}>
        <label>
          Số dòng
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} dòng</option>
            ))}
          </select>
        </label>

        {tab === 'napthe' && (
          <label>
            Trạng thái
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả</option>
              {Object.entries(NAPTHE_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
        )}

        {(tab === 'payments' || tab === 'bank') && (
          <label>
            Đã cộng tiền
            <select value={creditedFilter} onChange={(e) => setCreditedFilter(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="1">Đã cộng</option>
              <option value="0">Chưa cộng</option>
            </select>
          </label>
        )}

        <input
          placeholder={
            tab === 'transactions' ? 'Tìm tên player...'
              : tab === 'bank' ? 'Username / mã GD...'
                : 'Username / mã ref...'
          }
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={loading}>Áp dụng</button>
        {search && (
          <button type="button" className="btn sm" onClick={() => { setSearch(''); setSearchInput(''); }}>
            Xóa lọc
          </button>
        )}
      </form>

      {meta && (
        <p className="muted" style={{ marginBottom: 12 }}>
          Hiển thị {meta.count ?? rows.length} bản ghi
          {search ? ` · lọc "${search}"` : ''}
          {' · '}
          Cập nhật {new Date(meta.updatedAt).toLocaleTimeString('vi-VN')}
        </p>
      )}

      {loading && rows.length === 0 ? (
        <p className="muted">Đang tải...</p>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          Không có dữ liệu {tabInfo?.label.toLowerCase()}{search ? ` cho "${search}"` : ''}.
          {tab === 'transactions' && (
            <p className="muted" style={{ marginTop: 8 }}>
              Giao dịch chỉ xuất hiện khi player trade thành công trong game. Thử tab Nạp thẻ / Thanh toán nếu cần tra nạp tiền.
            </p>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          {tab === 'transactions' && (
            <table>
              <thead>
                <tr><th>#</th><th>Người gửi</th><th>Người nhận</th><th>Item / vàng gửi</th><th>Thời gian</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.player_1}</td>
                    <td>{r.player_2}</td>
                    <td title={r.item_player_1}>{truncate(r.item_player_1, 60)}</td>
                    <td>{formatTime(r.time_tran)}</td>
                    <td>
                      <button type="button" className="btn sm" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                        {expandedId === r.id ? 'Thu gọn' : 'Chi tiết'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'napthe' && (
            <table>
              <thead>
                <tr><th>#</th><th>Username</th><th>Telco</th><th>Mệnh giá</th><th>Trạng thái</th><th>Thời gian</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const st = NAPTHE_STATUS[r.status] || { label: `Status ${r.status}`, cls: '' };
                  return (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.user_nap}</td>
                      <td>{r.telco || '—'}</td>
                      <td>{formatNum(r.amount)}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td>{formatTime(r.created_at)}</td>
                      <td><Link className="btn sm" to="/accounts" state={{ search: r.user_nap }}>Account</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'payments' && (
            <table>
              <thead>
                <tr><th>#</th><th>Tên/Mã</th><th>Ref</th><th>Khai báo</th><th>Cộng thực tế</th><th>Trạng thái</th><th>Đã cộng</th><th>Ngày</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.name}</td>
                    <td>{truncate(r.refNo, 20)}</td>
                    <td>{formatNum(r.declared_amount)}</td>
                    <td>{formatNum(r.final_credited_amount)}</td>
                    <td>{r.status_text || r.api_status_code || '—'}</td>
                    <td><span className={`badge ${r.is_credited ? 'ok' : 'warn'}`}>{r.is_credited ? 'Đã cộng' : 'Chưa'}</span></td>
                    <td>{formatTime(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'bank' && (
            <table>
              <thead>
                <tr><th>#</th><th>Mã GD</th><th>Username</th><th>Số tiền</th><th>Trạng thái</th><th>Ngân hàng</th><th>Đã cộng</th><th>Thời gian</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{truncate(r.transaction_id, 24)}</td>
                    <td>{r.username}</td>
                    <td>{formatNum(r.amount)}</td>
                    <td>{r.status || '—'}</td>
                    <td>{r.sender_bank_name || '—'}</td>
                    <td><span className={`badge ${r.is_credited ? 'ok' : 'warn'}`}>{r.is_credited ? 'Đã cộng' : 'Chưa'}</span></td>
                    <td>{formatTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {expandedId != null && tab === 'transactions' && (
        <div className="control-card section" style={{ marginTop: 16 }}>
          <h3>Chi tiết giao dịch #{expandedId}</h3>
          {(() => {
            const r = rows.find((x) => x.id === expandedId);
            if (!r) return null;
            return (
              <>
                <p><strong>Gửi:</strong> {r.player_1}</p>
                <p><strong>Nhận:</strong> {r.player_2}</p>
                <p><strong>Item player 1:</strong></p>
                <pre>{r.item_player_1 || '—'}</pre>
                <p><strong>Item player 2:</strong></p>
                <pre>{r.item_player_2 || '—'}</pre>
                <p className="muted">Thời gian: {formatTime(r.time_tran)}</p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
