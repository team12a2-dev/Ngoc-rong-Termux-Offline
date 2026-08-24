import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const fb = useFeedback();

  async function load() {
    setLoading(true);
    try {
      const res = await api(`/servers/${getServerId()}/players/online`);
      setPlayers(res.data || []);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (!autoRefresh) return undefined;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  async function kick(name) {
    if (!confirm(`Kick player "${name}" khỏi server?`)) return;
    try {
      await api(`/servers/${getServerId()}/players/online/${encodeURIComponent(name)}/kick`, { method: 'POST', body: '{}' });
      fb.success(`Đã kick ${name}`);
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        title={`Players Online (${players.length})`}
        description="Danh sách player đang online trên server — kick nhanh hoặc chuyển sang Quản lý Player để chỉnh sâu."
        actions={
          <>
            <label className="toggle-empty">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Tự refresh 8s
            </label>
            <button className="btn" onClick={load}>Refresh</button>
          </>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {loading && players.length === 0 ? (
        <p className="muted">Đang tải...</p>
      ) : players.length === 0 ? (
        <div className="empty-state">Không có player online.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tên</th><th>Power</th><th>Map / Zone</th><th>VND</th><th>IP</th><th></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id || p.name}>
                <td>{p.name}{p.admin ? ' 👑' : ''}</td>
                <td>{p.power?.toLocaleString?.() ?? p.power}</td>
                <td>Map {p.mapId ?? '—'} · z{p.zoneId ?? '—'}</td>
                <td>{Number(p.vnd ?? 0).toLocaleString()}</td>
                <td>{p.ip ?? '—'}</td>
                <td>
                  <Link className="btn sm" to="/players-db" state={{ playerName: p.name }}>Quản lý</Link>
                  <button className="btn danger sm" onClick={() => kick(p.name)}>Kick</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
