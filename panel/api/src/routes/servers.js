import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { agentGet, agentPost, pingAgent } from '../services/agent.js';
import { auditLog, getMetricsHistory, saveMetrics } from '../services/audit.js';
import { query, exec } from '../db.js';
import { listServers, getServer, clearServerCache } from '../services/serverRegistry.js';

const router = Router();

router.use(authMiddleware);

// List all servers (no :id)
router.get('/', requirePermission('dashboard.view'), async (_req, res) => {
  try {
    const rows = await listServers(true);
    res.json({ ok: true, data: rows });
  } catch {
    res.json({ ok: true, data: [{ id: 1, name: 'Server 1', agent_url: process.env.GAME_AGENT_URL, game_port: 14445, is_active: 1 }] });
  }
});

router.post('/', requirePermission('server.config'), async (req, res) => {
  const { name, agent_url, agent_key, game_db_host, game_db_port, game_db_name, game_db_user, game_db_pass, game_port } = req.body || {};
  try {
    const result = await exec(
      `INSERT INTO panel_servers (name, agent_url, agent_key, game_db_host, game_db_port, game_db_name, game_db_user, game_db_pass, game_port)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name || 'New Server',
        agent_url || 'http://127.0.0.1:14446',
        agent_key || 'change-me',
        game_db_host || 'localhost',
        game_db_port || 3306,
        game_db_name || 'ngocrong',
        game_db_user || 'root',
        game_db_pass || '',
        game_port || 14445,
      ]
    );
    clearServerCache();
    await auditLog({ userId: req.user.id, action: 'server.create', target: String(result.insertId), requestBody: req.body, ip: req.ip });
    res.json({ ok: true, data: { id: result.insertId } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/:id', requirePermission('dashboard.view'), async (req, res) => {
  const srv = await getServer(req.params.id);
  if (!srv) return res.status(404).json({ ok: false, error: 'Not found' });
  const { agent_key, game_db_pass, ...safe } = srv;
  res.json({ ok: true, data: { ...safe, hasAgentKey: !!agent_key, hasDbPass: !!game_db_pass } });
});

router.put('/:id', requirePermission('server.config'), async (req, res) => {
  const { name, agent_url, agent_key, game_db_host, game_db_port, game_db_name, game_db_user, game_db_pass, game_port, is_active } = req.body || {};
  try {
    await exec(
      `UPDATE panel_servers SET
         name = COALESCE(?, name),
         agent_url = COALESCE(?, agent_url),
         agent_key = COALESCE(?, agent_key),
         game_db_host = COALESCE(?, game_db_host),
         game_db_port = COALESCE(?, game_db_port),
         game_db_name = COALESCE(?, game_db_name),
         game_db_user = COALESCE(?, game_db_user),
         game_db_pass = COALESCE(?, game_db_pass),
         game_port = COALESCE(?, game_port),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ?? null, agent_url ?? null, agent_key ?? null,
        game_db_host ?? null, game_db_port ?? null, game_db_name ?? null,
        game_db_user ?? null, game_db_pass ?? null, game_port ?? null,
        is_active != null ? (is_active ? 1 : 0) : null,
        req.params.id,
      ]
    );
    clearServerCache(req.params.id);
    await auditLog({ userId: req.user.id, serverId: Number(req.params.id), action: 'server.update', requestBody: req.body, ip: req.ip });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/:id', requirePermission('server.config'), async (req, res) => {
  if (Number(req.params.id) === 1) {
    return res.status(400).json({ ok: false, error: 'Cannot delete default server' });
  }
  await exec('UPDATE panel_servers SET is_active = 0 WHERE id = ?', [req.params.id]);
  clearServerCache(req.params.id);
  await auditLog({ userId: req.user.id, action: 'server.delete', target: req.params.id, ip: req.ip });
  res.json({ ok: true });
});

const sid = (req) => Number(req.params.id);

