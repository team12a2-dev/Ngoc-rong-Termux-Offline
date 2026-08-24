package nro.models.boss.spawn;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.BossStatus;
import nro.models.utils.Util;

/**
 * Điều phối spawn: khoảng cách giữa các lần spawn, mật độ map, hàng đợi công bằng, cửa sổ bonus ngày.
 */
public final class BossSpawnOrchestrator {

    private static volatile long lastEliteSpawnMs;
    private static volatile long lastWorldSpawnMs;
    private static volatile long lastNormalSpawnMs;
    private static volatile long lastEliteOrWorldSpawnMs;

    private static volatile long dailyBonusEpochDay = Long.MIN_VALUE;
    private static volatile int dailyBonusStartHour;
    private static volatile int dailyBonusEndHour;

    /** Lần spawn gần nhất theo boss id — xoay vòng ELITE, tránh một nhóm chiếm hết slot */
    private static final Map<Integer, Long> lastSpawnByBossId = new ConcurrentHashMap<>();

    private BossSpawnOrchestrator() {
    }

    public static void refreshDailyBonusIfNeeded() {
        if (!BossSpawnConfig.dailyBonusEnabled) {
            return;
        }
        long today = ZonedDateTime.now(BossSpawnSchedule.ZONE_VN).toLocalDate().toEpochDay();
        if (today == dailyBonusEpochDay) {
            return;
        }
        dailyBonusEpochDay = today;
        int seed = (int) (today * 31_415_927L ^ 0x9E3779B9);
        boolean weekend = BossSpawnConfig.isWeekend(ZonedDateTime.now(BossSpawnSchedule.ZONE_VN));
        int duration = Math.max(1, BossSpawnConfig.dailyBonusDurationHours);

        List<Integer> candidates = new ArrayList<>();
        if (BossSpawnConfig.dailyBonusPreferGap) {
            candidates.addAll(BossSpawnConfig.gapHoursForDailyBonus(weekend));
        }
        if (candidates.isEmpty()) {
            for (int h = 8; h <= 22 - duration + 1; h++) {
                candidates.add(h);
            }
        }
        int maxStart = 23 - duration + 1;
        candidates.removeIf(h -> h > maxStart);

        if (candidates.isEmpty()) {
            dailyBonusStartHour = 8 + Math.floorMod(seed, 14);
        } else {
            dailyBonusStartHour = candidates.get(Math.floorMod(seed, candidates.size()));
        }
        dailyBonusEndHour = Math.min(23, dailyBonusStartHour + duration - 1);
    }

    public static boolean isDailyBonusHour(int hour) {
        if (!BossSpawnConfig.dailyBonusEnabled) {
            return false;
        }
        refreshDailyBonusIfNeeded();
        return hour >= dailyBonusStartHour && hour <= dailyBonusEndHour;
    }

    public static int dailyBonusStartHour() {
        refreshDailyBonusIfNeeded();
        return dailyBonusStartHour;
    }

    public static int dailyBonusEndHour() {
        refreshDailyBonusIfNeeded();
        return dailyBonusEndHour;
    }

    public static boolean dailyBonusAppliesTo(BossSpawnTier tier) {
        return switch (tier) {
            case NORMAL -> BossSpawnConfig.dailyBonusNormal;
            case ELITE -> BossSpawnConfig.dailyBonusElite;
            case MINI, WORLD -> false;
        };
    }

    public static void onBossSpawned(Boss boss) {
        if (boss == null || boss.getParentBoss() != null) {
            return;
        }
        lastSpawnByBossId.put((int) boss.id, System.currentTimeMillis());
        if (!BossSpawnConfig.distributionEnabled) {
            return;
        }
        BossSpawnTier tier = BossSpawnSchedule.resolveTier(boss);
        long now = System.currentTimeMillis();
        switch (tier) {
            case ELITE -> {
                lastEliteSpawnMs = now;
                lastEliteOrWorldSpawnMs = now;
            }
            case WORLD -> {
                lastWorldSpawnMs = now;
                lastEliteOrWorldSpawnMs = now;
            }
            case NORMAL -> lastNormalSpawnMs = now;
            default -> {
            }
        }
    }

    public static boolean passesGlobalGap(Boss boss) {
        if (!BossSpawnConfig.distributionEnabled) {
            return true;
        }
        BossSpawnTier tier = BossSpawnSchedule.resolveTier(boss);
        long gapMs = effectiveGlobalGapMs(tier);
        if (gapMs <= 0) {
            return true;
        }
        long last = lastSpawnMs(tier);
        return System.currentTimeMillis() - last >= gapMs;
    }

