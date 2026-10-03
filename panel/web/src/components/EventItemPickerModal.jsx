import { useEffect, useState } from 'react';
import { api } from '../api';
import ItemIcon from './ItemIcon';

export default function EventItemPickerModal({ isOpen, onClose, onSelect, onlyCostume = false, title = 'Chọn vật phẩm từ Item Template' }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [costumeOnly, setCostumeOnly] = useState(onlyCostume);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCostumeOnly(onlyCostume);
  }, [onlyCostume]);

  useEffect(() => {
    if (!isOpen) return;
    let timer = setTimeout(fetchItems, 200);
    return () => clearTimeout(timer);
  }, [isOpen, search, costumeOnly]);

  async function fetchItems() {
    setLoading(true);
    try {
      const q = encodeURIComponent(search.trim());
      const res = await api(`/events/meta/item-templates?q=${q}&caiTrang=${costumeOnly ? 'true' : 'false'}&limit=60`);
      setItems(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-picker-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn sm close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="text"
            className="input"
            placeholder="Tìm theo ID hoặc tên vật phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ flex: 1 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={costumeOnly}
              onChange={(e) => setCostumeOnly(e.target.checked)}
            />
            Chỉ cải trang / trang phục
          </label>
        </div>

        <div className="picker-items-grid" style={{
          maxHeight: 440,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 8,
          padding: 4
        }}>
          {loading && <p className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24 }}>Đang tải danh sách vật phẩm...</p>}
          {!loading && items.length === 0 && (
            <p className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24 }}>Không tìm thấy vật phẩm phù hợp.</p>
          )}
          {!loading && items.map((item) => (
            <div
              key={item.id}
              className="picker-item-card"
              onClick={() => { onSelect(item); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'; }}
            >
              <ItemIcon iconId={item.iconId} tempId={item.id} size={36} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#f8fafc' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 6, marginTop: 2 }}>
                  <span className="badge" style={{ padding: '1px 5px', fontSize: 10 }}>ID: {item.id}</span>
                  {item.head > 0 && <span style={{ color: '#38bdf8' }}>H:{item.head} B:{item.body} L:{item.leg}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn sm" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
