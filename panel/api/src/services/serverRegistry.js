import { query } from '../db.js';

const cache = new Map();
const CACHE_TTL = 30_000;

function isMissingPanelTable(err) {
  return err?.code === 'ER_NO_SUCH_TABLE' && String(err?.sqlMessage || '').includes('panel_');
}

export async function getServer(id) {
  const numId = Number(id);
  const cached = cache.get(numId);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.server;
  }
  try {
    const rows = await query(
      `SELECT id, name, agent_url, agent_key, game_db_host, game_db_port, game_db_name,
              game_db_user, game_db_pass, game_port, is_active
       FROM panel_servers WHERE id = ? LIMIT 1`,
      [numId]
    );
    if (!rows.length) {
      return null;
    }
    const server = rows[0];
    cache.set(numId, { server, at: Date.now() });
    return server;
  } catch (e) {
    if (isMissingPanelTable(e)) return null;
    throw e;
  }
}

export async function listServers(activeOnly = true) {
  try {
    if (activeOnly) {
      return await query('SELECT id, name, agent_url, game_port, is_active FROM panel_servers WHERE is_active = 1 ORDER BY id');
    }
    return await query('SELECT id, name, agent_url, agent_key, game_db_host, game_db_port, game_db_name, game_port, is_active FROM panel_servers ORDER BY id');
  } catch (e) {
    if (isMissingPanelTable(e)) return [];
    throw e;
  }
}

export function clearServerCache(id) {
  if (id != null) cache.delete(Number(id));
  else cache.clear();
}

export async function getDefaultServerId() {
  try {
    const rows = await query('SELECT id FROM panel_servers WHERE is_active = 1 ORDER BY id LIMIT 1');
    if (rows.length) return rows[0].id;
  } catch (e) {
    if (!isMissingPanelTable(e)) throw e;
  }
  return Number(process.env.DEFAULT_SERVER_ID || 1);
}
