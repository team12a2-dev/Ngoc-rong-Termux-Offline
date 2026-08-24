import { useEffect, useState } from 'react';
import { api, getServerId, getToken } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

export default function BackupsPage() {
  const [rows, setRows] = useState([]);
  const [creating, setCreating] = useState(false);
  const fb = useFeedback();

  async function load() {
    const res = await api(`/backups/${getServerId()}`);
    setRows(res.data || []);
  }

  useEffect(() => { load().catch((e) => fb.error(e.message)); }, []);

  async function create() {
    setCreating(true);
    try {
      await api(`/backups/${getServerId()}`, { method: 'POST', body: JSON.stringify({ label: 'manual' }) });
      fb.success('Backup thành công');
      load();
    } catch (e) {
      fb.error(e.message);
    } finally {
      setCreating(false);
    }
  }

  function download(id, fileName) {
    fetch(`/api/v1/backups/download/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
      });
  }

  async function restore(id) {
    if (!confirm('RESTORE sẽ GHI ĐÈ toàn bộ database game. Bạn chắc chắn?')) return;
    try {
      await api(`/backups/restore/${id}`, { method: 'POST', body: JSON.stringify({ confirm: true }) });
      fb.success('Restore hoàn tất — kiểm tra game server');
    } catch (e) {
      fb.error(e.message);
    }
  }

  function fmtSize(n) {
    if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    if (n > 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${n} B`;
  }

  return (
    <div>
      <PageHeader
        title="Backup Database"
        description="Sao lưu và khôi phục database game — tạo backup trước khi chỉnh config hoặc restore lớn."
        actions={
          <button className="btn primary" onClick={create} disabled={creating}>
            {creating ? 'Đang backup...' : 'Tạo backup ngay'}
          </button>
        }
      />

      <div className="help-box">
        <h4>Lưu ý</h4>
        <ul>
          <li>Luôn tạo backup trước khi Restore hoặc sửa config quan trọng.</li>
          <li>Restore ghi đè DB hiện tại — nên dừng game server trước.</li>
          <li>Tải file .sql về để lưu trữ ngoài server.</li>
        </ul>
      </div>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {rows.length === 0 ? (
        <div className="empty-state">Chưa có backup. Bấm Tạo backup ngay để bắt đầu.</div>
      ) : (
        <table>
          <thead><tr><th>ID</th><th>File</th><th>Dung lượng</th><th>Label</th><th>Thời gian</th><th></th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td><code>{b.file_name}</code></td>
                <td>{fmtSize(b.size_bytes)}</td>
                <td>{b.label}</td>
                <td>{b.created_at}</td>
                <td>
                  <button className="btn sm" onClick={() => download(b.id, b.file_name)}>Tải</button>
                  <button className="btn danger sm" onClick={() => restore(b.id)}>Restore</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
