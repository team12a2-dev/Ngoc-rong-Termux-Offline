/** Lưu bộ lọc «xem shop như player» — đồng bộ Layout + ShopTabEditor */
const STORAGE_KEY = 'nro_panel_shop_race_preview';
const VALID = new Set(['', '0', '1', '2']);

export function normalizeShopRacePreview(raw) {
  const v = raw == null ? '' : String(raw);
  return VALID.has(v) ? v : '';
}

export function getShopRacePreview() {
  try {
    return normalizeShopRacePreview(localStorage.getItem(STORAGE_KEY));
  } catch {
    return '';
  }
}

export function setShopRacePreview(value) {
  const v = normalizeShopRacePreview(value);
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new CustomEvent('shop-race-preview-changed', { detail: v }));
  return v;
}
