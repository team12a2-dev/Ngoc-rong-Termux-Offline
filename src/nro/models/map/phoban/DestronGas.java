package nro.models.map.phoban;

import nro.models.utils.Functions;
import nro.models.boss.Boss;
import nro.models.boss.khi_gas.DrLychee;
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

public class DestronGas implements Runnable {
    public static final long POWER_CAN_GO_TO_KHI_GAS_HUY_DIET = 2000000000;
    public static final int AVAILABLE = 50;
    public static final int TIME_KHI_GAS_HUY_DIET = 1800000;
    public static final int N_PLAYER_CLAN = 0;
    public int id;
    public byte level;
    public final List<Zone> zones;
    public Clan clan;
    public boolean isOpened;
    private long lastTimeOpen;
    private long lastTimeUpdateMessage;
    private boolean kickoutkghd;
    private long timeKickOutKGHD;
    public List<Boss> bosses = new ArrayList<>();
    private boolean callBoss;
    public boolean hatchiyatchDead;

    public DestronGas(int id) {
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
            if (Util.canDoWithTime(lastTimeOpen, TIME_KHI_GAS_HUY_DIET) || (kickoutkghd && Util.canDoWithTime(timeKickOutKGHD, 60000))) {
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
            if (allCharactersDead && !callBoss) {
                try {
                    long bossDamage = (1000 * level);
                    long bossMaxHealth = (15000000 * level);
                    bossDamage = Math.min(bossDamage, 200000000L);
                    bossMaxHealth = Math.min(bossMaxHealth, 2000000000L);
                    bosses.add(new DrLychee(getMapById(148), clan, level, (int) bossDamage, (int) bossMaxHealth));
                    callBoss = true;
                } catch (Exception exception) {
                }
            }
            if (!kickoutkghd && (hatchiyatchDead || Util.canDoWithTime(lastTimeOpen, TIME_KHI_GAS_HUY_DIET - 60000))) {
                kickoutkghd = true;
                timeKickOutKGHD = System.currentTimeMillis();
                for (Zone zone : zones) {
                    List<Player> players = zone.getPlayers();
                    for (Player pl : players) {
                        Service.gI().sendThongBao(pl, "Nơi này sắp nổ tung mau chạy đi");
                    }
                }
            }
            if (kickoutkghd && Util.canDoWithTime(lastTimeUpdateMessage, 10000)) {
                lastTimeUpdateMessage = System.currentTimeMillis();
                for (Zone zone : zones) {
                    List<Player> players = zone.getPlayers();
                    for (Player pl : players) {
                        Service.gI().sendThongBao(pl, "Về làng Aru sau " + TimeUtil.getTimeLeft(timeKickOutKGHD, 60) + " nữa");
                    }
                }
            }
        }
    }

    public void openKhiGasHuyDiet(Player plOpen, Clan clan, byte level) {
        try {
            this.level = level;
            this.lastTimeOpen = System.currentTimeMillis();
            this.clan = clan;
            this.clan.lastTimeOpenKhiGasHuyDiet = this.lastTimeOpen;
            this.clan.playerOpenKhiGasHuyDiet = plOpen;
            this.clan.KhiGasHuyDiet = this;
            this.callBoss = false;
            this.isOpened = true;
            this.init();
            sendTextKhiGasHuyDiet();
        } catch (Exception e) {
            plOpen.clan.lastTimeOpenKhiGasHuyDiet = 0;
            this.dispose();
        }
    }

