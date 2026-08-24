import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import PlayerDetailPanel from '../components/PlayerDetailPanel';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const GENDERS = [
  { value: '', label: 'Tất cả hệ' },
  { value: '0', label: 'Trái Đất' },
  { value: '1', label: 'Namek' },
  { value: '2', label: 'Xayda' },
];

const SORTS = [
  { value: 'id_desc', label: 'Mới nhất' },
  { value: 'power_desc', label: 'Power ↓' },
  { value: 'power_asc', label: 'Power ↑' },
  { value: 'name_asc', label: 'Tên A-Z' },
];

function genderClass(label) {
  if (label === 'Trái Đất') return 'earth';
  if (label === 'Namek') return 'namek';
  if (label === 'Xayda') return 'xayda';
  return 'neutral';
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('vi-VN');
}

export default function PlayerDbPage() {
  const location = useLocation();
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('');
  const [sort, setSort] = useState('power_desc');
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const fb = useFeedback();
  const [loading, setLoading] = useState(false);

  async function search(e, overrideQ) {
    e?.preventDefault();
    setLoading(true);
    fb.clear();
    const query = overrideQ ?? q;
    try {
      const params = new URLSearchParams({ sort, limit: '100' });
      if (String(query).trim()) params.set('q', String(query).trim());
      if (gender !== '') params.set('gender', gender);
      const res = await api(`/players/search?${params}`);
      setRows(res.data || []);
      return res.data || [];
    } catch (err) {
      fb.error(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id) {
    setSelectedId(id);
    try {
      const res = await api(`/players/${id}`);
      setSelected(res.data);
    } catch (err) {
      fb.error(err.message);
      setSelected(null);
    }
  }

  useEffect(() => { search(); }, []);

  useEffect(() => {
    const st = location.state;
    if (!st) return;
    if (st.playerId) {
      loadDetail(st.playerId);
    } else if (st.playerName) {
      setQ(st.playerName);
      search(null, st.playerName).then((list) => {
        const match = list.find((p) => p.name === st.playerName) || list[0];
        if (match) loadDetail(match.id);
      });
    }
  }, [location.state]);

  return (
    <div>
      <PageHeader
        title="Quản lý Player (Database)"
        description="Quản lý chuyên sâu: chỉ số, trang bị, kỹ năng, nhiệm vụ, buff, kick/ban, đồng bộ game — chọn player bên trái để mở panel chi tiết."
        stats={(
          <span className="page-stat-pill">
            <strong>{rows.length}</strong> kết quả
          </span>
        )}
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="split player-db">
        <div className="player-db-list-panel card">
          <div className="player-db-list-head">
            <h3>Danh sách player</h3>
            <span className="muted player-db-list-count">{rows.length} / 100</span>
          </div>

          <form className="player-db-filters" onSubmit={search}>
            <input placeholder="Tên / ID / account / username" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="player-db-filter-row">
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn primary" type="submit" disabled={loading}>{loading ? '...' : 'Tìm'}</button>
            </div>
          </form>

          <div className="player-db-list-scroll">
            {loading && rows.length === 0 && (
              <div className="player-db-list-empty">Đang tải...</div>
            )}
            {!loading && rows.length === 0 && (
              <div className="player-db-list-empty">Không có kết quả phù hợp.</div>
            )}
            {rows.map((p) => {
              const genderLabel = p.genderLabel || p.gender;
              return (
                <div
                  key={p.id}
                  className={`player-db-list-item${selectedId === p.id ? ' active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => loadDetail(p.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadDetail(p.id); }}
                >
                  <div className="player-db-item-top">
                    <div className="player-db-name-wrap">
                      <span className="player-db-name">{p.name}</span>
                      {p.ban ? <span className="player-db-ban" title="Đã ban">⛔</span> : null}
                    </div>
                    <span className={`player-gender-badge ${genderClass(genderLabel)}`}>{genderLabel}</span>
                  </div>
                  <div className="player-db-item-stats">
                    <div className="player-db-stat">
                      <span className="player-db-stat-label">Power</span>
                      <strong>{fmtNum(p.power)}</strong>
                    </div>
                    <div className="player-db-stat">
                      <span className="player-db-stat-label">VND</span>
                      <strong>{fmtNum(p.vnd)}</strong>
                    </div>
                  </div>
                  <div className="player-db-item-meta">
                    <span>ID <strong>{p.id}</strong></span>
                    <span className="muted">Acc {p.username || p.account_id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="player-db-detail-panel">
          {selected ? (
            <PlayerDetailPanel
              player={selected}
              onRefresh={() => loadDetail(selected.id)}
              onMessage={(text, type) => (type === 'error' ? fb.error(text) : fb.success(text))}
            />
          ) : (
            <div className="player-db-detail-empty card">
              <div className="player-db-detail-empty-icon" aria-hidden="true">👤</div>
              <h3>Chọn player để xem chi tiết</h3>
              <p className="muted">Bấm vào một player bên trái để chỉnh stats, trang bị, kỹ năng và thao tác kick/ban.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
