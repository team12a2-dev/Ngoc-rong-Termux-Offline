import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import ClanIcon from '../components/ClanIcon';

const ROLES = [
  { value: 0, label: '👑 Bang chủ' },
  { value: 1, label: '⚔️ Phó bang' },
  { value: 2, label: '🛡️ Thành viên' },
];

function formatTime(ts) {
  if (ts == null || ts === '') return '—';
  if (ts instanceof Date) return ts.toLocaleDateString('vi-VN');
  const n = Number(ts);
  if (Number.isFinite(n) && n > 1e12) return new Date(n).toLocaleDateString('vi-VN');
  if (Number.isFinite(n) && n > 0) return new Date(n * 1000).toLocaleDateString('vi-VN');
  const d = new Date(String(ts));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
}

function buildDissolvePreview(clan, reason) {
  const lines = [
    '[Hệ thống] Thông báo Ban Quản Trị',
    `Bang hội "${clan.NAME}" (ID: ${clan.id}) đã chính thức bị giải tán.`,
  ];
  if (reason.trim()) lines.push(`Lý do: ${reason.trim()}`);
  lines.push('Mọi thành viên đã được giải phóng khỏi bang. Cảm ơn sự đồng hành!');
  return lines.join('\n');
}

function MemberRow({ member, clanId, onUpdated, onFeedback }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(member.role);
  const [donate, setDonate] = useState(member.donate ?? 0);
  const [clanPoint, setClanPoint] = useState(member.clan_point ?? 0);
  const [memberPoint, setMemberPoint] = useState(member.member_point ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRole(member.role);
    setDonate(member.donate ?? 0);
    setClanPoint(member.clan_point ?? 0);
    setMemberPoint(member.member_point ?? 0);
  }, [member]);

  async function save() {
    setSaving(true);
    try {
      const res = await api(`/clans/${clanId}/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          role: Number(role),
          donate: Number(donate),
          clan_point: Number(clanPoint),
          member_point: Number(memberPoint),
        }),
      });
      onUpdated?.(res.data);
      onFeedback?.('Đã cập nhật thành viên thành công!', 'success');
      setEditing(false);
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function kick() {
    if (!confirm(`Đuổi "${member.name}" khỏi bang hội?`)) return;
    setSaving(true);
    try {
      const res = await api(`/clans/${clanId}/members/${member.id}`, { method: 'DELETE' });
      onUpdated?.(res.data);
      onFeedback?.(`Đã đuổi "${member.name}" khỏi bang!`, 'success');
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <tr style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
        <td>
          <strong>{member.name || `#${member.id}`}</strong>
        </td>
        <td>
          <select className="input sm" value={role} onChange={(e) => setRole(Number(e.target.value))}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </td>
        <td className="muted">{Number(member.power || 0).toLocaleString()}</td>
        <td>
          <input
            type="number"
            className="input sm"
            style={{ width: '90px' }}
            value={donate}
            onChange={(e) => setDonate(Number(e.target.value))}
          />
        </td>
        <td>
          <input
            type="number"
            className="input sm"
            style={{ width: '90px' }}
            value={clanPoint}
            onChange={(e) => setClanPoint(Number(e.target.value))}
          />
        </td>
        <td>
          <input
            type="number"
            className="input sm"
            style={{ width: '90px' }}
            value={memberPoint}
            onChange={(e) => setMemberPoint(Number(e.target.value))}
          />
        </td>
        <td style={{ textAlign: 'center' }}>
          <button type="button" className="btn sm primary" disabled={saving} onClick={save}>Lưu</button>{' '}
          <button type="button" className="btn sm ghost" onClick={() => setEditing(false)}>Hủy</button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <td>
        <Link to={`/players-db?open=${member.id}`} style={{ fontWeight: 600, color: '#60a5fa' }}>
          {member.name || `Player #${member.id}`}
        </Link>
        <span className="muted" style={{ marginLeft: '6px', fontSize: '0.75rem' }}>#{member.id}</span>
      </td>
      <td>
        <span
          className={`badge sm ${
            member.role === 0 ? 'ok' : member.role === 1 ? 'admin' : 'secondary'
          }`}
        >
          {ROLES.find((r) => r.value === member.role)?.label || 'Thành viên'}
        </span>
      </td>
      <td><strong style={{ color: '#38bdf8' }}>{Number(member.power || 0).toLocaleString()}</strong></td>
      <td>{Number(member.donate || 0).toLocaleString()}</td>
      <td>{Number(member.clan_point || 0).toLocaleString()}</td>
      <td>{Number(member.member_point || 0).toLocaleString()}</td>
      <td style={{ textAlign: 'center' }}>
        <button type="button" className="btn sm ghost" onClick={() => setEditing(true)} title="Chỉnh sửa chức vụ, điểm">
          ✏️ Sửa
        </button>{' '}
        <button type="button" className="btn sm ghost danger" onClick={kick} title="Đuổi khỏi bang">
          ✕ Đuổi
        </button>
      </td>
    </tr>
  );
}

export default function ClansPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editSlogan, setEditSlogan] = useState('');
  const [editFlag, setEditFlag] = useState(0);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [dissolveReason, setDissolveReason] = useState('');
  const [dissolveConfirm, setDissolveConfirm] = useState(false);
  const [dissolveConfirmText, setDissolveConfirmText] = useState('');
  const fb = useFeedback();

  async function loadList(query = '') {
    setLoading(true);
    try {
      const qs = query ? `?q=${encodeURIComponent(query)}` : '';
      const res = await api(`/clans${qs}`);
      setRows(res.data || []);
      if (!selectedId && res.data?.[0]) {
        open(res.data[0].id);
      }
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function open(id) {
    try {
      const res = await api(`/clans/${id}`);
      setSelectedId(id);
      setDetail(res.data);
      setEditSlogan(res.data.slogan || '');
      setEditFlag(res.data.img_id ?? 0);
      setDissolveReason('');
      setDissolveConfirm(false);
      setDissolveConfirmText('');
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function saveClan() {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await api(`/clans/${detail.id}`, {
        method: 'PUT',
        body: JSON.stringify({ slogan: editSlogan, img_id: Number(editFlag) }),
      });
      setDetail(res.data);
      fb.success('Đã cập nhật thông tin bang hội vào Database MySQL!');
      loadList(q);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function isDissolveConfirmed() {
    if (!detail) return false;
    const typed = dissolveConfirmText.trim();
    const name = String(detail.NAME ?? '').trim();
    return typed === name || typed === String(detail.id);
  }

  async function syncInGame() {
    setSyncing(true);
    try {
      const res = await api('/clans/reload-sync', {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      fb.success(res.data?.message || 'Đã đồng bộ toàn bộ bang hội in-game thành công!');
    } catch (e) {
      fb.error(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function dissolveClan() {
    if (!detail || !dissolveConfirm) return;
    if (!isDissolveConfirmed()) {
      fb.error(`Vui lòng nhập đúng tên bang "${String(detail.NAME ?? '').trim()}" hoặc ID ${detail.id} để xác nhận!`);
      return;
    }
    setDissolving(true);
    try {
      const res = await api('/clans/dissolve', {
        method: 'POST',
        body: JSON.stringify({
          clanId: detail.id,
          reason: dissolveReason,
          serverId: getServerId(),
        }),
      });
      fb.success(`Đã giải tán bang "${detail.NAME}" — giải phóng ${res.data?.memberCount ?? 0} thành viên!`);
      setDetail(null);
      setSelectedId(null);
      loadList(q);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setDissolving(false);
    }
  }

  const members = useMemo(
    () => (Array.isArray(detail?.membersParsed) ? detail.membersParsed : []),
    [detail]
  );

  const stats = useMemo(
    () => ({
      total: rows.length,
      totalPower: rows.reduce((s, c) => s + Number(c.power_point || 0), 0),
      maxLevel: rows.reduce((max, c) => Math.max(max, Number(c.LEVEL || 1)), 1),
    }),
    [rows]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Bang Hội (Clan Studio)"
        description="Quản lý thành viên, thăng/hạ chức vụ, đổi cờ hiệu, slogan và giải tán bang hội an toàn."
        stats={
          <>
            <span className="page-stat-pill">
              <strong>{stats.total}</strong> bang hội
            </span>
            <span className="page-stat-pill ok">
              Cấp cao nhất: <strong>Lv.{stats.maxLevel}</strong>
            </span>
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn secondary" disabled={syncing} onClick={syncInGame}>
              {syncing ? '⏳ Đang đồng bộ...' : '🚀 Đồng Bộ In-Game'}
            </button>
            <button type="button" className="btn primary" onClick={() => loadList(q)}>
              🔄 Làm Mới
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* KPI STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '14px', padding: '16px 20px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>🛡️ Tổng Số Bang Hội</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa', marginTop: '6px' }}>{stats.total}</div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Hoạt động trên toàn server</div>
        </div>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '16px 20px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>⚡ Tổng Lực Chiến Bang Hội</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>{stats.totalPower.toLocaleString()}</div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Tổng power điểm tất cả bang</div>
        </div>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '14px', padding: '16px 20px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>👑 Bang Hội Đang Chọn</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#facc15', marginTop: '6px' }}>{detail?.NAME || 'Chưa chọn'}</div>
          <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>{members.length} thành viên đang tham gia</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(500px, 2.4fr)', gap: '20px', alignItems: 'start' }}>
        {/* DANH SÁCH BANG HỘI BÊN TRÁI */}
        <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Danh Sách Bang</h3>
            <span className="muted" style={{ fontSize: '0.82rem' }}>{rows.length} bang</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadList(q);
            }}
            style={{ marginBottom: '14px', display: 'flex', gap: '6px' }}
          >
            <input
              className="input sm"
              style={{ width: '100%' }}
              placeholder="🔍 Tìm tên bang hoặc ID..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" className="btn sm">Tìm</button>
          </form>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>⏳ Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="card-inner" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
              Không tìm thấy bang hội nào.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '650px', overflowY: 'auto' }}>
              {rows.map((c) => {
                const isSelected = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => open(c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
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
                    <ClanIcon iconId={c.img_id} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.95rem', color: isSelected ? '#60a5fa' : 'var(--text)' }}>
                          {c.NAME}
                        </strong>
                        <span className="badge sm">Lv.{c.LEVEL || 1}</span>
                      </div>
                      <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                        ID #{c.id} · {c.curr_member || 0}/{c.max_member || 30} TV
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#38bdf8' }}>
                        {Number(c.power_point || 0).toLocaleString()}
                      </div>
                      <div className="muted" style={{ fontSize: '0.72rem' }}>Power</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* WORKSPACE CHI TIẾT BANG HỘI BÊN PHẢI */}
        {detail ? (
          <div className="card" style={{ padding: '22px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* BANG HEADER INFO */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <ClanIcon iconId={detail.img_id} size={48} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{detail.NAME}</h2>
                    <span className="badge ok">ID #{detail.id}</span>
                    <span className="badge">Cấp {detail.LEVEL || 1}</span>
                  </div>
                  <div className="muted" style={{ fontSize: '0.84rem', marginTop: '4px' }}>
                    Ngày lập: {formatTime(detail.create_time)} · Thành viên: {members.length} / {detail.max_member || 30} · Điểm bang: {Number(detail.clan_point || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <button type="button" className="btn sm secondary" onClick={() => open(detail.id)}>
                🔄 Cập nhật
              </button>
            </div>

            {/* FORM CHỈNH SỬA THÔNG TIN BANG */}
            <div className="card-inner" style={{ padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#93c5fd', marginBottom: '10px' }}>
                ⚙️ Cấu Hình Thông Tin Bang:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label className="label">Khẩu Hiệu (Slogan):</label>
                  <input
                    className="input sm"
                    value={editSlogan}
                    onChange={(e) => setEditSlogan(e.target.value)}
                    placeholder="Nhập khẩu hiệu bang..."
                  />
                </div>
                <div>
                  <label className="label">Cờ Bang (Icon ID):</label>
                  <input
                    type="number"
                    className="input sm"
                    value={editFlag}
                    onChange={(e) => setEditFlag(Number(e.target.value))}
                  />
                </div>
                <button type="button" className="btn sm primary" disabled={saving} onClick={saveClan}>
                  {saving ? '⏳ Đang Lưu...' : '💾 Lưu Slogan & Cờ'}
                </button>
              </div>
            </div>

            {/* DANH SÁCH THÀNH VIÊN */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ fontSize: '1.05rem', color: '#facc15' }}>
                  👥 Danh Sách Thành Viên ({members.length})
                </strong>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  Bấm Sửa để thăng/hạ chức hoặc thay đổi điểm đóng góp
                </span>
              </div>

              <div className="table-wrap card-inner" style={{ padding: 0, borderRadius: '10px', overflow: 'hidden' }}>
                <table className="compact" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid var(--border)' }}>
                      <th>Thành Viên</th>
                      <th>Chức Vụ</th>
                      <th>Sức Mạnh (Power)</th>
                      <th>Đóng Góp</th>
                      <th>Điểm Bang</th>
                      <th>Điểm TV</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        clanId={detail.id}
                        onUpdated={(updated) => setDetail(updated)}
                        onFeedback={(msg, type) => (type === 'error' ? fb.error(msg) : fb.success(msg))}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* KHU VỰC NGUY HIỂM: GIẢI TÁN BANG */}
            <div className="card-inner" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700 }}>
                <span>⚠️</span>
                <span>Giải Tán Bang Hội (Khu Vực Nguy Hiểm)</span>
              </div>
              <p className="muted" style={{ fontSize: '0.84rem', margin: '6px 0 12px 0' }}>
                Hành động này sẽ giải phóng toàn bộ thành viên, xóa dữ liệu bang hội khỏi Database MySQL và đồng bộ ngay lập tức in-game.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label className="label">Lý do giải tán (tùy chọn):</label>
                  <input
                    className="input sm"
                    value={dissolveReason}
                    onChange={(e) => setDissolveReason(e.target.value)}
                    placeholder="VD: Vi phạm quy định server, hoạt động tiêu cực..."
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="dissolve-chk"
                    checked={dissolveConfirm}
                    onChange={(e) => setDissolveConfirm(e.target.checked)}
                  />
                  <label htmlFor="dissolve-chk" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>
                    Tôi hiểu rằng hành động này không thể hoàn tác.
                  </label>
                </div>

                {dissolveConfirm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      className="input sm"
                      placeholder={`Gõ "${detail.NAME}" để xác nhận...`}
                      value={dissolveConfirmText}
                      onChange={(e) => setDissolveConfirmText(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn sm danger"
                      disabled={dissolving || !isDissolveConfirmed()}
                      onClick={dissolveClan}
                    >
                      {dissolving ? '⏳ Đang Giải Tán...' : 'Xác Nhận Giải Tán Bang'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)', borderRadius: '14px' }}>
            <span style={{ fontSize: '2.5rem' }}>🛡️</span>
            <p style={{ marginTop: '12px' }}>Hãy chọn một bang hội từ danh sách bên trái để quản lý chi tiết.</p>
          </div>
        )}
      </div>
    </div>
  );
}
