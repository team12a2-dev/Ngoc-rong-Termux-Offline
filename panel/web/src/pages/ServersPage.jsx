import { useEffect, useState } from 'react';
import { api, getServerId, setServerId } from '../api';
import { fixMojibake } from '../utils/text';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const emptyForm = {
  name: '',
  agent_url: 'http://127.0.0.1:14446',
  agent_key: '',
  game_db_name: 'ngocrong',
  game_port: 14445,
};

export default function ServersPage() {
  const [servers, setServers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [pings, setPings] = useState({});
  const [pinging, setPinging] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const fb = useFeedback();

  async function load() {
    try {
      const res = await api('/servers');
      const list = res.data || [];
      setServers(list);
      list.forEach((s) => ping(s.id));
    } catch (e) {
      fb.error(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function ping(id) {
    setPinging((p) => ({ ...p, [id]: true }));
    try {
      const start = Date.now();
      const res = await api(`/servers/${id}/ping`);
      const elapsed = Date.now() - start;
      setPings((p) => ({
        ...p,
        [id]: { status: res.data?.status || 'ok', ms: elapsed, info: res.data },
      }));
    } catch {
      setPings((p) => ({ ...p, [id]: { status: 'down', ms: null } }));
    } finally {
      setPinging((p) => ({ ...p, [id]: false }));
    }
  }

  function handleSelectServer(id, name) {
    setServerId(id);
    fb.success(`Đã chuyển phiên làm việc sang Server: ${name} (ID: #${id})!`);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setTestResult(null);
    setModalOpen(true);
  }

  function openEdit(s) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      agent_url: s.agent_url || 'http://127.0.0.1:14446',
      agent_key: s.agent_key || '',
      game_db_name: s.game_db_name || 'ngocrong',
      game_port: s.game_port || 14445,
    });
    setTestResult(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api(`/servers/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        fb.success(`Đã cập nhật máy chủ "${form.name}" thành công!`);
      } else {
        await api('/servers', { method: 'POST', body: JSON.stringify(form) });
        fb.success(`Đã thêm máy chủ mới "${form.name}" thành công!`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Xóa cấu hình máy chủ "${name}" (ID #${id}) khỏi Web Panel?`)) return;
    try {
      await api(`/servers/${id}`, { method: 'DELETE' });
      fb.success(`Đã xóa server "${name}" thành công!`);
      load();
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function handleTestAgent() {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api('/servers/test-agent', {
        method: 'POST',
        body: JSON.stringify({ agent_url: form.agent_url, agent_key: form.agent_key }),
      });
      setTestResult({ ok: true, msg: res.data?.message || 'Kết nối Agent thành công 100%!' });
    } catch (err) {
      setTestResult({ ok: false, msg: err.message || 'Không thể kết nối đến Agent URL.' });
    } finally {
      setTestingConnection(false);
    }
  }

  const currentActiveId = getServerId();
  const onlineCount = Object.values(pings).filter((s) => s.status === 'ok').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Cụm Máy Chủ (Servers Management)"
        description="Quản lý đa máy chủ (Multi-Server Cluster), theo dõi trạng thái Panel Agent, kiểm tra độ trễ (Ping) và chuyển đổi server làm việc."
        stats={
          <>
            <span className="page-stat-pill">
              <strong>{servers.length}</strong> máy chủ
            </span>
            <span className="page-stat-pill ok">
              <strong>{onlineCount}</strong> đang trực tuyến
            </span>
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn primary" onClick={openCreate}>
              ➕ Thêm Máy Chủ Mới
            </button>
            <button type="button" className="btn" onClick={() => servers.forEach((s) => ping(s.id))}>
              🔄 Ping Tất Cả
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* DANH SÁCH SERVER CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {servers.map((s) => {
          const isCurrent = s.id === currentActiveId;
          const pingData = pings[s.id];
          const isOnline = pingData?.status === 'ok';
          const isPinging = pinging[s.id];

          return (
            <div
              key={s.id}
              className="card"
              style={{
                padding: '20px',
                borderRadius: '16px',
                border: isCurrent ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isCurrent
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)'
                  : 'rgba(30, 41, 59, 0.6)',
                boxShadow: isCurrent ? '0 0 20px rgba(59, 130, 246, 0.25)' : undefined,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                position: 'relative',
              }}
            >
              {/* HEADER */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem' }}>🖥️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: isCurrent ? '#60a5fa' : 'var(--text)' }}>
                      {fixMojibake(s.name)}
                    </h3>
                    <span className="muted" style={{ fontSize: '0.78rem' }}>ID Máy Chủ: #{s.id}</span>
                  </div>
                </div>

                <span
                  className={`badge ${isOnline ? 'ok' : 'bad'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#10b981' : '#ef4444' }} />
                  {isPinging ? 'Pinging...' : isOnline ? `Online (${pingData.ms}ms)` : 'Offline'}
                </span>
              </div>

              {/* DETAILS */}
              <div className="card-inner" style={{ padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Game Port:</span>
                  <strong>{s.game_port || 14445}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Cơ sở dữ liệu:</span>
                  <code>{s.game_db_name || 'ngocrong'}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Panel Agent URL:</span>
                  <code style={{ fontSize: '0.78rem' }}>{s.agent_url || '—'}</code>
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <button
                  type="button"
                  className={`btn sm ${isCurrent ? 'ok' : 'primary'}`}
                  disabled={isCurrent}
                  onClick={() => handleSelectServer(s.id, s.name)}
                  style={{ fontWeight: 600 }}
                >
                  {isCurrent ? '✓ Đang Quản Trị' : '🚀 Chọn Server Này'}
                </button>

                <div style={{ display: 'inline-flex', gap: '4px' }}>
                  <button type="button" className="btn sm ghost" onClick={() => ping(s.id)} title="Ping kiểm tra">
                    🔄 Ping
                  </button>
                  <button type="button" className="btn sm ghost" onClick={() => openEdit(s)} title="Chỉnh sửa thông số">
                    ✏️ Sửa
                  </button>
                  {servers.length > 1 && (
                    <button type="button" className="btn sm ghost danger" onClick={() => handleDelete(s.id, s.name)} title="Xóa server">
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL THÊM / SỬA SERVER */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <h3>{editingId ? `Chỉnh Sửa Server #${editingId}` : 'Thêm Máy Chủ Mới'}</h3>
              <button type="button" className="btn sm ghost" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div>
                <label className="label">Tên Máy Chủ:</label>
                <input
                  className="input"
                  required
                  placeholder="VD: Server 1 - Sao Băng"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px' }}>
                <div>
                  <label className="label">Agent URL (Panel Agent REST API):</label>
                  <input
                    className="input"
                    required
                    placeholder="http://127.0.0.1:14446"
                    value={form.agent_url}
                    onChange={(e) => setForm({ ...form, agent_url: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Game Port:</label>
                  <input
                    type="number"
                    className="input"
                    required
                    value={form.game_port}
                    onChange={(e) => setForm({ ...form, game_port: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Database Name (MySQL):</label>
                  <input
                    className="input"
                    required
                    value={form.game_db_name}
                    onChange={(e) => setForm({ ...form, game_db_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Agent Secret Key:</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Khóa bí mật Agent..."
                    value={form.agent_key}
                    onChange={(e) => setForm({ ...form, agent_key: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <button
                  type="button"
                  className="btn sm secondary"
                  disabled={testingConnection}
                  onClick={handleTestAgent}
                >
                  {testingConnection ? '⏳ Đang kiểm tra...' : '⚡ Thử Kết Nối Agent'}
                </button>
                {testResult && (
                  <span className={`badge sm ${testResult.ok ? 'ok' : 'bad'}`}>
                    {testResult.msg}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn primary">
                  {editingId ? 'Lưu Thay Đổi' : 'Tạo Máy Chủ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
