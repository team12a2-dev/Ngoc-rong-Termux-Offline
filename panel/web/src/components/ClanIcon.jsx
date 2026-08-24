import { useMemo, useState } from 'react';

const apiBase = () => import.meta.env.VITE_API_URL || '';

/** Icon cờ bang — img_id trỏ flag_bag, icon thật từ data/icon/x4 */
export default function ClanIcon({ imgId, iconId, clanId, name, size = 48 }) {
  const src = useMemo(() => {
    const base = apiBase();
    if (iconId != null && Number(iconId) >= 0) {
      return `${base}/api/v1/assets/icons/${iconId}.png`;
    }
    if (clanId != null) {
      return `${base}/api/v1/assets/clans/${clanId}/icon.png`;
    }
    const flagId = imgId ?? 0;
    return `${base}/api/v1/assets/clan-flags/${flagId}/icon.png`;
  }, [imgId, iconId, clanId]);

  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="clan-icon clan-icon-fallback" style={{ width: size, height: size }} title={name || 'Cờ bang'}>
        🏴
      </span>
    );
  }

  return (
    <img
      className="clan-icon"
      src={src}
      alt={name || 'Cờ bang hội'}
      width={size}
      height={size}
      loading="lazy"
      title={name || 'Cờ bang hội'}
      onError={() => setFailed(true)}
    />
  );
}
