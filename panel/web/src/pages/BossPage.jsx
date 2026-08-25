import { useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import BossSpawnEditor, { parseBossSpawnConfig, serializeBossSpawnConfig } from '../components/BossSpawnEditor';

const BOSS_PRESETS = [
  { id: -27, label: 'Tiểu đội trưởng (-27)' },
  { id: -315, label: 'Tiểu đội trưởng NM (-315)' },
  { id: -1, label: 'Boss test (-1)' },
];

function formatCountdown(sec) {
  if (sec == null || sec < 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function statusBadgeClass(status) {
  if (status === 'REST') return 'warn';
  if (['ACTIVE', 'CHAT_S', 'AFK', 'JOIN_MAP', 'RESPAWN'].includes(status)) return 'ok';
  return 'bad';
}

export default function BossPage() {
  const [tab, setTab] = useState('monitor');
  const [configMode, setConfigMode] = useState('visual');
  const [bosses, setBosses] = useState([]);
  const [bossId, setBossId] = useState(-1);
  const [spawnConfig, setSpawnConfig] = useState('');
  const [spawnForm, setSpawnForm] = useState(() => parseBossSpawnConfig(''));
  const [autoRefresh, setAutoRefresh] = useState(true);
  const fb = useFeedback();

  async function load() {
    try {
      const res = await api(`/servers/${getServerId()}/boss/list`);
      setBosses(res.data || []);
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function loadSpawnConfig() {
    try {
      const res = await api(`/config/files/boss_spawn.properties?serverId=${getServerId()}`);
      const content = res.data?.content || '';
      setSpawnConfig(content);
      setSpawnForm(parseBossSpawnConfig(content));
    } catch (e) {
      fb.error(e.message);
    }
  }

  useEffect(() => {
    load();
    loadSpawnConfig();
  }, []);

  useEffect(() => {
    if (!autoRefresh || tab !== 'monitor') return undefined;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [autoRefresh, tab]);

  async function spawn() {
    try {
      await api(`/servers/${getServerId()}/boss/spawn`, { method: 'POST', body: JSON.stringify({ bossId: Number(bossId) }) });
      fb.success(`Đã spawn boss #${bossId}`);
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  function getContentToSave() {
    return configMode === 'visual' ? serializeBossSpawnConfig(spawnForm) : spawnConfig;
  }

  function syncVisualFromRaw() {
    setSpawnForm(parseBossSpawnConfig(spawnConfig));
  }

  function syncRawFromVisual() {
    setSpawnConfig(serializeBossSpawnConfig(spawnForm));
  }

  async function saveSpawnConfig() {
    const content = getContentToSave();
    if (!confirm('Lưu boss_spawn.properties và reload? Boss đang spawn có thể thay đổi.')) return;
    try {
      await api(`/config/files/boss_spawn.properties?serverId=${getServerId()}`, { method: 'PUT', body: JSON.stringify({ content }) });
      await api(`/servers/${getServerId()}/reload/boss-spawn`, { method: 'POST', body: '{}' });
      setSpawnConfig(content);
      setSpawnForm(parseBossSpawnConfig(content));
      fb.success('Đã lưu + reload boss spawn');
    } catch (e) {
      fb.error(e.message);
    }
  }

  function switchConfigMode(mode) {
    if (mode === configMode) return;
    if (mode === 'raw') syncRawFromVisual();
    else syncVisualFromRaw();
    setConfigMode(mode);
  }

  const onMap = bosses.filter((b) => b.mapId != null).length;
  const waiting = bosses.filter((b) => b.status === 'REST').length;
  const tdstBosses = bosses.filter((b) => b.group === 'TDST');

  return (
    <div>
      <PageHeader
        title="Boss Monitor & Spawn"
        description="Theo dõi boss online, spawn thủ công và chỉnh lịch spawn bằng form trực quan — không cần sửa file properties thủ công."
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

      <div className="status-pills">
        <span className="status-pill">Boss theo dõi <strong>{bosses.length}</strong></span>
        <span className="status-pill">Trên map <strong>{onMap}</strong></span>
        <span className="status-pill">Chờ spawn <strong>{waiting}</strong></span>
        <span className="status-pill">TDST <strong>{tdstBosses.length}</strong></span>
        <span className={`status-pill ${spawnForm.enabled ? 'ok' : 'warn'}`}>
          Spawn tự động <strong>{spawnForm.enabled ? 'BẬT' : 'TẮT'}</strong>
        </span>
      </div>

      <div className="editor-tabs">
        <button type="button" className={`tab ${tab === 'monitor' ? 'active' : ''}`} onClick={() => setTab('monitor')}>Theo dõi & Spawn</button>
        <button type="button" className={`tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>Cấu hình spawn</button>
      </div>

      {tab === 'monitor' && (
        <>
          <div className="control-card section">
            <h3>Spawn boss thủ công</h3>
            <p className="card-hint">Chọn preset hoặc nhập Boss ID (thường là số âm). Boss xuất hiện ngay trên server.</p>
            <div className="preset-row">
              {BOSS_PRESETS.map((b) => (
                <button key={b.id} type="button" className={`btn sm chip-btn ${bossId === b.id ? 'active' : ''}`} onClick={() => setBossId(b.id)}>
                  {b.label}
                </button>
              ))}
            </div>
            <div className="row">
              <label className="field">
                Boss ID
                <input type="number" value={bossId} onChange={(e) => setBossId(Number(e.target.value))} />
              </label>
              <button className="btn primary" onClick={spawn}>Spawn ngay</button>
            </div>
          </div>

                    <table className="boss-monitor-table">

            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>Nhóm</th>
                <th>Trạng thái</th>
                <th>Spawn sau</th>
                <th>HP</th>
                <th>Vị trí</th>
              </tr>
            </thead>
            <tbody>
              {bosses.map((b) => (
                <tr key={b.id} className={b.group === 'TDST' ? 'row-highlight' : ''}>
                  <td>{b.id}</td>
                  <td>{b.name}</td>
                  <td>{b.group || '—'}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass(b.status)}`}>{b.status}</span>
                    {b.spawnBlockReason && (
                      <div className="cell-sub">{b.spawnBlockReason}</div>
                    )}
                  </td>
                  <td>
                    {b.status === 'REST' && b.spawnCountdownSec != null ? (
                      <>
                        <strong>{formatCountdown(b.spawnCountdownSec)}</strong>
                        {b.spawnTier && <div className="cell-sub">tier {b.spawnTier}</div>}
                      </>
                    ) : '—'}
                  </td>
                  <td>{b.hp?.toLocaleString?.()}/{b.hpMax?.toLocaleString?.()}</td>
                  <td>
                    {b.mapId != null
                      ? `${b.mapName || 'Map ' + b.mapId} · khu ${b.zoneId}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
                    </table>
          <div className="boss-mobile-list">
            {bosses.map((b) => (
              <article key={`mobile-${b.id}`} className={`boss-mobile-card ${b.group === 'TDST' ? 'row-highlight' : ''}`}>
                <div className="boss-mobile-card-head">
                  <div><h4>{b.name || `Boss #${b.id}`}</h4><p className="mobile-card-sub">#{b.id} · {b.group || 'Không phân nhóm'}</p></div>
                  <span className={`badge ${statusBadgeClass(b.status)}`}>{b.status}</span>
                </div>
                <div className="mobile-meta-grid">
                  <div className="mobile-meta"><span>HP</span><strong>{b.hp?.toLocaleString?.()}/{b.hpMax?.toLocaleString?.()}</strong></div>
                  <div className="mobile-meta"><span>Spawn sau</span><strong>{b.status === 'REST' && b.spawnCountdownSec != null ? formatCountdown(b.spawnCountdownSec) : '—'}</strong></div>
                  <div className="mobile-meta"><span>Vị trí</span><strong>{b.mapId != null ? `${b.mapName || `Map ${b.mapId}`} · khu ${b.zoneId}` : '—'}</strong></div>
                  <div className="mobile-meta"><span>Tier</span><strong>{b.spawnTier || '—'}</strong></div>
                </div>
                {b.spawnBlockReason && <p className="mobile-card-sub">Lý do chờ: {b.spawnBlockReason}</p>}
              </article>
            ))}
          </div>
          {bosses.length === 0 && <div className="empty-state">Không có boss nào đang theo dõi.</div>}

        </>
      )}

      {tab === 'config' && (
        <div className="control-card boss-config-card">
          <div className="section-head">
            <div>
              <h3>Cấu hình boss_spawn.properties</h3>
              <p className="card-hint">Form trực quan theo tier MINI / NORMAL / ELITE / WORLD — khớp BossSpawnConfig trong game.</p>
            </div>
            <div className="editor-tabs">
              <button type="button" className={`tab ${configMode === 'visual' ? 'active' : ''}`} onClick={() => switchConfigMode('visual')}>Form dễ hiểu</button>
              <button type="button" className={`tab ${configMode === 'raw' ? 'active' : ''}`} onClick={() => switchConfigMode('raw')}>File gốc</button>
            </div>
          </div>

          {configMode === 'visual' ? (
            <BossSpawnEditor config={spawnForm} onChange={setSpawnForm} />
          ) : (
            <>
              <p className="card-hint">Chế độ nâng cao — chỉ dùng nếu cần sửa tay. Chuyển về Form để quay lại giao diện trực quan.</p>
              <textarea rows={18} value={spawnConfig} onChange={(e) => setSpawnConfig(e.target.value)} />
            </>
          )}

          <div className="row spawn-save-row">
            <button className="btn" onClick={loadSpawnConfig}>Hoàn tác</button>
            <button className="btn primary" onClick={saveSpawnConfig}>Lưu + Reload in-game</button>
          </div>
        </div>
      )}
    </div>
  );
}
