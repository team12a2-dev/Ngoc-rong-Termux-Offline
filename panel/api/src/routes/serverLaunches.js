import express from 'express';
import { query, exec, withTransaction } from '../db.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { auditLog } from '../services/audit.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { agentPost } from '../services/agent.js';
import { parsePlayerPower } from '../config/gameDbSchema.js';
import { distributeCategoryRewards } from '../services/raceRewardService.js';

const router = express.Router();
router.use(authMiddleware);

export const DEFAULT_VU_TRU_15_PRESET = {
  server_name: 'VŨ TRỤ 15',
  title: 'KHAI MỞ VŨ TRỤ 15',
  description: 'Chào mừng các cư dân đến với máy chủ VŨ TRỤ 15. Khai mở lúc 10h00 ngày 28/08/2026 với chuỗi sự kiện Đua Top, quà NPC Chi Chi, nạp đầu và các quy tắc máy chủ độc quyền.',
  opens_at: '2026-08-28 10:00:00',
  top_race_ends_at: '2026-09-07 23:00:00',
  restrictions_end_at: '2026-10-31 23:59:59',
  status: 'active',
  is_active: 1,

  // 1. Quà NPC Chi Chi
  npc_gift_enabled: 1,
  npc_gift_config: {
    npc_id: 81,
    npc_name: 'Chi Chi',
    gift_name: 'Ván Bay MT (Vĩnh Viễn)',
    item_template_id: 1984, // MT Gaming / Ván bay MT (Type 23)
    duration_days: null, // Vĩnh viễn
    expires_at: '2026-10-31 23:59:59',
    description: 'Tặng Ván Bay MT vĩnh viễn tại NPC Chi Chi (đến hết ngày 31/10/2026)',
  },

  // 2. Khuyến mãi nạp đầu
  first_recharge_enabled: 1,
  first_recharge_config: {
    title: 'Khuyến Mãi Nạp Đầu Máy Chủ Mới',
    description: 'Nạp lần đầu bất kỳ nhận trọn bộ quà khủng',
    items: [
      { name: 'Cờ Thùng Rác', duration: 'Vĩnh Viễn', days: null, desc: 'Cờ Thùng Rác Vĩnh Viễn mang lại phong cách cực ngầu' },
      { name: 'Cải trang Pan Vip', duration: '30 ngày', days: 30, desc: 'Tăng toàn diện chỉ số HP, KI, Sức Đánh' },
      { name: 'Pet Xên Hoàn Hảo', duration: '30 ngày', days: 30, desc: 'Tăng 25,000 Sức Đánh cực khủng (30 ngày)' },
    ],
  },

  // 3. Đua TOP 3 Hạng Mục
  race_enabled: 1,
  race_config: {
    ends_at: '2026-09-07 23:00:00',
    categories: {
      mission: {
        id: 'mission',
        name: 'TOP NHIỆM VỤ',
        description: 'Đua Top hoàn thành các nhiệm vụ chính tuyến trong game',
        tiers: [
          { rank: 'TOP 1', rank_min: 1, rank_max: 1, rewards: '5 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 vĩnh viễn, 5.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 100, Giáp Luyện Tập Cấp 5' },
          { rank: 'TOP 2', rank_min: 2, rank_max: 2, rewards: '4 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 vĩnh viễn, 4.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 70' },
          { rank: 'TOP 3', rank_min: 3, rank_max: 3, rewards: '3 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 vĩnh viễn, 3.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 50' },
          { rank: 'TOP 4–5', rank_min: 4, rank_max: 5, rewards: '2 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 vĩnh viễn, 2.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 30' },
          { rank: 'TOP 6–10', rank_min: 6, rank_max: 10, rewards: '1 Capsule 1 món kích hoạt, Cải Trang CT Broly SSJ4 180 ngày, 1.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 20' },
          { rank: 'TOP 11–50', rank_min: 11, rank_max: 50, rewards: 'Cải Trang CT Broly SSJ4 90 ngày, 500 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 10' },
          { rank: 'TOP 51–100', rank_min: 51, rank_max: 100, rewards: 'Cải Trang CT Broly SSJ4 30 ngày, 200 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 5' },
        ],
      },
      power: {
        id: 'power',
        name: 'TOP SỨC MẠNH',
        description: 'Đua Top Sức Mạnh nhân vật đạt mốc cao nhất',
        tiers: [
          { rank: 'TOP 1', rank_min: 1, rank_max: 1, rewards: '5 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 5.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 100, Giáp Luyện Tập Cấp 5' },
          { rank: 'TOP 2', rank_min: 2, rank_max: 2, rewards: '4 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 4.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 70' },
          { rank: 'TOP 3', rank_min: 3, rank_max: 3, rewards: '3 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 3.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 50' },
          { rank: 'TOP 4–5', rank_min: 4, rank_max: 5, rewards: '2 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 2.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 30' },
          { rank: 'TOP 6–10', rank_min: 6, rank_max: 10, rewards: '1 Capsule 1 món kích hoạt, Cánh Sấm Sét Hoàng Kim vĩnh viễn, 1.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 20' },
          { rank: 'TOP 11–50', rank_min: 11, rank_max: 50, rewards: 'Cánh Sấm Sét Hoàng Kim 90 ngày, 500 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 10' },
          { rank: 'TOP 51–100', rank_min: 51, rank_max: 100, rewards: 'Cánh Sấm Sét Hoàng Kim 30 ngày, 200 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 5' },
        ],
      },
      recharge_points: {
        id: 'recharge_points',
        name: 'TOP ĐIỂM TÍCH LŨY (NẠP NGỌC)',
        description: 'Nạp 1 ngọc = 1 điểm. Tối thiểu 20 điểm mới đủ điều kiện vào Top.',
        min_points: 20,
        rate_gem_to_point: 1,
        tiers: [
          { rank: 'TOP 1', rank_min: 1, rank_max: 1, rewards: 'Hộp quà Set kích hoạt 5 sao, Trứng Xên Vàng (chọn 1 trong 3 pet max stats), 5.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 100, Giáp Luyện Tập Cấp 5, Bông Tai Cấp 3' },
          { rank: 'TOP 2', rank_min: 2, rank_max: 2, rewards: '4 Capsule 1 món kích hoạt, Pet MewTwo vĩnh viễn, 4.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 70, Giáp Luyện Tập Cấp 5, Bông Tai Cấp 3' },
          { rank: 'TOP 3', rank_min: 3, rank_max: 3, rewards: '3 Capsule 1 món kích hoạt, Pet MewTwo vĩnh viễn, 3.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 50, Giáp Luyện Tập Cấp 5, Bông Tai Cấp 3' },
          { rank: 'TOP 4–5', rank_min: 4, rank_max: 5, rewards: '2 Capsule 1 món kích hoạt, Pet MewTwo vĩnh viễn, 2.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 30' },
          { rank: 'TOP 6–10', rank_min: 6, rank_max: 10, rewards: '1 Capsule 1 món kích hoạt, Pet MewTwo vĩnh viễn, 1.000 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 20' },
          { rank: 'TOP 11–50', rank_min: 11, rank_max: 50, rewards: 'Pet MewTwo 180 ngày, 500 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 10' },
          { rank: 'TOP 51–100', rank_min: 51, rank_max: 100, rewards: 'Pet MewTwo 90 ngày, 200 Hồng Ngọc, Ra Đa Ngọc Rồng Vip 5' },
        ],
      },
    },
    notes: [
      'Capsule 1 món kích hoạt tự chọn: tự lựa chọn Áo/Quần/Găng/Giày/Rada ra món ngẫu nhiên set kích hoạt (có thể ra đồ cấp cao)',
      'Trứng Xên Vàng: Được Chọn 1 trong 3 pet xên có chỉ số max: Xên Con 35.000 Ki, Xên Hoàn Hảo 25.000 Sức Đánh, Xên Max 150.000 HP',
    ],
  },

  // 4. 10 Quy Tắc & Giới Hạn Máy Chủ Mới
  restrictions_enabled: 1,
  restrictions_config: {
    block_socket_and_star_combine: {
      enabled: true,
      title: 'Khóa Đục Lỗ & Ép Sao Pha Lê',
      desc: 'Không sử dụng các chức năng đục lỗ và ép sao pha lê đến 31/10/2026',
      until: '2026-10-31 23:59:59',
    },
    santa_no_gold_bars: {
      enabled: true,
      title: 'Santa Không Bán Thỏi Vàng',
      desc: 'Không bán thỏi vàng tại cửa hàng NPC Santa trong thời gian đua top',
      until: '2026-10-31 23:59:59',
    },
    santa_no_lucky_star_tickets: {
      enabled: true,
      title: 'Không Bán Phiếu Sao Vàng May Mắn',
      desc: 'Không bán Phiếu sao vàng may mắn đến 31/10/2026',
      until: '2026-10-31 23:59:59',
    },
    restrict_gold_trading: {
      enabled: true,
      title: 'Giới Hạn / Khóa Giao Dịch Vàng',
      desc: 'Hạn chế giao dịch vàng giữa các tài khoản đến 31/10/2026',
      until: '2026-10-31 23:59:59',
    },
    black_ball_war_schedule: {
      enabled: true,
      title: 'Giải Ngọc Rồng Sao Đen Mở Từ 07/09',
      desc: 'Giải Ngọc Rồng Sao Đen chính thức mở từ ngày 07/09/2026',
      start_date: '2026-09-07 00:00:00',
    },
    black_ball_war_no_40b_limit: {
      enabled: true,
      title: 'Bỏ Yêu Cầu Sức Mạnh 40 Tỷ Vào NR Sao Đen',
      desc: 'Không áp dụng sức mạnh trên 40 tỷ mới được vào Ngọc Rồng Sao Đen đến 31/10/2026',
      until: '2026-10-31 23:59:59',
    },
    block_shenron_power_wish: {
      enabled: true,
      title: 'Cấm Ước Rồng Thiêng Ban Sức Mạnh',
      desc: 'Các cư dân sẽ không gọi được Rồng Thiêng để ước điều ước ban thêm sức mạnh',
      until: '2026-10-31 23:59:59',
    },
    block_tnsm_charms_x3_x4: {
      enabled: true,
      title: 'Vô Hiệu Hóa Bùa x3, x4 TNSM',
      desc: 'Bùa x3, x4 Tiềm Năng Sức Mạnh sẽ không được áp dụng trên máy chủ mới',
      until: '2026-10-31 23:59:59',
    },
    disable_god_normal_spin: {
      enabled: true,
      title: 'Tắt Vòng Quay Thường NPC Thượng Đế',
      desc: 'Vòng quay thường tại NPC Thượng Đế sẽ không mở trong suốt thời gian đua top',
      until: '2026-10-31 23:59:59',
    },
    block_star_crystal_item_drops: {
      enabled: true,
      title: 'Không Rơi Đồ Sao Pha Lê',
      desc: 'Quái và Boss không rơi trang bị có sẵn Sao Pha Lê',
      until: '2026-10-31 23:59:59',
    },
  },
};

