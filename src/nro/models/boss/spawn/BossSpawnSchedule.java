package nro.models.boss.spawn;

import java.time.ZonedDateTime;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.spawn.BossSpawnTier;
import nro.models.services.BossPanelConfigService;
import nro.models.boss.Boss_Manager.BossManager;

import nro.models.consts.AppearType;
import nro.models.consts.BossStatus;
import static nro.models.consts.AppearType.DEFAULT_APPEAR;
import nro.models.utils.Util;

/**
 * Lịch spawn: jitter, khung giờ, giới hạn đồng thời, phân bổ thông minh.
 */
public final class BossSpawnSchedule {

    public static final java.time.ZoneId ZONE_VN = java.time.ZoneId.of("Asia/Ho_Chi_Minh");

    private BossSpawnSchedule() {
    }

    public static boolean isEnabled() {
        return BossSpawnConfig.enabled;
    }

    public static boolean appliesTo(Boss boss) {
        if (!isEnabled() || boss == null) {
            return false;
        }
        if (boss.getParentBoss() != null || boss.zoneFinal != null) {
            return false;
        }
        return boss.getSecondsRest() >= 5;
    }

    public static BossSpawnTier resolveTier(Boss boss) {
        BossSpawnTier override = tierOverride(boss.id);
        if (override != null) {
            return override;
        }
        return BossSpawnTier.fromRestSeconds(boss.getSecondsRest());
    }

    private static BossSpawnTier tierOverride(long bossId) {
        return switch ((int) bossId) {
            case BossID.TIEU_DOI_TRUONG, BossID.TIEU_DOI_TRUONG_NM,
                    BossID.SO_4, BossID.SO_3, BossID.SO_2, BossID.SO_1,
                    BossID.SO_4_NM, BossID.SO_3_NM, BossID.SO_2_NM, BossID.SO_1_NM ->
                BossSpawnTier.NORMAL;
            case BossID.FIDE, BossID.BLACK_GOKU, BossID.XEN_BO_HUNG, BossID.SIEU_BO_HUNG,
                    BossID.BOJACK, BossID.SUPER_BOJACK, BossID.COOLER,
                    BossID.CUMBER, BossID.ANDROID_14, BossID.DR_KORE, BossID.ANDROID_13,
                    BossID.ANDROID_15, BossID.PIC, BossID.POC, BossID.KING_KONG ->
                BossSpawnTier.ELITE;
            case BossID.BROLY, BossID.SUPER_BROLY, BossID.KUKU, BossID.KU,
                    BossID.MAP_DAU_DINH, BossID.RAMBO, BossID.ANDROID_19 ->
                BossSpawnTier.NORMAL;
            case BossID.SOI_HEC_QUYN1, BossID.AN_TROM, BossID.MAT_TROI, BossID.O_DO1,
                    BossID.BABY, BossID.B, BossID.Virut ->
                BossSpawnTier.MINI;
            default ->
                null;
        };
    }

    public static void initOnCreate(Boss boss) {
        if (!appliesTo(boss)) {
            boss.setNextRestDelayMs(boss.getSecondsRest() * 1000L);
            return;
        }
        BossSpawnTier tier = resolveTier(boss);
        long delayMs = tier.rollInitialStaggerMs((int) boss.id);
                long scheduled = computeScheduledDelayMs(boss, tier, delayMs);
        boss.setNextRestDelayMs(BossPanelConfigService.gI().overrideRestDelayMs(boss, scheduled));

        boss.setLastTimeRest(System.currentTimeMillis());
    }

    public static void onEnterRest(Boss boss) {
        if (!appliesTo(boss)) {
            boss.setNextRestDelayMs(Math.max(boss.getSecondsRest(), 1) * 1000L);
            return;
        }
        BossSpawnTier tier = resolveTier(boss);
        long baseDelayMs = tier.rollRestDelayMs(boss.getSecondsRest());
                long scheduled = computeScheduledDelayMs(boss, tier, baseDelayMs);
        boss.setNextRestDelayMs(BossPanelConfigService.gI().overrideRestDelayMs(boss, scheduled));

    }

    /** Căn thời điểm hết cooldown vào khung giờ hợp lệ + trải đều trong khung */
    private static long computeScheduledDelayMs(Boss boss, BossSpawnTier tier, long baseDelayMs) {
        if (!BossSpawnConfig.windowAlignEnabled || tier == BossSpawnTier.MINI) {
            return baseDelayMs + rollIntraWindowSpreadMs(boss, tier);
        }
        ZonedDateTime now = ZonedDateTime.now(ZONE_VN);
        long readySec = Math.max(1, baseDelayMs / 1000);
        ZonedDateTime ready = now.plusSeconds(readySec);
        boolean weekend = BossSpawnConfig.isWeekend(ready);
        long spreadMs = rollIntraWindowSpreadMs(boss, tier);

        if (isHourAllowed(boss, ready.getHour(), tier, weekend)) {
            return baseDelayMs + spreadMs;
        }
        int waitMin = minutesUntilAllowed(boss, ready, tier, weekend);
        return baseDelayMs + waitMin * 60_000L + spreadMs;
    }

