package nro.models.boss.spawn;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.BrolyManager;
import nro.models.consts.BossStatus;
import nro.models.boss.Broly.SuperBroly;
import nro.models.map.Zone;
import nro.models.map.service.MapService;
import nro.models.player.Player;
import nro.models.utils.Logger;
import nro.models.utils.Util;

/**
 * Điều phối spawn Broly / Super Broly — ngưỡng HP ngẫu nhiên, Super Broly khi Broly bị tiêu diệt.
 */
public final class BrolySpawnGate {

    private static volatile long lastSuperSpawnMs;
    private static final java.util.Map<Integer, Integer> superSpawnSlotByBoss = new ConcurrentHashMap<>();

    private BrolySpawnGate() {
    }

    public static int rollSuperHpThreshold() {
        int min = BossSpawnConfig.superBrolyHpThresholdMin;
        int max = BossSpawnConfig.superBrolyHpThresholdMax;
        if (min >= max) {
            return min;
        }
        return Util.nextInt(min, max);
    }

    public static boolean passesHardGates(Boss broly, long brolyJoinedAtMs, int hpThreshold) {
        if (!BossSpawnConfig.superBrolyEnabled || broly == null) {
            return false;
        }
        if (broly.nPoint.hpMax < hpThreshold) {
            return false;
        }
        if (System.currentTimeMillis() - brolyJoinedAtMs
                < BossSpawnConfig.superBrolyMinBrolyActiveSec * 1000L) {
            return false;
        }
        if (!isWithinSuperWindow()) {
            return false;
        }
        if (liveSuperCount() >= BossSpawnConfig.superBrolyMaxConcurrent) {
            return false;
        }
        if (broly.zone != null
                && countActiveSuperOnMap(broly.zone.map.mapId) >= BossSpawnConfig.superBrolyMaxPerMap) {
            return false;
        }
        int slot = currentTimeSlot();
        if (countLiveSuperInSlot(slot) >= BossSpawnConfig.superBrolyMaxPerSlot) {
            return false;
        }
        if (lastSuperSpawnMs > 0) {
            long since = System.currentTimeMillis() - lastSuperSpawnMs;
            if (since < BossSpawnConfig.superBrolyMinIntervalSec * 1000L) {
                return false;
            }
        }
        return true;
    }

    /**
     * Tỉ lệ % Super Broly khi Broly bị tiêu diệt — HP càng cao (1.500 → 100M) thì tỉ lệ càng lớn.
     */
    public static int computeDeathTransformChance(long hpMaxAtDeath, int hpThreshold) {
        if (hpMaxAtDeath < hpThreshold) {
            return 0;
        }

        long floor = BossSpawnConfig.superBrolyDeathHpMin;
        long ceiling = BossSpawnConfig.superBrolyDeathHpMax;
        long effective = Math.max(floor, Math.min(ceiling, hpMaxAtDeath));

        int chanceMin = BossSpawnConfig.superBrolyTransformChanceMin;
        int chanceMax = BossSpawnConfig.superBrolyTransformChanceMax;

        double logMin = Math.log(Math.max(floor, 2));
        double logMax = Math.log(Math.max(ceiling, floor + 1));
        double logHp = Math.log(Math.max(effective, 2));
        double ratio = (logHp - logMin) / (logMax - logMin);
        ratio = Math.max(0, Math.min(1, ratio));

        int chance = chanceMin + (int) Math.round((chanceMax - chanceMin) * ratio);

        if (hpMaxAtDeath > hpThreshold && hpThreshold > 0) {
            long overflow = hpMaxAtDeath - hpThreshold;
            chance += (int) Math.min(12, overflow * 15 / hpThreshold);
        }

        int live = liveSuperCount();
        int target = BossSpawnConfig.superBrolyTargetMin;
        if (live < target) {
            chance += (target - live) * 6;
        }

        if (countLiveSuperInSlot(currentTimeSlot()) == 0) {
            chance += 8;
        }

        return Math.max(chanceMin, Math.min(95, chance));
    }