    public static int secondsUntilGlobalGap(Boss boss) {
        BossSpawnTier tier = BossSpawnSchedule.resolveTier(boss);
        long gapMs = effectiveGlobalGapMs(tier);
        if (gapMs <= 0) {
            return 0;
        }
        long elapsed = System.currentTimeMillis() - lastSpawnMs(tier);
        long left = gapMs - elapsed;
        return left <= 0 ? 0 : (int) ((left + 999) / 1000);
    }

    public static boolean passesCrossTierGap(Boss boss) {
        if (!BossSpawnConfig.distributionEnabled || BossSpawnConfig.crossTierGapSec <= 0) {
            return true;
        }
        BossSpawnTier tier = BossSpawnSchedule.resolveTier(boss);
        if (tier != BossSpawnTier.ELITE && tier != BossSpawnTier.WORLD) {
            return true;
        }
        long gapMs = BossSpawnConfig.crossTierGapSec * 1000L;
        return System.currentTimeMillis() - lastEliteOrWorldSpawnMs >= gapMs;
    }

    public static int secondsUntilCrossTierGap(Boss boss) {
        BossSpawnTier tier = BossSpawnSchedule.resolveTier(boss);
        if (tier != BossSpawnTier.ELITE && tier != BossSpawnTier.WORLD) {
            return 0;
        }
        if (BossSpawnConfig.crossTierGapSec <= 0) {
            return 0;
        }
        long gapMs = BossSpawnConfig.crossTierGapSec * 1000L;
        long elapsed = System.currentTimeMillis() - lastEliteOrWorldSpawnMs;
        long left = gapMs - elapsed;
        return left <= 0 ? 0 : (int) ((left + 999) / 1000);
    }

    public static boolean passesMapDensity(Boss boss, int nextLevel) {
        int[] maps = boss.data[nextLevel].getMapJoin();
        if (maps == null || maps.length == 0) {
            return true;
        }
        if ((int) boss.id == BossID.BROLY) {
            if (BossSpawnConfig.brolyMaxPerMap <= 0) {
                return true;
            }
            for (int mapId : maps) {
                if (BrolySpawnGate.countActiveBrolyOnMap(mapId) < BossSpawnConfig.brolyMaxPerMap
                        && BrolySpawnGate.hasFreeZoneForBroly(mapId)) {
                    return true;
                }
            }
            return false;
        }
        if (!BossSpawnConfig.distributionEnabled || BossSpawnConfig.maxBossesPerMap <= 0) {
            return true;
        }
        int minActive = Integer.MAX_VALUE;
        for (int mapId : maps) {
            minActive = Math.min(minActive, countActiveOnMap(mapId));
        }
        return minActive < BossSpawnConfig.maxBossesPerMap;
    }

    public static int countActiveOnMap(int mapId) {
        int n = 0;
        for (Boss boss : BossManager.gI().getBosses()) {
            if (!isActiveWorldBoss(boss) || boss.zone == null) {
                continue;
            }
            if (boss.zone.map.mapId == mapId) {
                n++;
            }
        }
        return n;
    }

    /**
     * Chọn map có ít boss đang hoạt động nhất; nếu hòa thì random trong nhóm.
     */
    public static int pickMapId(Boss boss, int nextLevel) {
        int[] maps = boss.data[nextLevel].getMapJoin();
        if (maps == null || maps.length == 0) {
            return 0;
        }
        if ((int) boss.id == BossID.BROLY) {
            return BrolySpawnGate.pickSpreadMapId(maps);
        }
        if (!BossSpawnConfig.distributionEnabled || maps.length == 1) {
            return maps[Util.nextInt(0, maps.length - 1)];
        }
        int minCount = Integer.MAX_VALUE;
        List<Integer> candidates = new ArrayList<>();
        for (int mapId : maps) {
            int count = countActiveOnMap(mapId);
            if (count < minCount) {
                minCount = count;
                candidates.clear();
                candidates.add(mapId);
            } else if (count == minCount) {
                candidates.add(mapId);
            }
        }
        return candidates.get(Util.nextInt(0, candidates.size() - 1));
    }

    public static boolean passesFairnessQueue(Boss boss) {
        if (!BossSpawnConfig.distributionEnabled || !BossSpawnConfig.fairnessEnabled) {
            return true;
        }
        BossSpawnTier tier = BossSpawnSchedule.resolveTier(boss);
        if (tier == BossSpawnTier.ELITE) {
            if (!BossSpawnConfig.fairnessEliteEnabled) {
                return true;
            }
            return passesEliteRoundRobin(boss);
        }
        if (tier != BossSpawnTier.WORLD && tier != BossSpawnTier.NORMAL) {
            return true;
        }
        long myReady = readySinceMs(boss);
        for (Boss other : BossManager.gI().getBosses()) {
            if (other == boss || !BossSpawnSchedule.appliesTo(other)) {
                continue;
            }
            if (BossSpawnSchedule.resolveTier(other) != tier) {
                continue;
            }
            if (other.bossStatus != BossStatus.REST) {
                continue;
            }
            if (readySinceMs(other) < myReady && BossSpawnSchedule.isReadyExceptGlobalGap(other)) {
                return false;
            }
        }
        return true;
    }