    private static long rollIntraWindowSpreadMs(Boss boss, BossSpawnTier tier) {
        int minSec = BossSpawnConfig.intraWindowSpreadMinSec;
        int maxSec = BossSpawnConfig.intraWindowSpreadMaxSec;
        if (maxSec <= 0 || tier == BossSpawnTier.MINI) {
            return 0;
        }
        if (maxSec <= minSec) {
            return minSec * 1000L;
        }
        int span = maxSec - minSec;
        int slot = Math.abs((int) (boss.id * 31L + tier.ordinal() * 17L)) % (span + 1);
        return (minSec + slot) * 1000L;
    }

    public static void onBossSpawned(Boss boss) {
        BossSpawnOrchestrator.onBossSpawned(boss);
    }

    /**
     * Phase dùng khi kiểm tra spawn từ REST (khớp với {@link nro.models.boss.Boss#respawn()}).
     */
    public static int resolveRestSpawnLevel(Boss boss) {
        if (boss.currentLevel < 0) {
            return 0;
        }
        if (boss.currentLevel + 1 >= boss.data.length) {
            return 0;
        }
        if (boss.currentLevel == 0 && boss.data[0].getTypeAppear() == DEFAULT_APPEAR) {
            return 0;
        }
        return boss.currentLevel + 1;
    }

    public static boolean canSpawnFromRest(Boss boss, int ignoredLevel) {
        int spawnLevel = resolveRestSpawnLevel(boss);
        if (boss.data[spawnLevel].getTypeAppear() != DEFAULT_APPEAR) {
            return false;
        }
        long delay = appliesTo(boss) ? boss.getNextRestDelayMs() : boss.getSecondsRest() * 1000L;
        if (!Util.canDoWithTime(boss.getLastTimeRest(), delay)) {
            return false;
        }
        if (!appliesTo(boss)) {
            return true;
        }
        if (!isWithinSpawnWindow(boss)) {
            return false;
        }
        if (!BossSpawnOrchestrator.passesGlobalGap(boss)) {
            return false;
        }
        if (!BossSpawnOrchestrator.passesCrossTierGap(boss)) {
            return false;
        }
                if (!passesConfiguredPlacement(boss, spawnLevel)) {
            return false;
        }

        if (!passesConcurrentLimit(boss)) {
            return false;
        }
        if (!BossSpawnOrchestrator.passesFairnessQueue(boss)) {
            return false;
        }
                if (!BossSpawnOrchestrator.rollSoftWindowSpawn(boss)) {
            BossSpawnOrchestrator.applySoftWindowDefer(boss);
            return false;
        }
        if (!BossPanelConfigService.gI().passesActiveLimit(boss)) {
            return false;
        }
        return BossPanelConfigService.gI().passesSpawnChance(boss);

    }

    public static boolean isReadyForSpawnExceptConcurrent(Boss boss) {
        if (!isReadyExceptGlobalGap(boss)) {
            return false;
        }
        return BossSpawnOrchestrator.passesGlobalGap(boss);
    }

    /** Kiểm tra sẵn sàng spawn nhưng không gọi passesGlobalGap (tránh đệ quy adaptive gap). */
    static boolean isReadyExceptGlobalGap(Boss boss) {
        long delay = boss.getNextRestDelayMs();
        if (!Util.canDoWithTime(boss.getLastTimeRest(), delay)) {
            return false;
        }
        if (!isWithinSpawnWindow(boss)) {
            return false;
        }
        if (!BossSpawnOrchestrator.passesCrossTierGap(boss)) {
            return false;
        }
                return passesConfiguredPlacement(boss, resolveRestSpawnLevel(boss));

    }

    public static boolean isWithinSpawnWindow(Boss boss) {
        ZonedDateTime now = ZonedDateTime.now(ZONE_VN);
        BossSpawnTier tier = resolveTier(boss);
        boolean weekend = BossSpawnConfig.isWeekend(now);
        if (isHourAllowed(boss, now.getHour(), tier, weekend)) {
            return true;
        }
        if (BossSpawnOrchestrator.dailyBonusAppliesTo(tier)
                && BossSpawnOrchestrator.isDailyBonusHour(now.getHour())) {
            return true;
        }
        return false;
    }

