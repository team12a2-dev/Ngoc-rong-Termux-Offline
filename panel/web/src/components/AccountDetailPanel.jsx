import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function AccountDetailPanel({ accountId, onUpdated, onMessage }) {
  const [account, setAccount] = useState(null);
  const [players, setPlayers] = useState([]);
  const [edit, setEdit] = useState({ vnd: '', vip: '', is_admin: false });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [accRes, plRes] = await Promise.all([
      api(`/accounts/${accountId}`),
      api(`/players/search?q=${accountId}&limit=20`),
    ]);
    const acc = accRes.data;
    setAccount(acc);
    setEdit({
      vnd: acc.vnd ?? 0,
      vip: acc.vip ?? 0,
      is_admin: !!acc.is_admin,
    });
    setPlayers((plRes.data || []).filter((p) => p.account_id === accountId));
  }

  useEffect(() => {
    if (accountId) load().catch((e) => onMessage?.(e.message, 'error'));
  }, [accountId]);

  async function save() {
    setSaving(true);
    try {
      await api(`/accounts/${accountId}`, {
        method: 'PUT',
        body: JSON.stringify({
          vnd: Number(edit.vnd),
          vip: Number(edit.vip),
          is_admin: edit.is_admin ? 1 : 0,
        }),
      });
      onMessage?.('Đã cập nhật tài khoản', 'success');
      load();
      onUpdated?.();
    } catch (e) {
      onMessage?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleBan(ban) {
    const label = ban ? 'ban' : 'unban';
    if (!confirm(`${ban ? 'Ban' : 'Unban'} tài khoản ${account?.username}?`)) return;
    try {
      await api(`/accounts/${accountId}/${label}`, { method: 'POST', body: '{}' });
      onMessage?.(ban ? 'Đã ban tài khoản' : 'Đã unban tài khoản', 'success');
      load();
      onUpdated?.();
    } catch (e) {
      onMessage?.(e.message, 'error');
    }
  }

  if (!account) return <div className="card detail"><p className="muted">Đang tải...</p></div>;

  return (
    <div className="card detail account-detail">
      <div className="detail-header">
        <div>
          <h3>{account.username}</h3>
          <p className="muted">Account ID: {account.id}</p>
        </div>
        <span className={`badge ${account.ban ? 'bad' : 'ok'}`}>
          {account.ban ? 'Đã ban' : 'Hoạt động'}
        </span>
      </div>

      <div className="info-panels">
        <div className="info-panel">
          <h4>Thông tin</h4>
          <ul className="info-list">
            <li><span>IP cuối</span><strong>{account.ip_address || '—'}</strong></li>
            <li><span>Đăng nhập cuối</span><strong>{account.last_time_login || '—'}</strong></li>
            <li><span>Tổng nạp</span><strong>{Number(account.tongnap || 0).toLocaleString()}</strong></li>
          </ul>
        </div>
        <div className="info-panel">
          <h4>Chỉnh sửa nhanh</h4>
          <div className="form-grid">
            <label className="field">
              VND
              <input type="number" value={edit.vnd} onChange={(e) => setEdit({ ...edit, vnd: e.target.value })} />
            </label>
            <label className="field">
              VIP
              <input type="number" value={edit.vip} onChange={(e) => setEdit({ ...edit, vip: e.target.value })} />
            </label>
            <label className="field toggle-field">
              <span>Quyền Admin</span>
              <input
                type="checkbox"
                checked={edit.is_admin}
                onChange={(e) => setEdit({ ...edit, is_admin: e.target.checked })}
              />
            </label>
          </div>
          <div className="action-grid" style={{ marginTop: 10 }}>
            <button className="btn primary sm" onClick={save} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            {account.ban
              ? <button className="btn sm" onClick={() => toggleBan(false)}>Unban</button>
              : <button className="btn danger sm" onClick={() => toggleBan(true)}>Ban</button>}
          </div>
        </div>
      </div>

      <div className="action-section">
        <h4>Nhân vật liên kết ({players.length})</h4>
        {players.length === 0 ? (
          <p className="muted">Chưa có nhân vật.</p>
        ) : (
          <table className="compact">
            <thead><tr><th>ID</th><th>Tên</th><th>Hệ</th><th></th></tr></thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{['Trái Đất', 'Namek', 'Xayda'][p.gender] ?? p.gender}</td>
                  <td>
                    <Link className="btn sm" to="/players-db" state={{ playerId: p.id }}>
                      Quản lý
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
