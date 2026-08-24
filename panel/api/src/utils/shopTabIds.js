/** tab_shop.id ↔ item_shop.tab_id (game ShopDAO dùng id-31 cho tab 41–43). */
export function canonicalItemShopTabId(tabShopId) {
  const id = Number(tabShopId);
  if (id >= 41 && id <= 43) return id - 31;
  return id;
}

export function resolveItemShopTabIds(tabShopId) {
  const id = Number(tabShopId);
  const ids = new Set([canonicalItemShopTabId(id)]);
  if (id >= 41 && id <= 43) ids.add(id);
  if (id >= 10 && id <= 12) ids.add(id + 31);
  return [...ids];
}