    public void sendThanhTichKhiGas(Player pl) {
        if (pl == null || pl.clan == null || pl.clan.KhiGasHuyDiet != this) {
            return;
        }
        long timeDoneKhiGas = System.currentTimeMillis() - pl.clan.lastTimeOpenKhiGasHuyDiet;
        int levelDoneKhiGas = pl.clan.KhiGasHuyDiet.level;
        if (levelDoneKhiGas > pl.clan.levelDoneKhiGas) {
            pl.clan.levelDoneKhiGas = levelDoneKhiGas;
            pl.clan.thoiGianHoanThanhKhiGas = timeDoneKhiGas;
        } else if (levelDoneKhiGas == pl.clan.levelDoneKhiGas) {
            if (timeDoneKhiGas < pl.clan.thoiGianHoanThanhKhiGas) {
                pl.clan.thoiGianHoanThanhKhiGas = timeDoneKhiGas;
            }
        }
        if (levelDoneKhiGas >= 70) {
            pl.destronGas70CompletionCount++;
        }
        pl.clan.updatethanhTichKhiGasForLeader();
    }

    private void init() {
        //Há»“i sinh quÃ¡i
        for (Zone zone : this.zones) {
            List<Mob> mobs = zone.mobs;
            for (int i = 0; i < mobs.size(); i++) {
                Mob mob = mobs.get(i);
                if ( // QuÃ¡i 76 xuáº¥t hiá»‡n thá»© 1 á»Ÿ Map 147 (Sa máº¡c)
                // QuÃ¡i 76 xuáº¥t hiá»‡n thá»© 8 á»Ÿ Map 149 (ThÃ nh phá»‘ Santa)
                // QuÃ¡i 76 xuáº¥t hiá»‡n thá»© 1 á»Ÿ Map 151 (HÃ nh tinh bÃ³ng tá»‘i)
                ((i == 0) && zone.map.mapId == 147) || ((i == 7) && zone.map.mapId == 149) || ((i == 0) && zone.map.mapId == 151) || ((i == 0) && zone.map.mapId == 152) ||  // QuÃ¡i 76 xuáº¥t hiá»‡n thá»© 1 á»Ÿ Map 152 (VÃ¹ng Ä‘áº¥t bÄƒng giÃ¡)
                ((i == 33) && zone.map.mapId == 152)) {
                    // QuÃ¡i 76 xuáº¥t hiá»‡n thá»© 34 á»Ÿ Map 152 (VÃ¹ng Ä‘áº¥t bÄƒng giÃ¡)
                    mob.lvMob = 1;
                    mob.point.dame = (int) Math.min((long) level * 31 * 5 * mob.tempId * 10, 2147483647);
                    mob.point.maxHp = (int) Math.min((long) level * 3 * 6700 * mob.tempId * 10, 2147483647);
                    mob.hoiSinh();
                    mob.hoiSinhMobPhoBan();
                } else {
                    mob.lvMob = mob.tempId == 76 ? 1 : 0;
                    mob.point.dame = (int) Math.min((long) level * 31 * 5 * mob.tempId, 2147483647);
                    mob.point.maxHp = (int) Math.min((long) level * 5 * 45 * mob.tempId, 2147483647);
                    mob.hoiSinh();
                    mob.hoiSinhMobPhoBan();
                }
            }
        }
        new Thread(this, "Khí Gas Hủy Diệt: " + this.clan.name).start();
    }

    //káº¿t thÃºc khÃ­ gas há»§y diá»‡t
    public void finish() {
        for (Zone zone : zones) {
            for (int i = zone.getPlayers().size() - 1; i >= 0; i--) {
                if (i < zone.getPlayers().size()) {
                    Player pl = zone.getPlayers().get(i);
                    sendThanhTichKhiGas(pl);
                    kickOutOfKGHD(pl);
                }
            }
        }
    }

