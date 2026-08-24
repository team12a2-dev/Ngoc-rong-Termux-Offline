export const OPTION_CATEGORIES = {
  attack: { label: 'Tấn công', desc: 'Tăng sát thương, % đánh quái/boss' },
  defense: { label: 'Phòng thủ', desc: 'Giáp, né đòn, giảm sát thương' },
  hp_ki: { label: 'HP & KI', desc: 'Máu, mana, hồi phục theo thời gian' },
  crit: { label: 'Chí mạng', desc: 'Tỉ lệ và sát thương chí mạng' },
  speed: { label: 'Tốc độ', desc: 'Di chuyển, chính xác' },
  special: { label: 'Hiệu ứng', desc: 'Skill đặc biệt trên item (hiếm)' },
  time: { label: 'Thời hạn', desc: 'Phút, giờ, ngày sử dụng còn lại' },
  cosmetic: { label: 'Cải trang', desc: 'Skin, SS, tên nhân vật' },
  material: { label: 'Nguyên liệu', desc: 'Dùng để nâng cấp, không gắn trang bị' },
  other: { label: 'Khác', desc: 'Chỉ số đặc thù server' },
};

/** Quick picks for equipment editing — most used in NRO */
export const QUICK_OPTION_IDS = [47, 6, 7, 0, 50, 14, 16, 17, 27, 28, 72, 21];

export function categorizeOption(name = '') {
  const n = String(name).toLowerCase();
  if (/nâng cấp|ép thành|dùng để|dùng nâng|đá ngũ/.test(n)) return 'material';
  if (/cải trang|ss#|sôn gô|broly|pic|ca đic|na mếc|broly|mr\. santa/i.test(n)) return 'cosmetic';
  if (/phút|giờ|ngày|thời gian|còn lại|hiệu lực trong/.test(n)) return 'time';
  if (/giáp|né đòn|phản đòn|vô hiệu.*sát thương/.test(n)) return 'defense';
  if (/\bhp|\bki|hồi phục thể lực|hp\/30|ki\/30/.test(n)) return 'hp_ki';
  if (/chí mạng/.test(n)) return 'crit';
  if (/tốc độ|chính xác/.test(n)) return 'speed';
  if (/tấn công|sức đánh|sát thương/.test(n)) return 'attack';
  if (/hóa |tàng hình|dịch chuyển|hút #|biến |pin #|không thể giao dịch/.test(n)) return 'special';
  return 'other';
}

export function getParamHint(name = '') {
  if (!String(name).includes('#')) {
    return 'Dòng này thường không cần số — để 0 hoặc 1.';
  }
  if (name.includes('#%')) return 'Nhập phần trăm. Ví dụ: 5 → hiện 5% trên item.';
  if (name.includes('#K')) return 'Nhập đơn vị nghìn. Ví dụ: 10 → HP+10K.';
  if (name.includes('#000')) return 'Nhập số ×1000. Ví dụ: 50 → +50000 HP/KI.';
  if (/tỉ/.test(name) || /yêu cầu sức mạnh/i.test(name)) return 'Số tỷ (1 = 1.000.000.000 SM) — option #21 ghi đè power_require template.';
  if (/phút/.test(name)) return 'Số phút còn hiệu lực.';
  if (/giờ/.test(name)) return 'Số giờ còn lại.';
  if (/ngày/.test(name)) return 'Số ngày còn lại.';
  if (/cấp #/i.test(name)) return 'Cấp cường hóa item: 1, 2, 3…';
  if (/giáp/i.test(name)) return 'Điểm giáp cộng thêm (vd: 5 → Giáp+5).';
  if (/tấn công/i.test(name) && !name.includes('%')) return 'Điểm tấn công cộng thêm.';
  if (/hp/i.test(name) || /ki/i.test(name)) return 'Lượng HP/KI cộng thêm.';
  return 'Nhập số thay cho dấu # trong tên dòng.';
}

export function suggestParam(name = '') {
  if (name.includes('#%')) return 5;
  if (name.includes('#K')) return 10;
  if (name.includes('#000')) return 50;
  if (/giáp/i.test(name)) return 5;
  if (/hp/i.test(name) || /ki/i.test(name)) return 1000;
  if (/tấn công/i.test(name) && !name.includes('%')) return 10;
  if (/cấp #/i.test(name)) return 1;
  return 1;
}

export function formatOptionPreview(name, param = 1) {
  if (!name) return '';
  if (!String(name).includes('#')) return String(name);
  return String(name).replace(/#/g, String(param ?? 0));
}

export function enrichOption(row) {
  const name = row.name ?? row.NAME ?? '';
  const category = categorizeOption(name);
  const cat = OPTION_CATEGORIES[category] || OPTION_CATEGORIES.other;
  const param = suggestParam(name);
  return {
    id: row.id,
    name,
    category,
    categoryLabel: cat.label,
    categoryDesc: cat.desc,
    paramHint: getParamHint(name),
    needsParam: String(name).includes('#'),
    suggestParam: param,
    example: formatOptionPreview(name, param),
  };
}
