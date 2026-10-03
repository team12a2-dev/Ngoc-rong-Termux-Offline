import React, { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import ItemIcon from '../components/ItemIcon';
import { OptionEditor, formatOptionLabel, loadOptionCatalog } from '../components/OptionEditor';
import PageFeedback from '../components/PageFeedback';
import PageHeader from '../components/PageHeader';

const formatNumber = (num) => {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString('vi-VN');
};

const formatShortMoney = (num) => {
  if (!num) return '0';
  const n = Number(num);
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return `${n}`;
};

const SPIN_TYPES = [
  {
    key: 'gold',
    name: 'Vòng quay Vàng',
    badge: 'Vòng quay Vàng',
    color: '#10b981',
    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.28) 100%)',
    borderColor: '#10b981',
    currencyMode: 'gold',
    costGold: 5000000,
    costGem: 0,
    desc: 'Quay bằng Vàng (5.000.000 vàng/lượt). Biểu tượng 7 viên Ngọc Rồng Sao Đen.',
    defaultItems: [
      { tempId: 190, name: 'Túi Vàng (Random 500k ~ 2M)', iconId: 1226, chancePercent: 25.0, quantityMin: 500000, quantityMax: 2000000, isPermanent: true },
      { tempId: 372, name: 'Ngọc Rồng Sao Đen 1 Sao', iconId: 426, chancePercent: 1.0, isPermanent: true },
      { tempId: 373, name: 'Ngọc Rồng Sao Đen 2 Sao', iconId: 427, chancePercent: 2.0, isPermanent: true },
      { tempId: 374, name: 'Ngọc Rồng Sao Đen 3 Sao', iconId: 428, chancePercent: 4.0, isPermanent: true },
      { tempId: 375, name: 'Ngọc Rồng Sao Đen 4 Sao', iconId: 429, chancePercent: 6.0, isPermanent: true },
      { tempId: 376, name: 'Ngọc Rồng Sao Đen 5 Sao', iconId: 430, chancePercent: 10.0, isPermanent: true },
      { tempId: 377, name: 'Ngọc Rồng Sao Đen 6 Sao', iconId: 431, chancePercent: 14.0, isPermanent: true },
      { tempId: 378, name: 'Ngọc Rồng Sao Đen 7 Sao', iconId: 432, chancePercent: 18.0, isPermanent: true },
      { tempId: 457, name: 'Thỏi vàng', iconId: 4028, chancePercent: 10.0, quantityMin: 1, quantityMax: 3, isPermanent: true },
      { tempId: 381, name: 'Cuồng nộ', iconId: 2754, chancePercent: 10.0, quantityMin: 5, quantityMax: 10, isPermanent: true },
    ],
  },
  {
    key: 'default',
    name: 'Vòng quay May mắn',
    badge: 'Vòng quay May mắn',
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.28) 100%)',
    borderColor: '#f59e0b',
    currencyMode: 'gem',
    costGold: 0,
    costGem: 4,
    desc: 'Quay bằng Ngọc (4 ngọc/lượt). Biểu tượng 7 viên Ngọc Rồng truyền thuyết.',
    defaultItems: [
      { tempId: 190, name: 'Túi Vàng (Random 200k ~ 1M)', iconId: 1226, chancePercent: 30.0, quantityMin: 200000, quantityMax: 1000000, isPermanent: true },
      { tempId: 14, name: 'Ngọc Rồng 1 Sao', iconId: 14, chancePercent: 0.5, isPermanent: true },
      { tempId: 15, name: 'Ngọc Rồng 2 Sao', iconId: 15, chancePercent: 1.5, isPermanent: true },
      { tempId: 16, name: 'Ngọc Rồng 3 Sao', iconId: 16, chancePercent: 3.0, isPermanent: true },
      { tempId: 17, name: 'Ngọc Rồng 4 Sao', iconId: 17, chancePercent: 6.0, isPermanent: true },
      { tempId: 18, name: 'Ngọc Rồng 5 Sao', iconId: 18, chancePercent: 11.0, isPermanent: true },
      { tempId: 19, name: 'Ngọc Rồng 6 Sao', iconId: 19, chancePercent: 16.0, isPermanent: true },
      { tempId: 20, name: 'Ngọc Rồng 7 Sao', iconId: 20, chancePercent: 20.0, isPermanent: true },
      {
        tempId: 532, name: 'Cải trang Yardrat VIP', iconId: 5212, chancePercent: 2.0, isPermanent: false,
        options: [
          { id: 50, min: 20, max: 35, param: 20 },
          { id: 77, min: 15, max: 30, param: 15 },
          { id: 93, min: 1, max: 7, chancePermanent: 15, param: 3 }, // 15% vĩnh viễn, 85% hạn 1-7 ngày
        ],
      },
      { tempId: 223, name: 'Capsule đặc biệt', iconId: 408, chancePercent: 10.0, quantityMin: 1, quantityMax: 5, isPermanent: true },
    ],
  },
  {
    key: 'event_gold',
    name: 'Vòng quay Vàng Sự kiện',
    badge: 'Vòng quay Vàng Sự kiện',
    color: '#d97706',
    bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.22) 0%, rgba(180, 83, 9, 0.32) 100%)',
    borderColor: '#d97706',
    currencyMode: 'gold',
    costGold: 10000000,
    costGem: 0,
    desc: 'Vòng quay Vàng sự kiện mùa vụ đặc biệt, quà phong phú theo event.',
    defaultItems: [
      { tempId: 190, name: 'Túi Vàng Đại Gia (1M ~ 10M)', iconId: 1226, chancePercent: 30.0, quantityMin: 1000000, quantityMax: 10000000, isPermanent: true },
      { tempId: 372, name: 'Ngọc Rồng Sao Đen 1 Sao', iconId: 426, chancePercent: 2.0, isPermanent: true },
      { tempId: 373, name: 'Ngọc Rồng Sao Đen 2 Sao', iconId: 427, chancePercent: 5.0, isPermanent: true },
      { tempId: 457, name: 'Thỏi vàng x5', iconId: 4028, chancePercent: 15.0, quantityMin: 5, quantityMax: 10, isPermanent: true },
      { tempId: 382, name: 'Bổ huyết', iconId: 2755, chancePercent: 24.0, quantityMin: 10, quantityMax: 20, isPermanent: true },
      { tempId: 383, name: 'Bổ khí', iconId: 2756, chancePercent: 24.0, quantityMin: 10, quantityMax: 20, isPermanent: true },
    ],
  },
  {
    key: 'event_special',
    name: 'Vòng quay Đặc biệt Sự kiện',
    badge: 'Vòng quay Đặc biệt Sự kiện',
    color: '#8b5cf6',
    bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(109, 40, 217, 0.35) 100%)',
    borderColor: '#8b5cf6',
    currencyMode: 'both',
    costGold: 20000000,
    costGem: 20,
    desc: 'Vòng quay VIP Sự kiện cực phẩm: Cải trang hiếm, pet độc quyền, tỉ lệ trúng đồ giá trị cao.',
    defaultItems: [
      { tempId: 190, name: 'Kho Báu Vàng (5M ~ 30M Vàng)', iconId: 1226, chancePercent: 25.0, quantityMin: 5000000, quantityMax: 30000000, isPermanent: true },
      {
        tempId: 532, name: 'Cải trang Yardrat VIP', iconId: 5212, chancePercent: 5.0, isPermanent: false,
        options: [
          { id: 50, min: 25, max: 40, param: 25 },
          { id: 77, min: 20, max: 35, param: 20 },
          { id: 14, min: 5, max: 15, param: 5 },
          { id: 93, min: 3, max: 14, chancePermanent: 20, param: 3 }, // 20% vĩnh viễn, 80% hạn 3-14 ngày
        ],
      },
      {
        tempId: 861, name: 'Cải trang Goku Vô Cực', iconId: 9812, chancePercent: 2.0, isPermanent: false,
        options: [
          { id: 50, min: 30, max: 45, param: 30 },
          { id: 77, min: 25, max: 40, param: 25 },
          { id: 103, min: 25, max: 40, param: 25 },
          { id: 93, min: 7, max: 30, chancePermanent: 10, param: 7 }, // 10% vĩnh viễn, 90% hạn 7-30 ngày
        ],
      },
      { tempId: 14, name: 'Ngọc Rồng 1 Sao', iconId: 14, chancePercent: 8.0, isPermanent: true },
      { tempId: 15, name: 'Ngọc Rồng 2 Sao', iconId: 15, chancePercent: 12.0, isPermanent: true },
      { tempId: 457, name: 'Thỏi vàng x20', iconId: 4028, chancePercent: 23.0, quantityMin: 20, quantityMax: 50, isPermanent: true },
      { tempId: 223, name: 'Capsule đặc biệt x10', iconId: 408, chancePercent: 25.0, quantityMin: 10, quantityMax: 20, isPermanent: true },
    ],
  },
];

const PRESET_GOLD_ITEMS = [
  { name: '💰 Vàng Nhỏ: 100k ~ 500k', tempId: 190, iconId: 1226, min: 100000, max: 500000, chance: 30 },
  { name: '💰 Vàng Vừa: 500k ~ 2.000k (2M)', tempId: 190, iconId: 1226, min: 500000, max: 2000000, chance: 20 },
  { name: '💰 Vàng Khủng: 1M ~ 10M', tempId: 190, iconId: 1226, min: 1000000, max: 10000000, chance: 10 },
  { name: '💰 Đại Gia: 5M ~ 30M Vàng', tempId: 190, iconId: 1226, min: 5000000, max: 30000000, chance: 5 },
  { name: '🪙 Thỏi Vàng: 1 ~ 5 Thỏi (Item 457)', tempId: 457, iconId: 4028, min: 1, max: 5, chance: 15 },
  { name: '🪙 Rương Thỏi Vàng: 10 ~ 50 Thỏi', tempId: 457, iconId: 4028, min: 10, max: 50, chance: 5 },
];

