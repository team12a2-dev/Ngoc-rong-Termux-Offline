import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';

export default function SetupPage() {
  const [status, setStatus] = useState(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api('/setup/status').then((res) => setStatus(res.data)).catch((e) => setMsg(e.message));
  }, []);

  async function init(e) {
    e.preventDefault();
    try {
      await api('/setup/init', { method: 'POST', body: JSON.stringify({ username, password }) });
      const login = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      setToken(login.data.token);
      navigate('/');
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <h2>Setup Wizard</h2>
        {status && (
          <ul className="info-list">
            <li>DB: {status.db?.database || '—'} {status.db?.ok ? '✓' : '✗'}</li>
            <li>Agent: {status.agent?.data?.status || status.agent?.error || '—'}</li>
            <li>Panel ready: {status.panelReady ? 'Yes' : 'No'}</li>
          </ul>
        )}
        {msg && <div className="alert error">{msg}</div>}
        <p className="muted">Chạy <code>npm run db:sync</code> trong panel/api trước nếu chưa sync DB.</p>
        <form onSubmit={init}>
          <label>Owner username<input value={username} onChange={(e) => setUsername(e.target.value)} /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="btn primary" type="submit">Hoàn tất setup</button>
        </form>
      </div>
    </div>
  );
}
