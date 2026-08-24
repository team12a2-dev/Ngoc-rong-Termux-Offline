import { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import GiftcodeItemBuilder, {
  itemsToDetailJson,
  detailJsonToItems,
  previewItemsText,
} from '../components/GiftcodeItemBuilder';
import { formatLiveSync } from '../utils/liveSync';

function toDatetimeLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return toDatetimeLocal(d);
}

function generateCode(prefix = 'NRO') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${s}`;
}

const EXPIRY_PRESETS = [
  { label: '+7 ngày', days: 7 },
  { label: '+30 ngày', days: 30 },
  { label: '+90 ngày', days: 90 },
  { label: '+1 năm', days: 365 },
];

const COUNT_PRESETS = [100, 500, 1000, 5000, 99999];

const emptyForm = () => ({
  code: generateCode(),
  count_left: 1000,
  expired: addDays(30).replace('T', ' ') + ':00',
  items: [],
});

function giftStatus(g) {
  const expired = g.expired && new Date(String(g.expired).replace(' ', 'T')) <= new Date();
  if (expired) return { key: 'expired', label: 'Hết hạn', cls: 'bad' };
  if (g.count_left <= 0) return { key: 'empty', label: 'Hết lượt', cls: 'bad' };
  if (g.count_left <= 10) return { key: 'low', label: 'Sắp hết', cls: 'admin' };
  return { key: 'active', label: 'Đang hoạt động', cls: 'ok' };
}

export default function GiftcodesPage() {
  const [rows, setRows] = useState([]);
  const [filterQ, setFilterQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawDetail, setRawDetail] = useState('[]');
  const [loading, setLoading] = useState(false);
  const fb = useFeedback();
  const optionMap = useOptionMap();

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterQ.trim()) params.set('q', filterQ.trim());
      if (filterStatus) params.set('status', filterStatus);
      const res = await api(`/giftcodes?${params}`);
      setRows(res.data || []);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatus]);

  async function openEdit(id) {
    try {
      const res = await api(`/giftcodes/${id}`);
      const g = res.data;
      const items = detailJsonToItems(g.detailParsed || g.detail);
      setEditingId(id);
      setForm({
        code: g.code,
        count_left: g.count_left,
        expired: g.expired?.slice?.(0, 19) || g.expired,
        items,
      });
      setRawDetail(typeof g.detail === 'string' ? g.detail : JSON.stringify(g.detailParsed || [], null, 2));
      setShowAdvanced(false);
    } catch (e) {
      fb.error(e.message);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setRawDetail('[]');
    setShowAdvanced(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (!showAdvanced && form.items.length === 0) {
      fb.error('Thêm ít nhất 1 item phần thưởng');
      return;
    }
    const detail = showAdvanced ? rawDetail : itemsToDetailJson(form.items);
    const payload = {
      code: form.code.trim().toUpperCase(),
      count_left: form.count_left,
      expired: form.expired.includes('T') ? form.expired.replace('T', ' ') + ':00' : form.expired,
      detail,
    };
    try {
      if (editingId) {
        const res = await api(`/giftcodes/${editingId}`, { method: 'PUT', body: JSON.stringify({ ...payload, serverId: getServerId() }) });
        fb.success(`Đã cập nhật giftcode${formatLiveSync(res.data)}`);
      } else {
        const res = await api('/giftcodes', { method: 'POST', body: JSON.stringify({ ...payload, serverId: getServerId() }) });
        fb.success(`Đã tạo giftcode${formatLiveSync(res.data)}`);
      }
      resetForm();
      load();
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function reload() {
    try {
      await api('/giftcodes/reload', { method: 'POST', body: JSON.stringify({ serverId: getServerId() }) });
      fb.success('Đã reload giftcode in-game');
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function remove(id) {
    if (!confirm('Xóa giftcode này?')) return;
    try {
      await api(`/giftcodes/${id}`, { method: 'DELETE', body: JSON.stringify({ serverId: getServerId() }) });
      fb.success('Đã xóa — giftcode in-game đã được reload');
      if (editingId === id) resetForm();
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function cloneGiftcode(id) {
    const code = prompt('Mã code mới (để trống = thêm _COPY):', '');
    if (code === null) return;
    try {
      const res = await api(`/giftcodes/${id}/clone`, {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() || undefined }),
      });
      fb.success(`Đã nhân bản → ${res.data?.code}`);
      load();
      if (res.data?.id) openEdit(res.data.id);
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function topup(id, amount = 100) {
    try {
      await api(`/giftcodes/${id}/topup`, { method: 'POST', body: JSON.stringify({ amount }) });
      fb.success(`Đã cộng ${amount} lượt`);
      load();
      if (editingId === id) openEdit(id);
    } catch (e) {
      fb.error(e.message);
    }
  }

  const previewText = useMemo(() => previewItemsText(form.items, optionMap), [form.items, optionMap]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((g) => giftStatus(g).key === 'active').length,
    expired: rows.filter((g) => giftStatus(g).key === 'expired').length,
  }), [rows]);

  return (
    <div>
      <PageHeader
        title="Quản lý Giftcodes"
        description="Chọn item từ danh sách, tùy chỉnh option buff, tạo mã quà. Reload in-game sau khi lưu."
        stats={(
          <>
            <span className="page-stat-pill"><strong>{stats.total}</strong> tổng</span>
            <span className="page-stat-pill ok"><strong>{stats.active}</strong> hoạt động</span>
            <span className="page-stat-pill"><strong>{stats.expired}</strong> hết hạn</span>
          </>
        )}
      >
        <button type="button" className="btn" onClick={resetForm}>+ Tạo mới</button>
        <button type="button" className="btn primary" onClick={reload}>Reload in-game</button>
      </PageHeader>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="split giftcode-layout">
        <div className="giftcode-list-panel card">
          <div className="giftcode-list-head">
            <h3>Danh sách mã</h3>
            <span className="muted giftcode-list-count">{rows.length} mã</span>
          </div>

          <form className="giftcode-filters" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <input placeholder="Tìm mã code..." value={filterQ} onChange={(e) => setFilterQ(e.target.value)} />
            <div className="giftcode-filter-row">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="empty">Hết lượt</option>
                <option value="expired">Hết hạn</option>
              </select>
              <button className="btn primary" type="submit">{loading ? '...' : 'Tìm'}</button>
            </div>
          </form>

          <div className="giftcode-list-scroll">
            {loading && rows.length === 0 && (
              <div className="giftcode-list-empty">Đang tải...</div>
            )}
            {!loading && rows.length === 0 && (
              <div className="giftcode-list-empty">Không có giftcode phù hợp.</div>
            )}
            {rows.map((g) => {
              const st = giftStatus(g);
              return (
                <div
                  key={g.id}
                  className={`giftcode-list-item${editingId === g.id ? ' active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(g.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openEdit(g.id); }}
                >
                  <div className="giftcode-item-top">
                    <code className="giftcode-code">{g.code}</code>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="giftcode-item-meta">
                    <span className="giftcode-count">
                      <strong>{g.count_left?.toLocaleString?.() ?? g.count_left}</strong> lượt
                    </span>
                    {g.expired && (
                      <span className="giftcode-expiry muted">
                        HSD {String(g.expired).slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <div className="giftcode-item-rewards">
                    {g.itemsPreview?.length ? (
                      g.itemsPreview.map((it) => (
                        <span key={it.id} className="giftcode-reward-chip" title={it.name || `#${it.id}`}>
                          {it.name ? it.name.slice(0, 16) : `#${it.id}`}
                          <em>x{it.quantity}</em>
                        </span>
                      ))
                    ) : (
                      <span className="muted">{g.itemCount || 0} item</span>
                    )}
                  </div>
                  <div className="giftcode-list-item-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <button type="button" className="btn sm" onClick={() => topup(g.id, 100)} title="Cộng 100 lượt">+100</button>
                    <button type="button" className="btn sm" onClick={() => cloneGiftcode(g.id)} title="Nhân bản">Nhân bản</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form className="card giftcode-editor" onSubmit={submit}>
          <div className="section-head">
            <h3>{editingId ? `Sửa giftcode #${editingId}` : 'Tạo giftcode mới'}</h3>
            {editingId && (
              <button type="button" className="btn danger sm" onClick={() => remove(editingId)}>Xóa</button>
            )}
          </div>

          <details className="giftcode-info-collapse" open>
            <summary>Thông tin mã code</summary>
            <div className="editor-panel">
              <div className="form-grid">
                <label className="field">
                  Mã code
                  <div className="row">
                    <input
                      placeholder="VD: TET2026"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      required
                    />
                    <button type="button" className="btn sm" onClick={() => setForm({ ...form, code: generateCode() })}>Ngẫu nhiên</button>
                  </div>
                </label>
                <label className="field">
                  Lượt còn lại
                  <input type="number" min={-1} value={form.count_left} onChange={(e) => setForm({ ...form, count_left: Number(e.target.value) })} />
                </label>
                <label className="field">
                  Hết hạn
                  <input
                    type="datetime-local"
                    value={form.expired.replace(' ', 'T').slice(0, 16)}
                    onChange={(e) => setForm({ ...form, expired: e.target.value.replace('T', ' ') + ':00' })}
                  />
                </label>
              </div>
              <div className="preset-row">
                {COUNT_PRESETS.map((n) => (
                  <button key={n} type="button" className="btn sm chip-btn" onClick={() => setForm({ ...form, count_left: n })}>{n.toLocaleString()} lượt</button>
                ))}
                {EXPIRY_PRESETS.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    className="btn sm"
                    onClick={() => setForm({ ...form, expired: addDays(p.days).replace('T', ' ') + ':00' })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </details>

          <section className="giftcode-rewards-section">
            <div className="section-head">
              <div>
                <h3>Item & option phần thưởng</h3>
                <p className="muted section-sub">Danh sách item_template bên trái · chỉnh option item_option_template bên dưới</p>
              </div>
              <button type="button" className="btn ghost sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? '← Trình chọn item' : 'JSON nâng cao'}
              </button>
            </div>

            {showAdvanced ? (
              <label className="field">
                Detail JSON
                <textarea rows={8} value={rawDetail} onChange={(e) => setRawDetail(e.target.value)} />
              </label>
            ) : (
              <GiftcodeItemBuilder items={form.items} onChange={(items) => setForm({ ...form, items })} />
            )}
          </section>

          {form.items.length > 0 && !showAdvanced && (
            <div className="info-panel giftcode-preview-strip">
              <h4>Xem trước phần thưởng</h4>
              <pre className="gift-preview-pre">{previewText}</pre>
            </div>
          )}

          <div className="row giftcode-form-actions">
            <button className="btn primary" type="submit">{editingId ? 'Cập nhật giftcode' : 'Tạo giftcode'}</button>
            {editingId && <button type="button" className="btn" onClick={resetForm}>Hủy / Tạo mới</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
