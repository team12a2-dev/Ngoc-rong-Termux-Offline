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
    hint: 'Cấu hình chính server: port, max player, EXP khởi động, Panel Agent.',
    restart: 'Port / max player cần restart game. EXP runtime chỉnh tại Server Control.',
  },
  {
    name: 'boss_spawn.properties',
    hint: 'Lịch spawn boss tự động theo tier MINI / NORMAL / ELITE / WORLD.',
    restart: 'Lưu file — boss spawn được reload in-game tự động.',
  },
  {
    name: 'maintenanceConfig.txt',
    hint: 'Cấu hình bảo trì tự động legacy (game hiện đã tắt AutoMaintenance).',
    restart: 'Khuyên dùng lịch bảo trì tại Server Control thay file này.',
  },
];

const QUICK_SECTIONS = [
  {
    title: 'Server game',
    keys: [
      { key: 'server.name', label: 'Tên server', type: 'text' },
      { key: 'server.sv', label: 'Server ID (sv)', type: 'number' },
      { key: 'server.port', label: 'Game port', type: 'number', restart: true },
      { key: 'server.maxplayer', label: 'Max player', type: 'number', restart: true },
      { key: 'server.maxperip', label: 'Max kết nối / IP', type: 'number' },
      { key: 'server.waitlogin', label: 'Chờ login (giây)', type: 'number' },
      { key: 'server.expserver', label: 'EXP rate (khi khởi động)', type: 'number', hint: 'EXP đang chạy: Server Control → EXP rate' },
    ],
  },
  {
    title: 'Panel Agent',
    keys: [
      { key: 'panel.agent.enabled', label: 'Bật Panel Agent', type: 'select', options: ['true', 'false'] },
      { key: 'panel.agent.host', label: 'Agent host', type: 'text' },
      { key: 'panel.agent.key', label: 'Agent key (bảo mật)', type: 'text' },
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
    try {
      const res = await api(`/config/files/${encodeURIComponent(file)}?serverId=${getServerId()}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent }),
      });
      const syncNote = formatLiveSync(res);
      fb.success(opts.message || `Đã lưu (snapshot tự động trước khi ghi)${syncNote}`);
      setContent(newContent);
      loadSnapshots();
    } catch (e) {
      fb.error(e.message);
    }
  }

  function saveQuick() {
    save(applyQuickEdits(content, quick), {
      message: 'Đã lưu Config.properties — restart server nếu đổi port/max player.',
    });
  }

  async function saveBossSpawn() {
    const next = mode === 'visual' ? serializeBossSpawnConfig(spawnForm) : content;
    try {
      const res = await api(`/config/files/${encodeURIComponent(file)}?serverId=${getServerId()}`, {
        method: 'PUT',
        body: JSON.stringify({ content: next }),
      });
      setContent(next);
      setSpawnForm(parseBossSpawnConfig(next));
      loadSnapshots();
      fb.success(`Đã lưu boss spawn${formatLiveSync(res)}`);
    } catch (e) {
      fb.error(e.message);
    }
  }

  function saveMaintenance() {
    const text = maintRaw ? content : serializeMaintenanceConfig(maintForm);
    save(text, {
      message: 'Đã lưu maintenanceConfig.txt — AutoMaintenance trong game hiện đang tắt.',
    });
  }

  async function rollback(id) {
    if (!confirm('Rollback về snapshot này? File hiện tại sẽ bị ghi đè.')) return;
    try {
      await api(`/config/snapshots/${id}/rollback?serverId=${getServerId()}`, { method: 'POST', body: '{}' });
      fb.success('Rollback OK — restart server nếu thay đổi port/max player');
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function previewSnapshot(id) {
    try {
      const res = await api(`/config/snapshots/${id}?serverId=${getServerId()}`);
      setPreviewSnap(res.data || null);
    } catch (e) {
      fb.error(e.message);
    }
  }

  const fileMeta = FILES.find((f) => f.name === file);

  return (
    <div>
      <PageHeader
        title="Cấu hình Server"
        description="Chỉnh file config qua form trực quan hoặc editor — mỗi lần lưu tự tạo snapshot để rollback an toàn."
      />

      <div className="help-box">
        <h4>Cách vận hành</h4>
        <ul>
          <li>Chọn <strong>file config</strong> bên dưới — mỗi file phục vụ mục đích khác nhau.</li>
          <li><strong>Config.properties</strong>: form nhanh cho port, max player, agent. EXP đang chạy chỉnh tại <Link to="/server">Server Control</Link>.</li>
          <li><strong>boss_spawn.properties</strong>: dùng form trực quan (giống trang Boss) — bấm Lưu + Reload để áp dụng in-game ngay.</li>
          <li><strong>maintenanceConfig.txt</strong>: định dạng legacy 3 dòng. Khuyên lên lịch bảo trì tại <Link to="/server">Server Control</Link>.</li>
          <li>Mọi lần lưu tạo <strong>snapshot</strong> — có thể rollback nếu cấu hình sai.</li>
        </ul>
      </div>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="row">
        {FILES.map((f) => (
          <button key={f.name} type="button" className={`btn ${file === f.name ? 'primary' : ''}`} onClick={() => setFile(f.name)}>
            {f.name}
          </button>
        ))}
      </div>
      {fileMeta && (
        <>
          <p className="muted">{fileMeta.hint}</p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>{fileMeta.restart}</p>
        </>
      )}

      {file === 'Config.properties' && (
        <div className="editor-tabs">
          <button type="button" className={`tab ${mode === 'quick' ? 'active' : ''}`} onClick={() => setMode('quick')}>Form nhanh</button>
          <button type="button" className={`tab ${mode === 'raw' ? 'active' : ''}`} onClick={() => setMode('raw')}>Editor file</button>
        </div>
      )}

      {file === 'boss_spawn.properties' && (
        <div className="editor-tabs">
          <button type="button" className={`tab ${mode === 'visual' ? 'active' : ''}`} onClick={() => { if (mode === 'raw') setSpawnForm(parseBossSpawnConfig(content)); setMode('visual'); }}>Form trực quan</button>
          <button type="button" className={`tab ${mode === 'raw' ? 'active' : ''}`} onClick={() => { if (mode === 'visual') setContent(serializeBossSpawnConfig(spawnForm)); setMode('raw'); }}>Editor file</button>
        </div>
      )}

      {file === 'Config.properties' && mode === 'quick' && (
        <div className="control-card section">
          {QUICK_SECTIONS.map((sec) => (
            <div key={sec.title} style={{ marginBottom: 20 }}>
              <h3>{sec.title}</h3>
              <div className="config-quick-grid">
                {sec.keys.map((k) => (
                  <label key={k.key} className="field">
                    {k.label}
                    {k.type === 'select' ? (
                      <select value={quick[k.key] ?? ''} onChange={(e) => setQuick({ ...quick, [k.key]: e.target.value })}>
                        {(k.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={k.type}
                        value={quick[k.key] ?? ''}
                        onChange={(e) => setQuick({ ...quick, [k.key]: e.target.value })}
                      />
                    )}
                    {k.hint && <span className="muted" style={{ fontSize: '0.78rem' }}>{k.hint}</span>}
                    {k.restart && <span className="muted" style={{ fontSize: '0.78rem' }}>Cần restart server</span>}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button className="btn primary" onClick={saveQuick}>Lưu cài đặt</button>
        </div>
      )}

      {file === 'boss_spawn.properties' && mode === 'visual' && (
        <div className="control-card section boss-config-card">
          <p className="card-hint">Form theo tier boss — khớp BossSpawnConfig trong game. Chi tiết spawn thủ công tại <Link to="/boss">trang Boss</Link>.</p>
          <BossSpawnEditor config={spawnForm} onChange={setSpawnForm} />
          <div className="row spawn-save-row">
            <button className="btn" onClick={() => load()}>Hoàn tác</button>
            <button className="btn primary" onClick={() => saveBossSpawn()}>Lưu + áp dụng in-game</button>
          </div>
        </div>
      )}

      {file === 'maintenanceConfig.txt' && (
        <div className="control-card section">
          <h3>Bảo trì tự động (legacy)</h3>
          <p className="card-hint">
            File gồm 3 dòng: giờ (0–23), phút (0–59), bật (1) / tắt (0).
            AutoMaintenance trong game hiện <strong>đã vô hiệu hóa</strong> — dùng{' '}
            <Link to="/server">Server Control → Lịch bảo trì</Link> thay thế.
          </p>
          <div className="config-quick-grid">
            <label className="field">
              Giờ bảo trì (0–23)
              <input type="number" min={0} max={23} value={maintForm.hour} onChange={(e) => setMaintForm({ ...maintForm, hour: e.target.value })} />
            </label>
            <label className="field">
              Phút (0–59)
              <input type="number" min={0} max={59} value={maintForm.minute} onChange={(e) => setMaintForm({ ...maintForm, minute: e.target.value })} />
            </label>
            <label className="field toggle-empty">
              <input type="checkbox" checked={maintForm.enabled} onChange={(e) => setMaintForm({ ...maintForm, enabled: e.target.checked })} />
              Bật auto maintenance (legacy)
            </label>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setMaintRaw(!maintRaw)}>
              {maintRaw ? 'Form' : 'Xem file gốc'}
            </button>
            <button className="btn primary" onClick={saveMaintenance}>Lưu</button>
          </div>
          {maintRaw && (
            <textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} style={{ marginTop: 12 }} />
          )}
        </div>
      )}

      {((file === 'Config.properties' && mode === 'raw')
        || (file === 'boss_spawn.properties' && mode === 'raw')) && (
        <>
          <textarea rows={20} value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => load()}>Hoàn tác</button>
            <button className="btn primary" onClick={() => save()}>Lưu file</button>
            {file === 'boss_spawn.properties' && (
              <button className="btn" onClick={async () => {
                await save();
                try {
                  await api(`/servers/${getServerId()}/reload/boss-spawn`, { method: 'POST', body: '{}' });
                  fb.success('Đã reload boss spawn');
                } catch (e) { fb.error(e.message); }
              }}>Lưu + Reload</button>
            )}
          </div>
        </>
      )}

      <div className="card section">
        <h3>Snapshots (rollback)</h3>
        <p className="muted">50 bản ghi gần nhất — tự tạo mỗi lần lưu config.</p>
        {snapshots.length === 0 ? (
          <p className="muted">Chưa có snapshot.</p>
        ) : (
          <table className="compact">
            <thead><tr><th>File</th><th>Thời gian</th><th></th></tr></thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id}>
                  <td>{s.file_name}</td>
                  <td>{s.created_at}</td>
                  <td className="row">
                    <button className="btn sm" onClick={() => previewSnapshot(s.id)}>Xem</button>
                    <button className="btn sm" onClick={() => rollback(s.id)}>Rollback</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {previewSnap && (
        <div className="control-card section">
          <div className="section-head">
            <h3>Snapshot #{previewSnap.id} — {previewSnap.file_name}</h3>
            <button type="button" className="btn sm" onClick={() => setPreviewSnap(null)}>Đóng</button>
          </div>
          <pre>{previewSnap.content?.slice(0, 4000)}{(previewSnap.content?.length || 0) > 4000 ? '\n… (truncated)' : ''}</pre>
        </div>
      )}
    </div>
  );
}
