import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getToken, getServerId, getWsBaseUrl, refreshSession, redirectToLogin } from '../api';
import PageHeader from '../components/PageHeader';

const QUICK_LINKS = [
  { to: '/players', label: 'Players Online', desc: 'Kick, xem realtime' },
  { to: '/players-db', label: 'Quản lý Player', desc: 'Chỉnh DB chuyên sâu' },
  { to: '/server', label: 'Server Control', desc: 'EXP, bảo trì, broadcast' },
  { to: '/giftcodes', label: 'Giftcodes', desc: 'Tạo mã quà tặng' },
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const sid = getServerId();
    let ws;
    let retryTimer;
    let cancelled = false;

    async function handleAuthFailure() {
      const newToken = await refreshSession();
      if (cancelled) return;
      if (newToken) {
        connect(newToken);
        return;
      }
      setError('Phiên đăng nhập hết hạn — đăng nhập lại.');
      redirectToLogin();
    }

    function connect(authToken) {
      const token = authToken || getToken();
      if (!token) {
        setError('Chưa đăng nhập');
        return;
      }

      const qs = new URLSearchParams({ token, serverId: String(sid) });
      ws = new WebSocket(`${getWsBaseUrl()}/ws/metrics?${qs}`);

      ws.onopen = () => {
        setConnected(true);
        setError('');
      };

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'metrics') {
          if (msg.data) {
            setMetrics(msg.data);
            setPlayers(msg.players || []);
            setError('');
          } else if (msg.agentError) {
            setMetrics(null);
            const err = String(msg.agentError);
            if (/panel_servers|panel_users|panel_/i.test(err)) {
              setError('Chưa đồng bộ panel DB — chạy: cd panel/api && npm run db:sync');
            } else if (/fetch failed|ECONNREFUSED|timeout/i.test(err)) {
              setError('Game Agent chưa kết nối — chạy game server (run.bat) để lấy metrics.');
            } else {
              setError(`Game Agent: ${err}`);
            }
          } else {
            setMetrics(null);
            setError('Game Agent chưa kết nối — chạy game server (run.bat) để lấy metrics.');
          }
        }
        if (msg.type === 'error') setError(msg.error);
      };

      ws.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        setError('Không kết nối được Panel API (port 3001). Chạy panel\\stop-panel.bat rồi run.bat lại.');
      };

      ws.onclose = (ev) => {
        setConnected(false);
        if (cancelled) return;
        if (ev.code === 4001) {
          handleAuthFailure();
          return;
        }
        if (ev.code !== 1000) {
          setError('Mất kết nối WebSocket — đang thử lại...');
          retryTimer = setTimeout(() => connect(getToken()), 3000);
        }
      };
    }

    connect(getToken());

    const onServerChange = () => ws?.close();
    window.addEventListener('server-changed', onServerChange);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      ws?.close();
      window.removeEventListener('server-changed', onServerChange);
    };
  }, []);

  const cards = metrics
    ? [
        { label: 'Online', value: metrics.onlineCount, warn: false },
        { label: 'Sessions', value: metrics.sessionCount, warn: false },
        { label: 'EXP', value: `x${metrics.expRate}`, warn: false },
        {
          label: 'CPU Process',
          value: `${metrics.cpuProcess ?? 0}%`,
          warn: (metrics.cpuProcess ?? 0) > 70,
          hint: (metrics.cpuProcess ?? 0) > 70 ? 'Cao — giảm bot/event hoặc tăng sleep boss thread' : null,
        },
        {
          label: 'RAM JVM',
          value: metrics.heapMaxGb
            ? `${metrics.ramJvmGb} / ${metrics.heapMaxGb} GB`
            : `${metrics.ramJvmGb} GB`,
          sub: metrics.heapUsagePct != null ? `${metrics.heapUsagePct}% heap` : null,
          warn: (metrics.heapUsagePct ?? 0) > 80,
        },
        { label: 'RAM OS', value: metrics.ramOsTotalGb ? `${metrics.ramOsUsedGb} / ${metrics.ramOsTotalGb} GB` : '—', warn: false },
        { label: 'Bots', value: metrics.botCount, warn: false },
        { label: 'Threads', value: metrics.threadCount, warn: (metrics.threadCount ?? 0) > 200 },
        {
          label: 'CPU System',
          value: `${metrics.cpuSystem ?? 0}%`,
          warn: (metrics.cpuSystem ?? 0) > 85,
          sub: metrics.cpuCores ? `${metrics.cpuCores} cores` : null,
        },
      ]
    : [];

  const perfTips = [];
  if (metrics) {
    if ((metrics.cpuProcess ?? 0) > 70) perfTips.push('CPU game cao — kiểm tra số bot, boss spawn, hoặc event đang chạy.');
    if ((metrics.cpuSystem ?? 0) > 85) perfTips.push('CPU hệ thống cao — đóng app nền hoặc giảm tần suất refresh panel.');
    if ((metrics.heapUsagePct ?? 0) > 80) perfTips.push('Heap JVM gần đầy — tăng -Xmx trong start-game.bat hoặc restart server.');
    if ((metrics.threadCount ?? 0) > 200) perfTips.push('Quá nhiều thread — xem xét giảm manager thread không cần thiết.');
    if (perfTips.length === 0 && (metrics.cpuProcess ?? 0) < 30) {
      perfTips.push('Hiệu suất ổn định. RAM Task Manager ~150–300MB khi idle là bình thường với Java game server.');
    }
    if ((metrics.heapMaxGb ?? 0) >= 0.5 && (metrics.ramJvmGb ?? 0) < 0.3) {
      perfTips.push('Heap JVM đang nhẹ — server chưa cần nhiều RAM. Nếu Task Manager cao, đó là bộ nhớ Java đã cấp phát sẵn (Xms), không phải leak.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Tổng quan server realtime qua WebSocket — chọn server ở sidebar trái."
      />

      {error && <div className="alert error">{error}</div>}
      {!metrics && !error && (
        <p className="muted">{connected ? 'Đang chờ dữ liệu từ game agent...' : 'Đang kết nối Panel API...'}</p>
      )}

      <div className="grid cards">
        {cards.map((c) => (
          <div key={c.label} className={`card stat ${c.warn ? 'warn-stat' : ''}`} title={c.hint || undefined}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
            {c.sub && <div className="muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {perfTips.length > 0 && (
        <div className="help-box compact" style={{ marginTop: 16 }}>
          <h4>Hiệu suất</h4>
          <ul>
            {perfTips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}

      <div className="split" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Trạng thái server</h3>
          <ul className="info-list">
            <li><span>WebSocket</span><strong className={connected ? 'ok-text' : ''}>{connected ? 'Đã kết nối' : 'Chưa kết nối'}</strong></li>
            <li><span>Server</span><strong>{metrics?.serverName || '—'}</strong></li>
            <li><span>Khởi động</span><strong>{metrics?.timeStart || '—'}</strong></li>
            <li><span>Admin-only</span><strong>{metrics?.adminMode ? 'BẬT' : 'Tắt'}</strong></li>
            <li><span>Bảo trì</span><strong>{metrics?.maintenance ? 'Đang chạy' : 'Bình thường'}</strong></li>
          </ul>
        </div>

        <div className="card">
          <h3>Truy cập nhanh</h3>
          <div className="member-grid">
            {QUICK_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="member-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{l.label}</strong>
                <div className="muted">{l.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {players.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-head">
            <h3>Player online ({players.length})</h3>
            <Link to="/players" className="btn sm">Xem tất cả</Link>
          </div>
          <table className="compact">
            <thead><tr><th>Tên</th><th>Power</th><th>Map</th></tr></thead>
            <tbody>
              {players.slice(0, 8).map((p) => (
                <tr key={p.id || p.name}>
                  <td>{p.name}</td>
                  <td>{p.power?.toLocaleString?.() ?? '—'}</td>
                  <td>{p.mapId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
