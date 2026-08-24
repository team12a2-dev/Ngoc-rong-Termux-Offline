/** Parse/update player JSON columns (synced with PlayerDAO.java) */

export function tryParseJson(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export function parseInventory(raw) {
  const arr = tryParseJson(raw);
  if (!Array.isArray(arr)) return {};
  return {
    gold: Number(arr[0] ?? 0),
    gem: Number(arr[1] ?? 0),
    ruby: Number(arr[2] ?? 0),
    coupon: Number(arr[3] ?? 0),
    event: Number(arr[4] ?? 0),
  };
}

export function buildInventory(current, updates) {
  const arr = tryParseJson(current) || [0, 0, 0, 0, 0];
  const keys = ['gold', 'gem', 'ruby', 'coupon', 'event'];
  keys.forEach((k, i) => {
    if (updates[k] != null) arr[i] = Number(updates[k]);
  });
  return JSON.stringify(arr);
}

export function addInventoryCurrency(current, deltas) {
  const arr = tryParseJson(current) || [0, 0, 0, 0, 0];
  const indexes = { gold: 0, gem: 1, ruby: 2 };
  const limits = { gold: 200_000_000_000, gem: 2_000_000_000, ruby: 2_000_000_000 };
  const before = {};
  const after = {};
  for (const [key, index] of Object.entries(indexes)) {
    const currentValue = Math.max(0, Number(arr[index] || 0));
    const delta = Number(deltas?.[key] || 0);
    before[key] = currentValue;
    after[key] = Math.min(limits[key], Math.max(0, currentValue + delta));
    arr[index] = after[key];
  }
  return { serialized: JSON.stringify(arr), before, after };
}

const POINT_FIELDS = {
  limitPower: 0,
  power: 1,
  tiemNang: 2,
  stamina: 3,
  maxStamina: 4,
  hpg: 5,
  mpg: 6,
  dameg: 7,
  defg: 8,
  critg: 9,
  critdragon: 10,
  hp: 12,
  mp: 13,
};

export function parseDataPoint(raw) {
  const arr = tryParseJson(raw);
  if (!Array.isArray(arr)) return {};
  const out = {};
  for (const [key, idx] of Object.entries(POINT_FIELDS)) {
    out[key] = arr[idx] != null ? Number(arr[idx]) : 0;
  }
  return out;
}

export function buildDataPoint(current, updates) {
  const arr = tryParseJson(current) || [];
  while (arr.length < 14) arr.push(0);
  for (const [key, val] of Object.entries(updates)) {
    const idx = POINT_FIELDS[key];
    if (idx != null && val != null) arr[idx] = Number(val);
  }
  return JSON.stringify(arr);
}

export function parseLocation(raw) {
  const arr = tryParseJson(raw);
  if (!Array.isArray(arr)) return {};
  return { mapId: Number(arr[0] ?? 0), x: Number(arr[1] ?? 0), y: Number(arr[2] ?? 0) };
}

export function buildLocation(current, updates) {
  const loc = parseLocation(current);
  const mapId = updates.mapId ?? loc.mapId ?? 0;
  const x = updates.x ?? loc.x ?? 0;
  const y = updates.y ?? loc.y ?? 0;
  return JSON.stringify([mapId, x, y]);
}

export function parseItemOptions(raw) {
  const arr = tryParseJson(raw);
  if (!Array.isArray(arr)) return [];
  return arr.map((opt) => {
    const o = tryParseJson(opt);
    if (Array.isArray(o)) return { id: o[0], param: o[1] };
    return null;
  }).filter(Boolean);
}

export function parseItems(raw) {
  const arr = tryParseJson(raw);
  if (!Array.isArray(arr)) return [];
  return arr.map((entry, slot) => {
    const item = tryParseJson(entry);
    if (!Array.isArray(item)) return { slot, empty: true };
    const templateId = Number(item[0]);
    return {
      slot,
      templateId,
      quantity: Number(item[1] ?? 0),
      options: parseItemOptions(item[2]),
      createTime: item[3] ?? 0,
      empty: templateId === -1,
    };
  });
}

export function parseTask(raw) {
  const arr = tryParseJson(raw);
  if (!Array.isArray(arr)) return {};
  return {
    taskId: arr[0],
    taskIndex: arr[1],
    taskCount: arr[2],
    taskLastTime: arr[3],
  };
}

export function parseSkills(raw) {
  const arr = tryParseJson(raw);
  if (!Array.isArray(arr)) return [];
  return arr.map((s, i) => {
    const skill = tryParseJson(s);
    if (Array.isArray(skill)) {
      return {
        slot: i,
        id: skill[0],
        point: skill[1],
        lastUse: skill[2],
        currLevel: skill[3] ?? 0,
      };
    }
    return { slot: i, raw: s };
  });
}

export function buildItemEntry(item) {
  if (item.empty || item.templateId === -1 || item.templateId == null) {
    return JSON.stringify([-1, 0, '[]', item.createTime || 0]);
  }
  const optStrings = (item.options || []).map((o) => JSON.stringify([Number(o.id), Number(o.param)]));
  return JSON.stringify([
    Number(item.templateId),
    Number(item.quantity ?? 1),
    JSON.stringify(optStrings),
    item.createTime || Date.now(),
  ]);
}

export function buildItemsFromParsed(parsedItems) {
  return JSON.stringify((parsedItems || []).map(buildItemEntry));
}

export function buildTask(current, updates) {
  const t = parseTask(current);
  const arr = [
    updates.taskId ?? t.taskId ?? 0,
    updates.taskIndex ?? t.taskIndex ?? 0,
    updates.taskCount ?? t.taskCount ?? 0,
    updates.taskLastTime ?? t.taskLastTime ?? 0,
  ];
  return JSON.stringify(arr);
}

export function buildSkillsFromList(skills) {
  const entries = (skills || []).map((s) => JSON.stringify([
    Number(s.id ?? 0),
    Number(s.point ?? 0),
    Number(s.lastUse ?? 0),
    Number(s.currLevel ?? 0),
  ]));
  return JSON.stringify(entries);
}

export function parseOptionsText(text) {
  if (!text || !String(text).trim()) return [];
  return String(text).split(',').map((part) => {
    const [id, param] = part.trim().split(':');
    const oid = Number(id);
    if (Number.isNaN(oid)) return null;
    return { id: oid, param: Number(param ?? 0) };
  }).filter(Boolean);
}

export function formatOptionsText(options) {
  return (options || []).map((o) => `${o.id}:${o.param}`).join(', ');
}

export function addItemToContainer(raw, newItem) {
  const items = parseItems(raw);
  let slot = items.findIndex((it) => it.empty);
  if (slot < 0) slot = items.length;
  while (items.length <= slot) {
    items.push({ slot: items.length, empty: true, templateId: -1, quantity: 0, options: [] });
  }
  items[slot] = {
    slot,
    templateId: Number(newItem.templateId ?? newItem.temp_id),
    quantity: Number(newItem.quantity ?? 1),
    options: newItem.options || [],
    createTime: Date.now(),
    empty: false,
  };
  return buildItemsFromParsed(items);
}

export function enrichPlayer(row, itemNames = {}) {
  const stats = parseDataPoint(row.data_point);
  const inventory = parseInventory(row.data_inventory);
  const location = parseLocation(row.data_location);
  const task = parseTask(row.data_task);

  const mapItems = (raw) => parseItems(raw).map((it) => ({
    ...it,
    name: itemNames[it.templateId] || (it.empty ? '—' : `#${it.templateId}`),
  }));

  return {
    ...row,
    power: stats.power ?? 0,
    tiemNang: stats.tiemNang ?? 0,
    stats,
    inventory,
    location,
    task,
    items_body: mapItems(row.items_body),
    items_bag: mapItems(row.items_bag),
    items_box: mapItems(row.items_box),
    skills: parseSkills(row.skills),
    pet: tryParseJson(row.pet),
    data_task_raw: tryParseJson(row.data_task),
    data_intrinsic: tryParseJson(row.data_intrinsic),
    data_side_task: tryParseJson(row.data_side_task),
    data_achievement: tryParseJson(row.data_achievement),
    genderLabel: row.gender === 0 ? 'Trái Đất' : row.gender === 1 ? 'Namek' : row.gender === 2 ? 'Xayda' : String(row.gender),
  };
}

export function parsePlayerPower(dataPoint) {
  return parseDataPoint(dataPoint).power ?? 0;
}

export function parsePlayerLocation(dataLocation) {
  return parseLocation(dataLocation);
}
