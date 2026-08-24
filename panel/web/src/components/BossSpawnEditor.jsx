/** Parse / serialize boss_spawn.properties — khớp BossSpawnConfig.java */

const HEADER = `# Cấu hình hệ thống spawn boss — chỉnh trên Panel rồi Lưu + Reload
# spawn.enabled: bật/tắt lịch spawn tự động
# Khung giờ: start-end,các_cặp (giờ VN 0-23). Mini có thể đặt "all"
# Jitter %: min,max — nhân với thời gian nghỉ gốc của boss (phân phối tam giác)
# Stagger (giây): min,max — trễ spawn lần đầu sau khi mở server
# Phân bổ: khoảng cách tier, mật độ map, bonus ngày, soft window
`;

function parsePropLines(text) {
  const map = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) map[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return map;
}

function parseRange(str, defMin, defMax) {
  if (!str || !str.includes(',')) return [defMin, defMax];
  const [a, b] = str.split(',').map((x) => Number(x.trim()));
  return [Number.isNaN(a) ? defMin : a, Number.isNaN(b) ? defMax : b];
}

function parseHours(str) {
  if (!str || str.toLowerCase() === 'all') return { allDay: true, ranges: [] };
  const ranges = [];
  for (const part of str.split(',')) {
    const p = part.trim();
    if (!p) continue;
    const [a, b] = p.split('-').map((x) => Number(x.trim()));
    if (!Number.isNaN(a) && !Number.isNaN(b)) ranges.push({ start: a, end: b });
  }
  return { allDay: ranges.length === 0, ranges: ranges.length ? ranges : [{ start: 0, end: 23 }] };
}

function hoursToString({ allDay, ranges }) {
  if (allDay) return 'all';
  return (ranges || [])
    .filter((r) => r.start != null && r.end != null)
    .map((r) => `${r.start}-${r.end}`)
    .join(',');
}

function rangeToString([a, b]) {
  return `${a},${b}`;
}

export function parseBossSpawnConfig(text) {
  const p = parsePropLines(text);
  return {
    enabled: p['spawn.enabled'] !== 'false',
    maxEliteConcurrent: Number(p['spawn.elite.max.concurrent']) || 5,
    maxWorldConcurrent: Number(p['spawn.world.max.concurrent']) || 1,
    maxNormalConcurrent: Number(p['spawn.normal.max.concurrent']) || 12,
    distributionEnabled: p['spawn.distribution.enabled'] !== 'false',
    maxBossesPerMap: Number(p['spawn.map.max.per.map']) || 2,
    eliteMinGapSec: Number(p['spawn.elite.min.gap.sec']) || 90,
    worldMinGapSec: Number(p['spawn.world.min.gap.sec']) || 1800,
    normalMinGapSec: Number(p['spawn.normal.min.gap.sec']) || 30,
    fairnessEnabled: p['spawn.fairness.enabled'] !== 'false',
    dailyBonusEnabled: p['spawn.daily.bonus.enabled'] !== 'false',
    dailyBonusDurationHours: Number(p['spawn.daily.bonus.hours']) || 2,
    dailyBonusNormal: p['spawn.daily.bonus.normal'] !== 'false',
    dailyBonusElite: p['spawn.daily.bonus.elite'] !== 'false',
    softWindowEnabled: p['spawn.soft.window.enabled'] !== 'false',
    softWindowSpawnChance: Number(p['spawn.soft.window.spawn.chance']) || 88,
    softWindowDeferMinSec: Number(p['spawn.soft.window.defer.min.sec']) || 45,
    softWindowDeferMaxSec: Number(p['spawn.soft.window.defer.max.sec']) || 180,
    windowAlignEnabled: p['spawn.window.align.enabled'] !== 'false',
    intraWindowSpreadMinSec: Number(p['spawn.intra.window.spread.min.sec']) || 30,
    intraWindowSpreadMaxSec: Number(p['spawn.intra.window.spread.max.sec']) || 900,
    dailyBonusPreferGap: p['spawn.daily.bonus.prefer.gap'] !== 'false',
    crossTierGapSec: Number(p['spawn.cross.tier.gap.sec']) || 120,
    adaptiveGapEnabled: p['spawn.adaptive.gap.enabled'] !== 'false',
    adaptiveGapPerReadySec: Number(p['spawn.adaptive.gap.per.ready.sec']) || 20,
    waitBoostEnabled: p['spawn.wait.boost.enabled'] !== 'false',
    waitBoostAfterSec: Number(p['spawn.wait.boost.after.sec']) || 240,
    waitBoostChance: Number(p['spawn.wait.boost.chance']) || 96,
    miniHours: parseHours(p['spawn.mini.hours'] || 'all'),
    normalWeekday: parseHours(p['spawn.normal.hours.weekday'] || '9-12,14-17,19-23'),
    normalWeekend: parseHours(p['spawn.normal.hours.weekend'] || '9-12,12-14,14-17,19-23'),
    eliteWarnEnabled: p['spawn.elite.warn.enabled'] !== 'false',
    eliteWarnMinutes: Number(p['spawn.elite.warn.minutes']) || 5,
    eliteWeekday: parseHours(p['spawn.elite.hours.weekday'] || '10-15,18-23'),
    eliteWeekend: parseHours(p['spawn.elite.hours.weekend'] || '10-23'),
    worldWeekday: parseHours(p['spawn.world.hours.weekday'] || '20-22'),
    worldWeekend: parseHours(p['spawn.world.hours.weekend'] || '19-23'),
    jitterMini: parseRange(p['spawn.jitter.mini'], 60, 140),
    jitterNormal: parseRange(p['spawn.jitter.normal'], 75, 125),
    jitterElite: parseRange(p['spawn.jitter.elite'], 85, 115),
    jitterWorld: parseRange(p['spawn.jitter.world'], 90, 110),
    staggerMini: parseRange(p['spawn.stagger.mini.sec'], 15, 180),
    staggerNormal: parseRange(p['spawn.stagger.normal.sec'], 60, 600),
    staggerElite: parseRange(p['spawn.stagger.elite.sec'], 300, 1800),
    staggerWorld: parseRange(p['spawn.stagger.world.sec'], 900, 3600),
  };
}

