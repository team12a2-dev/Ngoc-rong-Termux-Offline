import { useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import { OptionEditor, formatOptionLabel } from '../components/OptionEditor';

const EMPTY_FORM = { templateId: '', durationSeconds: 600, enabled: true, options: [] };

export default function UsableItemsPage() {
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const fb = useFeedback();

  async function load() {
    const [itemsRes, templateRes] = await Promise.all([
      api('/usable-items'),
      api(`/usable-items/templates?q=${encodeURIComponent(q)}&limit=100`),
    ]);
    setRows(itemsRes.data?.rows || []);
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

  function chooseTemplate(templateId) {
    const existing = rows.find((row) => Number(row.template_id) === Number(templateId));
    if (existing) {
      setForm({
        templateId: String(existing.template_id),
        durationSeconds: Number(existing.duration_seconds || 600),
        enabled: Boolean(existing.enabled),
        options: (existing.options || []).map((option) => ({ id: Number(option.id), param: Number(option.param || 0) })),
      });
      return;
    }
    patch('templateId', templateId);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const templateId = Number(form.templateId);
      const durationSeconds = Number(form.durationSeconds);
      if (!Number.isInteger(templateId) || templateId < 0) throw new Error('Hãy chọn item template type 29');
      if (!Number.isInteger(durationSeconds) || durationSeconds < 1) throw new Error('Thời lượng phải là số giây lớn hơn 0');
      if (!form.options.length) throw new Error('Hãy gán ít nhất một option chỉ số cho item');
      await api('/usable-items', {
        method: 'POST',
        body: JSON.stringify({ ...form, templateId, durationSeconds, serverId: getServerId() }),
      });
      fb.success(`Đã lưu ${form.options.length} option chỉ số cho item #${templateId} và yêu cầu reload runtime.`);
      setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      fb.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(templateId) {
    if (!window.confirm(`Bỏ cấu hình option bổ trợ của item #${templateId}? Item template và item trong túi vẫn được giữ nguyên.`)) return;
    setBusy(true);
    try {
      await api(`/usable-items/${templateId}?serverId=${getServerId()}`, { method: 'DELETE' });
      fb.success(`Đã bỏ cấu hình item bổ trợ #${templateId}.`);
      if (Number(form.templateId) === Number(templateId)) setForm(EMPTY_FORM);
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
      fb.success(res.data?.runtime?.reloaded ? 'Đã reload cấu hình option item bổ trợ vào Java runtime.' : `Reload runtime chưa thành công: ${res.data?.runtime?.error || 'Agent không phản hồi'}`);
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
        description="Gán các dòng option chỉ số từ item_option_template cho item type 29; không gán behavior cố định theo item mẫu."
        actions={<button className="btn" type="button" onClick={reloadRuntime} disabled={busy}>Reload runtime</button>}
      />
      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="help-box">
        <h4>Cơ chế hoạt động</h4>
        <p>Item phải có <code>type = 29</code>. Khi người chơi sử dụng item đã đăng ký, Java runtime lấy đúng các cặp <code>option_id:param</code> trong mapping, áp dụng tạm thời vào chỉ số nhân vật trong thời lượng đã đặt, gửi timer/icon của item và trừ một item trong túi.</p>
        <p className="muted">Bổ huyết chỉ là một item mẫu của source, không còn là danh sách behavior của panel. Nếu option chưa được source Java hỗ trợ hiệu ứng, panel sẽ không tự tạo logic mới; hãy dùng option có gameplay effect trong catalog.</p>
      </div>

      <form className="control-card section usable-item-form" onSubmit={save}>
        <div className="section-head"><div><h3>Gán option cho item</h3><p className="muted">Chọn item type 29, đặt thời lượng, rồi thêm các option chỉ số bằng trình chọn bên dưới.</p></div></div>
        <div className="form-grid">
          <label className="field">Item template
            <select value={form.templateId} onChange={(e) => chooseTemplate(e.target.value)}>
              <option value="">-- Chọn item type 29 --</option>
              {templates.map((item) => <option key={item.id} value={item.id}>#{item.id} · {item.name}{rows.some((row) => Number(row.template_id) === Number(item.id)) ? ' · đã cấu hình' : ''}</option>)}
            </select>
          </label>
          <label className="field">Thời lượng (giây)
            <input type="number" min="1" max="2592000" value={form.durationSeconds} onChange={(e) => patch('durationSeconds', e.target.value)} />
            <small className="muted">600 giây = 10 phút; tối đa 30 ngày.</small>
          </label>
          <label className="field checkbox-field"><span>Trạng thái</span><span><input type="checkbox" checked={form.enabled} onChange={(e) => patch('enabled', e.target.checked)} /> Được sử dụng trong game</span></label>
        </div>
        <OptionEditor options={form.options} onChange={(options) => patch('options', options)} />
        <div className="row form-actions"><button className="btn primary" type="submit" disabled={busy}>Lưu option & reload</button><button className="btn" type="button" onClick={() => setForm(EMPTY_FORM)} disabled={busy}>Xóa form</button></div>
      </form>

      <div className="card section">
        <div className="section-head"><div><h3>Item đang được quản lý</h3><p className="muted">{rows.length} item · mỗi item dùng một bộ option tạm thời; lưu lại sẽ thay toàn bộ bộ option cũ.</p></div><form className="row" onSubmit={search}><input placeholder="Tìm item type 29 theo ID hoặc tên" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn" type="submit">Tìm</button></form></div>
        <div className="table-wrap"><table className="compact"><thead><tr><th>Item</th><th>Thời lượng</th><th>Option chỉ số</th><th>Trạng thái</th><th>Cập nhật</th><th /></tr></thead><tbody>
          {rows.map((row) => (
            <tr key={row.template_id}>
              <td><strong>#{row.template_id} · {row.item_name || 'Không tìm thấy template'}</strong><small>type {row.type ?? '-'}</small></td>
              <td>{Math.floor(Number(row.duration_seconds || 0) / 60)} phút</td>
              <td><div className="option-list-readable">{(row.options || []).map((option) => <div key={`${row.template_id}-${option.id}`}><code>#{option.id}</code> {formatOptionLabel(option.id, option.param, Object.fromEntries((row.options || []).map((item) => [item.id, item.name || `#${item.id}`])))}</div>)}</div>{!row.options?.length && <span className="status-dot off">Chưa gán option</span>}</td>
              <td><span className={`status-dot ${row.enabled ? 'ok' : 'off'}`}>{row.enabled ? 'Bật' : 'Tắt'}</span></td>
              <td>{row.updated_at ? new Date(row.updated_at).toLocaleString('vi-VN') : '-'}</td>
              <td><div className="row"><button className="btn sm" type="button" onClick={() => chooseTemplate(row.template_id)} disabled={busy}>Sửa</button><button className="btn sm danger" type="button" onClick={() => remove(row.template_id)} disabled={busy}>Bỏ cấu hình</button></div></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="muted">Chưa có item bổ trợ nào được cấu hình option.</td></tr>}
        </tbody></table></div>
      </div>

      <div className="card section">
        <div className="section-head"><div><h3>Catalog type 29</h3><p className="muted">Chỉ item type 29 mới được dùng trong luồng item bổ trợ.</p></div></div>
        <div className="table-wrap"><table className="compact"><thead><tr><th>ID</th><th>Tên</th><th>Mô tả</th><th>Icon</th><th /></tr></thead><tbody>
          {templates.map((item) => <tr key={item.id}><td><code>#{item.id}</code></td><td><strong>{item.name}</strong></td><td>{item.description || '-'}</td><td>{item.iconId ?? '-'}</td><td><button className="btn sm" type="button" onClick={() => chooseTemplate(item.id)}>Chọn</button></td></tr>)}
          {templates.length === 0 && <tr><td colSpan={5} className="muted">Không tìm thấy item type 29.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
