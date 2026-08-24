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
  const fb = useFeedback();

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

  const filteredShops = shops.filter((s) => {
    if (!filterQ.trim()) return true;
    const q = filterQ.toLowerCase();
    return String(s.id).includes(q)
      || String(s.npc_id).includes(q)
      || (s.tag_name || '').toLowerCase().includes(q);
  });

  const activeTab = detail?.tabs?.find((t) => t.id === activeTabId);
  const [listCollapsed, setListCollapsed] = useState(false);

  return (
    <div className="shops-page">
      <PageHeader
        title="Quản lý cửa hàng NPC"
        description="Chọn shop → tab → lọc tộc → thêm / chỉnh item → Lưu."
        actions={(
          <button type="button" className="btn primary" onClick={reload} title="Đồng bộ shop lên game (đóng NPC rồi mở lại)">
            Reload in-game
          </button>
        )}
      />

      <details className="shop-page-help">
        <summary>Hướng dẫn lọc tộc &amp; gender</summary>
        <ul className="muted">
          <li><strong>gender 0/1/2</strong> = Trái Đất / Namec / Xayda · <strong>≥3</strong> = Chung (mọi tộc)</li>
          <li>Cột «Chi tiết» → <strong>Tộc hệ vật phẩm</strong>: ghi đè <code>item_shop.gender_override</code> (null = theo template)</li>
          <li>Bấm pill tộc (trang hoặc editor) — lọc được lưu và hiện trên menu «Cửa hàng»</li>
          <li>Sau sửa DB: Reload in-game + player đóng/mở lại shop</li>
        </ul>
      </details>

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
                    <td>{s.npc_id}</td>
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
              <p className="muted">Bấm một dòng bên trái để mở tab, thêm item và chỉnh option.</p>
            </div>
          ) : loading ? (
            <p className="muted shop-loading">Đang tải shop...</p>
          ) : (
            <div className="shop-editor-inner">
              <div className="shop-editor-top">
                <div>
                  <h3>{detail.tag_name}</h3>
                  <p className="muted section-sub">
                    #{detail.id} · NPC {detail.npc_id} · {detail.tabs?.length ?? 0} tab
                  </p>
                </div>
                <div className="shop-editor-top-actions">
                  {listCollapsed && (
                    <button type="button" className="btn sm" onClick={() => setListCollapsed(false)}>
                      Danh sách shop
                    </button>
                  )}
                  <button type="button" className="btn sm" onClick={reload}>Reload</button>
                </div>
              </div>

              {detail.tabs?.length > 0 ? (
                <div className="editor-tabs shop-tab-tabs" role="tablist">
                  {detail.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTabId === tab.id}
                      className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTabId(tab.id)}
                    >
                      {formatTabName(tab.name)}
                      <span className="tab-count">{tab.items?.length || 0}</span>
                    </button>
                  ))}
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
                <p className="muted empty-hint">Shop không có tab.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