    /** Roll Super Broly khi Broly bị tiêu diệt (sau khi qua cổng cứng). */
    public static synchronized boolean rollSuperOnDeath(Boss broly, long brolyJoinedAtMs, int hpThreshold) {
        if (!passesHardGates(broly, brolyJoinedAtMs, hpThreshold)) {
            return false;
        }
        int chance = computeDeathTransformChance(broly.nPoint.hpMax, hpThreshold);
        return Util.isTrue(chance, 100);
    }

    /** Hẹn Super Broly xuất hiện sau 1–2 phút (ngẫu nhiên) tại chỗ Broly chết. */
    public static void scheduleSuperBrolySpawn(Zone zone, int x, int y, int slot) {
        if (zone == null || zone.map == null) {
            return;
        }
        int mapId = zone.map.mapId;
        int zoneId = zone.zoneId;
        int delayMs = Util.nextInt(
                BossSpawnConfig.superBrolySpawnDelayMinSec * 1000,
                BossSpawnConfig.superBrolySpawnDelayMaxSec * 1000);
        Util.setTimeout(() -> spawnSuperBrolyAt(mapId, zoneId, x, y, slot), delayMs);
    }

    private static synchronized void spawnSuperBrolyAt(int mapId, int zoneId, int x, int y, int slot) {
        if (!BossSpawnConfig.superBrolyEnabled) {
            return;
        }
        if (!isWithinSuperWindow()) {
            return;
        }
        if (liveSuperCount() >= BossSpawnConfig.superBrolyMaxConcurrent) {
            return;
        }
        if (countActiveSuperOnMap(mapId) >= BossSpawnConfig.superBrolyMaxPerMap) {
            return;
        }
        if (countLiveSuperInSlot(slot) >= BossSpawnConfig.superBrolyMaxPerSlot) {
            return;
        }
        try {
            nro.models.map.Map map = MapService.gI().getMapById(mapId);
            if (map == null || zoneId < 0 || zoneId >= map.zones.size()) {
                return;
            }
            Zone zone = map.zones.get(zoneId);
            SuperBroly superBroly = new SuperBroly(zone, x, y, slot);
            registerSuperSpawn(superBroly, slot);
            lastSuperSpawnMs = System.currentTimeMillis();
        } catch (Exception ex) {
            Logger.error("spawnSuperBrolyAt map=" + mapId + " zone=" + zoneId + ": " + ex.getMessage());
        }
    }

    public static void registerSuperSpawn(Boss superBroly, int slot) {
        if (superBroly != null) {
            superSpawnSlotByBoss.put(System.identityHashCode(superBroly), slot);
        }
    }

    public static void unregisterSuper(Boss superBroly) {
        if (superBroly != null) {
            superSpawnSlotByBoss.remove(System.identityHashCode(superBroly));
        }
    }

    public static int currentTimeSlot() {
        int hour = ZonedDateTime.now(BossSpawnSchedule.ZONE_VN).getHour();
        int slots = Math.max(1, BossSpawnConfig.superBrolyTimeSlots);
        if (slots == 4) {
            if (hour >= 9 && hour <= 13) {
                return 0;
            }
            if (hour >= 14 && hour <= 18) {
                return 1;
            }
            if (hour >= 19 && hour <= 23) {
                return 2;
            }
            return 3;
        }
        int span = 20;
        int normalized = hour >= 9 ? hour - 9 : hour + 15;
        return Math.min(slots - 1, normalized * slots / span);
    }

    private static int countLiveSuperInSlot(int slot) {
        int n = 0;
        for (Boss boss : BrolyManager.gI().getBosses()) {
            if (!isLiveSuper(boss)) {
                continue;
            }
            Integer s = superSpawnSlotByBoss.get(System.identityHashCode(boss));
            if (s != null && s == slot) {
                n++;
            }
        }
        return n;
    }

