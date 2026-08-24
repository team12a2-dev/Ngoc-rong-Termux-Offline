/** Khớp InventoryService — option 21: param × 1 tỷ SM */
export const SHOP_POWER_OPTION_ID = 21;
export const SHOP_POWER_PER_PARAM = 1_000_000_000;

export function getShopPowerOption21(options) {
  return (options || []).find((o) => Number(o.id) === SHOP_POWER_OPTION_ID);
}

export function effectiveShopPower(strRequire, options) {
  const o21 = getShopPowerOption21(options);
  if (o21) return Number(o21.param) * SHOP_POWER_PER_PARAM;
  return Number(strRequire) || 0;
}

export function upsertShopPowerOption(options, useOverride, paramTi) {
  const rest = (options || []).filter((o) => Number(o.id) !== SHOP_POWER_OPTION_ID);
  if (!useOverride) return rest;
  const p = Math.max(0, Math.floor(Number(paramTi) || 0));
  if (p <= 0) return rest;
  return [...rest, { id: SHOP_POWER_OPTION_ID, param: p }];
}

export function formatPowerShort(n) {
  const v = Number(n) || 0;
  if (v >= SHOP_POWER_PER_PARAM && v % SHOP_POWER_PER_PARAM === 0) {
    return `${v / SHOP_POWER_PER_PARAM} tỷ`;
  }
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('vi-VN')} triệu`;
  return v.toLocaleString('vi-VN');
}
