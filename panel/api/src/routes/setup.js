import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { verifyGameDb } from '../db.js';
import { pingAgent } from '../services/agent.js';
import { exec, query } from '../db.js';
import { loadGameConfig, getDbConfigFromGameConfig, getAgentConfigFromGameConfig } from '../config/loadGameConfig.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    const db = await verifyGameDb();
    let agent = null;
    try {
      agent = await pingAgent(1);
    } catch (e) {
      agent = { ok: false, error: e.message };
    }
    let panelReady = false;
    try {
      await query('SELECT 1 FROM panel_users LIMIT 1');
      panelReady = true;
    } catch {
      panelReady = false;
    }
    res.json({ ok: true, data: { db, agent, panelReady } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/init', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'username and password required' });
  }
  try {
    const gameConfig = loadGameConfig();
    const dbConfig = getDbConfigFromGameConfig(gameConfig);
    const agentConfig = getAgentConfigFromGameConfig(gameConfig);
    const hash = await bcrypt.hash(password, 10);
    await exec(
      `INSERT INTO panel_users (username, password_hash, role_id) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [username, hash]
    );
    await exec(
      `UPDATE panel_servers SET agent_url = ?, agent_key = ?, game_db_name = ?, game_port = ? WHERE id = 1`,
      [agentConfig.url, agentConfig.key, dbConfig.database, agentConfig.gamePort]
    );
    res.json({ ok: true, message: 'Setup complete' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