const asJson = (val, fallback = null) => {
  if (val == null || val === '') return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};
const jsonParam = (val) => (val == null ? null : JSON.stringify(val));

async function ensureTable() {
  await exec(`
    CREATE TABLE IF NOT EXISTS panel_server_launches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      server_id INT NOT NULL DEFAULT 1,
      server_name VARCHAR(120) NOT NULL DEFAULT 'VŨ TRỤ 15',
      title VARCHAR(255) NOT NULL DEFAULT 'KHAI MỞ VŨ TRỤ 15',
      description TEXT NULL,
      opens_at DATETIME NOT NULL DEFAULT '2026-08-28 10:00:00',
      top_race_ends_at DATETIME NOT NULL DEFAULT '2026-09-07 23:00:00',
      restrictions_end_at DATETIME NOT NULL DEFAULT '2026-10-31 23:59:59',
      status ENUM('draft', 'scheduled', 'active', 'top_ended', 'completed', 'paused') NOT NULL DEFAULT 'active',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      npc_gift_enabled TINYINT(1) NOT NULL DEFAULT 1,
      npc_gift_config JSON NULL,
      first_recharge_enabled TINYINT(1) NOT NULL DEFAULT 1,
      first_recharge_config JSON NULL,
      race_enabled TINYINT(1) NOT NULL DEFAULT 1,
      race_config JSON NULL,
      restrictions_enabled TINYINT(1) NOT NULL DEFAULT 1,
      restrictions_config JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_launch_server (server_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS panel_server_launch_top_snapshots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      launch_id INT NOT NULL,
      server_id INT NOT NULL,
      race_category ENUM('mission', 'power', 'recharge_points') NOT NULL,
      snapshot_data JSON NOT NULL,
      total_players INT NOT NULL DEFAULT 0,
      is_distributed TINYINT(1) NOT NULL DEFAULT 0,
      distributed_at DATETIME NULL,
      distributed_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_snap_launch_cat (launch_id, race_category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// GET /api/v1/server-launches
router.get('/', requirePermission('dashboard.view'), async (req, res) => {
  try {
    await ensureTable();
    const serverId = Number(req.query.serverId || (await getDefaultServerId()));
    const rows = await query('SELECT * FROM panel_server_launches WHERE server_id = ? LIMIT 1', [serverId]);

    if (!rows.length) {
      // Auto populate with Vũ Trụ 15 Preset
      const p = DEFAULT_VU_TRU_15_PRESET;
      await exec(
        `INSERT INTO panel_server_launches 
         (server_id, server_name, title, description, opens_at, top_race_ends_at, restrictions_end_at, status, is_active,
          npc_gift_enabled, npc_gift_config, first_recharge_enabled, first_recharge_config, race_enabled, race_config, restrictions_enabled, restrictions_config)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          serverId, p.server_name, p.title, p.description, p.opens_at, p.top_race_ends_at, p.restrictions_end_at, p.status, p.is_active,
          p.npc_gift_enabled, jsonParam(p.npc_gift_config), p.first_recharge_enabled, jsonParam(p.first_recharge_config),
          p.race_enabled, jsonParam(p.race_config), p.restrictions_enabled, jsonParam(p.restrictions_config),
        ]
      );
      const inserted = await query('SELECT * FROM panel_server_launches WHERE server_id = ? LIMIT 1', [serverId]);
      const data = inserted[0];
      return res.json({
        ok: true,
        data: {
          ...data,
          npc_gift_config: asJson(data.npc_gift_config),
          first_recharge_config: asJson(data.first_recharge_config),
          race_config: asJson(data.race_config),
          restrictions_config: asJson(data.restrictions_config),
        },
      });
    }

    const data = rows[0];
    res.json({
      ok: true,
      data: {
        ...data,
        npc_gift_config: asJson(data.npc_gift_config),
        first_recharge_config: asJson(data.first_recharge_config),
        race_config: asJson(data.race_config),
        restrictions_config: asJson(data.restrictions_config),
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/server-launches (Save / Update)
router.post('/', requirePermission('server.config'), async (req, res) => {
  try {
    await ensureTable();
    const serverId = Number(req.body.server_id || req.body.serverId || (await getDefaultServerId()));
    const body = req.body;

    const serverName = String(body.server_name || body.serverName || 'VŨ TRỤ 15').trim();
    const title = String(body.title || 'KHAI MỞ VŨ TRỤ 15').trim();
    const description = String(body.description || '').trim();
    const opensAt = body.opens_at ? String(body.opens_at).replace('T', ' ').slice(0, 19) : '2026-08-28 10:00:00';
    const topRaceEndsAt = body.top_race_ends_at ? String(body.top_race_ends_at).replace('T', ' ').slice(0, 19) : '2026-09-07 23:00:00';
    const restrictionsEndAt = body.restrictions_end_at ? String(body.restrictions_end_at).replace('T', ' ').slice(0, 19) : '2026-10-31 23:59:59';
    const status = ['draft', 'scheduled', 'active', 'top_ended', 'completed', 'paused'].includes(body.status) ? body.status : 'active';
    const isActive = body.is_active != null ? (body.is_active ? 1 : 0) : 1;

    const npcGiftEnabled = body.npc_gift_enabled != null ? (body.npc_gift_enabled ? 1 : 0) : 1;
    const npcGiftConfig = body.npc_gift_config || DEFAULT_VU_TRU_15_PRESET.npc_gift_config;

    const firstRechargeEnabled = body.first_recharge_enabled != null ? (body.first_recharge_enabled ? 1 : 0) : 1;
    const firstRechargeConfig = body.first_recharge_config || DEFAULT_VU_TRU_15_PRESET.first_recharge_config;

    const raceEnabled = body.race_enabled != null ? (body.race_enabled ? 1 : 0) : 1;
    const raceConfig = body.race_config || DEFAULT_VU_TRU_15_PRESET.race_config;

    const restrictionsEnabled = body.restrictions_enabled != null ? (body.restrictions_enabled ? 1 : 0) : 1;
    const restrictionsConfig = body.restrictions_config || DEFAULT_VU_TRU_15_PRESET.restrictions_config;

    await exec(
      `INSERT INTO panel_server_launches 
       (server_id, server_name, title, description, opens_at, top_race_ends_at, restrictions_end_at, status, is_active,
        npc_gift_enabled, npc_gift_config, first_recharge_enabled, first_recharge_config, race_enabled, race_config, restrictions_enabled, restrictions_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        server_name = VALUES(server_name),
        title = VALUES(title),
        description = VALUES(description),
        opens_at = VALUES(opens_at),
        top_race_ends_at = VALUES(top_race_ends_at),
        restrictions_end_at = VALUES(restrictions_end_at),
        status = VALUES(status),
        is_active = VALUES(is_active),
        npc_gift_enabled = VALUES(npc_gift_enabled),
        npc_gift_config = VALUES(npc_gift_config),
        first_recharge_enabled = VALUES(first_recharge_enabled),
        first_recharge_config = VALUES(first_recharge_config),
        race_enabled = VALUES(race_enabled),
        race_config = VALUES(race_config),
        restrictions_enabled = VALUES(restrictions_enabled),
        restrictions_config = VALUES(restrictions_config)`,
      [
        serverId, serverName, title, description, opensAt, topRaceEndsAt, restrictionsEndAt, status, isActive,
        npcGiftEnabled, jsonParam(npcGiftConfig), firstRechargeEnabled, jsonParam(firstRechargeConfig),
        raceEnabled, jsonParam(raceConfig), restrictionsEnabled, jsonParam(restrictionsConfig),
      ]
    );

    await auditLog({
      userId: req.user.id,
      serverId,
      action: 'server.launch.update',
      requestBody: req.body,
      ip: req.ip,
    });

    try {
      await agentPost(serverId, '/reload/server-launch', {});
    } catch {}

    res.json({ ok: true, message: 'Đã lưu và đồng bộ cấu hình Khai Mở Server thời gian thực vào Game!' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/server-launches/:serverId/toggle-restriction (Instant toggle single restriction & update config)
router.post('/:serverId/toggle-restriction', requirePermission('server.config'), async (req, res) => {
  try {
    await ensureTable();
    const serverId = Number(req.params.serverId || (await getDefaultServerId()));
    const { key, enabled, until, start_date } = req.body;
    if (!key) {
      return res.status(400).json({ ok: false, error: 'Thiếu key quy tắc giới hạn' });
    }

    const rows = await query('SELECT restrictions_config FROM panel_server_launches WHERE server_id = ? LIMIT 1', [serverId]);
    let currentConfig = DEFAULT_VU_TRU_15_PRESET.restrictions_config;
    if (rows.length && rows[0].restrictions_config) {
      currentConfig = asJson(rows[0].restrictions_config, DEFAULT_VU_TRU_15_PRESET.restrictions_config);
    }

    const ruleObj = currentConfig[key] || DEFAULT_VU_TRU_15_PRESET.restrictions_config[key] || {
      enabled: false,
      title: key,
      desc: '',
      until: '2026-10-31 23:59:59',
    };

    const normalizeDate = (d) => {
      if (!d) return null;
      let s = String(d).trim().replace('T', ' ');
      if (s.length === 16) s += ':00';
      if (s.length === 10) s += ' 23:59:59';
      return s.slice(0, 19);
    };

    const newEnabled = enabled !== undefined ? Boolean(enabled) : ruleObj.enabled;
    const newUntil = until !== undefined ? normalizeDate(until) : ruleObj.until;
    const newStartDate = start_date !== undefined ? normalizeDate(start_date) : ruleObj.start_date;

    currentConfig[key] = {
      ...ruleObj,
      enabled: newEnabled,
      ...(newUntil ? { until: newUntil } : {}),
      ...(newStartDate ? { start_date: newStartDate } : {}),
    };

    await exec(
      `UPDATE panel_server_launches SET restrictions_config = ? WHERE server_id = ?`,
      [jsonParam(currentConfig), serverId]
    );

    await auditLog({
      userId: req.user.id,
      serverId,
      action: 'server.launch.toggle_restriction',
      requestBody: { key, enabled: newEnabled, until: newUntil, start_date: newStartDate },
      ip: req.ip,
    });

    try {
      await agentPost(serverId, '/reload/server-launch', {});
    } catch {}

    res.json({
      ok: true,
      message: `Đã cập nhật quy tắc "${ruleObj.title || key}" thành công!`,
      data: {
        key,
        enabled: newEnabled,
        until: newUntil,
        start_date: newStartDate,
        restrictions_config: currentConfig,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/server-launches/:serverId/bulk-toggle-restrictions (Turn on/off all 10 restrictions)
router.post('/:serverId/bulk-toggle-restrictions', requirePermission('server.config'), async (req, res) => {
  try {
    await ensureTable();
    const serverId = Number(req.params.serverId || (await getDefaultServerId()));
    const enabled = Boolean(req.body.enabled);

    const rows = await query('SELECT restrictions_config FROM panel_server_launches WHERE server_id = ? LIMIT 1', [serverId]);
    let currentConfig = DEFAULT_VU_TRU_15_PRESET.restrictions_config;
    if (rows.length && rows[0].restrictions_config) {
      currentConfig = asJson(rows[0].restrictions_config, DEFAULT_VU_TRU_15_PRESET.restrictions_config);
    }

    for (const key of Object.keys(currentConfig)) {
      if (currentConfig[key]) {
        currentConfig[key].enabled = enabled;
      }
    }

    await exec(
      `UPDATE panel_server_launches SET restrictions_config = ? WHERE server_id = ?`,
      [jsonParam(currentConfig), serverId]
    );

    await auditLog({
      userId: req.user.id,
      serverId,
      action: 'server.launch.bulk_toggle_restrictions',
      requestBody: { enabled },
      ip: req.ip,
    });

    try {
      await agentPost(serverId, '/reload/server-launch', {});
    } catch {}

    res.json({
      ok: true,
      message: `Đã ${enabled ? 'bật' : 'tắt'} toàn bộ 10 quy tắc giới hạn máy chủ mới và đồng bộ vào Game!`,
      data: {
        restrictions_config: currentConfig,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/server-launches/:serverId/toggle-feature (Instant toggle master feature switch)
router.post('/:serverId/toggle-feature', requirePermission('server.config'), async (req, res) => {
  try {
    await ensureTable();
    const serverId = Number(req.params.serverId || (await getDefaultServerId()));
    const { feature, enabled } = req.body;

    const columnMap = {
      is_active: 'is_active',
      active: 'is_active',
      npc_gift: 'npc_gift_enabled',
      npc_gift_enabled: 'npc_gift_enabled',
      first_recharge: 'first_recharge_enabled',
      first_recharge_enabled: 'first_recharge_enabled',
      race: 'race_enabled',
      race_enabled: 'race_enabled',
      restrictions: 'restrictions_enabled',
      restrictions_enabled: 'restrictions_enabled',
    };

    const targetColumn = columnMap[feature];
    if (!targetColumn) {
      return res.status(400).json({ ok: false, error: `Tính năng không hợp lệ: ${feature}` });
    }

    const val = enabled ? 1 : 0;
    let extraSql = '';
    const extraParams = [];

    if (targetColumn === 'is_active') {
      extraSql = ', status = ?';
      extraParams.push(enabled ? 'active' : 'paused');
    }

    await exec(
      `UPDATE panel_server_launches SET ${targetColumn} = ?${extraSql} WHERE server_id = ?`,
      [val, ...extraParams, serverId]
    );

    await auditLog({
      userId: req.user.id,
      serverId,
      action: 'server.launch.toggle_feature',
      requestBody: { feature, targetColumn, enabled: Boolean(val) },
      ip: req.ip,
    });

    try {
      await agentPost(serverId, '/reload/server-launch', {});
    } catch {}

    const featureNames = {
      is_active: 'Toàn bộ Khai Mở Server',
      npc_gift_enabled: 'Quà NPC Chi Chi',
      first_recharge_enabled: 'Khuyến Mãi Nạp Đầu',
      race_enabled: 'Đua TOP Khai Mở',
      restrictions_enabled: 'Bộ 10 Quy Tắc & Giới Hạn',
    };

    res.json({
      ok: true,
      message: `Đã ${val === 1 ? 'bật' : 'tắt'} chức năng "${featureNames[targetColumn] || feature}" và đồng bộ ngay vào game!`,
      data: {
        feature,
        column: targetColumn,
        enabled: Boolean(val),
        status: targetColumn === 'is_active' ? (enabled ? 'active' : 'paused') : undefined,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/server-launches/:serverId/apply-preset (1-Click Vũ Trụ 15 Template)
router.post('/:serverId/apply-preset', requirePermission('server.config'), async (req, res) => {
  try {
    await ensureTable();
    const serverId = Number(req.params.serverId);
    const p = DEFAULT_VU_TRU_15_PRESET;

    await exec(
      `INSERT INTO panel_server_launches 
       (server_id, server_name, title, description, opens_at, top_race_ends_at, restrictions_end_at, status, is_active,
        npc_gift_enabled, npc_gift_config, first_recharge_enabled, first_recharge_config, race_enabled, race_config, restrictions_enabled, restrictions_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        server_name = VALUES(server_name),
        title = VALUES(title),
        description = VALUES(description),
        opens_at = VALUES(opens_at),
        top_race_ends_at = VALUES(top_race_ends_at),
        restrictions_end_at = VALUES(restrictions_end_at),
        status = VALUES(status),
        is_active = VALUES(is_active),
        npc_gift_enabled = VALUES(npc_gift_enabled),
        npc_gift_config = VALUES(npc_gift_config),
        first_recharge_enabled = VALUES(first_recharge_enabled),
        first_recharge_config = VALUES(first_recharge_config),
        race_enabled = VALUES(race_enabled),
        race_config = VALUES(race_config),
        restrictions_enabled = VALUES(restrictions_enabled),
        restrictions_config = VALUES(restrictions_config)`,
      [
        serverId, p.server_name, p.title, p.description, p.opens_at, p.top_race_ends_at, p.restrictions_end_at, p.status, p.is_active,
        p.npc_gift_enabled, jsonParam(p.npc_gift_config), p.first_recharge_enabled, jsonParam(p.first_recharge_config),
        p.race_enabled, jsonParam(p.race_config), p.restrictions_enabled, jsonParam(p.restrictions_config),
      ]
    );

    await auditLog({
      userId: req.user.id,
      serverId,
      action: 'server.launch.apply_preset',
      requestBody: { preset: 'VU_TRU_15' },
      ip: req.ip,
    });

    try {
      await agentPost(serverId, '/reload/server-launch', {});
    } catch {}

    res.json({ ok: true, message: 'Đã áp dụng mẫu chuẩn "KHAI MỞ VŨ TRỤ 15" và đồng bộ ngay vào Game!' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/server-launches/:serverId/rankings (Live Race Rankings)
router.get('/:serverId/rankings', requirePermission('player.view'), async (req, res) => {
  try {
    const serverId = Number(req.params.serverId);
    const category = String(req.query.category || 'power'); // 'mission' | 'power' | 'recharge_points'
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 100)));
    const search = String(req.query.q || '').trim();

    let list = [];

    if (category === 'mission') {
      // Top Nhiệm vụ: player.task_main (id, index...)
      const params = [];
      let where = 'WHERE 1=1';
      if (search) {
        where += ' AND p.name LIKE ?';
        params.push(`%${search}%`);
      }
      const rows = await query(
        `SELECT p.id, p.name, p.gender, p.clan_id, p.data_task, p.data_point, c.NAME AS clan_name, a.username, a.vip
         FROM player p
         LEFT JOIN clan c ON c.id = p.clan_id
         LEFT JOIN account a ON a.id = p.account_id
         ${where}
         LIMIT 2000`,
        params
      );

      list = rows.map((r) => {
        let taskMainId = 0;
        let taskMainIndex = 0;
        try {
          const taskArr = asJson(r.data_task, []);
          if (Array.isArray(taskArr) && taskArr.length > 0) {
            taskMainId = Number(taskArr[0]) || 0;
            taskMainIndex = Number(taskArr[1]) || 0;
          }
        } catch {}
        const score = taskMainId * 100 + taskMainIndex;
        return {
          id: r.id,
          name: r.name,
          username: r.username,
          clan_name: r.clan_name,
          gender: r.gender,
          vip: r.vip,
          task_id: taskMainId,
          task_index: taskMainIndex,
          score,
          score_display: `Nhiệm vụ #${taskMainId} (Bước ${taskMainIndex})`,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    } else if (category === 'power') {
      // Top Sức mạnh
      const params = [];
      let where = "WHERE p.data_point IS NOT NULL AND p.data_point != ''";
      if (search) {
        where += ' AND p.name LIKE ?';
        params.push(`%${search}%`);
      }
      const rows = await query(
        `SELECT p.id, p.name, p.gender, p.clan_id, p.data_point, c.NAME AS clan_name, a.username, a.vip
         FROM player p
         LEFT JOIN clan c ON c.id = p.clan_id
         LEFT JOIN account a ON a.id = p.account_id
         ${where}
         LIMIT 2000`,
        params
      );

      list = rows.map((r) => {
        const power = parsePlayerPower(r.data_point);
        return {
          id: r.id,
          name: r.name,
          username: r.username,
          clan_name: r.clan_name,
          gender: r.gender,
          vip: r.vip,
          power,
          score: power,
          score_display: `${power.toLocaleString('vi-VN')} Sức mạnh`,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    } else if (category === 'recharge_points') {
      // Top Điểm Tích Lũy (Nạp ngọc: 1 ngọc = 1 điểm, tối thiểu 20 điểm)
      const params = [];
      let where = 'WHERE 1=1';
      if (search) {
        where += ' AND (a.username LIKE ? OR p.name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      const rows = await query(
        `SELECT a.id AS account_id, a.username, a.tongnap, a.vnd, a.vip, a.event_point,
                p.id AS player_id, p.name AS player_name, p.gender, c.NAME AS clan_name
         FROM account a
         LEFT JOIN player p ON p.account_id = a.id
         LEFT JOIN clan c ON c.id = p.clan_id
         ${where}
         ORDER BY a.tongnap DESC, a.vnd DESC
         LIMIT 500`,
        params
      );

      // Điểm tích lũy = Math.floor(tongnap / 1000) hoặc event_point (1 ngọc = 1 điểm)
      list = rows.map((r) => {
        const points = Number(r.event_point) > 0 ? Number(r.event_point) : Math.floor(Number(r.tongnap || 0) / 1000);
        return {
          id: r.player_id || r.account_id,
          account_id: r.account_id,
          name: r.player_name || r.username,
          username: r.username,
          clan_name: r.clan_name,
          gender: r.gender ?? 0,
          vip: r.vip,
          points,
          score: points,
          score_display: `${points.toLocaleString('vi-VN')} Điểm tích lũy`,
          eligible: points >= 20,
        };
      })
      .filter((item) => item.points >= 20) // 20 điểm mới vào Top
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    }

    // Gán hạng rank 1 -> N
    const rankedList = list.map((item, idx) => ({ ...item, rank: idx + 1 }));

    res.json({
      ok: true,
      data: rankedList,
      category,
      total: rankedList.length,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/server-launches/:serverId/distribute-rewards (1-Click Auto Distribute Top Rewards)
router.post('/:serverId/distribute-rewards', requirePermission('server.config'), async (req, res) => {
  try {
    const serverId = Number(req.params.serverId);
    const category = String(req.body.category || 'all'); // 'mission' | 'power' | 'recharge_points' | 'all'

    const rows = await query('SELECT id FROM panel_server_launches WHERE server_id = ? LIMIT 1', [serverId]);
    const launchId = rows[0]?.id || 1;

    const categoriesToRun = category === 'all' ? ['mission', 'power', 'recharge_points'] : [category];
    const results = [];

    for (const cat of categoriesToRun) {
      const resCat = await distributeCategoryRewards({
        serverId,
        launchId,
        category: cat,
        distributedBy: req.user.id,
      });
      results.push(resCat);
    }

    const totalRewarded = results.reduce((sum, r) => sum + r.totalRewarded, 0);

    // Gửi thông báo phát quà trong game
    try {
      await agentPost(serverId, '/broadcast', {
        message: '🎉 Ban Quản Trị đã hoàn tất trao giải Đua TOP Khai Mở Server! Quà đã được gửi trực tiếp vào hành trang người chơi đạt giải!',
        type: 'event',
      });
    } catch {}

    await auditLog({
      userId: req.user.id,
      serverId,
      action: 'server.launch.distribute_rewards',
      requestBody: { category, categoriesToRun },
      response: { totalRewarded, results },
      ip: req.ip,
    });

    res.json({
      ok: true,
      message: `Đã trao giải thành công cho ${totalRewarded} lượt người chơi đạt TOP! Vật phẩm và Hồng Ngọc đã được gửi trực tiếp vào túi đồ.`,
      data: {
        totalRewarded,
        results,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/server-launches/:serverId/distribution-history
router.get('/:serverId/distribution-history', requirePermission('player.view'), async (req, res) => {
  try {
    const serverId = Number(req.params.serverId);
    const rows = await query(
      `SELECT id, launch_id, race_category, total_players, is_distributed, distributed_at, distributed_by, snapshot_data
       FROM panel_server_launch_top_snapshots
       WHERE server_id = ?
       ORDER BY id DESC
       LIMIT 50`,
      [serverId]
    );

    const data = rows.map((r) => ({
      id: r.id,
      launch_id: r.launch_id,
      race_category: r.race_category,
      total_players: r.total_players,
      is_distributed: Boolean(r.is_distributed),
      distributed_at: r.distributed_at,
      distributed_by: r.distributed_by,
      snapshot_data: asJson(r.snapshot_data, []),
    }));

    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
