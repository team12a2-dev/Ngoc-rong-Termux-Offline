import { useEffect, useMemo, useState } from 'react';

const ENV_ICON_BASE = import.meta.env.VITE_ITEM_ICON_BASE || '';

function resolveIconUrl(iconId, tempId) {
  const configuredBase = import.meta.env.VITE_API_URL || '';
  const apiBase = configuredBase.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
  const iconNum = Number(iconId);
  const tempNum = Number(tempId);
  const itemIconUrl = Number.isFinite(tempNum) && tempNum > 0
    ? `${apiBase}/api/v1/assets/items/${tempNum}/icon.png`
    : null;
  if (Number.isFinite(iconNum) && iconNum > 0) {
    if (ENV_ICON_BASE) return `${ENV_ICON_BASE.replace(/\/$/, '')}/${iconNum}.png`;
    return `${apiBase}/api/v1/assets/icons/${iconNum}.png`;
  }
  return itemIconUrl;
}

/** Icon item — ưu tiên icon_id, fallback tra DB theo temp_id */
export default function ItemIcon({ iconId, iconSpec, tempId, name, size = 40 }) {
  const rawIcon = iconSpec > 0 ? iconSpec : iconId;
  const [useTempFallback, setUseTempFallback] = useState(false);
  const src = useMemo(() => {
    if (useTempFallback) return resolveIconUrl(null, tempId);
    return resolveIconUrl(rawIcon, tempId);
  }, [rawIcon, tempId, useTempFallback]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setUseTempFallback(false);
  }, [rawIcon, tempId, iconSpec]);

  if (!src) {
    return (
      <span className="item-icon item-icon-empty" style={{ width: size, height: size }} title={name || (tempId != null ? `#${tempId}` : 'No icon')}>
        ?
      </span>
    );
  }

  if (!failed) {
    return (
      <img
        className="item-icon"
        src={src}
        alt={name || (tempId != null ? `#${tempId}` : 'item')}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        title={name || (tempId != null ? `#${tempId}` : '')}
        onError={() => {
          const tempNum = Number(tempId);
          if (!useTempFallback && Number.isFinite(tempNum) && tempNum > 0) {
            setUseTempFallback(true);
          } else {
            setFailed(true);
          }
        }}
      />
    );
  }

  return (
    <span
      className="item-icon item-icon-fallback"
      style={{ width: size, height: size }}
      title={name || (tempId != null ? `#${tempId}` : 'icon error')}
    >
      <small>{tempId ?? rawIcon ?? '?'}</small>
    </span>
  );
}