    /** Ước lượng giây đến lúc spawn thực tế (cooldown + chờ khung giờ + giới hạn) */
    public static int estimateSecondsUntilSpawn(Boss boss) {
        long delay = appliesTo(boss) ? boss.getNextRestDelayMs() : boss.getSecondsRest() * 1000L;
        long elapsed = System.currentTimeMillis() - boss.getLastTimeRest();
        long cooldownLeft = Math.max(0, delay - elapsed);

        ZonedDateTime now = ZonedDateTime.now(ZONE_VN);
        BossSpawnTier tier = resolveTier(boss);
        boolean weekend = BossSpawnConfig.isWeekend(now);
        BossSpawnConfig.HourWindows windows = BossSpawnConfig.windowsFor(tier, weekend);

        int sec = 0;
        if (cooldownLeft > 0) {
            ZonedDateTime afterCooldown = now.plusSeconds(cooldownLeft / 1000);
            if (isHourAllowed(boss, afterCooldown.getHour(), tier, weekend)) {
                sec = (int) (cooldownLeft / 1000);
            } else {
                int waitWindow = minutesUntilAllowed(boss, afterCooldown, tier, weekend);
                sec = (int) (cooldownLeft / 1000) + waitWindow * 60;
            }
        } else if (isWithinSpawnWindow(boss)) {
            sec = 0;
        } else {
            sec = minutesUntilAllowed(boss, now, tier, weekend) * 60;
        }

        sec = Math.max(sec, BossSpawnOrchestrator.secondsUntilGlobalGap(boss));
        sec = Math.max(sec, BossSpawnOrchestrator.secondsUntilCrossTierGap(boss));
        return sec;
    }

    public static int secondsUntilSpawn(Boss boss) {
        int sec = estimateSecondsUntilSpawn(boss);
        if (!passesAllLimitsExceptTime(boss) && sec <= 0) {
            return estimateLimitRetrySeconds(boss);
        }
        return sec;
    }

    public static String getRestBlockReason(Boss boss) {
        if (!appliesTo(boss)) {
            return null;
        }
        long delay = boss.getNextRestDelayMs();
        if (!Util.canDoWithTime(boss.getLastTimeRest(), delay)) {
            return null;
        }
        if (!isWithinSpawnWindow(boss)) {
            if (BossSpawnConfig.dailyBonusEnabled) {
                return "chờ khung giờ (bonus hôm nay "
                        + BossSpawnOrchestrator.dailyBonusStartHour() + "–"
                        + BossSpawnOrchestrator.dailyBonusEndHour() + "h)";
            }
            return "chờ khung giờ";
        }
        if (!BossSpawnOrchestrator.passesGlobalGap(boss)) {
            return "khoảng cách spawn tier (" + BossSpawnOrchestrator.secondsUntilGlobalGap(boss) + "s)";
        }
        if (!BossSpawnOrchestrator.passesCrossTierGap(boss)) {
            return "khoảng cách ELITE/WORLD (" + BossSpawnOrchestrator.secondsUntilCrossTierGap(boss) + "s)";
        }
        int spawnLevel = resolveRestSpawnLevel(boss);
        if (!BossSpawnOrchestrator.passesMapDensity(boss, spawnLevel)) {
            if ((int) boss.id == BossID.BROLY) {
                return "map đầy (max " + BossSpawnConfig.brolyMaxPerMap + " Broly/map)";
            }
            return "map đầy (max " + BossSpawnConfig.maxBossesPerMap + "/map)";
        }
        if (!passesConcurrentLimit(boss)) {
            BossSpawnTier tier = resolveTier(boss);
            if ((int) boss.id == BossID.BROLY) {
                return "giới hạn BROLY (" + BrolySpawnGate.countActiveBroly() + "/"
                        + BossSpawnConfig.effectiveBrolyLimit() + ", online="
                        + BossSpawnConfig.onlinePlayerCount() + ")";
            }
            int configuredLimit = switch (tier) {
                case ELITE -> BossSpawnConfig.maxEliteConcurrent;
                case WORLD -> BossSpawnConfig.maxWorldConcurrent;
                case NORMAL -> BossSpawnConfig.maxNormalConcurrent;
                default -> 0;
            };
            int effectiveLimit = BossSpawnConfig.effectiveConcurrentLimit(tier, configuredLimit);
            if (tier == BossSpawnTier.ELITE) {
                return "giới hạn ELITE (" + countActiveElite() + "/" + effectiveLimit + ", online="
                        + BossSpawnConfig.onlinePlayerCount() + ")";
            }
            if (tier == BossSpawnTier.WORLD) {
                return "giới hạn WORLD (" + countActiveWorld() + "/" + effectiveLimit + ", online="
                        + BossSpawnConfig.onlinePlayerCount() + ")";
            }
            if (tier == BossSpawnTier.NORMAL) {
                return "giới hạn NORMAL (" + countActiveNormal() + "/" + effectiveLimit + ", online="
                        + BossSpawnConfig.onlinePlayerCount() + ")";
            }
        }
        if (!BossSpawnOrchestrator.passesFairnessQueue(boss)) {
            if (resolveTier(boss) == BossSpawnTier.ELITE && BossSpawnConfig.fairnessEliteEnabled) {
                return "chờ lượt spawn ELITE (xoay vòng)";
            }
            return "chờ lượt spawn (fairness)";
        }
        return null;
    }

