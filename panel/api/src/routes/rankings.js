import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query } from '../db.js';
import { parsePlayerPower } from '../config/gameDbSchema.js';

const router = Router();
router.use(authMiddleware);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const EVENT_METRICS = {
  event_point: { column: 'event_point', label: 'Điểm event chính' },
  point_sukien: { column: 'point_sukien', label: 'Điểm sự kiện' },
  point_sukien1: { column: 'point_sukien1', label: 'Điểm sự kiện 1' },
  point_sukien2: { column: 'point_sukien2', label: 'Điểm sự kiện 2' },
  point_maydam: { column: 'point_maydam', label: 'Điểm máy đầm' },
  lucky_round_point: { column: 'lucky_round_point', label: 'Lucky round' },
};

const CLAN_SORT = {
  power_point: { column: 'power_point', label: 'Tổng sức mạnh bang' },
  clan_point: { column: 'clan_point', label: 'Điểm bang' },
  LEVEL: { column: 'LEVEL', label: 'Cấp bang' },
};

function parseLimit(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function parseSearch(raw) {
  const q = String(raw ?? '').trim();
  return q.length >= 1 ? q : null;
}

function rankingMeta(type, extra = {}) {
  return { type, updatedAt: new Date().toISOString(), ...extra };
}

async function queryPowerRankings({ limit, q }) {
  const params = [];
  let where = "WHERE p.data_point IS NOT NULL AND p.data_point != '' AND p.data_point != '[]'";
  if (q) {
    where += ' AND p.name LIKE ?';
    params.push(`%${q}%`);
  }

  try {
    const rows = await query(
      `SELECT p.id, p.name, p.clan_id, p.account_id, p.gender,
              CAST(JSON_UNQUOTE(JSON_EXTRACT(p.data_point, '$[1]')) AS UNSIGNED) AS power,
              c.NAME AS clan_name, a.username, a.vip
       FROM player p
       LEFT JOIN clan c ON c.id = p.clan_id
       LEFT JOIN account a ON a.id = p.account_id
       ${where}
       ORDER BY power DESC
       LIMIT ?`,
      [...params, limit]
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      account_id: r.account_id,
      username: r.username,
      clan_id: r.clan_id,
      clan_name: r.clan_name,
      gender: r.gender,
      vip: r.vip,
      power: Number(r.power) || 0,
    }));
  } catch {
    const fallbackWhere = q ? 'WHERE p.name LIKE ?' : '';
    const fallbackParams = q ? [`%${q}%`] : [];
    const rows = await query(
      `SELECT p.id, p.name, p.clan_id, p.account_id, p.gender, p.data_point,
              c.NAME AS clan_name, a.username, a.vip
       FROM player p
       LEFT JOIN clan c ON c.id = p.clan_id
       LEFT JOIN account a ON a.id = p.account_id
       ${fallbackWhere}
       ORDER BY p.id DESC
       LIMIT 2000`,
      fallbackParams
    );
    return rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        account_id: r.account_id,
        username: r.username,
        clan_id: r.clan_id,
        clan_name: r.clan_name,
        gender: r.gender,
        vip: r.vip,
        power: parsePlayerPower(r.data_point),
      }))
      .sort((a, b) => b.power - a.power)
      .slice(0, limit);
  }
}

router.get('/meta', requirePermission('player.view'), (_req, res) => {
  res.json({
    ok: true,
    data: {
      eventMetrics: EVENT_METRICS,
      clanSort: CLAN_SORT,
      limits: { default: DEFAULT_LIMIT, max: MAX_LIMIT },
    },
  });
});

router.get('/power', requirePermission('player.view'), async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const q = parseSearch(req.query.q);
    const data = await queryPowerRankings({ limit, q });
    res.json({ ok: true, data, meta: rankingMeta('power', { limit, q, count: data.length }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/nap', requirePermission('account.view'), async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const q = parseSearch(req.query.q);
    const params = [];
    let where = 'WHERE 1=1';
    if (q) {
      where += ' AND username LIKE ?';
      params.push(`%${q}%`);
    }
    const rows = await query(
      `SELECT id, username, tongnap, vnd, vip, event_point, last_time_login, ban
       FROM account ${where}
       ORDER BY tongnap DESC, vnd DESC
       LIMIT ?`,
      [...params, limit]
    );
    res.json({ ok: true, data: rows, meta: rankingMeta('nap', { limit, q, count: rows.length }) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/event', requirePermission('player.view'), async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const q = parseSearch(req.query.q);
    const metricKey = String(req.query.metric || 'event_point');
    const metric = EVENT_METRICS[metricKey] || EVENT_METRICS.event_point;
    const params = [];
    let where = `WHERE p.${metric.column} > 0`;
    if (q) {
      where += ' AND p.name LIKE ?';
      params.push(`%${q}%`);
    }
    const rows = await query(
      `SELECT p.id, p.name, p.account_id, p.clan_id, p.${metric.column} AS score,
              c.NAME AS clan_name, a.username
       FROM player p
       LEFT JOIN clan c ON c.id = p.clan_id
       LEFT JOIN account a ON a.id = p.account_id
       ${where}
       ORDER BY score DESC
       LIMIT ?`,
      [...params, limit]
    );
    res.json({
      ok: true,
      data: rows.map((r) => ({ ...r, score: Number(r.score) || 0, metric: metricKey })),
      meta: rankingMeta('event', { limit, q, metric: metricKey, metricLabel: metric.label, count: rows.length }),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/clan', requirePermission('player.view'), async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const q = parseSearch(req.query.q);
    const sortKey = String(req.query.sort || 'power_point');
    const sort = CLAN_SORT[sortKey] || CLAN_SORT.power_point;
    const params = [];
    let where = 'WHERE 1=1';
    if (q) {
      where += ' AND NAME LIKE ?';
      params.push(`%${q}%`);
    }
    const rows = await query(
      `SELECT id, NAME, NAME_2, slogan, power_point, clan_point, LEVEL, max_member, create_time
       FROM clan ${where}
       ORDER BY ${sort.column} DESC
       LIMIT ?`,
      [...params, limit]
    );
    res.json({
      ok: true,
      data: rows,
      meta: rankingMeta('clan', { limit, q, sort: sortKey, sortLabel: sort.label, count: rows.length }),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/super-rank', requirePermission('player.view'), async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const q = parseSearch(req.query.q);
    const params = [];
    let where = 'WHERE rank > 0';
    if (q) {
      where += ' AND name LIKE ?';
      params.push(`%${q}%`);
    }
    const rows = await query(
      `SELECT id, player_id, name, rank, win, lose, ticket, last_pk_time, last_reward_time
       FROM super_rank ${where}
       ORDER BY rank ASC
       LIMIT ?`,
      [...params, limit]
    );
    res.json({ ok: true, data: rows, meta: rankingMeta('super-rank', { limit, q, count: rows.length }) });
  } catch (e) {
    if (/doesn't exist|Unknown table/i.test(e.message)) {
      res.json({ ok: true, data: [], meta: rankingMeta('super-rank', { limit, q: parseSearch(req.query.q), count: 0, unavailable: true }) });
      return;
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
