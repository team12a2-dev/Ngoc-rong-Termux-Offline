package nro.models.map.phoban;

import nro.models.utils.Functions;
import nro.models.boss.Boss;
import nro.models.boss.ban_do_kho_bau.TrungUyXanhLo;
import nro.models.clan.Clan;
import nro.models.map.TrapMap;
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
import nro.models.consts.ConstMob;
import nro.models.map.service.ItemMapService;
import nro.models.utils.TimeUtil;

public class BanDoKhoBau implements Runnable {
    public static final long POWER_CAN_GO_TO_DBKB = 2000000000;
    public static final int AVAILABLE = 50;
    public static final int TIME_BAN_DO_KHO_BAU = 1800000;
    public int id;
    public byte level;
    public final List<Zone> zones;
    public Clan clan;
    public boolean isOpened;
    private long lastTimeOpen;
    private boolean kickoutbdkb;
    private long timeKickOutBDKB;
    private Boss boss;
    private long lastTimeSendNotify;
    private boolean allCharactersDead;

    public void addZone(Zone zone) {
        this.zones.add(zone);
    }

    public BanDoKhoBau(int id) {
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
            if (Util.canDoWithTime(lastTimeOpen, TIME_BAN_DO_KHO_BAU) || (kickoutbdkb && Util.canDoWithTime(timeKickOutBDKB, 60000))) {
                finish();
                dispose();
            }
            allCharactersDead = true;
            for (Zone zone : zones) {
                if (zone.map.mapId == 135) {
                    for (Player pl : zone.getNotBosses()) {
                        if (pl != null) {
                            TrapMap trap = zone.isInTrap(pl);
                            if (trap != null) {
                                trap.doPlayer(pl);
                            }
                        }
                    }
                }
                for (Mob mob : zone.mobs) {
                    if (!mob.isDie()) {
                        allCharactersDead = false;
                        break;
                    }
                }
                if (allCharactersDead) {
                    for (Player cBoss : zone.getBosses()) {
                        if (!cBoss.isDie()) {
                            allCharactersDead = false;
                            break;
                        }
                    }
                }
            }
            if (!kickoutbdkb && (allCharactersDead || Util.canDoWithTime(lastTimeOpen, TIME_BAN_DO_KHO_BAU - 60000))) {
                kickoutbdkb = true;
                timeKickOutBDKB = System.currentTimeMillis();
            }
            if (kickoutbdkb && Util.canDoWithTime(lastTimeSendNotify, 10000)) {
                for (Zone zone : zones) {
                    List<Player> players = zone.getPlayers();
                    for (Player pl : players) {
                        Service.gI().sendThongBao(pl, "Cái hang này sắp sập rồi, chúng ta phải rời khỏi đây ngay " + TimeUtil.getTimeLeft(timeKickOutBDKB, 60) + " nữa");
                    }
                    lastTimeSendNotify = System.currentTimeMillis();
                }
            }
        }
    }

    public void openBanDoKhoBau(Player plOpen, Clan clan, byte level) {
        try {
            this.level = level;
            this.lastTimeOpen = System.currentTimeMillis();
            this.clan = clan;
            this.clan.lastTimeOpenBanDoKhoBau = this.lastTimeOpen;
            this.clan.playerOpenBanDoKhoBau = plOpen;
            this.clan.BanDoKhoBau = this;
            this.kickoutbdkb = false;
            this.isOpened = true;
            this.allCharactersDead = false;
            this.init();
            ChangeMapService.gI().goToDBKB(plOpen);
            sendTextBanDoKhoBau();
        } catch (Exception e) {
            e.printStackTrace();
            plOpen.clan.lastTimeOpenBanDoKhoBau = 0;
            this.dispose();
        }
    }

    public void sendThanhTichBanDoKhoBau(Player pl) {
        if (pl == null || pl.clan == null || pl.clan.BanDoKhoBau != this) {
            return;
        }
        long timeDone = System.currentTimeMillis() - pl.clan.timeOpenBanDoKhoBau;
        int levelDone = pl.clan.BanDoKhoBau.level;
        if (levelDone > pl.clan.levelDoneBanDoKhoBau) {
            pl.clan.levelDoneBanDoKhoBau = levelDone;
            pl.clan.thoiGianHoanThanhBDKB = timeDone;
        } else if (levelDone == pl.clan.levelDoneBanDoKhoBau && timeDone < pl.clan.thoiGianHoanThanhBDKB) {
            pl.clan.thoiGianHoanThanhBDKB = timeDone;
        }
        pl.clan.updatethanhTichBDKBForLeader();
        pl.clan.updateThongTinLeader(pl.clan.id);
    }

    private void init() {
        // Hồi sinh và thiết lập chỉ số quái theo cấp độ phó bản
        for (Zone zone : this.zones) {
            for (TrapMap trap : zone.trapMaps) {
                trap.dame = (int) Math.min((long) this.level * 10000L, 2000000L);
            }
            List<Mob> mobs = zone.mobs;
            for (int i = 0; i < mobs.size(); i++) {
                Mob mob = mobs.get(i);
                mob.hoiSinh();
                long baseHp = mob.point.maxHpGoc > 0 ? mob.point.maxHpGoc : 35000L;
                if (mob.tempId == ConstMob.VUA_BACH_TUOC || mob.tempId == ConstMob.ROBOT_BAO_VE) {
                    // Mini Boss (Vua Bạch Tuộc map 136, Robot Bảo Vệ map 138)
                    mob.lvMob = 1;
                    mob.point.dame = (int) Math.min((long) level * 2000L + Util.nextInt(-100, 100), 200000000L);
                    long hp = (long) level * 5000000L + Util.nextInt(100000, 999999);
                    int finalHp = (int) Math.min(hp, 2000000000L);
                    mob.point.setHpFull(finalHp);
                    mob.point.hp = finalHp;
                    mob.hoiSinhMobPhoBan();
                } else if (((i == 5 || i == 10) && zone.map.mapId == 135)
                        || (i == 5 && zone.map.mapId == 136)
                        || (i == 5 && zone.map.mapId == 137)
                        || (i == 3 && zone.map.mapId == 138)) {
                    // Siêu quái (máu ~x10-x12 quái thường: cấp 110 trong khoảng 440tr - 480tr)
                    mob.lvMob = 1;
                    mob.point.dame = (int) Math.min((long) level * 1500L + Util.nextInt(-50, 50), 200000000L);
                    long hp = (baseHp > 100000 ? baseHp : baseHp * 10L) * (long) level * 10L + Util.nextInt(-5000 * level, 5000 * level);
                    int finalHp = (int) Math.min(Math.max(100000L, hp), 2000000000L);
                    mob.point.setHpFull(finalHp);
                    mob.point.hp = finalHp;
                    mob.hoiSinhMobPhoBan();
                } else {
                    // Quái thường (tính theo baseHp gốc của từng loại quái, cấp 110 trong khoảng 37tr - 45tr máu với số lẻ tự nhiên)
                    mob.lvMob = 0;
                    mob.point.dame = (int) Math.min((long) level * 500L + Util.nextInt(-20, 20), 200000000L);
                    long hp = (baseHp > 100000 ? baseHp / 10L : baseHp) * (long) level * 10L + Util.nextInt(-500 * level, 500 * level);
                    int finalHp = (int) Math.min(Math.max(10000L, hp), 2000000000L);
                    mob.point.setHpFull(finalHp);
                    mob.point.hp = finalHp;
                    mob.hoiSinhMobPhoBan();
                }
            }
            if (zone.map.mapId == 137) {
                try {
                    long bossDamage = (long) level * 3000L + Util.nextInt(-100, 100);
                    long bossMaxHealth = (long) level * 10000000L + Util.nextInt(100000, 999999);
                    bossDamage = Math.min(bossDamage, 200000000L);
                    bossMaxHealth = Math.min(bossMaxHealth, 2000000000L);
                    boss = new TrungUyXanhLo(zone, level, (int) bossDamage, (int) bossMaxHealth);
                } catch (Exception exception) {
                }
            }
        }
        new Thread(this, "Bản Đồ Kho Báu: " + this.clan.name).start();
    }

    public void finish() {
        for (Zone zone : zones) {
            List<Player> playersSnapshot = new ArrayList<>(zone.getPlayers());
            for (Player pl : playersSnapshot) {
                if (pl != null && pl.clan != null && pl.clan.BanDoKhoBau == this) {
                    sendThanhTichBanDoKhoBau(pl);
                }
                kickOutOfBDKB(pl);
            }
        }
    }

    private void kickOutOfBDKB(Player player) {
        if (MapService.gI().isMapBanDoKhoBau(player.zone.map.mapId)) {
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

    private void sendTextBanDoKhoBau() {
        for (Player pl : this.clan.membersInGame) {
            ItemTimeService.gI().sendTextBanDoKhoBau(pl);
        }
    }

    private void removeTextBanDoKhoBau() {
        for (Player pl : this.clan.membersInGame) {
            ItemTimeService.gI().removeTextBanDoKhoBau(pl);
        }
    }

    public void dispose() {
        if (boss != null) {
            this.boss.leaveMap();
        }
        for (Zone zone : zones) {
            for (int i = zone.items.size() - 1; i >= 0; i--) {
                if (i < zone.items.size()) {
                    ItemMapService.gI().removeItemMap(zone.items.get(i));
                }
            }
        }
        this.removeTextBanDoKhoBau();
        this.allCharactersDead = false;
        this.boss = null;
        this.isOpened = false;
        this.clan.BanDoKhoBau = null;
        this.clan = null;
        this.kickoutbdkb = false;
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
    public boolean isKickoutbdkb() {
        return this.kickoutbdkb;
    }

    @java.lang.SuppressWarnings("all")
    public long getTimeKickOutBDKB() {
        return this.timeKickOutBDKB;
    }

    @java.lang.SuppressWarnings("all")
    public Boss getBoss() {
        return this.boss;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeSendNotify() {
        return this.lastTimeSendNotify;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isAllCharactersDead() {
        return this.allCharactersDead;
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
    public void setKickoutbdkb(final boolean kickoutbdkb) {
        this.kickoutbdkb = kickoutbdkb;
    }

    @java.lang.SuppressWarnings("all")
    public void setTimeKickOutBDKB(final long timeKickOutBDKB) {
        this.timeKickOutBDKB = timeKickOutBDKB;
    }

    @java.lang.SuppressWarnings("all")
    public void setBoss(final Boss boss) {
        this.boss = boss;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeSendNotify(final long lastTimeSendNotify) {
        this.lastTimeSendNotify = lastTimeSendNotify;
    }

    @java.lang.SuppressWarnings("all")
    public void setAllCharactersDead(final boolean allCharactersDead) {
        this.allCharactersDead = allCharactersDead;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof BanDoKhoBau)) return false;
        final BanDoKhoBau other = (BanDoKhoBau) o;
        if (!other.canEqual((java.lang.Object) this)) return false;
        if (this.getId() != other.getId()) return false;
        if (this.getLevel() != other.getLevel()) return false;
        if (this.isOpened() != other.isOpened()) return false;
        if (this.getLastTimeOpen() != other.getLastTimeOpen()) return false;
        if (this.isKickoutbdkb() != other.isKickoutbdkb()) return false;
        if (this.getTimeKickOutBDKB() != other.getTimeKickOutBDKB()) return false;
        if (this.getLastTimeSendNotify() != other.getLastTimeSendNotify()) return false;
        if (this.isAllCharactersDead() != other.isAllCharactersDead()) return false;
        final java.lang.Object this$zones = this.getZones();
        final java.lang.Object other$zones = other.getZones();
        if (this$zones == null ? other$zones != null : !this$zones.equals(other$zones)) return false;
        final java.lang.Object this$clan = this.getClan();
        final java.lang.Object other$clan = other.getClan();
        if (this$clan == null ? other$clan != null : !this$clan.equals(other$clan)) return false;
        final java.lang.Object this$boss = this.getBoss();
        final java.lang.Object other$boss = other.getBoss();
        if (this$boss == null ? other$boss != null : !this$boss.equals(other$boss)) return false;
        return true;
    }

    @java.lang.SuppressWarnings("all")
    protected boolean canEqual(final java.lang.Object other) {
        return other instanceof BanDoKhoBau;
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
        result = result * PRIME + (this.isKickoutbdkb() ? 79 : 97);
        final long $timeKickOutBDKB = this.getTimeKickOutBDKB();
        result = result * PRIME + (int) ($timeKickOutBDKB >>> 32 ^ $timeKickOutBDKB);
        final long $lastTimeSendNotify = this.getLastTimeSendNotify();
        result = result * PRIME + (int) ($lastTimeSendNotify >>> 32 ^ $lastTimeSendNotify);
        result = result * PRIME + (this.isAllCharactersDead() ? 79 : 97);
        final java.lang.Object $zones = this.getZones();
        result = result * PRIME + ($zones == null ? 43 : $zones.hashCode());
        final java.lang.Object $clan = this.getClan();
        result = result * PRIME + ($clan == null ? 43 : $clan.hashCode());
        final java.lang.Object $boss = this.getBoss();
        result = result * PRIME + ($boss == null ? 43 : $boss.hashCode());
        return result;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public java.lang.String toString() {
        return "BanDoKhoBau(id=" + this.getId() + ", level=" + this.getLevel() + ", zones=" + this.getZones() + ", clan=" + this.getClan() + ", isOpened=" + this.isOpened() + ", lastTimeOpen=" + this.getLastTimeOpen() + ", kickoutbdkb=" + this.isKickoutbdkb() + ", timeKickOutBDKB=" + this.getTimeKickOutBDKB() + ", boss=" + this.getBoss() + ", lastTimeSendNotify=" + this.getLastTimeSendNotify() + ", allCharactersDead=" + this.isAllCharactersDead() + ")";
    }
}
