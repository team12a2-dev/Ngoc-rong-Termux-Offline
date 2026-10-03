import { useEffect, useState } from 'react';
import { api } from '../api';
import ItemIcon from './ItemIcon';

export default function EventIconPickerModal({ isOpen, onClose, onSelect, title = 'Chọn Icon từ thư viện data/icon' }) {
  const [icons, setIcons] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let timer = setTimeout(fetchIcons, 200);
    return () => clearTimeout(timer);
  }, [isOpen, search, page]);

  async function fetchIcons() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '40',
        search: search.trim(),
      });
      const res = await api(`/assets/icons/list?${params.toString()}`);
      if (res?.ok && res.data) {
        setIcons(res.data.items || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-icon-picker-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div className="modal-header">
          <h3>{title} <small className="muted" style={{ fontSize: 13, fontWeight: 400 }}>({total} icons)</small></h3>
          <button type="button" className="btn sm close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="text"
            className="input"
            placeholder="Tìm theo mã số Icon ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            autoFocus
            style={{ flex: 1 }}
          />
        </div>

        <div className="picker-icons-grid" style={{
          maxHeight: 420,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
          gap: 8,
          padding: 4
        }}>
          {loading && <p className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24 }}>Đang tải danh sách icon...</p>}
          {!loading && icons.length === 0 && (
            <p className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24 }}>Không tìm thấy icon nào.</p>
          )}
          {!loading && icons.map((item) => (
            <div
              key={item.id}
              className="picker-icon-tile"
              onClick={() => { onSelect(item.id); onClose(); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'; }}
            >
              <ItemIcon iconId={item.id} size={42} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginTop: 4 }}>#{item.id}</span>
            </div>
          ))}
        </div>

        <div className="modal-footer" style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="pagination-controls" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" className="btn sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trang trước</button>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>{page} / {totalPages}</span>
            <button type="button" className="btn sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Trang sau</button>
          </div>
          <button type="button" className="btn sm" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