export function serializeBossSpawnConfig(cfg) {
  const lines = [
    HEADER.trim(),
    '',
    'spawn.enabled=' + cfg.enabled,
    '',
    'spawn.elite.warn.enabled=' + cfg.eliteWarnEnabled,
    'spawn.elite.warn.minutes=' + (cfg.eliteWarnMinutes ?? 5),
    '',
    'spawn.elite.max.concurrent=' + cfg.maxEliteConcurrent,
    'spawn.world.max.concurrent=' + cfg.maxWorldConcurrent,
    'spawn.normal.max.concurrent=' + cfg.maxNormalConcurrent,
    '',
    'spawn.distribution.enabled=' + cfg.distributionEnabled,
    'spawn.map.max.per.map=' + cfg.maxBossesPerMap,
    'spawn.elite.min.gap.sec=' + cfg.eliteMinGapSec,
    'spawn.world.min.gap.sec=' + cfg.worldMinGapSec,
    'spawn.normal.min.gap.sec=' + cfg.normalMinGapSec,
    'spawn.fairness.enabled=' + cfg.fairnessEnabled,
    '',
    'spawn.daily.bonus.enabled=' + cfg.dailyBonusEnabled,
    'spawn.daily.bonus.hours=' + cfg.dailyBonusDurationHours,
    'spawn.daily.bonus.normal=' + cfg.dailyBonusNormal,
    'spawn.daily.bonus.elite=' + cfg.dailyBonusElite,
    '',
    'spawn.soft.window.enabled=' + cfg.softWindowEnabled,
    'spawn.soft.window.spawn.chance=' + cfg.softWindowSpawnChance,
    'spawn.soft.window.defer.min.sec=' + cfg.softWindowDeferMinSec,
    'spawn.soft.window.defer.max.sec=' + cfg.softWindowDeferMaxSec,
    '',
    'spawn.window.align.enabled=' + cfg.windowAlignEnabled,
    'spawn.intra.window.spread.min.sec=' + cfg.intraWindowSpreadMinSec,
    'spawn.intra.window.spread.max.sec=' + cfg.intraWindowSpreadMaxSec,
    '',
    'spawn.daily.bonus.prefer.gap=' + cfg.dailyBonusPreferGap,
    'spawn.cross.tier.gap.sec=' + cfg.crossTierGapSec,
    'spawn.adaptive.gap.enabled=' + cfg.adaptiveGapEnabled,
    'spawn.adaptive.gap.per.ready.sec=' + cfg.adaptiveGapPerReadySec,
    'spawn.wait.boost.enabled=' + cfg.waitBoostEnabled,
    'spawn.wait.boost.after.sec=' + cfg.waitBoostAfterSec,
    'spawn.wait.boost.chance=' + cfg.waitBoostChance,
    '',
    'spawn.mini.hours=' + hoursToString(cfg.miniHours),
    'spawn.normal.hours.weekday=' + hoursToString(cfg.normalWeekday),
    'spawn.normal.hours.weekend=' + hoursToString(cfg.normalWeekend),
    'spawn.elite.hours.weekday=' + hoursToString(cfg.eliteWeekday),
    'spawn.elite.hours.weekend=' + hoursToString(cfg.eliteWeekend),
    'spawn.world.hours.weekday=' + hoursToString(cfg.worldWeekday),
    'spawn.world.hours.weekend=' + hoursToString(cfg.worldWeekend),
    '',
    'spawn.jitter.mini=' + rangeToString(cfg.jitterMini),
    'spawn.jitter.normal=' + rangeToString(cfg.jitterNormal),
    'spawn.jitter.elite=' + rangeToString(cfg.jitterElite),
    'spawn.jitter.world=' + rangeToString(cfg.jitterWorld),
    '',
    'spawn.stagger.mini.sec=' + rangeToString(cfg.staggerMini),
    'spawn.stagger.normal.sec=' + rangeToString(cfg.staggerNormal),
    'spawn.stagger.elite.sec=' + rangeToString(cfg.staggerElite),
    'spawn.stagger.world.sec=' + rangeToString(cfg.staggerWorld),
    '',
  ];
  return lines.join('\n');
}

