import { agentGet, agentPost } from './agent.js';
import { getDefaultServerId } from './serverRegistry.js';
import { query } from '../db.js';

export async function isPlayerOnline(playerName, serverId) {
  const sid = Number(serverId || await getDefaultServerId());
  try {
    const one = await agentGet(sid, `/players/${encodeURIComponent(playerName)}`);
    return Boolean(one?.data);
  } catch {
    return false;
  }
}

async function getPlayerName(playerId) {
  const rows = await query('SELECT name FROM player WHERE id = ? LIMIT 1', [playerId]);
  return rows.length ? rows[0].name : null;
}

/** Apply item container payload directly to online player memory + client packets. */
export async function applyPlayerItemsOnline(playerId, container, items, serverId) {
  const name = await getPlayerName(playerId);
  if (!name) {
    return { applied: false, online: false, message: 'Không tìm thấy player' };
  }
  const sid = Number(serverId || await getDefaultServerId());
  const online = await isPlayerOnline(name, sid);
  if (!online) {
    return {
      applied: false,
      online: false,
      message: 'Player offline — thay đổi có hiệu lực khi đăng nhập lại',
    };
  }
  try {
    const res = await agentPost(sid, `/players/${encodeURIComponent(name)}/apply-items`, {
      container,
      items,
    });
    const applied = Boolean(res?.data?.applied);
    return {
      applied,
      online: true,
      message: applied
        ? `Đã cập nhật ${container} trên game (player online)`
        : 'Không áp dụng được lên game — cần build-panel.bat và khởi động lại game server',
    };
  } catch (e) {
    const staleAgent = /404|Unknown player action|Not found/i.test(e.message || '');
    return {
      applied: false,
      online: true,
      message: staleAgent
        ? 'Game agent chưa có apply-items — chạy build-panel.bat rồi khởi động lại game'
        : `Lỗi đồng bộ agent: ${e.message}`,
    };
  }
}

export async function syncPlayerToGame(playerId, serverId) {
  const name = await getPlayerName(playerId);
  if (!name) {
    return { synced: false, online: false, message: 'Không tìm thấy player' };
  }
  const sid = Number(serverId || await getDefaultServerId());
  const online = await isPlayerOnline(name, sid);
  if (!online) {
    return {
      synced: false,
      online: false,
      message: 'Player offline — thay đổi sẽ có hiệu lực khi đăng nhập lại',
    };
  }
  try {
    const res = await agentPost(sid, `/players/${encodeURIComponent(name)}/sync-db`, {});
    const synced = Boolean(res?.data?.synced);
    return {
      synced,
      online: true,
      message: synced
        ? 'Đã đồng bộ lên game server (player đang online)'
        : 'Không đồng bộ được — thử kick player và đăng nhập lại',
    };
  } catch (e) {
    const staleAgent = /404|Unknown player action|Not found/i.test(e.message || '');
    return {
      synced: false,
      online: true,
      message: staleAgent
        ? 'Game agent cũ — chạy build-panel.bat rồi khởi động lại game server (chỉ lần đầu sau cập nhật mã)'
        : `Lỗi đồng bộ agent: ${e.message}`,
    };
  }
}
