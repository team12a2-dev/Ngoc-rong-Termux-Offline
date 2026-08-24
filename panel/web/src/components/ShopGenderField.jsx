import { useEffect, useState } from 'react';
import {
  SHOP_ITEM_GENDER_OPTIONS,
  genderLabel,
  hasGenderOverride,
  parseGenderOverride,
} from '../utils/shopRace';

export default function ShopGenderField({ itemId, templateGender = 3, genderOverride, onChange }) {
  const modeName = `shop-gender-mode-${itemId ?? 'new'}`;
  const templateG = Number(templateGender ?? 3);
  const parsedOverride = parseGenderOverride(genderOverride);
  const [overrideMode, setOverrideMode] = useState(() => hasGenderOverride(genderOverride));

  useEffect(() => {
    setOverrideMode(hasGenderOverride(genderOverride));
  }, [itemId]);

  const useOverride = overrideMode;
  const overrideVal = parsedOverride ?? templateG;

  function setTemplateMode() {
    setOverrideMode(false);
    onChange(null);
  }

  function setCustomMode() {
    setOverrideMode(true);
    if (!hasGenderOverride(genderOverride)) {
      return;
    }
    onChange(parsedOverride);
  }

  function setGender(value) {
    setOverrideMode(true);
    onChange(Number(value));
  }

  return (
    <div className="shop-gender-require">
      <div className="section-head compact">
        <div>
          <h5>Tộc hệ vật phẩm</h5>
          <p className="muted section-sub">
            Mặc định từ <code>item_template.gender</code>
            {' '}
            ({genderLabel(templateG)}).
            {' '}
            Ghi đè trên dòng <code>item_shop</code> — khớp lọc shop theo tộc trong game.
          </p>
        </div>
        <span className="badge shop-gender-effective" title="Tộc hiệu lực khi player mở shop">
          Hiệu lực:
          {' '}
          {genderLabel(useOverride && hasGenderOverride(genderOverride) ? overrideVal : templateG)}
        </span>
      </div>

      <div className="shop-gender-modes">
        <label className="shop-gender-mode">
          <input
            type="radio"
            name={modeName}
            checked={!useOverride}
            onChange={setTemplateMode}
          />
          <span>
            Theo template
            <em className="muted"> — {genderLabel(templateG)}</em>
          </span>
        </label>
        <label className="shop-gender-mode">
          <input
            type="radio"
            name={modeName}
            checked={useOverride}
            onChange={setCustomMode}
          />
          <span>Ghi đè tộc cho item shop này</span>
        </label>
      </div>

      {useOverride && (
        <div className="shop-gender-pick" role="group" aria-label="Chọn tộc gán">
          {!hasGenderOverride(genderOverride) && (
            <p className="muted shop-gender-pick-hint">Chọn tộc bên dưới (bắt buộc trước khi Lưu).</p>
          )}
          {SHOP_ITEM_GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`shop-gender-pick-btn ${
                hasGenderOverride(genderOverride) && parsedOverride === opt.value ? 'active' : ''
              }`}
              onClick={() => setGender(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
