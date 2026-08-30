import { useState } from 'react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import AccountDetailPanel from '../components/AccountDetailPanel';

export default function AccountsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', password: '', confirmPassword: '' });
  const fb = useFeedback();

  async function createAccount(e) {
    e.preventDefault();
    fb.clear();
    if (createForm.password !== createForm.confirmPassword) {
      fb.error('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    setCreating(true);
    try {
      const res = await api('/accounts', {
        method: 'POST',
        body: JSON.stringify({ username: createForm.username, password: createForm.password }),
      });
      setCreateForm({ username: '', password: '', confirmPassword: '' });
      await search();
      fb.success(`Đã tạo tài khoản ${res.data.username} (ID ${res.data.id}).`);
    } catch (err) {
      fb.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function search(e) {
    e?.preventDefault();
    setLoading(true);
    fb.clear();
    try {
      const res = await api(`/accounts/search?q=${encodeURIComponent(q)}`);
      setRows(res.data || []);
      if (!res.data?.length) fb.show('Không tìm thấy tài khoản.', 'info');
    } catch (err) {
      fb.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Quản lý Accounts"
        description="Tìm kiếm tài khoản, chỉnh VND/VIP/admin, ban/unban và xem nhân vật liên kết — không cần thao tác SQL thủ công."
      />

      <div className="help-box">
        <h4>Hướng dẫn nhanh</h4>
        <ul>
          <li>Nhập username (hoặc một phần) rồi bấm Tìm — chọn dòng để mở panel chi tiết bên phải.</li>
          <li>Chỉnh VND/VIP trực tiếp trong panel, bấm Lưu — mọi thay đổi được ghi audit log.</li>
          <li>Từ panel chi tiết, bấm Quản lý để chuyển sang trang Player với nhân vật tương ứng.</li>
        </ul>
      </div>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <form className="card" onSubmit={createAccount} style={{ marginBottom: '1rem' }}>
        <h3>Tạo tài khoản game</h3>
        <p className="muted">Tạo account mới trực tiếp trong panel. Tài khoản mặc định không có quyền admin và chưa bị khóa.</p>
        <div className="row filters">
          <input placeholder="Username (5–20 ký tự)" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} maxLength={20} required />
          <input type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} minLength={6} required />
          <input type="password" placeholder="Xác nhận mật khẩu" value={createForm.confirmPassword} onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} minLength={6} required />
          <button className="btn primary" type="submit" disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
        </div>
      </form>

      <form className="row filters" onSubmit={search}>
        <input placeholder="Tìm username..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Đang tìm...' : 'Tìm'}
        </button>
      </form>

      <div className="split">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Username</th><th>VND</th><th>Ban</th><th>Admin</th><th>IP</th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr
                  key={a.id}
                  className={selectedId === a.id ? 'row-active' : ''}
                  onClick={() => setSelectedId(a.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{a.id}</td>
                  <td>{a.username}</td>
                  <td>{Number(a.vnd || 0).toLocaleString()}</td>
                  <td><span className={`badge ${a.ban ? 'bad' : 'ok'}`}>{a.ban ? 'Ban' : 'OK'}</span></td>
                  <td>{a.is_admin ? <span className="badge admin">Admin</span> : '—'}</td>
                  <td>{a.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loading && (
            <div className="empty-state">Nhập username và bấm Tìm để bắt đầu.</div>
          )}
        </div>
        {selectedId && (
          <AccountDetailPanel
            accountId={selectedId}
            onUpdated={search}
            onMessage={(text, type) => (type === 'error' ? fb.error(text) : fb.success(text))}
          />
        )}
      </div>
    </div>
  );
}
