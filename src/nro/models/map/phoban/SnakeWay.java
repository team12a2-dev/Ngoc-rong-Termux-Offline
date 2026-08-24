package nro.models.map.phoban;

import nro.models.utils.Functions;
import nro.models.boss_con_duong_ran_doc.SAIBAMEN;
import nro.models.boss_con_duong_ran_doc.NADIC;
import nro.models.boss_con_duong_ran_doc.CADICH;
import nro.models.boss.Boss;
import nro.models.consts.BossStatus;
import nro.models.clan.Clan;
import nro.models.map.Zone;
import nro.models.mob.Mob;
import nro.models.player.Player;
import nro.models.services.ItemTimeService;
import nro.models.map.service.MapService;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.Util;
import java.util.ArrayList;
import java.util.List;
import nro.models.server.Maintenance;
import nro.models.map.service.ItemMapService;
import nro.models.utils.TimeUtil;

public class SnakeWay implements Runnable {
    public static final long POWER_CAN_GO_TO_CDRD = 2000000000;
    public static final int AVAILABLE = 50;
    public static final int TIME_CON_DUONG_RAN_DOC = 1800000;
    public int id;
    public byte level;
    public final List<Zone> zones;
    public Clan clan;
    public boolean isOpened;
    private long lastTimeOpen;
    private long lastTimeUpdateMessage;
    private boolean kickoutcdrd;
    private long timeKickOutCDRD;
    public List<Boss> bosses = new ArrayList<>();
    public boolean endCDRD;
    public boolean allMobsDead;

    public void addZone(Zone zone) {
        this.zones.add(zone);
    }

    public SnakeWay(int id) {
        this.id = id;
        this.zones = new ArrayList<>();
    }