const HOUR_PRESETS = [
  { label: 'Cả ngày (0-23h)', ranges: [{ start: 0, end: 23 }] },
  { label: 'Giờ cao điểm', ranges: [{ start: 9, end: 12 }, { start: 14, end: 17 }, { start: 19, end: 23 }] },
  { label: 'Tối 19-23h', ranges: [{ start: 19, end: 23 }] },
  { label: 'Trưa 12-14h', ranges: [{ start: 12, end: 14 }] },
];

const TIER_INFO = {
  mini: {
    code: 'MINI',
    titleVi: 'Boss Mini — lặp nhanh',
    desc: 'Boss respawn rất nhanh (thời gian nghỉ gốc dưới 2 phút). Thường là boss map nhỏ, xuất hiện liên tục.',
    detail: 'Game tự phân loại theo secondsRest của từng boss. Tier này có thể spawn cả ngày hoặc giới hạn khung giờ.',
    example: 'Boss map phụ, boss farm — có thể bật "spawn cả ngày".',
    jitterHint: 'Dao động % thời gian chờ. VD: 60–140% nghĩa là spawn sớm/muộn hơn so với gốc.',
    staggerHint: 'Sau khi mở server, boss Mini xuất hiện lần đầu sau khoảng 15–180 giây (ngẫu nhiên).',
  },
  normal: {
    code: 'NORMAL',
    titleVi: 'Boss Thường',
    desc: 'Boss respawn trung bình (nghỉ gốc khoảng 2–10 phút). Phổ biến nhất trên server.',
    detail: 'Khung giờ tách riêng ngày thường (T2–T6) và cuối tuần (T7, CN) theo giờ Việt Nam.',
    example: 'Boss săn cả ngày: 9–12h, 14–17h, 19–23h ngày thường.',
    jitterHint: '75–125%: spawn dao động vừa phải, tránh dồn boss cùng lúc.',
    staggerHint: 'Lần spawn đầu sau mở server: 1–10 phút.',
  },
  elite: {
    code: 'ELITE',
    titleVi: 'Boss Elite — hiếm, mạnh',
    desc: 'Boss respawn chậm (nghỉ gốc khoảng 10 phút – 1 giờ). Có giới hạn số lượng cùng lúc.',
    detail: 'Không vượt quá max ELITE đang sống trên toàn server.',
    example: 'Boss săn kiếm đồ hiếm — thường khung trưa 12–14h hoặc tối 20–22h.',
    jitterHint: '85–115%: dao động nhỏ hơn vì boss elite cần lịch ổn định.',
    staggerHint: 'Lần spawn đầu: 5–30 phút sau mở server.',
  },
  world: {
    code: 'WORLD',
    titleVi: 'Boss World — sự kiện lớn',
    desc: 'Boss respawn rất chậm (nghỉ gốc từ 1 giờ trở lên). Hiếm, khung giờ hẹp, tối đa 1 (hoặc ít) con cùng lúc.',
    detail: 'Dùng cho boss toàn server, cần nhiều người đánh. Khung giờ thường buổi tối cuối tuần.',
    example: 'Boss world event — 19–23h cuối tuần, chỉ 1 boss world trên map.',
    jitterHint: '90–110%: gần như đúng giờ, tránh lệch lịch sự kiện.',
    staggerHint: 'Lần spawn đầu: 15 phút – 1 giờ sau mở server.',
  },
};

const GENERAL_FIELDS = {
  enabled: {
    label: 'Bật lịch spawn tự động',
    hint: 'Tắt = boss vẫn có trong game nhưng không theo lịch jitter/khung giờ của file này.',
  },
  maxEliteConcurrent: {
    label: 'Tối đa boss Elite cùng lúc',
    hint: 'Giới hạn số boss Elite đang sống trên toàn server (tránh quá đông).',
  },
  maxWorldConcurrent: {
    label: 'Tối đa boss World cùng lúc',
    hint: 'Thường đặt 1 — chỉ một boss world event tại một thời điểm.',
  },
  maxNormalConcurrent: {
    label: 'Tối đa boss Thường cùng lúc',
    hint: 'Tránh quá nhiều boss NORMAL trên map cùng lúc. 0 = không giới hạn.',
  },
  eliteWarnEnabled: {
    label: 'Cảnh báo spawn boss Elite',
    hint: 'Gửi thông báo toàn server trước khi boss Elite xuất hiện.',
  },
  eliteWarnMinutes: {
    label: 'Cảnh báo trước (phút)',
    hint: 'Thông báo khi boss Elite còn khoảng N phút nữa spawn.',
  },
};