const PRESET_OPTION_PACKS = [
  {
    name: '🔥 Sát Thương & Sức Đánh (Random 15%~35%)',
    desc: 'Sức đánh +[15~35]%, Chí mạng +[5~15]%',
    options: [
      { id: 50, min: 15, max: 35, param: 15 },
      { id: 14, min: 5, max: 15, param: 5 },
    ],
  },
  {
    name: '🛡️ Phòng Thủ Thép (Random Giáp & Kháng)',
    desc: 'Giáp +[500~2500], Kháng khống chế +[10~30]%',
    options: [
      { id: 47, min: 500, max: 2500, param: 500 },
      { id: 117, min: 10, max: 30, param: 10 },
    ],
  },
  {
    name: '❤️ Sinh Lực & Năng Lượng (Random HP / KI 15%~35%)',
    desc: 'HP +[15~35]%, KI +[15~35]%, Hút HP +[5~15]%',
    options: [
      { id: 77, min: 15, max: 35, param: 15 },
      { id: 103, min: 15, max: 35, param: 15 },
      { id: 95, min: 5, max: 15, param: 5 },
    ],
  },
  {
    name: '🌟 Sao Pha Lê & Tinh Túy (Random 1~7 Sao)',
    desc: 'Ép sao pha lê +[1~7] sao',
    options: [
      { id: 107, min: 1, max: 7, param: 1 },
      { id: 108, min: 1, max: 7, param: 1 },
    ],
  },
  {
    name: '👑 Siêu Phẩm Toàn Diện VIP (Full 5 Dòng)',
    desc: 'Sức đánh +[20~40]%, HP +[20~40]%, KI +[20~40]%, Chí mạng +[10~20]%, Giáp +[1000~3000]',
    options: [
      { id: 50, min: 20, max: 40, param: 20 },
      { id: 77, min: 20, max: 40, param: 20 },
      { id: 103, min: 20, max: 40, param: 20 },
      { id: 14, min: 10, max: 20, param: 10 },
      { id: 47, min: 1000, max: 3000, param: 1000 },
    ],
  },
];

const PRESET_ITEM_BUNDLES = [
  {
    name: '💰 Gói Phần Thưởng Vàng (100k ~ 5.000.000 Vàng)',
    ids: '190,457',
    desc: 'Item #190 (Vàng rơi ngẫu nhiên) & Item #457 (Thỏi vàng)',
  },
  {
    name: '🌟 Bộ 7 Viên Ngọc Rồng Sao Đen (1~7 Sao)',
    ids: '372,373,374,375,376,377,378',
    desc: 'ID: 372 -> 378 (Dùng cho Vòng quay Vàng)',
  },
  {
    name: '🔮 Bộ 7 Viên Ngọc Rồng Truyền Thuyết (1~7 Sao)',
    ids: '14,15,16,17,18,19,20',
    desc: 'ID: 14 -> 20 (Dùng cho Vòng quay May mắn)',
  },
  {
    name: '👗 Gói Cải Trang VIP Hot',
    ids: '532,861,710,457,1143',
    desc: 'Yardrat, Goku Vô Cực, Black Goku, Thỏ Đen, Cải trang mới',
  },
  {
    name: '🧪 Gói Tiêu Hao & Thần Dược Mở Rộng',
    ids: '381,382,383,384,385',
    desc: 'Cuồng nộ, Bổ huyết, Bổ khí, Giáp Xên, Ẩn danh',
  },
  {
    name: '💎 Gói Tài Nguyên & Capsule',
    ids: '457,223,77,539',
    desc: 'Thỏi vàng, Capsule đặc biệt, Ngọc rồng sao đen, Rương ngọc',
  },
];

const emptyItem = { tempId: '', name: '', iconId: 0, weight: 1, chancePercent: 10, quantityMin: 1, quantityMax: 1, options: [], durationDays: '', isPermanent: true, vipOnly: false, enabled: true, maxWins: '', sortOrder: 0 };
const emptyForm = {
  spinKey: 'default', name: 'Vòng quay May mắn', description: '', status: 'active', enabled: true,
  startsAt: '', endsAt: '', timezone: 'Asia/Ho_Chi_Minh', currencyMode: 'both', costGem: 4, costGold: 0,
  costTicket: 0, ticketTempId: '', dailyLimit: 100, previewJson: [], configJson: {}, items: [],
};

const numberInput = (value) => value === '' ? '' : Number(value);
const pick = (value, fallback = '') => value == null ? fallback : value;

function cleanConfig(config) {
  if (!config) return { ...emptyForm, items: [] };
  return {
    ...emptyForm, ...config,
    spinKey: pick(config.spin_key, config.spinKey),
    startsAt: String(pick(config.starts_at, config.startsAt) || '').slice(0, 16),
    endsAt: String(pick(config.ends_at, config.endsAt) || '').slice(0, 16),
    currencyMode: pick(config.currency_mode, config.currencyMode || 'both'),
    costGem: Number(pick(config.cost_gem, config.costGem ?? 4)),
    costGold: Number(pick(config.cost_gold, config.costGold ?? 0)),
    costTicket: Number(pick(config.cost_ticket, config.costTicket ?? 0)),
    ticketTempId: pick(config.ticket_temp_id, config.ticketTempId) ?? '',
    dailyLimit: Number(pick(config.daily_limit, config.dailyLimit ?? 100)),
    previewJson: config.previewJson || config.preview_json || [],
    configJson: config.configJson || config.config_json || {},
    items: (Array.isArray(config.items)
      ? config.items
      : (typeof config.items === 'string' ? (() => { try { const p = JSON.parse(config.items); return Array.isArray(p) ? p : []; } catch { return []; } })() : [])
    ).map((item) => ({
      ...emptyItem, ...item,
      tempId: Number(pick(item.temp_id, item.tempId)),
      weight: Number(pick(item.weight, 1)),
      chancePercent: Number(pick(item.chance_percent, item.chancePercent ?? item.weight ?? 1)),
      quantityMin: Number(pick(item.quantity_min, 1)),
      quantityMax: Number(pick(item.quantity_max, 1)),
      options: item.options || item.optionsJson || item.options_json || [],
      durationDays: pick(item.duration_days, item.durationDays) ?? '',
      isPermanent: item.is_permanent == null ? (item.isPermanent == null ? !item.duration_days : Boolean(item.isPermanent)) : Boolean(item.is_permanent),
      vipOnly: Boolean(pick(item.vip_only, item.vipOnly)),
      enabled: item.enabled == null ? true : Boolean(item.enabled),
      maxWins: pick(item.max_wins, item.maxWins) ?? '',
    })),
  };
}

