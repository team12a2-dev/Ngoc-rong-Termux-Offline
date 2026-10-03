import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import BossSpawnEditor, { parseBossSpawnConfig, serializeBossSpawnConfig } from '../components/BossSpawnEditor';
import { formatLiveSync } from '../utils/liveSync';

const FILES = [
  {
    name: 'Config.properties',
    label: '⚙️ Cấu Hình Máy Chủ (Config.properties)',
    hint: 'Cấu hình cốt lõi: tên server, game port, max player, exp rate, panel agent.',
    restart: 'Lưu ý: Thay đổi Port hoặc Max Player cần restart game server để áp dụng.',
  },
  {
    name: 'boss_spawn.properties',
    label: '👾 Lịch Spawn Boss (boss_spawn.properties)',
    hint: 'Lịch tự động hồi sinh boss theo các nhóm MINI, NORMAL, ELITE và WORLD.',
    restart: 'Lưu file — hệ thống tự động reload in-game không cần restart server.',
  },
  {
    name: 'maintenanceConfig.txt',
    label: '⏰ Lịch Bảo Trì (maintenanceConfig.txt)',
    hint: 'Cấu hình khung giờ bảo trì tự động định kỳ hàng ngày.',
    restart: 'Có thể điều chỉnh lịch bảo trì trực tiếp tại trang Server Control.',
  },
];

const QUICK_SECTIONS = [
  {
    title: '🎮 Cấu Hình Gameplay & EXP',
    desc: 'Thiết lập tên server, tỷ lệ nhân EXP cơ bản và mã định danh máy chủ',
    keys: [
      { key: 'server.name', label: 'Tên hiển thị Server', type: 'text', placeholder: 'Server 1' },
      { key: 'server.sv', label: 'Mã định danh Server (sv)', type: 'number' },
      { key: 'server.expserver', label: 'Tỉ lệ EXP cơ bản (EXP Rate)', type: 'number', hint: 'Ví dụ: 1 = x1, 5 = x5, 10 = x10' },
    ],
  },
  {
    title: '🌐 Kết Nối & Giới Hạn Server',
    desc: 'Cổng lắng nghe game socket và giới hạn số lượng kết nối đồng thời',
    keys: [
      { key: 'server.port', label: 'Game Socket Port', type: 'number', restart: true },
      { key: 'server.maxplayer', label: 'Giới hạn người chơi (Max Players)', type: 'number', restart: true },
      { key: 'server.maxperip', label: 'Số tài khoản tối đa / 1 IP', type: 'number' },
      { key: 'server.waitlogin', label: 'Thời gian chờ đăng nhập (giây)', type: 'number' },
    ],
  },
  {
    title: '🛡️ Panel Agent & Bảo Mật',
    desc: 'Kết nối an toàn giữa Web Panel và Game Server Engine',
    keys: [
      { key: 'panel.agent.enabled', label: 'Kích hoạt Panel Agent', type: 'select', options: ['true', 'false'] },
      { key: 'panel.agent.host', label: 'Agent Listen Host', type: 'text' },
      { key: 'panel.agent.key', label: 'Agent Secret Key', type: 'text' },
    ],
  },
];

function parseProperties(text) {
  const map = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) map[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return map;
}

function applyQuickEdits(text, edits) {
  const lines = (text || '').split('\n');
  const keys = Object.keys(edits);
  const found = new Set();
  const out = lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return line;
    const eq = t.indexOf('=');
    if (eq <= 0) return line;
    const k = t.slice(0, eq).trim();
    if (keys.includes(k)) {
      found.add(k);
      return `${k}=${edits[k]}`;
    }
    return line;
  });
  for (const k of keys) {
    if (!found.has(k)) out.push(`${k}=${edits[k]}`);
  }
  return out.join('\n');
}

function parseMaintenanceConfig(text) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    hour: lines[0] ?? '21',
    minute: lines[1] ?? '0',
    enabled: lines[2] === '1',
  };
}

function serializeMaintenanceConfig({ hour, minute, enabled }) {
  return `${Number(hour) || 0}\n${Number(minute) || 0}\n${enabled ? 1 : 0}\n`;
}