    /** Ưu tiên boss ELITE lâu chưa được spawn (xoay vòng), không chặn vĩnh viễn bởi FIFO */
    private static boolean passesEliteRoundRobin(Boss boss) {
        if (!BossSpawnSchedule.isReadyExceptGlobalGap(boss)) {
            return false;
        }
        long myLastSpawn = lastSpawnByBossId.getOrDefault((int) boss.id, 0L);
        for (Boss other : BossManager.gI().getBosses()) {
            if (other == boss || !BossSpawnSchedule.appliesTo(other)) {
                continue;
            }
            if (BossSpawnSchedule.resolveTier(other) != BossSpawnTier.ELITE) {
                continue;
            }
            if (other.bossStatus != BossStatus.REST) {
                continue;
            }
            if (!BossSpawnSchedule.isReadyExceptGlobalGap(other)) {
                continue;
            }
            long otherLastSpawn = lastSpawnByBossId.getOrDefault((int) other.id, 0L);
            if (otherLastSpawn < myLastSpawn) {
                return false;
            }
        }
        return true;
    }

    public static boolean rollSoftWindowSpawn(Boss boss) {
        if (!BossSpawnConfig.softWindowEnabled) {
            return true;
        }
        int chance = BossSpawnConfig.softWindowSpawnChance;
        if (BossSpawnConfig.waitBoostEnabled && boss != null) {
            long waitingMs = System.currentTimeMillis() - readySinceMs(boss);
            if (waitingMs >= BossSpawnConfig.waitBoostAfterSec * 1000L) {
                chance = Math.max(chance, BossSpawnConfig.waitBoostChance);
            }
        }
        return Util.nextInt(100) < chance;
    }

    public static void applySoftWindowDefer(Boss boss) {
        int sec = Util.nextInt(BossSpawnConfig.softWindowDeferMinSec, BossSpawnConfig.softWindowDeferMaxSec);
        boss.setLastTimeRest(System.currentTimeMillis());
        boss.setNextRestDelayMs(sec * 1000L);
    }

    private static long effectiveGlobalGapMs(BossSpawnTier tier) {
        long gapMs = globalGapMs(tier);
        if (!BossSpawnConfig.adaptiveGapEnabled || gapMs <= 0) {
            return gapMs;
        }
        int ready = countReadyInTier(tier);
        if (ready <= 2) {
            return gapMs;
        }
        long extra = (long) (ready - 2) * BossSpawnConfig.adaptiveGapPerReadySec * 1000L;
        return gapMs + extra;
    }

    private static int countReadyInTier(BossSpawnTier tier) {
        int n = 0;
        for (Boss boss : BossManager.gI().getBosses()) {
            if (!BossSpawnSchedule.appliesTo(boss)) {
                continue;
            }
            if (BossSpawnSchedule.resolveTier(boss) != tier) {
                continue;
            }
            if (boss.bossStatus != BossStatus.REST) {
                continue;
            }
            if (BossSpawnSchedule.isReadyExceptGlobalGap(boss)) {
                n++;
            }
        }
        return n;
    }

    private static long readySinceMs(Boss boss) {
        return boss.getLastTimeRest() + boss.getNextRestDelayMs();
    }

    private static long globalGapMs(BossSpawnTier tier) {
        return switch (tier) {
            case ELITE -> BossSpawnConfig.eliteMinGapSec * 1000L;
            case WORLD -> BossSpawnConfig.worldMinGapSec * 1000L;
            case NORMAL -> BossSpawnConfig.normalMinGapSec * 1000L;
            default -> 0L;
        };
    }

    private static long lastSpawnMs(BossSpawnTier tier) {
        return switch (tier) {
            case ELITE -> lastEliteSpawnMs;
            case WORLD -> lastWorldSpawnMs;
            case NORMAL -> lastNormalSpawnMs;
            default -> 0L;
        };
    }

    private static boolean isActiveWorldBoss(Boss boss) {
        if (boss.getParentBoss() != null || boss.zoneFinal != null || boss.isDie()) {
            return false;
        }
        if (boss.zone == null) {
            return false;
        }
        return boss.bossStatus != BossStatus.REST
                && boss.bossStatus != BossStatus.DIE
                && boss.bossStatus != BossStatus.LEAVE_MAP;
    }
}
