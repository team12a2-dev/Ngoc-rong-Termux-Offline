package nro.models.server;

import nro.models.data.LocalManager;
import nro.models.database.PlayerDAO;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.network.SessionManager;
import nro.models.interfaces.ISession;
import nro.models.network.MySession;
import nro.models.services.Service;
import nro.models.services.EventProgressService;

import nro.models.map.service.ChangeMapService;
import nro.models.services.shenron.SummonDragon;
import nro.models.services_func.TransactionService;
import nro.models.services_dungeon.NgocRongNamecService;
import nro.models.utils.Functions;
import nro.models.utils.Logger;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import nro.models.services.shenron.SummonDragonNamek;

/**
 * @author By AmodsubVN
 */
public class Client implements Runnable {
    private static final long FIRST_AUTO_SAVE_DELAY = 5 * 60 * 1000L;
    private static final long AUTO_SAVE_INTERVAL = 180 * 1000L;
    private static Client instance;
    private final Map<Long, Player> players_id = new HashMap<>();
    private final Map<Integer, Player> players_userId = new HashMap<>();
    private final Map<String, Player> players_name = new HashMap<>();
    private final List<Player> players = new ArrayList<>();
    private volatile long nextAutoSaveTime = -1L;

    private Client() {
        new Thread(this, "Update Client").start();
    }

    public static Client gI() {
        if (instance == null) {
            instance = new Client();
        }
        return instance;
    }

    public void put(Player player) {
        if (!players_id.containsKey(player.id)) {
            this.players_id.put(player.id, player);
        }
        if (!players_name.containsValue(player)) {
            this.players_name.put(player.name, player);
        }
        if (!players_userId.containsValue(player)) {
            this.players_userId.put(player.getSession().userId, player);
        }
        if (!players.contains(player)) {
            synchronized (this.players) {
                if (!players.contains(player)) {
                    this.players.add(player);
                }
            }
        }
        EventProgressService.gI().deliverPendingRewards(player);
    }

    public void startAutoSave() {
        if (this.nextAutoSaveTime < 0) {
            this.nextAutoSaveTime = System.currentTimeMillis() + FIRST_AUTO_SAVE_DELAY;
            Logger.success("AUTO SAVE PLAYER WILL START AFTER 5 MINUTES\n");
        }
    }

    private void remove(MySession session) {
        if (session.player != null) {
            this.remove(session.player);
            session.player.dispose();
        }
        if (session.joinedGame) {
            session.joinedGame = false;
            try {
                LocalManager.executeUpdate("update account set last_time_logout = ? where id = ?", new Timestamp(System.currentTimeMillis()), session.userId);
            } catch (Exception e) {
                Logger.logException(Client.class, e);
            }
        }
        ServerManager.gI().disconnect(session);
    }

    private void remove(Player player) {
        this.players_id.remove(player.id);
        this.players_name.remove(player.name);
        this.players_userId.remove(player.getSession().userId);
        synchronized (this.players) {
            this.players.remove(player);
        }
        if (!player.beforeDispose) {
            player.beforeDispose = true;
            player.mapIdBeforeLogout = player.zone.map.mapId;
            if (player.idNRNM != -1) {
                ItemMap itemMap = new ItemMap(player.zone, player.idNRNM, 1, player.location.x, player.location.y, -1);
                Service.gI().dropItemMap(player.zone, itemMap);
                NgocRongNamecService.gI().pNrNamec[player.idNRNM - 353] = "";
                NgocRongNamecService.gI().idpNrNamec[player.idNRNM - 353] = -1;
                player.idNRNM = -1;
            }
            ChangeMapService.gI().exitMap(player);
            TransactionService.gI().cancelTrade(player);
            if (player.clan != null) {
                player.clan.removeMemberOnline(null, player);
            }
            if (SummonDragon.gI().playerSummonShenron != null && SummonDragon.gI().playerSummonShenron.id == player.id) {
                SummonDragon.gI().isPlayerDisconnect = true;
            }
            if (SummonDragonNamek.gI().playerSummonShenron != null && SummonDragonNamek.gI().playerSummonShenron.id == player.id) {
                SummonDragonNamek.gI().isPlayerDisconnect = true;
            }
            if (player.shenronEvent != null) {
                player.shenronEvent.isPlayerDisconnect = true;
            }
            if (player.mobMe != null) {
                player.mobMe.mobMeDie();
            }
            if (player.pet != null) {
                if (player.pet.mobMe != null) {
                    player.pet.mobMe.mobMeDie();
                }
                ChangeMapService.gI().exitMap(player.pet);
            }
        }
        PlayerDAO.updatePlayer(player);
    }