    private void kickOutOfKGHD(Player player) {
        if (MapService.gI().isMapKhiGasHuyDiet(player.zone.map.mapId)) {
            ChangeMapService.gI().changeMapBySpaceShip(player, 0, -1, -1);
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

    private void sendTextKhiGasHuyDiet() {
        for (Player pl : this.clan.membersInGame) {
            ItemTimeService.gI().sendTextKhiGasHuyDiet(pl);
        }
    }

    private void removeTextKhiGasHuyDiet() {
        for (Player pl : this.clan.membersInGame) {
            ItemTimeService.gI().removeTextKhiGasHuyDiet(pl);
        }
    }

    public void dispose() {
        for (Zone zone : zones) {
            for (int i = zone.items.size() - 1; i >= 0; i--) {
                if (i < zone.items.size()) {
                    ItemMapService.gI().removeItemMap(zone.items.get(i));
                }
            }
        }
        for (Boss boss : bosses) {
            if (!boss.isDie()) {
                boss.leaveMap();
            }
        }
        this.removeTextKhiGasHuyDiet();
        this.bosses.clear();
        this.isOpened = false;
        this.clan.KhiGasHuyDiet = null;
        this.clan = null;
        this.kickoutkghd = false;
        this.hatchiyatchDead = false;
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
    public boolean isKickoutkghd() {
        return this.kickoutkghd;
    }

    @java.lang.SuppressWarnings("all")
    public long getTimeKickOutKGHD() {
        return this.timeKickOutKGHD;
    }

    @java.lang.SuppressWarnings("all")
    public List<Boss> getBosses() {
        return this.bosses;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isCallBoss() {
        return this.callBoss;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isHatchiyatchDead() {
        return this.hatchiyatchDead;
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
    public void setKickoutkghd(final boolean kickoutkghd) {
        this.kickoutkghd = kickoutkghd;
    }

    @java.lang.SuppressWarnings("all")
    public void setTimeKickOutKGHD(final long timeKickOutKGHD) {
        this.timeKickOutKGHD = timeKickOutKGHD;
    }

    @java.lang.SuppressWarnings("all")
    public void setBosses(final List<Boss> bosses) {
        this.bosses = bosses;
    }

    @java.lang.SuppressWarnings("all")
    public void setCallBoss(final boolean callBoss) {
        this.callBoss = callBoss;
    }

    @java.lang.SuppressWarnings("all")
    public void setHatchiyatchDead(final boolean hatchiyatchDead) {
        this.hatchiyatchDead = hatchiyatchDead;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof DestronGas)) return false;
        final DestronGas other = (DestronGas) o;
        if (!other.canEqual((java.lang.Object) this)) return false;
        if (this.getId() != other.getId()) return false;
        if (this.getLevel() != other.getLevel()) return false;
        if (this.isOpened() != other.isOpened()) return false;
        if (this.getLastTimeOpen() != other.getLastTimeOpen()) return false;
        if (this.getLastTimeUpdateMessage() != other.getLastTimeUpdateMessage()) return false;
        if (this.isKickoutkghd() != other.isKickoutkghd()) return false;
        if (this.getTimeKickOutKGHD() != other.getTimeKickOutKGHD()) return false;
        if (this.isCallBoss() != other.isCallBoss()) return false;
        if (this.isHatchiyatchDead() != other.isHatchiyatchDead()) return false;
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
        return other instanceof DestronGas;
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
        result = result * PRIME + (this.isKickoutkghd() ? 79 : 97);
        final long $timeKickOutKGHD = this.getTimeKickOutKGHD();
        result = result * PRIME + (int) ($timeKickOutKGHD >>> 32 ^ $timeKickOutKGHD);
        result = result * PRIME + (this.isCallBoss() ? 79 : 97);
        result = result * PRIME + (this.isHatchiyatchDead() ? 79 : 97);
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
        return "DestronGas(id=" + this.getId() + ", level=" + this.getLevel() + ", zones=" + this.getZones() + ", clan=" + this.getClan() + ", isOpened=" + this.isOpened() + ", lastTimeOpen=" + this.getLastTimeOpen() + ", lastTimeUpdateMessage=" + this.getLastTimeUpdateMessage() + ", kickoutkghd=" + this.isKickoutkghd() + ", timeKickOutKGHD=" + this.getTimeKickOutKGHD() + ", bosses=" + this.getBosses() + ", callBoss=" + this.isCallBoss() + ", hatchiyatchDead=" + this.isHatchiyatchDead() + ")";
    }
}
