import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const CONFIG_PATH = path.join(ROOT, 'Config.properties');

export function loadGameConfig(configPath = CONFIG_PATH) {
  const config = {};
  if (!fs.existsSync(configPath)) {
    return config;
  }
  const text = fs.readFileSync(configPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    config[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return config;
}

export function getDbConfigFromGameConfig(gameConfig = loadGameConfig()) {
  return {
    host: gameConfig['database.host'] || 'localhost',
    port: Number(gameConfig['database.port'] || 3306),
    database: gameConfig['database.name'] || 'ngocrong',
    user: gameConfig['database.user'] || 'root',
    password: gameConfig['database.pass'] ?? '',
  };
}

export function getAgentConfigFromGameConfig(gameConfig = loadGameConfig()) {
  const gamePort = Number(gameConfig['server.port'] || 14445);
  const agentPort = Number(gameConfig['panel.agent.port'] || gamePort + 1);
  const resolvedPort = agentPort === gamePort ? gamePort + 1 : agentPort;
  return {
    url: `http://${gameConfig['panel.agent.host'] || '127.0.0.1'}:${resolvedPort}`,
    key: gameConfig['panel.agent.key'] || 'change-me-in-production',
    gamePort,
    agentPort: resolvedPort,
    serverName: gameConfig['server.name'] || 'NRO Server',
  };
}

export { ROOT, CONFIG_PATH };
