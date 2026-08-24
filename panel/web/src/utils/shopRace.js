/** Khớp TabShop.isItemForRace() trên game server */
export const SHOP_RACES = [
  { value: '', label: 'Tất cả (DB)' },
  { value: '0', label: 'Trái Đất' },
  { value: '1', label: 'Namec' },
  { value: '2', label: 'Xayda' },
];

export const SHOP_ITEM_GENDER_OPTIONS = [
  { value: 0, label: 'Trái Đất' },
  { value: 1, label: 'Namec' },
  { value: 2, label: 'Xayda' },
  { value: 3, label: 'Chung (mọi tộc)' },
];

const GENDER_LABEL = {
  0: 'Trái Đất',
  1: 'Namec',
  2: 'Xayda',
  3: 'Chung',
};

export function genderLabel(g) {
  const n = Number(g);
  if (n >= 3) return GENDER_LABEL[3];
  return GENDER_LABEL[n] ?? `Tộc ${n}`;
}

export function parseGenderOverride(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export function effectiveItemGender(templateGender, overrideRaw) {
  const override = parseGenderOverride(overrideRaw);
  if (override != null) return override;
  const g = Number(templateGender ?? 3);
  return Number.isNaN(g) ? 3 : g;
}

export function hasGenderOverride(overrideRaw) {
  return parseGenderOverride(overrideRaw) != null;
}

export function patchShopItemGender(item, genderOverride) {
  const templateGender = item.template_gender != null
    ? Number(item.template_gender)
    : effectiveItemGender(item.item_gender, null);
  const override = parseGenderOverride(genderOverride);
  return {
    template_gender: templateGender,
    gender_override: override,
    item_gender: effectiveItemGender(templateGender, override),
  };
}

export function itemVisibleForRace(itemGender, playerRace) {
  if (playerRace === '' || playerRace == null) return true;
  const g = Number(itemGender ?? 3);
  const r = Number(playerRace);
  return g === r || g >= 3;
}

/** CSS class cho badge tộc (sidebar / player list). */
export function raceBadgeClass(raceValue) {
  const n = Number(raceValue);
  if (n === 0) return 'earth';
  if (n === 1) return 'namek';
  if (n === 2) return 'xayda';
  return 'neutral';
}

export function shopRacePreviewTitle(raceValue) {
  if (!raceValue) return '';
  return `Đang xem shop như player ${genderLabel(raceValue)} (lọc item theo tộc)`;
}