export default function GodSpinPage() {
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState(cleanConfig());
  const [selectedId, setSelectedId] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [batchIds, setBatchIds] = useState('');
  const [poolSearch, setPoolSearch] = useState('');
  const [poolFilter, setPoolFilter] = useState('all');
  const [tab, setTab] = useState('pool');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ msg: '', type: 'success' });
  const [history, setHistory] = useState({ summary: { totalSpins: 0, playerCount: 0, configCount: 0 }, distribution: [], history: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 } });
  const [historyFilters, setHistoryFilters] = useState({ configId: '', player: '', from: '', to: '', page: 1, pageSize: 25 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [simRuns, setSimRuns] = useState(10000);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [optionMap, setOptionMap] = useState({});

  // DeepSeek AI Option Generator States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('deepseek_api_key') || '');
  const [aiModel, setAiModel] = useState('deepseek-chat');
  const [aiTheme, setAiTheme] = useState('super_vip');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiTargetIndex, setAiTargetIndex] = useState(null);

  useEffect(() => {
    loadOptionCatalog().then((c) => setOptionMap(c.map || {}));
  }, []);

  const fb = {
    clear: () => setFeedback({ msg: '', type: 'success' }),
    success: (msg) => setFeedback({ msg, type: 'success' }),
    error: (msg) => setFeedback({ msg, type: 'error' }),
  };

  async function load() {
    try {
      const result = await api(`/god-spin?serverId=${getServerId()}`);
      setConfigs(result.data || []);
    } catch (error) {
      fb.error(error.message);
    }
  }

  async function openConfig(id) {
    try {
      const result = await api(`/god-spin/${id}?serverId=${getServerId()}`);
      setSelectedId(id);
      setForm(cleanConfig(result.data));
      setTab('pool');
    } catch (error) {
      fb.error(error.message);
    }
  }

  function applySpinTypePreset(spinType) {
    const existing = configs.find((c) => (c.spin_key || c.spinKey || '').toLowerCase() === spinType.key.toLowerCase());
    if (existing) {
      openConfig(existing.id);
      fb.success(`Đã mở cấu hình có sẵn cho "${spinType.name}" (#${existing.id}).`);
      return;
    }
    setSelectedId(null);
    setForm({
      ...emptyForm,
      spinKey: spinType.key,
      name: spinType.name,
      description: spinType.desc,
      currencyMode: spinType.currencyMode,
      costGold: spinType.costGold,
      costGem: spinType.costGem,
      items: (spinType.defaultItems || []).map((item, idx) => ({
        ...emptyItem,
        ...item,
        sortOrder: idx,
      })),
    });
    setTab('pool');
    fb.success(`Đã tạo mẫu chuẩn cho "${spinType.name}".`);
  }

  async function loadHistory(page = historyFilters.page, filters = historyFilters) {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ serverId: String(getServerId()), page: String(page), pageSize: String(filters.pageSize) });
      if (filters.configId) params.set('configId', filters.configId);
      if (filters.player.trim()) params.set('player', filters.player.trim());
      if (filters.from) params.set('from', filters.from.replace('T', ' '));
      if (filters.to) params.set('to', filters.to.replace('T', ' '));
      const result = await api(`/god-spin/history?${params.toString()}`);
      setHistory(result.data || { summary: { totalSpins: 0, playerCount: 0, configCount: 0 }, distribution: [], history: [], pagination: { page, pageSize: filters.pageSize, total: 0, totalPages: 1 } });
      setHistoryFilters((current) => ({ ...current, page }));
    } catch (error) {
      fb.error(error.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'history') loadHistory(1); }, [tab]);

  // Real-time catalog search when typing
  useEffect(() => {
    if (!catalogQuery.trim()) {
      setCatalog([]);
      return undefined;
    }
    setCatalogLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api(`/god-spin/catalog?q=${encodeURIComponent(catalogQuery.trim())}&limit=40`);
        setCatalog(result.data || []);
      } catch (error) {
        fb.error(error.message);
      } finally {
        setCatalogLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [catalogQuery]);

  const totalChance = useMemo(() => form.items.filter((item) => item.enabled).reduce((sum, item) => sum + Math.max(0, Number(item.chancePercent ?? item.weight) || 0), 0), [form.items]);
  const enabledCount = useMemo(() => form.items.filter((item) => item.enabled).length, [form.items]);

  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const patchItem = (index, value) => setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item) }));
  const removeItem = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));

  function addCatalogItem(item) {
    if (form.items.some((reward) => Number(reward.tempId) === Number(item.id))) {
      fb.error(`Item #${item.id} (${item.name}) đã có trong vòng quay.`);
      return;
    }
    const isGold = Number(item.id) === 190 || Number(item.id) === 188 || Number(item.id) === 189;
    patch('items', [
      ...form.items,
      {
        ...emptyItem,
        tempId: Number(item.id),
        name: item.name,
        iconId: Number(item.iconId || 0),
        quantityMin: isGold ? 500000 : 1,
        quantityMax: isGold ? 2000000 : 1,
        sortOrder: form.items.length,
      },
    ]);
    fb.success(`Đã thêm "${item.name}" (#${item.id}) vào vòng quay!`);
  }

  function addGoldReward(preset) {
    const newItem = {
      ...emptyItem,
      tempId: preset.tempId || 190,
      name: preset.name || 'Vàng ngẫu nhiên',
      iconId: preset.iconId || 1226,
      quantityMin: preset.min,
      quantityMax: preset.max,
      chancePercent: preset.chance || 20,
      weight: (preset.chance || 20) * 10000,
      isPermanent: true,
      sortOrder: form.items.length,
    };
    patch('items', [...form.items, newItem]);
    fb.success(`Đã thêm phần thưởng Vàng (${formatShortMoney(preset.min)} ~ ${formatShortMoney(preset.max)} Vàng) vào pool!`);
  }

  async function addBatchIds(idsString) {
    const list = String(idsString || '').split(/[, \s\n]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 0);
    if (!list.length) {
      fb.error('Vui lòng nhập ít nhất một ID vật phẩm hợp lệ.');
      return;
    }
    try {
      const res = await api(`/god-spin/catalog?ids=${list.join(',')}`);
      const itemsToAdd = res.data || [];
      if (!itemsToAdd.length) {
        fb.error('Không tìm thấy template vật phẩm nào khớp với danh sách ID.');
        return;
      }
      const existingIds = new Set(form.items.map((it) => Number(it.tempId)));
      const newItems = itemsToAdd
        .filter((it) => !existingIds.has(Number(it.id)))
        .map((it, idx) => ({
          ...emptyItem,
          tempId: Number(it.id),
          name: it.name,
          iconId: Number(it.iconId || 0),
          quantityMin: Number(it.id) === 190 ? 500000 : 1,
          quantityMax: Number(it.id) === 190 ? 2000000 : 1,
          sortOrder: form.items.length + idx,
        }));

      if (!newItems.length) {
        fb.error('Tất cả các item trong danh sách đã có trong pool.');
        return;
      }

      patch('items', [...form.items, ...newItems]);
      setBatchIds('');
      fb.success(`Đã thêm ${newItems.length} item mới vào pool vòng quay!`);
    } catch (err) {
      fb.error(err.message);
    }
  }

  function autoNormalizeChances() {
    const enabledItems = form.items.filter((item) => item.enabled);
    if (!enabledItems.length) {
      fb.error('Không có item nào đang bật để cân bằng.');
      return;
    }
    const currentSum = enabledItems.reduce((sum, it) => sum + (Number(it.chancePercent) || 0), 0);
    if (currentSum <= 0) {
      const equalShare = Number((100 / enabledItems.length).toFixed(4));
      patch('items', form.items.map((it) => it.enabled ? { ...it, chancePercent: equalShare, weight: Math.max(1, Math.round(equalShare * 10000)) } : it));
      fb.success(`Đã chia đều tỷ lệ (${equalShare}% mỗi món) cho ${enabledItems.length} item!`);
      return;
    }
    const factor = 100 / currentSum;
    let runningSum = 0;
    const newItems = form.items.map((it) => {
      if (!it.enabled) return it;
      let scaled = Number(((Number(it.chancePercent) || 0) * factor).toFixed(4));
      runningSum += scaled;
      return {
        ...it,
        chancePercent: scaled,
        weight: Math.max(1, Math.round(scaled * 10000)),
      };
    });
    const lastEnabledIdx = newItems.map((it, idx) => it.enabled ? idx : -1).filter((idx) => idx >= 0).pop();
    if (lastEnabledIdx != null && Math.abs(100 - runningSum) > 0.0001) {
      const diff = 100 - runningSum;
      newItems[lastEnabledIdx].chancePercent = Number((newItems[lastEnabledIdx].chancePercent + diff).toFixed(4));
    }
    patch('items', newItems);
    fb.success('Đã tự động cân bằng tỷ lệ tất cả item đang bật tròn 100.0000%!');
  }

  function applyPresetOptions(itemIndex, pack) {
    const item = form.items[itemIndex];
    if (!item) return;
    const merged = [...(item.options || [])];
    pack.options.forEach((opt) => {
      const existIdx = merged.findIndex((o) => o.id === opt.id);
      if (existIdx >= 0) {
        merged[existIdx] = { ...merged[existIdx], ...opt };
      } else {
        merged.push({ ...opt });
      }
    });
    patchItem(itemIndex, { options: merged });
    fb.success(`Đã áp dụng "${pack.name}" cho ${item.name || `Item #${item.tempId}`}!`);
  }

  function setItemDurationMode(itemIndex, mode, values = {}) {
    const item = form.items[itemIndex];
    if (!item) return;
    let newOptions = (item.options || []).filter((o) => o.id !== 93);
    let patchData = {};

    if (mode === 'permanent') {
      patchData = { isPermanent: true, durationDays: '', options: newOptions };
    } else if (mode === 'fixed_days') {
      const days = Number(values.durationDays ?? item.durationDays ?? 7) || 7;
      patchData = {
        isPermanent: false,
        durationDays: days,
        options: [...newOptions, { id: 93, param: days }],
      };
    } else if (mode === 'random_days') {
      const min = Number(values.minDays ?? 1) || 1;
      const max = Number(values.maxDays ?? 7) || 7;
      patchData = {
        isPermanent: false,
        durationDays: min,
        options: [...newOptions, { id: 93, min, max, param: min }],
      };
    } else if (mode === 'chance_permanent') {
      const chance = Number(values.chancePermanent ?? 10) || 10;
      const min = Number(values.minDays ?? 1) || 1;
      const max = Number(values.maxDays ?? 7) || 7;
      patchData = {
        isPermanent: false,
        durationDays: min,
        options: [...newOptions, { id: 93, min, max, chancePermanent: chance, param: min }],
      };
    }
    patchItem(itemIndex, patchData);
  }

  function getItemDurationInfo(item) {
    const opt93 = (item.options || []).find((o) => o.id === 93);
    if (opt93) {
      if (opt93.chancePermanent != null && Number(opt93.chancePermanent) > 0) {
        return {
          mode: 'chance_permanent',
          chancePermanent: Number(opt93.chancePermanent),
          minDays: opt93.min ?? 1,
          maxDays: opt93.max ?? 7,
          label: `🎲 ${opt93.chancePermanent}% Vĩnh viễn (hoặc ${opt93.min ?? 1}~${opt93.max ?? 7} ngày)`,
        };
      }
      if (opt93.min != null && opt93.max != null && opt93.min !== opt93.max) {
        return {
          mode: 'random_days',
          minDays: opt93.min,
          maxDays: opt93.max,
          label: `⏱️ Random ${opt93.min} ~ ${opt93.max} ngày`,
        };
      }
      return {
        mode: 'fixed_days',
        durationDays: opt93.param ?? opt93.min ?? item.durationDays ?? 7,
        label: `⏱️ Hạn ${opt93.param ?? opt93.min ?? item.durationDays ?? 7} ngày`,
      };
    }
    if (item.isPermanent) {
      return { mode: 'permanent', label: '🌟 Vĩnh viễn 100%' };
    }
    return {
      mode: 'fixed_days',
      durationDays: item.durationDays || 7,
      label: `⏱️ Hạn ${item.durationDays || 7} ngày`,
    };
  }

  function bulkToggle(action) {
    if (action === 'enable_all') {
      patch('items', form.items.map((it) => ({ ...it, enabled: true })));
      fb.success('Đã bật tất cả item trong pool.');
    } else if (action === 'disable_all') {
      patch('items', form.items.map((it) => ({ ...it, enabled: false })));
      fb.success('Đã tắt tất cả item trong pool.');
    } else if (action === 'permanent_all') {
      patch('items', form.items.map((it) => ({ ...it, isPermanent: true, durationDays: '', options: (it.options || []).filter((o) => o.id !== 93) })));
      fb.success('Đã chuyển toàn bộ item thành Vĩnh viễn.');
    } else if (action === 'divide_equal') {
      if (form.items.length) {
        const share = Number((100 / form.items.length).toFixed(4));
        patch('items', form.items.map((item) => ({ ...item, weight: 1, chancePercent: share })));
        fb.success(`Đã chia đều ${share}% cho toàn bộ ${form.items.length} item.`);
      }
    }
  }

  function duplicateItem(index) {
    const source = form.items[index];
    patch('items', [...form.items, { ...source, name: `${source.name || 'Item'} — bản sao`, sortOrder: form.items.length }]);
    fb.success('Đã nhân bản item.');
  }

  function moveItem(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= form.items.length) return;
    const items = [...form.items];
    [items[index], items[next]] = [items[next], items[index]];
    patch('items', items.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })));
  }

  function autoSortItems(mode) {
    if (!form.items.length) {
      fb.error('Pool chưa có item nào để sắp xếp.');
      return;
    }
    let sorted = [...form.items];
    if (mode === 'random_shuffle') {
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
      patch('items', sorted.map((item, idx) => ({ ...item, sortOrder: idx })));
      fb.success(`🎲 Đã xáo trộn ngẫu nhiên toàn bộ ${sorted.length} item trong pool!`);
    } else if (mode === 'chance_desc') {
      sorted.sort((a, b) => (Number(b.chancePercent) || 0) - (Number(a.chancePercent) || 0));
      patch('items', sorted.map((item, idx) => ({ ...item, sortOrder: idx })));
      fb.success('📈 Đã sắp xếp theo Tỷ lệ % từ Cao xuống Thấp.');
    } else if (mode === 'chance_asc') {
      sorted.sort((a, b) => (Number(a.chancePercent) || 0) - (Number(b.chancePercent) || 0));
      patch('items', sorted.map((item, idx) => ({ ...item, sortOrder: idx })));
      fb.success('📉 Đã sắp xếp theo Tỷ lệ % từ Thấp lên Cao (Jackpot / Hiếm lên đầu).');
    } else if (mode === 'id_asc') {
      sorted.sort((a, b) => Number(a.tempId) - Number(b.tempId));
      patch('items', sorted.map((item, idx) => ({ ...item, sortOrder: idx })));
      fb.success('🔢 Đã sắp xếp theo ID Template tăng dần.');
    } else if (mode === 'type_category') {
      const getCategoryScore = (item) => {
        const id = Number(item.tempId || 0);
        const name = String(item.name || '').toLowerCase();
        if (name.includes('cải trang') || name.includes('trang phục')) return 1;
        if (name.includes('áo') || name.includes('quần') || name.includes('găng') || name.includes('giày') || name.includes('rada')) return 2;
        if ((id >= 14 && id <= 20) || (id >= 372 && id <= 378) || name.includes('ngọc rồng')) return 3;
        if (id === 190 || id === 457 || name.includes('vàng')) return 4;
        if (name.includes('cuồng nộ') || name.includes('bổ huyết') || name.includes('bổ khí') || name.includes('capsule')) return 5;
        return 6;
      };
      sorted.sort((a, b) => getCategoryScore(a) - getCategoryScore(b) || Number(a.tempId) - Number(b.tempId));
      patch('items', sorted.map((item, idx) => ({ ...item, sortOrder: idx })));
      fb.success('🏷️ Đã tự động phân loại và sắp xếp theo nhóm vật phẩm (Cải trang -> Ngọc rồng -> Vàng -> Dược phẩm)!');
    }
  }

  function openAiModal(targetIndex = null) {
    if (!form.items.length) {
      fb.error('Pool đang trống. Hãy thêm ít nhất 1 item trước khi gọi AI.');
      return;
    }
    setAiTargetIndex(targetIndex);
    setAiResult(null);
    setAiModalOpen(true);
  }

  async function runAiGeneration(targetIndex = aiTargetIndex) {
    const targetItems = targetIndex != null ? [form.items[targetIndex]] : form.items;
    if (!targetItems.length || !targetItems[0]) {
      fb.error('Chưa có item nào để AI phân tích.');
      return;
    }
    setAiLoading(true);
    setAiTargetIndex(targetIndex);
    if (aiApiKey.trim()) {
      localStorage.setItem('deepseek_api_key', aiApiKey.trim());
    }
    try {
      const res = await api('/god-spin/ai-generate-options', {
        method: 'POST',
        body: JSON.stringify({
          items: targetItems,
          prompt: aiPrompt,
          apiKey: aiApiKey.trim(),
          model: aiModel,
          theme: aiTheme,
        }),
      });
      setAiResult(res.data);
      fb.success(`✨ DeepSeek AI đã hoàn tất suy luận cho ${targetItems.length} item!`);
    } catch (err) {
      fb.error(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiResultToForm() {
    if (!aiResult || !Array.isArray(aiResult.items)) return;
    const aiMap = new Map();
    aiResult.items.forEach((item) => {
      aiMap.set(Number(item.tempId), item);
    });

    const updated = form.items.map((item, idx) => {
      if (aiTargetIndex != null && idx !== aiTargetIndex) return item;
      const aiItem = aiMap.get(Number(item.tempId));
      if (!aiItem) return item;

      let newOptions = Array.isArray(aiItem.options) ? aiItem.options : [];
      let isPermanent = true;
      let durationDays = '';

      const opt93 = newOptions.find((o) => Number(o.id) === 93);
      if (opt93) {
        if (opt93.chancePermanent != null && Number(opt93.chancePermanent) > 0) {
          isPermanent = false;
          durationDays = opt93.min ?? 1;
        } else {
          isPermanent = false;
          durationDays = opt93.param ?? opt93.min ?? 7;
        }
      }

      return {
        ...item,
        options: newOptions,
        isPermanent,
        durationDays,
      };
    });

    patch('items', updated);
    setAiModalOpen(false);
    setAiResult(null);
    fb.success(`🎉 Đã áp dụng toàn bộ Option & Thời hạn do DeepSeek AI suy luận vào Vòng Quay!`);
  }

  async function runSimulation() {
    setSimLoading(true);
    try {
      const res = await api('/god-spin/simulate', {
        method: 'POST',
        body: JSON.stringify({
          items: form.items,
          runs: simRuns,
          costGold: form.costGold,
          costGem: form.costGem,
        }),
      });
      setSimResult(res.data);
      fb.success('Đã hoàn thành mô phỏng xác suất quay!');
    } catch (err) {
      fb.error(err.message);
    } finally {
      setSimLoading(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!form.items.length) {
      fb.error('Hãy thêm ít nhất một item vào vòng quay.');
      setTab('pool');
      return;
    }
    if (!totalChance) {
      fb.error('Cần ít nhất một item đang bật có tỷ lệ % > 0.');
      setTab('pool');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, serverId: getServerId(), items: form.items.map(({ name, iconId, ...item }) => item) };
      const result = await api(selectedId ? `/god-spin/${selectedId}` : '/god-spin', { method: selectedId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const id = selectedId || result.data?.id;
      fb.success(`Đã lưu thành công cấu hình và ${form.items.length} item (bao gồm Option & Hạn ngày) vào Database MySQL! Server game đã tự động reload.`);
      await load();
      if (id) await openConfig(id);
    } catch (error) {
      fb.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(status) {
    if (!selectedId) return;
    try {
      await api(`/god-spin/${selectedId}/status`, { method: 'POST', body: JSON.stringify({ serverId: getServerId(), status }) });
      fb.success(`Đã chuyển vòng quay sang "${status}" và đồng bộ runtime.`);
      await load();
      await openConfig(selectedId);
    } catch (error) {
      fb.error(error.message);
    }
  }

  async function remove() {
    if (!selectedId || !window.confirm('Xóa cấu hình và toàn bộ item vòng quay trong SQL?')) return;
    try {
      await api(`/god-spin/${selectedId}?serverId=${getServerId()}`, { method: 'DELETE' });
      fb.success('Đã xóa cấu hình God Spin.');
      setSelectedId(null);
      setForm(cleanConfig());
      await load();
    } catch (error) {
      fb.error(error.message);
    }
  }

  const filteredPoolItems = useMemo(() => {
    return form.items.filter((item) => {
      if (poolFilter === 'enabled' && !item.enabled) return false;
      if (poolFilter === 'disabled' && item.enabled) return false;
      if (poolFilter === 'permanent' && !item.isPermanent) return false;
      if (poolFilter === 'vip' && !item.vipOnly) return false;
      if (poolSearch.trim()) {
        const q = poolSearch.toLowerCase();
        return String(item.tempId).includes(q) || (item.name && item.name.toLowerCase().includes(q));
      }
      return true;
    });
  }, [form.items, poolFilter, poolSearch]);

  return (
    <div>
      <PageHeader
        title="Quản Lý Vòng Quay Thượng Đế (God Spin)"
        description="Quản lý 4 chế độ vòng quay, tìm kiếm item từ DB game, tùy chỉnh tỷ lệ Vĩnh viễn / Hạn ngày ngẫu nhiên, tạo Option ngẫu nhiên và nạp gói item mẫu."
        stats={
          <>
            <span className="page-stat-pill"><strong>{configs.length}</strong> vòng quay</span>
            <span className="page-stat-pill ok"><strong>{enabledCount}</strong>/{form.items.length} item bật</span>
            <span className="page-stat-pill" style={{ borderColor: totalChance === 100 ? '#10b981' : '#f59e0b' }}>
              <strong>{totalChance.toFixed(4)}%</strong> tổng tỷ lệ
            </span>
          </>
        }
        actions={
          <div className="button-row">
            <button type="button" className="btn" onClick={() => { setJsonText(JSON.stringify(form.items, null, 2)); setJsonModalOpen(true); }}>
              📋 Import / Export JSON
            </button>
            <button className="btn primary" onClick={() => { setSelectedId(null); setForm(cleanConfig()); setTab('pool'); }}>
              + Tạo vòng quay mới
            </button>
          </div>
        }
      />

      <PageFeedback msg={feedback.msg} type={feedback.type} onDismiss={fb.clear} />

      {/* 4 Spin Types Quick Selector / Switcher */}
      <div className="card section" style={{ marginBottom: '16px', padding: '16px' }}>
        <div className="section-title" style={{ marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px' }}>🎮 4 Chế Độ Vòng Quay Chuẩn Giao Diện Game</h4>
            <p className="card-hint" style={{ margin: '4px 0 0 0' }}>Bấm vào để chuyển nhanh sang vòng quay tương ứng hoặc tạo mới ngay từ mẫu chuẩn.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {SPIN_TYPES.map((st) => {
            const isMatched = (form.spinKey || '').toLowerCase() === st.key.toLowerCase();
            const existingConfig = configs.find((c) => (c.spin_key || c.spinKey || '').toLowerCase() === st.key.toLowerCase());

            return (
              <div
                key={st.key}
                onClick={() => applySpinTypePreset(st)}
                style={{
                  background: st.bg,
                  border: `2px solid ${isMatched ? st.borderColor : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isMatched ? `0 0 12px ${st.color}40` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ color: '#fff', fontSize: '15px' }}>{st.name}</strong>
                  <span className="badge" style={{ background: st.color, color: '#000', fontWeight: 'bold' }}>
                    {existingConfig ? `Đang có (#${existingConfig.id})` : 'Tạo mới'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                  {st.desc}
                </p>
                <div style={{ fontSize: '11px', opacity: 0.9, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Chi phí: <strong>{st.costGold ? `${formatShortMoney(st.costGold)} Vàng` : `${st.costGem} Ngọc`}</strong></span>
                  <span>Mã: <code>{st.key}</code></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="events-layout god-spin-layout">
        <aside className="card section events-list">
          <div className="section-title">
            <h3>Cấu hình SQL ({configs.length})</h3>
            <button className="btn sm" onClick={load}>Refresh</button>
          </div>
          {configs.length === 0 && <p className="muted">Chưa có cấu hình trong DB. Hãy chọn một trong 4 mẫu phía trên để bắt đầu.</p>}
          {configs.map((config) => (
            <button
              type="button"
              key={config.id}
              className={`event-list-item ${selectedId === config.id ? 'active' : ''}`}
              onClick={() => openConfig(config.id)}
            >
              <span>
                <strong>{config.name}</strong>
                <small>{config.spin_key} · {config.itemCount ?? config.item_count ?? 0} item</small>
              </span>
              <span className={`badge ${config.status === 'active' ? 'ok' : config.status === 'draft' ? 'warn' : ''}`}>
                {config.status}
              </span>
            </button>
          ))}
        </aside>

        <form className="card section event-editor" onSubmit={save}>
          <div className="section-title">
            <div>
              <h3>{selectedId ? `Sửa vòng quay #${selectedId}: ${form.name}` : 'Tạo cấu hình vòng quay mới'}</h3>
              <p className="card-hint">
                🗄️ Dữ liệu lưu trực tiếp vào Database MySQL (Bảng <code>panel_god_spin_configs</code> & <code>panel_god_spin_items</code>). Game server tự động reload ngay lập tức!
              </p>
            </div>
            <div className="button-row">
              <button type="submit" className="btn primary" disabled={loading} style={{ fontWeight: 'bold' }}>
                {loading ? '⏳ Đang lưu...' : '💾 Lưu Vào Database MySQL'}
              </button>
              {selectedId && (
                <>
                  <button type="button" className="btn sm" onClick={() => changeStatus('active')}>Bật</button>
                  <button type="button" className="btn sm" onClick={() => changeStatus('paused')}>Tạm dừng</button>
                  <button type="button" className="btn sm danger" onClick={remove}>Xóa</button>
                </>
              )}
            </div>
          </div>

          <div className="editor-tabs">
            <button type="button" className={`tab ${tab === 'pool' ? 'active' : ''}`} onClick={() => setTab('pool')}>
              🎁 Pool Item ({form.items.length})
            </button>
            <button type="button" className={`tab ${tab === 'presets' ? 'active' : ''}`} onClick={() => setTab('presets')}>
              ⚡ Gói Item & Option Mẫu
            </button>
            <button type="button" className={`tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>
              ⚙️ Giá, Lịch & Tiền Tệ
            </button>
            <button type="button" className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
              📊 Lịch Sử Quay Thật
            </button>
            <button type="button" className={`tab ${tab === 'simulator' ? 'active' : ''}`} onClick={() => setTab('simulator')}>
              🎲 Giả Lập Xác Suất (Simulator)
            </button>
          </div>

          {/* TAB 1: POOL ITEMS */}
          {tab === 'pool' && (
            <>
              {/* Pool Status */}
              <div className="spin-summary">
                <div><strong>{form.items.length}</strong><span>item trong pool</span></div>
                <div><strong>{enabledCount}</strong><span>item đang bật</span></div>
                <div><strong style={{ color: totalChance === 100 ? '#10b981' : '#f59e0b' }}>{totalChance.toFixed(4)}%</strong><span>tổng tỷ lệ</span></div>
                <div><strong>{totalChance === 100 ? '100% Chuẩn' : 'Tự chuẩn hóa'}</strong><span>trạng thái tỷ lệ</span></div>
              </div>

              {/* ALWAYS-VISIBLE LIVE ITEM SEARCH & INSTANT ADD TO SPIN */}
              <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.22) 100%)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🔍</span>
                    <div>
                      <strong style={{ color: '#93c5fd', fontSize: '14px' }}>Tìm Kiếm Tên / ID Item Từ DB Game Để Thêm Vào Vòng Quay:</strong>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                        Gõ tên (cải trang, sao đen, vàng, capsule...) hoặc ID để tìm và bấm <strong>+ Thêm vào vòng quay</strong>.
                      </p>
                    </div>
                  </div>
                  {catalogQuery && (
                    <button type="button" className="btn sm" onClick={() => setCatalogQuery('')} style={{ fontSize: '11px' }}>
                      ✕ Xóa tìm kiếm
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    style={{ width: '100%', padding: '10px 14px', fontSize: '14px', background: 'rgba(0,0,0,0.4)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#fff' }}
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    placeholder="Nhập tên item hoặc ID để tìm: Cải trang, sao đen, thỏi vàng, cuồng nộ, 190, 532, 372..."
                  />
                  {catalogLoading && <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '12px', color: '#93c5fd' }}>Đang tìm...</span>}
                </div>

                {/* Quick search chips */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Gợi ý nhanh:</span>
                  {['Vàng', 'Cải trang', 'Sao đen', 'Capsule', 'Cuồng nộ', 'Bổ huyết', 'Ngọc rồng', 'Thỏi vàng'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="btn sm"
                      style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(255,255,255,0.06)' }}
                      onClick={() => setCatalogQuery(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Live Search Results List */}
                {catalogQuery.trim() && (
                  <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '10px', maxHeight: '280px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {catalog.length === 0 && !catalogLoading ? (
                      <p className="muted" style={{ margin: '8px 0', textAlign: 'center', fontSize: '13px' }}>
                        Không tìm thấy template vật phẩm nào khớp với "{catalogQuery}". Thử từ khóa khác hoặc nhập trực tiếp ID bên dưới.
                      </p>
                    ) : (
                      <div className="spin-catalog-results" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                        {catalog.map((item) => (
                          <button
                            type="button"
                            className="spin-catalog-item"
                            key={item.id}
                            onClick={() => addCatalogItem(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', textAlign: 'left', cursor: 'pointer' }}
                          >
                            <ItemIcon iconId={item.iconId} tempId={item.id} name={item.name} size={36} />
                            <span style={{ flex: 1 }}>
                              <strong style={{ display: 'block', fontSize: '13px', color: '#fff' }}>{item.name}</strong>
                              <small style={{ color: '#93c5fd', fontSize: '11px' }}>ID: #{item.id} · Level {item.level ?? 0}</small>
                            </span>
                            <b style={{ color: '#10b981', fontSize: '12px' }}>+ Thêm</b>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Gold Addition Banner */}
              <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.22) 100%)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>💰</span>
                    <div>
                      <strong style={{ color: '#fbbf24', fontSize: '13px' }}>Thêm Nhanh Phần Thưởng Vàng (Item #190 & #457):</strong>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                        Thiết lập <strong>SL tối thiểu (Min)</strong> đến <strong>SL tối đa (Max)</strong> để người chơi quay ra lượng vàng ngẫu nhiên.
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {PRESET_GOLD_ITEMS.map((g, gIdx) => (
                    <button
                      key={gIdx}
                      type="button"
                      className="btn sm"
                      style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.25)', borderColor: '#f59e0b', color: '#fff' }}
                      onClick={() => addGoldReward(g)}
                    >
                      + {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pool Toolbar */}
              <div className="card-inner" style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div className="button-row" style={{ flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => openAiModal(null)}
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                        borderColor: '#8b5cf6',
                        color: '#fff',
                        fontWeight: 'bold',
                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)',
                      }}
                    >
                      🧠 DeepSeek AI Gắn Option & Suy Luận
                    </button>
                    <button type="button" className="btn" onClick={autoNormalizeChances} style={{ borderColor: '#10b981', color: '#10b981' }}>
                      ⚖️ Cân bằng tròn 100%
                    </button>
                    <button type="button" className="btn" onClick={() => bulkToggle('divide_equal')}>
                      Chia đều %
                    </button>
                  </div>
                  <div className="button-row">
                    <button type="button" className="btn sm" onClick={() => bulkToggle('enable_all')}>Bật tất cả</button>
                    <button type="button" className="btn sm" onClick={() => bulkToggle('disable_all')}>Tắt tất cả</button>
                    <button type="button" className="btn sm" onClick={() => bulkToggle('permanent_all')}>Vĩnh viễn tất cả</button>
                  </div>
                </div>

                {/* Random Auto-Sorting Toolbar */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🎲 Tự Động Sắp Xếp:
                  </span>
                  <button type="button" className="btn sm" onClick={() => autoSortItems('random_shuffle')} style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8', color: '#fff' }}>
                    🎲 Xáo trộn ngẫu nhiên
                  </button>
                  <button type="button" className="btn sm" onClick={() => autoSortItems('chance_desc')} style={{ fontSize: '11px' }}>
                    📈 Tỷ lệ % Cao → Thấp
                  </button>
                  <button type="button" className="btn sm" onClick={() => autoSortItems('chance_asc')} style={{ fontSize: '11px' }}>
                    📉 Tỷ lệ % Thấp → Cao (Jackpot)
                  </button>
                  <button type="button" className="btn sm" onClick={() => autoSortItems('type_category')} style={{ fontSize: '11px' }}>
                    🏷️ Theo Nhóm (Cải trang/Ngọc rồng/Vàng)
                  </button>
                  <button type="button" className="btn sm" onClick={() => autoSortItems('id_asc')} style={{ fontSize: '11px' }}>
                    🔢 Theo ID tăng dần
                  </button>
                </div>

                {/* Batch Add Items Box */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    placeholder="Nhập danh sách ID thêm nhanh: 190, 372, 373, 374, 457, 532..."
                    value={batchIds}
                    onChange={(e) => setBatchIds(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                  />
                  <button type="button" className="btn sm primary" onClick={() => addBatchIds(batchIds)}>
                    + Thêm hàng loạt ID
                  </button>
                </div>
              </div>

              {/* Filter and Search in current pool */}
              {form.items.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <input
                    placeholder="Lọc item trong pool hiện tại (tên hoặc ID)..."
                    value={poolSearch}
                    onChange={(e) => setPoolSearch(e.target.value)}
                    style={{ maxWidth: '320px', padding: '6px 10px', fontSize: '13px' }}
                  />
                  <div className="category-tabs" style={{ margin: 0 }}>
                    <button type="button" className={`tab ${poolFilter === 'all' ? 'active' : ''}`} onClick={() => setPoolFilter('all')}>Tất cả ({form.items.length})</button>
                    <button type="button" className={`tab ${poolFilter === 'enabled' ? 'active' : ''}`} onClick={() => setPoolFilter('enabled')}>Đang bật ({enabledCount})</button>
                    <button type="button" className={`tab ${poolFilter === 'permanent' ? 'active' : ''}`} onClick={() => setPoolFilter('permanent')}>Vĩnh viễn</button>
                    <button type="button" className={`tab ${poolFilter === 'vip' ? 'active' : ''}`} onClick={() => setPoolFilter('vip')}>VIP</button>
                  </div>
                </div>
              )}

              {form.items.length === 0 && (
                <div className="empty-state">
                  <h4>Pool đang trống</h4>
                  <p>Hãy gõ tên vật phẩm vào ô tìm kiếm phía trên hoặc mở tab "⚡ Gói Item & Option Mẫu" để nạp bộ item chuẩn chỉ với 1 click.</p>
                </div>
              )}

              {/* Item List */}
              {filteredPoolItems.map((item) => {
                const index = form.items.indexOf(item);
                const chance = Number(item.chancePercent ?? item.weight ?? 0);
                const percentage = totalChance && item.enabled ? ((chance / totalChance) * 100) : 0;
                const rarityColor = percentage < 1 ? '#ef4444' : percentage < 5 ? '#f59e0b' : '#10b981';
                const isGoldItem = Number(item.tempId) === 190 || Number(item.tempId) === 188 || Number(item.tempId) === 189;
                const durationInfo = getItemDurationInfo(item);

                return (
                  <div className={`nested-editor spin-reward-card ${item.enabled ? '' : 'is-disabled'}`} key={`${item.tempId}-${index}`}>
                    <div className="spin-reward-head">
                      <div className="spin-item-title">
                        <ItemIcon iconId={item.iconId} tempId={item.tempId} name={item.name} size={46} />
                        <div>
                          <strong>{item.name || (isGoldItem ? 'Vàng ngẫu nhiên' : `Item #${item.tempId || '?'}`)}</strong>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                            <small>Template #{item.tempId || '?'}</small>
                            <span className="badge" style={{ background: `${rarityColor}25`, color: rarityColor, border: `1px solid ${rarityColor}60` }}>
                              Xác suất: <strong>{percentage.toFixed(4)}%</strong>
                            </span>
                            {isGoldItem && (
                              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24', border: '1px solid #f59e0b' }}>
                                💰 Rơi: <strong>{formatNumber(item.quantityMin)} ~ {formatNumber(item.quantityMax)} Vàng</strong>
                              </span>
                            )}
                            <span className={`badge ${durationInfo.mode === 'permanent' ? 'ok' : 'warn'}`}>
                              {durationInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <label className="switch-label">
                        <input type="checkbox" checked={item.enabled} onChange={(e) => patchItem(index, { enabled: e.target.checked })} /> Bật
                      </label>
                    </div>

                    <div className="form-grid">
                      <label className="field">
                        Template ID
                        <input type="number" min="0" value={item.tempId} onChange={(e) => patchItem(index, { tempId: numberInput(e.target.value) })} required />
                      </label>
                      <label className="field">
                        Tỷ lệ random (%)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.0001"
                          value={item.chancePercent}
                          onChange={(e) => patchItem(index, { chancePercent: numberInput(e.target.value), weight: Math.max(1, Math.round(Number(e.target.value || 0) * 10000)) })}
                          required
                        />
                      </label>
                      <label className="field">
                        {isGoldItem ? 'SL Vàng tối thiểu (Min Gold)' : 'SL tối thiểu (Min)'}
                        <input
                          type="number"
                          min="1"
                          value={item.quantityMin}
                          onChange={(e) => patchItem(index, { quantityMin: numberInput(e.target.value) })}
                          placeholder={isGoldItem ? 'VD: 100000' : '1'}
                        />
                      </label>
                      <label className="field">
                        {isGoldItem ? 'SL Vàng tối đa (Max Gold)' : 'SL tối đa (Max)'}
                        <input
                          type="number"
                          min="1"
                          value={item.quantityMax}
                          onChange={(e) => patchItem(index, { quantityMax: numberInput(e.target.value) })}
                          placeholder={isGoldItem ? 'VD: 2000000' : '1'}
                        />
                      </label>
                      <label className="field">
                        Giới hạn trúng/người
                        <input type="number" min="1" value={item.maxWins} onChange={(e) => patchItem(index, { maxWins: numberInput(e.target.value) })} placeholder="Không giới hạn" />
                      </label>
                      <label className="field" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px' }}>
                        <input type="checkbox" checked={item.vipOnly} onChange={(e) => patchItem(index, { vipOnly: e.target.checked })} />
                        <span>Chỉ dành cho VIP</span>
                      </label>
                    </div>

                    {/* DURATION & PERMANENT MODE BUILDER */}
                    <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#fbbf24' }}>⏳ Chế Độ Thời Hạn & Tỷ Lệ Vĩnh Viễn:</strong>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{durationInfo.label}</span>
                      </div>

                      <div className="category-tabs" style={{ marginBottom: '10px' }}>
                        <button
                          type="button"
                          className={`tab ${durationInfo.mode === 'permanent' ? 'active' : ''}`}
                          onClick={() => setItemDurationMode(index, 'permanent')}
                        >
                          🌟 Vĩnh viễn (100%)
                        </button>
                        <button
                          type="button"
                          className={`tab ${durationInfo.mode === 'fixed_days' ? 'active' : ''}`}
                          onClick={() => setItemDurationMode(index, 'fixed_days', { durationDays: 7 })}
                        >
                          ⏱️ Hạn ngày cố định
                        </button>
                        <button
                          type="button"
                          className={`tab ${durationInfo.mode === 'random_days' ? 'active' : ''}`}
                          onClick={() => setItemDurationMode(index, 'random_days', { minDays: 3, maxDays: 14 })}
                        >
                          🎲 Random Hạn ngày
                        </button>
                        <button
                          type="button"
                          className={`tab ${durationInfo.mode === 'chance_permanent' ? 'active' : ''}`}
                          onClick={() => setItemDurationMode(index, 'chance_permanent', { chancePermanent: 10, minDays: 1, maxDays: 7 })}
                          style={{ borderColor: '#8b5cf6', color: durationInfo.mode === 'chance_permanent' ? '#fff' : '#c4b5fd' }}
                        >
                          👑 Random Vĩnh Viễn theo Tỉ Lệ %
                        </button>
                      </div>

                      {durationInfo.mode === 'fixed_days' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <label className="field" style={{ margin: 0, flex: 1 }}>
                            <span>Số ngày sử dụng</span>
                            <input
                              type="number"
                              min="1"
                              value={durationInfo.durationDays || 7}
                              onChange={(e) => setItemDurationMode(index, 'fixed_days', { durationDays: e.target.value })}
                              placeholder="7"
                            />
                          </label>
                        </div>
                      )}

                      {durationInfo.mode === 'random_days' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label className="field" style={{ margin: 0 }}>
                            <span>Số ngày tối thiểu (Min ngày)</span>
                            <input
                              type="number"
                              min="1"
                              value={durationInfo.minDays || 1}
                              onChange={(e) => setItemDurationMode(index, 'random_days', { minDays: e.target.value, maxDays: durationInfo.maxDays })}
                              placeholder="1"
                            />
                          </label>
                          <label className="field" style={{ margin: 0 }}>
                            <span>Số ngày tối đa (Max ngày)</span>
                            <input
                              type="number"
                              min="1"
                              value={durationInfo.maxDays || 7}
                              onChange={(e) => setItemDurationMode(index, 'random_days', { minDays: durationInfo.minDays, maxDays: e.target.value })}
                              placeholder="7"
                            />
                          </label>
                        </div>
                      )}

                      {durationInfo.mode === 'chance_permanent' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '6px' }}>
                            <label className="field" style={{ margin: 0 }}>
                              <span style={{ color: '#fbbf24' }}>🏆 Tỷ lệ ra Vĩnh viễn (%)</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={durationInfo.chancePermanent || 10}
                                onChange={(e) => setItemDurationMode(index, 'chance_permanent', { chancePermanent: e.target.value, minDays: durationInfo.minDays, maxDays: durationInfo.maxDays })}
                                placeholder="10"
                              />
                            </label>
                            <label className="field" style={{ margin: 0 }}>
                              <span>Nếu trượt: Min ngày</span>
                              <input
                                type="number"
                                min="1"
                                value={durationInfo.minDays || 1}
                                onChange={(e) => setItemDurationMode(index, 'chance_permanent', { chancePermanent: durationInfo.chancePermanent, minDays: e.target.value, maxDays: durationInfo.maxDays })}
                                placeholder="1"
                              />
                            </label>
                            <label className="field" style={{ margin: 0 }}>
                              <span>Nếu trượt: Max ngày</span>
                              <input
                                type="number"
                                min="1"
                                value={durationInfo.maxDays || 7}
                                onChange={(e) => setItemDurationMode(index, 'chance_permanent', { chancePermanent: durationInfo.chancePermanent, minDays: durationInfo.minDays, maxDays: e.target.value })}
                                placeholder="7"
                              />
                            </label>
                          </div>
                          <div style={{ fontSize: '12px', color: '#c4b5fd' }}>
                            💡 Cơ chế: Khi quay trúng, có <strong>{durationInfo.chancePermanent || 10}%</strong> cơ hội nhận <strong>VĨNH VIỄN</strong>, <strong>{100 - (durationInfo.chancePermanent || 10)}%</strong> còn lại sẽ nhận Hạn ngày ngẫu nhiên trong khoảng <strong>[{durationInfo.minDays || 1} ~ {durationInfo.maxDays || 7}] ngày</strong>.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Random Option Presets for Item */}
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#93c5fd' }}>⚡ Gắn Nhanh Gói Option Ngẫu Nhiên:</span>
                        <button
                          type="button"
                          className="btn sm"
                          style={{
                            fontSize: '11px',
                            padding: '3px 10px',
                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(79, 70, 229, 0.4) 100%)',
                            borderColor: '#8b5cf6',
                            color: '#e9d5ff',
                            fontWeight: 'bold',
                          }}
                          onClick={() => openAiModal(index)}
                        >
                          🧠 DeepSeek AI Suy Luận Option
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {PRESET_OPTION_PACKS.map((pack, pIdx) => (
                          <button
                            type="button"
                            key={pIdx}
                            className="btn sm"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => applyPresetOptions(index, pack)}
                            title={pack.desc}
                          >
                            {pack.name.split('(')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Option Editor (Handles custom fixed / random option ranges) */}
                    <div style={{ marginTop: '10px' }}>
                      <OptionEditor
                        options={item.options}
                        onChange={(options) => patchItem(index, { options })}
                        compact
                      />
                    </div>

                    <div className="button-row" style={{ marginTop: '12px' }}>
                      <button type="button" className="btn sm" onClick={() => moveItem(index, -1)} disabled={index === 0}>↑ Đẩy lên</button>
                      <button type="button" className="btn sm" onClick={() => moveItem(index, 1)} disabled={index === form.items.length - 1}>↓ Hạ xuống</button>
                      <button type="button" className="btn sm" onClick={() => duplicateItem(index)}>Nhân bản</button>
                      <button type="button" className="btn sm danger" onClick={() => removeItem(index)}>Xóa item</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* TAB 2: PRESET BUNDLES */}
          {tab === 'presets' && (
            <div className="card-inner">
              <div className="section-title">
                <div>
                  <h3>⚡ Gói Vật Phẩm Mẫu & Bộ Chỉ Số Ngẫu Nhiên</h3>
                  <p className="card-hint">Nạp nhanh các bộ item vàng, ngọc rồng, cải trang VIP và gán combo option ngẫu nhiên chỉ bằng 1 cú nhấp chuột.</p>
                </div>
              </div>

              <h4 style={{ color: '#f59e0b', marginTop: '14px' }}>💰 Gói Phần Thưởng Vàng Rơi (Item #190 & #457)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {PRESET_GOLD_ITEMS.map((g, gIdx) => (
                  <div key={gIdx} style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '14px' }}>
                    <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px', color: '#fbbf24' }}>{g.name}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 10px 0' }}>
                      Khoảng rơi: <strong>{formatNumber(g.min)} ~ {formatNumber(g.max)} {g.tempId === 190 ? 'Vàng' : 'Thỏi'}</strong> · Tỷ lệ mặc định: {g.chance}%
                    </p>
                    <button
                      type="button"
                      className="btn sm"
                      style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }}
                      onClick={() => addGoldReward(g)}
                    >
                      + Thêm phần thưởng này vào pool
                    </button>
                  </div>
                ))}
              </div>

              <h4 style={{ color: '#f59e0b' }}>🌟 Gói Vật Phẩm Có Sẵn Khác</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {PRESET_ITEM_BUNDLES.map((bundle, bIdx) => (
                  <div key={bIdx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '14px' }}>
                    <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>{bundle.name}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 10px 0' }}>{bundle.desc}</p>
                    <button
                      type="button"
                      className="btn sm primary"
                      onClick={() => addBatchIds(bundle.ids)}
                    >
                      + Nạp gói này vào pool ({bundle.ids.split(',').length} items)
                    </button>
                  </div>
                ))}
              </div>

              <h4 style={{ color: '#10b981' }}>🎲 Bộ Option Ngẫu Nhiên (Random Stats Packs)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {PRESET_OPTION_PACKS.map((pack, pIdx) => (
                  <div key={pIdx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '14px' }}>
                    <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>{pack.name}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 10px 0' }}>{pack.desc}</p>
                    <div style={{ fontSize: '12px', color: '#93c5fd', marginBottom: '10px' }}>
                      {pack.options.map((opt, oIdx) => (
                        <div key={oIdx}>
                          • {formatOptionLabel(opt.id, opt.param, optionMap, opt.min, opt.max)}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        if (!form.items.length) {
                          fb.error('Chưa có item nào trong pool.');
                          return;
                        }
                        patch('items', form.items.map((it) => ({
                          ...it,
                          options: [...(it.options || []), ...pack.options],
                        })));
                        fb.success(`Đã gắn "${pack.name}" cho TẤT CẢ ${form.items.length} item trong pool!`);
                      }}
                    >
                      Áp dụng cho TẤT CẢ item
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL SETTINGS */}
          {tab === 'general' && (
            <>
              <div className="form-grid">
                <label className="field">
                  Mã vòng quay (spinKey)
                  <input value={form.spinKey} onChange={(e) => patch('spinKey', e.target.value)} placeholder="default, gold, event_gold, event_special..." required />
                </label>
                <label className="field">
                  Tên hiển thị
                  <input value={form.name} onChange={(e) => patch('name', e.target.value)} required />
                </label>
                <label className="field">
                  Trạng thái
                  <select value={form.status} onChange={(e) => patch('status', e.target.value)}>
                    <option value="active">Đang chạy (Active)</option>
                    <option value="draft">Nháp (Draft)</option>
                    <option value="scheduled">Đã lên lịch</option>
                    <option value="paused">Tạm dừng</option>
                    <option value="ended">Đã kết thúc</option>
                  </select>
                </label>
                <label className="field">
                  Tiền quay
                  <select value={form.currencyMode} onChange={(e) => patch('currencyMode', e.target.value)}>
                    <option value="both">Ngọc hoặc vàng</option>
                    <option value="gem">Chỉ ngọc</option>
                    <option value="gold">Chỉ vàng</option>
                  </select>
                </label>
              </div>

              <label className="field">
                Mô tả
                <textarea rows="2" value={form.description} onChange={(e) => patch('description', e.target.value)} placeholder="Thông tin hiển thị cho admin / game client..." />
              </label>

              <div className="form-grid">
                <label className="field">
                  Giá ngọc / lượt quay
                  <input type="number" min="0" value={form.costGem} onChange={(e) => patch('costGem', numberInput(e.target.value))} />
                </label>
                <label className="field">
                  Giá vàng / lượt quay
                  <input type="number" min="0" value={form.costGold} onChange={(e) => patch('costGold', numberInput(e.target.value))} />
                </label>
                <label className="field">
                  Giá vé
                  <input type="number" min="0" value={form.costTicket} onChange={(e) => patch('costTicket', numberInput(e.target.value))} />
                </label>
                <label className="field">
                  ID vé (tùy chọn)
                  <input type="number" min="0" value={form.ticketTempId} onChange={(e) => patch('ticketTempId', numberInput(e.target.value))} />
                </label>
              </div>

              <div className="form-grid">
                <label className="field">
                  Bắt đầu
                  <input type="datetime-local" value={form.startsAt} onChange={(e) => patch('startsAt', e.target.value)} />
                </label>
                <label className="field">
                  Kết thúc
                  <input type="datetime-local" value={form.endsAt} onChange={(e) => patch('endsAt', e.target.value)} />
                </label>
                <label className="field">
                  Múi giờ
                  <input value={form.timezone} onChange={(e) => patch('timezone', e.target.value)} />
                </label>
                <label className="field">
                  Giới hạn lượt quay / ngày / người
                  <input type="number" min="1" value={form.dailyLimit} onChange={(e) => patch('dailyLimit', numberInput(e.target.value))} />
                </label>
              </div>

              <label className="field">
                Ghi chú nâng cao JSON
                <textarea
                  rows="3"
                  value={JSON.stringify(form.configJson || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      patch('configJson', JSON.parse(e.target.value || '{}'));
                    } catch {
                      /* giữ dữ liệu */
                    }
                  }}
                />
              </label>
            </>
          )}

          {/* TAB 4: HISTORY */}
          {tab === 'history' && (
            <div className="spin-history-panel">
              <div className="section-title">
                <div>
                  <h3>Lịch sử quay thưởng</h3>
                  <p className="card-hint">Dữ liệu đọc trực tiếp từ `panel_god_spin_logs`; tỷ lệ thực tế = số lần trúng item / tổng lượt quay.</p>
                </div>
                <button type="button" className="btn sm" onClick={() => loadHistory(1)} disabled={historyLoading}>
                  {historyLoading ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>
              <div className="form-grid compact-form">
                <label className="field">
                  Cấu hình
                  <select value={historyFilters.configId} onChange={(e) => setHistoryFilters((c) => ({ ...c, configId: e.target.value }))}>
                    <option value="">Tất cả cấu hình</option>
                    {configs.map((c) => <option key={c.id} value={c.id}>{c.name} · #{c.id}</option>)}
                  </select>
                </label>
                <label className="field">
                  Người chơi / ID
                  <input value={historyFilters.player} onChange={(e) => setHistoryFilters((c) => ({ ...c, player: e.target.value }))} placeholder="Nhập tên hoặc player ID" />
                </label>
                <label className="field">
                  Từ thời gian
                  <input type="datetime-local" value={historyFilters.from} onChange={(e) => setHistoryFilters((c) => ({ ...c, from: e.target.value }))} />
                </label>
                <label className="field">
                  Đến thời gian
                  <input type="datetime-local" value={historyFilters.to} onChange={(e) => setHistoryFilters((c) => ({ ...c, to: e.target.value }))} />
                </label>
              </div>
              <div className="button-row">
                <button type="button" className="btn primary" onClick={() => loadHistory(1)} disabled={historyLoading}>Áp dụng bộ lọc</button>
                <button type="button" className="btn" onClick={() => { const b = { configId: '', player: '', from: '', to: '', page: 1, pageSize: 25 }; setHistoryFilters(b); loadHistory(1, b); }}>Xóa bộ lọc</button>
              </div>
              <div className="spin-summary">
                <div><strong>{history.summary.totalSpins}</strong><span>tổng lượt quay</span></div>
                <div><strong>{history.summary.playerCount}</strong><span>người chơi</span></div>
                <div><strong>{history.summary.configCount}</strong><span>cấu hình có log</span></div>
                <div><strong>{history.pagination.total}</strong><span>dòng lịch sử</span></div>
              </div>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr><th>Item trúng</th><th>ID</th><th>Số lần trúng</th><th>Tỷ lệ thực tế</th></tr>
                  </thead>
                  <tbody>
                    {history.distribution.map((row) => (
                      <tr key={row.tempId}>
                        <td><strong>{row.itemName}</strong></td>
                        <td>#{row.tempId}</td>
                        <td>{row.wins}</td>
                        <td><strong>{row.actualPercent.toFixed(4)}%</strong></td>
                      </tr>
                    ))}
                    {history.distribution.length === 0 && <tr><td colSpan="4" className="muted">Chưa có dữ liệu trúng thưởng phù hợp.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SIMULATOR */}
          {tab === 'simulator' && (
            <div className="spin-history-panel" style={{ marginTop: '14px' }}>
              <div className="section-title">
                <div>
                  <h3>🎲 Giả Lập & Kiểm Tra Tỷ Lệ Rơi Thực Tế</h3>
                  <p className="card-hint">Chạy thử nghiệm hàng ngàn lượt quay ảo dựa trên pool hiện tại để kiểm chứng tỷ lệ % và dòng tiền thu chi trước khi mở sự kiện.</p>
                </div>
              </div>
              <div className="card-inner" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <label className="field" style={{ margin: 0 }}>
                  Số lượt quay mô phỏng:
                  <select value={simRuns} onChange={(e) => setSimRuns(Number(e.target.value))}>
                    <option value="1000">1.000 lượt</option>
                    <option value="10000">10.000 lượt (Khuyên dùng)</option>
                    <option value="50000">50.000 lượt</option>
                    <option value="100000">100.000 lượt (Chính xác cao)</option>
                  </select>
                </label>
                <button type="button" className="btn primary" onClick={runSimulation} disabled={simLoading} style={{ marginTop: '18px' }}>
                  {simLoading ? 'Đang giả lập...' : '🚀 Bắt Đầu Mô Phỏng'}
                </button>
              </div>

              {simResult && (
                <div>
                  <div className="spin-summary" style={{ marginBottom: '14px' }}>
                    <div><strong>{simResult.totalRuns.toLocaleString()}</strong><span>tổng lượt quay ảo</span></div>
                    <div><strong>{simResult.totalGoldCost.toLocaleString()}</strong><span>vàng dự kiến thu</span></div>
                    <div><strong>{simResult.totalGemCost.toLocaleString()}</strong><span>ngọc dự kiến thu</span></div>
                    <div><strong>{simResult.distribution.length}</strong><span>loại quà trong pool</span></div>
                  </div>

                  <div className="table-wrap">
                    <table className="compact">
                      <thead>
                        <tr>
                          <th>Vật phẩm</th>
                          <th>Template ID</th>
                          <th>Tỷ lệ dự kiến (%)</th>
                          <th>Số lần trúng ảo</th>
                          <th>Tỷ lệ thực tế (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simResult.distribution.map((row, idx) => (
                          <tr key={idx}>
                            <td><strong>{row.name || 'Vật phẩm'}</strong></td>
                            <td>#{row.tempId}</td>
                            <td>{row.expectedPercent}%</td>
                            <td><span className="badge">{row.actualHits.toLocaleString()}</span></td>
                            <td><strong style={{ color: Number(row.actualPercent) > Number(row.expectedPercent) ? '#10b981' : '#f59e0b' }}>{row.actualPercent}%</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab !== 'history' && tab !== 'simulator' && (
            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? 'Đang lưu...' : '💾 Lưu SQL & Reload Runtime'}
              </button>
              <span className="muted">Các option cố định và option random được lưu trữ trong `options_json` trên MySQL.</span>
            </div>
          )}
        </form>
      </div>

      {/* JSON Import/Export Modal */}
      {jsonModalOpen && (
        <div className="modal-backdrop" onClick={() => setJsonModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '90%' }}>
            <div className="modal-header">
              <h3>📋 Import / Export Danh Sách Item JSON</h3>
              <button type="button" className="btn sm" onClick={() => setJsonModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="card-hint">Bạn có thể copy JSON này để sao lưu hoặc dán danh sách item từ cấu hình khác vào đây.</p>
              <textarea
                rows="12"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>
            <div className="modal-footer button-row">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(jsonText);
                    if (!Array.isArray(parsed)) throw new Error('Dữ liệu JSON phải là một mảng danh sách items []');
                    patch('items', parsed.map((it, idx) => ({ ...emptyItem, ...it, sortOrder: idx })));
                    setJsonModalOpen(false);
                    fb.success(`Đã nạp thành công ${parsed.length} items từ JSON!`);
                  } catch (err) {
                    fb.error(`Lỗi JSON: ${err.message}`);
                  }
                }}
              >
                Nhập (Import) vào Pool
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  fb.success('Đã sao chép JSON vào Clipboard!');
                }}
              >
                Sao chép JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DeepSeek AI Option Generator Modal */}
      {aiModalOpen && (
        <div className="modal-backdrop" onClick={() => !aiLoading && setAiModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(79, 70, 229, 0.25) 100%)' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#e9d5ff' }}>
                  <span>🧠</span> DeepSeek AI Suy Luận & Gắn Option Tự Động
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                  Phạm vi: <strong>{aiTargetIndex != null ? `1 item: ${form.items[aiTargetIndex]?.name || `Item #${form.items[aiTargetIndex]?.tempId}`}` : `Toàn bộ ${form.items.length} item trong Pool`}</strong>
                </p>
              </div>
              <button type="button" className="btn sm" onClick={() => setAiModalOpen(false)} disabled={aiLoading}>✕</button>
            </div>

            <div className="modal-body">
              {/* Quick Prompt Theme Chips */}
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#93c5fd', display: 'block', marginBottom: '6px' }}>
                  🎯 Gợi ý phong cách suy luận nhanh:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setAiTheme('super_vip');
                      setAiPrompt('Tự động suy luận gán bộ 5 dòng chỉ số VIP siêu cấp [25~45% Sức đánh/HP/KI, 10~25% Chí mạng, 1000~4000 Giáp], thiết lập 15% ra Vĩnh viễn (hoặc 3~15 ngày) cho các cải trang/trang bị.');
                    }}
                    style={{ fontSize: '11px', background: aiTheme === 'super_vip' ? 'rgba(124, 58, 237, 0.4)' : undefined }}
                  >
                    👑 Siêu Phẩm VIP (Full 5 Dòng)
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setAiTheme('offensive');
                      setAiPrompt('Tập trung tối đa vào Sức Đánh %, Chí Mạng, Hút HP và Sát Thương Chưởng cho item.');
                    }}
                    style={{ fontSize: '11px', background: aiTheme === 'offensive' ? 'rgba(124, 58, 237, 0.4)' : undefined }}
                  >
                    🔥 Sát Thương & Sức Đánh
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setAiTheme('defensive');
                      setAiPrompt('Tập trung vào Giáp Khủng, Biến sát thương chưởng thành KI, Phản sát thương và Kháng khống chế.');
                    }}
                    style={{ fontSize: '11px', background: aiTheme === 'defensive' ? 'rgba(124, 58, 237, 0.4)' : undefined }}
                  >
                    🛡️ Phòng Thủ & Phản Dame
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setAiTheme('balanced');
                      setAiPrompt('Cân bằng chỉ số theo chuẩn lore Ngọc Rồng Online, giữ game cân bằng không bị lạm phát.');
                    }}
                    style={{ fontSize: '11px', background: aiTheme === 'balanced' ? 'rgba(124, 58, 237, 0.4)' : undefined }}
                  >
                    ⚖️ Chuẩn Lore Cân Bằng
                  </button>
                </div>
              </div>

              {/* Custom Prompt Box */}
              <div style={{ marginBottom: '14px' }}>
                <label className="field" style={{ margin: 0 }}>
                  <span style={{ fontWeight: 'bold' }}>Mô tả yêu cầu chi tiết cho DeepSeek AI:</span>
                  <textarea
                    rows="3"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="VD: Cải trang Pan VIP cho thêm dòng hút máu 10~15%, Cải trang Yardrat có dịch chuyển tức thời, set tỷ lệ 10% ra vĩnh viễn còn lại 3~7 ngày..."
                    style={{ width: '100%', fontSize: '13px' }}
                  />
                </label>
              </div>

              {/* DeepSeek API & Model Settings (Accordion / Collapsible) */}
              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Model AI</span>
                    <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                      <option value="deepseek-chat">DeepSeek-V3 (deepseek-chat - Nhanh & Chuẩn)</option>
                      <option value="deepseek-reasoner">DeepSeek-R1 (deepseek-reasoner - Suy Luận Chuyên Sâu)</option>
                    </select>
                  </label>
                  <label className="field" style={{ margin: 0 }}>
                    <span>DeepSeek API Key (Tùy chọn)</span>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="sk-... (để trống để dùng NRO Offline Engine)"
                    />
                  </label>
                </div>
                <small className="muted" style={{ display: 'block', marginTop: '6px', fontSize: '11px' }}>
                  💡 Nếu không có API Key, hệ thống sẽ tự động dùng <strong>DeepSeek Local NRO Reasoning Engine</strong> tích hợp sẵn trong máy chủ.
                </small>
              </div>

              {/* Action Run AI */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <button
                  type="button"
                  className="btn primary"
                  disabled={aiLoading}
                  onClick={() => runAiGeneration(aiTargetIndex)}
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    borderColor: '#8b5cf6',
                    boxShadow: '0 0 15px rgba(124, 58, 237, 0.4)',
                  }}
                >
                  {aiLoading ? '🧠 DeepSeek AI Đang Suy Luận...' : '🚀 Bắt Đầu Suy Luận Với DeepSeek AI'}
                </button>
              </div>

              {/* AI RESULTS PREVIEW */}
              {aiResult && (
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong style={{ color: '#a78bfa', fontSize: '14px' }}>✨ Kết quả suy luận từ {aiResult.engine}:</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                        {aiResult.reasoningSummary}
                      </p>
                    </div>
                    <span className="badge ok">{aiResult.items.length} item đã xử lý</span>
                  </div>

                  {aiResult.reasoningThought && (
                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', color: '#c4b5fd', maxHeight: '120px', overflowY: 'auto' }}>
                      <strong>💭 Quá trình suy luận (Reasoning Thought):</strong>
                      <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{aiResult.reasoningThought}</p>
                    </div>
                  )}

                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table className="table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Vật phẩm</th>
                          <th>Option do AI gán</th>
                          <th>Thời hạn đề xuất</th>
                          <th>Giải thích AI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiResult.items.map((it, itIdx) => (
                          <tr key={itIdx}>
                            <td>
                              <strong>{it.name || `Item #${it.tempId}`}</strong>
                              <small style={{ display: 'block', color: 'var(--muted)' }}>#{it.tempId}</small>
                            </td>
                            <td>
                              {it.options && it.options.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {it.options.filter((o) => o.id !== 93).map((o, oIdx) => (
                                    <span key={oIdx} className="badge" style={{ background: 'rgba(255,255,255,0.06)', textAlign: 'left' }}>
                                      {formatOptionLabel(o.id, o.param, optionMap, o.min, o.max)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="muted">Không có option</span>
                              )}
                            </td>
                            <td>
                              {(() => {
                                const opt93 = (it.options || []).find((o) => o.id === 93);
                                if (opt93) {
                                  if (opt93.chancePermanent) {
                                    return <span className="badge warn">👑 {opt93.chancePermanent}% Vĩnh viễn (hoặc {opt93.min}~{opt93.max} ngày)</span>;
                                  }
                                  if (opt93.min && opt93.max && opt93.min !== opt93.max) {
                                    return <span className="badge warn">⏱️ Random {opt93.min}~{opt93.max} ngày</span>;
                                  }
                                  return <span className="badge warn">⏱️ Hạn {opt93.param || opt93.min || 7} ngày</span>;
                                }
                                return <span className="badge ok">🌟 Vĩnh viễn</span>;
                              })()}
                            </td>
                            <td style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', maxWidth: '240px' }}>
                              {it.reasoning || 'Tối ưu theo chuẩn game.'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer button-row">
              {aiResult && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={applyAiResultToForm}
                  style={{
                    background: '#10b981',
                    borderColor: '#10b981',
                    fontWeight: 'bold',
                  }}
                >
                  ✨ Áp Dụng Toàn Bộ Vào Vòng Quay
                </button>
              )}
              <button type="button" className="btn" onClick={() => setAiModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
