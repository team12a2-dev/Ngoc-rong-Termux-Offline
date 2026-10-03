import { useEffect, useMemo, useState } from 'react';

const ENV_ICON_BASE = import.meta.env.VITE_ITEM_ICON_BASE || '';

function resolveIconUrl(iconId, tempId) {
  const configuredBase = import.meta.env.VITE_API_URL || '';
  const apiBase = configuredBase.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
  const iconNum = Number(iconId);
  const tempNum = Number(tempId);
  const itemIconUrl = Number.isFinite(tempNum) && tempNum >= 0
    ? `${apiBase}/api/v1/assets/items/${tempNum}/icon.png`
    : null;
  if (Number.isFinite(iconNum) && iconNum >= 0) {
    if (ENV_ICON_BASE) return `${ENV_ICON_BASE.replace(/\/$/, '')}/${iconNum}.png`;
    return `${apiBase}/api/v1/assets/icons/${iconNum}.png`;
  }
  return itemIconUrl;
}

/** Icon item / Avatar — ưu tiên icon_id, fallback tra DB theo temp_id */
export default function ItemIcon({ iconId, iconSpec, tempId, name, size = 40, isAvatar = false, showLabel = false }) {
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

  const numLabel = rawIcon ?? tempId ?? '?';
  const tempNum = Number(tempId);

  // Xử lý icon tiền tệ đặc biệt trong NRO (-1: Vàng, -2: Ngọc xanh, -3: Hồng ngọc)
  if (Number.isFinite(tempNum) && tempNum < 0) {
    let currencyEmoji = '🪙';
    let currencyBg = 'radial-gradient(circle, rgba(234, 179, 8, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)';
    let currencyBorder = '1px solid rgba(234, 179, 8, 0.6)';
    let currencyColor = '#facc15';
    let currencyTitle = name || 'Vàng';

    if (tempNum === -2) {
      currencyEmoji = '💎';
      currencyBg = 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)';
      currencyBorder = '1px solid rgba(16, 185, 129, 0.6)';
      currencyColor = '#34d399';
      currencyTitle = name || 'Ngọc xanh';
    } else if (tempNum === -3) {
      currencyEmoji = '🔴';
      currencyBg = 'radial-gradient(circle, rgba(244, 63, 94, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)';
      currencyBorder = '1px solid rgba(244, 63, 94, 0.6)';
      currencyColor = '#fb7185';
      currencyTitle = name || 'Hồng ngọc';
    }

    return (
      <div className="item-icon-wrapper" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span
          className="item-icon"
          style={{
            width: size,
            height: size,
            borderRadius: '8px',
            background: currencyBg,
            border: currencyBorder,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${Math.max(14, Math.floor(size * 0.55))}px`,
            boxShadow: `0 0 10px ${currencyBorder.replace('1px solid ', '')}`,
            userSelect: 'none',
          }}
          title={currencyTitle}
        >
          {currencyEmoji}
        </span>
        {showLabel && <small style={{ fontSize: '0.75rem', color: currencyColor, fontWeight: 700 }}>#{tempNum}</small>}
      </div>
    );
  }

  if (!src) {
    return (
      <div className="item-icon-wrapper" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
        <span
          className={`item-icon item-icon-empty ${isAvatar ? 'is-avatar' : ''}`}
          style={{ width: size, height: size, borderRadius: isAvatar ? '50%' : '6px' }}
          title={name || (tempId != null ? `#${tempId}` : 'Chưa có icon')}
        >
          {isAvatar ? '👤' : '?'}
        </span>
        {showLabel && <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>#{numLabel}</small>}
      </div>
    );
  }

  if (!failed) {
    return (
      <div className="item-icon-wrapper" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <img
          className={`item-icon ${isAvatar ? 'is-avatar' : ''}`}
          src={src}
          alt={name || (tempId != null ? `#${tempId}` : 'icon')}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{
            objectFit: 'contain',
            borderRadius: isAvatar ? '50%' : '6px',
            border: isAvatar ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(0,0,0,0.3)',
          }}
          title={name ? `${name} (Icon #${numLabel})` : `Icon #${numLabel}`}
          onError={() => {
            const tempNum = Number(tempId);
            if (!useTempFallback && Number.isFinite(tempNum) && tempNum > 0) {
              setUseTempFallback(true);
            } else {
              setFailed(true);
            }
          }}
        />
        {showLabel && <small style={{ fontSize: '0.75rem', color: '#60a5fa' }}>#{numLabel}</small>}
      </div>
    );
  }

  return (
    <div className="item-icon-wrapper" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div
        className={`item-icon item-icon-fallback ${isAvatar ? 'is-avatar' : ''}`}
        style={{
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: isAvatar ? '50%' : '6px',
          border: isAvatar ? '2px dashed #a78bfa' : '1px dashed rgba(255,255,255,0.3)',
          background: isAvatar ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)',
          color: isAvatar ? '#c4b5fd' : '#cbd5e1',
          padding: '2px',
          textAlign: 'center',
        }}
        title={`Chưa có file ảnh PNG trong data/icon/ (ID: #${numLabel})`}
      >
        <span style={{ fontSize: size > 40 ? '1.1rem' : '0.8rem', lineHeight: 1 }}>{isAvatar ? '👤' : '📦'}</span>
        <span style={{ fontSize: size > 40 ? '0.7rem' : '0.62rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
          #{numLabel}
        </span>
      </div>
      {showLabel && <small style={{ fontSize: '0.72rem', color: '#94a3b8' }}>#{numLabel} (mod)</small>}
    </div>
  );
}
