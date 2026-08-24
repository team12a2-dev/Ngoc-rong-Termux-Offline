import { agentPost } from './agent.js';
import { getDefaultServerId } from './serverRegistry.js';

/** Push in-memory game state after panel DB / config writes (no server restart). */
export async function reloadGameResource(serverId, type) {
  const sid = Number(serverId || await getDefaultServerId());
  try {
    await agentPost(sid, `/reload/${type}`, {});
    return { reloaded: true, type };
  } catch (e) {
    return { reloaded: false, type, error: e.message };
  }
}

export async function reloadGiftcode(serverId) {
  return reloadGameResource(serverId, 'giftcode');
}

export async function reloadShop(serverId) {
  return reloadGameResource(serverId, 'shop');
}

export async function reloadBossSpawn(serverId) {
  return reloadGameResource(serverId, 'boss-spawn');
}

export async function reloadClans(serverId) {
  try {
    await agentPost(Number(serverId || await getDefaultServerId()), '/reload/clan', {});
    return { reloaded: true, type: 'clan' };
  } catch (e) {
    return { reloaded: false, type: 'clan', error: e.message };
  }
}

const CONFIG_RELOAD = {
  'boss_spawn.properties': 'boss-spawn',
};

export async function reloadAfterConfigSave(fileName, serverId) {
  const type = CONFIG_RELOAD[fileName];
  if (!type) return null;
  return reloadGameResource(serverId, type);
}
