import { useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const EMPTY_FORM = {
  type: 0, gender: 3, name: '', description: '', level: 1, icon_id: 0, part: -1,
  is_up_to_up: 0, power_require: 0, gold: 0, gem: 0, head: -1, body: -1, leg: -1,
};

const TYPES = [
  ['0', 'Áo'], ['1', 'Quần'], ['2', 'Găng'], ['3', 'Giày'], ['4', 'Rada'],
  ['5', 'Thức ăn'], ['6', 'Đậu'], ['12', 'Ngọc rồng'], ['21', 'Cải trang'], ['23', 'Thú cưỡi'], ['29', 'Vật phẩm bổ trợ'],
];

function numberField(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function ItemsPage() {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState([]);
  const [q, setQ] = useState('');
  const [meta, setMeta] = useState({ total: 0, nextId: 0 });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const fb = useFeedback();

  async function load() {
    const [itemsRes, optionsRes] = await Promise.all([
      api(`/items?q=${encodeURIComponent(q)}&limit=100&offset=0`),
      api('/items/options'),
    ]);
    setRows(itemsRes.data?.rows || []);
    setMeta({ total: itemsRes.data?.total || 0, nextId: itemsRes.data?.nextId || 0 });
    setOptions(optionsRes.data || []);
  }

  useEffect(() => {
    load().catch((e) => fb.error(e.message));
  }, []);

  function edit(row) {
    setEditingId(row.id);
    setForm({ ...EMPTY_FORM, ...row, name: row.NAME || row.name || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, serverId: getServerId() };
      const res = await api(editingId == null ? '/items' : `/items/${editingId}`, {
        method: editingId == null ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      const item = res.data?.item;
      fb.success(`${editingId == null ? 'Đã tạo' : 'Đã cập nhật'} item #${item?.id ?? editingId} trong database ngocrong và Java runtime đã reload.`);
      resetForm();
      await load();
    } catch (e2) {
      fb.error(e2.data?.databaseSaved
        ? `${e2.message} Dữ liệu vẫn đã được lưu bền vững trong database ngocrong; hãy kiểm tra Java Agent rồi bấm Reload runtime.`
        : e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function reloadRuntime() {
    setBusy(true);
    try {
      const res = await api('/items/reload', { method: 'POST', body: JSON.stringify({ serverId: getServerId() }) });
      fb.success(`Đã reload item runtime: ${res.data?.items ?? 0} item, ${res.data?.options ?? 0} option.`);
      await load();
    } catch (e) {
      fb.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <PageHeader
        title="Item Templates"
        description="Panel ghi trực tiếp vào MariaDB ngocrong trước; Java Agent chỉ reload bản đã lưu để server runtime sử dụng, không dùng RAM làm nơi lưu chính."
        actions={<button className="btn" type="button" onClick={reloadRuntime} disabled={busy}>Reload runtime</button>}
      />
      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <div className="help-box">
        <h4>Luồng hoạt động</h4>
        <p>Item ID phải liên tục từ 0 vì server Java truy cập template bằng index. Panel tự chọn ID kế tiếp là <strong>#{meta.nextId}</strong>; không hỗ trợ xóa để tránh làm gãy index. Khi lưu, panel ghi bền vững vào MariaDB <code>ngocrong</code>, đọc lại bản ghi để xác nhận rồi mới gọi Java Agent reload.</p>
        <p className="muted">Đã nạp {options.length} option template. Item mới chỉ dùng được hiệu ứng game mà source Java đã hỗ trợ; icon/part tùy chỉnh cần asset client tương ứng.</p>
      </div>

      <form className="control-card section" onSubmit={save}>
        <div className="section-head">
          <div>
            <h3>{editingId == null ? 'Tạo item mới' : `Sửa item #${editingId}`}</h3>
            <p className="muted">Database: <code>item_template</code> · Option: <code>item_option_template</code></p>
          </div>
          {editingId != null && <button className="btn" type="button" onClick={resetForm}>Hủy sửa</button>}
        </div>
        <div className="form-grid">
          <label className="field">Tên vật phẩm<input value={form.name} maxLength={255} onChange={(e) => patch('name', e.target.value)} required /></label>
          <label className="field">Mô tả<input value={form.description} maxLength={75} onChange={(e) => patch('description', e.target.value)} /></label>
          <label className="field">Loại type<select value={form.type} onChange={(e) => patch('type', numberField(e.target.value))}>{TYPES.map(([v, label]) => <option key={v} value={v}>{v} · {label}</option>)}<option value="7">7 · Khác</option><option value="8">8 · Khác</option><option value="19">19 · Khác</option></select></label>
          <label className="field">Gender<select value={form.gender} onChange={(e) => patch('gender', numberField(e.target.value))}><option value="0">0 · Trái Đất</option><option value="1">1 · Namek</option><option value="2">2 · Xayda</option><option value="3">3 · Dùng chung</option></select></label>
          <label className="field">Level<input type="number" min="0" value={form.level} onChange={(e) => patch('level', numberField(e.target.value))} /></label>
          <label className="field">Icon ID<input type="number" min="0" value={form.icon_id} onChange={(e) => patch('icon_id', numberField(e.target.value))} /></label>
          <label className="field">Part<input type="number" min="-1" value={form.part} onChange={(e) => patch('part', numberField(e.target.value, -1))} /></label>
          <label className="field">Power require<input type="number" min="0" value={form.power_require} onChange={(e) => patch('power_require', numberField(e.target.value))} /></label>
          <label className="field">Gold giá<input type="number" min="0" value={form.gold} onChange={(e) => patch('gold', numberField(e.target.value))} /></label>
          <label className="field">Gem giá<input type="number" min="0" value={form.gem} onChange={(e) => patch('gem', numberField(e.target.value))} /></label>
          <label className="field">Head<input type="number" min="-1" value={form.head} onChange={(e) => patch('head', numberField(e.target.value, -1))} /></label>
          <label className="field">Body<input type="number" min="-1" value={form.body} onChange={(e) => patch('body', numberField(e.target.value, -1))} /></label>
          <label className="field">Leg<input type="number" min="-1" value={form.leg} onChange={(e) => patch('leg', numberField(e.target.value, -1))} /></label>
          <label className="field checkbox-field"><span>Cho phép nâng cấp</span><input type="checkbox" checked={Boolean(Number(form.is_up_to_up))} onChange={(e) => patch('is_up_to_up', e.target.checked ? 1 : 0)} /></label>
        </div>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Đang lưu/reload...' : editingId == null ? `Tạo item #${meta.nextId}` : `Lưu item #${editingId}`}</button>
      </form>

      <div className="card section">
        <div className="section-head">
          <div><h3>Danh sách item_template</h3><p className="muted">{meta.total} item trong database · hiển thị tối đa 100 kết quả</p></div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); load(); }}><input placeholder="Tìm ID hoặc tên..." value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn" type="submit">Tìm</button></form>
        </div>
        <div className="table-wrap">
          <table><thead><tr><th>ID</th><th>Tên</th><th>Type/Gender</th><th>Icon/Part</th><th>Level</th><th>Power</th><th /></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}><td><code>#{row.id}</code></td><td><strong>{row.NAME}</strong><small>{row.description}</small></td><td>{row.type} / {row.gender}</td><td>{row.icon_id} / {row.part}</td><td>{row.level}</td><td>{Number(row.power_require || 0).toLocaleString('vi-VN')}</td><td><button className="btn sm" type="button" onClick={() => edit(row)}>Sửa</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