    @Override
    public void run() {
        while (!Maintenance.isRunning && isOpened) {
            try {
                long startTime = System.currentTimeMillis();
                update();
                Functions.sleep(Math.max(150 - (System.currentTimeMillis() - startTime), 10));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void update() {
        if (isOpened) {
            if (Util.canDoWithTime(lastTimeOpen, TIME_CON_DUONG_RAN_DOC) || (kickoutcdrd && Util.canDoWithTime(timeKickOutCDRD, 60000))) {
                finish();
                dispose();
            }
            boolean allCharactersDead = true;
            for (Zone zone : zones) {
                for (Mob mob : zone.mobs) {
                    if (!mob.isDie()) {
                        allCharactersDead = false;
                        break;
                    }
                }
            }
            if (allCharactersDead) {
                allMobsDead = true;
            }
            if (!kickoutcdrd && (endCDRD || Util.canDoWithTime(lastTimeOpen, TIME_CON_DUONG_RAN_DOC - 60000))) {
                kickoutcdrd = true;
                timeKickOutCDRD = System.currentTimeMillis();
            }
            if (kickoutcdrd && Util.canDoWithTime(lastTimeUpdateMessage, 10000)) {
                lastTimeUpdateMessage = System.currentTimeMillis();
                for (Zone zone : zones) {
                    List<Player> players = zone.getPlayers();
                    for (Player pl : players) {
                        Service.gI().sendThongBao(pl, "Trận chiến với người Xayda sẽ kết thúc sau " + TimeUtil.getTimeLeft(timeKickOutCDRD, 60) + " nữa");
                    }
                }
            }
        }
    }

    public void openConDuongRanDoc(Player plOpen, Clan clan, byte level) {
        try {
            this.level = level;
            this.lastTimeOpen = System.currentTimeMillis();
            this.clan = clan;
            this.clan.lastTimeOpenConDuongRanDoc = this.lastTimeOpen;
            this.clan.playerOpenConDuongRanDoc = plOpen;
            this.clan.ConDuongRanDoc = this;
            this.isOpened = true;
            this.init();
            sendTextConDuongRanDoc();
        } catch (Exception e) {
            plOpen.clan.lastTimeOpenConDuongRanDoc = 0;
            this.dispose();
        }
    }

    public void sendThanhTichCDRD(Player pl) {
        if (pl == null || pl.clan == null || pl.clan.ConDuongRanDoc != this) {
            return;
        }
        long timeDoneCDRD = System.currentTimeMillis() - pl.clan.lastTimeOpenConDuongRanDoc;
        int levelDoneCDRD = pl.clan.ConDuongRanDoc.level;
        if (levelDoneCDRD > pl.clan.levelDoneCDRD) {
            pl.clan.levelDoneCDRD = levelDoneCDRD;
            pl.clan.thoiGianHoanThanhCDRD = timeDoneCDRD;
        } else if (levelDoneCDRD == pl.clan.levelDoneCDRD) {
            if (timeDoneCDRD < pl.clan.thoiGianHoanThanhCDRD) {
                pl.clan.thoiGianHoanThanhCDRD = timeDoneCDRD;
            }
        }
        pl.clan.updatethanhTichCDRDForLeader();
    }

    private void init() {
        //Há»“i sinh quÃ¡i
        for (Zone zone : this.zones) {
            List<Mob> mobs = zone.mobs;
            for (int i = 0; i < mobs.size(); i++) {
                Mob mob = mobs.get(i);
                if (i == 5) {
                    mob.lvMob = 1;
                    mob.point.dame = (int) level * 100 * mob.tempId * 12;
                    mob.point.maxHp = (int) level * 1000 * mob.tempId * 12;
                    mob.hoiSinh();
                    mob.hoiSinhMobPhoBan();
                } else {
                    mob.lvMob = 0;
                    mob.point.dame = (int) level * 10 * mob.tempId;
                    mob.point.maxHp = (int) level * 100 * mob.tempId;
                    mob.hoiSinh();
                    mob.hoiSinhMobPhoBan();
                }
            }
            if (zone.map.mapId == 144) {
                try {
                    long bossDamage = (200000 * level);
                    long bossMaxHealth = (2000000 * level);
                    for (int i = 6; i > 0; i--) {
                        bossDamage = Math.min(bossDamage, 200000000L);
                        bossMaxHealth = Math.min(bossMaxHealth, 2000000000L);
                        bosses.add(new SAIBAMEN(zone, clan, i, (int) bossDamage, (int) bossMaxHealth));
                    }
                    bossDamage = Math.min(bossDamage * 5, 200000000L);
                    bossMaxHealth = Math.min(bossMaxHealth * 5, 2000000000L);
                    bosses.add(new NADIC(zone, clan, (int) bossDamage, (int) bossMaxHealth));
                    bossDamage = Math.min(bossDamage * 10, 200000000L);
                    bossMaxHealth = Math.min(bossMaxHealth * 10, 2000000000L);
                    bosses.add(new CADICH(zone, clan, (int) bossDamage, (int) bossMaxHealth));
                } catch (Exception exception) {
                }
            }
        }
        new Thread(this, "Con Đường Rắn Độc: " + this.clan.name).start();
    }

    public void finish() {
        for (Zone zone : zones) {
            for (int i = zone.getPlayers().size() - 1; i >= 0; i--) {
                if (i < zone.getPlayers().size()) {
                    Player pl = zone.getPlayers().get(i);
                    sendThanhTichCDRD(pl);
                    kickOutOfCDRD(pl);
                }
            }
        }
    }

    private void kickOutOfCDRD(Player player) {
        if (MapService.gI().isMapConDuongRanDoc(player.zone.map.mapId)) {
            ChangeMapService.gI().changeMapBySpaceShip(player, 5, -1, 1038);
        }
    }

    public Zone getMapById(int mapId) {
        for (Zone zone : this.zones) {
            if (zone.map.mapId == mapId) {
                return zone;
            }
        }
        return null;
    }

    private void sendTextConDuongRanDoc() {
        for (Player pl : this.clan.membersInGame) {
            ItemTimeService.gI().sendTextConDuongRanDoc(pl);
        }
    }

    private void removeTextConDuongRanDoc() {
        for (Player pl : this.clan.membersInGame) {
            ItemTimeService.gI().removeTextConDuongRanDoc(pl);
        }
    }

    public long getNumBossAlive() {
        return bosses.stream().filter(boss -> boss.bossStatus != BossStatus.REST).count();
    }

    public void dispose() {
        // remove bosses
        for (Boss boss : bosses) {
            if (!boss.isDie()) {
                boss.leaveMap();
            }
        }
        for (Zone zone : zones) {
            for (int i = zone.items.size() - 1; i >= 0; i--) {
                if (i < zone.items.size()) {
                    ItemMapService.gI().removeItemMap(zone.items.get(i));
                }
            }
        }
        this.removeTextConDuongRanDoc();
        this.bosses.clear();
        this.allMobsDead = false;
        this.endCDRD = false;
        this.isOpened = false;
        this.clan.ConDuongRanDoc = null;
        this.clan = null;
        this.kickoutcdrd = false;
    }

    @java.lang.SuppressWarnings("all")
    public int getId() {
        return this.id;
    }

    @java.lang.SuppressWarnings("all")
    public byte getLevel() {
        return this.level;
    }

    @java.lang.SuppressWarnings("all")
    public List<Zone> getZones() {
        return this.zones;
    }

    @java.lang.SuppressWarnings("all")
    public Clan getClan() {
        return this.clan;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isOpened() {
        return this.isOpened;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeOpen() {
        return this.lastTimeOpen;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeUpdateMessage() {
        return this.lastTimeUpdateMessage;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isKickoutcdrd() {
        return this.kickoutcdrd;
    }

    @java.lang.SuppressWarnings("all")
    public long getTimeKickOutCDRD() {
        return this.timeKickOutCDRD;
    }

    @java.lang.SuppressWarnings("all")
    public List<Boss> getBosses() {
        return this.bosses;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isEndCDRD() {
        return this.endCDRD;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isAllMobsDead() {
        return this.allMobsDead;
    }

    @java.lang.SuppressWarnings("all")
    public void setId(final int id) {
        this.id = id;
    }

    @java.lang.SuppressWarnings("all")
    public void setLevel(final byte level) {
        this.level = level;
    }

    @java.lang.SuppressWarnings("all")
    public void setClan(final Clan clan) {
        this.clan = clan;
    }

    @java.lang.SuppressWarnings("all")
    public void setOpened(final boolean isOpened) {
        this.isOpened = isOpened;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeOpen(final long lastTimeOpen) {
        this.lastTimeOpen = lastTimeOpen;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeUpdateMessage(final long lastTimeUpdateMessage) {
        this.lastTimeUpdateMessage = lastTimeUpdateMessage;
    }

    @java.lang.SuppressWarnings("all")
    public void setKickoutcdrd(final boolean kickoutcdrd) {
        this.kickoutcdrd = kickoutcdrd;
    }

    @java.lang.SuppressWarnings("all")
    public void setTimeKickOutCDRD(final long timeKickOutCDRD) {
        this.timeKickOutCDRD = timeKickOutCDRD;
    }

    @java.lang.SuppressWarnings("all")
    public void setBosses(final List<Boss> bosses) {
        this.bosses = bosses;
    }

    @java.lang.SuppressWarnings("all")
    public void setEndCDRD(final boolean endCDRD) {
        this.endCDRD = endCDRD;
    }

    @java.lang.SuppressWarnings("all")
    public void setAllMobsDead(final boolean allMobsDead) {
        this.allMobsDead = allMobsDead;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof SnakeWay)) return false;
        final SnakeWay other = (SnakeWay) o;
        if (!other.canEqual((java.lang.Object) this)) return false;
        if (this.getId() != other.getId()) return false;
        if (this.getLevel() != other.getLevel()) return false;
        if (this.isOpened() != other.isOpened()) return false;
        if (this.getLastTimeOpen() != other.getLastTimeOpen()) return false;
        if (this.getLastTimeUpdateMessage() != other.getLastTimeUpdateMessage()) return false;
        if (this.isKickoutcdrd() != other.isKickoutcdrd()) return false;
        if (this.getTimeKickOutCDRD() != other.getTimeKickOutCDRD()) return false;
        if (this.isEndCDRD() != other.isEndCDRD()) return false;
        if (this.isAllMobsDead() != other.isAllMobsDead()) return false;
        final java.lang.Object this$zones = this.getZones();
        final java.lang.Object other$zones = other.getZones();
        if (this$zones == null ? other$zones != null : !this$zones.equals(other$zones)) return false;
        final java.lang.Object this$clan = this.getClan();
        final java.lang.Object other$clan = other.getClan();
        if (this$clan == null ? other$clan != null : !this$clan.equals(other$clan)) return false;
        final java.lang.Object this$bosses = this.getBosses();
        final java.lang.Object other$bosses = other.getBosses();
        if (this$bosses == null ? other$bosses != null : !this$bosses.equals(other$bosses)) return false;
        return true;
    }

    @java.lang.SuppressWarnings("all")
    protected boolean canEqual(final java.lang.Object other) {
        return other instanceof SnakeWay;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public int hashCode() {
        final int PRIME = 59;
        int result = 1;
        result = result * PRIME + this.getId();
        result = result * PRIME + this.getLevel();
        result = result * PRIME + (this.isOpened() ? 79 : 97);
        final long $lastTimeOpen = this.getLastTimeOpen();
        result = result * PRIME + (int) ($lastTimeOpen >>> 32 ^ $lastTimeOpen);
        final long $lastTimeUpdateMessage = this.getLastTimeUpdateMessage();
        result = result * PRIME + (int) ($lastTimeUpdateMessage >>> 32 ^ $lastTimeUpdateMessage);
        result = result * PRIME + (this.isKickoutcdrd() ? 79 : 97);
        final long $timeKickOutCDRD = this.getTimeKickOutCDRD();
        result = result * PRIME + (int) ($timeKickOutCDRD >>> 32 ^ $timeKickOutCDRD);
        result = result * PRIME + (this.isEndCDRD() ? 79 : 97);
        result = result * PRIME + (this.isAllMobsDead() ? 79 : 97);
        final java.lang.Object $zones = this.getZones();
        result = result * PRIME + ($zones == null ? 43 : $zones.hashCode());
        final java.lang.Object $clan = this.getClan();
        result = result * PRIME + ($clan == null ? 43 : $clan.hashCode());
        final java.lang.Object $bosses = this.getBosses();
        result = result * PRIME + ($bosses == null ? 43 : $bosses.hashCode());
        return result;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public java.lang.String toString() {
        return "SnakeWay(id=" + this.getId() + ", level=" + this.getLevel() + ", zones=" + this.getZones() + ", clan=" + this.getClan() + ", isOpened=" + this.isOpened() + ", lastTimeOpen=" + this.getLastTimeOpen() + ", lastTimeUpdateMessage=" + this.getLastTimeUpdateMessage() + ", kickoutcdrd=" + this.isKickoutcdrd() + ", timeKickOutCDRD=" + this.getTimeKickOutCDRD() + ", bosses=" + this.getBosses() + ", endCDRD=" + this.isEndCDRD() + ", allMobsDead=" + this.isAllMobsDead() + ")";
    }
}
