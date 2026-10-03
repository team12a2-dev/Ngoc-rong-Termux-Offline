import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import ItemIcon from '../components/ItemIcon';

const EMPTY_FORM = {
  type: 0,
  gender: 3,
  name: '',
  description: '',
  level: 1,
  icon_id: 0,
  part: -1,
  is_up_to_up: 0,
  power_require: 0,
  gold: 0,
  gem: 0,
  head: -1,
  body: -1,
  leg: -1,
};

const TYPES = [
  { id: 0, label: 'Áo', icon: '🥋' },
  { id: 1, label: 'Quần', icon: '👖' },
  { id: 2, label: 'Găng', icon: '🥊' },
  { id: 3, label: 'Giày', icon: '👟' },
  { id: 4, label: 'Rada', icon: '📡' },
  { id: 5, label: 'Thức ăn / Cải trang (5)', icon: '🍖' },
  { id: 6, label: 'Đậu thần', icon: '🫘' },
  { id: 7, label: 'Sách kỹ năng', icon: '📜' },
  { id: 8, label: 'Vật phẩm nhiệm vụ', icon: '📖' },
  { id: 9, label: 'Vàng', icon: '🪙' },
  { id: 10, label: 'Ngọc xanh', icon: '💎' },
  { id: 11, label: 'Lồng đèn / Cờ / Phụ kiện', icon: '🏮' },
  { id: 12, label: 'Ngọc rồng / Bí ngô', icon: '🔮' },
  { id: 13, label: 'Bùa', icon: '📜' },
  { id: 14, label: 'Đá khoáng sản / Ruby', icon: '💎' },
  { id: 15, label: 'Mảnh đá vụn', icon: '🪨' },
  { id: 16, label: 'Bình nước phép', icon: '🧪' },
  { id: 17, label: 'Đai lưng', icon: '🥋' },
  { id: 18, label: 'Pet / Thú cưng đeo', icon: '🦄' },
  { id: 19, label: 'Bông tai Porata', icon: '✨' },
  { id: 21, label: 'Cải trang', icon: '🎭' },
  { id: 22, label: 'Vệ tinh', icon: '🛰️' },
  { id: 23, label: 'Thú cưỡi', icon: '🐎' },
  { id: 24, label: 'Thú cưỡi VIP', icon: '🐉' },
  { id: 25, label: 'Gói dò ngọc', icon: '📦' },
  { id: 27, label: 'Hộp / Rương / Trứng', icon: '🎁' },
  { id: 28, label: 'Cờ đeo', icon: '🚩' },
  { id: 29, label: 'Vật phẩm bổ trợ', icon: '🧪' },
  { id: 30, label: 'Đá / Sao pha lê', icon: '💎' },
  { id: 31, label: 'Bánh thức ăn', icon: '🥮' },
  { id: 32, label: 'Giáp tập luyện', icon: '🥋' },
  { id: 33, label: 'Mảnh quái / Thẻ', icon: '🃏' },
  { id: 34, label: 'Hồng ngọc', icon: '💎' },
  { id: 35, label: 'Sách tuyệt kỹ', icon: '📘' },
  { id: 36, label: 'Danh hiệu', icon: '👑' },
  { id: 37, label: 'Bí kíp tuyệt kỹ', icon: '📙' },
  { id: 38, label: 'Hiệu ứng / Bóng mờ', icon: '✨' },
  { id: 75, label: 'Slot trống (Placeholder)', icon: '📭' },
];

