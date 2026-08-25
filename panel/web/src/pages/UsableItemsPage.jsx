import { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const EMPTY_FORM = { templateId: '', behaviorKey: 'bo_huyet', enabled: true };
const FALLBACK_BEHAVIORS = [
  { key: 'bo_huyet', label: 'Bổ huyết', description: 'Tăng 100% HP tối đa trong 10 phút' },
  { key: 'bo_huyet_2', label: 'Bổ huyết 2', description: 'Tăng 120% HP tối đa trong 10 phút' },
];

export default function UsableItemsPage() {
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [behaviors, setBehaviors] = useState(FALLBACK_BEHAVIORS);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const fb = useFeedback();

  const registeredIds = useMemo(() => new Set(rows.map((row) => Number(row.template_id))), [rows]);

  async function load() {
    const [itemsRes, behaviorRes, templateRes] = await Promise.all([
      api('/usable-items'),
      api('/usable-items/behaviors'),
      api(`/usable-items/templates?q=${encodeURIComponent(q)}&limit=100`),
    ]);
    setRows(itemsRes.data?.rows || []);
    setBehaviors(itemsRes.data?.behaviors ? Object.entries(itemsRes.data.behaviors).map(([key, value]) => ({ key, ...value })) : (behaviorRes.data || FALLBACK_BEHAVIORS));
    setTemplates(templateRes.data || []);
  }

  useEffect(() => {
    load().catch((error) => fb.error(error.message));
  }, []);

  async function search(e) {
    e?.preventDefault();
    try {
      const res = await api(`/usable-items/templates?q=${encodeURIComponent(q)}&limit=100`);
      setTemplates(res.data || []);
    } catch (error) {
      fb.error(error.message);
    }
  }

  function patch(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const templateId = Number(form.templateId);
      if (!Number.isInteger(templateId) || templateId < 0) throw new Error('Hãy chọn item template type 29');
      const res = await api('/usable-items', {
        method: 'POST',
        body: JSON.stringify({ ...form, templateId, serverId: getServerId() }),
      });
      const behavior = behaviors.find((item) => item.key === form.behaviorKey);
      fb.success(`Đã ${form.enabled ? 'bật' : 'tắt'} ${behavior?.label || form.behaviorKey} cho item #${templateId}; Java runtime đã được yêu cầu reload.`);
      setForm(EMPTY_FORM);
      await load();
      return res;
    } catch (error) {
      fb.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(templateId) {
    if (!window.confirm(`Xóa mapping usable của item #${templateId}? Item template vẫn được giữ nguyên.`)) return;
    setBusy(true);
    try {
      await api(`/usable-items/${templateId}?serverId=${getServerId()}`, { method: 'DELETE' });
      fb.success(`Đã bỏ cơ chế usable khỏi item #${templateId}.`);
      await load();
    } catch (error) {
      fb.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function reloadRuntime() {
    setBusy(true);
    try {
      const res = await api('/usable-items/reload', { method: 'POST', body: JSON.stringify({ serverId: getServerId() }) });
      fb.success(res.data?.runtime?.reloaded ? 'Đã reload mapping item bổ trợ vào Java runtime.' : `Reload runtime chưa thành công: ${res.data?.runtime?.error || 'Agent không phản hồi'}`);
      await load();
    } catch (error) {
      fb.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Item bổ trợ"
        description="Đăng ký item type 29 để sử dụng cùng cơ chế Bổ huyết hiện có; không cần sửa switch ID trong Java mỗi lần thêm item mới."
        actions={<button className="btn" type="button" onClick={reloadRuntime} disabled={busy}>Reload runtime</button>}
      />
      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="help-box">
        <h4>Cơ chế hoạt động</h4>
        <p>Item phải có <code>type = 29</code>. Khi người chơi sử dụng item đã đăng ký, server kích hoạt cùng state với item 382 (Bổ huyết) hoặc 1152 (Bổ huyết 2), gọi lại tính HP, hiển thị timer và trừ một item trong túi.</p>
        <p className="muted">Mapping được lưu trong <code>panel_usable_items</code>. Xóa mapping chỉ tắt khả năng sử dụng đặc biệt, không xóa item template hay item đang nằm trong túi người chơi.</p>
      </div>

      <form className="control-card section usable-item-form" onSubmit={save}>
        <div className="section-head"><div><h3>Đăng ký item</h3><p className="muted">Chọn item từ catalog type 29 rồi gán hành vi.</p></div></div>
        <div className="form-grid">
          <label className="field">Item template
            <select value={form.templateId} onChange={(e) => patch('templateId', e.target.value)}>
              <option value="">-- Chọn item type 29 --</option>
              {templates.map((item) => <option key={item.id} value={item.id}>#{item.id} · {item.name}{registeredIds.has(Number(item.id)) ? ' · đã đăng ký' : ''}</option>)}
            </select>
          </label>
          <label className="field">Hành vi
            <select value={form.behaviorKey} onChange={(e) => patch('behaviorKey', e.target.value)}>
              {behaviors.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <small className="muted">{behaviors.find((item) => item.key === form.behaviorKey)?.description}</small>
          </label>
          <label className="field checkbox-field"><span>Trạng thái</span><span><input type="checkbox" checked={form.enabled} onChange={(e) => patch('enabled', e.target.checked)} /> Được sử dụng trong game</span></label>
        </div>
        <div className="row form-actions"><button className="btn primary" type="submit" disabled={busy}>Lưu mapping & reload</button><button className="btn" type="button" onClick={() => setForm(EMPTY_FORM)} disabled={busy}>Xóa form</button></div>
      </form>

      <div className="card section">
        <div className="section-head"><div><h3>Item đang được quản lý</h3><p className="muted">{rows.length} mapping · chỉ item bật mới được Java runtime xử lý.</p></div><form className="row" onSubmit={search}><input placeholder="Tìm item type 29 theo ID hoặc tên" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn" type="submit">Tìm</button></form></div>
        <div className="table-wrap"><table className="compact"><thead><tr><th>Item</th><th>Behavior</th><th>Type</th><th>Mô tả</th><th>Trạng thái</th><th>Cập nhật</th><th /></tr></thead><tbody>
          {rows.map((row) => {
            const behavior = behaviors.find((item) => item.key === row.behavior_key);
            return <tr key={row.template_id}><td><strong>#{row.template_id} · {row.item_name || 'Không tìm thấy template'}</strong></td><td>{behavior?.label || row.behavior_key}</td><td>{row.type ?? '-'}</td><td>{row.description || '-'}</td><td><span className={`status-dot ${row.enabled ? 'ok' : 'off'}`}>{row.enabled ? 'Bật' : 'Tắt'}</span></td><td>{row.updated_at ? new Date(row.updated_at).toLocaleString('vi-VN') : '-'}</td><td><button className="btn sm danger" type="button" onClick={() => remove(row.template_id)} disabled={busy}>Bỏ mapping</button></td></tr>;
          })}
          {rows.length === 0 && <tr><td colSpan={7} className="muted">Chưa có item bổ trợ nào được đăng ký.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card section">
        <div className="section-head"><div><h3>Catalog type 29</h3><p className="muted">Các item type 29 có thể đăng ký làm item bổ huyết-like.</p></div></div>
        <div className="table-wrap"><table className="compact"><thead><tr><th>ID</th><th>Tên</th><th>Mô tả</th><th>Icon</th><th /></tr></thead><tbody>
          {templates.map((item) => <tr key={item.id}><td><code>#{item.id}</code></td><td><strong>{item.name}</strong></td><td>{item.description || '-'}</td><td>{item.iconId ?? '-'}</td><td><button className="btn sm" type="button" onClick={() => setForm((prev) => ({ ...prev, templateId: String(item.id) }))}>Chọn</button></td></tr>)}
          {templates.length === 0 && <tr><td colSpan={5} className="muted">Không tìm thấy item type 29.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
