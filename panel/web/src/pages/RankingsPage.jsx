import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const TABS = [
  {
    id: 'power',
    label: 'Sức mạnh',
    desc: 'Top power — lấy từ cột data_point[1] trong bảng player.',
    help: 'Power = chỉ số sức mạnh thực tế trong game. Bấm Quản lý để chỉnh inventory, điểm, v.v.',
  },
  {
    id: 'nap',
    label: 'Nạp tiền',
    desc: 'Top tổng nạp (tongnap) và VND trên bảng account.',
    help: 'Dùng tab này để đối chiếu whale / VIP. Chỉnh VND trực tiếp tại trang Accounts.',
  },
  {
    id: 'event',
    label: 'Sự kiện',
    desc: 'Top điểm sự kiện — chọn loại điểm bên dưới.',
    help: 'Mỗi sự kiện game có thể dùng cột điểm khác nhau (event_point, point_sukien, …). Chọn đúng metric trước khi xem.',
  },
  {
    id: 'clan',
    label: 'Bang hội',
    desc: 'Top bang theo tổng power, điểm bang hoặc cấp.',
    help: 'Quản lý chi tiết bang tại trang Clans — tab này chỉ để xem nhanh thứ hạng.',
  },
  {
    id: 'super-rank',
    label: 'Siêu hạng',
    desc: 'Bảng super_rank — đấu trường siêu hạng trong game.',
    help: 'Dữ liệu từ bảng super_rank. Hạng thấp = mạnh hơn (TOP 1 là cao nhất).',
  },
];

const LIMIT_OPTIONS = [10, 25, 50, 100, 200];

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

function formatNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN') : '—';
}

