import {
  SHOP_POWER_OPTION_ID,
  SHOP_POWER_PER_PARAM,
  effectiveShopPower,
  formatPowerShort,
  getShopPowerOption21,
  upsertShopPowerOption,
} from '../utils/shopPowerRequire';

export default function ShopPowerRequireField({ strRequire = 0, options, onChange }) {
  const o21 = getShopPowerOption21(options);
  const useOverride = Boolean(o21);
  const paramTi = o21 ? Number(o21.param) : 0;
  const effective = effectiveShopPower(strRequire, options);

  function setOverride(enabled) {
    if (!enabled) {
      onChange(upsertShopPowerOption(options, false));
      return;
    }
    const fallbackTi = strRequire >= SHOP_POWER_PER_PARAM && strRequire % SHOP_POWER_PER_PARAM === 0
      ? strRequire / SHOP_POWER_PER_PARAM
      : Math.max(1, Math.ceil(strRequire / SHOP_POWER_PER_PARAM) || 1);
    onChange(upsertShopPowerOption(options, true, fallbackTi));
  }

  function setParamTi(value) {
    onChange(upsertShopPowerOption(options, true, value));
  }

  return (
    <div className="shop-power-require">
      <div className="section-head compact">
        <div>
          <h5>Yêu cầu sức mạnh sử dụng</h5>
          <p className="muted section-sub">
            Mặc định từ <code>item_template.power_require</code>
            {' '}
            ({formatPowerShort(strRequire)}).
            {' '}
            Option #{SHOP_POWER_OPTION_ID} «Yêu cầu sức mạnh # tỉ» ghi đè khi bật (1 param = 1 tỷ SM).
          </p>
        </div>
        <span className="badge shop-power-effective" title="SM hiệu lực trong game khi trang bị / mua">
          Hiệu lực: {formatPowerShort(effective)}
        </span>
      </div>

      <div className="shop-power-modes">
        <label className="shop-power-mode">
          <input
            type="radio"
            name="shop-power-mode"
            checked={!useOverride}
            onChange={() => setOverride(false)}
          />
          <span>
            Theo template
            <em className="muted"> — {formatPowerShort(strRequire)}</em>
          </span>
        </label>
        <label className="shop-power-mode">
          <input
            type="radio"
            name="shop-power-mode"
            checked={useOverride}
            onChange={() => setOverride(true)}
          />
          <span>Ghi đè option #{SHOP_POWER_OPTION_ID} (theo tỷ)</span>
        </label>
      </div>

      {useOverride && (
        <div className="row shop-power-param">
          <label className="field mini">
            Số tỷ (param)
            <input
              type="number"
              min={1}
              step={1}
              value={paramTi || ''}
              onChange={(e) => setParamTi(Number(e.target.value))}
            />
          </label>
          <p className="muted field-hint-inline">
            = {formatPowerShort((paramTi || 0) * SHOP_POWER_PER_PARAM)} sức mạnh
            {paramTi > 0 && ` · dòng trong game: «Yêu cầu sức mạnh ${paramTi} tỉ»`}
          </p>
        </div>
      )}

      {!useOverride && strRequire > 0 && strRequire % SHOP_POWER_PER_PARAM !== 0 && (
        <p className="muted shop-power-hint">
          SM template không chia hết cho 1 tỷ — dùng «Ghi đè option #21» nếu cần yêu cầu theo tỷ trong shop.
        </p>
      )}
    </div>
  );
}
