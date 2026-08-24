import ItemIcon from './ItemIcon';
import { formatOptionsString } from '../utils/shopItemOrder';

export default function ShopOrderPreview({
  rows = [],
  trailing = [],
  hidden = [],
  title = 'Xem trước thứ tự',
  genderLabel,
  showTrailing = true,
}) {
  if (!rows.length && !trailing.length && !hidden.length) {
    return <p className="muted shop-order-preview-empty">Chưa có dòng nào.</p>;
  }

  function raceBadge(it) {
    if (!genderLabel || it?.item_gender == null) return null;
    return <span className="badge shop-order-race">{genderLabel(it.item_gender)}</span>;
  }

  return (
    <div className="shop-order-preview">
      <h5>{title}</h5>
      <ul className="shop-order-preview-list">
        {rows.map((row, i) => (
          <li
            key={`${row.line}-${i}`}
            className={`shop-order-preview-row ${row.matched ? 'matched' : row.willAdd ? 'will-add' : 'unknown'}`}
          >
            <span className="shop-order-preview-idx">{row.fileIndex ?? i + 1}</span>
            {row.item ? (
              <ItemIcon
                iconId={row.item.icon_id}
                iconSpec={row.item.icon_spec}
                tempId={row.item.temp_id}
                name={row.item.item_name}
                size={32}
              />
            ) : (
              <span className="item-icon item-icon-empty shop-order-preview-missing" style={{ width: 32, height: 32 }}>?</span>
            )}
                      <span className="shop-order-preview-name">{row.line}</span>
                      {row.item && raceBadge(row.item)}
                      {row.item?.options?.length > 0 && (
                        <span className="muted shop-order-opt-preview" title="Option sau import">
                          {formatOptionsString(row.item.options)}
                        </span>
                      )}
            {row.pendingTemplate && <span className="badge">Đang tra…</span>}
            {row.willAdd && <span className="badge ok">+ Thêm mới</span>}
            {!row.matched && !row.willAdd && row.missingTemplate && (
              <span className="badge bad">Không có template</span>
            )}
            {!row.matched && !row.willAdd && !row.missingTemplate && (
              <span className="badge bad">Không khớp</span>
            )}
          </li>
        ))}
        {showTrailing && trailing.length > 0 && (
          <>
            <li className="shop-order-preview-divider muted">— Giữ ở cuối ({trailing.length}) —</li>
            {trailing.map((it) => (
              <li key={`tail-${it.id}`} className="shop-order-preview-row trailing">
                <span className="shop-order-preview-idx">·</span>
                <ItemIcon
                  iconId={it.icon_id}
                  iconSpec={it.icon_spec}
                  tempId={it.temp_id}
                  name={it.item_name}
                  size={32}
                />
                <span className="shop-order-preview-name">{it.item_name || `#${it.temp_id}`}</span>
                {raceBadge(it)}
              </li>
            ))}
          </>
        )}
        {hidden.length > 0 && (
          <>
            <li className="shop-order-preview-divider muted">— Tộc khác · giữ nguyên ({hidden.length}) —</li>
            {hidden.map((it) => (
              <li key={`hid-${it.id}`} className="shop-order-preview-row hidden-race">
                <span className="shop-order-preview-idx">·</span>
                <ItemIcon
                  iconId={it.icon_id}
                  iconSpec={it.icon_spec}
                  tempId={it.temp_id}
                  name={it.item_name}
                  size={32}
                />
                <span className="shop-order-preview-name">{it.item_name || `#${it.temp_id}`}</span>
                {raceBadge(it)}
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