const DISTRIBUTION_FIELDS = {
  distributionEnabled: {
    label: 'Bật phân bổ thông minh',
    hint: 'Khoảng cách spawn theo tier, giới hạn mật độ map, hàng đợi công bằng, chọn map ít boss.',
  },
  maxBossesPerMap: {
    label: 'Tối đa boss / map',
    hint: 'Boss mới không spawn nếu tất cả map có thể đều đạt giới hạn. 0 = tắt.',
  },
  eliteMinGapSec: {
    label: 'Khoảng cách tối thiểu giữa 2 boss Elite (giây)',
    hint: 'Tránh dồn Elite liên tiếp — tạo nhịp săn boss tự nhiên hơn.',
  },
  worldMinGapSec: {
    label: 'Khoảng cách tối thiểu giữa 2 boss World (giây)',
    hint: 'Boss world hiếm — thường 30 phút trở lên.',
  },
  normalMinGapSec: {
    label: 'Khoảng cách tối thiểu giữa 2 boss Thường (giây)',
    hint: 'Làm mượt luồng spawn NORMAL, tránh burst.',
  },
  fairnessEnabled: {
    label: 'Hàng đợi công bằng (Normal / Elite / World)',
    hint: 'Boss chờ lâu hơn được ưu tiên spawn trước khi slot trống.',
  },
  dailyBonusEnabled: {
    label: 'Cửa sổ bonus ngẫu nhiên mỗi ngày',
    hint: 'Mỗi ngày server chọn 1 khung giờ bất ngờ — boss có thể spawn ngoài lịch cố định.',
  },
  dailyBonusPreferGap: {
    label: 'Bonus ưu tiên giờ trống',
    hint: 'Chọn khung bonus ngoài giờ NORMAL/ELITE cố định — tránh trùng lịch, tạo bất ngờ thật sự.',
  },
  dailyBonusDurationHours: {
    label: 'Độ dài cửa sổ bonus (giờ)',
    hint: 'VD: 2 = khung bonus kéo dài 2 giờ trong ngày.',
  },
  dailyBonusNormal: {
    label: 'Bonus áp dụng boss Thường',
    hint: 'Boss NORMAL spawn thêm trong khung bonus hàng ngày.',
  },
  dailyBonusElite: {
    label: 'Bonus áp dụng boss Elite',
    hint: 'Boss ELITE spawn thêm trong khung bonus — tạo bất ngờ cho player.',
  },
  softWindowEnabled: {
    label: 'Soft window — trễ ngẫu nhiên trong khung giờ',
    hint: 'Ngay cả trong khung giờ, boss vẫn có thể trễ thêm vài phút (khó đoán giờ chính xác).',
  },
  softWindowSpawnChance: {
    label: 'Xác suất spawn ngay khi đủ điều kiện (%)',
    hint: '100 = luôn spawn ngay; 88 = ~12% lần bị trễ thêm ngẫu nhiên.',
  },
  softWindowDeferMinSec: {
    label: 'Trễ tối thiểu khi soft roll fail (giây)',
  },
  softWindowDeferMaxSec: {
    label: 'Trễ tối đa khi soft roll fail (giây)',
  },
  windowAlignEnabled: {
    label: 'Căn cooldown vào khung giờ',
    hint: 'Khi boss hết nghỉ ngoài khung giờ, tự kéo lịch spawn tới khung hợp lệ kế tiếp.',
  },
  intraWindowSpreadMinSec: {
    label: 'Trải spawn tối thiểu trong khung (giây)',
    hint: 'Mỗi boss có offset riêng — tránh dồn spawn đúng đầu giờ.',
  },
  intraWindowSpreadMaxSec: {
    label: 'Trải spawn tối đa trong khung (giây)',
  },
  crossTierGapSec: {
    label: 'Khoảng cách ELITE ↔ WORLD (giây)',
    hint: 'Tránh 2 boss sự kiện lớn xuất hiện sát nhau.',
  },
  adaptiveGapEnabled: {
    label: 'Gap thích ứng khi nhiều boss sẵn sàng',
    hint: 'Tự tăng khoảng cách spawn khi >2 boss cùng tier đang chờ.',
  },
  adaptiveGapPerReadySec: {
    label: 'Thêm gap mỗi boss sẵn sàng dư (giây)',
  },
  waitBoostEnabled: {
    label: 'Ưu tiên boss chờ lâu (soft window)',
    hint: 'Boss đã sẵn sàng >4 phút trong khung giờ có xác suất spawn cao hơn.',
  },
  waitBoostAfterSec: {
    label: 'Chờ bao lâu để boost (giây)',
  },
  waitBoostChance: {
    label: 'Xác suất spawn khi đã boost (%)',
  },
};

function TierHeader({ tierKey }) {
  const t = TIER_INFO[tierKey];
  return (
    <div className="tier-header">
      <h4>{t.titleVi}</h4>
      <span className="tier-code">Mã tier: {t.code}</span>
      <p className="tier-desc">{t.desc}</p>
      <p className="tier-detail">{t.detail}</p>
      <p className="tier-example"><strong>Ví dụ:</strong> {t.example}</p>
    </div>
  );
}

