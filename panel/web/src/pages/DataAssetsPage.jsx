import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import { api } from '../api';

const PAGE_SIZE = 50;
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== 'image/png') return reject(new Error('Chỉ nhận ảnh PNG'));
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Ảnh không được vượt quá 10MB'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được ảnh'));
    reader.readAsDataURL(file);
  });
}
function Pager({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <div className="section-head" style={{ marginTop: 16 }}><span className="muted">Trang {page}/{pages} · {total} bản ghi</span><div className="row"><button className="btn sm" disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))}>Trang trước</button><input aria-label="Số trang" type="number" min="1" max={pages} value={page} onChange={(e) => onChange(Math.min(pages, Math.max(1, Number(e.target.value) || 1)))} style={{ width: 70 }} /><button className="btn sm" disabled={page >= pages} onClick={() => onChange(Math.min(pages, page + 1))}>Trang sau</button></div></div>;
}

export default function DataAssetsPage() {
  const [tab, setTab] = useState('icons');
  const [icons, setIcons] = useState({ rows: [], total: 0 });
  const [images, setImages] = useState({ rows: [], total: 0 });
  const [iconPage, setIconPage] = useState(1);
  const [imagePage, setImagePage] = useState(1);
  const [zoom, setZoom] = useState(4);
  const [sourceZoom, setSourceZoom] = useState(4);
  const [iconSearch, setIconSearch] = useState('');
  const [imageSearch, setImageSearch] = useState('');
  const [iconId, setIconId] = useState('');
  const [iconFile, setIconFile] = useState(null);
  const [imageName, setImageName] = useState('');
  const [nFrame, setNFrame] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const fb = useFeedback();

  async function loadIcons() {
    const res = await api(`/data-assets/icons?zoom=${zoom}&q=${encodeURIComponent(iconSearch)}&limit=${PAGE_SIZE}&offset=${(iconPage - 1) * PAGE_SIZE}`);
    setIcons({ rows: res.data?.rows || [], total: res.data?.total || 0 });
  }
  async function loadImages() {
    const res = await api(`/data-assets/images-by-name?q=${encodeURIComponent(imageSearch)}&limit=${PAGE_SIZE}&offset=${(imagePage - 1) * PAGE_SIZE}`);
    setImages({ rows: res.data?.rows || [], total: res.data?.total || 0 });
  }
  useEffect(() => { loadIcons().catch((e) => fb.error(e.message)); }, [iconPage, zoom, iconSearch]);
  useEffect(() => { loadImages().catch((e) => fb.error(e.message)); }, [imagePage, imageSearch]);

  async function saveIcon(e) {
    e.preventDefault(); setBusy(true);
    try {
      const imageBase64 = await imageToBase64(iconFile);
      await api('/data-assets/icons', { method: 'POST', body: JSON.stringify({ id: Number(iconId), sourceZoom, imageBase64 }) });
      fb.success(`Đã resize từ x${sourceZoom} và ghi icon #${iconId} vào đủ x4, x3, x2, x1.`); setIconFile(null); e.target.reset(); await loadIcons();
    } catch (e2) { fb.error(e2.message); } finally { setBusy(false); }
  }
  async function saveImage(e) {
    e.preventDefault(); setBusy(true);
    try {
      const imageBase64 = await imageToBase64(imageFile);
      await api('/data-assets/images-by-name', { method: 'POST', body: JSON.stringify({ name: imageName, n_frame: Number(nFrame), sourceZoom, imageBase64 }) });
      fb.success(`Đã resize từ x${sourceZoom}, ghi ${imageName}.png vào đủ x4, x3, x2, x1 và cập nhật img_by_name.`); setImageFile(null); e.target.reset(); await loadImages();
    } catch (e2) { fb.error(e2.message); } finally { setBusy(false); }
  }
  async function remove(kind, value) {
    if (!window.confirm(`Xóa ${value} khỏi dữ liệu repository?`)) return;
    try { await api(`/data-assets/${kind}/${encodeURIComponent(value)}`, { method: 'DELETE' }); fb.success('Đã xóa dữ liệu.'); kind === 'icons' ? loadIcons() : loadImages(); } catch (e) { fb.error(e.message); }
  }

  return <div>
    <PageHeader title="Data Assets" description="Quản lý trực tiếp ảnh PNG trong repository: data/icon/x4..x1 và data/img_by_name/x4..x1." />
    <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />
    <div className="help-box"><h4>Quy tắc tải ảnh lên</h4><p>Nhấn <strong>Chọn tệp</strong> để lấy PNG từ điện thoại, nhập ID/tên, chọn zoom nguồn rồi nhấn <strong>Tải ảnh lên &amp; đồng bộ</strong>. Server sẽ resize theo tỷ lệ và ghi đủ bốn phiên bản x4, x3, x2, x1 trong dự án GitHub. Ví dụ ảnh x4 sẽ tự tạo x3 bằng 75%, x2 bằng 50%, x1 bằng 25%. Với <code>img_by_name</code>, thông tin <code>n_frame</code> được cập nhật đồng thời trong database.</p></div>
    <div className="row" style={{ marginBottom: 16 }}><button className={`btn ${tab === 'icons' ? 'primary' : ''}`} onClick={() => setTab('icons')}>Icon</button><button className={`btn ${tab === 'images' ? 'primary' : ''}`} onClick={() => setTab('images')}>img_by_name</button></div>
    {tab === 'icons' ? <>
      <form className="control-card section" onSubmit={saveIcon}><h3>Thêm / chỉnh sửa icon</h3><div className="form-grid"><label className="field">Icon ID<input type="number" min="0" value={iconId} onChange={(e) => setIconId(e.target.value)} required /></label><label className="field">Zoom nguồn<select value={sourceZoom} onChange={(e) => setSourceZoom(Number(e.target.value))}><option value="4">Ảnh x4</option><option value="3">Ảnh x3</option><option value="2">Ảnh x2</option><option value="1">Ảnh x1</option></select></label><label className="field">Ảnh PNG cần tải lên<input type="file" accept="image/png" onChange={(e) => setIconFile(e.target.files?.[0] || null)} required />{iconFile && <span className="muted">Đã chọn: {iconFile.name}</span>}</label></div><p className="muted">Server sẽ đọc kích thước ảnh nguồn và resize đúng tỷ lệ để tạo đủ bốn phiên bản.</p><button className="btn primary" disabled={busy}>{busy ? 'Đang tải và resize...' : 'Tải ảnh lên & đồng bộ x4, x3, x2, x1'}</button></form>
      <div className="card section"><div className="section-head"><div><h3>Danh sách icon</h3><p className="muted">Đang xem x{zoom}</p></div><div className="row"><input placeholder="Tìm ID/file..." value={iconSearch} onChange={(e) => { setIconSearch(e.target.value); setIconPage(1); }} /><select value={zoom} onChange={(e) => { setZoom(Number(e.target.value)); setIconPage(1); }}><option value="4">x4</option><option value="3">x3</option><option value="2">x2</option><option value="1">x1</option></select></div></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Preview</th><th>File</th><th /></tr></thead><tbody>{icons.rows.map((row) => <tr key={row.id}><td>#{row.id}</td><td><img src={row.preview} alt={`icon ${row.id}`} style={{ width: 48, height: 48, objectFit: 'contain' }} /></td><td><code>data/icon/x4/{row.filename}</code></td><td><button className="btn sm" onClick={() => { setIconId(row.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Chỉnh sửa</button><button className="btn sm" onClick={() => remove('icons', row.id)}>Xóa</button></td></tr>)}</tbody></table></div><Pager page={iconPage} total={icons.total} onChange={setIconPage} /></div>
    </> : <>
      <form className="control-card section" onSubmit={saveImage}><h3>Thêm / chỉnh sửa img_by_name</h3><div className="form-grid"><label className="field">Tên ảnh<input value={imageName} onChange={(e) => setImageName(e.target.value)} placeholder="mount_1_0" required /></label><label className="field">Số frame<input type="number" min="1" max="255" value={nFrame} onChange={(e) => setNFrame(e.target.value)} required /></label><label className="field">Zoom nguồn<select value={sourceZoom} onChange={(e) => setSourceZoom(Number(e.target.value))}><option value="4">Ảnh x4</option><option value="3">Ảnh x3</option><option value="2">Ảnh x2</option><option value="1">Ảnh x1</option></select></label><label className="field">Ảnh PNG cần tải lên<input type="file" accept="image/png" onChange={(e) => setImageFile(e.target.files?.[0] || null)} required />{imageFile && <span className="muted">Đã chọn: {imageFile.name}</span>}</label></div><button className="btn primary" disabled={busy}>{busy ? 'Đang tải và resize...' : 'Tải ảnh lên & cập nhật database'}</button></form>
      <div className="card section"><div className="section-head"><div><h3>Danh sách img_by_name</h3><p className="muted">{images.total} bản ghi trong database</p></div><input placeholder="Tìm theo tên ảnh..." value={imageSearch} onChange={(e) => { setImageSearch(e.target.value); setImagePage(1); }} /></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Tên</th><th>Frame</th><th>Preview</th><th /></tr></thead><tbody>{images.rows.map((row) => <tr key={row.id}><td>#{row.id}</td><td><code>{row.name}</code></td><td>{row.n_frame}</td><td><img src={row.preview} alt={row.name} style={{ width: 80, height: 48, objectFit: 'contain' }} /></td><td><button className="btn sm" onClick={() => { setImageName(row.name); setNFrame(row.n_frame); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Chỉnh sửa</button><button className="btn sm" onClick={() => remove('images-by-name', row.name)}>Xóa</button></td></tr>)}</tbody></table></div><Pager page={imagePage} total={images.total} onChange={setImagePage} /></div>
    </>}
  </div>;
}
