import { getServer } from './serverRegistry.js';
import { getAgentConfigFromGameConfig, loadGameConfig } from '../config/loadGameConfig.js';

function agentFallbackFromConfig() {
  const agent = getAgentConfigFromGameConfig(loadGameConfig());
  return {
    id: Number(process.env.DEFAULT_SERVER_ID || 1),
    agent_url: process.env.GAME_AGENT_URL || agent.url,
    agent_key: process.env.GAME_AGENT_KEY || agent.key,
    game_port: agent.gamePort,
  };
}

async function resolveServer(serverId) {
  const tryIds = [
    serverId != null ? Number(serverId) : null,
    Number(process.env.DEFAULT_SERVER_ID || 1),
  ].filter((id, i, arr) => id != null && !Number.isNaN(id) && arr.indexOf(id) === i);

  for (const id of tryIds) {
    const s = await getServer(id);
    if (s) return s;
  }
  return agentFallbackFromConfig();
}

export async function agentRequest(serverId, path, options = {}) {
  const srv = await resolveServer(serverId);
  const url = `${srv.agent_url.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Panel-Key': srv.agent_key,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(Number(process.env.AGENT_TIMEOUT_MS || 8000)),
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'Invalid JSON' }));
  if (!res.ok) {
    const err = new Error(json.error || `Agent error ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

export async function agentGet(serverId, path) {
  return agentRequest(serverId, path, { method: 'GET' });
}

export async function agentPost(serverId, path, body) {
  return agentRequest(serverId, path, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export async function pingAgent(serverId) {
  return agentGet(serverId, '/health');
}

const cache = new Map();
const METRICS_CACHE_MS = Number(process.env.METRICS_CACHE_MS || 3000);
const PLAYERS_CACHE_MS = Number(process.env.PLAYERS_CACHE_MS || 8000);

async function cached(key, ttlMs, fn) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.data;
  const data = await fn();
  cache.set(key, { at: now, data });
  return data;
}

export async function getMetrics(serverId) {
  return cached(`metrics:${serverId}`, METRICS_CACHE_MS, () => agentGet(serverId, '/metrics'));
}

export async function getOnlinePlayers(serverId) {
  return cached(`players:${serverId}`, PLAYERS_CACHE_MS, () => agentGet(serverId, '/players'));
}