router.get('/:id/ping', requirePermission('dashboard.view'), async (req, res) => {
  try {
    res.json(await pingAgent(sid(req)));
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/:id/metrics', requirePermission('dashboard.view'), async (req, res) => {
  try {
    const data = await agentGet(sid(req), '/metrics');
    if (process.env.METRICS_HISTORY_ENABLED === 'true') {
      await saveMetrics(sid(req), data.data);
    }
    res.json(data);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/:id/metrics/history', requirePermission('dashboard.view'), async (req, res) => {
  const hours = Number(req.query.hours || 24);
  const rows = await getMetricsHistory(sid(req), hours);
  res.json({ ok: true, data: rows });
});

router.get('/:id/players/online', requirePermission('player.view'), async (req, res) => {
  try {
    res.json(await agentGet(sid(req), '/players'));
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/:id/players/online/:name', requirePermission('player.view'), async (req, res) => {
  try {
    res.json(await agentGet(sid(req), `/players/${encodeURIComponent(req.params.name)}`));
  } catch (e) {
    res.status(e.status || 502).json({ ok: false, error: e.message });
  }
});

router.post('/:id/players/online/:name/kick', requirePermission('player.kick'), async (req, res) => {
  try {
    const result = await agentPost(sid(req), `/players/${encodeURIComponent(req.params.name)}/kick`, {});
    await auditLog({ userId: req.user.id, serverId: sid(req), action: 'player.kick', target: req.params.name, requestBody: req.body, response: result, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.post('/:id/players/online/:name/buff-vnd', requirePermission('player.buff'), async (req, res) => {
  try {
    const result = await agentPost(sid(req), `/players/${encodeURIComponent(req.params.name)}/buff-vnd`, req.body);
    await auditLog({ userId: req.user.id, serverId: sid(req), action: 'player.buff.vnd', target: req.params.name, requestBody: req.body, response: result, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.post('/:id/maintenance', requirePermission('server.maint'), async (req, res) => {
  try {
    const result = await agentPost(sid(req), '/maintenance', req.body);
    await auditLog({ userId: req.user.id, serverId: sid(req), action: 'server.maintenance', requestBody: req.body, response: result, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.post('/:id/admin-mode', requirePermission('server.config'), async (req, res) => {
  try {
    const result = await agentPost(sid(req), '/config/admin-mode', req.body);
    await auditLog({ userId: req.user.id, serverId: sid(req), action: 'server.admin_mode', requestBody: req.body, response: result, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.post('/:id/exp-rate', requirePermission('server.config'), async (req, res) => {
  try {
    const result = await agentPost(sid(req), '/config/exp', req.body);
    await auditLog({ userId: req.user.id, serverId: sid(req), action: 'server.exp_rate', requestBody: req.body, response: result, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.post('/:id/broadcast', requirePermission('server.broadcast'), async (req, res) => {
  try {
    const result = await agentPost(sid(req), '/broadcast', req.body);
    await auditLog({ userId: req.user.id, serverId: sid(req), action: 'server.broadcast', requestBody: req.body, response: result, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/:id/runtime-config', requirePermission('dashboard.view'), async (req, res) => {
  try {
    res.json(await agentGet(sid(req), '/runtime-config'));
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/:id/boss/list', requirePermission('boss.control'), async (req, res) => {
  try {
    res.json(await agentGet(sid(req), '/boss/list'));
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.post('/:id/boss/spawn', requirePermission('boss.control'), async (req, res) => {
  try {
    const result = await agentPost(sid(req), '/boss/spawn', req.body);
    await auditLog({ userId: req.user.id, serverId: sid(req), action: 'boss.spawn', requestBody: req.body, response: result, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.post('/:id/reload/:type', requirePermission('server.config'), async (req, res) => {
  const allowed = ['shop', 'giftcode', 'boss-spawn'];
  if (!allowed.includes(req.params.type)) {
    return res.status(400).json({ ok: false, error: 'Invalid reload type' });
  }
  try {
    const result = await agentPost(sid(req), `/reload/${req.params.type}`, {});
    await auditLog({ userId: req.user.id, serverId: sid(req), action: `reload.${req.params.type}`, response: result, ip: req.ip });
    res.json(result);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

router.get('/:id/events', requirePermission('dashboard.view'), async (req, res) => {
  try {
    res.json(await agentGet(sid(req), '/events'));
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

export default router;