function HourRangeEditor({ value, onChange, allowAllDay = false }) {
  const v = value || { allDay: false, ranges: [{ start: 9, end: 12 }] };

  function setRanges(ranges) {
    onChange({ allDay: false, ranges });
  }

  function addRange() {
    setRanges([...(v.ranges || []), { start: 19, end: 23 }]);
  }

  function updateRange(idx, patch) {
    setRanges(v.ranges.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRange(idx) {
    setRanges(v.ranges.filter((_, i) => i !== idx));
  }

  return (
    <div className="hour-range-editor">
      {allowAllDay && (
        <label className="toggle-empty">
          <input
            type="checkbox"
            checked={v.allDay}
            onChange={(e) => onChange(e.target.checked ? { allDay: true, ranges: [] } : { allDay: false, ranges: [{ start: 9, end: 23 }] })}
          />
          Spawn cả ngày (24/24)
        </label>
      )}
      {allowAllDay && v.allDay && (
        <p className="field-hint-inline">Boss Mini có thể xuất hiện mọi giờ, không giới hạn khung.</p>
      )}
      {(!allowAllDay || !v.allDay) && (
        <>
          <p className="field-hint-inline">Giờ Việt Nam (0–23). Có thể thêm nhiều khung, VD: 9–12 và 19–23.</p>
          <div className="preset-row">
            {HOUR_PRESETS.map((pr) => (
              <button key={pr.label} type="button" className="btn sm" onClick={() => onChange({ allDay: false, ranges: pr.ranges.map((r) => ({ ...r })) })}>
                {pr.label}
              </button>
            ))}
          </div>
          {(v.ranges || []).map((r, idx) => (
            <div key={idx} className="hour-range-row">
              <label className="field mini">
                Từ giờ
                <input type="number" min={0} max={23} value={r.start} onChange={(e) => updateRange(idx, { start: Number(e.target.value) })} />
              </label>
              <span className="muted">→</span>
              <label className="field mini">
                Đến giờ
                <input type="number" min={0} max={23} value={r.end} onChange={(e) => updateRange(idx, { end: Number(e.target.value) })} />
              </label>
              <span className="hour-preview">{r.start}h – {r.end}h</span>
              <button type="button" className="btn danger sm" onClick={() => removeRange(idx)} disabled={v.ranges.length <= 1}>Xóa</button>
            </div>
          ))}
          <button type="button" className="btn sm" onClick={addRange}>+ Thêm khung giờ</button>
        </>
      )}
    </div>
  );
}

function RangePairEditor({ label, titleVi, hint, value, onChange, min = 0, max = 99999, suffix = '' }) {
  return (
    <div className="range-pair-editor">
      <div className="range-pair-head">
        <strong>{titleVi || label}</strong>
        {label && titleVi && <span className="tier-code">({label})</span>}
        {hint && <p className="field-hint-inline">{hint}</p>}
      </div>
      <div className="row">
        <label className="field mini">
          Tối thiểu{suffix}
          <input type="number" min={min} max={max} value={value[0]} onChange={(e) => onChange([Number(e.target.value), value[1]])} />
        </label>
        <label className="field mini">
          Tối đa{suffix}
          <input type="number" min={min} max={max} value={value[1]} onChange={(e) => onChange([value[0], Number(e.target.value)])} />
        </label>
        <span className="hour-preview">Khoảng: {value[0]}{suffix} – {value[1]}{suffix}</span>
      </div>
    </div>
  );
}

export default function BossSpawnEditor({ config, onChange }) {
  const c = config;

  function patch(p) {
    onChange({ ...c, ...p });
  }

  return (
    <div className="boss-spawn-editor">
      <div className="help-box">
        <h4>Hướng dẫn cấu hình spawn boss</h4>
        <ul>
          <li><strong>Phân loại tier</strong> — Game tự xếp boss vào Mini / Thường / Elite / World dựa trên thời gian nghỉ gốc (secondsRest) của từng boss.</li>
          <li><strong>Khung giờ</strong> — Boss chỉ được spawn tự động trong các giờ bạn chọn (giờ Việt Nam, 0–23).</li>
          <li><strong>Jitter (%)</strong> — Làm thời gian chờ spawn dao động. 100% = đúng gốc; 60–140% = sớm/muộn ngẫu nhiên trong khoảng đó.</li>
          <li><strong>Stagger (giây)</strong> — Trễ ngẫu nhiên lần spawn đầu tiên sau khi mở server, tránh tất cả boss dồn cùng lúc.</li>
          <li><strong>Phân bổ thông minh</strong> — Khoảng cách tier, giới hạn map, bonus ngày ngẫu nhiên, soft window — spawn đa dạng và khó đoán hơn.</li>
        </ul>
      </div>

      <details open className="spawn-section">
        <summary><strong>Cài đặt chung</strong></summary>
        <p className="section-intro">Bật/tắt toàn bộ hệ thống và giới hạn boss Elite / World.</p>
        <div className="spawn-section-body">
          <label className="toggle-field field">
            <input type="checkbox" checked={c.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
            <span>{GENERAL_FIELDS.enabled.label}</span>
          </label>
          <p className="field-hint-inline">{GENERAL_FIELDS.enabled.hint}</p>
          <div className="form-grid">
            <label className="field">
              {GENERAL_FIELDS.maxEliteConcurrent.label}
              <input type="number" min={1} max={20} value={c.maxEliteConcurrent} onChange={(e) => patch({ maxEliteConcurrent: Number(e.target.value) })} />
              <span className="field-hint-inline">{GENERAL_FIELDS.maxEliteConcurrent.hint}</span>
            </label>
            <label className="field">
              {GENERAL_FIELDS.maxWorldConcurrent.label}
              <input type="number" min={0} max={10} value={c.maxWorldConcurrent} onChange={(e) => patch({ maxWorldConcurrent: Number(e.target.value) })} />
              <span className="field-hint-inline">{GENERAL_FIELDS.maxWorldConcurrent.hint}</span>
            </label>
            <label className="field">
              {GENERAL_FIELDS.maxNormalConcurrent.label}
              <input type="number" min={0} max={50} value={c.maxNormalConcurrent} onChange={(e) => patch({ maxNormalConcurrent: Number(e.target.value) })} />
              <span className="field-hint-inline">{GENERAL_FIELDS.maxNormalConcurrent.hint}</span>
            </label>
          </div>
          <label className="toggle-field field">
            <input type="checkbox" checked={c.eliteWarnEnabled} onChange={(e) => patch({ eliteWarnEnabled: e.target.checked })} />
            <span>{GENERAL_FIELDS.eliteWarnEnabled.label}</span>
          </label>
          <p className="field-hint-inline">{GENERAL_FIELDS.eliteWarnEnabled.hint}</p>
          <label className="field">
            {GENERAL_FIELDS.eliteWarnMinutes.label}
            <input type="number" min={1} max={30} value={c.eliteWarnMinutes ?? 5} onChange={(e) => patch({ eliteWarnMinutes: Number(e.target.value) })} />
            <span className="field-hint-inline">{GENERAL_FIELDS.eliteWarnMinutes.hint}</span>
          </label>
        </div>
      </details>

      <details open className="spawn-section">
        <summary><strong>Phân bổ &amp; ngẫu nhiên thông minh</strong></summary>
        <p className="section-intro">
          Điều phối spawn đa dạng hơn: tránh dồn boss, cân bằng map, cửa sổ bất ngờ mỗi ngày, và trễ ngẫu nhiên trong khung giờ.
        </p>
        <div className="spawn-section-body">
          <label className="toggle-field field">
            <input type="checkbox" checked={c.distributionEnabled} onChange={(e) => patch({ distributionEnabled: e.target.checked })} />
            <span>{DISTRIBUTION_FIELDS.distributionEnabled.label}</span>
          </label>
          <p className="field-hint-inline">{DISTRIBUTION_FIELDS.distributionEnabled.hint}</p>
          <div className="form-grid">
            <label className="field">
              {DISTRIBUTION_FIELDS.maxBossesPerMap.label}
              <input type="number" min={0} max={10} value={c.maxBossesPerMap} onChange={(e) => patch({ maxBossesPerMap: Number(e.target.value) })} />
              <span className="field-hint-inline">{DISTRIBUTION_FIELDS.maxBossesPerMap.hint}</span>
            </label>
            <label className="field">
              {DISTRIBUTION_FIELDS.eliteMinGapSec.label}
              <input type="number" min={0} max={3600} value={c.eliteMinGapSec} onChange={(e) => patch({ eliteMinGapSec: Number(e.target.value) })} />
              <span className="field-hint-inline">{DISTRIBUTION_FIELDS.eliteMinGapSec.hint}</span>
            </label>
            <label className="field">
              {DISTRIBUTION_FIELDS.normalMinGapSec.label}
              <input type="number" min={0} max={600} value={c.normalMinGapSec} onChange={(e) => patch({ normalMinGapSec: Number(e.target.value) })} />
              <span className="field-hint-inline">{DISTRIBUTION_FIELDS.normalMinGapSec.hint}</span>
            </label>
            <label className="field">
              {DISTRIBUTION_FIELDS.worldMinGapSec.label}
              <input type="number" min={0} max={86400} value={c.worldMinGapSec} onChange={(e) => patch({ worldMinGapSec: Number(e.target.value) })} />
              <span className="field-hint-inline">{DISTRIBUTION_FIELDS.worldMinGapSec.hint}</span>
            </label>
          </div>
          <label className="toggle-field field">
            <input type="checkbox" checked={c.fairnessEnabled} onChange={(e) => patch({ fairnessEnabled: e.target.checked })} />
            <span>{DISTRIBUTION_FIELDS.fairnessEnabled.label}</span>
          </label>
          <p className="field-hint-inline">{DISTRIBUTION_FIELDS.fairnessEnabled.hint}</p>

          <h5 className="subsection-title">Lịch thông minh</h5>
          <label className="toggle-field field">
            <input type="checkbox" checked={c.windowAlignEnabled} onChange={(e) => patch({ windowAlignEnabled: e.target.checked })} />
            <span>{DISTRIBUTION_FIELDS.windowAlignEnabled.label}</span>
          </label>
          <p className="field-hint-inline">{DISTRIBUTION_FIELDS.windowAlignEnabled.hint}</p>
          <div className="form-grid">
            <label className="field">
              {DISTRIBUTION_FIELDS.intraWindowSpreadMinSec.label}
              <input type="number" min={0} max={3600} value={c.intraWindowSpreadMinSec} onChange={(e) => patch({ intraWindowSpreadMinSec: Number(e.target.value) })} />
              <span className="field-hint-inline">{DISTRIBUTION_FIELDS.intraWindowSpreadMinSec.hint}</span>
            </label>
            <label className="field">
              {DISTRIBUTION_FIELDS.intraWindowSpreadMaxSec.label}
              <input type="number" min={0} max={3600} value={c.intraWindowSpreadMaxSec} onChange={(e) => patch({ intraWindowSpreadMaxSec: Number(e.target.value) })} />
            </label>
            <label className="field">
              {DISTRIBUTION_FIELDS.crossTierGapSec.label}
              <input type="number" min={0} max={3600} value={c.crossTierGapSec} onChange={(e) => patch({ crossTierGapSec: Number(e.target.value) })} />
              <span className="field-hint-inline">{DISTRIBUTION_FIELDS.crossTierGapSec.hint}</span>
            </label>
          </div>
          <label className="toggle-field field">
            <input type="checkbox" checked={c.adaptiveGapEnabled} onChange={(e) => patch({ adaptiveGapEnabled: e.target.checked })} />
            <span>{DISTRIBUTION_FIELDS.adaptiveGapEnabled.label}</span>
          </label>
          <p className="field-hint-inline">{DISTRIBUTION_FIELDS.adaptiveGapEnabled.hint}</p>
          <label className="field">
            {DISTRIBUTION_FIELDS.adaptiveGapPerReadySec.label}
            <input type="number" min={0} max={300} value={c.adaptiveGapPerReadySec} onChange={(e) => patch({ adaptiveGapPerReadySec: Number(e.target.value) })} />
          </label>

          <h5 className="subsection-title">Cửa sổ bonus hàng ngày</h5>
          <label className="toggle-field field">
            <input type="checkbox" checked={c.dailyBonusEnabled} onChange={(e) => patch({ dailyBonusEnabled: e.target.checked })} />
            <span>{DISTRIBUTION_FIELDS.dailyBonusEnabled.label}</span>
          </label>
          <p className="field-hint-inline">{DISTRIBUTION_FIELDS.dailyBonusEnabled.hint}</p>
          <label className="toggle-field field">
            <input type="checkbox" checked={c.dailyBonusPreferGap} onChange={(e) => patch({ dailyBonusPreferGap: e.target.checked })} />
            <span>{DISTRIBUTION_FIELDS.dailyBonusPreferGap.label}</span>
          </label>
          <p className="field-hint-inline">{DISTRIBUTION_FIELDS.dailyBonusPreferGap.hint}</p>
          <div className="form-grid">
            <label className="field">
              {DISTRIBUTION_FIELDS.dailyBonusDurationHours.label}
              <input type="number" min={1} max={6} value={c.dailyBonusDurationHours} onChange={(e) => patch({ dailyBonusDurationHours: Number(e.target.value) })} />
              <span className="field-hint-inline">{DISTRIBUTION_FIELDS.dailyBonusDurationHours.hint}</span>
            </label>
            <label className="toggle-field field">
              <input type="checkbox" checked={c.dailyBonusNormal} onChange={(e) => patch({ dailyBonusNormal: e.target.checked })} />
              <span>{DISTRIBUTION_FIELDS.dailyBonusNormal.label}</span>
            </label>
            <label className="toggle-field field">
              <input type="checkbox" checked={c.dailyBonusElite} onChange={(e) => patch({ dailyBonusElite: e.target.checked })} />
              <span>{DISTRIBUTION_FIELDS.dailyBonusElite.label}</span>
            </label>
          </div>

          <h5 className="subsection-title">Soft window</h5>
          <label className="toggle-field field">
            <input type="checkbox" checked={c.softWindowEnabled} onChange={(e) => patch({ softWindowEnabled: e.target.checked })} />
            <span>{DISTRIBUTION_FIELDS.softWindowEnabled.label}</span>
          </label>
          <p className="field-hint-inline">{DISTRIBUTION_FIELDS.softWindowEnabled.hint}</p>
          <div className="form-grid">
            <label className="field">
              {DISTRIBUTION_FIELDS.softWindowSpawnChance.label}
              <input type="number" min={1} max={100} value={c.softWindowSpawnChance} onChange={(e) => patch({ softWindowSpawnChance: Number(e.target.value) })} />
              <span className="field-hint-inline">{DISTRIBUTION_FIELDS.softWindowSpawnChance.hint}</span>
            </label>
            <label className="field">
              {DISTRIBUTION_FIELDS.softWindowDeferMinSec.label}
              <input type="number" min={5} max={600} value={c.softWindowDeferMinSec} onChange={(e) => patch({ softWindowDeferMinSec: Number(e.target.value) })} />
            </label>
            <label className="field">
              {DISTRIBUTION_FIELDS.softWindowDeferMaxSec.label}
              <input type="number" min={10} max={1800} value={c.softWindowDeferMaxSec} onChange={(e) => patch({ softWindowDeferMaxSec: Number(e.target.value) })} />
            </label>
          </div>
          <label className="toggle-field field">
            <input type="checkbox" checked={c.waitBoostEnabled} onChange={(e) => patch({ waitBoostEnabled: e.target.checked })} />
            <span>{DISTRIBUTION_FIELDS.waitBoostEnabled.label}</span>
          </label>
          <p className="field-hint-inline">{DISTRIBUTION_FIELDS.waitBoostEnabled.hint}</p>
          <div className="form-grid">
            <label className="field">
              {DISTRIBUTION_FIELDS.waitBoostAfterSec.label}
              <input type="number" min={30} max={3600} value={c.waitBoostAfterSec} onChange={(e) => patch({ waitBoostAfterSec: Number(e.target.value) })} />
            </label>
            <label className="field">
              {DISTRIBUTION_FIELDS.waitBoostChance.label}
              <input type="number" min={50} max={100} value={c.waitBoostChance} onChange={(e) => patch({ waitBoostChance: Number(e.target.value) })} />
            </label>
          </div>
        </div>
      </details>

      <details open className="spawn-section">
        <summary><strong>Khung giờ spawn theo loại boss</strong></summary>
        <p className="section-intro">
          Chọn giờ nào boss từng loại được phép spawn. Boss ngoài khung giờ sẽ chờ đến khung kế tiếp.
        </p>
        <div className="spawn-section-body tier-grid">
          <div className="tier-card">
            <TierHeader tierKey="mini" />
            <HourRangeEditor value={c.miniHours} onChange={(v) => patch({ miniHours: v })} allowAllDay />
          </div>
          {['normal', 'elite', 'world'].map((tier) => (
            <div key={tier} className="tier-card">
              <TierHeader tierKey={tier} />
              <div className="weekday-block">
                <strong className="weekday-label">Ngày thường (Thứ 2 – Thứ 6)</strong>
                <p className="field-hint-inline">Khung giờ spawn các ngày trong tuần.</p>
                <HourRangeEditor
                  value={c[`${tier}Weekday`]}
                  onChange={(v) => patch({ [`${tier}Weekday`]: v })}
                />
              </div>
              <div className="weekday-block">
                <strong className="weekday-label">Cuối tuần (Thứ 7 – Chủ nhật)</strong>
                <p className="field-hint-inline">Thường mở rộng hơn ngày thường — player online nhiều hơn.</p>
                <HourRangeEditor
                  value={c[`${tier}Weekend`]}
                  onChange={(v) => patch({ [`${tier}Weekend`]: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="spawn-section">
        <summary><strong>Jitter — dao động thời gian chờ spawn (%)</strong></summary>
        <p className="section-intro">
          Sau khi boss chết, game chờ một khoảng (secondsRest) rồi spawn lại. Jitter nhân % vào khoảng đó để spawn không cố định 100% — tránh player biết chính xác giờ.
        </p>
        <div className="spawn-section-body range-grid">
          <RangePairEditor label="MINI" titleVi={TIER_INFO.mini.titleVi} hint={TIER_INFO.mini.jitterHint} value={c.jitterMini} onChange={(v) => patch({ jitterMini: v })} min={1} max={500} suffix="%" />
          <RangePairEditor label="NORMAL" titleVi={TIER_INFO.normal.titleVi} hint={TIER_INFO.normal.jitterHint} value={c.jitterNormal} onChange={(v) => patch({ jitterNormal: v })} min={1} max={500} suffix="%" />
          <RangePairEditor label="ELITE" titleVi={TIER_INFO.elite.titleVi} hint={TIER_INFO.elite.jitterHint} value={c.jitterElite} onChange={(v) => patch({ jitterElite: v })} min={1} max={500} suffix="%" />
          <RangePairEditor label="WORLD" titleVi={TIER_INFO.world.titleVi} hint={TIER_INFO.world.jitterHint} value={c.jitterWorld} onChange={(v) => patch({ jitterWorld: v })} min={1} max={500} suffix="%" />
        </div>
      </details>

      <details className="spawn-section">
        <summary><strong>Stagger — trễ spawn lần đầu sau mở server (giây)</strong></summary>
        <p className="section-intro">
          Khi vừa bật server, boss không spawn ngay cùng lúc. Mỗi boss được trễ ngẫu nhiên trong khoảng min–max (giây) tùy tier.
        </p>
        <div className="spawn-section-body range-grid">
          <RangePairEditor label="MINI" titleVi={TIER_INFO.mini.titleVi} hint={TIER_INFO.mini.staggerHint} value={c.staggerMini} onChange={(v) => patch({ staggerMini: v })} suffix=" giây" />
          <RangePairEditor label="NORMAL" titleVi={TIER_INFO.normal.titleVi} hint={TIER_INFO.normal.staggerHint} value={c.staggerNormal} onChange={(v) => patch({ staggerNormal: v })} suffix=" giây" />
          <RangePairEditor label="ELITE" titleVi={TIER_INFO.elite.titleVi} hint={TIER_INFO.elite.staggerHint} value={c.staggerElite} onChange={(v) => patch({ staggerElite: v })} suffix=" giây" />
          <RangePairEditor label="WORLD" titleVi={TIER_INFO.world.titleVi} hint={TIER_INFO.world.staggerHint} value={c.staggerWorld} onChange={(v) => patch({ staggerWorld: v })} suffix=" giây" />
        </div>
      </details>
    </div>
  );
}