const GENDERS = [
  { id: 0, label: 'Trái Đất', short: 'TĐ', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' },
  { id: 1, label: 'Namek', short: 'NM', bg: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' },
  { id: 2, label: 'Xayda', short: 'XD', bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171' },
  { id: 3, label: 'Dùng chung', short: 'ALL', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
];

function getTypeInfo(typeId) {
  const found = TYPES.find((t) => t.id === Number(typeId));
  return found || { id: typeId, label: `Loại ${typeId}`, icon: '📦' };
}

function getGenderInfo(genderId) {
  const found = GENDERS.find((g) => g.id === Number(genderId));
  return found || { id: genderId, label: `Tộc ${genderId}`, short: `T${genderId}`, bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' };
}

function numberField(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Hiển thị hình ảnh icon thực tế của Part, Head, Body, Leg
 */
function PartThumbnailPreview({ partPreview, head, body, leg, part, partsMap, size = 32, showLabels = true, compact = false }) {
  const p = partPreview || {};
  const hId = Number(head ?? p.head?.id ?? -1);
  const bId = Number(body ?? p.body?.id ?? -1);
  const lId = Number(leg ?? p.leg?.id ?? -1);
  const pId = Number(part ?? p.part?.id ?? -1);

  const headIcon = p.head?.icon || (hId >= 0 ? (partsMap?.[`${hId}_0`]?.mainIcon || partsMap?.[String(hId)]?.mainIcon) : null);
  const bodyIcon = p.body?.icon || (bId >= 0 ? (partsMap?.[`${bId}_1`]?.mainIcon || partsMap?.[String(bId)]?.mainIcon) : null);
  const legIcon = p.leg?.icon || (lId >= 0 ? (partsMap?.[`${lId}_2`]?.mainIcon || partsMap?.[String(lId)]?.mainIcon) : null);
  const partIcon = p.part?.icon || (pId >= 0 ? (partsMap?.[String(pId)]?.mainIcon || partsMap?.[`${pId}_0`]?.mainIcon || partsMap?.[`${pId}_1`]?.mainIcon || partsMap?.[`${pId}_2`]?.mainIcon) : null);

  const hasHead = headIcon > 0 || hId >= 0;
  const hasBody = bodyIcon > 0 || bId >= 0;
  const hasLeg = legIcon > 0 || lId >= 0;
  const hasPart = partIcon > 0 || pId >= 0;

  if (!hasHead && !hasBody && !hasLeg && !hasPart) {
    return <span className="muted" style={{ fontSize: '0.78rem' }}>Part: -1</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Visual sprite frames list */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '4px' : '6px', flexWrap: 'wrap' }}>
        {/* Head sprite */}
        {hId >= 0 && (
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2px 4px',
              background: 'rgba(56, 189, 248, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
            title={`Đầu (Head Part #${hId}): ${headIcon ? `Icon sprite #${headIcon}` : 'Chưa có icon sprite'}`}
          >
            {headIcon > 0 ? (
              <ItemIcon iconId={headIcon} size={size} />
            ) : (
              <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#38bdf8' }}>
                🧢
              </div>
            )}
            {showLabels && (
              <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 600 }}>
                H:{hId}
              </span>
            )}
          </div>
        )}

        {/* Body sprite */}
        {bId >= 0 && (
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2px 4px',
              background: 'rgba(192, 132, 252, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(192, 132, 252, 0.25)',
            }}
            title={`Thân (Body Part #${bId}): ${bodyIcon ? `Icon sprite #${bodyIcon}` : 'Chưa có icon sprite'}`}
          >
            {bodyIcon > 0 ? (
              <ItemIcon iconId={bodyIcon} size={size} />
            ) : (
              <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#c084fc' }}>
                🥋
              </div>
            )}
            {showLabels && (
              <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 600 }}>
                B:{bId}
              </span>
            )}
          </div>
        )}

        {/* Leg sprite */}
        {lId >= 0 && (
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2px 4px',
              background: 'rgba(244, 114, 182, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(244, 114, 182, 0.25)',
            }}
            title={`Chân (Leg Part #${lId}): ${legIcon ? `Icon sprite #${legIcon}` : 'Chưa có icon sprite'}`}
          >
            {legIcon > 0 ? (
              <ItemIcon iconId={legIcon} size={size} />
            ) : (
              <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#f472b6' }}>
                👖
              </div>
            )}
            {showLabels && (
              <span style={{ fontSize: '0.68rem', color: '#f472b6', fontWeight: 600 }}>
                L:{lId}
              </span>
            )}
          </div>
        )}

        {/* Part sprite (nếu có Part ID riêng và khác head/body/leg) */}
        {pId >= 0 && (pId !== hId && pId !== bId && pId !== lId || (!hasHead && !hasBody && !hasLeg)) && (
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2px 4px',
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(251, 191, 36, 0.25)',
            }}
            title={`Part #${pId}: ${partIcon ? `Icon sprite #${partIcon}` : 'Chưa có icon sprite'}`}
          >
            {partIcon > 0 ? (
              <ItemIcon iconId={partIcon} size={size} />
            ) : (
              <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#fbbf24' }}>
                🧩
              </div>
            )}
            {showLabels && (
              <span style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 600 }}>
                P:{pId}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Text summary below icons */}
      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
        {pId >= 0 && <span>Part: <strong style={{ color: '#e2e8f0' }}>#{pId}</strong></span>}
        {(hId >= 0 || bId >= 0 || lId >= 0) && (
          <span style={{ marginLeft: pId >= 0 ? '6px' : '0' }}>
            (H:{hId} B:{bId} L:{lId})
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable Quick Pagination Toolbar with Jump-to-page
 */
function QuickPaginationBar({ total, limit, offset, onPageChange, onLimitChange, loading = false, label = 'mục' }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const [jumpPageInput, setJumpPageInput] = useState('');

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const targetPage = Number(jumpPageInput);
    if (Number.isInteger(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      onPageChange((targetPage - 1) * limit);
      setJumpPageInput('');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
        gap: '12px',
        margin: '10px 0',
      }}
    >
      <div className="muted" style={{ fontSize: '0.86rem' }}>
        Hiển thị <strong>{total > 0 ? offset + 1 : 0}</strong> - <strong>{Math.min(offset + limit, total)}</strong> / <strong>{total.toLocaleString('vi-VN')}</strong> {label}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Page size limit */}
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          style={{ padding: '4px 8px', fontSize: '0.82rem', background: '#1e293b', color: '#f8fafc', border: '1px solid #475569' }}
        >
          <option value="50">50 / trang</option>
          <option value="100">100 / trang</option>
          <option value="200">200 / trang</option>
          <option value="500">500 / trang</option>
          <option value="1000">1,000 / trang</option>
        </select>

        {/* Jump to first page */}
        <button
          className="btn sm"
          type="button"
          disabled={offset === 0 || loading}
          onClick={() => onPageChange(0)}
          title="Về trang đầu tiên (Trang 1)"
        >
          ⏮ Đầu
        </button>

        {/* Previous page */}
        <button
          className="btn sm"
          type="button"
          disabled={offset === 0 || loading}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          title="Về trang trước"
        >
          ◀ Trước
        </button>

        {/* Page indicators & direct input */}
        <form onSubmit={handleJumpSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.86rem', color: '#cbd5e1' }}>Trang</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            placeholder={String(currentPage)}
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            style={{
              width: '56px',
              padding: '3px 6px',
              fontSize: '0.85rem',
              textAlign: 'center',
              fontWeight: 700,
              background: '#0f172a',
              borderColor: '#3b82f6',
              color: '#60a5fa',
            }}
          />
          <span style={{ fontSize: '0.86rem', color: '#cbd5e1' }}>/ {totalPages}</span>
          <button
            className="btn sm primary"
            type="submit"
            disabled={!jumpPageInput || loading}
            style={{ padding: '3px 8px', fontSize: '0.78rem' }}
          >
            Nhảy ➔
          </button>
        </form>

        {/* Next page */}
        <button
          className="btn sm"
          type="button"
          disabled={offset + limit >= total || loading}
          onClick={() => onPageChange(offset + limit)}
          title="Sang trang kế tiếp"
        >
          Kế ▶
        </button>

        {/* Jump to last page */}
        <button
          className="btn sm"
          type="button"
          disabled={offset + limit >= total || loading}
          onClick={() => onPageChange((totalPages - 1) * limit)}
          title={`Đến trang cuối cùng (Trang ${totalPages})`}
        >
          Cuối ⏭
        </button>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  const navigate = useNavigate();
  const fb = useFeedback();

  // Tab: 'compare' (So sánh đối chiếu Export), 'db' (Quản lý Database), 'export_view' (Bản dựng Export)
  const [activeTab, setActiveTab] = useState('compare');

  // Global Parts Map cache for live form preview
  const [partsMap, setPartsMap] = useState({});

  // --- TAB 1: DATABASE ITEMS STATE ---
  const [dbRows, setDbRows] = useState([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbNextId, setDbNextId] = useState(0);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbQ, setDbQ] = useState('');
  const [dbType, setDbType] = useState('all');
  const [dbGender, setDbGender] = useState('all');
  const [dbHasIcon, setDbHasIcon] = useState('all');
  const [dbPartStatus, setDbPartStatus] = useState('all');
  const [dbSlotStatus, setDbSlotStatus] = useState('all');
  const [dbSortBy, setDbSortBy] = useState('icon_id');
  const [dbSortDir, setDbSortDir] = useState('asc');
  const [dbMinIcon, setDbMinIcon] = useState('');
  const [dbMaxIcon, setDbMaxIcon] = useState('');
  const [dbExactIcon, setDbExactIcon] = useState('');
  const [dbPartId, setDbPartId] = useState('');
  const [dbAvatarId, setDbAvatarId] = useState('');
  const [dbLimit, setDbLimit] = useState(100);
  const [dbOffset, setDbOffset] = useState(0);

  // Form State
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [syncWithExportFile, setSyncWithExportFile] = useState(true);
  const [busy, setBusy] = useState(false);

  // Quick Edit Name & Description Modal State
  const [quickTextModal, setQuickTextModal] = useState(null); // { id, dbItem, exportItem, name, description, iconId, type }
  const [quickTextBusy, setQuickTextBusy] = useState(false);

  // --- TAB 2: COMPARE STATE ---
  const [compareSummary, setCompareSummary] = useState(null);
  const [compareItems, setCompareItems] = useState([]);
  const [compareTotal, setCompareTotal] = useState(0);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareFilter, setCompareFilter] = useState('all');
  const [compareType, setCompareType] = useState('all');
  const [compareSortBy, setCompareSortBy] = useState('icon_id');
  const [compareSortDir, setCompareSortDir] = useState('asc');
  const [compareMinIcon, setCompareMinIcon] = useState('');
  const [compareMaxIcon, setCompareMaxIcon] = useState('');
  const [compareExactIcon, setCompareExactIcon] = useState('');
  const [comparePartId, setComparePartId] = useState('');
  const [compareAvatarId, setCompareAvatarId] = useState('');
  const [compareIconMismatchOnly, setCompareIconMismatchOnly] = useState(false);
  const [compareQ, setCompareQ] = useState('');
  const [compareLimit, setCompareLimit] = useState(100);
  const [compareOffset, setCompareOffset] = useState(0);
  const [selectedCompareIds, setSelectedCompareIds] = useState(new Set());

  // Part & Avatar Catalog Modal State
  const [partsCatalog, setPartsCatalog] = useState([]);
  const [avatarsCatalog, setAvatarsCatalog] = useState([]);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogModalTab, setCatalogModalTab] = useState('parts'); // 'parts' | 'avatars'
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState('all'); // 'all' | 0 | 1 | 2

  // Deep Diagnostic Modal State
  const [diagnosticModalItem, setDiagnosticModalItem] = useState(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);

  // Delete Item Modal State (Xóa item kèm Part và Head Avatar)
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [deletePartsChecked, setDeletePartsChecked] = useState(true);
  const [deleteHeadAvatarChecked, setDeleteHeadAvatarChecked] = useState(true);
  const [deleteForceChecked, setDeleteForceChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function openDeleteModal(itemOrDbItem) {
    if (!itemOrDbItem) return;
    const dbItem = itemOrDbItem.dbItem || itemOrDbItem;
    const itemData = {
      isBatch: false,
      id: Number(itemOrDbItem.id ?? dbItem.id),
      name: String(dbItem.NAME || itemOrDbItem.name || `Item #${itemOrDbItem.id}`),
      icon_id: Number(dbItem.icon_id ?? itemOrDbItem.icon_id ?? 0),
      type: Number(dbItem.type ?? itemOrDbItem.type ?? 0),
      gender: Number(dbItem.gender ?? itemOrDbItem.gender ?? 0),
      part: Number(dbItem.part ?? itemOrDbItem.part ?? -1),
      head: Number(dbItem.head ?? itemOrDbItem.head ?? -1),
      body: Number(dbItem.body ?? itemOrDbItem.body ?? -1),
      leg: Number(dbItem.leg ?? itemOrDbItem.leg ?? -1),
      dbItem,
    };
    setDeleteModalItem(itemData);
    setDeletePartsChecked(true);
    setDeleteHeadAvatarChecked(true);
    setDeleteForceChecked(false);
  }

  function openBulkDeleteModal(targetTab = 'compare') {
    const ids = targetTab === 'compare' ? Array.from(selectedCompareIds) : Array.from(selectedDbIds);
    if (!ids.length) {
      fb.error('Vui lòng tích chọn ít nhất 1 item để xóa!');
      return;
    }
    const itemsList = targetTab === 'compare'
      ? compareItems.filter((i) => selectedCompareIds.has(i.id)).map((i) => ({
          id: i.id,
          name: i.dbItem?.NAME || i.exportItem?.NAME || `Item #${i.id}`,
          icon_id: i.dbItem?.icon_id ?? i.exportItem?.icon_id ?? 0,
          part: i.dbItem?.part ?? -1,
          head: i.dbItem?.head ?? -1,
          body: i.dbItem?.body ?? -1,
          leg: i.dbItem?.leg ?? -1,
        }))
      : dbRows.filter((r) => selectedDbIds.has(r.id)).map((r) => ({
          id: r.id,
          name: r.NAME || `Item #${r.id}`,
          icon_id: r.icon_id ?? 0,
          part: r.part ?? -1,
          head: r.head ?? -1,
          body: r.body ?? -1,
          leg: r.leg ?? -1,
        }));

    setDeleteModalItem({
      isBatch: true,
      ids,
      items: itemsList,
      targetTab,
    });
    setDeletePartsChecked(true);
    setDeleteHeadAvatarChecked(true);
    setDeleteForceChecked(false);
  }

  function closeDeleteModal() {
    if (isDeleting) return;
    setDeleteModalItem(null);
  }

  async function confirmDeleteItemFromDb() {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    try {
      if (deleteModalItem.isBatch) {
        const res = await api('/items/delete-batch', {
          method: 'POST',
          body: JSON.stringify({
            ids: deleteModalItem.ids,
            serverId: getServerId(),
            deleteParts: deletePartsChecked,
            deleteHeadAvatar: deleteHeadAvatarChecked,
            force: deleteForceChecked,
          }),
        });
        if (res.ok) {
          const count = res.data?.deletedItemsCount ?? deleteModalItem.ids.length;
          const pCount = res.data?.deletedPartsCount ?? (res.data?.deletedParts?.length || 0);
          const aCount = res.data?.deletedHeadAvatarsCount ?? (res.data?.deletedHeadAvatars?.length || 0);
          fb.success(`Đã xóa thành công ${count} vật phẩm (kèm ${pCount} Part, ${aCount} Head Avatar) khỏi MariaDB!`);
          if (deleteModalItem.targetTab === 'compare') {
            setSelectedCompareIds(new Set());
          } else {
            setSelectedDbIds(new Set());
          }
          closeDeleteModal();
          if (activeTab === 'compare') await loadCompareData();
          if (activeTab === 'db') await loadDbItems();
        }
      } else {
        const res = await api(`/items/${deleteModalItem.id}`, {
          method: 'DELETE',
          body: JSON.stringify({
            serverId: getServerId(),
            deleteParts: deletePartsChecked,
            deleteHeadAvatar: deleteHeadAvatarChecked,
            force: deleteForceChecked,
          }),
        });
        if (res.ok) {
          const pCount = res.data?.deletedPartsCount ?? (res.data?.deletedParts?.length || 0);
          const aCount = res.data?.deletedHeadAvatarsCount ?? (res.data?.deletedHeadAvatars?.length || 0);
          fb.success(`Đã xóa thành công Item #${deleteModalItem.id} "${deleteModalItem.name}" (kèm ${pCount} Part, ${aCount} Head Avatar) khỏi MariaDB!`);
          closeDeleteModal();
          if (activeTab === 'compare') await loadCompareData();
          if (activeTab === 'db') await loadDbItems();
        }
      }
    } catch (e) {
      fb.error(`Lỗi khi xóa: ${e.message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  // --- TAB 3: EXPORT RAW VIEW STATE ---
  const [exportRows, setExportRows] = useState([]);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSortBy, setExportSortBy] = useState('icon_id');
  const [exportSortDir, setExportSortDir] = useState('asc');
  const [exportType, setExportType] = useState('all');
  const [exportGender, setExportGender] = useState('all');
  const [exportMinIcon, setExportMinIcon] = useState('');
  const [exportMaxIcon, setExportMaxIcon] = useState('');
  const [exportExactIcon, setExportExactIcon] = useState('');
  const [exportPartId, setExportPartId] = useState('');
  const [exportAvatarId, setExportAvatarId] = useState('');
  const [exportQ, setExportQ] = useState('');
  const [exportLimit, setExportLimit] = useState(100);
  const [exportOffset, setExportOffset] = useState(0);

  // Selected items in Export Tab & Import Range to DB Modal State
  const [selectedExportIds, setSelectedExportIds] = useState(new Set());
  const [importModal, setImportModal] = useState(null);
  const [isImportingToDb, setIsImportingToDb] = useState(false);
  const [quickExpRangeStart, setQuickExpRangeStart] = useState('');
  const [quickExpRangeEnd, setQuickExpRangeEnd] = useState('');

  // Load parts map, parts catalog, and head avatars catalog once on mount
  useEffect(() => {
    api('/items/parts-map')
      .then((res) => {
        if (res.ok && res.data) {
          setPartsMap(res.data);
        }
      })
      .catch(() => {});

    api('/items/parts-catalog')
      .then((res) => {
        if (res.ok && res.data) {
          setPartsCatalog(res.data);
        }
      })
      .catch(() => {});

    api('/items/head-avatars-catalog')
      .then((res) => {
        if (res.ok && res.data) {
          setAvatarsCatalog(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Compute live part preview for the form
  const formPartPreview = useMemo(() => {
    const res = {};
    const headId = Number(form.head ?? -1);
    const bodyId = Number(form.body ?? -1);
    const legId = Number(form.leg ?? -1);
    const partId = Number(form.part ?? -1);

    if (headId >= 0) {
      const p = partsMap[`${headId}_0`] || partsMap[String(headId)];
      res.head = { id: headId, icon: p?.mainIcon ?? null };
    }
    if (bodyId >= 0) {
      const p = partsMap[`${bodyId}_1`] || partsMap[String(bodyId)];
      res.body = { id: bodyId, icon: p?.mainIcon ?? null };
    }
    if (legId >= 0) {
      const p = partsMap[`${legId}_2`] || partsMap[String(legId)];
      res.leg = { id: legId, icon: p?.mainIcon ?? null };
    }
    if (partId >= 0) {
      const p = partsMap[String(partId)] || partsMap[`${partId}_0`];
      res.part = { id: partId, icon: p?.mainIcon ?? null };
    }
    return res;
  }, [form.head, form.body, form.leg, form.part, partsMap]);

  // Handlers to apply selected part or avatar from catalog modal
  function handleSelectPartFromCatalog(partId) {
    const pId = String(partId);
    if (activeTab === 'db') {
      setDbPartId(pId);
      setDbOffset(0);
    } else if (activeTab === 'compare') {
      setComparePartId(pId);
      setCompareOffset(0);
    } else {
      setExportPartId(pId);
      setExportOffset(0);
    }
    setCatalogModalOpen(false);
  }

  function handleSelectAvatarFromCatalog(avatarId) {
    const avId = String(avatarId);
    if (activeTab === 'db') {
      setDbAvatarId(avId);
      setDbOffset(0);
    } else if (activeTab === 'compare') {
      setCompareAvatarId(avId);
      setCompareOffset(0);
    } else {
      setExportAvatarId(avId);
      setExportOffset(0);
    }
    setCatalogModalOpen(false);
  }

  // Load Database Items
  async function loadDbItems(silent = false) {
    if (!silent) setDbLoading(true);
    try {
      const params = new URLSearchParams({
        q: dbQ,
        sort_by: dbSortBy,
        sort_dir: dbSortDir,
        limit: String(dbLimit),
        offset: String(dbOffset),
      });
      if (dbType !== 'all') params.append('type', dbType);
      if (dbGender !== 'all') params.append('gender', dbGender);
      if (dbHasIcon !== 'all') params.append('has_icon', dbHasIcon);
      if (dbPartStatus !== 'all') params.append('part_status', dbPartStatus);
      if (dbSlotStatus !== 'all') params.append('slot_status', dbSlotStatus);
      if (dbMinIcon) params.append('min_icon', dbMinIcon);
      if (dbMaxIcon) params.append('max_icon', dbMaxIcon);
      if (dbExactIcon) params.append('exact_icon', dbExactIcon);
      if (dbPartId) params.append('part_id', dbPartId);
      if (dbAvatarId) params.append('head_avatar_id', dbAvatarId);

      const res = await api(`/items?${params.toString()}`);
      if (res.ok) {
        setDbRows(res.data?.rows || []);
        setDbTotal(res.data?.total || 0);
        setDbNextId(res.data?.nextId || 0);
      }
    } catch (e) {
      fb.error(`Lỗi tải danh sách DB: ${e.message}`);
    } finally {
      if (!silent) setDbLoading(false);
    }
  }

  // Load Compare Data
  async function loadCompareData(silent = false) {
    if (!silent) setCompareLoading(true);
    try {
      const params = new URLSearchParams({
        status: compareFilter,
        q: compareQ,
        sort_by: compareSortBy,
        sort_dir: compareSortDir,
        limit: String(compareLimit),
        offset: String(compareOffset),
      });
      if (compareType !== 'all') params.append('type', compareType);
      if (compareMinIcon) params.append('min_icon', compareMinIcon);
      if (compareMaxIcon) params.append('max_icon', compareMaxIcon);
      if (compareExactIcon) params.append('exact_icon', compareExactIcon);
      if (comparePartId) params.append('part_id', comparePartId);
      if (compareAvatarId) params.append('head_avatar_id', compareAvatarId);
      if (compareIconMismatchOnly) params.append('icon_mismatch', '1');

      const res = await api(`/items/compare?${params.toString()}`);
      if (res.ok) {
        setCompareSummary(res.data?.summary || null);
        setCompareItems(res.data?.items || []);
        setCompareTotal(res.data?.totalFiltered || 0);
      }
    } catch (e) {
      fb.error(`Lỗi đối chiếu so sánh: ${e.message}`);
    } finally {
      if (!silent) setCompareLoading(false);
    }
  }

  // Load Export Raw Data
  async function loadExportData(silent = false) {
    if (!silent) setExportLoading(true);
    try {
      const params = new URLSearchParams({
        q: exportQ,
        sort_by: exportSortBy,
        sort_dir: exportSortDir,
        limit: String(exportLimit),
        offset: String(exportOffset),
      });
      if (exportType !== 'all') params.append('type', exportType);
      if (exportGender !== 'all') params.append('gender', exportGender);
      if (exportMinIcon) params.append('min_icon', exportMinIcon);
      if (exportMaxIcon) params.append('max_icon', exportMaxIcon);
      if (exportExactIcon) params.append('exact_icon', exportExactIcon);
      if (exportPartId) params.append('part_id', exportPartId);
      if (exportAvatarId) params.append('head_avatar_id', exportAvatarId);

      const res = await api(`/items/export-data?${params.toString()}`);
      if (res.ok) {
        setExportRows(res.data?.rows || []);
        setExportTotal(res.data?.total || 0);
      }
    } catch (e) {
      fb.error(`Lỗi đọc file export: ${e.message}`);
    } finally {
      if (!silent) setExportLoading(false);
    }
  }

  // Load Compare Data when filters change
  useEffect(() => {
    loadCompareData(compareItems.length > 0);
  }, [
    compareFilter, compareType, compareSortBy, compareSortDir, compareMinIcon, compareMaxIcon, compareExactIcon, comparePartId, compareAvatarId, compareIconMismatchOnly, compareLimit, compareOffset,
  ]);

  // Load DB Items when filters change
  useEffect(() => {
    loadDbItems(dbRows.length > 0);
  }, [
    dbLimit, dbOffset, dbType, dbGender, dbHasIcon, dbPartStatus, dbSlotStatus, dbSortBy, dbSortDir, dbMinIcon, dbMaxIcon, dbExactIcon, dbPartId, dbAvatarId,
  ]);

  // Load Export Data when filters change
  useEffect(() => {
    loadExportData(exportRows.length > 0);
  }, [
    exportSortBy, exportSortDir, exportType, exportGender, exportMinIcon, exportMaxIcon, exportExactIcon, exportPartId, exportAvatarId, exportLimit, exportOffset,
  ]);

  // Initial load on first tab activation if empty
  useEffect(() => {
    if (activeTab === 'db' && dbRows.length === 0) {
      loadDbItems();
    } else if (activeTab === 'compare' && compareItems.length === 0) {
      loadCompareData();
    } else if (activeTab === 'export_view' && exportRows.length === 0) {
      loadExportData();
    }
  }, [activeTab]);

  // Open Deep Diagnostic Modal
  async function openDiagnosticModal(itemId) {
    setDiagnosticModalItem(itemId);
    setDiagnosticLoading(true);
    setDiagnosticData(null);
    try {
      const res = await api(`/items/${itemId}/deep-analysis`);
      if (res.ok) {
        setDiagnosticData(res.data);
      }
    } catch (e) {
      fb.error(`Lỗi phân tích chuyên sâu item #${itemId}: ${e.message}`);
      setDiagnosticModalItem(null);
    } finally {
      setDiagnosticLoading(false);
    }
  }

  function closeDiagnosticModal() {
    setDiagnosticModalItem(null);
    setDiagnosticData(null);
  }

  // Form Handlers
  function startCreateNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      ...EMPTY_FORM,
      ...row,
      name: row.NAME || row.name || '',
      description: row.description || '',
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startClone(row) {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      ...row,
      name: `${row.NAME || row.name || ''} (Sao chép)`,
      description: row.description || '',
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(false);
  }

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function openQuickTextModal(item) {
    if (!item) return;
    const dbItem = item.dbItem || (item.NAME !== undefined ? item : null);
    const exportItem = item.exportItem || null;
    const initialName = (dbItem?.NAME || exportItem?.NAME || item.NAME || item.name || '').trim();
    const initialDesc = (dbItem?.description || exportItem?.description || item.description || '').trim();

    setQuickTextModal({
      id: item.id,
      dbItem,
      exportItem,
      name: initialName,
      description: initialDesc,
      iconId: item.exportItem?.icon_id ?? item.dbItem?.icon_id ?? item.icon_id ?? 0,
      type: item.exportItem?.type ?? item.dbItem?.type ?? item.type ?? 0,
    });
  }

  function closeQuickTextModal() {
    setQuickTextModal(null);
  }

  async function handleSaveQuickText(target = 'both') {
    if (!quickTextModal) return;
    if (!quickTextModal.name.trim()) {
      fb.error('Tên vật phẩm không được để trống');
      return;
    }
    setQuickTextBusy(true);
    try {
      const res = await api(`/items/${quickTextModal.id}/quick-text`, {
        method: 'POST',
        body: JSON.stringify({
          name: quickTextModal.name.trim(),
          description: quickTextModal.description.trim(),
          target,
          serverId: getServerId(),
        }),
      });

      const targetText = target === 'both' ? 'MariaDB & file Export' : target === 'db' ? 'MariaDB' : 'file Export';
      fb.success(`Đã cập nhật tên/mô tả item #${quickTextModal.id} vào ${targetText}!`);

      closeQuickTextModal();

      // Đồng thời cập nhật ngầm lại bảng so sánh và bảng DB để giữ nguyên vị trí cuộn
      await Promise.all([
        loadCompareData(true),
        loadDbItems(true),
      ]);

      // Nếu đang mở modal phân tích chuyên sâu của item này thì load lại
      if (diagnosticModalItem === quickTextModal.id) {
        openDiagnosticModal(quickTextModal.id);
      }
    } catch (e) {
      fb.error(`Lỗi cập nhật tên/mô tả: ${e.message}`);
    } finally {
      setQuickTextBusy(false);
    }
  }

  async function saveItem(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, syncExport: syncWithExportFile, serverId: getServerId() };
      const res = await api(editingId == null ? '/items' : `/items/${editingId}`, {
        method: editingId == null ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      const saved = res.data?.item;
      fb.success(`${editingId == null ? 'Đã thêm mới' : 'Đã cập nhật'} item #${saved?.id ?? editingId} trong MariaDB ngocrong${syncWithExportFile ? ' & file export/item_template.txt' : ''}.`);
      resetForm();
      await Promise.all([loadDbItems(true), loadCompareData(true)]);
    } catch (err) {
      fb.error(err.data?.databaseSaved
        ? `${err.message} (Dữ liệu đã lưu vào database, cần kiểm tra Java reload)`
        : err.message);
    } finally {
      setBusy(false);
    }
  }

  // Java Runtime Reload
  async function reloadRuntime() {
    setBusy(true);
    try {
      const res = await api('/items/reload', {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      fb.success(`Đã reload Java runtime thành công! ${res.data?.items ?? 0} item, ${res.data?.options ?? 0} options.`);
      if (activeTab === 'db') await loadDbItems(true);
      if (activeTab === 'compare') await loadCompareData(true);
    } catch (e) {
      fb.error(`Lỗi reload Java runtime: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  // --- COMPARE TAB ACTIONS ---
  async function handleSyncSingle(id, selectedFields = null, options = {}) {
    const fieldsLabel = selectedFields
      ? `các trường (${selectedFields.join(', ')})`
      : 'thuộc tính Item Template';

    const confirmMsg = `Nạp/Đồng bộ ${fieldsLabel} cho Item #${id} từ Export vào MariaDB ngocrong?\n\nLƯU Ý:\n• Tuyệt đối KHÔNG can thiệp vào cột part và bảng head_avatar (bảo toàn 100%).\n• KHÔNG làm mất item của người chơi. Option chỉ số trong túi đồ người chơi vẫn được bảo toàn nguyên vẹn.`;

    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await api('/items/sync-one', {
        method: 'POST',
        body: JSON.stringify({
          id,
          fields: selectedFields,
          syncTemplate: true,
          syncParts: false,
          syncHeadAvatar: false,
          useNewPartIds: false,
          serverId: getServerId(),
        }),
      });
      fb.success(`Đã nạp item #${id} vào Database ngocrong thành công (tuyệt đối không can thiệp cột part & head_avatar)!`);
      closeDiagnosticModal();
      if (activeTab === 'compare') await loadCompareData(true);
      if (activeTab === 'db') await loadDbItems(true);
      if (activeTab === 'export_view') await loadDbItems(true);
    } catch (e) {
      fb.error(`Lỗi nạp item #${id}: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateExportFromDb(id) {
    if (!window.confirm(`Cập nhật dòng dữ liệu của Item #${id} trong file export/item_template.txt theo giá trị hiện tại của Database?\n\n(Áp dụng khi cấu hình DB của server mới là chuẩn mong muốn)`)) return;
    setBusy(true);
    try {
      await api('/items/update-export-from-db', {
        method: 'POST',
        body: JSON.stringify({ id, serverId: getServerId() }),
      });
      fb.success(`Đã cập nhật item #${id} vào file export/item_template.txt thành công!`);
      closeDiagnosticModal();
      await loadCompareData(true);
    } catch (e) {
      fb.error(`Lỗi cập nhật file export: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncFromDifferentExport(dbId, exportId, fields = 'name_desc_only', options = {}) {
    const fieldLabel = fields === 'name_desc_only'
      ? 'Tên và Mô tả'
      : 'Toàn bộ thuộc tính';

    const confirmMsg = `Bạn có chắc chắn muốn nạp ${fieldLabel} từ Export #${exportId} vào Database #${dbId}?\n\n(Hệ thống giữ nguyên Item ID #${dbId}, tuyệt đối KHÔNG can thiệp vào cột part và bảng head_avatar).`;

    if (!window.confirm(confirmMsg)) {
      return;
    }
    setBusy(true);
    try {
      const res = await api(`/items/${dbId}/sync-from-export-item`, {
        method: 'POST',
        body: JSON.stringify({
          exportId,
          fields,
          syncParts: false,
          syncHeadAvatar: false,
          useNewPartIds: false,
          serverId: getServerId(),
        }),
      });
      if (res.ok) {
        fb.success(`Đã nạp ${fieldLabel} từ Export #${exportId} vào DB #${dbId} thành công (bảo toàn cột part & head_avatar)!`);
        closeDiagnosticModal();
        if (activeTab === 'compare') {
          await loadCompareData(true);
        } else {
          await loadDbItems(true);
        }
      }
    } catch (e) {
      fb.error(`Lỗi đồng bộ: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncBatch(all = false) {
    const ids = all ? null : Array.from(selectedCompareIds);
    if (!all && ids.length === 0) {
      fb.error('Vui lòng chọn ít nhất 1 item để đồng bộ!');
      return;
    }
    const msg = all
      ? 'Xác nhận nạp toàn bộ items từ export/item_template.txt vào MariaDB ngocrong?\n\nLƯU Ý:\n• Tuyệt đối KHÔNG can thiệp vào cột part và bảng head_avatar.\n• Item người chơi trong túi đồ KHÔNG bị mất (chỉ số option vẫn giữ nguyên).'
      : `Bạn có chắc muốn nạp ${ids.length} item đã chọn từ Export vào MariaDB?\n\n(Tuyệt đối không can thiệp vào cột part và bảng head_avatar).`;

    if (!window.confirm(msg)) return;

    setBusy(true);
    try {
      const res = await api('/items/sync-batch', {
        method: 'POST',
        body: JSON.stringify({ ids, syncParts: false, syncHeadAvatar: false, serverId: getServerId() }),
      });
      fb.success(`Đã nạp thành công: ${res.data?.inserted || 0} thêm mới, ${res.data?.updated || 0} cập nhật (bảo toàn cột part & head_avatar).`);
      setSelectedCompareIds(new Set());
      await loadCompareData();
      if (activeTab === 'db') await loadDbItems(true);
    } catch (e) {
      fb.error(`Lỗi đồng bộ hàng loạt: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleFillAllEmptySlots() {
    const emptyCount = compareSummary?.emptyDbSlotCount || 0;
    const msg = `Tự động tìm và nạp toàn bộ ${emptyCount} vật phẩm còn thiếu từ export/item_template.txt vào các ô ID trống trong MariaDB?\n\nLƯU Ý: Hành động này chỉ điền vào các ô ID trống/placeholder, KHÔNG làm thay đổi item của người chơi.`;
    if (!window.confirm(msg)) return;

    setBusy(true);
    try {
      const res = await api('/items/fill-empty-slots', {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      if (res.ok) {
        fb.success(`Đã nạp thành công ${res.data?.filledCount || 0} vật phẩm từ Export vào các ô ID trống!`);
        if (activeTab === 'compare') await loadCompareData();
        if (activeTab === 'db') await loadDbItems();
      }
    } catch (e) {
      fb.error(`Lỗi nạp ô trống từ export: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleExportToFile() {
    if (!window.confirm('Xuất toàn bộ bảng item_template hiện tại từ MariaDB ngocrong ra file export/item_template.txt? (Hệ thống sẽ tự động sao lưu file cũ .bak)')) return;
    setBusy(true);
    try {
      const res = await api('/items/export-to-file', {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      fb.success(`Đã xuất thành công ${res.data?.totalItems} items ra file: ${res.data?.filePath}`);
      if (activeTab === 'compare') await loadCompareData();
      if (activeTab === 'export_view') await loadExportData();
    } catch (e) {
      fb.error(`Lỗi xuất file: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  function toggleSelectCompareId(id) {
    setSelectedCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllCompare() {
    if (selectedCompareIds.size === compareItems.length && compareItems.length > 0) {
      setSelectedCompareIds(new Set());
    } else {
      setSelectedCompareIds(new Set(compareItems.map((c) => c.id)));
    }
  }

  function selectAllCurrentCompare() {
    toggleSelectAllCompare();
  }

  // --- EXPORT TAB ACTIONS (MULTI-SELECT & RANGE IMPORT TO DB) ---
  function toggleExportSelect(id) {
    setSelectedExportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllExportOnPage() {
    setSelectedExportIds((prev) => {
      const pageIds = exportRows.map((r) => r.id);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function handleQuickSelectExportRange() {
    const start = Number(quickExpRangeStart);
    const end = Number(quickExpRangeEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
      fb.error('Vui lòng nhập dải ID Export hợp lệ (Start <= End, VD: 1691 đến 1700)');
      return;
    }
    const newSet = new Set(selectedExportIds);
    for (let i = start; i <= end; i++) {
      newSet.add(i);
    }
    setSelectedExportIds(newSet);
    fb.success(`Đã chọn thêm dải Export ID #${start} ➔ #${end} (Tổng: ${newSet.size} item đã chọn)`);
  }

  async function openImportModalForSelected(customItems = null) {
    let items = [];
    if (customItems && customItems.length > 0) {
      items = [...customItems];
    } else {
      if (selectedExportIds.size === 0) {
        fb.error('Vui lòng chọn ít nhất 1 vật phẩm từ file Export để nạp vào DB!');
        return;
      }
      const rowMap = new Map();
      exportRows.forEach((r) => rowMap.set(r.id, r));

      const missingIds = [];
      for (const id of selectedExportIds) {
        if (rowMap.has(id)) {
          items.push(rowMap.get(id));
        } else {
          missingIds.push(id);
        }
      }

      if (missingIds.length > 0) {
        try {
          const res = await api('/items/export-data?limit=5000');
          if (res.ok && res.data?.rows) {
            const allExportRows = res.data.rows;
            const fullMap = new Map();
            allExportRows.forEach((r) => fullMap.set(r.id, r));
            items = [];
            for (const id of selectedExportIds) {
              if (fullMap.has(id)) {
                items.push(fullMap.get(id));
              } else {
                items.push({ id, NAME: `Item #${id}`, name: `Item #${id}`, icon_id: 0, type: 0, gender: 3 });
              }
            }
          }
        } catch (e) {
          console.warn('Lỗi tải danh sách Export đầy đủ:', e);
        }
      }
    }

    items.sort((a, b) => a.id - b.id);
    const count = items.length;
    if (count === 0) {
      fb.error('Không tìm thấy dữ liệu vật phẩm để nạp');
      return;
    }

    const minExpId = items[0].id;
    const maxExpId = items[items.length - 1].id;

    // Suggest default start DB ID
    const defaultStartDbId = minExpId;
    const defaultEndDbId = defaultStartDbId + count - 1;

    setImportModal({
      items,
      count,
      minExpId,
      maxExpId,
      startDbId: String(defaultStartDbId),
      endDbId: String(defaultEndDbId),
      mode: 'range', // 'range' | 'original'
    });
  }

  async function handleConfirmImportToDb() {
    if (!importModal || !importModal.items || importModal.items.length === 0) return;
    const { items, mode, startDbId } = importModal;

    let mappings = [];
    if (mode === 'original') {
      mappings = items.map((it) => ({ exportId: it.id, dbId: it.id }));
    } else {
      const startNum = Number(startDbId);
      if (!Number.isInteger(startNum) || startNum < 0) {
        fb.error('ID bắt đầu trong Database phải là số nguyên không âm (VD: 1891)');
        return;
      }
      mappings = items.map((it, idx) => ({
        exportId: it.id,
        dbId: startNum + idx,
      }));
    }

    const startTarget = mappings[0]?.dbId;
    const endTarget = mappings[mappings.length - 1]?.dbId;

    const confirmMsg = `Xác nhận nạp ${mappings.length} vật phẩm từ Export vào Database MariaDB?\n\n` +
      `• Dải ID Database đích: #${startTarget} ➔ #${endTarget}\n` +
      `• Tuyệt đối KHÔNG can thiệp vào cột part và bảng head_avatar.\n` +
      `• Tự động đồng bộ Java server runtime ngay lập tức.`;

    if (!window.confirm(confirmMsg)) return;

    setIsImportingToDb(true);
    try {
      const res = await api('/items/import-export-range', {
        method: 'POST',
        body: JSON.stringify({
          mappings,
          serverId: getServerId(),
        }),
      });

      if (res.ok) {
        const ins = res.data?.inserted || 0;
        const upd = res.data?.updated || 0;
        fb.success(`Đã nạp thành công ${mappings.length} vật phẩm vào Database (Thêm mới: ${ins}, Cập nhật: ${upd})! Đã tự động reload Java runtime.`);
        setImportModal(null);
        setSelectedExportIds(new Set());
        await Promise.all([
          loadDbItems(true),
          loadCompareData(true),
          loadExportData(true),
        ]);
      }
    } catch (e) {
      fb.error(`Lỗi nạp vật phẩm vào DB: ${e.message}`);
    } finally {
      setIsImportingToDb(false);
    }
  }


  async function handleRepairGaps() {
    if (!window.confirm('Tự động kiểm tra và bù tất cả các ID bị khuyết trong dải từ #0 đến MAX ID thành các ô ID trống (TYPE 75)?\n\n(Giúp chuỗi ID trong item_template luôn đầy đủ liên tục, không bị đứt quãng ID)')) return;
    setBusy(true);
    try {
      const res = await api('/items/repair-gaps', {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId() }),
      });
      if (res.ok) {
        fb.success(`Đã bù thành công ${res.data?.restoredCount || 0} ô ID khuyết thành ô trống trong MariaDB!`);
        if (activeTab === 'compare') await loadCompareData();
        if (activeTab === 'db') await loadDbItems();
      }
    } catch (e) {
      fb.error(`Lỗi bù ô ID khuyết: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="items-management-page" style={{ paddingBottom: '3rem' }}>
      <PageHeader
        title="Quản Lý Vật Phẩm & Chẩn Đoán Độ Lệch Template"
        description="Lọc và sắp xếp theo cấp ID hình ảnh Icon (từ bé đến lớn), hiển thị đầy đủ ảnh Icon của Part (Head/Body/Leg), nhảy trang nhanh và tự động chẩn đoán độ lệch"
        actions={
          <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn primary"
              type="button"
              onClick={startCreateNew}
              disabled={busy}
            >
              ➕ Thêm Item Mới
            </button>
            <button
              className="btn"
              type="button"
              onClick={handleRepairGaps}
              disabled={busy}
              title="Tự động lấp đầy tất cả các ID bị khuyết trong DB thành ô ID trống Type 75"
              style={{ borderColor: 'rgba(56, 189, 248, 0.5)', color: '#38bdf8' }}
            >
              🩹 Bù ID Khuyết (Type 75)
            </button>
            <button
              className="btn"
              type="button"
              onClick={reloadRuntime}
              disabled={busy}
              title="Gửi lệnh reload danh sách item cho Java Server Game"
            >
              🔄 Reload Runtime Java
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => navigate('/quick-import')}
              title="Chuyển sang trang Import hàng loạt"
            >
              🚀 Nhập Nhanh Item & Part
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* TAB NAVIGATION HEADER */}
      <div
        className="card"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px',
          marginBottom: '1.25rem',
          background: 'rgba(26, 35, 50, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '12px',
          overflowX: 'auto',
        }}
      >
        <button
          className={`btn ${activeTab === 'compare' ? 'primary' : ''}`}
          type="button"
          onClick={() => setActiveTab('compare')}
          style={{
            flex: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontWeight: 600,
            fontSize: '0.95rem',
            borderColor: compareSummary?.hasDiscrepancy ? 'rgba(234, 179, 8, 0.5)' : undefined,
          }}
        >
          <span>⚖️</span> So Sánh & Chẩn Đoán Đối Chiếu Export
          {compareSummary?.hasDiscrepancy && (
            <span
              style={{
                background: '#eab308',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Lệch {compareSummary.mismatchedCount} mục
            </span>
          )}
        </button>

        <button
          className={`btn ${activeTab === 'db' ? 'primary' : ''}`}
          type="button"
          onClick={() => setActiveTab('db')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          <span>📦</span> Danh Sách Vật Phẩm Database ({dbTotal.toLocaleString('vi-VN')})
        </button>

        <button
          className={`btn ${activeTab === 'export_view' ? 'primary' : ''}`}
          type="button"
          onClick={() => setActiveTab('export_view')}
          style={{
            flex: 0.9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          <span>📄</span> Bản Dựng Giả (Export Data)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 2: SO SÁNH & ĐỐI CHIẾU VỚI EXPORT/ITEM_TEMPLATE.TXT (BẢN DỰNG GIẢ) */}
      {/* ========================================================================= */}
      <div style={{ display: activeTab === 'compare' ? 'block' : 'none' }}>
          {/* Banner giải thích cơ chế đối chiếu */}
          <div
            className="help-box"
            style={{
              marginBottom: '1.25rem',
              borderLeft: '4px solid #3b82f6',
              background: 'rgba(59, 130, 246, 0.08)',
            }}
          >
            <h4 style={{ color: '#60a5fa', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🖼️</span> Hiển Thị Đầy Đủ Ảnh Icon Của Part (Head / Body / Leg) & Đối Chiếu Trực Quan
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Hệ thống tự động giải mã các mã Part (Đầu, Thân, Chân) và hiển thị trực tiếp <strong>ảnh sprite thực tế của từng bộ phận</strong>.
              Bạn có thể nhìn thấy ngay mô hình trang phục/pet trước khi lưu vào game để tránh lỗi tàng hình hoặc gắn sai Part đồ họa.
            </p>
          </div>

          {/* Metric Summary Cards */}
          {compareSummary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '12px',
                marginBottom: '1.25rem',
              }}
            >
              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  borderLeft: '4px solid #f59e0b',
                  cursor: 'pointer',
                  background: compareFilter === 'MISMATCHED' ? 'rgba(245, 158, 11, 0.15)' : undefined,
                }}
                onClick={() => { setCompareFilter('MISMATCHED'); setCompareOffset(0); }}
              >
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>🟡 Lệch Thuộc Tính</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>
                  {compareSummary.mismatchedCount?.toLocaleString('vi-VN')}
                </div>
                <small className="muted">Cùng ID nhưng khác Type/Part/Chỉ số</small>
              </div>

              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  borderLeft: '4px solid #f97316',
                  cursor: 'pointer',
                  background: compareFilter === 'ONLY_IN_EXPORT' ? 'rgba(249, 115, 22, 0.15)' : undefined,
                }}
                onClick={() => { setCompareFilter('ONLY_IN_EXPORT'); setCompareOffset(0); }}
              >
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>🟠 Thiếu Trong DB</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fb923c' }}>
                  {compareSummary.onlyExportCount?.toLocaleString('vi-VN')}
                </div>
                <small className="muted">Có ở Export nhưng chưa nạp DB</small>
              </div>

              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  borderLeft: '4px solid #10b981',
                  cursor: 'pointer',
                  background: compareFilter === 'MATCHED' ? 'rgba(16, 185, 129, 0.15)' : undefined,
                }}
                onClick={() => { setCompareFilter('MATCHED'); setCompareOffset(0); }}
              >
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>🟢 Khớp Hoàn Toàn</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>
                  {compareSummary.matchedCount?.toLocaleString('vi-VN')}
                </div>
                <small className="muted">DB và Export đồng nhất 100%</small>
              </div>

              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  borderLeft: '4px solid #3b82f6',
                  cursor: 'pointer',
                  background: compareFilter === 'ONLY_IN_DB' ? 'rgba(59, 130, 246, 0.15)' : undefined,
                }}
                onClick={() => { setCompareFilter('ONLY_IN_DB'); setCompareOffset(0); }}
              >
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>🔵 Chỉ Có Ở DB</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa' }}>
                  {compareSummary.onlyDbCount?.toLocaleString('vi-VN')}
                </div>
                <small className="muted">Có trong DB nhưng Export không có</small>
              </div>

              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  borderLeft: '4px solid #a855f7',
                  cursor: 'pointer',
                  background: compareFilter === 'SHIFTED' ? 'rgba(168, 85, 247, 0.15)' : undefined,
                }}
                onClick={() => { setCompareFilter('SHIFTED'); setCompareOffset(0); }}
              >
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>🟣 Dời ID / Lệch Vị Trí</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c084fc' }}>
                  {compareSummary.shiftedCount?.toLocaleString('vi-VN')}
                </div>
                <small className="muted">Cùng tên/icon nhưng khác số ID</small>
              </div>

              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  borderLeft: '4px solid #38bdf8',
                  cursor: 'pointer',
                  background: compareFilter === 'SAME_ICON' ? 'rgba(56, 189, 248, 0.15)' : undefined,
                }}
                onClick={() => { setCompareFilter('SAME_ICON'); setCompareOffset(0); }}
              >
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>🖼️ Dùng Chung Icon</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
                  {compareSummary.sameIconCount?.toLocaleString('vi-VN') || 0}
                </div>
                <small className="muted">Các item dùng chung ảnh icon (kể cả lệch ID)</small>
              </div>

              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  borderLeft: '4px solid #facc15',
                  cursor: 'pointer',
                  background: compareFilter === 'EMPTY_DB_SLOT' ? 'rgba(250, 204, 21, 0.15)' : undefined,
                }}
                onClick={() => { setCompareFilter('EMPTY_DB_SLOT'); setCompareOffset(0); }}
              >
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>📭 Ô ID Trống Ở DB</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#facc15' }}>
                  {compareSummary.emptyDbSlotCount?.toLocaleString('vi-VN') || 0}
                </div>
                <small className="muted">Có sẵn dữ liệu item chuẩn trong Export</small>
              </div>
            </div>
          )}

          {/* Batch Actions Bar */}
          <div
            className="card"
            style={{
              padding: '12px 18px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'rgba(20, 28, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0' }}>Thao tác hàng loạt:</span>
              <button
                className="btn sm"
                type="button"
                onClick={selectAllCurrentCompare}
                disabled={compareItems.length === 0}
              >
                {selectedCompareIds.size === compareItems.length && compareItems.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả trang này'}
              </button>

              <button
                className="btn sm primary"
                type="button"
                onClick={() => handleSyncBatch(false)}
                disabled={selectedCompareIds.size === 0 || busy}
              >
                📥 Đồng bộ {selectedCompareIds.size} item đã chọn vào DB
              </button>

              <button
                className="btn sm"
                type="button"
                onClick={() => openBulkDeleteModal('compare')}
                disabled={selectedCompareIds.size === 0 || busy}
                style={{
                  borderColor: selectedCompareIds.size > 0 ? '#ef4444' : 'rgba(239, 68, 68, 0.4)',
                  color: selectedCompareIds.size > 0 ? '#ffffff' : '#fca5a5',
                  background: selectedCompareIds.size > 0 ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'rgba(239, 68, 68, 0.15)',
                  fontWeight: 700,
                  boxShadow: selectedCompareIds.size > 0 ? '0 2px 10px rgba(239, 68, 68, 0.45)' : undefined,
                }}
                title="Xóa toàn bộ các item đã tích chọn khỏi MariaDB (kèm Part và Head Avatar liên kết)"
              >
                🗑️ Xóa {selectedCompareIds.size > 0 ? `${selectedCompareIds.size} ` : ''}item đã chọn khỏi DB
              </button>

              <button
                className="btn sm"
                type="button"
                onClick={handleFillAllEmptySlots}
                disabled={busy || (compareSummary?.emptyDbSlotCount || 0) === 0}
                style={{ borderColor: '#facc15', color: '#facc15', background: 'rgba(250, 204, 21, 0.12)', fontWeight: 600 }}
                title="Tự động nạp dữ liệu từ export/item_template.txt vào tất cả các ô ID trống trong DB"
              >
                ⚡ Nạp TẤT CẢ {compareSummary?.emptyDbSlotCount || 0} ô ID trống từ Export
              </button>

              <button
                className="btn sm"
                type="button"
                onClick={handleRepairGaps}
                disabled={busy}
                style={{ borderColor: '#38bdf8', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', fontWeight: 600 }}
                title="Tự động kiểm tra và bù tất cả các ID bị khuyết trong dải #0 đến MAX ID thành ô ID trống Type 75"
              >
                🩹 Bù ID Khuyết (Type 75)
              </button>

              <button
                className="btn sm"
                type="button"
                onClick={() => handleSyncBatch(true)}
                disabled={busy}
                style={{ borderColor: '#eab308', color: '#facc15' }}
                title="Đồng bộ toàn bộ file export/item_template.txt vào MariaDB"
              >
                ⚡ Đồng bộ TẤT CẢ từ Export sang DB
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn sm"
                type="button"
                onClick={handleExportToFile}
                disabled={busy}
                title="Ghi đè DB item_template hiện tại ra file export/item_template.txt"
              >
                💾 Xuất DB ra file export/item_template.txt
              </button>
              <button
                className="btn sm"
                type="button"
                onClick={loadCompareData}
                disabled={busy || compareLoading}
              >
                🔄 Tải lại so sánh
              </button>
            </div>
          </div>

          {/* Filter Pills, Icon ID Sorting & Search */}
          <div className="card section">
            {/* Status pills row */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <button
                className={`btn sm ${compareFilter === 'all' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('all'); setCompareOffset(0); }}
              >
                Tất cả ({compareSummary?.totalCompared || 0})
              </button>
              <button
                className={`btn sm ${compareFilter === 'EMPTY_DB_SLOT' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('EMPTY_DB_SLOT'); setCompareOffset(0); }}
                style={{ borderColor: compareSummary?.emptyDbSlotCount > 0 ? '#facc15' : undefined, color: compareFilter === 'EMPTY_DB_SLOT' ? undefined : (compareSummary?.emptyDbSlotCount > 0 ? '#facc15' : undefined), fontWeight: 600 }}
              >
                📭 Ô ID Trống ở DB ({compareSummary?.emptyDbSlotCount || 0})
              </button>
              <button
                className={`btn sm ${compareFilter === 'diff_only' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('diff_only'); setCompareOffset(0); }}
                style={{ color: compareFilter === 'diff_only' ? undefined : '#facc15' }}
              >
                ⚠️ Chỉ hiện chênh lệch ({((compareSummary?.mismatchedCount || 0) + (compareSummary?.onlyExportCount || 0) + (compareSummary?.onlyDbCount || 0)).toLocaleString('vi-VN')})
              </button>
              <button
                className={`btn sm ${compareFilter === 'SAME_ICON' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('SAME_ICON'); setCompareOffset(0); }}
                style={{ borderColor: compareSummary?.sameIconCount > 0 ? '#38bdf8' : undefined, color: compareFilter === 'SAME_ICON' ? undefined : (compareSummary?.sameIconCount > 0 ? '#38bdf8' : undefined), fontWeight: 600 }}
              >
                🖼️ Icon Trùng / Dùng Chung ({compareSummary?.sameIconCount || 0})
              </button>
              <button
                className={`btn sm ${compareFilter === 'MISMATCHED' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('MISMATCHED'); setCompareOffset(0); }}
              >
                🟡 Lệch thuộc tính ({compareSummary?.mismatchedCount || 0})
              </button>
              <button
                className={`btn sm ${compareFilter === 'ONLY_IN_EXPORT' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('ONLY_IN_EXPORT'); setCompareOffset(0); }}
              >
                🟠 Thiếu trong DB ({compareSummary?.onlyExportCount || 0})
              </button>
              <button
                className={`btn sm ${compareFilter === 'ONLY_IN_DB' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('ONLY_IN_DB'); setCompareOffset(0); }}
              >
                🔵 Thừa ở DB ({compareSummary?.onlyDbCount || 0})
              </button>
              <button
                className={`btn sm ${compareFilter === 'SHIFTED' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('SHIFTED'); setCompareOffset(0); }}
              >
                🟣 Dời ID ({compareSummary?.shiftedCount || 0})
              </button>
              <button
                className={`btn sm ${compareFilter === 'PART_AVATAR_MISMATCH' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('PART_AVATAR_MISMATCH'); setCompareOffset(0); }}
                style={{ borderColor: compareSummary?.partAvatarMismatchCount > 0 ? '#ef4444' : undefined, color: compareFilter === 'PART_AVATAR_MISMATCH' ? undefined : (compareSummary?.partAvatarMismatchCount > 0 ? '#f87171' : undefined) }}
              >
                ⚠️ Lệch Part/Avatar DB ({compareSummary?.partAvatarMismatchCount || 0})
              </button>
              <button
                className={`btn sm ${compareFilter === 'MATCHED' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCompareFilter('MATCHED'); setCompareOffset(0); }}
              >
                🟢 Khớp ({compareSummary?.matchedCount || 0})
              </button>
            </div>

            {/* Advanced Icon Sorting & Search Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '12px',
              }}
            >
              {/* Sắp xếp dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600 }}>🔢 Sắp xếp:</span>
                <select
                  value={`${compareSortBy}_${compareSortDir}`}
                  onChange={(e) => {
                    const [field, dir] = e.target.value.split('_');
                    setCompareSortBy(field);
                    setCompareSortDir(dir);
                    setCompareOffset(0);
                  }}
                  style={{ padding: '5px 10px', fontSize: '0.85rem', background: '#1e293b', color: '#60a5fa', fontWeight: 600, border: '1px solid #3b82f6' }}
                >
                  <option value="same_icon_grouped_asc">🖼️ Gom nhóm ảnh Icon giống nhau (Kể cả lệch ID)</option>
                  <option value="db_icon_id_asc">🖼️ Icon ID (MariaDB DB): Bé ➔ Lớn</option>
                  <option value="db_icon_id_desc">🖼️ Icon ID (MariaDB DB): Lớn ➔ Bé</option>
                  <option value="exp_icon_id_asc">🖼️ Icon ID (Bản Dựng Export): Bé ➔ Lớn</option>
                  <option value="exp_icon_id_desc">🖼️ Icon ID (Bản Dựng Export): Lớn ➔ Bé</option>
                  <option value="id_asc">🆔 Item ID: Bé ➔ Lớn (#0 ➔ #2085)</option>
                  <option value="id_desc">🆔 Item ID: Lớn ➔ Bé (#2085 ➔ #0)</option>
                  <option value="name_asc">🔤 Tên: A ➔ Z</option>
                  <option value="name_desc">🔤 Tên: Z ➔ A</option>
                  <option value="diffs_desc">⚠️ Số mục lệch nhiều nhất trước</option>
                </select>

                {/* Bộ lọc Type */}
                <select
                  value={compareType}
                  onChange={(e) => {
                    setCompareType(e.target.value);
                    setCompareOffset(0);
                  }}
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.85rem',
                    background: compareType !== 'all' ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                    color: compareType !== 'all' ? '#38bdf8' : '#e2e8f0',
                    fontWeight: 600,
                    border: compareType !== 'all' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '4px',
                    maxWidth: '160px',
                  }}
                  title="Lọc theo loại vật phẩm (Type)"
                >
                  <option value="all">📦 Tất cả loại</option>
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.label} ({t.id})
                    </option>
                  ))}
                </select>

                {/* Khoảng Icon ID min - max */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Icon từ:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={compareMinIcon}
                    onChange={(e) => { setCompareMinIcon(e.target.value); setCompareOffset(0); }}
                    style={{ width: '70px', padding: '3px 6px', fontSize: '0.82rem' }}
                  />
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>đến</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={compareMaxIcon}
                    onChange={(e) => { setCompareMaxIcon(e.target.value); setCompareOffset(0); }}
                    style={{ width: '70px', padding: '3px 6px', fontSize: '0.82rem' }}
                  />
                </div>

                {/* Lọc chính xác Icon ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>🎯 Icon:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 16131"
                    value={compareExactIcon}
                    onChange={(e) => { setCompareExactIcon(e.target.value); setCompareOffset(0); }}
                    style={{ width: '80px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 700 }}
                    title="Nhập chính xác icon_id (ví dụ 16131)"
                  />
                </div>

                {/* Lọc theo Part ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#facc15', fontWeight: 600 }}>🧩 Part:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 2006"
                    value={comparePartId}
                    onChange={(e) => { setComparePartId(e.target.value); setCompareOffset(0); }}
                    style={{ width: '75px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#facc15', color: '#fde047', fontWeight: 700 }}
                    title="Lọc theo Part ID (Head, Body, Leg, Part)"
                  />
                  {comparePartId && (
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => { setComparePartId(''); setCompareOffset(0); }}
                      style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                      title="Xóa lọc Part"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Lọc theo Head Avatar ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#c084fc', fontWeight: 600 }}>👤 Avatar:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 2006"
                    value={compareAvatarId}
                    onChange={(e) => { setCompareAvatarId(e.target.value); setCompareOffset(0); }}
                    style={{ width: '75px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#c084fc', color: '#d8b4fe', fontWeight: 700 }}
                    title="Lọc theo Avatar ID hoặc Head Avatar mapping"
                  />
                  {compareAvatarId && (
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => { setCompareAvatarId(''); setCompareOffset(0); }}
                      style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                      title="Xóa lọc Avatar"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Nút Mở Kho Part & Avatar Modal */}
                <button
                  className="btn sm"
                  type="button"
                  onClick={() => { setCatalogModalOpen(true); setCatalogModalTab('parts'); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(192, 132, 252, 0.2) 100%)',
                    borderColor: '#facc15',
                    color: '#fef08a',
                    fontWeight: 700,
                  }}
                  title="Xem toàn bộ danh sách Part ID và Head Avatar có hình ảnh icon trực quan"
                >
                  🎨 Kho Part & Avatar ({partsCatalog.length})
                </button>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer', marginLeft: '4px' }}>
                  <input
                    type="checkbox"
                    checked={compareIconMismatchOnly}
                    onChange={(e) => { setCompareIconMismatchOnly(e.target.checked); setCompareOffset(0); }}
                  />
                  <span>Chỉ hiện lệch Icon</span>
                </label>
              </div>

              {/* Ô tìm kiếm */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="🔍 Tìm ID, Icon, Tên..."
                  value={compareQ}
                  onChange={(e) => setCompareQ(e.target.value)}
                  style={{ width: '180px', padding: '5px 8px' }}
                />
                <button className="btn sm" type="button" onClick={() => loadCompareData()}>Tìm</button>
              </div>
            </div>

            {/* TOP PAGINATION BAR WITH JUMP-TO-PAGE */}
            <QuickPaginationBar
              total={compareTotal}
              limit={compareLimit}
              offset={compareOffset}
              onPageChange={setCompareOffset}
              onLimitChange={(newLimit) => { setCompareLimit(newLimit); setCompareOffset(0); }}
              loading={compareLoading}
              label="vật phẩm đối chiếu"
            />

            {/* Sticky Selected Items Action Banner */}
            {selectedCompareIds.size > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  marginBottom: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: 600 }}>
                  <span style={{ fontSize: '1.2rem' }}>☑️</span>
                  <span>Đang tích chọn <strong style={{ color: '#fca5a5' }}>{selectedCompareIds.size} vật phẩm</strong></span>
                  <button className="btn sm" type="button" onClick={() => setSelectedCompareIds(new Set())} style={{ padding: '2px 8px', fontSize: '0.74rem' }}>
                    Bỏ chọn tất cả
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn sm primary"
                    type="button"
                    onClick={() => handleSyncBatch(false)}
                    disabled={busy}
                  >
                    📥 Đồng bộ {selectedCompareIds.size} item vào DB
                  </button>
                  <button
                    className="btn sm"
                    type="button"
                    onClick={() => openBulkDeleteModal('compare')}
                    disabled={busy}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                      borderColor: '#ef4444',
                      color: '#ffffff',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    🗑️ Xóa {selectedCompareIds.size} item khỏi MariaDB
                  </button>
                </div>
              </div>
            )}

            {/* Compare Table */}
            <div className="table-wrap" style={{ maxHeight: '720px', overflowY: 'auto', position: 'relative' }}>
              {compareLoading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.45)',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(1px)',
                  }}
                >
                  <div className="ui-spinner" />
                </div>
              )}
              {compareItems.length === 0 && !compareLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Không có item nào trong nhóm hoặc khoảng Icon này.
                </div>
              ) : compareItems.length === 0 && compareLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="ui-spinner" style={{ margin: '0 auto 12px' }} />
                  <p className="muted">Đang phân tích và sắp xếp dữ liệu đối chiếu...</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedCompareIds.size > 0 && selectedCompareIds.size === compareItems.filter((i) => i.status !== 'MATCHED').length}
                          onChange={toggleSelectAllCompare}
                          title="Chọn tất cả item cần đồng bộ trên trang này"
                        />
                      </th>
                      <th style={{ width: '130px' }}>Item ID & Trạng Thái</th>
                      <th style={{ minWidth: '500px' }}>So Sánh MariaDB Thực Tế ⚡ Bản Dựng Export (Part & Avatar)</th>
                      <th>Chi Tiết Đối Chiếu & Đề Xuất</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareItems.map((item) => {
                      const hasExactDbMatch = Boolean(item.possibleDbMatch?.isExactNameAndIcon);
                      const isSelected = selectedCompareIds.has(item.id);
                      const isMatched = item.status === 'MATCHED';
                      const isMismatched = item.status === 'MISMATCHED';
                      const isPartAvatarMismatch = item.status === 'PART_AVATAR_MISMATCH' || (!isMismatched && item.partAvatarAudit?.hasAnyIssue);
                      const isOnlyExport = item.status === 'ONLY_IN_EXPORT';
                      const isOnlyDb = item.status === 'ONLY_IN_DB';
                      const isEmptyDbSlot = (item.status === 'EMPTY_DB_SLOT' || item.canFillFromExport) && !hasExactDbMatch;

                      let badgeBg = 'rgba(16, 185, 129, 0.2)';
                      let badgeColor = '#34d399';
                      let badgeLabel = '🟢 Khớp 100%';

                      if (isEmptyDbSlot) {
                        badgeBg = 'rgba(234, 179, 8, 0.2)';
                        badgeColor = '#facc15';
                        badgeLabel = '📭 Ô ID Trống ở DB';
                      } else if (hasExactDbMatch) {
                        badgeBg = 'rgba(168, 85, 247, 0.2)';
                        badgeColor = '#c084fc';
                        badgeLabel = `🟣 Đã có ở DB #${item.possibleDbMatch.id}`;
                      } else if (isPartAvatarMismatch) {
                        badgeBg = 'rgba(239, 68, 68, 0.2)';
                        badgeColor = '#fca5a5';
                        badgeLabel = '⚠️ Lệch Part/Avatar DB';
                      } else if (isMismatched) {
                        badgeBg = 'rgba(245, 158, 11, 0.2)';
                        badgeColor = '#fbbf24';
                        badgeLabel = `🟡 Lệch ${item.diffs?.length || 0} mục`;
                      } else if (isOnlyExport) {
                        badgeBg = 'rgba(249, 115, 22, 0.2)';
                        badgeColor = '#fb923c';
                        badgeLabel = '🟠 Thiếu trong DB';
                      } else if (isOnlyDb) {
                        badgeBg = 'rgba(59, 130, 246, 0.2)';
                        badgeColor = '#60a5fa';
                        badgeLabel = '🔵 Chỉ có ở DB';
                      }

                      return (
                        <tr
                          key={item.id}
                          style={{
                            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : undefined,
                          }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCompareId(item.id)}
                            />
                          </td>

                          <td>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                              #{item.id}
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: badgeBg,
                                color: badgeColor,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              {badgeLabel}
                            </span>
                            {item.isIconMismatch && (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#fca5a5',
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  marginTop: '4px',
                                  fontWeight: 600,
                                }}
                                title={`MariaDB đang mang Icon #${item.dbItem?.icon_id} trong khi Export gốc mang Icon #${item.exportItem?.icon_id}`}
                              >
                                ⚠️ Khác Icon: #{item.dbItem?.icon_id} ➔ #{item.exportItem?.icon_id}
                              </div>
                            )}
                          </td>

                          {/* MERGED COLUMN: MariaDB Thực Tế & Bản Dựng Export Chung Lại Để Dễ So Sánh */}
                          <td>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                background: 'rgba(0, 0, 0, 0.25)',
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.06)',
                              }}
                            >
                              {/* 🗄️ BÊN TRÁI: MariaDB Hiện Tại */}
                              <div
                                style={{
                                  padding: '8px',
                                  borderRadius: '6px',
                                  background: item.dbItem ? 'rgba(59, 130, 246, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                  border: `1px solid ${item.dbItem ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      🗄️ MariaDB Hiện Tại
                                    </span>
                                    {item.dbItem && (
                                      <div style={{ display: 'flex', gap: '3px' }}>
                                        <button className="btn sm" type="button" onClick={() => openQuickTextModal(item)} style={{ padding: '1px 5px', fontSize: '0.68rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }} title="Sửa nhanh Tên & Mô tả DB">✏️</button>
                                        <button className="btn sm" type="button" onClick={() => openDeleteModal(item)} style={{ padding: '1px 5px', fontSize: '0.68rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }} title="Xóa item này khỏi DB">🗑️</button>
                                      </div>
                                    )}
                                  </div>

                                  {item.dbItem ? (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                      <ItemIcon iconId={item.dbItem.icon_id} tempId={item.id} name={item.dbItem.NAME} size={42} />
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {item.dbItem.NAME}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1px' }}>
                                          Icon: <strong style={{ color: '#60a5fa' }}>#{item.dbItem.icon_id}</strong> · T:{item.dbItem.type} · G:{item.dbItem.gender}
                                        </div>
                                        {item.dbItem.description && (
                                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.dbItem.description}>
                                            {item.dbItem.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.78rem', padding: '10px 0' }}>
                                      ❌ Chưa có trong DB
                                    </div>
                                  )}
                                </div>

                                {item.dbItem && (
                                  <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                                    <PartThumbnailPreview
                                      partPreview={item.dbItem.part_preview}
                                      head={item.dbItem.head}
                                      body={item.dbItem.body}
                                      leg={item.dbItem.leg}
                                      part={item.dbItem.part}
                                      partsMap={partsMap}
                                      size={24}
                                      compact={true}
                                    />
                                    {item.partAvatarAudit?.avatarAudit?.dbAvatarId != null && (
                                      <div style={{ fontSize: '0.7rem', color: '#c084fc', marginTop: '3px', fontWeight: 600 }}>
                                        👤 Avatar DB: #{item.partAvatarAudit.avatarAudit.dbAvatarId}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* 📄 BÊN PHẢI: Bản Dựng Export Chuẩn Gốc */}
                              <div
                                style={{
                                  padding: '8px',
                                  borderRadius: '6px',
                                  background: item.exportItem ? 'rgba(16, 185, 129, 0.08)' : 'rgba(148, 163, 184, 0.08)',
                                  border: `1px solid ${item.exportItem ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.2)'}`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      📄 Export Chuẩn Gốc
                                    </span>
                                    {item.exportItem && (
                                      <button className="btn sm" type="button" onClick={() => openQuickTextModal(item)} style={{ padding: '1px 5px', fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }} title="Sửa nhanh Tên & Mô tả Export">✏️</button>
                                    )}
                                  </div>

                                  {item.exportItem ? (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                      <ItemIcon iconId={item.exportItem.icon_id} tempId={item.id} name={item.exportItem.NAME} size={42} />
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {item.exportItem.NAME}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1px' }}>
                                          Icon: <strong style={{ color: '#34d399' }}>#{item.exportItem.icon_id}</strong> · T:{item.exportItem.type} · G:{item.exportItem.gender}
                                        </div>
                                        {item.exportItem.description && (
                                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.exportItem.description}>
                                            {item.exportItem.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.78rem', padding: '10px 0' }}>
                                      ➖ Không có trong Export
                                    </div>
                                  )}
                                </div>

                                {item.exportItem && (
                                  <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                                    <PartThumbnailPreview
                                      partPreview={item.exportItem.part_preview}
                                      head={item.exportItem.head}
                                      body={item.exportItem.body}
                                      leg={item.exportItem.leg}
                                      part={item.exportItem.part}
                                      partsMap={partsMap}
                                      size={24}
                                      compact={true}
                                    />
                                    {item.partAvatarAudit?.avatarAudit?.expAvatarId != null && (
                                      <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '3px', fontWeight: 600 }}>
                                        👤 Avatar Exp: #{item.partAvatarAudit.avatarAudit.expAvatarId}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Column 4: Diff Details & Category Pills */}
                          <td>
                            {isEmptyDbSlot ? (
                              <div>
                                <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.35)', marginBottom: '6px' }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fde047', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>💡</span> Đề xuất thêm item còn thiếu từ Export:
                                  </div>
                                  <div style={{ fontSize: '0.84rem', color: '#f8fafc', marginTop: '4px', fontWeight: 600 }}>
                                    • Tên: <span style={{ color: '#4ade80' }}>{item.exportItem?.NAME}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
                                    • Icon: <strong style={{ color: '#60a5fa' }}>#{item.exportItem?.icon_id}</strong> · Type: {item.exportItem?.type} · Part: #{item.exportItem?.part}
                                  </div>

                                  {/* Cảnh báo trùng Part ID trong MariaDB & Đề xuất khởi tạo Part ID mới */}
                                  {(item.exportSuggestion?.partConflict?.hasConflict || item.partConflict?.hasConflict) && (() => {
                                    const conflict = item.exportSuggestion?.partConflict || item.partConflict;
                                    const newP = conflict.suggestedNewParts;
                                    const origP = newP?.originalParts;
                                    return (
                                      <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                                        <div style={{ fontSize: '0.74rem', color: '#fca5a5', fontWeight: 700 }}>
                                          ⚠️ Part #{origP?.part} (H:{origP?.head} B:{origP?.body} L:{origP?.leg}) đã tồn tại trong DB với sprite khác!
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#fef08a', marginTop: '3px', fontWeight: 600 }}>
                                          ✨ Đề xuất khởi tạo Part ID mới: <strong style={{ color: '#4ade80' }}>#{newP?.part}</strong> (H:{newP?.head} B:{newP?.body} L:{newP?.leg})
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn sm"
                                    type="button"
                                    onClick={() => handleSyncSingle(item.id)}
                                    disabled={busy}
                                    style={{ fontSize: '0.76rem', padding: '4px 10px', background: '#eab308', borderColor: '#eab308', color: '#0f172a', fontWeight: 700 }}
                                    title={`Nạp "${item.exportItem?.NAME || item.exportSuggestion?.name}" từ Export vào ô trống này (tuyệt đối không can thiệp cột part và head_avatar)`}
                                  >
                                    📥 Nạp vào ô trống này
                                  </button>
                                  <button
                                    className="btn sm"
                                    type="button"
                                    onClick={() => openQuickTextModal(item)}
                                    style={{ fontSize: '0.75rem', padding: '3px 6px', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                    title="Sửa tên / mô tả trực tiếp"
                                  >
                                    ✏️ Tên/Mô tả
                                  </button>
                                  <button
                                    className="btn sm"
                                    type="button"
                                    onClick={() => openDiagnosticModal(item.id)}
                                    style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                                  >
                                    🔍 Chi tiết
                                  </button>
                                </div>
                              </div>
                            ) : isPartAvatarMismatch ? (
                              <div>
                                <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '6px' }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171' }}>
                                    ⚠️ Lệch dữ liệu Part đồ họa / Avatar trong MariaDB!
                                  </div>
                                  {item.partAvatarAudit?.partDetails?.filter((p) => !p.matched).map((p, idx) => (
                                    <div key={idx} style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '2px' }}>
                                      • <strong>{p.label} #{p.partId}:</strong> {p.issue}
                                    </div>
                                  ))}
                                  {item.partAvatarAudit?.avatarAudit && !item.partAvatarAudit.avatarAudit.matched && (
                                    <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '2px' }}>
                                      • <strong>Head Avatar #{item.partAvatarAudit.avatarAudit.headId}:</strong> {item.partAvatarAudit.avatarAudit.issue}
                                    </div>
                                  )}
                                </div>
                                <button
                                  className="btn sm"
                                  type="button"
                                  onClick={() => openDiagnosticModal(item.id)}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    borderColor: 'rgba(239, 68, 68, 0.5)',
                                    color: '#fca5a5',
                                  }}
                                >
                                  🔍 Phân tích chi tiết & Sửa Part/Avatar
                                </button>
                              </div>
                            ) : isMatched ? (
                              <span style={{ color: '#10b981', fontSize: '0.82rem' }}>✓ Trùng khớp hoàn toàn</span>
                            ) : item.diffs && item.diffs.length > 0 ? (
                              <div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                                  {item.diffs.slice(0, 4).map((d) => (
                                    <span
                                      key={d.field}
                                      style={{
                                        fontSize: '0.74rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: d.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : d.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        color: d.severity === 'CRITICAL' ? '#fca5a5' : d.severity === 'WARNING' ? '#fde047' : '#93c5fd',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                      }}
                                    >
                                      <strong>{d.label}:</strong> {String(d.dbValue)} ➔ {String(d.exportValue)}
                                    </span>
                                  ))}
                                  {item.diffs.length > 4 && (
                                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', alignSelf: 'center' }}>
                                      +{item.diffs.length - 4} mục khác
                                    </span>
                                  )}
                                </div>
                                {item.partAvatarAudit?.hasAnyIssue && (
                                  <div style={{ fontSize: '0.74rem', color: '#f87171', marginBottom: '4px', fontWeight: 600 }}>
                                    ⚠️ Kèm theo lệch dữ liệu Part/Avatar DB
                                  </div>
                                )}
                                <button
                                  className="btn sm"
                                  type="button"
                                  onClick={() => openDiagnosticModal(item.id)}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    borderColor: 'rgba(59, 130, 246, 0.4)',
                                    color: '#60a5fa',
                                  }}
                                >
                                  🔍 Phân tích chi tiết & Đề xuất giải pháp
                                </button>
                              </div>
                            ) : hasExactDbMatch ? (
                              <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>✓</span> Đã có sẵn trong MariaDB Thực Tế (ID #{item.possibleDbMatch.id}):
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#f8fafc', marginTop: '3px' }}>
                                  Vật phẩm <strong style={{ color: '#4ade80' }}>"{item.exportItem?.NAME}"</strong> (Icon #{item.exportItem?.icon_id}) đã tồn tại trong MariaDB tại ID #{item.possibleDbMatch.id}.
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px', fontStyle: 'italic' }}>
                                  Đã ẩn đề xuất thêm từ Export để tránh nạp trùng lặp vật phẩm.
                                </div>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                  <button
                                    className="btn sm"
                                    type="button"
                                    onClick={() => openDiagnosticModal(item.id)}
                                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                                  >
                                    🔍 Chi tiết
                                  </button>
                                  <button
                                    className="btn sm"
                                    type="button"
                                    onClick={() => openQuickTextModal(item)}
                                    style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                  >
                                    ✏️ Tên/Mô tả
                                  </button>
                                </div>
                              </div>
                            ) : isOnlyExport ? (
                              <div style={{ fontSize: '0.8rem', color: '#fb923c' }}>
                                <div>Item mới trong export chưa có trong DB</div>
                                <button
                                  className="btn sm"
                                  type="button"
                                  onClick={() => openDiagnosticModal(item.id)}
                                  style={{ marginTop: '4px', fontSize: '0.75rem', padding: '2px 8px' }}
                                >
                                  🔍 Xem chi tiết
                                </button>
                              </div>
                            ) : isOnlyDb ? (
                              <div style={{ fontSize: '0.8rem', color: '#60a5fa' }}>
                                Item chỉ tồn tại ở Database
                              </div>
                            ) : null}

                            {/* Đề xuất đồng bộ Tên & Mô tả theo Icon trùng khớp từ Export */}
                            {item.iconSyncSuggestions && item.iconSyncSuggestions.length > 0 && (
                              <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span>✨</span> Đề xuất đồng bộ theo Icon #{item.iconCluster?.iconId || item.dbItem?.icon_id} trùng khớp từ Export:
                                </div>
                                {item.iconSyncSuggestions.map((sug) => (
                                  <div key={sug.exportId} style={{ marginTop: '6px', padding: '6px 8px', background: 'rgba(15, 23, 42, 0.65)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
                                      Export #{sug.exportId}: <span style={{ color: '#4ade80' }}>{sug.exportName}</span>
                                    </div>
                                    {sug.exportDescription && (
                                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontStyle: 'italic', marginTop: '1px' }}>
                                        "{sug.exportDescription}"
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                      <button
                                        className="btn sm"
                                        type="button"
                                        onClick={() => handleSyncFromDifferentExport(item.id, sug.exportId, 'name_desc_only')}
                                        disabled={busy}
                                        style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#6ee7b7', fontWeight: 600 }}
                                        title={`Đồng bộ NAME: "${sug.exportName}" và description từ Export #${sug.exportId} vào DB #${item.id}`}
                                      >
                                        📥 Đồng bộ Tên & Mô tả theo Export #{sug.exportId}
                                      </button>
                                      <button
                                        className="btn sm"
                                        type="button"
                                        onClick={() => handleSyncFromDifferentExport(item.id, sug.exportId, 'all')}
                                        disabled={busy}
                                        style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8', color: '#7dd3fc' }}
                                        title={`Đồng bộ toàn bộ thuộc tính từ Export #${sug.exportId} vào DB #${item.id}`}
                                      >
                                        ⚡ Đồng bộ Tất cả
                                      </button>
                                      <button
                                        className="btn sm"
                                        type="button"
                                        onClick={() => openQuickTextModal({
                                          id: item.id,
                                          NAME: sug.exportName,
                                          description: sug.exportDescription,
                                          icon_id: sug.exportIconId,
                                          type: sug.exportType,
                                        })}
                                        style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)' }}
                                        title="Tùy chỉnh tên/mô tả trước khi lưu"
                                      >
                                        ✏️ Sửa trước khi lưu
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Đề xuất nạp vật phẩm Export chưa được tạo sang ô ID trống gần nhất */}
                            {item.uncreatedExportRedirect && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 700, fontSize: '0.82rem' }}>
                                  <span>💡</span>
                                  <span>Đề xuất nạp "{item.uncreatedExportRedirect.exportItem.name}" (Export #{item.uncreatedExportRedirect.exportItem.id}) sang ô ID trống:</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px', lineHeight: '1.4' }}>
                                  ID #{item.id} ở DB hiện tại đang chứa <strong style={{ color: '#4ade80' }}>"{item.uncreatedExportRedirect.currentDbOccupant.name}"</strong>. Vật phẩm Export <strong style={{ color: '#fbbf24' }}>"{item.uncreatedExportRedirect.exportItem.name}"</strong> (Icon #{item.uncreatedExportRedirect.exportItem.icon_id}) chưa có trong MariaDB.
                                </div>

                                {(() => {
                                  const pConflict = item.uncreatedExportRedirect.partConflict;
                                  const sParts = pConflict?.suggestedNewParts;
                                  const orig = sParts?.originalParts;
                                  if (!pConflict?.hasConflict && !pConflict?.hasAvatarConflict) return null;
                                  return (
                                    <div
                                      style={{
                                        marginTop: '8px',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                      }}
                                    >
                                      <div style={{ fontSize: '0.76rem', color: '#fca5a5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>⚠️</span>
                                        <span>
                                          Cột Part gốc #{orig?.part >= 0 ? orig.part : ''} (H:{orig?.head} B:{orig?.body} L:{orig?.leg})
                                          {pConflict.hasAvatarConflict ? ` hoặc Head Avatar #${orig?.head >= 0 ? orig.head : orig?.part}` : ''} đã có trong MariaDB!
                                        </span>
                                      </div>
                                      {pConflict.conflictingSlots?.slice(0, 2).map((c, ci) => (
                                        <div key={ci} style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '2px' }}>
                                          • {c.reason}
                                        </div>
                                      ))}
                                      <div style={{ fontSize: '0.76rem', color: '#fef08a', marginTop: '4px', fontWeight: 600 }}>
                                        ✨ Đề xuất tự động chuyển sang Part ID trống gần nhất: <strong style={{ color: '#4ade80' }}>#{sParts?.startId} - #{sParts?.endId}</strong>
                                        {sParts?.expAvatarId != null && (
                                          <span style={{ marginLeft: '6px', color: '#38bdf8' }}>
                                            & Head Avatar mới <strong>#{sParts.head} ➔ #{sParts.expAvatarId}</strong>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                  {item.uncreatedExportRedirect.partConflict?.hasConflict ? (
                                    <>
                                      <button
                                        className="btn sm"
                                        type="button"
                                        onClick={() => handleSyncFromDifferentExport(
                                          item.uncreatedExportRedirect.nearestEmptySlotId,
                                          item.uncreatedExportRedirect.exportItem.id,
                                          'all',
                                          { useNewPartIds: true }
                                        )}
                                        disabled={busy}
                                        style={{
                                          fontSize: '0.78rem',
                                          padding: '4px 10px',
                                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                          borderColor: '#10b981',
                                          color: '#ffffff',
                                          fontWeight: 700,
                                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
                                        }}
                                        title={`Nạp sang ô ID trống #${item.uncreatedExportRedirect.nearestEmptySlotId} và tự động cấp Part ID trống mới`}
                                      >
                                        ✨ Nạp sang ô #{item.uncreatedExportRedirect.nearestEmptySlotId} & Gán Part trống (#{item.uncreatedExportRedirect.partConflict.suggestedNewParts?.startId}..#{item.uncreatedExportRedirect.partConflict.suggestedNewParts?.endId})
                                      </button>
                                      <button
                                        className="btn sm"
                                        type="button"
                                        onClick={() => handleSyncFromDifferentExport(
                                          item.uncreatedExportRedirect.nearestEmptySlotId,
                                          item.uncreatedExportRedirect.exportItem.id,
                                          'all',
                                          { useNewPartIds: false }
                                        )}
                                        disabled={busy}
                                        style={{
                                          fontSize: '0.72rem',
                                          padding: '3px 6px',
                                          background: 'rgba(234, 179, 8, 0.15)',
                                          borderColor: 'rgba(234, 179, 8, 0.4)',
                                          color: '#fde047',
                                        }}
                                        title={`Nạp giữ nguyên Part ID gốc (#${item.uncreatedExportRedirect.exportItem.part})`}
                                      >
                                        📥 Giữ Part ID #{item.uncreatedExportRedirect.exportItem.part}
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="btn sm"
                                      type="button"
                                      onClick={() => handleSyncFromDifferentExport(
                                        item.uncreatedExportRedirect.nearestEmptySlotId,
                                        item.uncreatedExportRedirect.exportItem.id,
                                        'all',
                                        { useNewPartIds: false }
                                      )}
                                      disabled={busy}
                                      style={{
                                        fontSize: '0.78rem',
                                        padding: '4px 10px',
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        borderColor: '#f59e0b',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)',
                                      }}
                                      title={`Nạp "${item.uncreatedExportRedirect.exportItem.name}" vào ô ID trống gần nhất #${item.uncreatedExportRedirect.nearestEmptySlotId}`}
                                    >
                                      ✨ Nạp sang ô ID trống gần nhất #{item.uncreatedExportRedirect.nearestEmptySlotId}
                                    </button>
                                  )}

                                  {item.uncreatedExportRedirect.nearbyEmptySlots?.length > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                      <span>Hoặc ô:</span>
                                      {item.uncreatedExportRedirect.nearbyEmptySlots.filter((sid) => sid !== item.uncreatedExportRedirect.nearestEmptySlotId).slice(0, 3).map((sid) => (
                                        <button
                                          key={sid}
                                          className="btn sm"
                                          type="button"
                                          onClick={() => handleSyncFromDifferentExport(
                                            sid,
                                            item.uncreatedExportRedirect.exportItem.id,
                                            'all',
                                            { useNewPartIds: item.uncreatedExportRedirect.partConflict?.hasConflict }
                                          )}
                                          disabled={busy}
                                          style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)' }}
                                        >
                                          #{sid}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Column 5: Action */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                              {isEmptyDbSlot ? (
                                <button
                                  className="btn sm"
                                  type="button"
                                  onClick={() => handleSyncSingle(item.id)}
                                  disabled={busy}
                                  style={{ background: '#eab308', borderColor: '#eab308', color: '#0f172a', fontWeight: 700, fontSize: '0.76rem', padding: '4px 8px' }}
                                  title={`Nạp "${item.exportItem?.NAME}" từ Export vào ô trống #${item.id} (tuyệt đối không can thiệp cột part và head_avatar)`}
                                >
                                  📥 Nạp ô trống
                                </button>
                              ) : item.uncreatedExportRedirect ? (
                                <button
                                  className="btn sm"
                                  type="button"
                                  onClick={() => handleSyncFromDifferentExport(
                                    item.uncreatedExportRedirect.nearestEmptySlotId,
                                    item.uncreatedExportRedirect.exportItem.id,
                                    'all',
                                    { useNewPartIds: false }
                                  )}
                                  disabled={busy}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '3px 8px',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    borderColor: '#f59e0b',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                  }}
                                  title={`Nạp "${item.uncreatedExportRedirect.exportItem.name}" sang ô trống #${item.uncreatedExportRedirect.nearestEmptySlotId} (không can thiệp cột part và head_avatar)`}
                                >
                                  ✨ Nạp sang ô #{item.uncreatedExportRedirect.nearestEmptySlotId}
                                </button>
                              ) : item.exportItem && !hasExactDbMatch ? (
                                <button
                                  className="btn sm primary"
                                  type="button"
                                  onClick={() => handleSyncSingle(item.id)}
                                  disabled={busy}
                                  title="Nạp thuộc tính từ Export vào DB (tuyệt đối không can thiệp cột part và head_avatar)"
                                >
                                  {item.dbItem ? '📥 Đồng bộ' : '➕ Thêm vào DB'}
                                </button>
                              ) : null}
                              <button
                                className="btn sm"
                                type="button"
                                onClick={() => openQuickTextModal(item)}
                                style={{ fontSize: '0.76rem', padding: '3px 8px', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93c5fd' }}
                                title="Đổi tên & mô tả trực tiếp vào MariaDB hoặc file Export"
                              >
                                ✏️ Tên/Mô tả
                              </button>
                              {item.dbItem && (
                                <>
                                  <button
                                    className="btn sm"
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('db');
                                      startEdit(item.dbItem);
                                    }}
                                    title="Chỉnh sửa toàn bộ thông số trong DB"
                                  >
                                    ⚙️ Sửa đầy đủ
                                  </button>
                                  <button
                                    className="btn sm"
                                    type="button"
                                    onClick={() => openDeleteModal(item)}
                                    style={{ fontSize: '0.74rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' }}
                                    title="Xóa item này khỏi MariaDB (kèm Part và Head Avatar liên kết)"
                                  >
                                    🗑️ Xóa DB
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* BOTTOM PAGINATION BAR WITH JUMP-TO-PAGE */}
            <QuickPaginationBar
              total={compareTotal}
              limit={compareLimit}
              offset={compareOffset}
              onPageChange={setCompareOffset}
              onLimitChange={(newLimit) => { setCompareLimit(newLimit); setCompareOffset(0); }}
              loading={compareLoading}
              label="vật phẩm đối chiếu"
            />
          </div>
        </div>

      {/* ========================================================================= */}
      {/* DEEP DIAGNOSTIC & SAFETY MODAL (BẢNG CHẨN ĐOÁN CHI TIẾT & ĐỀ XUẤT AN TOÀN) */}
      {/* ========================================================================= */}
      {diagnosticData && (
        <div className="modal-backdrop" onClick={closeDiagnosticModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '1050px', width: '96vw', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal Header with Full Visual Sprites */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <ItemIcon
                      iconId={diagnosticData.exportItem?.icon_id ?? diagnosticData.dbItem?.icon_id}
                      tempId={diagnosticData.id}
                      name={diagnosticData.exportItem?.NAME ?? diagnosticData.dbItem?.NAME}
                      size={56}
                    />
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>#{diagnosticData.id}</span>
                        <span>{diagnosticData.exportItem?.NAME || diagnosticData.dbItem?.NAME}</span>
                      </h2>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                        Báo cáo chẩn đoán toàn diện 3 tầng: <strong>Item Template</strong> + <strong>Part Sprites</strong> + <strong>Head Avatar</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => openQuickTextModal(diagnosticData)}
                      style={{ background: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', color: '#60a5fa', fontWeight: 600 }}
                      title="Chỉnh sửa nhanh tên và mô tả cho DB / Export"
                    >
                      ✏️ Đổi Tên & Mô Tả
                    </button>
                    <button className="btn" type="button" onClick={closeDiagnosticModal} style={{ padding: '6px 12px' }}>
                      ✖ Đóng
                    </button>
                  </div>
                </div>

                {/* Safety & Risk Assessment Banner */}
                <div
                  style={{
                    margin: '16px 0',
                    padding: '16px',
                    borderRadius: '12px',
                    background: (diagnosticData.hasPartMismatch || diagnosticData.hasAvatarMismatch || diagnosticData.analysis?.riskLevel === 'HIGH') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${(diagnosticData.hasPartMismatch || diagnosticData.hasAvatarMismatch || diagnosticData.analysis?.riskLevel === 'HIGH') ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: (diagnosticData.hasPartMismatch || diagnosticData.hasAvatarMismatch || diagnosticData.analysis?.riskLevel === 'HIGH') ? '#f87171' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🛡️</span>
                      <span>
                        {diagnosticData.hasPartMismatch
                          ? '⚠️ CẢNH BÁO: Phát hiện độ lệch dữ liệu Part Sprites đồ họa trong MariaDB!'
                          : diagnosticData.hasAvatarMismatch
                          ? '⚠️ CẢNH BÁO: Phát hiện độ lệch mapping Head Avatar!'
                          : diagnosticData.analysis?.riskText || 'Đánh giá mức độ đồng bộ'}
                      </span>
                    </div>

                    <div style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', fontSize: '0.82rem', color: '#e2e8f0' }}>
                      👥 Người chơi đang giữ item này: <strong>{diagnosticData.playerUsage?.totalHolders ?? 0} nhân vật</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                    <p style={{ margin: '0 0 6px 0' }}>
                      <strong>🔍 Nguyên nhân:</strong> {diagnosticData.hasPartMismatch ? 'Bảng part trong MariaDB đang lưu sprite của vật phẩm khác hoặc chưa nạp đúng frame đồ họa từ export/part.txt.' : diagnosticData.analysis?.rootCause || 'Dữ liệu có sự khác biệt giữa MariaDB và bản dựng Export.'}
                    </p>
                    <p style={{ margin: 0, color: '#34d399' }}>
                      <strong>✅ Đảm bảo an toàn:</strong> Đồng bộ chuẩn 3 tầng không làm mất hay hỏng item trong túi đồ người chơi, tự động tái tạo file nhị phân <code>data/update_data/part</code> và reload runtime Java.
                    </p>
                  </div>
                </div>

                {/* TIER 1: PART SPRITES COMPARISON (ĐẦU - THÂN - CHÂN - PHỤ KIỆN) */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧩</span> 1. Đối Chiếu Dữ Liệu Part Sprites Đồ Họa (Bảng <code>part</code>)
                  </h4>
                  <div className="table-wrap" style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '130px' }}>Bộ Phận</th>
                          <th style={{ width: '100px' }}>Part ID</th>
                          <th style={{ width: '220px' }}>MariaDB Hiện Tại</th>
                          <th style={{ width: '220px' }}>Bản Dựng Export Chuẩn</th>
                          <th>Trạng Thái & Dữ Liệu Chi Tiết</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnosticData.partDetails && diagnosticData.partDetails.length > 0 ? (
                          diagnosticData.partDetails.map((p) => (
                            <tr key={p.slot} style={{ background: !p.matched ? 'rgba(239, 68, 68, 0.06)' : undefined }}>
                              <td>
                                <strong style={{ color: '#f8fafc' }}>{p.label}</strong>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Type: {p.expectedType}</div>
                              </td>
                              <td>
                                <code style={{ fontWeight: 700, color: '#facc15' }}>#{p.partId}</code>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {p.dbIcon ? (
                                    <ItemIcon iconId={p.dbIcon} size={36} />
                                  ) : (
                                    <span className="muted" style={{ fontSize: '0.78rem' }}>Không có icon</span>
                                  )}
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: p.dbIcon ? '#f87171' : '#94a3b8' }}>
                                      {p.dbIcon ? `Icon #${p.dbIcon}` : 'Chưa có trong DB'}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                      {p.dbPart?.frames ? `${p.dbPart.frames.length} frames` : '-'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {p.expIcon ? (
                                    <ItemIcon iconId={p.expIcon} size={36} />
                                  ) : (
                                    <span className="muted" style={{ fontSize: '0.78rem' }}>Không có icon</span>
                                  )}
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4ade80' }}>
                                      {p.expIcon ? `Icon #${p.expIcon}` : 'Chưa có trong Export'}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                      {p.expPart?.frames ? `${p.expPart.frames.length} frames` : '-'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {p.matched ? (
                                  <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: 600 }}>🟢 Trùng khớp chuẩn</span>
                                ) : (
                                  <div>
                                    <span style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                                      ⚠️ {p.issue}
                                    </span>
                                    {p.dbData && (
                                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', wordBreak: 'break-all', maxHeight: '40px', overflowY: 'auto' }}>
                                        DB Data: <code>{p.dbData}</code>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '16px' }}>
                              Item này không sử dụng bộ phận Part đồ họa nào (Tất cả Part = -1).
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TIER 2: HEAD AVATAR MAPPING COMPARISON */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>👤</span> 2. Đối Chiếu Mapping Head Avatar (Bảng <code>head_avatar</code>)
                  </h4>
                  <div className="table-wrap" style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '130px' }}>Head ID</th>
                          <th style={{ width: '220px' }}>Avatar MariaDB Hiện Tại</th>
                          <th style={{ width: '220px' }}>Avatar Export Chuẩn</th>
                          <th>Trạng Thái Đối Chiếu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnosticData.headAvatarDetails && diagnosticData.headAvatarDetails.length > 0 ? (
                          diagnosticData.headAvatarDetails.map((a) => (
                            <tr key={a.headId} style={{ background: !a.matched ? 'rgba(239, 68, 68, 0.06)' : undefined }}>
                              <td>
                                <code style={{ fontWeight: 700, color: '#38bdf8' }}>Head #{a.headId}</code>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {a.dbAvatarId != null ? (
                                    <>
                                      <ItemIcon iconId={a.dbAvatarId} size={36} isAvatar={true} />
                                      <span style={{ fontSize: '0.82rem', color: a.matched ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                        Avatar #{a.dbAvatarId}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="muted" style={{ fontSize: '0.82rem' }}>❌ Chưa có trong DB</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {a.expAvatarId != null ? (
                                    <>
                                      <ItemIcon iconId={a.expAvatarId} size={36} isAvatar={true} />
                                      <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>
                                        Avatar #{a.expAvatarId}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="muted" style={{ fontSize: '0.82rem' }}>Không có trong Export</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {a.matched ? (
                                  <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: 600 }}>🟢 Avatar đúng chuẩn</span>
                                ) : (
                                  <span style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 600 }}>⚠️ {a.issue}</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '16px' }}>
                              Item này không có Head Part hoặc không yêu cầu mapping avatar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TIER 3: ITEM TEMPLATE FIELDS DIFF */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📋</span> 3. Đối Chiếu Thuộc Tính Item Template (Bảng <code>item_template</code>) ({diagnosticData.diffs.length} mục lệch)
                  </h4>
                  {diagnosticData.diffs.length === 0 ? (
                    <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#34d399', fontSize: '0.85rem' }}>
                      🟢 Bảng item_template đã hoàn toàn trùng khớp với file Export.
                    </div>
                  ) : (
                    <div className="table-wrap" style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '160px' }}>Thuộc Tính</th>
                            <th style={{ width: '130px' }}>MariaDB Hiện Tại</th>
                            <th style={{ width: '130px' }}>Bản Dựng Export</th>
                            <th>Ý Nghĩa & Tác Động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diagnosticData.diffs.map((d) => (
                            <tr key={d.field}>
                              <td>
                                <strong style={{ color: '#f8fafc' }}>{d.label}</strong>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{d.category}</div>
                              </td>
                              <td>
                                <code style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {String(d.dbValue)}
                                </code>
                              </td>
                              <td>
                                <code style={{ color: '#4ade80', background: 'rgba(74, 222, 128, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {String(d.exportValue)}
                                </code>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>{d.whatChanged}</div>
                                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>{d.impact}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Safe Action Proposals */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💡</span> Đề Xuất Các Phương Án Xử Lý An Toàn & Chuẩn Xác 100%:
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    {/* Option 1: Safe Sync Item Template (Preserve Part & Head Avatar) */}
                    <div
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.92rem' }}>
                          🌟 Phương án 1 (Khuyên dùng): Nạp Item Template vào DB
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px', lineHeight: '1.4' }}>
                          Nạp thông số <strong>Item Template</strong> (tên, icon, type, giá, chỉ số) từ Export vào MariaDB. <strong>Tuyệt đối bảo toàn cột part và bảng head_avatar</strong> trong MariaDB.
                        </div>
                      </div>
                      <button
                        className="btn primary sm"
                        type="button"
                        onClick={() => handleSyncSingle(diagnosticData.id)}
                        disabled={busy}
                        style={{ width: '100%', marginTop: '8px' }}
                      >
                        📥 Nạp vào DB (Bảo toàn Part & Avatar)
                      </button>
                    </div>

                    {/* Option 3: Keep DB & Update Export */}
                    <div
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#c084fc', fontSize: '0.92rem' }}>
                          🔵 Phương án 3: Giữ cấu hình DB ➔ Ghi vào Export
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px', lineHeight: '1.4' }}>
                          Nếu cấu hình hiện tại trong DB là chủ đích của server, ghi đè giá trị DB sang file export để loại bỏ cảnh báo lệch.
                        </div>
                      </div>
                      <button
                        className="btn sm"
                        type="button"
                        onClick={() => handleUpdateExportFromDb(diagnosticData.id)}
                        disabled={busy}
                        style={{ width: '100%', marginTop: '8px' }}
                      >
                        📤 Cập nhật giá trị DB vào Export
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* ========================================================================= */}
      {/* QUICK EDIT NAME & DESCRIPTION MODAL (ĐỔI TÊN & MÔ TẢ TRỰC TIẾP) */}
      {/* ========================================================================= */}
      {quickTextModal && (
        <div className="modal-backdrop" onClick={closeQuickTextModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '650px',
              width: '95vw',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ItemIcon iconId={quickTextModal.iconId} tempId={quickTextModal.id} name={quickTextModal.name} size={48} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✏️ Đổi Tên & Mô Tả — Item #{quickTextModal.id}</span>
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                    Chỉnh sửa nhanh trực tiếp cho Database MariaDB & file export/item_template.txt
                  </div>
                </div>
              </div>
              <button className="btn sm" type="button" onClick={closeQuickTextModal} disabled={quickTextBusy}>✖ Đóng</button>
            </div>

            {/* Side-by-side Current Values Reference Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '14px 0', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* DB Current */}
              <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#60a5fa' }}>🗄️ MariaDB Hiện Tại:</span>
                  {quickTextModal.dbItem && (
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => {
                        setQuickTextModal((prev) => ({
                          ...prev,
                          name: prev.dbItem?.NAME || '',
                          description: prev.dbItem?.description || '',
                        }));
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      title="Điền tên và mô tả từ Database vào ô bên dưới"
                    >
                      📋 Dùng mẫu này
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {quickTextModal.dbItem?.NAME || <span style={{ color: '#f87171', fontStyle: 'italic' }}>Chưa có / Trống</span>}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                  {quickTextModal.dbItem?.description || 'Không có mô tả'}
                </div>
              </div>

              {/* Export Current */}
              <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#34d399' }}>📄 Export Hiện Tại:</span>
                  {quickTextModal.exportItem && (
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => {
                        setQuickTextModal((prev) => ({
                          ...prev,
                          name: prev.exportItem?.NAME || '',
                          description: prev.exportItem?.description || '',
                        }));
                      }}
                      style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      title="Điền tên và mô tả từ file Export vào ô bên dưới"
                    >
                      📋 Dùng mẫu này
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {quickTextModal.exportItem?.NAME || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có trong Export</span>}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                  {quickTextModal.exportItem?.description || 'Không có mô tả'}
                </div>
              </div>
            </div>

            {/* Edit Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Tên Vật Phẩm Mới <strong style={{ color: '#ef4444' }}>*</strong></span>
                  <span style={{ fontSize: '0.75rem', color: quickTextModal.name.length > 255 ? '#ef4444' : '#94a3b8' }}>
                    {quickTextModal.name.length}/255
                  </span>
                </div>
                <input
                  type="text"
                  value={quickTextModal.name}
                  maxLength={255}
                  onChange={(e) => setQuickTextModal((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên vật phẩm..."
                  autoFocus
                  required
                  style={{ fontSize: '1rem', padding: '8px 12px' }}
                />
              </label>

              <label className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Mô Tả Vật Phẩm Mới (Tối đa 75 ký tự theo schema game)</span>
                  <span style={{ fontSize: '0.75rem', color: quickTextModal.description.length > 75 ? '#ef4444' : '#94a3b8' }}>
                    {quickTextModal.description.length}/75
                  </span>
                </div>
                <input
                  type="text"
                  value={quickTextModal.description}
                  maxLength={75}
                  onChange={(e) => setQuickTextModal((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả công dụng hoặc thuộc tính..."
                  style={{ fontSize: '0.92rem', padding: '8px 12px' }}
                />
              </label>
            </div>

            {/* 3 Action Buttons */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Chọn phạm vi lưu thay đổi:</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Recommended: Lưu cả 2 */}
                <button
                  className="btn primary"
                  type="button"
                  disabled={quickTextBusy || !quickTextModal.name.trim()}
                  onClick={() => handleSaveQuickText('both')}
                  style={{
                    flex: '1 1 200px',
                    padding: '10px 16px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #10b981 0%, #0284c7 100%)',
                    borderColor: '#10b981',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                  }}
                  title="Cập nhật đồng thời cả MariaDB và file export/item_template.txt để 2 bên khớp nhau hoàn toàn"
                >
                  {quickTextBusy ? 'Đang lưu...' : '⚡ Lưu Cả 2 (MariaDB & File Export)'}
                </button>

                {/* Chỉ DB */}
                <button
                  className="btn"
                  type="button"
                  disabled={quickTextBusy || !quickTextModal.name.trim()}
                  onClick={() => handleSaveQuickText('db')}
                  style={{ flex: '1 1 140px', padding: '10px 12px', background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#93c5fd', fontWeight: 600 }}
                  title="Chỉ lưu vào bảng item_template của MariaDB"
                >
                  💾 Chỉ Lưu MariaDB
                </button>

                {/* Chỉ Export */}
                <button
                  className="btn"
                  type="button"
                  disabled={quickTextBusy || !quickTextModal.name.trim()}
                  onClick={() => handleSaveQuickText('export')}
                  style={{ flex: '1 1 140px', padding: '10px 12px', background: 'rgba(234, 179, 8, 0.15)', borderColor: '#eab308', color: '#fde047', fontWeight: 600 }}
                  title="Chỉ lưu vào file export/item_template.txt"
                >
                  📝 Chỉ Lưu File Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: QUẢN LÝ VẬT PHẨM TRONG DATABASE MARIADB */}
      {/* ========================================================================= */}
      <div style={{ display: activeTab === 'db' ? 'block' : 'none' }}>
          {/* Top Quick Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '1.25rem',
            }}
          >
            <div
              className="card"
              style={{
                padding: '14px 18px',
                borderLeft: '4px solid #3b82f6',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Tổng Item trong Database</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa' }}>{dbTotal.toLocaleString('vi-VN')}</div>
              <small className="muted">MariaDB table: <code>item_template</code></small>
            </div>

            <div
              className="card"
              style={{
                padding: '14px 18px',
                borderLeft: '4px solid #10b981',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>ID Kế Tiếp Tự Động</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399' }}>#{dbNextId}</div>
              <small className="muted">Đảm bảo ID index liên tục từ 0</small>
            </div>

            <div
              className="card"
              style={{
                padding: '14px 18px',
                borderLeft: '4px solid #8b5cf6',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Thư Mục Ảnh Icon</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#c084fc' }}>data/icon/x4</div>
              <small className="muted">Tự động đọc các mức zoom x4, x3, x2, x1</small>
            </div>

            <div
              className="card"
              style={{
                padding: '14px 18px',
                borderLeft: '4px solid #f59e0b',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Sắp Xếp Hiện Tại</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fbbf24' }}>
                {dbSortBy === 'icon_id' ? '🖼️ Icon ID' : '🆔 Item ID'} ({dbSortDir.toUpperCase()})
              </div>
              <small className="muted">{dbRows.length} items trên trang này</small>
            </div>
          </div>

          {/* Form Thêm Mới / Sửa Item With Full Part Live Preview */}
          {isFormOpen && (
            <form
              className="card section"
              onSubmit={saveItem}
              style={{
                marginBottom: '1.5rem',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                background: 'rgba(20, 28, 42, 0.95)',
              }}
            >
              <div className="section-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{editingId == null ? '➕ Thêm Vật Phẩm Mới' : `✏️ Chỉnh Sửa Vật Phẩm #${editingId}`}</span>
                    {editingId != null && <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 400 }}>({form.name})</span>}
                  </h3>
                  <p className="muted" style={{ margin: '4px 0 0 0' }}>
                    Dữ liệu sẽ được lưu trực tiếp vào MariaDB XAMPP <code>item_template</code> và đồng bộ Java runtime.
                  </p>
                </div>
                <button className="btn" type="button" onClick={resetForm}>
                  ✖ Đóng Form
                </button>
              </div>

              {/* Form Content Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 260px) 1fr',
                  gap: '24px',
                  marginTop: '16px',
                }}
              >
                {/* Left: Icon & Part Live Visual Preview Box */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '12px',
                    padding: '16px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>Xem Trước Icon & Part</div>

                  {/* Main Face Icon */}
                  <div style={{ padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <ItemIcon iconId={form.icon_id} tempId={editingId} name={form.name} size={64} />
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#60a5fa', fontWeight: 700 }}>
                    Icon ID: #{form.icon_id}
                  </div>

                  {/* Part Frames Sprites Live Preview */}
                  <div
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 700, marginBottom: '6px' }}>
                      🧩 Ảnh Part Đồ Họa (Head/Body/Leg):
                    </div>
                    <PartThumbnailPreview
                      partPreview={formPartPreview}
                      head={form.head}
                      body={form.body}
                      leg={form.leg}
                      part={form.part}
                      partsMap={partsMap}
                      size={40}
                      showLabels={true}
                    />
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {getTypeInfo(form.type).icon} {getTypeInfo(form.type).label} · {getGenderInfo(form.gender).label}
                  </div>
                </div>

                {/* Right: Input fields grid */}
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  <label className="field" style={{ gridColumn: 'span 2' }}>
                    <span>Tên vật phẩm <strong style={{ color: '#ef4444' }}>*</strong></span>
                    <input
                      value={form.name}
                      maxLength={255}
                      onChange={(e) => patch('name', e.target.value)}
                      placeholder="Nhập tên vật phẩm..."
                      required
                    />
                  </label>

                  <label className="field" style={{ gridColumn: 'span 2' }}>
                    <span>Mô tả (Tối đa 75 ký tự)</span>
                    <input
                      value={form.description}
                      maxLength={75}
                      onChange={(e) => patch('description', e.target.value)}
                      placeholder="Mô tả công dụng hoặc thuộc tính..."
                    />
                  </label>

                  <label className="field">
                    <span>Loại trang bị (Type)</span>
                    <select value={form.type} onChange={(e) => patch('type', numberField(e.target.value))}>
                      {TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} · {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Hành tinh / Tộc (Gender)</span>
                    <select value={form.gender} onChange={(e) => patch('gender', numberField(e.target.value))}>
                      {GENDERS.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label} ({g.short})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Icon ID <strong style={{ color: '#ef4444' }}>*</strong></span>
                      {Number(form.icon_id) > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 600 }}>
                          <ItemIcon iconId={form.icon_id} size={22} /> #{form.icon_id}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={form.icon_id}
                      onChange={(e) => patch('icon_id', numberField(e.target.value))}
                      required
                    />
                  </label>

                  <label className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Part ID (-1 nếu không có)</span>
                      {formPartPreview?.part?.icon > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }} title={`Part #${form.part} -> Icon #${formPartPreview.part.icon}`}>
                          <ItemIcon iconId={formPartPreview.part.icon} size={22} /> #{formPartPreview.part.icon}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="-1"
                      value={form.part}
                      onChange={(e) => patch('part', numberField(e.target.value, -1))}
                    />
                  </label>

                  <label className="field">
                    <span>Level yêu cầu</span>
                    <input
                      type="number"
                      min="0"
                      value={form.level}
                      onChange={(e) => patch('level', numberField(e.target.value))}
                    />
                  </label>

                  <label className="field">
                    <span>Sức mạnh yêu cầu (Power)</span>
                    <input
                      type="number"
                      min="0"
                      value={form.power_require}
                      onChange={(e) => patch('power_require', numberField(e.target.value))}
                    />
                  </label>

                  <label className="field">
                    <span>Giá Vàng (Gold)</span>
                    <input
                      type="number"
                      min="0"
                      value={form.gold}
                      onChange={(e) => patch('gold', numberField(e.target.value))}
                    />
                  </label>

                  <label className="field">
                    <span>Giá Ngọc (Gem)</span>
                    <input
                      type="number"
                      min="0"
                      value={form.gem}
                      onChange={(e) => patch('gem', numberField(e.target.value))}
                    />
                  </label>

                  <label className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Head Part (-1)</span>
                      {formPartPreview?.head?.icon > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600 }} title={`Head #${form.head} -> Icon #${formPartPreview.head.icon}`}>
                          <ItemIcon iconId={formPartPreview.head.icon} size={22} /> #{formPartPreview.head.icon}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="-1"
                      value={form.head}
                      onChange={(e) => patch('head', numberField(e.target.value, -1))}
                    />
                  </label>

                  <label className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Body Part (-1)</span>
                      {formPartPreview?.body?.icon > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#c084fc', fontSize: '0.75rem', fontWeight: 600 }} title={`Body #${form.body} -> Icon #${formPartPreview.body.icon}`}>
                          <ItemIcon iconId={formPartPreview.body.icon} size={22} /> #{formPartPreview.body.icon}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="-1"
                      value={form.body}
                      onChange={(e) => patch('body', numberField(e.target.value, -1))}
                    />
                  </label>

                  <label className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Leg Part (-1)</span>
                      {formPartPreview?.leg?.icon > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f472b6', fontSize: '0.75rem', fontWeight: 600 }} title={`Leg #${form.leg} -> Icon #${formPartPreview.leg.icon}`}>
                          <ItemIcon iconId={formPartPreview.leg.icon} size={22} /> #{formPartPreview.leg.icon}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="-1"
                      value={form.leg}
                      onChange={(e) => patch('leg', numberField(e.target.value, -1))}
                    />
                  </label>

                  <label className="field checkbox-field" style={{ alignSelf: 'center', marginTop: '14px' }}>
                    <span>Cho phép nâng cấp (is_up_to_up)</span>
                    <input
                      type="checkbox"
                      checked={Boolean(Number(form.is_up_to_up))}
                      onChange={(e) => patch('is_up_to_up', e.target.checked ? 1 : 0)}
                    />
                  </label>

                  <label className="field checkbox-field" style={{ alignSelf: 'center', marginTop: '14px', background: 'rgba(59, 130, 246, 0.12)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <span style={{ color: '#93c5fd', fontWeight: 600 }}>📝 Đồng thời cập nhật file export/item_template.txt</span>
                    <input
                      type="checkbox"
                      checked={syncWithExportFile}
                      onChange={(e) => setSyncWithExportFile(e.target.checked)}
                    />
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button className="btn primary" type="submit" disabled={busy} style={{ minWidth: '160px' }}>
                    {busy ? 'Đang lưu...' : editingId == null ? `💾 Tạo Item #${dbNextId}` : `💾 Lưu Item #${editingId}`}
                  </button>
                  <button className="btn" type="button" onClick={resetForm} disabled={busy}>
                    Hủy
                  </button>
                </div>
                {editingId != null && (
                  <button
                    className="btn sm"
                    type="button"
                    onClick={() => openQuickTextModal(form)}
                    style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#60a5fa' }}
                  >
                    ✏️ Sửa Nhanh Tên & Mô Tả
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Table Container & Filter Toolbar */}
          <div className="card section">
            {/* Filter and Sorting Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600 }}>🔢 Sắp xếp:</span>
                <select
                  value={`${dbSortBy}_${dbSortDir}`}
                  onChange={(e) => {
                    const [field, dir] = e.target.value.split('_');
                    setDbSortBy(field);
                    setDbSortDir(dir);
                    setDbOffset(0);
                  }}
                  style={{ padding: '5px 10px', fontSize: '0.85rem', background: '#1e293b', color: '#60a5fa', fontWeight: 600, border: '1px solid #3b82f6' }}
                >
                  <option value="icon_id_asc">🖼️ Icon ID: Bé ➔ Lớn (Tăng dần)</option>
                  <option value="icon_id_desc">🖼️ Icon ID: Lớn ➔ Bé (Giảm dần)</option>
                  <option value="id_asc">🆔 Item ID: Bé ➔ Lớn (#0 ➔ ...)</option>
                  <option value="id_desc">🆔 Item ID: Lớn ➔ Bé</option>
                  <option value="name_asc">🔤 Tên: A ➔ Z</option>
                  <option value="name_desc">🔤 Tên: Z ➔ A</option>
                  <option value="level_desc">Level cao ➔ thấp</option>
                  <option value="power_require_desc">Sức mạnh cao ➔ thấp</option>
                </select>

                {/* Khoảng Icon ID min - max */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Icon:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={dbMinIcon}
                    onChange={(e) => { setDbMinIcon(e.target.value); setDbOffset(0); }}
                    style={{ width: '70px', padding: '3px 6px', fontSize: '0.82rem' }}
                  />
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>➔</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={dbMaxIcon}
                    onChange={(e) => { setDbMaxIcon(e.target.value); setDbOffset(0); }}
                    style={{ width: '70px', padding: '3px 6px', fontSize: '0.82rem' }}
                  />
                </div>

                {/* Lọc chính xác Icon ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>🎯 Icon chuẩn:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 16131"
                    value={dbExactIcon}
                    onChange={(e) => { setDbExactIcon(e.target.value); setDbOffset(0); }}
                    style={{ width: '85px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 700 }}
                    title="Lọc đúng Icon ID (ví dụ 16131)"
                  />
                </div>

                <select value={dbType} onChange={(e) => { setDbType(e.target.value); setDbOffset(0); }} style={{ maxWidth: '130px', padding: '5px 8px' }}>
                  <option value="all">Tất cả loại</option>
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>

                <select value={dbGender} onChange={(e) => { setDbGender(e.target.value); setDbOffset(0); }} style={{ maxWidth: '120px', padding: '5px 8px' }}>
                  <option value="all">Tất cả tộc</option>
                  {GENDERS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>

                <select value={dbHasIcon} onChange={(e) => { setDbHasIcon(e.target.value); setDbOffset(0); }} style={{ maxWidth: '130px', padding: '5px 8px' }}>
                  <option value="all">Icon PNG</option>
                  <option value="1">🟢 Có file ảnh</option>
                  <option value="0">⚠️ Thiếu file ảnh</option>
                </select>

                <select value={dbPartStatus} onChange={(e) => { setDbPartStatus(e.target.value); setDbOffset(0); }} style={{ maxWidth: '170px', padding: '5px 8px', background: dbPartStatus === 'mismatch' ? 'rgba(239, 68, 68, 0.2)' : undefined, color: dbPartStatus === 'mismatch' ? '#fca5a5' : undefined, fontWeight: 600 }}>
                  <option value="all">Tất cả Part & Avatar</option>
                  <option value="mismatch">⚠️ Chỉ xem LỆCH Part/Avatar DB</option>
                  <option value="matched">🟢 Chỉ xem ĐÚNG Part/Avatar DB</option>
                </select>

                <select
                  value={dbSlotStatus}
                  onChange={(e) => { setDbSlotStatus(e.target.value); setDbOffset(0); }}
                  style={{
                    maxWidth: '190px',
                    padding: '5px 8px',
                    background: dbSlotStatus === 'has_export' ? 'rgba(56, 189, 248, 0.2)' : dbSlotStatus === 'empty_only' ? 'rgba(234, 179, 8, 0.2)' : undefined,
                    color: dbSlotStatus === 'has_export' ? '#38bdf8' : dbSlotStatus === 'empty_only' ? '#fde047' : undefined,
                    fontWeight: 600,
                  }}
                >
                  <option value="all">Tất cả ô ID</option>
                  <option value="has_export">💡 Ô trống có sẵn ở Export</option>
                  <option value="empty_only">📭 Chỉ xem ô ID trống (Placeholder/Type 75)</option>
                  <option value="filled_only">📦 Chỉ xem vật phẩm đã đặt tên</option>
                </select>

                {/* Lọc theo Part ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#facc15', fontWeight: 600 }}>🧩 Part:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 2006"
                    value={dbPartId}
                    onChange={(e) => { setDbPartId(e.target.value); setDbOffset(0); }}
                    style={{ width: '75px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#facc15', color: '#fde047', fontWeight: 700 }}
                    title="Lọc theo Part ID (Head, Body, Leg, Part)"
                  />
                  {dbPartId && (
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => { setDbPartId(''); setDbOffset(0); }}
                      style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                      title="Xóa lọc Part"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Lọc theo Head Avatar ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#c084fc', fontWeight: 600 }}>👤 Avatar:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 2006"
                    value={dbAvatarId}
                    onChange={(e) => { setDbAvatarId(e.target.value); setDbOffset(0); }}
                    style={{ width: '75px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#c084fc', color: '#d8b4fe', fontWeight: 700 }}
                    title="Lọc theo Avatar ID hoặc Head Avatar mapping"
                  />
                  {dbAvatarId && (
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => { setDbAvatarId(''); setDbOffset(0); }}
                      style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                      title="Xóa lọc Avatar"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Nút Mở Kho Part & Avatar Modal */}
                <button
                  className="btn sm"
                  type="button"
                  onClick={() => { setCatalogModalOpen(true); setCatalogModalTab('parts'); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(192, 132, 252, 0.2) 100%)',
                    borderColor: '#facc15',
                    color: '#fef08a',
                    fontWeight: 700,
                  }}
                  title="Xem toàn bộ danh sách Part ID và Head Avatar có hình ảnh icon trực quan"
                >
                  🎨 Kho Part & Avatar ({partsCatalog.length})
                </button>
              </div>

              {/* Ô tìm kiếm */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="🔍 Tìm ID, Icon, Tên..."
                  value={dbQ}
                  onChange={(e) => setDbQ(e.target.value)}
                  style={{ width: '180px', padding: '5px 8px' }}
                />
                <button className="btn sm" type="button" onClick={() => loadDbItems()}>Tìm</button>
              </div>
            </div>

            {/* TOP PAGINATION BAR WITH JUMP-TO-PAGE */}
            <QuickPaginationBar
              total={dbTotal}
              limit={dbLimit}
              offset={dbOffset}
              onPageChange={setDbOffset}
              onLimitChange={(newLimit) => { setDbLimit(newLimit); setDbOffset(0); }}
              loading={dbLoading}
              label="vật phẩm database"
            />

            {/* Table Content */}
            <div className="table-wrap" style={{ maxHeight: '720px', overflowY: 'auto', position: 'relative' }}>
              {dbLoading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.45)',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(1px)',
                  }}
                >
                  <div className="ui-spinner" />
                </div>
              )}
              {dbRows.length === 0 && !dbLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Không tìm thấy vật phẩm nào phù hợp với bộ lọc.
                </div>
              ) : dbRows.length === 0 && dbLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="ui-spinner" style={{ margin: '0 auto 12px' }} />
                  <p className="muted">Đang tải danh sách vật phẩm từ database...</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '70px' }}>ID</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Icon ID</th>
                      <th>Tên Vật Phẩm</th>
                      <th>Loại & Tộc</th>
                      <th>Level / Sức Mạnh</th>
                      <th style={{ width: '220px' }}>Part & Avatar MariaDB</th>
                      <th>Giá Bán</th>
                      <th style={{ textAlign: 'right', width: '170px' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbRows.map((row) => {
                      const typeInfo = getTypeInfo(row.type);
                      const genderInfo = getGenderInfo(row.gender);
                      return (
                        <tr key={row.id}>
                          <td>
                            <code style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.95rem' }}>#{row.id}</code>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <ItemIcon iconId={row.icon_id} tempId={row.id} name={row.NAME} size={44} />
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  color: row.has_icon_file ? '#4ade80' : '#f87171',
                                  fontWeight: 700,
                                }}
                                title={row.has_icon_file ? 'File ảnh PNG có sẵn' : 'Chưa có file ảnh PNG trên disk'}
                              >
                                #{row.icon_id} {row.has_icon_file ? '✓' : '⚠️'}
                              </span>
                            </div>
                          </td>

                          <td>
                            {row.is_empty_slot ? (
                              <div>
                                <span style={{ fontSize: '0.74rem', background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.3)', fontWeight: 600 }}>
                                  📭 Ô ID Trống (Chưa đặt tên)
                                </span>
                                {row.export_suggestion && (
                                  <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8' }}>
                                      💡 Có sẵn ở Export:
                                    </div>
                                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>
                                      {row.export_suggestion.name}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                      Icon: #{row.export_suggestion.icon_id} · Type {row.export_suggestion.type} · Part: #{row.export_suggestion.part}
                                    </div>

                                    {row.export_suggestion.partConflict?.hasConflict && (() => {
                                      const newP = row.export_suggestion.partConflict.suggestedNewParts;
                                      const origP = newP?.originalParts;
                                      return (
                                        <div style={{ marginTop: '4px', padding: '4px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                                          <div style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 700 }}>
                                            ⚠️ Part #{origP?.part} đã bị trùng sprite trong DB!
                                          </div>
                                          <div style={{ fontSize: '0.72rem', color: '#fef08a', marginTop: '2px', fontWeight: 600 }}>
                                            ✨ Đề xuất tạo Part ID mới: <strong style={{ color: '#4ade80' }}>#{newP?.part}</strong> (H:{newP?.head} B:{newP?.body} L:{newP?.leg})
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>
                                    {row.NAME}
                                  </span>
                                  <button
                                    className="btn sm"
                                    type="button"
                                    onClick={() => openQuickTextModal(row)}
                                    style={{ padding: '1px 5px', fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                    title="Sửa nhanh Tên & Mô tả trực tiếp"
                                  >
                                    ✏️
                                  </button>
                                </div>
                                {row.description && (
                                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', maxWidth: '280px' }}>
                                    {row.description}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Đề xuất đồng bộ theo icon trùng khớp từ export */}
                            {row.iconSyncSuggestions && row.iconSyncSuggestions.length > 0 && (
                              <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8' }}>
                                  ✨ Trùng Icon #{row.icon_id} với Export:
                                </div>
                                {row.iconSyncSuggestions.map((sug) => (
                                  <div key={sug.exportId} style={{ marginTop: '4px', padding: '4px 6px', background: 'rgba(15, 23, 42, 0.65)', borderRadius: '4px' }}>
                                    <div style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 600 }}>
                                      Export #{sug.exportId}: <span style={{ color: '#4ade80' }}>{sug.exportName}</span>
                                    </div>
                                    {sug.exportDescription && (
                                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                                        "{sug.exportDescription}"
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                      <button
                                        className="btn sm"
                                        type="button"
                                        onClick={() => handleSyncFromDifferentExport(row.id, sug.exportId, 'name_desc_only')}
                                        disabled={busy}
                                        style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#6ee7b7', fontWeight: 600 }}
                                        title={`Đồng bộ Tên & Mô tả từ Export #${sug.exportId} vào DB #${row.id}`}
                                      >
                                        📥 Đồng bộ Tên & Mô tả
                                      </button>
                                      <button
                                        className="btn sm"
                                        type="button"
                                        onClick={() => handleSyncFromDifferentExport(row.id, sug.exportId, 'all', { useNewPartIds: Boolean(sug.partConflict?.hasConflict) })}
                                        disabled={busy}
                                        style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8', color: '#7dd3fc' }}
                                        title={`Đồng bộ toàn bộ thuộc tính từ Export #${sug.exportId} vào DB #${row.id}${sug.partConflict?.hasConflict ? ' (kèm tạo Part ID mới)' : ''}`}
                                      >
                                        ⚡ Đồng bộ Tất cả{sug.partConflict?.hasConflict ? ' & Tạo Part' : ''}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(255,255,255,0.06)',
                                  fontSize: '0.78rem',
                                }}
                              >
                                {typeInfo.icon} {typeInfo.label} ({row.type})
                              </span>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: genderInfo.bg,
                                  color: genderInfo.color,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                {genderInfo.label}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div style={{ fontSize: '0.85rem' }}>
                              <strong>Lv.{row.level}</strong>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                              SM: {Number(row.power_require || 0).toLocaleString('vi-VN')}
                            </div>
                          </td>

                          {/* Column Part with Full Icon Thumbnails & DB Realtime Audit */}
                          <td>
                            <PartThumbnailPreview
                              partPreview={row.part_preview}
                              head={row.head}
                              body={row.body}
                              leg={row.leg}
                              part={row.part}
                              partsMap={partsMap}
                              size={32}
                              showLabels={true}
                            />

                            {/* Part & Avatar DB Real-time Inspection Status */}
                            {row.part_avatar_audit && (
                              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {row.part_avatar_audit.hasPartMismatch ? (
                                  <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 600 }} title={row.part_avatar_audit.partDetails?.filter((p) => !p.matched).map((p) => p.issue).join('\n')}>
                                    🔴 Part DB: Sai frame sprite
                                  </span>
                                ) : row.part_avatar_audit.partStatus === 'MISSING_IN_DB' ? (
                                  <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fde047', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    🟡 Part DB: Thiếu part
                                  </span>
                                ) : row.part_avatar_audit.partStatus === 'MATCHED' && row.part_avatar_audit.partDetails?.length > 0 ? (
                                  <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600 }}>
                                    🟢 Part DB: Chuẩn khớp
                                  </span>
                                ) : null}

                                {row.part_avatar_audit.hasAvatarMismatch ? (
                                  <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 600 }} title={row.part_avatar_audit.avatarAudit?.issue}>
                                    🔴 Avatar DB: Lệch ID (#{row.part_avatar_audit.avatarAudit.dbAvatarId} ➔ Exp #{row.part_avatar_audit.avatarAudit.expAvatarId})
                                  </span>
                                ) : row.part_avatar_audit.avatarStatus === 'MISSING_IN_DB' ? (
                                  <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fde047', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    🟡 Avatar DB: Chưa mapping
                                  </span>
                                ) : row.part_avatar_audit.avatarStatus === 'MATCHED' && row.part_avatar_audit.avatarAudit?.dbAvatarId != null ? (
                                  <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 600 }}>
                                    👤 Avatar DB: #{row.part_avatar_audit.avatarAudit.dbAvatarId}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </td>

                          <td>
                            <div style={{ fontSize: '0.82rem', color: '#facc15' }}>
                              {Number(row.gold || 0) > 0 ? `${Number(row.gold).toLocaleString('vi-VN')} vàng` : '-'}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#38bdf8' }}>
                              {Number(row.gem || 0) > 0 ? `${Number(row.gem).toLocaleString('vi-VN')} ngọc` : '-'}
                            </div>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {row.export_suggestion && (
                                <button
                                  className="btn sm"
                                  type="button"
                                  onClick={() => handleSyncSingle(row.id)}
                                  disabled={busy}
                                  style={{ fontSize: '0.75rem', padding: '3px 8px', background: '#eab308', borderColor: '#eab308', color: '#0f172a', fontWeight: 700 }}
                                  title={`Nạp "${row.export_suggestion.name}" từ Export vào ô trống này (tuyệt đối không can thiệp cột part và head_avatar)`}
                                >
                                  ⚡ Nạp từ Export
                                </button>
                              )}
                              <button
                                className="btn sm"
                                type="button"
                                onClick={() => openQuickTextModal(row)}
                                style={{ fontSize: '0.75rem', padding: '3px 6px', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                                title="Sửa nhanh Tên & Mô tả trực tiếp"
                              >
                                ✏️ Tên/Mô tả
                              </button>
                              <button
                                className="btn sm primary"
                                type="button"
                                onClick={() => startEdit(row)}
                                title="Chỉnh sửa toàn bộ thông số vật phẩm"
                              >
                                Sửa
                              </button>
                              <button
                                className="btn sm"
                                type="button"
                                onClick={() => openDiagnosticModal(row.id)}
                                title="So khớp 3 tầng chuyên sâu với Export"
                                style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                              >
                                🔍 So khớp
                              </button>
                              <button
                                className="btn sm"
                                type="button"
                                onClick={() => startClone(row)}
                                title="Nhân bản item này sang item mới"
                              >
                                Clone
                              </button>
                              <button
                                className="btn sm"
                                type="button"
                                onClick={() => openDeleteModal(row)}
                                style={{ fontSize: '0.75rem', padding: '3px 6px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                                title="Xóa item này khỏi MariaDB (kèm Part và Head Avatar liên kết)"
                              >
                                🗑️ Xóa DB
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* BOTTOM PAGINATION BAR WITH JUMP-TO-PAGE */}
            <QuickPaginationBar
              total={dbTotal}
              limit={dbLimit}
              offset={dbOffset}
              onPageChange={setDbOffset}
              onLimitChange={(newLimit) => { setDbLimit(newLimit); setDbOffset(0); }}
              loading={dbLoading}
              label="vật phẩm database"
            />
          </div>
        </div>

      {/* ========================================================================= */}
      {/* TAB 3: DANH SÁCH BẢN DỰNG GIẢ (EXPORT/ITEM_TEMPLATE.TXT) */}
      {/* ========================================================================= */}
      <div className="card section" style={{ display: activeTab === 'export_view' ? 'block' : 'none' }}>
          {/* Sorting & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '14px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600 }}>🔢 Sắp xếp:</span>
              <select
                value={`${exportSortBy}_${exportSortDir}`}
                onChange={(e) => {
                  const [field, dir] = e.target.value.split('_');
                  setExportSortBy(field);
                  setExportSortDir(dir);
                  setExportOffset(0);
                }}
                style={{ padding: '5px 10px', fontSize: '0.85rem', background: '#1e293b', color: '#60a5fa', fontWeight: 600, border: '1px solid #3b82f6' }}
              >
                <option value="icon_id_asc">🖼️ Icon ID: Bé ➔ Lớn (Tăng dần)</option>
                <option value="icon_id_desc">🖼️ Icon ID: Lớn ➔ Bé (Giảm dần)</option>
                <option value="id_asc">🆔 Item ID: Bé ➔ Lớn (#0 ➔ ...)</option>
                <option value="id_desc">🆔 Item ID: Lớn ➔ Bé</option>
                <option value="type_asc">🏷️ Loại Type: Bé ➔ Lớn</option>
                <option value="type_desc">🏷️ Loại Type: Lớn ➔ Bé</option>
                <option value="name_asc">🔤 Tên: A ➔ Z</option>
                <option value="name_desc">🔤 Tên: Z ➔ A</option>
              </select>

              {/* Bộ lọc Loại (Type) */}
              <select
                value={exportType}
                onChange={(e) => {
                  setExportType(e.target.value);
                  setExportOffset(0);
                }}
                style={{
                  maxWidth: '150px',
                  padding: '5px 8px',
                  background: exportType !== 'all' ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                  color: exportType !== 'all' ? '#38bdf8' : '#e2e8f0',
                  fontWeight: 600,
                  border: exportType !== 'all' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                }}
                title="Lọc theo loại vật phẩm (Type)"
              >
                <option value="all">📦 Tất cả loại</option>
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.label} ({t.id})
                  </option>
                ))}
              </select>

              {/* Bộ lọc Tộc (Gender) */}
              <select
                value={exportGender}
                onChange={(e) => {
                  setExportGender(e.target.value);
                  setExportOffset(0);
                }}
                style={{
                  maxWidth: '130px',
                  padding: '5px 8px',
                  background: exportGender !== 'all' ? 'rgba(251, 191, 36, 0.2)' : undefined,
                  color: exportGender !== 'all' ? '#fbbf24' : undefined,
                  fontWeight: 600,
                  border: exportGender !== 'all' ? '1px solid #fbbf24' : undefined,
                }}
                title="Lọc theo tộc"
              >
                <option value="all">Tất cả tộc</option>
                {GENDERS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Icon:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={exportMinIcon}
                  onChange={(e) => { setExportMinIcon(e.target.value); setExportOffset(0); }}
                  style={{ width: '65px', padding: '3px 6px', fontSize: '0.82rem' }}
                />
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>➔</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={exportMaxIcon}
                  onChange={(e) => { setExportMaxIcon(e.target.value); setExportOffset(0); }}
                  style={{ width: '65px', padding: '3px 6px', fontSize: '0.82rem' }}
                />
              </div>

              {/* Lọc chính xác Icon ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>🎯 Icon chuẩn:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="VD: 16131"
                  value={exportExactIcon}
                  onChange={(e) => { setExportExactIcon(e.target.value); setExportOffset(0); }}
                  style={{ width: '85px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 700 }}
                  title="Lọc đúng Icon ID (ví dụ 16131)"
                />
              </div>

              {/* Lọc theo Part ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                <span style={{ fontSize: '0.82rem', color: '#facc15', fontWeight: 600 }}>🧩 Part:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="VD: 2006"
                  value={exportPartId}
                  onChange={(e) => { setExportPartId(e.target.value); setExportOffset(0); }}
                  style={{ width: '75px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#facc15', color: '#fde047', fontWeight: 700 }}
                  title="Lọc theo Part ID (Head, Body, Leg, Part)"
                />
                {exportPartId && (
                  <button
                    className="btn sm"
                    type="button"
                    onClick={() => { setExportPartId(''); setExportOffset(0); }}
                    style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                    title="Xóa lọc Part"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Lọc theo Head Avatar ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                <span style={{ fontSize: '0.82rem', color: '#c084fc', fontWeight: 600 }}>👤 Avatar:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="VD: 2006"
                  value={exportAvatarId}
                  onChange={(e) => { setExportAvatarId(e.target.value); setExportOffset(0); }}
                  style={{ width: '75px', padding: '3px 6px', fontSize: '0.82rem', borderColor: '#c084fc', color: '#d8b4fe', fontWeight: 700 }}
                  title="Lọc theo Avatar ID hoặc Head Avatar mapping"
                />
                {exportAvatarId && (
                  <button
                    className="btn sm"
                    type="button"
                    onClick={() => { setExportAvatarId(''); setExportOffset(0); }}
                    style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                    title="Xóa lọc Avatar"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Nút Mở Kho Part & Avatar Modal */}
              <button
                className="btn sm"
                type="button"
                onClick={() => { setCatalogModalOpen(true); setCatalogModalTab('parts'); }}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(192, 132, 252, 0.2) 100%)',
                  borderColor: '#facc15',
                  color: '#fef08a',
                  fontWeight: 700,
                }}
                title="Xem toàn bộ danh sách Part ID và Head Avatar có hình ảnh icon trực quan"
              >
                🎨 Kho Part & Avatar ({partsCatalog.length})
              </button>

              {/* Chọn nhanh theo dải ID Export */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px', background: 'rgba(56, 189, 248, 0.08)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>🔢 Dải ID Export:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Từ ID"
                  value={quickExpRangeStart}
                  onChange={(e) => setQuickExpRangeStart(e.target.value)}
                  style={{ width: '65px', padding: '2px 5px', fontSize: '0.8rem' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>➔</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Đến ID"
                  value={quickExpRangeEnd}
                  onChange={(e) => setQuickExpRangeEnd(e.target.value)}
                  style={{ width: '65px', padding: '2px 5px', fontSize: '0.8rem' }}
                />
                <button
                  className="btn sm"
                  type="button"
                  onClick={handleQuickSelectExportRange}
                  style={{ padding: '2px 8px', fontSize: '0.76rem', fontWeight: 700, background: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8', color: '#38bdf8' }}
                  title="Chọn nhanh dải ID này"
                >
                  ✓ Chọn dải
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="🔍 Tìm trong file export..."
                value={exportQ}
                onChange={(e) => setExportQ(e.target.value)}
                style={{ width: '200px', padding: '5px 8px' }}
              />
              <button className="btn sm" type="button" onClick={() => loadExportData()}>Tìm</button>
            </div>
          </div>

          {/* BATCH ACTION BAR KHI ĐÃ CHỌN VẬT PHẨM EXPORT */}
          {selectedExportIds.size > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '10px 16px',
                marginBottom: '12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(56, 189, 248, 0.2) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>📦</span>
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#f8fafc' }}>
                    Đã chọn <span style={{ color: '#ffffff', background: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>{selectedExportIds.size}</span> vật phẩm từ file Export
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#93c5fd', marginTop: '1px' }}>
                    Sẵn sàng nạp vào bảng <code>item_template</code> của Database đang chạy với dải ID chỉ định
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn sm primary"
                  type="button"
                  onClick={() => openImportModalForSelected()}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
                    borderColor: '#38bdf8',
                    color: '#ffffff',
                    fontWeight: 800,
                    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.5)',
                    padding: '6px 16px',
                    fontSize: '0.88rem',
                  }}
                  title="Nạp toàn bộ các item đã chọn vào Database với dải ID tùy chọn"
                >
                  📥 Nạp {selectedExportIds.size} Item Đã Chọn Vào DB...
                </button>

                <button
                  className="btn sm"
                  type="button"
                  onClick={() => setSelectedExportIds(new Set())}
                  style={{ fontSize: '0.8rem' }}
                  title="Bỏ chọn tất cả"
                >
                  ✕ Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {/* TOP PAGINATION BAR */}
          <QuickPaginationBar
            total={exportTotal}
            limit={exportLimit}
            offset={exportOffset}
            onPageChange={setExportOffset}
            onLimitChange={(newLimit) => { setExportLimit(newLimit); setExportOffset(0); }}
            loading={exportLoading}
            label="vật phẩm trong file export"
          />

          <div className="table-wrap" style={{ maxHeight: '720px', overflowY: 'auto', position: 'relative' }}>
            {exportLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.45)',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(1px)',
                }}
              >
                <div className="ui-spinner" />
              </div>
            )}
            {exportRows.length === 0 && !exportLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                Không tìm thấy vật phẩm nào trong file export.
              </div>
            ) : exportRows.length === 0 && exportLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="ui-spinner" style={{ margin: '0 auto 12px' }} />
                <p className="muted">Đang đọc dữ liệu từ file export/item_template.txt...</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '42px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        title="Chọn / Bỏ chọn tất cả trên trang này"
                        checked={exportRows.length > 0 && exportRows.every((r) => selectedExportIds.has(r.id))}
                        onChange={toggleSelectAllExportOnPage}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th style={{ width: '80px' }}>ID</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Icon ID</th>
                    <th>Tên Vật Phẩm</th>
                    <th>Mô Tả</th>
                    <th>Loại / Tộc</th>
                    <th style={{ width: '180px' }}>Part Đồ Họa</th>
                    <th>Giá Vàng / Ngọc</th>
                    <th style={{ textAlign: 'right', width: '140px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {exportRows.map((row) => {
                    const isSelected = selectedExportIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: isSelected ? 'rgba(59, 130, 246, 0.12)' : undefined,
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleExportSelect(row.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>

                        <td>
                          <code style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.95rem' }}>#{row.id}</code>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <ItemIcon iconId={row.icon_id} tempId={row.id} name={row.NAME} size={42} />
                          <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>
                            #{row.icon_id}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#f8fafc' }}>
                            {row.NAME}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '300px' }}>
                            {row.description || '-'}
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.82rem' }}>
                            {getTypeInfo(row.type).icon} {getTypeInfo(row.type).label} ({row.type}) · {getGenderInfo(row.gender).label}
                          </span>
                        </td>

                        {/* Part thumbnails in Export View */}
                        <td>
                          <PartThumbnailPreview
                            partPreview={row.part_preview}
                            head={row.head}
                            body={row.body}
                            leg={row.leg}
                            part={row.part}
                            partsMap={partsMap}
                            size={28}
                            showLabels={true}
                          />
                        </td>

                        <td>
                          <div style={{ fontSize: '0.8rem', color: '#facc15' }}>
                            {row.gold > 0 ? `${row.gold.toLocaleString('vi-VN')} vàng` : '-'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                            {row.gem > 0 ? `${row.gem.toLocaleString('vi-VN')} ngọc` : '-'}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn sm primary"
                            type="button"
                            onClick={() => openImportModalForSelected([row])}
                            disabled={busy}
                            title="Nạp item này vào MariaDB (Tùy chọn dải ID hoặc ID gốc)"
                          >
                            📥 Nạp vào DB
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* BOTTOM PAGINATION BAR */}
          <QuickPaginationBar
            total={exportTotal}
            limit={exportLimit}
            offset={exportOffset}
            onPageChange={setExportOffset}
            onLimitChange={(newLimit) => { setExportLimit(newLimit); setExportOffset(0); }}
            loading={exportLoading}
            label="vật phẩm trong file export"
          />
        </div>


      {/* ========================================================================= */}
      {/* DELETE ITEM MODAL (XÓA ITEM KÈM PART VÀ HEAD AVATAR) */}
      {/* ========================================================================= */}
      {deleteModalItem && (
        <div className="modal-backdrop" onClick={closeDeleteModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: deleteModalItem.isBatch ? '680px' : '620px',
              width: '95vw',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              {deleteModalItem.isBatch ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                    }}
                  >
                    🗑️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Xóa {deleteModalItem.ids.length} Vật Phẩm Đã Chọn Khỏi MariaDB</span>
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '2px' }}>
                      Đang chọn <strong style={{ color: '#f87171' }}>{deleteModalItem.ids.length} vật phẩm</strong> để xóa khỏi cơ sở dữ liệu
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ItemIcon iconId={deleteModalItem.icon_id} tempId={deleteModalItem.id} name={deleteModalItem.name} size={48} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🗑️ Xóa Vật Phẩm #{deleteModalItem.id} Khỏi MariaDB</span>
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '2px' }}>
                      Tên: <strong style={{ color: '#f8fafc' }}>{deleteModalItem.name}</strong> · Icon: <strong style={{ color: '#60a5fa' }}>#{deleteModalItem.icon_id}</strong>
                    </div>
                  </div>
                </div>
              )}
              <button className="btn sm" type="button" onClick={closeDeleteModal} disabled={isDeleting}>✖ Đóng</button>
            </div>

            {/* Warning Box */}
            <div style={{ margin: '16px 0', padding: '14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span>⚠️</span> {deleteModalItem.isBatch
                  ? `Bạn có chắc chắn muốn xóa ${deleteModalItem.ids.length} vật phẩm đã chọn khỏi MariaDB?`
                  : 'Bạn có chắc chắn muốn xóa vật phẩm này khỏi Database MariaDB?'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                {deleteModalItem.isBatch
                  ? `Hệ thống sẽ xóa các bản ghi trong bảng item_template (${deleteModalItem.ids.length} slot ID sẽ trở thành ô trống trong DB) và tự động đồng bộ lại Java server runtime.`
                  : `Hành động này sẽ xóa bản ghi trong bảng item_template (Slot ID #${deleteModalItem.id} sẽ trở thành ô trống trong DB) và tự động đồng bộ lại Java runtime.`}
              </div>
            </div>

            {/* If batch, show list of items */}
            {deleteModalItem.isBatch ? (
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#60a5fa', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📋 Danh sách {deleteModalItem.items?.length || deleteModalItem.ids.length} item sẽ bị xóa:</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {deleteModalItem.ids.slice(0, 10).map((id) => `#${id}`).join(', ')}{deleteModalItem.ids.length > 10 ? `... (+${deleteModalItem.ids.length - 10})` : ''}</span>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                  {deleteModalItem.items?.map((it) => (
                    <div
                      key={it.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ItemIcon iconId={it.icon_id} tempId={it.id} name={it.name} size={28} />
                        <strong style={{ color: '#60a5fa' }}>#{it.id}</strong>
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{it.name}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>(Icon #{it.icon_id})</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                        {it.part >= 0 && <span style={{ marginRight: '6px', color: '#fde047' }}>Part #{it.part}</span>}
                        {it.head >= 0 && <span style={{ color: '#38bdf8' }}>Head #{it.head}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Associated Part & Avatar Details Card for single item */
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#60a5fa', marginBottom: '8px' }}>
                  🧩 Dữ liệu Part Sprites & Head Avatar liên kết phát hiện:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.78rem' }}>
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>Part ID:</span>{' '}
                    <strong style={{ color: deleteModalItem.part >= 0 ? '#fde047' : '#94a3b8' }}>
                      {deleteModalItem.part >= 0 ? `#${deleteModalItem.part}` : 'Không (-1)'}
                    </strong>
                  </div>
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>Head Part:</span>{' '}
                    <strong style={{ color: deleteModalItem.head >= 0 ? '#38bdf8' : '#94a3b8' }}>
                      {deleteModalItem.head >= 0 ? `#${deleteModalItem.head}` : 'Không (-1)'}
                    </strong>
                  </div>
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>Body Part:</span>{' '}
                    <strong style={{ color: deleteModalItem.body >= 0 ? '#c084fc' : '#94a3b8' }}>
                      {deleteModalItem.body >= 0 ? `#${deleteModalItem.body}` : 'Không (-1)'}
                    </strong>
                  </div>
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                    <span style={{ color: '#94a3b8' }}>Leg Part:</span>{' '}
                    <strong style={{ color: deleteModalItem.leg >= 0 ? '#f472b6' : '#94a3b8' }}>
                      {deleteModalItem.leg >= 0 ? `#${deleteModalItem.leg}` : 'Không (-1)'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Options Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#f8fafc', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deletePartsChecked}
                  onChange={(e) => setDeletePartsChecked(e.target.checked)}
                />
                <span>
                  🧩 <strong>Xóa luôn các Part đồ họa liên quan trong bảng <code>part</code></strong> (Tự động cập nhật binary <code>data/update_data/part</code>)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#f8fafc', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deleteHeadAvatarChecked}
                  onChange={(e) => setDeleteHeadAvatarChecked(e.target.checked)}
                />
                <span>
                  👤 <strong>Xóa mapping Head Avatar liên quan trong bảng <code>head_avatar</code></strong>
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#fde047', cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={deleteForceChecked}
                  onChange={(e) => setDeleteForceChecked(e.target.checked)}
                />
                <span>
                  ⚡ Bắt buộc xóa Part/Avatar ngay cả khi có item khác đang dùng chung ID Part này
                </span>
              </label>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              <button className="btn" type="button" onClick={closeDeleteModal} disabled={isDeleting}>
                Hủy bỏ
              </button>
              <button
                className="btn sm"
                type="button"
                onClick={confirmDeleteItemFromDb}
                disabled={isDeleting}
                style={{
                  padding: '8px 18px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  borderColor: '#ef4444',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
              >
                {isDeleting
                  ? 'Đang xóa...'
                  : deleteModalItem.isBatch
                  ? `🗑️ Xác Nhận Xóa ${deleteModalItem.ids.length} Item Khỏi MariaDB`
                  : '🗑️ Xác Nhận Xóa Khỏi Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IMPORT EXPORT RANGE TO DB MODAL (NẠP DẢI VẬT PHẨM EXPORT VÀO DB) */}
      {/* ========================================================================= */}
      {importModal && (
        <div className="modal-backdrop" onClick={() => !isImportingToDb && setImportModal(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '840px',
              width: '95vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              boxShadow: '0 25px 70px rgba(0,0,0,0.85)',
              borderRadius: '16px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}
                >
                  📥
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Nạp {importModal.items.length} Vật Phẩm Export Vào Database</span>
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                    Nạp dữ liệu từ file <code style={{ color: '#fbbf24' }}>export/item_template.txt</code> vào bảng <code style={{ color: '#60a5fa' }}>item_template</code> của Database đang chạy
                  </div>
                </div>
              </div>
              <button className="btn sm" type="button" onClick={() => setImportModal(null)} disabled={isImportingToDb}>
                ✖ Đóng
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Mode Switcher */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
                  🎯 Chọn Chế Độ Gán ID Database:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setImportModal((prev) => ({ ...prev, mode: 'range' }))}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: importModal.mode === 'range' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255,255,255,0.03)',
                      border: importModal.mode === 'range' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                      color: importModal.mode === 'range' ? '#f8fafc' : '#94a3b8',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: importModal.mode === 'range' ? '#38bdf8' : '#e2e8f0', marginBottom: '3px' }}>
                      ✨ 1. Nạp vào dải ID tùy chọn
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Chỉ định ID bắt đầu & kết thúc trong DB (VD: từ 1891 đến 1900).
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportModal((prev) => ({ ...prev, mode: 'original' }))}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: importModal.mode === 'original' ? 'rgba(251, 191, 36, 0.18)' : 'rgba(255,255,255,0.03)',
                      border: importModal.mode === 'original' ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                      color: importModal.mode === 'original' ? '#f8fafc' : '#94a3b8',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: importModal.mode === 'original' ? '#fbbf24' : '#e2e8f0', marginBottom: '3px' }}>
                      🔄 2. Giữ nguyên ID Export gốc
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Nạp đúng ID tương ứng như trong file Export (#{importModal.minExpId} ➔ #{importModal.maxExpId}).
                    </div>
                  </button>
                </div>
              </div>

              {/* Range Configuration Form */}
              {importModal.mode === 'range' ? (
                <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                    🔢 Cấu Hình Dải ID Database Đích (Từ ID ... Đến ID ...):
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Từ ID Database (Start ID):</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="VD: 1891"
                        value={importModal.startDbId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = Number(val);
                          setImportModal((prev) => ({
                            ...prev,
                            startDbId: val,
                            endDbId: Number.isInteger(num) && num >= 0 ? String(num + prev.items.length - 1) : prev.endDbId,
                          }));
                        }}
                        style={{ width: '130px', padding: '8px 10px', fontSize: '0.95rem', fontWeight: 700, borderColor: '#38bdf8', color: '#38bdf8' }}
                      />
                    </div>

                    <div style={{ fontSize: '1.2rem', color: '#94a3b8', marginTop: '18px' }}>➔</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Đến ID Database (End ID):</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="VD: 1900"
                        value={importModal.endDbId}
                        onChange={(e) => {
                          const endVal = e.target.value;
                          const endNum = Number(endVal);
                          setImportModal((prev) => ({
                            ...prev,
                            endDbId: endVal,
                            startDbId: Number.isInteger(endNum) && endNum >= prev.items.length - 1 ? String(endNum - prev.items.length + 1) : prev.startDbId,
                          }));
                        }}
                        style={{ width: '130px', padding: '8px 10px', fontSize: '0.95rem', fontWeight: 700, borderColor: '#38bdf8', color: '#38bdf8' }}
                      />
                    </div>

                    <div style={{ marginTop: '18px', padding: '6px 12px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '6px', fontSize: '0.82rem', color: '#93c5fd', fontWeight: 600 }}>
                      ⚡ Tổng cộng: <strong>{importModal.items.length}</strong> ID liên tục
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.5' }}>
                    💡 <em>Vật phẩm export thứ 1 sẽ được nạp vào DB ID <strong>#{importModal.startDbId}</strong>, thứ 2 vào <strong>#{Number(importModal.startDbId) + 1}</strong>, ..., thứ {importModal.items.length} vào <strong>#{importModal.endDbId}</strong>.</em>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(251, 191, 36, 0.08)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                  <div style={{ fontSize: '0.86rem', color: '#fef08a', fontWeight: 600 }}>
                    🔄 Sẽ nạp đúng từng ID tương ứng từ file Export vào Database:
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>
                    Các vật phẩm đã chọn có ID Export từ <strong>#{importModal.minExpId}</strong> đến <strong>#{importModal.maxExpId}</strong> sẽ được nạp đúng vào các ô ID <strong>#{importModal.minExpId} ➔ #{importModal.maxExpId}</strong> trong Database MariaDB.
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#60a5fa' }}>
                    📋 Bảng Xem Trước Ánh Xạ ({importModal.items.length} vật phẩm):
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                    Export ➔ Target DB ID
                  </span>
                </div>

                <div style={{ maxHeight: '220px', overflowY: 'auto', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table style={{ width: '100%', fontSize: '0.82rem', margin: 0 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '80px' }}>ID Export</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>Icon</th>
                        <th>Tên Vật Phẩm Export</th>
                        <th>Loại / Tộc</th>
                        <th style={{ width: '40px', textAlign: 'center' }}>➔</th>
                        <th style={{ width: '120px', textAlign: 'right' }}>ID DB Đích</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importModal.items.map((it, idx) => {
                        const targetDbId = importModal.mode === 'original'
                          ? it.id
                          : Number(importModal.startDbId) + idx;
                        return (
                          <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>{idx + 1}</td>
                            <td>
                              <code style={{ color: '#fbbf24', fontWeight: 700 }}>#{it.id}</code>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <ItemIcon iconId={it.icon_id} size={24} />
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{it.NAME || it.name}</div>
                            </td>
                            <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                              {getTypeInfo(it.type).icon} {getTypeInfo(it.type).label} · {getGenderInfo(it.gender).short}
                            </td>
                            <td style={{ textAlign: 'center', color: '#38bdf8', fontWeight: 700 }}>➔</td>
                            <td style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(56, 189, 248, 0.2)',
                                  border: '1px solid #38bdf8',
                                  color: '#38bdf8',
                                  fontWeight: 800,
                                  fontSize: '0.88rem',
                                }}
                              >
                                #{targetDbId}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Safety Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '6px', fontSize: '0.76rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🛡️</span>
                  <span><strong>Bảo toàn 100%:</strong> Tuyệt đối không can thiệp vào cột <code>part</code> và bảng <code>head_avatar</code> trong DB.</span>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', fontSize: '0.76rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚡</span>
                  <span><strong>Tự động Reload:</strong> Gửi tín hiệu đồng bộ để server Java nạp item mới ngay lập tức.</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
              <button className="btn" type="button" onClick={() => setImportModal(null)} disabled={isImportingToDb}>
                Hủy bỏ
              </button>
              <button
                className="btn sm primary"
                type="button"
                onClick={handleConfirmImportToDb}
                disabled={isImportingToDb || (importModal.mode === 'range' && (!importModal.startDbId || isNaN(Number(importModal.startDbId))))}
                style={{
                  padding: '8px 20px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
                  borderColor: '#38bdf8',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.45)',
                }}
              >
                {isImportingToDb
                  ? 'Đang nạp vào DB...'
                  : `🚀 Xác Nhận Nạp ${importModal.items.length} Vật Phẩm Vào DB`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PART & HEAD AVATAR VISUAL CATALOG MODAL (KHO PART & AVATAR ĐỒ HỌA TRỰC QUAN) */}
      {/* ========================================================================= */}
      {catalogModalOpen && (

        <div className="modal-backdrop" onClick={() => setCatalogModalOpen(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '1180px',
              width: '96vw',
              height: '88vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              padding: '20px',
              borderRadius: '16px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🎨</span>
                  <span>Kho Lưu Trữ Part Đồ Họa & Head Avatar Trực Quan</span>
                </h3>
                <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '4px' }}>
                  Xem trước toàn bộ hình ảnh icon sprite của <strong>{partsCatalog.length.toLocaleString('vi-VN')} Part</strong> và <strong>{avatarsCatalog.length.toLocaleString('vi-VN')} Head Avatar</strong>. Bấm vào mục bất kỳ để tự động áp dụng bộ lọc!
                </div>
              </div>
              <button className="btn" type="button" onClick={() => setCatalogModalOpen(false)} style={{ padding: '6px 14px' }}>
                ✖ Đóng
              </button>
            </div>

            {/* Navigation Tabs in Modal */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <button
                className={`btn ${catalogModalTab === 'parts' ? 'primary' : ''}`}
                type="button"
                onClick={() => { setCatalogModalTab('parts'); setCatalogTypeFilter('all'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '8px 16px',
                  background: catalogModalTab === 'parts' ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : undefined,
                  borderColor: catalogModalTab === 'parts' ? '#eab308' : undefined,
                  color: catalogModalTab === 'parts' ? '#0f172a' : undefined,
                }}
              >
                <span>🧩</span> Danh Sách Part Đồ Họa ({partsCatalog.length.toLocaleString('vi-VN')})
              </button>
              <button
                className={`btn ${catalogModalTab === 'avatars' ? 'primary' : ''}`}
                type="button"
                onClick={() => setCatalogModalTab('avatars')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '8px 16px',
                  background: catalogModalTab === 'avatars' ? 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)' : undefined,
                  borderColor: catalogModalTab === 'avatars' ? '#c084fc' : undefined,
                  color: catalogModalTab === 'avatars' ? '#ffffff' : undefined,
                }}
              >
                <span>👤</span> Danh Sách Head Avatar ({avatarsCatalog.length.toLocaleString('vi-VN')})
              </button>
            </div>

            {/* Search & Sub-filters Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                margin: '12px 0',
              }}
            >
              {/* Type pills for Part tab */}
              {catalogModalTab === 'parts' ? (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Bộ phận:</span>
                  <button
                    className={`btn sm ${catalogTypeFilter === 'all' ? 'primary' : ''}`}
                    type="button"
                    onClick={() => setCatalogTypeFilter('all')}
                  >
                    Tất cả ({partsCatalog.length})
                  </button>
                  <button
                    className={`btn sm ${catalogTypeFilter === 0 ? 'primary' : ''}`}
                    type="button"
                    onClick={() => setCatalogTypeFilter(0)}
                    style={{ borderColor: '#38bdf8', color: catalogTypeFilter === 0 ? undefined : '#38bdf8' }}
                  >
                    🧢 Đầu (Head - Type 0) ({partsCatalog.filter((p) => p.type === 0).length})
                  </button>
                  <button
                    className={`btn sm ${catalogTypeFilter === 1 ? 'primary' : ''}`}
                    type="button"
                    onClick={() => setCatalogTypeFilter(1)}
                    style={{ borderColor: '#c084fc', color: catalogTypeFilter === 1 ? undefined : '#c084fc' }}
                  >
                    🥋 Thân (Body - Type 1) ({partsCatalog.filter((p) => p.type === 1).length})
                  </button>
                  <button
                    className={`btn sm ${catalogTypeFilter === 2 ? 'primary' : ''}`}
                    type="button"
                    onClick={() => setCatalogTypeFilter(2)}
                    style={{ borderColor: '#f472b6', color: catalogTypeFilter === 2 ? undefined : '#f472b6' }}
                  >
                    👖 Chân (Leg - Type 2) ({partsCatalog.filter((p) => p.type === 2).length})
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 600 }}>
                  👤 Bảng ánh xạ Head ID sang Icon Avatar đại diện trong game
                </div>
              )}

              {/* Search box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  placeholder={catalogModalTab === 'parts' ? '🔍 Tìm Part ID, Icon ID...' : '🔍 Tìm Avatar ID, Head ID...'}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  style={{ width: '220px', padding: '5px 10px', fontSize: '0.84rem' }}
                />
                {catalogSearch && (
                  <button className="btn sm" type="button" onClick={() => setCatalogSearch('')} style={{ padding: '4px 8px' }}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Visual Catalog Grid */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 4px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px',
                alignContent: 'start',
              }}
            >
              {catalogModalTab === 'parts' ? (
                (() => {
                  const filtered = partsCatalog.filter((p) => {
                    if (catalogTypeFilter !== 'all' && p.type !== Number(catalogTypeFilter)) return false;
                    if (catalogSearch.trim()) {
                      const q = catalogSearch.trim().toLowerCase();
                      const matchId = String(p.id).includes(q);
                      const matchIcon = String(p.mainIcon).includes(q);
                      const matchType = (p.type === 0 ? 'head dau' : p.type === 1 ? 'body than' : p.type === 2 ? 'leg chan' : '').includes(q);
                      return matchId || matchIcon || matchType;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                        Không tìm thấy Part nào phù hợp với bộ lọc tìm kiếm.
                      </div>
                    );
                  }

                  return filtered.map((part) => {
                    const isHead = part.type === 0;
                    const isBody = part.type === 1;
                    const isLeg = part.type === 2;
                    const typeColor = isHead ? '#38bdf8' : isBody ? '#c084fc' : isLeg ? '#f472b6' : '#facc15';
                    const typeLabel = isHead ? '🧢 Đầu (Head)' : isBody ? '🥋 Thân (Body)' : isLeg ? '👖 Chân (Leg)' : '🧩 Khác';

                    return (
                      <div
                        key={`${part.id}_${part.type}`}
                        onClick={() => handleSelectPartFromCatalog(part.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${typeColor}40`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = typeColor;
                          e.currentTarget.style.background = `${typeColor}15`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = `${typeColor}40`;
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        }}
                        title={`Bấm để lọc trang bị sử dụng Part #${part.id} (${typeLabel})`}
                      >
                        {/* Top Type & ID Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', background: `${typeColor}20`, color: typeColor, fontWeight: 700 }}>
                            {isHead ? 'HEAD 0' : isBody ? 'BODY 1' : isLeg ? 'LEG 2' : 'PART'}
                          </span>
                          <code style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
                            #{part.id}
                          </code>
                        </div>

                        {/* Center Icon Sprite */}
                        <div style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginBottom: '8px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {part.mainIcon > 0 ? (
                            <ItemIcon iconId={part.mainIcon} size={50} />
                          ) : (
                            <div style={{ fontSize: '1.6rem' }}>{isHead ? '🧢' : isBody ? '🥋' : '👖'}</div>
                          )}
                        </div>

                        {/* Bottom Info & Select Button */}
                        <div style={{ width: '100%', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                            Icon <strong style={{ color: '#60a5fa' }}>#{part.mainIcon}</strong>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px' }}>
                            {part.framesCount || part.frames?.length || 0} frames
                          </div>
                          <button
                            className="btn sm"
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelectPartFromCatalog(part.id); }}
                            style={{
                              marginTop: '6px',
                              width: '100%',
                              padding: '3px 0',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: `${typeColor}25`,
                              borderColor: typeColor,
                              color: typeColor,
                            }}
                          >
                            🔍 Lọc Part #{part.id}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                (() => {
                  const filtered = avatarsCatalog.filter((a) => {
                    if (catalogSearch.trim()) {
                      const q = catalogSearch.trim().toLowerCase();
                      const matchAvatar = String(a.avatarId).includes(q);
                      const matchHead = String(a.headId).includes(q);
                      const matchIcon = String(a.headMainIcon).includes(q);
                      return matchAvatar || matchHead || matchIcon;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                        Không tìm thấy Head Avatar nào phù hợp với bộ lọc tìm kiếm.
                      </div>
                    );
                  }

                  return filtered.map((avatar) => {
                    return (
                      <div
                        key={`${avatar.headId}_${avatar.avatarId}`}
                        onClick={() => handleSelectAvatarFromCatalog(avatar.avatarId)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(192, 132, 252, 0.35)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = '#c084fc';
                          e.currentTarget.style.background = 'rgba(192, 132, 252, 0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.35)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        }}
                        title={`Bấm để lọc trang bị sử dụng Avatar #${avatar.avatarId} (Head #${avatar.headId})`}
                      >
                        {/* Top Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', background: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', fontWeight: 700 }}>
                            AVATAR
                          </span>
                          <code style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
                            #{avatar.avatarId}
                          </code>
                        </div>

                        {/* Center Icon Sprite */}
                        <div style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginBottom: '8px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ItemIcon iconId={avatar.avatarId} size={52} isAvatar={true} />
                        </div>

                        {/* Bottom Info & Select Button */}
                        <div style={{ width: '100%', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 600 }}>
                            🧢 Head Part <strong>#{avatar.headId}</strong>
                          </div>
                          {avatar.headMainIcon > 0 && (
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>
                              Sprite #{avatar.headMainIcon}
                            </div>
                          )}
                          <button
                            className="btn sm"
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelectAvatarFromCatalog(avatar.avatarId); }}
                            style={{
                              marginTop: '6px',
                              width: '100%',
                              padding: '3px 0',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(192, 132, 252, 0.2)',
                              borderColor: '#c084fc',
                              color: '#d8b4fe',
                            }}
                          >
                            🔍 Lọc Avatar #{avatar.avatarId}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                💡 Click trực tiếp vào bất kỳ ô Part/Avatar nào để áp dụng bộ lọc vào danh sách trang bị đang xem.
              </div>
              <button className="btn sm" type="button" onClick={() => setCatalogModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
