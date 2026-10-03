import { useCallback, useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import ShopTabEditor from '../components/ShopTabEditor';
import ShopRacePills from '../components/ShopRacePills';
import { useShopRacePreview } from '../hooks/useShopRacePreview';
import { genderLabel } from '../utils/shopRace';
import { formatLiveSync } from '../utils/liveSync';

function formatTabName(name) {
  return String(name || '').replace(/<>/g, ' ').trim() || 'Tab';
}

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [detail, setDetail] = useState(null);
  const [activeTabId, setActiveTabId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterQ, setFilterQ] = useState('');
  const [racePreview, setRacePreview] = useShopRacePreview();
  const [listCollapsed, setListCollapsed] = useState(false);
  const fb = useFeedback();

  // Modals state
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [shopModalMode, setShopModalMode] = useState('create'); // 'create' | 'edit'
  const [shopForm, setShopForm] = useState({ npc_id: 0, tag_name: '', type_shop: 0, initial_tab_name: 'Hàng mới' });

  const [tabModalOpen, setTabModalOpen] = useState(false);
  const [tabModalMode, setTabModalMode] = useState('create'); // 'create' | 'edit' | 'clone'
  const [tabForm, setTabForm] = useState({ name: '', targetTabId: null });

  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await api('/shops');
    setShops(res.data || []);
  }, []);

  useEffect(() => {
    load().catch((e) => fb.error(e.message));
    const onServerChange = () => {
      setDetail(null);
      setActiveTabId(null);
      setListCollapsed(false);
      load().catch((e) => fb.error(e.message));
    };
    window.addEventListener('server-changed', onServerChange);
    return () => window.removeEventListener('server-changed', onServerChange);
  }, [load]);

  async function openShop(id) {
    setLoading(true);
    try {
      const res = await api(`/shops/${id}`);
      setDetail(res.data);
      setActiveTabId(res.data?.tabs?.[0]?.id ?? null);
      setListCollapsed(true);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshDetail() {
    if (!detail?.id) return;
    const res = await api(`/shops/${detail.id}`);
    setDetail(res.data);
    if (activeTabId && !res.data.tabs?.some((t) => t.id === activeTabId)) {
      setActiveTabId(res.data.tabs?.[0]?.id ?? null);
    }
  }

  async function reload() {
    try {
      const res = await api('/shops/reload', {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      fb.success(`Đã đồng bộ shop lên game server${formatLiveSync(res.data)}`);
    } catch (e) {
      fb.error(e.message);
    }
  }

  function onEditorFeedback(msg, type) {
    if (type === 'error') fb.error(msg);
    else fb.success(msg);
  }

  // SHOP CRUD HANDLERS
  function openCreateShop() {
    setShopForm({ npc_id: 0, tag_name: '', type_shop: 0, initial_tab_name: 'Hàng mới' });
    setShopModalMode('create');
    setShopModalOpen(true);
  }

  function openEditShop() {
    if (!detail) return;
    setShopForm({
      npc_id: detail.npc_id,
      tag_name: detail.tag_name,
      type_shop: detail.type_shop ?? 0,
      initial_tab_name: '',
    });
    setShopModalMode('edit');
    setShopModalOpen(true);
  }

  async function handleSaveShop(e) {
    e.preventDefault();
    try {
      if (shopModalMode === 'create') {
        const res = await api('/shops', {
          method: 'POST',
          body: JSON.stringify({ ...shopForm, serverId: getServerId() }),
        });
        fb.success(`Đã tạo Shop mới thành công và lưu vào Database MySQL!`);
        setShopModalOpen(false);
        await load();
        if (res.data?.shopId) openShop(res.data.shopId);
      } else {
        await api(`/shops/${detail.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...shopForm, serverId: getServerId() }),
        });
        fb.success(`Đã cập nhật Shop #${detail.id} vào Database MySQL!`);
        setShopModalOpen(false);
        await load();
        await refreshDetail();
      }
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function handleDeleteShop() {
    if (!detail) return;
    if (!window.confirm(`Bạn có chắc muốn XÓA vĩnh viễn Shop #${detail.id} (${detail.tag_name}) cùng tất cả tab và vật phẩm trong Database?`)) {
      return;
    }
    try {
      await api(`/shops/${detail.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      fb.success(`Đã xóa vĩnh viễn Shop #${detail.id} khỏi Database MySQL!`);
      setDetail(null);
      setActiveTabId(null);
      await load();
    } catch (err) {
      fb.error(err.message);
    }
  }

  // TAB CRUD HANDLERS
  function openCreateTab() {
    setTabForm({ name: '', targetTabId: null });
    setTabModalMode('create');
    setTabModalOpen(true);
  }

  function openEditTab(tab) {
    setTabForm({ name: tab.name, targetTabId: tab.id });
    setTabModalMode('edit');
    setTabModalOpen(true);
  }

  function openCloneTab(tab) {
    setTabForm({ name: `${tab.name} (Copy)`, targetTabId: tab.id });
    setTabModalMode('clone');
    setTabModalOpen(true);
  }

  async function handleSaveTab(e) {
    e.preventDefault();
    if (!detail) return;
    try {
      if (tabModalMode === 'create') {
        const res = await api(`/shops/${detail.id}/tabs`, {
          method: 'POST',
          body: JSON.stringify({ name: tabForm.name, serverId: getServerId() }),
        });
        fb.success(`Đã thêm Tab mới vào Database MySQL!`);
        setTabModalOpen(false);
        await refreshDetail();
        if (res.data?.id) setActiveTabId(res.data.id);
      } else if (tabModalMode === 'edit') {
        await api(`/shops/tabs/${tabForm.targetTabId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: tabForm.name, serverId: getServerId() }),
        });
        fb.success(`Đã đổi tên Tab thành công trên Database!`);
        setTabModalOpen(false);
        await refreshDetail();
      } else if (tabModalMode === 'clone') {
        const res = await api(`/shops/tabs/${tabForm.targetTabId}/clone`, {
          method: 'POST',
          body: JSON.stringify({ newTabName: tabForm.name, serverId: getServerId() }),
        });
        fb.success(`Đã nhân bản Tab (kèm ${res.data?.itemCount || 0} items) vào Database MySQL!`);
        setTabModalOpen(false);
        await refreshDetail();
        if (res.data?.tabId) setActiveTabId(res.data.tabId);
      }
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function handleDeleteTab(tabId, tabName) {
    if (!window.confirm(`Bạn có chắc muốn XÓA vĩnh viễn Tab "${formatTabName(tabName)}" và mọi vật phẩm trong tab này?`)) {
      return;
    }
    try {
      await api(`/shops/tabs/${tabId}`, {
        method: 'DELETE',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      fb.success(`Đã xóa vĩnh viễn Tab khỏi Database!`);
      await refreshDetail();
    } catch (err) {
      fb.error(err.message);
    }
  }

  // SNAPSHOT & ROLLBACK HANDLERS
  async function openSnapshotModal() {
    setSnapshotModalOpen(true);
    setSnapshotLoading(true);
    try {
      const res = await api('/shops/snapshots');
      setSnapshots(res.data || []);
      setSnapshotTitle(detail ? `Sao lưu Shop ${detail.tag_name} (#${detail.id})` : 'Sao lưu toàn bộ Shop');
      setSnapshotDesc('');
    } catch (err) {
      fb.error(err.message);
    } finally {
      setSnapshotLoading(false);
    }
  }

  async function handleCreateSnapshot(e) {
    e.preventDefault();
    try {
      await api('/shops/snapshots', {
        method: 'POST',
        body: JSON.stringify({
          shopId: detail?.id || null,
          title: snapshotTitle,
          description: snapshotDesc,
        }),
      });
      fb.success('Đã lưu bản chụp (Snapshot) Shop an toàn vào Database!');
      const res = await api('/shops/snapshots');
      setSnapshots(res.data || []);
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function handleRollback(snapId, title) {
    if (!window.confirm(`Xác nhận KHÔI PHỤC Shop về bản sao lưu "${title}"? Dữ liệu hiện tại sẽ được ghi đè hoàn toàn theo bản sao lưu!`)) {
      return;
    }
    try {
      await api(`/shops/snapshots/${snapId}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      fb.success(`Khôi phục thành công về bản snapshot "${title}" và đồng bộ Database MySQL!`);
      setSnapshotModalOpen(false);
      await load();
      if (detail?.id) await refreshDetail();
    } catch (err) {
      fb.error(err.message);
    }
  }

  function handleExportSql() {
    const id = detail?.id ? detail.id : '';
    window.open(`/api/shops/export-sql/${id}`, '_blank');
  }

  const filteredShops = shops.filter((s) => {
    if (!filterQ.trim()) return true;
    const q = filterQ.toLowerCase();
    return String(s.id).includes(q)
      || String(s.npc_id).includes(q)
      || (s.tag_name || '').toLowerCase().includes(q);
  });

  const activeTab = detail?.tabs?.find((t) => t.id === activeTabId);

  return (
    <div className="shops-page">
      <PageHeader
        title="Quản Lý Cửa Hàng NPC (Persistence DB)"
        description="Quản trị toàn diện Shop & Tab · Lưu trữ bền vững 100% vào Database MySQL · Tự động Live-Sync Game Server."
        actions={(
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn primary" onClick={openCreateShop} title="Thêm một Shop mới vào game">
              + Tạo Shop Mới
            </button>
            <button type="button" className="btn secondary" onClick={openSnapshotModal} title="Quản lý bản chụp sao lưu & khôi phục">
              📸 Snapshot &amp; Rollback
            </button>
            <button type="button" className="btn secondary" onClick={handleExportSql} title="Tải file SQL về máy tính">
              💾 Xuất File SQL
            </button>
            <button type="button" className="btn" onClick={reload} title="Đồng bộ lại toàn bộ shop trên RAM game server">
              🔄 Reload In-Game
            </button>
          </div>
        )}
      />

      <div className="card-inner" style={{ marginBottom: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>🛡️</span>
          <div>
            <strong style={{ color: '#10b981' }}>Cơ Chế Lưu Trữ Bền Vững (Database Persistence):</strong>
            <span className="muted" style={{ marginLeft: '6px' }}>Mọi thao tác Thêm / Sửa / Xóa Shop, Tab, Vật phẩm đều được ghi thẳng vào Database MySQL qua Transactions. Không lo mất dữ liệu khi khởi động lại server.</span>
          </div>
        </div>
        <span className="badge ok">MySQL Synced</span>
      </div>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {!detail && (
        <ShopRacePills
          value={racePreview}
          onChange={setRacePreview}
          compact
          summary={
            racePreview === ''
              ? 'Chọn tộc để xem đúng item như player — giữ khi đổi tab (hiện trên menu Cửa hàng).'
              : `Đang xem như ${genderLabel(racePreview)} — áp dụng khi mở tab shop.`
          }
        />
      )}

      <div className={`shop-layout ${detail ? 'shop-layout--editing' : ''} ${listCollapsed ? 'shop-list-collapsed' : ''}`}>
        <div className="shop-list-panel card-inner">
          {detail && (
            <button
              type="button"
              className="btn sm ghost shop-list-toggle"
              onClick={() => setListCollapsed((c) => !c)}
            >
              {listCollapsed ? '▶ Danh sách shop' : '◀ Thu gọn'}
            </button>
          )}
          <div className="shop-list-head">
            <h4>Danh sách shop</h4>
            <span className="muted">{filteredShops.length} shop</span>
          </div>
          <input
            className="catalog-search"
            placeholder="Tìm tag, NPC ID..."
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
          />
          <div className="table-wrap shop-list-table">
            <table className="compact">
              <thead>
                <tr><th>Tag</th><th>NPC</th><th>Tab</th><th>Item</th><th></th></tr>
              </thead>
              <tbody>
                {filteredShops.map((s) => (
                  <tr
                    key={s.id}
                    className={detail?.id === s.id ? 'row-active' : ''}
                    onClick={() => openShop(s.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><strong>{s.tag_name}</strong></td>
                    <td><span className="badge">{s.npc_id}</span></td>
                    <td>{s.tab_count ?? '—'}</td>
                    <td>{s.item_count ?? '—'}</td>
                    <td><button type="button" className="btn sm" onClick={(e) => { e.stopPropagation(); openShop(s.id); }}>Mở</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card shop-editor">
          {!detail ? (
            <div className="shop-empty-state">
              <p className="shop-empty-title">Chưa chọn shop</p>
              <p className="muted">Bấm một dòng bên trái để mở tab, thêm item và chỉnh option. Hoặc bấm <strong>"+ Tạo Shop Mới"</strong> ở góc trên.</p>
            </div>
          ) : loading ? (
            <p className="muted shop-loading">Đang tải dữ liệu shop từ Database...</p>
          ) : (
            <div className="shop-editor-inner">
              <div className="shop-editor-top">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0 }}>{detail.tag_name}</h3>
                    <span className="badge ok">ID #{detail.id}</span>
                    <span className="badge">NPC: {detail.npc_id}</span>
                  </div>
                  <p className="muted section-sub" style={{ marginTop: '4px' }}>
                    Loại Shop: {detail.type_shop === 0 ? 'Cửa hàng thường' : `Type ${detail.type_shop}`} · Tổng số tab: {detail.tabs?.length ?? 0}
                  </p>
                </div>
                <div className="shop-editor-top-actions">
                  <button type="button" className="btn sm secondary" onClick={openEditShop} title="Sửa NPC ID, Tag, Type shop">
                    ✏️ Sửa Shop
                  </button>
                  <button type="button" className="btn sm danger" onClick={handleDeleteShop} title="Xóa Shop này khỏi DB">
                    🗑️ Xóa Shop
                  </button>
                  <button type="button" className="btn sm primary" onClick={openCreateTab} title="Thêm Tab mới cho Shop này">
                    + Thêm Tab
                  </button>
                  {listCollapsed && (
                    <button type="button" className="btn sm" onClick={() => setListCollapsed(false)}>
                      Danh sách shop
                    </button>
                  )}
                  <button type="button" className="btn sm" onClick={reload}>🔄 Reload In-game</button>
                </div>
              </div>

              {detail.tabs?.length > 0 ? (
                <div style={{ marginBottom: '16px' }}>
                  <div className="editor-tabs shop-tab-tabs" role="tablist" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {detail.tabs.map((tab) => (
                      <div key={tab.id} style={{ display: 'inline-flex', alignItems: 'center', background: activeTabId === tab.id ? 'var(--bg-active, #374151)' : 'var(--bg-surface, #1f2937)', borderRadius: '6px', border: '1px solid var(--border, #374151)' }}>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeTabId === tab.id}
                          className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                          style={{ border: 'none', background: 'transparent' }}
                          onClick={() => setActiveTabId(tab.id)}
                        >
                          {formatTabName(tab.name)}
                          <span className="tab-count">{tab.items?.length || 0}</span>
                        </button>
                        <div style={{ display: 'inline-flex', padding: '0 4px', gap: '2px' }}>
                          <button type="button" className="btn sm ghost" style={{ padding: '2px 4px', fontSize: '0.75rem' }} title="Sửa tên tab" onClick={(e) => { e.stopPropagation(); openEditTab(tab); }}>✏️</button>
                          <button type="button" className="btn sm ghost" style={{ padding: '2px 4px', fontSize: '0.75rem' }} title="Nhân bản tab" onClick={(e) => { e.stopPropagation(); openCloneTab(tab); }}>📋</button>
                          <button type="button" className="btn sm ghost" style={{ padding: '2px 4px', fontSize: '0.75rem', color: '#ef4444' }} title="Xóa tab khỏi DB" onClick={(e) => { e.stopPropagation(); handleDeleteTab(tab.id, tab.name); }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeTab ? (
                <ShopTabEditor
                  key={`${getServerId()}-${detail.id}-${activeTab.id}`}
                  tab={activeTab}
                  shopId={detail.id}
                  shopMeta={{ npcId: detail.npc_id, tagName: detail.tag_name }}
                  onRefresh={refreshDetail}
                  onFeedback={onEditorFeedback}
                />
              ) : (
                <div className="card-inner" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p className="muted empty-hint">Shop này chưa có tab nào trong Database.</p>
                  <button type="button" className="btn primary" onClick={openCreateTab} style={{ marginTop: '12px' }}>
                    + Thêm Tab Đầu Tiên Cho Shop
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL TẠO / SỬA SHOP */}
      {shopModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '480px', width: '90%' }}>
            <div className="modal-header">
              <h3>{shopModalMode === 'create' ? 'Tạo Shop Mới (Lưu MySQL)' : `Sửa Shop #${detail?.id}`}</h3>
              <button type="button" className="btn sm ghost" onClick={() => setShopModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveShop} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div>
                <label className="label">NPC ID (ID nhân vật NPC mở shop):</label>
                <input
                  type="number"
                  className="input"
                  required
                  value={shopForm.npc_id}
                  onChange={(e) => setShopForm((p) => ({ ...p, npc_id: Number(e.target.value) }))}
                />
                <span className="muted" style={{ fontSize: '0.8rem' }}>Ví dụ: 0 = Quy Lão, 1 = Bulma, 13 = Santa, 39 = Whis...</span>
              </div>
              <div>
                <label className="label">Tag Name (Tên định danh Shop):</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="VD: SANTA, BUNMA, URANAI..."
                  value={shopForm.tag_name}
                  onChange={(e) => setShopForm((p) => ({ ...p, tag_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Loại Shop (type_shop):</label>
                <select
                  className="input"
                  value={shopForm.type_shop}
                  onChange={(e) => setShopForm((p) => ({ ...p, type_shop: Number(e.target.value) }))}
                >
                  <option value="0">0 - Shop thông thường (Mua bằng Vàng/Ngọc)</option>
                  <option value="1">1 - Shop đặc biệt (Mua bằng vật phẩm trao đổi / Ruby)</option>
                  <option value="2">2 - Shop học kỹ năng</option>
                  <option value="3">3 - Shop giảm giá</option>
                </select>
              </div>
              {shopModalMode === 'create' && (
                <div>
                  <label className="label">Tên Tab Ban Đầu:</label>
                  <input
                    type="text"
                    className="input"
                    value={shopForm.initial_tab_name}
                    onChange={(e) => setShopForm((p) => ({ ...p, initial_tab_name: e.target.value }))}
                  />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setShopModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn primary">
                  {shopModalMode === 'create' ? 'Tạo Shop & Lưu Database' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO / SỬA / CLONE TAB */}
      {tabModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="modal-header">
              <h3>
                {tabModalMode === 'create' && 'Thêm Tab Mới'}
                {tabModalMode === 'edit' && 'Đổi Tên Tab'}
                {tabModalMode === 'clone' && 'Nhân Bản Tab'}
              </h3>
              <button type="button" className="btn sm ghost" onClick={() => setTabModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveTab} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div>
                <label className="label">Tên Tab:</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="VD: Cải trang, Vật phẩm, Hàng hiếm..."
                  value={tabForm.name}
                  onChange={(e) => setTabForm((p) => ({ ...p, name: e.target.value }))}
                />
                <span className="muted" style={{ fontSize: '0.8rem' }}>Dùng ký tự &lt;&gt; nếu muốn xuống dòng trong game.</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setTabModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn primary">
                  Lưu Vào Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SNAPSHOT & ROLLBACK */}
      {snapshotModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '680px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>📸 Bản Chụp (Snapshot) &amp; Khôi Phục (Rollback) Shop</h3>
              <button type="button" className="btn sm ghost" onClick={() => setSnapshotModalOpen(false)}>✕</button>
            </div>

            <div style={{ marginTop: '14px' }}>
              <form onSubmit={handleCreateSnapshot} className="card-inner" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong>Tạo Bản Chụp Mới (Lưu trạng thái an toàn trước khi sửa):</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="Tiêu đề sao lưu (VD: Trước khi update Tết)..."
                    value={snapshotTitle}
                    onChange={(e) => setSnapshotTitle(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="Mô tả ghi chú (tùy chọn)..."
                    value={snapshotDesc}
                    onChange={(e) => setSnapshotDesc(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn primary sm">Lưu Bản Chụp Vào MySQL</button>
                </div>
              </form>

              <h4>Danh Sách Bản Chụp Đã Lưu:</h4>
              {snapshotLoading ? (
                <p className="muted">Đang tải danh sách snapshot...</p>
              ) : snapshots.length === 0 ? (
                <p className="muted">Chưa có bản chụp nào được lưu.</p>
              ) : (
                <div className="table-wrap">
                  <table className="compact">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tiêu đề</th>
                        <th>Phạm vi</th>
                        <th>Thời gian</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((s) => (
                        <tr key={s.id}>
                          <td>#{s.id}</td>
                          <td>
                            <strong>{s.title}</strong>
                            {s.description && <div className="muted" style={{ fontSize: '0.8rem' }}>{s.description}</div>}
                          </td>
                          <td>{s.shop_id ? `Shop #${s.shop_id}` : 'Toàn bộ Shop'}</td>
                          <td>{new Date(s.created_at).toLocaleString('vi-VN')}</td>
                          <td>
                            <button
                              type="button"
                              className="btn sm danger"
                              onClick={() => handleRollback(s.id, s.title)}
                              title="Khôi phục dữ liệu về bản sao lưu này"
                            >
                              Khôi phục
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
