import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, getServerId } from '../api';

import PlayerDetailPanel from '../components/PlayerDetailPanel';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const GENDERS = [
  { value: '', label: 'Tất cả hành tinh' },
  { value: '0', label: 'Trái Đất' },
  { value: '1', label: 'Namek' },
  { value: '2', label: 'Xayda' },
];

const SORTS = [
  { value: 'power_desc', label: '⚡ Sức mạnh (Cao ↓ Thấp)' },
  { value: 'power_asc', label: '🌱 Sức mạnh (Thấp ↑ Cao)' },
  { value: 'id_desc', label: '🆕 Mới tạo gần đây' },
  { value: 'name_asc', label: '🔤 Tên từ A đến Z' },
];

function genderBadgeInfo(g) {
  if (g === 0 || g === '0' || g === 'Trái Đất') return { label: 'Trái Đất', cls: 'earth', bg: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' };
  if (g === 1 || g === '1' || g === 'Namek') return { label: 'Namek', cls: 'namek', bg: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' };
  if (g === 2 || g === '2' || g === 'Xayda') return { label: 'Xayda', cls: 'xayda', bg: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' };
  return { label: 'Chung', cls: 'neutral', bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' };
}

function fmtNum(n) {
  const num = Number(n || 0);
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Tỷ';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + ' Tr';
  return num.toLocaleString('vi-VN');
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ accountId: '', name: '', gender: '0', head: '0' });

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
      const list = res.data || [];
      setRows(list);
      return list;
    } catch (err) {
      fb.error(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function createCharacter(e) {
    e.preventDefault();
    try {
      const res = await api('/players', {
        method: 'POST',
        body: JSON.stringify({
          accountId: Number(createForm.accountId),
          name: createForm.name,
          gender: Number(createForm.gender),
          head: Number(createForm.head),
          serverId: getServerId(),
        }),
      });
      const created = res.data?.player;
      fb.success(`Đã tạo nhân vật ${created?.name || createForm.name} thành công!`);
      setCreateOpen(false);
      setCreateForm({ accountId: '', name: '', gender: '0', head: '0' });
      const list = await search();
      if (created?.id) await loadDetail(created.id);
      else if (list[0]) await loadDetail(list[0].id);
    } catch (err) {
      fb.error(err.message);
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

  // Cứu kẹt map nhanh
  async function quickRescue(id, name, e) {
    e?.stopPropagation();
    try {
      await api(`/players/${id}/rescue`, { method: 'POST' });
      fb.success(`Đã giải cứu nhân vật "${name}" về làng an toàn!`);
      if (selectedId === id) loadDetail(id);
    } catch (err) {
      fb.error(err.message);
    }
  }

  useEffect(() => {
    search();
  }, [gender, sort]);

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

  // Thống kê nhanh
  const stats = useMemo(() => {
    let earth = 0;
    let namek = 0;
    let xayda = 0;
    rows.forEach((p) => {
      const g = String(p.gender);
      if (g === '0') earth++;
      else if (g === '1') namek++;
      else if (g === '2') xayda++;
    });
    return { total: rows.length, earth, namek, xayda };
  }, [rows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Người Chơi (Player Database Studio)"
        description="Tra cứu dữ liệu chuyên sâu, chỉnh sửa chỉ số HP/KI/SĐG, hành trang, rương đồ, kỹ năng, cứu kẹt map và quản trị tài khoản."
        stats={
          <>
            <span className="page-stat-pill">
              <strong>{stats.total}</strong> nhân vật tải
            </span>
            <span className="page-stat-pill ok">
              TD: <strong>{stats.earth}</strong> · NM: <strong>{stats.namek}</strong> · XD: <strong>{stats.xayda}</strong>
            </span>
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => setCreateOpen(!createOpen)}
            >
              {createOpen ? '✕ Đóng Tạo Nhân Vật' : '➕ Tạo Nhân Vật Mới'}
            </button>
            <button type="button" className="btn" onClick={() => search()}>
              🔄 Tải Lại
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* FORM TẠO NHÂN VẬT POPUP */}
      {createOpen && (
        <form
          className="card"
          style={{ padding: '18px 22px', borderRadius: '14px', border: '1px solid #3b82f6' }}
          onSubmit={createCharacter}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <strong style={{ fontSize: '1.1rem', color: '#60a5fa' }}>➕ Tạo Nhân Vật Mới Trong Database</strong>
            <button type="button" className="btn sm ghost" onClick={() => setCreateOpen(false)}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label className="label">Account ID:</label>
              <input
                type="number"
                className="input sm"
                min="1"
                required
                placeholder="ID tài khoản đăng ký..."
                value={createForm.accountId}
                onChange={(e) => setCreateForm({ ...createForm, accountId: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Tên Nhân Vật:</label>
              <input
                className="input sm"
                minLength="4"
                maxLength="12"
                required
                placeholder="Tên không dấu..."
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Hành Tinh:</label>
              <select
                className="input sm"
                value={createForm.gender}
                onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
              >
                <option value="0">Trái Đất (TD)</option>
                <option value="1">Namek (NM)</option>
                <option value="2">Xayda (XD)</option>
              </select>
            </div>
            <div>
              <label className="label">Head / Tóc:</label>
              <input
                type="number"
                className="input sm"
                min="0"
                value={createForm.head}
                onChange={(e) => setCreateForm({ ...createForm, head: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button className="btn primary sm" type="submit">
              Xác Nhận &amp; Nạp Dữ Liệu Khởi Tạo
            </button>
          </div>
        </form>
      )}

      {/* WORKSPACE BỐ CỤC 2 CỘT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(500px, 2.2fr)', gap: '20px', alignItems: 'start' }}>
        {/* CỘT DANH SÁCH PLAYERS BÊN TRÁI */}
        <div className="card" style={{ padding: '18px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* THANH TÌM KIẾM */}
          <form onSubmit={search} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                className="input sm"
                style={{ width: '100%' }}
                placeholder="🔍 Tìm Tên / ID / Account ID / Username..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn primary sm" type="submit" disabled={loading}>
                {loading ? '...' : 'Tìm'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select className="input sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <select className="input sm" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </form>

          {/* LIST PLAYERS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '720px', overflowY: 'auto' }}>
            {loading && rows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>⏳ Đang tải...</div>
            ) : rows.length === 0 ? (
              <div className="card-inner" style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                Không tìm thấy nhân vật nào phù hợp.
              </div>
            ) : (
              rows.map((p) => {
                const isSelected = selectedId === p.id;
                const gBadge = genderBadgeInfo(p.gender);
                return (
                  <div
                    key={p.id}
                    onClick={() => loadDetail(p.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.06)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '1rem', color: isSelected ? '#60a5fa' : 'var(--text)' }}>
                          {p.name}
                        </strong>
                        {p.ban ? <span title="Tài khoản bị khóa">⛔</span> : null}
                      </div>
                      <span className="badge sm" style={{ background: gBadge.bg, color: gBadge.color }}>
                        {gBadge.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <div>
                        <span className="muted">Sức mạnh: </span>
                        <strong style={{ color: '#38bdf8' }}>{fmtNum(p.power)}</strong>
                      </div>
                      <div>
                        <span className="muted">Số dư: </span>
                        <strong style={{ color: '#34d399' }}>{Number(p.vnd || 0).toLocaleString()} đ</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.75rem' }}>
                      <span className="muted">
                        ID: <strong>#{p.id}</strong> · Acc: <strong>{p.username || `#${p.account_id}`}</strong>
                      </span>
                      <button
                        type="button"
                        className="btn sm ghost"
                        style={{ padding: '1px 6px', fontSize: '0.72rem', color: '#10b981' }}
                        onClick={(e) => quickRescue(p.id, p.name, e)}
                        title="Đưa nhân vật về nhà ngay lập tức nếu bị kẹt map"
                      >
                        🚑 Cứu Kẹt
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT CHI TIẾT NHÂN VẬT BÊN PHẢI */}
        <div style={{ minWidth: 0 }}>
          {selected ? (
            <PlayerDetailPanel
              player={selected}
              onRefresh={() => loadDetail(selected.id)}
              onMessage={(text, type) => (type === 'error' ? fb.error(text) : fb.success(text))}
              onDeleted={() => {
                setSelected(null);
                setSelectedId(null);
                search();
              }}
            />
          ) : (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)', borderRadius: '14px' }}>
              <span style={{ fontSize: '3rem' }}>👤</span>
              <h3 style={{ marginTop: '12px' }}>Chưa Chọn Nhân Vật</h3>
              <p className="muted" style={{ maxWidth: '400px', margin: '6px auto 0 auto', fontSize: '0.88rem' }}>
                Bấm vào một nhân vật trong danh sách bên trái để mở bảng quản lý chi tiết: chỉ số HP, KI, SĐG, hành trang, rương đồ, đệ tử và cứu kẹt map.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
