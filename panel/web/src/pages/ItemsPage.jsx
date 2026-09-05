import { useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import ItemIcon from '../components/ItemIcon';

const EMPTY_FORM = {
  id: '', type: 0, gender: 3, name: '', description: '', level: 1, icon_id: 0, part: -1,
  is_up_to_up: 0, power_require: 0, gold: 0, gem: 0, head: -1, body: -1, leg: -1,
  head_avatar: '', partsJson: '',
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
  const [quickItem, setQuickItem] = useState('');
  const [quickParts, setQuickParts] = useState('');
  const [quickAvatar, setQuickAvatar] = useState('');
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
    setForm({ ...EMPTY_FORM, ...row, name: row.NAME || row.name || '', partsJson: row.parts?.length ? JSON.stringify(row.parts, null, 2) : '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function parseQuickImport() {
    const itemColumns = quickItem.trim().split(/\t/);
    if (itemColumns.length !== 15) throw new Error(`Dòng item_template cần đúng 15 cột, hiện có ${itemColumns.length}. Hãy dán dữ liệu phân cách bằng phím Tab.`);
    const [id, type, gender, name, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg] = itemColumns;
    const parts = quickParts.trim() ? quickParts.trim().split(/\r?\n/).filter(Boolean).map((line, index) => {
      const columns = line.split(/\t/);
      if (columns.length !== 3) throw new Error(`Dòng part ${index + 1} cần 3 cột: id, type, data`);
      return { id: Number(columns[0]), type: Number(columns[1]), data: columns[2] };
    }) : [];
    const avatarColumns = quickAvatar.trim().split(/\t/);
    const avatar = quickAvatar.trim() ? Number(avatarColumns[1] ?? quickAvatar.trim()) : null;
    if (quickAvatar.trim() && (avatarColumns.length > 2 || !Number.isInteger(avatar))) throw new Error('Dòng head_avatar cần dạng: head_id<Tab>avatar_id');
    setForm({
      ...EMPTY_FORM, id: Number(id), type: Number(type), gender: Number(gender), name, description,
      level: Number(level), icon_id: Number(icon_id), part: Number(part), is_up_to_up: Number(is_up_to_up),
      power_require: Number(power_require), gold: Number(gold), gem: Number(gem), head: Number(head),
      body: Number(body), leg: Number(leg), head_avatar: avatar == null ? '' : avatar,
      partsJson: JSON.stringify(parts, null, 2),
    });
    setEditingId(null);
    fb.success(`Đã phân tích item #${id}: tự điền ${parts.length} dòng part${avatar == null ? '' : ' và head_avatar'}. Hãy kiểm tra rồi bấm lưu.`);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      let parts = [];
      if (form.partsJson.trim()) {
        try { parts = JSON.parse(form.partsJson); } catch { throw new Error('Dữ liệu part phải là JSON hợp lệ'); }
      }
      const payload = { ...form, parts, head_avatar: form.head_avatar === '' ? null : numberField(form.head_avatar, -1), serverId: getServerId() };
      if (payload.id === '') delete payload.id;
      delete payload.partsJson;
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

      <div className="control-card section">
        <div className="section-head"><div><h3>Nhập nhanh dữ liệu SQL</h3><p className="muted">Dán nguyên dòng theo đúng thứ tự cột trong database. Các cột được phân cách bằng phím <code>Tab</code>.</p></div></div>
        <label className="field">Dòng <code>item_template</code> (15 cột)<textarea rows="3" value={quickItem} onChange={(e) => setQuickItem(e.target.value)} placeholder={'2033\t5\t3\tCải trang chú hề Picolo\tHề Hước : Tăng 5% né cho người xung quanh\t1\t17121\t2006\t0\t0\t0\t0\t2006\t2007\t2008'} /></label>
        <label className="field">Các dòng <code>part</code> (mỗi dòng 3 cột)<textarea rows="7" value={quickParts} onChange={(e) => setQuickParts(e.target.value)} placeholder={'2006\t0\t[[17094,3,2],[17095,3,3],[2955,0,0]]\n2007\t1\t[[17096,0,0],[17097,0,-1]]\n2008\t2\t[[17108,9,7],[17109,-1,-1]]'} /></label>
        <label className="field">Dòng <code>head_avatar</code> (2 cột)<input value={quickAvatar} onChange={(e) => setQuickAvatar(e.target.value)} placeholder="2006&#9;17122" /></label>
        <button className="btn" type="button" onClick={() => { try { parseQuickImport(); } catch (e) { fb.error(e.message); } }}>Phân tích và tự điền biểu mẫu</button>
      </div>

      <form className="control-card section" onSubmit={save}>
        <div className="section-head">
          <div>
            <h3>{editingId == null ? 'Tạo item mới' : `Sửa item #${editingId}`}</h3>
            <p className="muted">Database: <code>item_template</code> · <code>part</code> · <code>head_avatar</code></p>
          </div>
          {editingId != null && <button className="btn" type="button" onClick={resetForm}>Hủy sửa</button>}
        </div>
        <div className="form-grid">
          <label className="field">ID item<input type="number" min="0" value={form.id} onChange={(e) => patch('id', numberField(e.target.value))} disabled={editingId != null} /><span className="muted">Dùng ID từ dòng SQL; để trống để tự chọn ID kế tiếp.</span></label>
          <label className="field">Tên vật phẩm<input value={form.name} maxLength={255} onChange={(e) => patch('name', e.target.value)} required /></label>
          <label className="field">Mô tả<input value={form.description} maxLength={75} onChange={(e) => patch('description', e.target.value)} /></label>
          <label className="field">Loại type<select value={form.type} onChange={(e) => patch('type', numberField(e.target.value))}>{TYPES.map(([v, label]) => <option key={v} value={v}>{v} · {label}</option>)}<option value="7">7 · Khác</option><option value="8">8 · Khác</option><option value="19">19 · Khác</option></select></label>
          <label className="field">Gender<select value={form.gender} onChange={(e) => patch('gender', numberField(e.target.value))}><option value="0">0 · Trái Đất</option><option value="1">1 · Namek</option><option value="2">2 · Xayda</option><option value="3">3 · Dùng chung</option></select></label>
          <label className="field">Level<input type="number" min="0" value={form.level} onChange={(e) => patch('level', numberField(e.target.value))} /></label>
          <label className="field">Icon ID<input type="number" min="0" value={form.icon_id} onChange={(e) => patch('icon_id', numberField(e.target.value))} /><span className="item-template-icon-preview"><ItemIcon iconId={form.icon_id} tempId={editingId} name={form.name} size={56} /></span></label>
          <label className="field">Part<input type="number" min="-1" value={form.part} onChange={(e) => patch('part', numberField(e.target.value, -1))} /></label>
          <label className="field">Power require<input type="number" min="0" value={form.power_require} onChange={(e) => patch('power_require', numberField(e.target.value))} /></label>
          <label className="field">Gold giá<input type="number" min="0" value={form.gold} onChange={(e) => patch('gold', numberField(e.target.value))} /></label>
          <label className="field">Gem giá<input type="number" min="0" value={form.gem} onChange={(e) => patch('gem', numberField(e.target.value))} /></label>
          <label className="field">Head<input type="number" min="-1" value={form.head} onChange={(e) => patch('head', numberField(e.target.value, -1))} /></label>
          <label className="field">Body<input type="number" min="-1" value={form.body} onChange={(e) => patch('body', numberField(e.target.value, -1))} /></label>
          <label className="field">Leg<input type="number" min="-1" value={form.leg} onChange={(e) => patch('leg', numberField(e.target.value, -1))} /></label>
          <label className="field">Head avatar<input type="number" min="0" value={form.head_avatar} onChange={(e) => patch('head_avatar', e.target.value)} placeholder="Ví dụ: 17122" /><span className="muted">Gắn vào head_id ở cột Head.</span></label>
          <label className="field checkbox-field"><span>Cho phép nâng cấp</span><input type="checkbox" checked={Boolean(Number(form.is_up_to_up))} onChange={(e) => patch('is_up_to_up', e.target.checked ? 1 : 0)} /></label>
        </div>
        <label className="field" style={{ display: 'block', marginTop: 16 }}>Part đầy đủ (JSON)
          <textarea rows="8" value={form.partsJson} onChange={(e) => patch('partsJson', e.target.value)} placeholder={'[{"id":2006,"type":0,"data":"[[17094,3,2],[17095,3,3],[2955,0,0]]"},\n {"id":2007,"type":1,"data":"[[17096,0,0],[17097,0,-1]]"},\n {"id":2008,"type":2,"data":"[[17108,9,7],[17109,-1,-1]]"}]'} />
          <span className="muted">Mỗi dòng gồm <code>id</code>, <code>type</code> (0 áo, 1 thân, 2 quần) và <code>data</code> dạng mảng <code>[[icon, dx, dy], ...]</code>. ID đã có với dữ liệu khác sẽ bị từ chối, không ghi đè.</span>
        </label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Đang lưu/reload...' : editingId == null ? `Tạo item #${meta.nextId}` : `Lưu item #${editingId}`}</button>
      </form>

      <div className="card section">
        <div className="section-head">
          <div><h3>Danh sách item_template</h3><p className="muted">{meta.total} item trong database · hiển thị tối đa 100 kết quả</p></div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); load(); }}><input placeholder="Tìm ID hoặc tên..." value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn" type="submit">Tìm</button></form>
        </div>
        <div className="table-wrap">
          <table><thead><tr><th>ID</th><th>Icon</th><th>Tên</th><th>Type/Gender</th><th>Part</th><th>Level</th><th>Power</th><th /></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}><td><code>#{row.id}</code></td><td><ItemIcon iconId={row.icon_id} tempId={row.id} name={row.NAME} size={40} /><small>#{row.icon_id}</small></td><td><strong>{row.NAME}</strong><small>{row.description}</small></td><td>{row.type} / {row.gender}</td><td>{row.part}</td><td>{row.level}</td><td>{Number(row.power_require || 0).toLocaleString('vi-VN')}</td><td><button className="btn sm" type="button" onClick={() => edit(row)}>Sửa</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
