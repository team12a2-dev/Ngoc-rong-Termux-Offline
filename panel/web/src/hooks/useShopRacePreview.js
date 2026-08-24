import { useCallback, useEffect, useState } from 'react';
import { getShopRacePreview, setShopRacePreview } from '../shopRacePreview';

/** Bộ lọc tộc dùng chung (sidebar badge + shop editor). */
export function useShopRacePreview() {
  const [race, setRaceState] = useState(() => getShopRacePreview());

  useEffect(() => {
    function onChange(e) {
      setRaceState(normalizeFromEvent(e));
    }
    window.addEventListener('shop-race-preview-changed', onChange);
    return () => window.removeEventListener('shop-race-preview-changed', onChange);
  }, []);

  const setRace = useCallback((value) => {
    setRaceState(setShopRacePreview(value));
  }, []);

  return [race, setRace];
}

function normalizeFromEvent(e) {
  if (e && 'detail' in e) return e.detail ?? '';
  return getShopRacePreview();
}