function formatTime(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toLocaleString('vi-VN');
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
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [eventMetric, setEventMetric] = useState('event_point');
  const [clanSort, setClanSort] = useState('power_point');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [eventMetrics, setEventMetrics] = useState(DEFAULT_EVENT_METRICS);
  const fb = useFeedback();

  useEffect(() => {
    api('/rankings/meta')
      .then((res) => {
        if (res.data?.eventMetrics) setEventMetrics(res.data.eventMetrics);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fb.clear();

    const params = new URLSearchParams({ limit: String(limit) });
    if (search) params.set('q', search);
    if (tab === 'event') params.set('metric', eventMetric);
    if (tab === 'clan') params.set('sort', clanSort);

    api(`/rankings/${tab}?${params}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data || []);
        setMeta(res.meta || null);
        if (res.meta?.unavailable) {
          fb.show('Bảng super_rank chưa có trên database này.', 'info');
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setRows([]);
        setMeta(null);
        const msg = /404/.test(e.message)
          ? 'Panel API chưa có route mới (404). Chạy panel\\stop-panel.bat rồi panel\\start-panel.bat để restart API.'
          : e.message;
        fb.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tab, limit, search, eventMetric, clanSort]);

  function reload() {
    setLoading(true);
    fb.clear();
    const params = new URLSearchParams({ limit: String(limit) });
    if (search) params.set('q', search);
    if (tab === 'event') params.set('metric', eventMetric);
    if (tab === 'clan') params.set('sort', clanSort);
    api(`/rankings/${tab}?${params}`)
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || null);
      })
      .catch((e) => {
        setRows([]);
        setMeta(null);
        fb.error(e.message);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [autoRefresh, tab, limit, search, eventMetric, clanSort]);

  const tabInfo = TABS.find((t) => t.id === tab);

  const csvData = useMemo(() => {
    if (tab === 'power') {
      return {
        headers: ['Hạng', 'ID', 'Tên', 'Power', 'Bang', 'Username', 'VIP'],
        rows: rows.map((r, i) => [i + 1, r.id, r.name, r.power, r.clan_name || '', r.username || '', r.vip ?? '']),
      };
    }
    if (tab === 'nap') {
      return {
        headers: ['Hạng', 'ID', 'Username', 'Tổng nạp', 'VND', 'VIP', 'Ban'],
        rows: rows.map((r, i) => [i + 1, r.id, r.username, r.tongnap, r.vnd, r.vip ?? '', r.ban ? 'Ban' : 'OK']),
      };
    }
    if (tab === 'event') {
      const label = eventMetrics[eventMetric]?.label || eventMetric;
      return {
        headers: ['Hạng', 'ID', 'Tên', label, 'Bang', 'Username'],
        rows: rows.map((r, i) => [i + 1, r.id, r.name, r.score, r.clan_name || '', r.username || '']),
      };
    }
    if (tab === 'clan') {
      return {
        headers: ['Hạng', 'ID', 'Tên bang', 'Power bang', 'Điểm bang', 'Cấp', 'Max member'],
        rows: rows.map((r, i) => [i + 1, r.id, r.NAME, r.power_point, r.clan_point, r.LEVEL, r.max_member]),
      };
    }
    return {
      headers: ['Hạng siêu', 'Player ID', 'Tên', 'Thắng', 'Thua', 'Vé', 'PK lần cuối'],
      rows: rows.map((r) => [r.rank, r.player_id, r.name, r.win, r.lose, r.ticket, formatTime(r.last_pk_time)]),
    };
  }, [tab, rows, eventMetric, eventMetrics]);

  function exportCsv() {
    if (!rows.length) {
      fb.show('Không có dữ liệu để xuất.', 'info');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`rankings-${tab}-${stamp}.csv`, csvData.headers, csvData.rows);
    fb.success('Đã xuất CSV.');
  }

  function applySearch(e) {
    e?.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <PageHeader
        title="Bảng xếp hạng"
        description="Xem và lọc top player/bang theo nhiều tiêu chí — dữ liệu realtime từ database game, không cần query SQL thủ công."
        actions={
          <>
            <label className="toggle-empty">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Tự refresh 30s
            </label>
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
          <li>Chọn <strong>loại xếp hạng</strong> ở tab bên dưới — mỗi tab đọc từ bảng/cột khác nhau trong DB game.</li>
          <li>Dùng <strong>Số lượng</strong> và <strong>Tìm kiếm</strong> để thu hẹp danh sách; bấm Áp dụng (hoặc Enter) để lọc.</li>
          <li>Tab Sự kiện: chọn đúng <strong>loại điểm</strong> tương ứng event đang chạy trên server.</li>
          <li>Bấm <strong>Quản lý</strong> trên từng dòng để sang Player/Accounts — chỉnh số liệu tại đó, không sửa trực tiếp trên bảng này.</li>
        </ul>
        {tabInfo?.help && <p className="muted" style={{ margin: '8px 0 0' }}>{tabInfo.help}</p>}
      </div>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

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
          Số lượng
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
        </label>

        {tab === 'event' && (
          <label>
            Loại điểm
            <select value={eventMetric} onChange={(e) => setEventMetric(e.target.value)}>
              {Object.entries(eventMetrics).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label || key}</option>
              ))}
            </select>
          </label>
        )}

        {tab === 'clan' && (
          <label>
            Xếp theo
            <select value={clanSort} onChange={(e) => setClanSort(e.target.value)}>
              {Object.entries(CLAN_SORT_OPTIONS).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </label>
        )}

        <input
          placeholder={tab === 'nap' ? 'Lọc username...' : tab === 'clan' ? 'Lọc tên bang...' : 'Lọc tên player...'}
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
          {meta.metricLabel ? ` · ${meta.metricLabel}` : ''}
          {meta.sortLabel ? ` · ${meta.sortLabel}` : ''}
          {search ? ` · lọc "${search}"` : ''}
          {' · '}
          Cập nhật {new Date(meta.updatedAt).toLocaleTimeString('vi-VN')}
        </p>
      )}

      {loading && rows.length === 0 ? (
        <p className="muted">Đang tải...</p>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          Không có dữ liệu{search ? ` cho "${search}"` : ''}.
          {tab === 'event' && ' Thử đổi loại điểm sự kiện.'}
        </div>
      ) : (
        <div className="table-wrap">
          {tab === 'power' && (
            <table>
              <thead>
                <tr>
                  <th>Hạng</th><th>Tên</th><th>Hành tinh</th><th>Power</th><th>Bang</th><th>Account</th><th>VIP</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.name}</td>
                    <td>{GENDER_LABEL[r.gender] ?? r.gender ?? '—'}</td>
                    <td>{formatNum(r.power)}</td>
                    <td>{r.clan_name ? <Link to="/clans">{r.clan_name}</Link> : '—'}</td>
                    <td>{r.username || '—'}</td>
                    <td>{r.vip ?? '—'}</td>
                    <td>
                      <Link className="btn sm" to="/players-db" state={{ playerId: r.id }}>Quản lý</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'nap' && (
            <table>
              <thead>
                <tr>
                  <th>Hạng</th><th>Username</th><th>Tổng nạp</th><th>VND</th><th>VIP</th><th>Trạng thái</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.username}</td>
                    <td>{formatNum(r.tongnap)}</td>
                    <td>{formatNum(r.vnd)}</td>
                    <td>{r.vip ?? '—'}</td>
                    <td><span className={`badge ${r.ban ? 'bad' : 'ok'}`}>{r.ban ? 'Ban' : 'OK'}</span></td>
                    <td>
                      <Link className="btn sm" to="/accounts" state={{ accountId: r.id }}>Account</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'event' && (
            <table>
              <thead>
                <tr>
                  <th>Hạng</th><th>Tên</th><th>{eventMetrics[eventMetric]?.label || 'Điểm'}</th><th>Bang</th><th>Account</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.name}</td>
                    <td>{formatNum(r.score)}</td>
                    <td>{r.clan_name || '—'}</td>
                    <td>{r.username || '—'}</td>
                    <td>
                      <Link className="btn sm" to="/players-db" state={{ playerId: r.id }}>Quản lý</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'clan' && (
            <table>
              <thead>
                <tr>
                  <th>Hạng</th><th>Tên bang</th><th>Power bang</th><th>Điểm bang</th><th>Cấp</th><th>Thành viên</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.NAME}</td>
                    <td>{formatNum(r.power_point)}</td>
                    <td>{formatNum(r.clan_point)}</td>
                    <td>{r.LEVEL ?? '—'}</td>
                    <td>{r.max_member ?? '—'}</td>
                    <td>
                      <Link className="btn sm" to="/clans">Chi tiết</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'super-rank' && (
            <table>
              <thead>
                <tr>
                  <th>Hạng siêu</th><th>Tên</th><th>Thắng</th><th>Thua</th><th>Vé</th><th>PK lần cuối</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.rank}</td>
                    <td>{r.name}</td>
                    <td>{r.win ?? 0}</td>
                    <td>{r.lose ?? 0}</td>
                    <td>{r.ticket ?? '—'}</td>
                    <td>{formatTime(r.last_pk_time)}</td>
                    <td>
                      <Link className="btn sm" to="/players-db" state={{ playerId: r.player_id }}>Quản lý</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
