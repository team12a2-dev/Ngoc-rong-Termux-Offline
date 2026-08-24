import { useEffect, useState } from 'react';
import { api, getServerId, setServerId } from '../api';

export default function ServerSelector() {
  const [servers, setServers] = useState([]);
  const [current, setCurrent] = useState(getServerId());

  useEffect(() => {
    api('/servers').then((res) => setServers(res.data || [])).catch(() => {});
    const onChange = (e) => setCurrent(Number(e.detail));
    window.addEventListener('server-changed', onChange);
    return () => window.removeEventListener('server-changed', onChange);
  }, []);

  function change(e) {
    const id = Number(e.target.value);
    setServerId(id);
    setCurrent(id);
  }

  if (servers.length === 0) {
    return <div className="server-tag server-tag-empty">Chưa có server</div>;
  }

  if (servers.length <= 1) {
    return (
      <div className="server-tag">
        <span className="server-tag-dot" aria-hidden="true" />
        {servers[0].name}
      </div>
    );
  }

  return (
    <select className="server-select" value={current} onChange={change}>
      {servers.map((s) => (
        <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>
      ))}
    </select>
  );
}
