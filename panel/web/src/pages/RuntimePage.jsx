import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { api, getServerId } from '../api';

const SOURCES = [
  { id: 'game', label: 'Game server', description: 'Log Java và quá trình load dữ liệu' },
  { id: 'panel', label: 'Web panel', description: 'Express API, database sync và scheduler' },
  { id: 'mariadb', label: 'MariaDB', description: 'Database local trên Termux' },
];

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatUptime(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
}

function StatusPill({ ok, children }) {
  return <span className={`status-pill ${ok ? '' : 'danger'}`}><strong>{ok ? 'OK' : 'LỖI'}</strong> {children}</span>;
}

export default function RuntimePage() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [source, setSource] = useState('game');
  const [lines, setLines] = useState(200);
  const [logData, setLogData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadDiagnostics = useCallback(async () => {
    try {
      const res = await api(`/runtime/diagnostics?serverId=${getServerId()}`);
      setDiagnostics(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await api(`/runtime/logs?source=${source}&lines=${lines}`);
      setLogData(res.data);
    } catch (err) {
      setLogData(null);
      setError(err.message);
    } finally {
      setLogLoading(false);
    }
  }, [source, lines]);

  useEffect(() => {
    loadDiagnostics();
    loadLog();
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      loadDiagnostics();
      loadLog();
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadDiagnostics, loadLog]);

  const memoryUsed = diagnostics?.host?.totalMemoryMb && diagnostics?.host?.freeMemoryMb
    ? diagnostics.host.totalMemoryMb - diagnostics.host.freeMemoryMb
    : null;
  const selectedSource = useMemo(() => SOURCES.find((item) => item.id === source), [source]);

  function downloadLog() {
    if (!logData?.lines) return;
    const blob = new Blob([logData.lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${source}-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Runtime & Diagnostics"
        description="Theo dõi trực tiếp Java Agent, Node.js, bộ nhớ Termux và log dịch vụ — không cần mở terminal."
      >
        <button type="button" className="btn" onClick={() => { loadDiagnostics(); loadLog(); }} disabled={loading || logLoading}>
          {loading || logLoading ? 'Đang tải...' : 'Làm mới'}
        </button>
        <label className="status-pill" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Tự làm mới 5s
        </label>
      </PageHeader>

      {error && <div className="alert error">{error}</div>}

      <div className="status-pills">
        <StatusPill ok={Boolean(diagnostics?.agentOnline)}>Java Agent {diagnostics?.agentOnline ? 'đang kết nối' : 'không phản hồi'}</StatusPill>
        <StatusPill ok={Boolean(diagnostics?.panel?.pid)}>Node.js PID {diagnostics?.panel?.pid || '—'}</StatusPill>
        <span className="status-pill">Game port <strong>{diagnostics?.gamePort || '—'}</strong></span>
        <span className="status-pill">Agent <strong>{diagnostics?.agentUrl || '—'}</strong></span>
      </div>

      {diagnostics?.agentError && <div className="help-box compact">Agent báo lỗi: <code>{diagnostics.agentError}</code></div>}

      <div className="grid cards">
        <div className="card stat"><div className="stat-label">Node.js uptime</div><div className="stat-value">{formatUptime(diagnostics?.panel?.uptimeSeconds)}</div><div className="muted">PID {diagnostics?.panel?.pid || '—'}</div></div>
        <div className="card stat"><div className="stat-label">RAM Panel</div><div className="stat-value">{diagnostics?.panel?.memoryMb ?? '—'} MB</div><div className="muted">{diagnostics?.panel?.node || 'Node.js'}</div></div>
        <div className="card stat"><div className="stat-label">RAM Termux</div><div className="stat-value">{memoryUsed != null ? `${memoryUsed} MB` : '—'}</div><div className="muted">{diagnostics?.host?.totalMemoryMb ?? '—'} MB tổng</div></div>
        <div className="card stat"><div className="stat-label">CPU cores</div><div className="stat-value">{diagnostics?.host?.cpus ?? '—'}</div><div className="muted">{diagnostics?.host?.hostname || '—'}</div></div>
      </div>

      <div className="split" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="section-head"><h3>Runtime game</h3><span className="muted">{diagnostics?.serverName || '—'}</span></div>
          <ul className="info-list">
            <li><span>Java Agent</span><strong>{diagnostics?.agentOnline ? 'Online' : 'Offline'}</strong></li>
            <li><span>Agent health</span><strong>{diagnostics?.agentHealth?.status || '—'}</strong></li>
            <li><span>Game port</span><strong>{diagnostics?.gamePort || '—'}</strong></li>
            <li><span>Agent URL</span><strong><code>{diagnostics?.agentUrl || '—'}</code></strong></li>
          </ul>
        </div>
        <div className="card">
          <div className="section-head"><h3>Log files</h3><span className="muted">$HOME/ngocrong-termux/.runtime</span></div>
          <ul className="info-list">
            {SOURCES.map((item) => (
              <li key={item.id}><span>{item.label}</span><strong>{diagnostics?.logs?.[item.id]?.exists ? formatBytes(diagnostics.logs[item.id].sizeBytes) : 'Chưa có'}</strong></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <div><h3>Live log viewer</h3><p className="muted">{selectedSource?.description} · cập nhật mỗi 5 giây khi bật tự làm mới</p></div>
          <div className="row">
            <select value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
            <select value={lines} onChange={(e) => setLines(Number(e.target.value))}><option value={100}>100 dòng</option><option value={200}>200 dòng</option><option value={500}>500 dòng</option><option value={1000}>1000 dòng</option></select>
            <button type="button" className="btn sm" onClick={downloadLog} disabled={!logData?.lines}>Tải .txt</button>
          </div>
        </div>
        <div className="muted" style={{ marginBottom: 8 }}>{logData?.file || '—'} · {logData?.available ? `${formatBytes(logData.sizeBytes)} · cập nhật ${formatTime(logData.updatedAt)}` : 'chưa tồn tại'}</div>
        <pre style={{ margin: 0, maxHeight: 520, overflow: 'auto', padding: 16, borderRadius: 10, background: '#080b0e', color: '#d1fae5', fontSize: '0.78rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{logData?.lines || (logData?.error || 'Chưa có dữ liệu log.')}</pre>
      </div>
    </div>
  );
}