        private static boolean passesConfiguredPlacement(Boss boss, int spawnLevel) {
        if (BossPanelConfigService.gI().hasEnabledRule(boss)) {
            return BossPanelConfigService.gI().hasAvailableConfiguredZone(boss);
        }
        return BossSpawnOrchestrator.passesMapDensity(boss, spawnLevel);
    }

    public static boolean passesConcurrentLimit(Boss boss) {

        if ((int) boss.id == BossID.BROLY) {
            int brolyLimit = BossSpawnConfig.effectiveBrolyLimit();
            return brolyLimit > 0 && BrolySpawnGate.countActiveBroly() < brolyLimit;
        }
        BossSpawnTier tier = resolveTier(boss);
        int configuredLimit = switch (tier) {
            case ELITE -> BossSpawnConfig.maxEliteConcurrent;
            case WORLD -> BossSpawnConfig.maxWorldConcurrent;
            case NORMAL -> BossSpawnConfig.maxNormalConcurrent;
            default -> 0;
        };
        if (configuredLimit > 0) {
            int effectiveLimit = BossSpawnConfig.effectiveConcurrentLimit(tier, configuredLimit);
            if (effectiveLimit <= 0) {
                return false;
            }
            if (tier == BossSpawnTier.ELITE && countActiveElite() >= effectiveLimit) {
                return false;
            }
            if (tier == BossSpawnTier.WORLD && countActiveWorld() >= effectiveLimit) {
                return false;
            }
            if (tier == BossSpawnTier.NORMAL && countActiveNormal() >= effectiveLimit) {
                return false;
            }
        }
        return true;
    }

    public static int countActiveElite() {
        return countActiveByTier(BossSpawnTier.ELITE);
    }

    public static int countActiveWorld() {
        return countActiveByTier(BossSpawnTier.WORLD);
    }

    public static int countActiveNormal() {
        return countActiveByTier(BossSpawnTier.NORMAL);
    }

    private static boolean passesAllLimitsExceptTime(Boss boss) {
        if (!isWithinSpawnWindow(boss)) {
            return false;
        }
        if (!BossSpawnOrchestrator.passesGlobalGap(boss)) {
            return false;
        }
        if (!BossSpawnOrchestrator.passesCrossTierGap(boss)) {
            return false;
        }
                if (!passesConfiguredPlacement(boss, resolveRestSpawnLevel(boss))) {
            return false;
        }

        if (!passesConcurrentLimit(boss)) {
            return false;
        }
        return BossSpawnOrchestrator.passesFairnessQueue(boss);
    }

    private static int estimateLimitRetrySeconds(Boss boss) {
        BossSpawnTier tier = resolveTier(boss);
        int gap = BossSpawnOrchestrator.secondsUntilGlobalGap(boss);
        if (gap > 0) {
            return gap;
        }
        return switch (tier) {
            case ELITE -> 90;
            case WORLD -> 300;
            case NORMAL -> 45;
            default -> 30;
        };
    }

    private static boolean isHourAllowed(Boss boss, int hour, BossSpawnTier tier, boolean weekend) {
        if ((int) boss.id == BossID.BROLY) {
            return BossSpawnConfig.brolyWindowsFor(weekend).contains(hour);
        }
        if (BossSpawnConfig.windowsFor(tier, weekend).contains(hour)) {
            return true;
        }
        return BossSpawnOrchestrator.dailyBonusAppliesTo(tier)
                && BossSpawnOrchestrator.isDailyBonusHour(hour);
    }

    private static int minutesUntilAllowed(Boss boss, ZonedDateTime from, BossSpawnTier tier, boolean weekend) {
        if (isHourAllowed(boss, from.getHour(), tier, weekend)) {
            return 0;
        }
        for (int m = 1; m <= 24 * 60; m++) {
            ZonedDateTime t = from.plusMinutes(m);
            boolean wk = BossSpawnConfig.isWeekend(t);
            if (isHourAllowed(boss, t.getHour(), tier, wk)) {
                return m;
            }
        }
        return 24 * 60;
    }

    private static int countActiveByTier(BossSpawnTier tier) {
        int n = 0;
        for (Boss boss : BossManager.getAllBosses()) {
            if (isActiveWorldBoss(boss) && resolveTier(boss) == tier) {
                n++;
            }
        }
        return n;
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
