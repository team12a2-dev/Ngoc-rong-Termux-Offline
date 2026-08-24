import { useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';

const empty = { name: '', agent_url: 'http://127.0.0.1:14446', agent_key: '', game_db_name: 'ngocrong', game_port: 14445 };

export default function ServersPage() {
  const [servers, setServers] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState('');
  const [pings, setPings] = useState({});

  async function load() {
    const res = await api('/servers');
    setServers(res.data || []);
  }

  useEffect(() => { load().catch((e) => setMsg(e.message)); }, []);

  async function ping(id) {
    try {
      const res = await api(`/servers/${id}/ping`);
      setPings((p) => ({ ...p, [id]: res.data?.status || 'ok' }));
    } catch {
      setPings((p) => ({ ...p, [id]: 'down' }));
    }
  }

  async function create(e) {
    e.preventDefault();
    try {
      await api('/servers', { method: 'POST', body: JSON.stringify(form) });
      setMsg('Đã thêm server');
      setForm(empty);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  useEffect(() => {
    servers.forEach((s) => ping(s.id));
  }, [servers.length]);

  const onlineCount = Object.values(pings).filter((s) => s === 'ok').length;

  return (
    <div>
      <PageHeader
        title="Quản lý Servers"
        description="Multi-server — thêm, ping và chuyển đổi server game từ sidebar trái."
        stats={(
          <>
            <span className="page-stat-pill">
              <strong>{servers.length}</strong> server
            </span>
            <span className="page-stat-pill ok">
              <strong>{onlineCount}</strong> online
            </span>
          </>
        )}
      />

      {msg && <div className="alert">{msg}</div>}

      <div className="table-card">
        <table>
          <thead><tr><th>ID</th><th>Tên</th><th>Agent</th><th>Port</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.id} className={s.id === getServerId() ? 'row-active' : ''}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td><code>{s.agent_url}</code></td>
                <td>{s.game_port}</td>
                <td><span className={`badge ${pings[s.id] === 'ok' ? 'ok' : 'bad'}`}>{pings[s.id] || '...'}</span></td>
                <td><button type="button" className="btn sm" onClick={() => ping(s.id)}>Ping</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="card section" onSubmit={create}>
        <h3>Thêm server</h3>
        <div className="row">
          <input placeholder="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Agent URL" value={form.agent_url} onChange={(e) => setForm({ ...form, agent_url: e.target.value })} />
          <input placeholder="Agent Key" value={form.agent_key} onChange={(e) => setForm({ ...form, agent_key: e.target.value })} />
        </div>
        <div className="row">
          <input placeholder="DB name" value={form.game_db_name} onChange={(e) => setForm({ ...form, game_db_name: e.target.value })} />
          <input type="number" placeholder="Game port" value={form.game_port} onChange={(e) => setForm({ ...form, game_port: Number(e.target.value) })} />
        </div>
        <button className="btn primary" type="submit">Thêm</button>
      </form>
    </div>
  );
}
