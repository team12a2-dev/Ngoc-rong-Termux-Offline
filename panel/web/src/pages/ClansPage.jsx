import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import ClanIcon from '../components/ClanIcon';

const ROLES = [
  { value: 0, label: 'Bang chủ' },
  { value: 1, label: 'Phó bang' },
  { value: 2, label: 'Thành viên' },
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
      onFeedback?.('Đã cập nhật thành viên', 'success');
      setEditing(false);
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function kick() {
    if (!confirm(`Đuổi "${member.name}" khỏi bang?`)) return;
    setSaving(true);
    try {
      const res = await api(`/clans/${clanId}/members/${member.id}`, { method: 'DELETE' });
      onUpdated?.(res.data);
      onFeedback?.('Đã đuổi thành viên', 'success');
    } catch (e) {
      onFeedback?.(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <tr className="clan-member-edit">
        <td>
          {member.id ? (
            <Link to={`/players?open=${member.id}`}>{member.name || `#${member.id}`}</Link>
          ) : (
            member.name || '—'
          )}
        </td>
        <td>
          <select value={role} onChange={(e) => setRole(Number(e.target.value))}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </td>
        <td className="muted">{Number(member.power || 0).toLocaleString()}</td>
        <td>
          <input type="number" min={0} value={donate} onChange={(e) => setDonate(Number(e.target.value))} />
        </td>
        <td>
          <input type="number" min={0} value={clanPoint} onChange={(e) => setClanPoint(Number(e.target.value))} />
        </td>
        <td className="muted">{formatTime(member.join_time)}</td>
        <td>
          <div className="row">
            <button type="button" className="btn sm primary" disabled={saving} onClick={save}>Lưu</button>
            <button type="button" className="btn sm" disabled={saving} onClick={() => setEditing(false)}>Hủy</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={member.role === 0 ? 'row-active' : ''}>
      <td>
        {member.id ? (
          <Link to={`/players?open=${member.id}`}>{member.name || `#${member.id}`}</Link>
        ) : (
          member.name || '—'
        )}
      </td>
      <td>
        <span className={`badge ${member.role === 0 ? 'admin' : member.role === 1 ? 'ok' : ''}`}>
          {member.roleLabel}
        </span>
      </td>
      <td>{Number(member.power || 0).toLocaleString()}</td>
      <td>{Number(member.donate || 0).toLocaleString()}</td>
      <td>{Number(member.clan_point || 0).toLocaleString()}</td>
      <td className="muted">{formatTime(member.join_time)}</td>
      <td>
        <div className="row">
          <button type="button" className="btn sm" disabled={saving} onClick={() => setEditing(true)}>Sửa</button>
          <button type="button" className="btn sm danger" disabled={saving} onClick={kick}>Đuổi</button>
        </div>
      </td>
    </tr>
  );
}

export default function ClansPage() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('power');
  const [rows, setRows] = useState([]);
  const [flags, setFlags] = useState([]);
  const [detail, setDetail] = useState(null);
  const [editSlogan, setEditSlogan] = useState('');
  const [editFlag, setEditFlag] = useState(0);
  const [dissolveReason, setDissolveReason] = useState('');
  const [dissolveConfirm, setDissolveConfirm] = useState(false);
  const [dissolveConfirmText, setDissolveConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fb = useFeedback();

  function onFeedback(msg, type) {
    if (type === 'error') fb.error(msg);
    else fb.success(msg);
  }

  async function loadList(searchQ = q) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, limit: '100' });
      if (searchQ.trim()) params.set('q', searchQ.trim());
      const res = await api(`/clans/search?${params}`);
      setRows(res.data || []);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFlags() {
    try {
      const res = await api('/clans/flags');
      setFlags(res.data || []);
    } catch {
      setFlags([]);
    }
  }

  useEffect(() => {
    loadList('');
    loadFlags();
  }, [sort]);

  async function search(e) {
    e?.preventDefault();
    loadList(q);
  }

  async function open(id) {
    try {
      const res = await api(`/clans/${id}`);
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
      fb.success('Đã cập nhật bang hội');
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
      fb.success(res.data?.message || 'Đã đồng bộ bang hội in-game');
    } catch (e) {
      fb.error(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function dissolveClan() {
    if (!detail || !dissolveConfirm) return;
    if (!isDissolveConfirmed()) {
      fb.error(`Nhập đúng tên bang "${String(detail.NAME ?? '').trim()}" hoặc ID ${detail.id}`);
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
      fb.success(`Đã giải tán bang "${detail.NAME}" in-game — ${res.data?.memberCount ?? 0} thành viên`);
      setDetail(null);
      loadList(q);
    } catch (e) {
      fb.error(e.message);
      if (String(e.message).includes('không tồn tại')) {
        setDetail(null);
        loadList(q);
      }
    } finally {
      setDissolving(false);
    }
  }

  const members = useMemo(
    () => (Array.isArray(detail?.membersParsed) ? detail.membersParsed : []),
    [detail]
  );

  const dissolvePreview = detail ? buildDissolvePreview(detail, dissolveReason) : '';

  const stats = useMemo(() => ({
    total: rows.length,
    totalPower: rows.reduce((s, c) => s + Number(c.power_point || 0), 0),
  }), [rows]);

  return (
    <div>
      <PageHeader
        title="Quản lý Bang hội"
        description="Chỉnh chức vụ, cống hiến thành viên — giải tán bang kèm thông báo toàn server."
        stats={(
          <>
            <span className="page-stat-pill"><strong>{stats.total}</strong> bang</span>
            <span className="page-stat-pill ok"><strong>{stats.totalPower.toLocaleString()}</strong> tổng power</span>
          </>
        )}
      >
        <button type="button" className="btn" disabled={syncing} onClick={syncInGame}>
          {syncing ? 'Đang đồng bộ...' : 'Đồng bộ in-game'}
        </button>
      </PageHeader>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="split clan-layout">
        <div className="clan-list-panel card">
          <div className="clan-list-head">
            <h3>Danh sách bang</h3>
            <span className="muted clan-list-count">{rows.length} / 100</span>
          </div>

          <form className="clan-filters" onSubmit={search}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên bang, ID..." />
            <div className="clan-filter-row">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="power">Power cao</option>
                <option value="level">Level cao</option>
                <option value="name">Tên A-Z</option>
              </select>
              <button className="btn primary" type="submit" disabled={loading}>{loading ? '...' : 'Tìm'}</button>
            </div>
          </form>

          <div className="clan-list-scroll">
            {loading && rows.length === 0 && (
              <div className="clan-list-empty">Đang tải...</div>
            )}
            {!loading && rows.length === 0 && (
              <div className="clan-list-empty">Không có bang hội phù hợp.</div>
            )}
            {rows.map((c) => (
              <div
                key={c.id}
                className={`clan-list-item${detail?.id === c.id ? ' active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => open(c.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(c.id); }}
              >
                <div className="clan-item-top">
                  <ClanIcon imgId={c.img_id} iconId={c.flag_icon_id} clanId={c.id} name={c.NAME} size={40} />
                  <div className="clan-item-title">
                    <strong>{c.NAME}</strong>
                    {c.flag_name && <span className="muted clan-flag-label">{c.flag_name}</span>}
                  </div>
                  <span className="clan-level-badge">Lv {c.LEVEL}</span>
                </div>
                <div className="clan-item-stats">
                  <div className="clan-stat">
                    <span className="clan-stat-label">Power</span>
                    <strong>{Number(c.power_point || 0).toLocaleString()}</strong>
                  </div>
                  <div className="clan-stat">
                    <span className="clan-stat-label">Thành viên</span>
                    <strong>{c.max_member ?? '—'}</strong>
                  </div>
                </div>
                <div className="clan-item-meta">
                  <span>ID <strong>#{c.id}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="clan-detail-panel">
          {!detail ? (
            <div className="clan-detail-empty card">
              <div className="clan-detail-empty-icon" aria-hidden="true">🛡</div>
              <h3>Chọn bang để quản lý</h3>
              <p className="muted">Bấm vào một bang bên trái để chỉnh slogan, cờ, thành viên hoặc giải tán.</p>
            </div>
          ) : (
            <div className="card clan-editor">
              <div className="clan-detail-head">
                <ClanIcon
                  imgId={detail.img_id}
                  iconId={detail.flag_icon_id}
                  clanId={detail.id}
                  name={detail.flag_name || detail.NAME}
                  size={72}
                />
                <div>
                  <h3>{detail.NAME}</h3>
                  {detail.NAME_2 && <p className="muted">Tên phụ: {detail.NAME_2}</p>}
                  <p className="muted">ID #{detail.id} · Cờ: {detail.flag_name || `#${detail.img_id}`}</p>
                  {detail.leader_name && (
                    <p className="muted">Bang chủ: <strong>{detail.leader_name}</strong></p>
                  )}
                </div>
              </div>

              <div className="info-panels clan-stats">
                <div className="info-panel">
                  <h4>Thống kê</h4>
                  <ul className="info-list">
                    <li><span>Level</span><strong>{detail.LEVEL}</strong></li>
                    <li><span>Power bang</span><strong>{Number(detail.power_point || 0).toLocaleString()}</strong></li>
                    <li><span>Điểm bang</span><strong>{Number(detail.clan_point || 0).toLocaleString()}</strong></li>
                    <li><span>Thành viên</span><strong>{members.length} / {detail.max_member ?? '—'}</strong></li>
                    <li><span>Ngày tạo</span><strong>{formatTime(detail.create_time)}</strong></li>
                  </ul>
                </div>
              </div>

              <details className="giftcode-info-collapse">
                <summary>Chỉnh slogan & cờ bang</summary>
                <div className="editor-panel">
                  <label className="field">
                    Slogan
                    <input value={editSlogan} onChange={(e) => setEditSlogan(e.target.value)} placeholder="Khẩu hiệu bang hội..." />
                  </label>
                  <div className="clan-flag-picker">
                    {flags.slice(0, 24).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`clan-flag-btn ${editFlag === f.id ? 'active' : ''}`}
                        title={f.name}
                        onClick={() => setEditFlag(f.id)}
                      >
                        <ClanIcon imgId={f.id} iconId={f.icon_id} name={f.name} size={32} />
                      </button>
                    ))}
                  </div>
                  <button className="btn primary" type="button" disabled={saving} onClick={saveClan}>
                    {saving ? 'Đang lưu...' : 'Lưu slogan & cờ'}
                  </button>
                </div>
              </details>

              <h4>Thành viên ({members.length})</h4>
              <p className="muted section-sub">Bấm Sửa để đổi chức vụ, cống hiến, điểm bang</p>
              {members.length === 0 ? (
                <p className="muted">Không có dữ liệu thành viên.</p>
              ) : (
                <div className="table-wrap">
                  <table className="compact clan-member-table">
                    <thead>
                      <tr>
                        <th>Tên</th>
                        <th>Chức vụ</th>
                        <th>Power</th>
                        <th>Cống hiến</th>
                        <th>Điểm bang</th>
                        <th>Gia nhập</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m, i) => (
                        <MemberRow
                          key={m.id || i}
                          member={m}
                          clanId={detail.id}
                          onUpdated={setDetail}
                          onFeedback={onFeedback}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="clan-dissolve-panel">
                <h4>Giải tán bang hội</h4>
                <p className="muted section-sub">
                  Xóa bang khỏi DB, giải phóng tất cả thành viên và phát thông báo toàn server. Không hoàn tác.
                </p>
                <label className="field">
                  Lý do (hiển thị trong thông báo hệ thống)
                  <textarea
                    rows={2}
                    value={dissolveReason}
                    onChange={(e) => setDissolveReason(e.target.value)}
                    placeholder="VD: Vi phạm nội quy server, bang không hoạt động..."
                  />
                </label>
                <div className="info-panel">
                  <h4>Xem trước thông báo server</h4>
                  <pre className="gift-preview-pre">{dissolvePreview}</pre>
                </div>
                <label className="field toggle-field dissolve-confirm">
                  <input type="checkbox" checked={dissolveConfirm} onChange={(e) => setDissolveConfirm(e.target.checked)} />
                  <span>Tôi hiểu hành động này xóa vĩnh viễn bang và thông báo toàn server</span>
                </label>
                <label className="field">
                  Xác nhận — gõ tên bang hoặc ID
                  <input
                    value={dissolveConfirmText}
                    onChange={(e) => setDissolveConfirmText(e.target.value)}
                    placeholder={`"${String(detail.NAME ?? '').trim()}" hoặc ${detail.id}`}
                  />
                  <span className="field-hint-inline">
                    Tên chính xác: <strong>{String(detail.NAME ?? '').trim() || '—'}</strong> · ID: <strong>{detail.id}</strong>
                  </span>
                </label>
                <button
                  type="button"
                  className="btn danger"
                  disabled={!dissolveConfirm || !isDissolveConfirmed() || dissolving}
                  onClick={dissolveClan}
                >
                  {dissolving ? 'Đang giải tán...' : 'Giải tán bang hội'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
