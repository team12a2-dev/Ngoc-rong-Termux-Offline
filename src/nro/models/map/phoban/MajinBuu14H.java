package nro.models.map.phoban;

import nro.models.utils.Functions;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import nro.models.boss.Boss;
import nro.models.boss.MajinBuu_14h.Mabu2H;
import nro.models.boss.MajinBuu_14h.SuperBu;
import nro.models.map.Zone;
import nro.models.map.MaBuHold;
import nro.models.player.Player;
import nro.models.server.Maintenance;
import nro.models.map.service.MapService;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.TimeUtil;

public final class MajinBuu14H implements Runnable {
    public static final int AVAILABLE = 7;
    public int id;
    public final List<Zone> zones;
    private volatile Mabu2H mabuBoss;
    private volatile SuperBu superBuBoss;
    private boolean eventWindowOpen;
    private boolean eventBossesStarted;

    public MajinBuu14H(int id) {
        this.id = id;
        this.zones = new CopyOnWriteArrayList<>();
        this.init();
    }

    public void init() {
        new Thread(this, "MajinBuu 14H - Id : " + id).start();
    }

    @Override
    public void run() {
        while (!Maintenance.isRunning) {
            try {
                long startTime = System.currentTimeMillis();
                update();
                long interval = TimeUtil.isMabu14HOpen() ? 150L : 1000L;
                Functions.sleep(Math.max(interval - (System.currentTimeMillis() - startTime), 10L));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void update() {
        if (!TimeUtil.isMabu14HOpen()) {
            if (eventWindowOpen) {
                eventWindowOpen = false;
                eventBossesStarted = false;
                stopEventBosses();
            }
            finish();
            return;
        }
        if (!eventWindowOpen) {
            eventWindowOpen = true;
            eventBossesStarted = false;
        }
        if (!eventBossesStarted) {
            eventBossesStarted = startEventBosses();
        }
        for (int j = zones.size() - 1; j >= 0; j--) {
            Zone zone = zones.get(j);
            for (MaBuHold hold : zone.maBuHolds) {
                if (hold.player != null && (hold.player.maBuHold == null || hold.player.zone == null)) {
                    hold.player = null;
                }
            }
        }
    }

    public synchronized void registerBoss(Boss boss) {
        if (boss instanceof Mabu2H mabu) {
            this.mabuBoss = mabu;
        } else if (boss instanceof SuperBu superBu) {
            this.superBuBoss = superBu;
        }
    }

    private synchronized boolean startEventBosses() {
        Zone mabuZone = getMapById(127);
        Zone stomachZone = getMapById(128);
        if (mabuZone == null || stomachZone == null || mabuBoss == null || superBuBoss == null) {
            return false;
        }
        mabuBoss.startMabu14HEvent(mabuZone);
        superBuBoss.startMabu14HEvent(stomachZone);
        return true;
    }

    private synchronized void stopEventBosses() {
        if (mabuBoss != null) {
            mabuBoss.stopMabu14HEvent();
        }
        if (superBuBoss != null) {
            superBuBoss.stopMabu14HEvent();
        }
    }

    public MaBuHold getMaBuHold() {
        for (Zone zone : this.zones) {
            if (zone.map.mapId == 128) {
                for (MaBuHold hold : zone.maBuHolds) {
                    if (hold.player == null) {
                        return hold;
                    }
                }
            }
        }
        return null;
    }

    public Zone getMapById(int mapId) {
        for (Zone zone : this.zones) {
            if (zone.map.mapId == mapId) {
                return zone;
            }
        }
        return null;
    }

    private void finish() {
        for (int j = zones.size() - 1; j >= 0; j--) {
            Zone zone = zones.get(j);
            for (int i = zone.getPlayers().size() - 1; i >= 0; i--) {
                if (i < zone.getPlayers().size()) {
                    Player pl = zone.getPlayers().get(i);
                    kickOut(pl);
                }
            }
        }
    }

    private void kickOut(Player player) {
        if (player != null && player.zone != null
                && MapService.gI().isMapMabu2H(player.zone.map.mapId) && !player.isAdmin()) {
            ChangeMapService.gI().changeMapBySpaceShip(player, player.gender + 21, -1, 336);
        }
    }

    @java.lang.SuppressWarnings("all")
    public int getId() {
        return this.id;
    }

    @java.lang.SuppressWarnings("all")
    public List<Zone> getZones() {
        return this.zones;
    }

    @java.lang.SuppressWarnings("all")
    public void setId(final int id) {
        this.id = id;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof MajinBuu14H)) return false;
        final MajinBuu14H other = (MajinBuu14H) o;
        if (this.getId() != other.getId()) return false;
        final java.lang.Object this$zones = this.getZones();
        final java.lang.Object other$zones = other.getZones();
        if (this$zones == null ? other$zones != null : !this$zones.equals(other$zones)) return false;
        return true;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public int hashCode() {
        final int PRIME = 59;
        int result = 1;
        result = result * PRIME + this.getId();
        final java.lang.Object $zones = this.getZones();
        result = result * PRIME + ($zones == null ? 43 : $zones.hashCode());
        return result;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public java.lang.String toString() {
        return "MajinBuu14H(id=" + this.getId() + ", zones=" + this.getZones() + ")";
    }
}
