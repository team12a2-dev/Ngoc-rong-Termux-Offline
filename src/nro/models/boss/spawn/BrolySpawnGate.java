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
    private static volatile long nextSuperSpawnAllowedMs;
    private static volatile long nextNaturalRollMs;
    private static volatile long superProfileExpiresMs;
    private static volatile int activeSuperConcurrentLimit;
    private static volatile int activeSuperMapLimit;
    private static volatile int activeSuperSlotLimit;
    private static final java.util.Map<Integer, Integer> superSpawnSlotByBoss = new ConcurrentHashMap<>();
    private static final int[] BROLY_MAPS = {5, 13, 20, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38};

    private static synchronized void refreshSuperProfile() {
        long now = System.currentTimeMillis();
        if (now < superProfileExpiresMs) {
            return;
        }
        int populationLimit = BossSpawnConfig.effectiveSuperBrolyLimit();
        int safeMax = Math.max(1, Math.min(BossSpawnConfig.superBrolyConcurrentMax, populationLimit));
        int min = Math.max(1, Math.min(BossSpawnConfig.superBrolyConcurrentMin, safeMax));
        activeSuperConcurrentLimit = populationLimit <= 0 ? 0 : Util.nextInt(min, safeMax);
        activeSuperMapLimit = Util.nextInt(BossSpawnConfig.superBrolyMapMin, BossSpawnConfig.superBrolyMapMax);
        activeSuperSlotLimit = Util.nextInt(BossSpawnConfig.superBrolySlotMin, BossSpawnConfig.superBrolySlotMax);
        int profileSec = Util.nextInt(BossSpawnConfig.superBrolyProfileMinSec,
                BossSpawnConfig.superBrolyProfileMaxSec);
        superProfileExpiresMs = now + profileSec * 1000L;
    }

    private static int currentSuperConcurrentLimit() {
        refreshSuperProfile();
        int populationLimit = BossSpawnConfig.effectiveSuperBrolyLimit();
        return populationLimit <= 0 ? 0 : Math.min(activeSuperConcurrentLimit, populationLimit);
    }

    private static int currentSuperMapLimit() {
        refreshSuperProfile();
        return activeSuperMapLimit;
    }

    private static int currentSuperSlotLimit() {
        refreshSuperProfile();
        return activeSuperSlotLimit;
    }

    private static boolean passesSuperInterval(long now) {
        return now >= nextSuperSpawnAllowedMs;
    }

    private static void markSuperSpawned(long now) {
        lastSuperSpawnMs = now;
        int intervalSec = Util.nextInt(BossSpawnConfig.superBrolyIntervalMinSec,
                BossSpawnConfig.superBrolyIntervalMaxSec);
        nextSuperSpawnAllowedMs = now + intervalSec * 1000L;
    }

    public static int[] brolyMaps() {
        return BROLY_MAPS.clone();
    }

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
        int superLimit = currentSuperConcurrentLimit();
        if (superLimit <= 0 || liveSuperCount() >= superLimit) {
            return false;
        }
        if (broly.zone != null
                && countActiveSuperOnMap(broly.zone.map.mapId) >= currentSuperMapLimit()) {
            return false;
        }
        int slot = currentTimeSlot();
        if (countLiveSuperInSlot(slot) >= currentSuperSlotLimit()) {
            return false;
        }
        if (!passesSuperInterval(System.currentTimeMillis())) {
            return false;
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

    /**
     * Roll tự nhiên theo chu kỳ: Super Broly có thể xuất hiện dù không vừa hạ Broly.
     * Mỗi lần roll đều qua lại toàn bộ hard gate để không vượt giới hạn map/khu/slot.
     */
    public static synchronized void tickNaturalSuperBrolySpawn() {
        long now = System.currentTimeMillis();
        if (now < nextNaturalRollMs) {
            return;
        }
        nextNaturalRollMs = now + Util.nextInt(
                BossSpawnConfig.superBrolyNaturalRollMinSec * 1000,
                BossSpawnConfig.superBrolyNaturalRollMaxSec * 1000);
        if (!BossSpawnConfig.superBrolyNaturalEnabled || !isWithinSuperWindow()) {
            return;
        }
        int limit = currentSuperConcurrentLimit();
        if (limit <= 0 || liveSuperCount() >= limit) {
            return;
        }
        if (!passesSuperInterval(now)) {
            return;
        }
        int slot = currentTimeSlot();
        if (countLiveSuperInSlot(slot) >= currentSuperSlotLimit()) {
            return;
        }
        int chance = BossSpawnConfig.superBrolyNaturalChancePercent;
        int deficit = Math.max(0, BossSpawnConfig.superBrolyTargetMin - liveSuperCount());
        chance = Math.min(95, chance + deficit * 4);
        if (!Util.isTrue(chance, 100)) {
            return;
        }
        int mapId = pickSpreadSuperMapId(BROLY_MAPS);
        nro.models.map.Map map = MapService.gI().getMapById(mapId);
        Zone zone = pickRandomFreeZoneForSuper(map);
        if (zone == null) {
            return;
        }
        int x = map.mapWidth > 100 ? Util.nextInt(100, map.mapWidth - 100) : Util.nextInt(100);
        int y = map.yPhysicInTop(x, 100);
        scheduleSuperBrolySpawn(zone, x, y, slot);
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
        int superLimit = currentSuperConcurrentLimit();
        if (superLimit <= 0 || liveSuperCount() >= superLimit) {
            return;
        }
        if (countLiveSuperInSlot(slot) >= currentSuperSlotLimit()) {
            return;
        }
        try {
            nro.models.map.Map map = MapService.gI().getMapById(mapId);
            if (map == null) {
                return;
            }
            Zone zone = zoneId >= 0 && zoneId < map.zones.size()
                    ? map.zones.get(zoneId) : null;
            if (zone == null || countActiveSuperOnMap(mapId) >= currentSuperMapLimit()
                    || hasBossInZone(zone)) {
                zone = pickRandomFreeZoneForSuper(map);
            }
            if (zone == null) {
                int fallbackMapId = pickSpreadSuperMapId(BROLY_MAPS);
                map = MapService.gI().getMapById(fallbackMapId);
                zone = pickRandomFreeZoneForSuper(map);
            }
            if (map == null || zone == null) {
                return;
            }
            int spawnX = x > 0 ? x : (map.mapWidth > 100 ? Util.nextInt(100, map.mapWidth - 100) : Util.nextInt(100));
            int spawnY = y > 0 ? y : map.yPhysicInTop(spawnX, 100);
            SuperBroly superBroly = new SuperBroly(zone, spawnX, spawnY, slot);
            registerSuperSpawn(superBroly, slot);
            markSuperSpawned(System.currentTimeMillis());
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
            if (hour >= 10 && hour <= 14) {
                return 0;
            }
            if (hour >= 15 && hour <= 19) {
                return 1;
            }
            if (hour >= 20 && hour <= 23) {
                return 2;
            }
            return 3;
        }
        int span = 20;
        int normalized = hour >= 10 ? hour - 10 : hour + 14;
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

    /** Chọn khu chưa có Broly hoặc Super Broly; mỗi khu chỉ giữ một boss thuộc nhóm này. */
    public static Zone pickRandomFreeZoneForSuper(nro.models.map.Map map) {
        if (map == null || map.zones.size() <= 2) {
            return null;
        }
        List<Zone> free = new ArrayList<>();
        for (int i = 2; i < map.zones.size(); i++) {
            Zone zone = map.zones.get(i);
            if (!hasBossInZone(zone)) {
                free.add(zone);
            }
        }
        return free.isEmpty() ? null : free.get(Util.nextInt(0, free.size() - 1));
    }

    private static boolean hasBossInZone(Zone zone) {
        if (zone == null) {
            return false;
        }
        return hasBrolyInZone(zone) || hasSuperInZone(zone);
    }

    private static boolean hasSuperInZone(Zone zone) {
        if (zone == null) {
            return false;
        }
        for (Player player : zone.getBosses()) {
            if (player instanceof Boss boss && boss.id == BossID.SUPER_BROLY && isLiveSuper(boss)) {
                return true;
            }
        }
        return false;
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

    private static int pickSpreadSuperMapId(int[] maps) {
        if (maps == null || maps.length == 0) {
            return 0;
        }
        List<Integer> available = new ArrayList<>();
        for (int mapId : maps) {
            nro.models.map.Map map = MapService.gI().getMapById(mapId);
            if (countActiveSuperOnMap(mapId) < currentSuperMapLimit()
                    && pickRandomFreeZoneForSuper(map) != null) {
                available.add(mapId);
            }
        }
        if (available.isEmpty()) {
            return maps[Util.nextInt(0, maps.length - 1)];
        }
        return available.get(Util.nextInt(0, available.size() - 1));
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
