import { SHOP_RACES } from '../utils/shopRace';

/** Bộ lọc tộc — xem shop như player trong game */
export default function ShopRacePills({ value, onChange, summary, compact = false }) {
  return (
    <div className={`shop-race-bar ${compact ? 'shop-race-bar-compact' : ''}`}>
      <div className="shop-race-pills" role="tablist" aria-label="Lọc theo tộc">
        {SHOP_RACES.map((r) => (
          <button
            key={r.value || 'all'}
            type="button"
            role="tab"
            aria-selected={value === r.value}
            className={`shop-race-pill ${value === r.value ? 'active' : ''}`}
            onClick={() => onChange(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {summary && <p className="shop-race-summary muted">{summary}</p>}
    </div>
  );
}