    private static int liveSuperCount() {
        int n = 0;
        for (Boss boss : BrolyManager.gI().getBosses()) {
            if (isLiveSuper(boss)) {
                n++;
            }
        }
        return n;
    }

    public static int countActiveSuperOnMap(int mapId) {
        int n = 0;
        for (Boss boss : BrolyManager.gI().getBosses()) {
            if (!isLiveSuper(boss) || boss.zone == null) {
                continue;
            }
            if (boss.zone.map.mapId == mapId) {
                n++;
            }
        }
        return n;
    }

    private static boolean isWithinSuperWindow() {
        ZonedDateTime now = ZonedDateTime.now(BossSpawnSchedule.ZONE_VN);
        boolean weekend = BossSpawnConfig.isWeekend(now);
        return BossSpawnConfig.superBrolyWindowsFor(weekend).contains(now.getHour());
    }

    public static int countActiveBroly() {
        int n = 0;
        for (Boss boss : BrolyManager.gI().getBosses()) {
            if (boss.id != BossID.BROLY || !isLiveBroly(boss)) {
                continue;
            }
            n++;
        }
        return n;
    }

    public static int countActiveBrolyOnMap(int mapId) {
        int n = 0;
        for (Boss boss : BrolyManager.gI().getBosses()) {
            if (boss.id != BossID.BROLY || !isLiveBroly(boss) || boss.zone == null) {
                continue;
            }
            if (boss.zone.map.mapId == mapId) {
                n++;
            }
        }
        return n;
    }

    /** Chọn ngẫu nhiên map chỉ định còn slot và có khu trống. */
    public static int pickSpreadMapId(int[] maps) {
        if (maps == null || maps.length == 0) {
            return 0;
        }
        List<Integer> available = new ArrayList<>();
        for (int mapId : maps) {
            if (countActiveBrolyOnMap(mapId) < BossSpawnConfig.brolyMaxPerMap
                    && hasFreeZoneForBroly(mapId)) {
                available.add(mapId);
            }
        }
        if (available.isEmpty()) {
            return maps[Util.nextInt(0, maps.length - 1)];
        }
        return available.get(Util.nextInt(0, available.size() - 1));
    }

    public static boolean hasFreeZoneForBroly(int mapId) {
        nro.models.map.Map map = MapService.gI().getMapById(mapId);
        return pickRandomFreeZone(map) != null;
    }

    /** Chọn ngẫu nhiên khu (zoneId >= 2) chưa có Broly trên map. */
    public static Zone pickRandomFreeZone(nro.models.map.Map map) {
        if (map == null || map.zones.size() <= 2) {
            return null;
        }
        List<Zone> free = new ArrayList<>();
        for (int i = 2; i < map.zones.size(); i++) {
            Zone zone = map.zones.get(i);
            if (!hasBrolyInZone(zone)) {
                free.add(zone);
            }
        }
        if (free.isEmpty()) {
            return null;
        }
        return free.get(Util.nextInt(0, free.size() - 1));
    }

    public static boolean hasBrolyInZone(Zone zone) {
        if (zone == null) {
            return false;
        }
        for (Player player : zone.getBosses()) {
            if (player.isBoss && player instanceof Boss broly
                    && broly.id == BossID.BROLY
                    && isLiveBroly(broly)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isLiveSuper(Boss boss) {
        if (boss.id != BossID.SUPER_BROLY || boss.zone == null) {
            return false;
        }
        return boss.bossStatus != BossStatus.REST
                && boss.bossStatus != BossStatus.DIE
                && boss.bossStatus != BossStatus.LEAVE_MAP;
    }

    private static boolean isLiveBroly(Boss boss) {
        if (boss.zone == null) {
            return false;
        }
        return boss.bossStatus != BossStatus.REST
                && boss.bossStatus != BossStatus.DIE
                && boss.bossStatus != BossStatus.LEAVE_MAP;
    }
}