    private void autoSavePlayersIfNeeded() {
        if (this.nextAutoSaveTime < 0 || System.currentTimeMillis() < this.nextAutoSaveTime) {
            return;
        }
        this.nextAutoSaveTime = System.currentTimeMillis() + AUTO_SAVE_INTERVAL;
        autoSavePlayers();
    }

    private void autoSavePlayers() {
        List<Player> playersSnapshot;
        synchronized (this.players) {
            playersSnapshot = new ArrayList<>(this.players);
        }
        int saved = 0;
        int failed = 0;
        for (Player player : playersSnapshot) {
            if (player == null || player.beforeDispose || player.name == null || player.getSession() == null) {
                continue;
            }
            try {
                if (player.zone != null && player.zone.map != null) {
                    player.mapIdBeforeLogout = player.zone.map.mapId;
                }
                System.out.println("[AutoSave] Saving: " + player.name);
                PlayerDAO.updatePlayer(player);
                saved++;
            } catch (Exception e) {
                failed++;
                System.out.println("[AutoSave] Failed to save player: " + player.name + " | Error: " + e.getMessage());
                Logger.logException(Client.class, e);
            }
        }
        System.out.println("[AutoSave] Done - saved: " + saved + ", failed: " + failed + ", total: " + playersSnapshot.size());
    }

    public void kickSession(MySession session) {
        if (session != null) {
            this.remove(session);
            session.disconnect();
        }
    }

    public Player getPlayer(long playerId) {
        return this.players_id.get(playerId);
    }

    public Player getPlayerByUser(int userId) {
        return this.players_userId.get(userId);
    }

    public Player getPlayer(String name) {
        return this.players_name.get(name);
    }

    public void close() {
        Logger.log(Logger.YELLOW, "BEGIN KICK OUT SESSION " + players.size() + "\n");
        while (true) {
            Player pl;
            synchronized (this.players) {
                if (players.isEmpty()) {
                    break;
                }
                pl = players.remove(0);
            }
            if (pl != null && pl.getSession() != null) {
                this.kickSession(pl.getSession());
            }
        }
        Logger.success("SUCCESSFUL\n");
    }

    private void update() {
        for (int i = SessionManager.gI().getSessions().size() - 1; i >= 0; i--) {
            ISession s = SessionManager.gI().getSessions().get(i);
            MySession session = (MySession) s;
            if (session == null) {
                SessionManager.gI().getSessions().remove(i);
                continue;
            }
            if (session.timeWait > 0) {
                session.timeWait--;
                if (session.timeWait == 0) {
                    kickSession(session);
                }
            }
        }
    }

    public Player getPlayerByID(int playerId) {
        for (int i = 0; i < players.size(); i++) {
            Player player = players.get(i);
            if (player != null && player.id == playerId) {
                return player;
            }
        }
        return null;
    }

    @Override
    public void run() {
        while (ServerManager.isRunning) {
            long st = System.currentTimeMillis();
            try {
                update();
                autoSavePlayersIfNeeded();
            } catch (Exception e) {
                e.printStackTrace();
            }
            Functions.sleep(Math.max(1000 - (System.currentTimeMillis() - st), 10));
        }
    }

    @java.lang.SuppressWarnings("all")
    public List<Player> getPlayers() {
        return this.players;
    }
}