export default function ConfigPage() {
  const [file, setFile] = useState('Config.properties');
  const [content, setContent] = useState('');
  const [quick, setQuick] = useState({});
  const [mode, setMode] = useState('quick');
  const [maintRaw, setMaintRaw] = useState(false);
  const [spawnForm, setSpawnForm] = useState(() => parseBossSpawnConfig(''));
  const [maintForm, setMaintForm] = useState({ hour: 21, minute: 0, enabled: false });
  const [snapshots, setSnapshots] = useState([]);
  const [previewSnap, setPreviewSnap] = useState(null);
  const [saving, setSaving] = useState(false);
  const fb = useFeedback();

  async function load(name = file) {
    try {
      const res = await api(`/config/files/${encodeURIComponent(name)}?serverId=${getServerId()}`);
      const c = res.data?.content || '';
      setContent(c);
      if (name === 'Config.properties') {
        const parsed = parseProperties(c);
        const q = {};
        for (const sec of QUICK_SECTIONS) {
          for (const k of sec.keys) q[k.key] = parsed[k.key] ?? '';
        }
        setQuick(q);
      }
      if (name === 'boss_spawn.properties') {
        setSpawnForm(parseBossSpawnConfig(c));
      }
      if (name === 'maintenanceConfig.txt') {
        setMaintForm(parseMaintenanceConfig(c));
      }
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function loadSnapshots() {
    try {
      const res = await api('/config/snapshots');
      setSnapshots(res.data || []);
    } catch {
      setSnapshots([]);
    }
  }

  useEffect(() => {
    if (file === 'Config.properties') setMode('quick');
    else if (file === 'boss_spawn.properties') setMode('visual');
    else setMaintRaw(false);
    load();
    loadSnapshots();
  }, [file]);

  async function save(newContent = content, opts = {}) {
    setSaving(true);
    try {
      const res = await api(`/config/files/${encodeURIComponent(file)}?serverId=${getServerId()}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent }),
      });
      const syncNote = formatLiveSync(res);
      fb.success(opts.message || `Đã lưu cấu hình vào file thành công!${syncNote}`);
      setContent(newContent);
      loadSnapshots();
    } catch (e) {
      fb.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function saveQuick() {
    save(applyQuickEdits(content, quick), {
      message: 'Đã lưu Config.properties — Tỉ lệ EXP và Gameplay đã Live-Sync thành công in-game!',
    });
  }

  async function saveBossSpawn() {
    const next = mode === 'visual' ? serializeBossSpawnConfig(spawnForm) : content;
    try {
      setSaving(true);
      const res = await api(`/config/files/${encodeURIComponent(file)}?serverId=${getServerId()}`, {
        method: 'PUT',
        body: JSON.stringify({ content: next }),
      });
      setContent(next);
      setSpawnForm(parseBossSpawnConfig(next));
      loadSnapshots();
      fb.success(`Đã lưu lịch spawn boss và Live-Sync thành công in-game!${formatLiveSync(res)}`);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function saveMaintenance() {
    const text = maintRaw ? content : serializeMaintenanceConfig(maintForm);
    save(text, {
      message: 'Đã lưu và Live-Sync lịch bảo trì tự động vào Game Server thành công!',
    });
  }

  async function rollback(id) {
    if (!confirm('Khôi phục về bản chụp này? File hiện tại sẽ được thay thế.')) return;
    try {
      await api(`/config/snapshots/${id}/rollback?serverId=${getServerId()}`, { method: 'POST', body: '{}' });
      fb.success('Đã khôi phục thành công về bản snapshot!');
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  const fileMeta = FILES.find((f) => f.name === file);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Cấu Hình Hệ Thống (Config Studio)"
        description="Quản lý các file cấu hình Config.properties, Boss Spawn và Lịch bảo trì. Tự động sao lưu bản chụp (Snapshot) trước mỗi lần ghi đè."
        stats={
          <>
            <span className="page-stat-pill">
              Port: <strong>{quick['server.port'] || 14445}</strong>
            </span>
            <span className="page-stat-pill ok">
              EXP: <strong>x{quick['server.expserver'] || 1}</strong>
            </span>
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/server" className="btn secondary">
              🎮 Server Control
            </Link>
            <button type="button" className="btn primary" onClick={() => load()}>
              🔄 Tải Lại File
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* 3 NÚT CHỌN FILE CẤU HÌNH */}
      <div className="card" style={{ padding: '14px 18px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {FILES.map((f) => (
            <button
              key={f.name}
              type="button"
              className={`btn sm ${file === f.name ? 'primary' : 'ghost'}`}
              style={{
                fontWeight: file === f.name ? 700 : 500,
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '0.92rem',
              }}
              onClick={() => setFile(f.name)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {fileMeta && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <strong style={{ color: '#93c5fd', fontSize: '0.9rem' }}>{fileMeta.hint}</strong>
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{fileMeta.restart}</div>
          </div>
        )}
      </div>

      {/* NỘI DUNG TỪNG FILE */}
      {file === 'Config.properties' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* SWITCH CHẾ ĐỘ VISUAL VS RAW */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn sm ${mode === 'quick' ? 'primary' : 'ghost'}`}
                onClick={() => setMode('quick')}
              >
                🎨 Chế Độ Trực Quan (Visual Studio)
              </button>
              <button
                type="button"
                className={`btn sm ${mode === 'raw' ? 'primary' : 'ghost'}`}
                onClick={() => setMode('raw')}
              >
                📝 Soạn Thảo File Gốc (Raw Editor)
              </button>
            </div>

            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={mode === 'quick' ? saveQuick : () => save(content)}
              style={{ fontWeight: 700, padding: '8px 22px' }}
            >
              {saving ? '⏳ Đang Lưu...' : '💾 Lưu Config.properties'}
            </button>
          </div>

          {mode === 'quick' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              {QUICK_SECTIONS.map((sec, si) => (
                <div key={si} className="card" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#60a5fa' }}>{sec.title}</h3>
                    <p className="muted" style={{ margin: '3px 0 0 0', fontSize: '0.82rem' }}>{sec.desc}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sec.keys.map((k) => (
                      <div key={k.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className="label" style={{ margin: 0, fontSize: '0.88rem' }}>{k.label}:</label>
                          {k.restart && <span className="badge sm warn">Cần Restart</span>}
                        </div>

                        {k.type === 'select' ? (
                          <select
                            className="input sm"
                            value={quick[k.key] ?? ''}
                            onChange={(e) => setQuick({ ...quick, [k.key]: e.target.value })}
                          >
                            {k.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={k.type}
                            className="input sm"
                            value={quick[k.key] ?? ''}
                            placeholder={k.placeholder || ''}
                            onChange={(e) => setQuick({ ...quick, [k.key]: e.target.value })}
                          />
                        )}

                        {k.hint && <div className="muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>{k.hint}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: '16px', borderRadius: '14px' }}>
              <textarea
                className="input"
                rows="20"
                style={{ width: '100%', fontFamily: 'Consolas, monospace', fontSize: '0.88rem' }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* FILE BOSS SPAWN */}
      {file === 'boss_spawn.properties' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn sm ${mode === 'visual' ? 'primary' : 'ghost'}`}
                onClick={() => setMode('visual')}
              >
                🎨 Chế Độ Trực Quan
              </button>
              <button
                type="button"
                className={`btn sm ${mode === 'raw' ? 'primary' : 'ghost'}`}
                onClick={() => setMode('raw')}
              >
                📝 File Thô
              </button>
            </div>

            <button type="button" className="btn primary" disabled={saving} onClick={saveBossSpawn} style={{ fontWeight: 700 }}>
              {saving ? '⏳ Đang Lưu...' : '💾 Lưu & Live-Sync Boss Spawn'}
            </button>
          </div>

          {mode === 'visual' ? (
            <div className="card" style={{ padding: '20px', borderRadius: '14px' }}>
              <BossSpawnEditor config={spawnForm} onChange={setSpawnForm} />
            </div>
          ) : (
            <div className="card" style={{ padding: '16px', borderRadius: '14px' }}>
              <textarea
                className="input"
                rows="18"
                style={{ width: '100%', fontFamily: 'Consolas, monospace', fontSize: '0.88rem' }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* FILE MAINTENANCE */}
      {file === 'maintenanceConfig.txt' && (
        <div className="card" style={{ padding: '22px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Cấu Hình Lịch Bảo Trì Tự Động</h3>
            <button type="button" className="btn primary" disabled={saving} onClick={saveMaintenance}>
              {saving ? '⏳ Đang Lưu...' : '💾 Lưu Lịch Bảo Trì'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 120px auto', gap: '14px', alignItems: 'end' }}>
            <div>
              <label className="label">Giờ (0 - 23):</label>
              <input
                type="number"
                min={0}
                max={23}
                className="input"
                value={maintForm.hour}
                onChange={(e) => setMaintForm({ ...maintForm, hour: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Phút (0 - 59):</label>
              <input
                type="number"
                min={0}
                max={59}
                className="input"
                value={maintForm.minute}
                onChange={(e) => setMaintForm({ ...maintForm, minute: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={maintForm.enabled}
                  onChange={(e) => setMaintForm({ ...maintForm, enabled: e.target.checked })}
                />
                <strong>Bật tự động bảo trì hàng ngày</strong>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* LỊCH SỬ SNAPSHOTS ĐÃ LƯU */}
      {snapshots.length > 0 && (
        <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📸 Bản Chụp Tự Động (Snapshots &amp; Rollback)</h3>
            <span className="muted" style={{ fontSize: '0.8rem' }}>{snapshots.length} bản sao lưu</span>
          </div>

          <div className="table-wrap card-inner" style={{ padding: 0, borderRadius: '10px', overflow: 'hidden' }}>
            <table className="compact" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Tên File</th>
                  <th>Thời Gian Sao Lưu</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.slice(0, 10).map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td>#{s.id}</td>
                    <td><code>{s.file_name}</code></td>
                    <td className="muted">{new Date(s.created_at).toLocaleString('vi-VN')}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn sm danger ghost"
                        onClick={() => rollback(s.id)}
                        title="Khôi phục file về thời điểm này"
                      >
                        Khôi phục
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
