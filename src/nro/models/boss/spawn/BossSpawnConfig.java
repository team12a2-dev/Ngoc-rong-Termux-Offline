package nro.models.boss.spawn;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZonedDateTime;

import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.utils.Logger;
/**
 * Đọc {@code boss_spawn.properties} — chỉnh không cần sửa code.
 */
public final class BossSpawnConfig {

    public static final String FILE_PATH = "boss_spawn.properties";

    public static boolean enabled = true;
    public static boolean eliteWarnEnabled = false;
    public static int eliteWarnMinutes = 5;
    public static int maxEliteConcurrent = 5;
    public static int maxWorldConcurrent = 1;
    public static int maxNormalConcurrent = 12;

    public static boolean distributionEnabled = true;
    public static int maxBossesPerMap = 2;
    public static int eliteMinGapSec = 90;
    public static int worldMinGapSec = 1800;
    public static int normalMinGapSec = 30;
    public static boolean fairnessEnabled = true;
    /** ELITE: false = bỏ hàng đợi FIFO (khuyến nghị khi nhiều boss ELITE). true = xoay vòng theo lần spawn gần nhất */
    public static boolean fairnessEliteEnabled = true;

    /** Co giãn giới hạn boss theo số player thực đang online. */
    public static boolean populationAdaptiveEnabled = true;
    public static int normalPlayersPerBoss = 6;
    public static int elitePlayersPerBoss = 12;
    public static int worldPlayersPerBoss = 25;
    public static int brolyPlayersPerBoss = 5;
    public static int superBrolyPlayersPerBoss = 20;
    public static int superBrolyMinPlayers = 8;
    public static int normalMinPlayers = 1;
    public static int eliteMinPlayers = 3;
    public static int worldMinPlayers = 8;
    public static int brolyMinPlayers = 1;
    private static volatile long onlinePlayersCacheAt;
    private static volatile int onlinePlayersCache;

    public static boolean dailyBonusEnabled = true;
    public static int dailyBonusDurationHours = 2;
    public static boolean dailyBonusNormal = true;
    public static boolean dailyBonusElite = true;

    public static boolean softWindowEnabled = true;
    public static int softWindowSpawnChance = 88;
    public static int softWindowDeferMinSec = 45;
    public static int softWindowDeferMaxSec = 180;

    /** Căn cooldown kết thúc vào khung giờ hợp lệ — tránh chờ thêm sau khi hết nghỉ */
    public static boolean windowAlignEnabled = true;
    /** Phút trải đều trong khung (tránh dồn ở đầu giờ) */
    public static int intraWindowSpreadMinSec = 30;
    public static int intraWindowSpreadMaxSec = 900;

    /** Bonus ngày ưu tiên giờ ngoài khung cố định NORMAL/ELITE */
    public static boolean dailyBonusPreferGap = true;

    /** Khoảng cách tối thiểu giữa spawn ELITE và WORLD */
    public static int crossTierGapSec = 120;

    /** Tăng gap khi nhiều boss cùng tier sẵn sàng spawn */
    public static boolean adaptiveGapEnabled = true;
    public static int adaptiveGapPerReadySec = 20;

    /** Boss chờ lâu trong khung giờ được ưu tiên spawn (soft window) */
    public static boolean waitBoostEnabled = true;
    public static int waitBoostAfterSec = 240;
    public static int waitBoostChance = 96;

    private static HourWindows miniHours = HourWindows.allDay();
    private static HourWindows normalWeekday = HourWindows.parse("9-12,14-17,19-23");
    private static HourWindows normalWeekend = HourWindows.parse("9-12,12-14,14-17,19-23");
    private static HourWindows eliteWeekday = HourWindows.parse("10-15,18-23");
    private static HourWindows eliteWeekend = HourWindows.parse("10-23");
    private static HourWindows worldWeekday = HourWindows.parse("20-22");
    private static HourWindows worldWeekend = HourWindows.parse("19-23");

    private static int[] jitterMini = {60, 140};
    private static int[] jitterNormal = {75, 125};
    private static int[] jitterElite = {85, 115};
    private static int[] jitterWorld = {90, 110};

    private static long[] staggerMiniSec = {15, 180};
    private static long[] staggerNormalSec = {60, 600};
    private static long[] staggerEliteSec = {300, 1800};
    private static long[] staggerWorldSec = {900, 3600};

    /** Số Broly spawn lúc mở server (Default event) — 15 map × 5 khu */
    public static int brolyInitialCount = 75;
    /** Thời gian nghỉ cơ bản giữa các lần Broly xuất hiện (giây) */
    public static int brolyRestSec = 180;
    /** Tối đa Broly đang hoạt động cùng lúc */
    public static int brolyMaxConcurrent = 75;
    /** Tối đa Broly trên một map (mỗi khu một boss) */
    public static int brolyMaxPerMap = 5;
    /** Khung giờ Broly — 10:00 đến trước 05:00 sáng hôm sau */
    private static HourWindows brolyHoursWeekday = HourWindows.parse("10-23,0-5");
    private static HourWindows brolyHoursWeekend = HourWindows.parse("10-23,0-5");
    public static boolean superBrolyEnabled = true;
    /** Trần an toàn; giới hạn thực tế được roll trong khoảng động. */
    public static int superBrolyMaxConcurrent = 6;
    /** Khoảng số Super Broly đồng thời trong profile hiện tại. */
    public static int superBrolyConcurrentMin = 1;
    public static int superBrolyConcurrentMax = 6;
    /** Mục tiêu tối thiểu — tăng tỉ lệ biến hình khi dưới ngưỡng này */
    public static int superBrolyTargetMin = 3;
    /** Tối thiểu giây giữa hai lần Super Broly xuất hiện (toàn server) */
    public static int superBrolyMinIntervalSec = 480;
    /** Broly phải sống trên map tối thiểu (giây) trước khi có thể biến hình */
    public static int superBrolyMinBrolyActiveSec = 120;
    /** Ngưỡng HP cố định (legacy) — dùng khi min/max bằng nhau */
    public static int superBrolyHpThreshold = 1_000_000;
    /** Ngưỡng HP ngẫu nhiên mỗi Broly khi chết — min/max */
    public static int superBrolyHpThresholdMin = 1_500;
    public static int superBrolyHpThresholdMax = 150_000;
    /** Thang HP khi chết để tính tỉ lệ Super Broly (1.500 – 100.000.000) */
    public static long superBrolyDeathHpMin = 1_500L;
    public static long superBrolyDeathHpMax = 100_000_000L;
    /** Tỉ lệ % Super Broly khi Broly bị tiêu diệt (min @ HP thấp, max @ HP cao) */
    public static int superBrolyTransformChanceMin = 8;
    public static int superBrolyTransformChanceMax = 85;
    /** Trễ ngẫu nhiên trước khi Super Broly xuất hiện sau khi roll trúng (giây) */
    public static int superBrolySpawnDelayMinSec = 60;
    public static int superBrolySpawnDelayMaxSec = 120;
    /** Số khung giờ con trong ngày — mỗi khung tối đa 1 Super Broly */
    public static int superBrolyTimeSlots = 4;
    public static int superBrolyMaxPerSlot = 1;
    /** Trần map; giới hạn thực tế được roll trong khoảng động. */
    public static int superBrolyMaxPerMap = 5;
    public static int superBrolyMapMin = 1;
    public static int superBrolyMapMax = 5;
    /** Cho phép Super Broly tự spawn, không cần hạ Broly. */
    public static boolean superBrolyNaturalEnabled = true;
    /** Xác suất mỗi lần roll tự spawn, sau khi đã qua các hard gate. */
    public static int superBrolyNaturalChancePercent = 4;
    /** Khoảng giữa hai lần roll tự spawn (giây). */
    public static int superBrolyNaturalRollMinSec = 120;
    public static int superBrolyNaturalRollMaxSec = 300;
    /** Khoảng số Super Broly tối đa trong một slot thời gian. */
    public static int superBrolySlotMin = 1;
    public static int superBrolySlotMax = 2;
    /** Khoảng cách giữa hai lần spawn, thay cho cooldown cố định. */
    public static int superBrolyIntervalMinSec = 240;
    public static int superBrolyIntervalMaxSec = 900;
    /** Khoảng thời gian giữ một profile random trước khi roll lại. */
    public static int superBrolyProfileMinSec = 180;
    public static int superBrolyProfileMaxSec = 600;
    /** Khung giờ Super Broly: 10h–5h sáng hôm sau */
    private static HourWindows superBrolyHoursWeekday = HourWindows.parse("10-23,0-5");
    private static HourWindows superBrolyHoursWeekend = HourWindows.parse("10-23,0-5");

    private BossSpawnConfig() {
    }

    public static void load() {
        reload();
    }

    public static synchronized void reload() {
        Properties p = new Properties();
        File file = new File(FILE_PATH);
        if (!file.exists()) {
            applyDefaults();
            Logger.log("Không tìm thấy " + FILE_PATH + " — dùng cấu hình mặc định (copy file từ project vào thư mục chạy server)");
            return;
        }
        try (FileInputStream in = new FileInputStream(file)) {
            p.load(in);
        } catch (IOException e) {
            Logger.error("Không đọc được " + FILE_PATH + ": " + e.getMessage());
            applyDefaults();
            return;
        }
        enabled = parseBool(p, "spawn.enabled", true);
        eliteWarnEnabled = parseBool(p, "spawn.elite.warn.enabled", false);
        eliteWarnMinutes = parseInt(p, "spawn.elite.warn.minutes", 5, 1, 30);
        maxEliteConcurrent = parseInt(p, "spawn.elite.max.concurrent", 5, 1, 20);
        maxWorldConcurrent = parseInt(p, "spawn.world.max.concurrent", 1, 0, 10);
        maxNormalConcurrent = parseInt(p, "spawn.normal.max.concurrent", 12, 0, 50);

        distributionEnabled = parseBool(p, "spawn.distribution.enabled", true);
        maxBossesPerMap = parseInt(p, "spawn.map.max.per.map", 2, 0, 10);
        eliteMinGapSec = parseInt(p, "spawn.elite.min.gap.sec", 90, 0, 3600);
        worldMinGapSec = parseInt(p, "spawn.world.min.gap.sec", 1800, 0, 86400);
        normalMinGapSec = parseInt(p, "spawn.normal.min.gap.sec", 30, 0, 600);
                fairnessEnabled = parseBool(p, "spawn.fairness.enabled", true);
        fairnessEliteEnabled = parseBool(p, "spawn.fairness.elite.enabled", true);

        populationAdaptiveEnabled = parseBool(p, "spawn.population.adaptive.enabled", true);
        normalPlayersPerBoss = parseInt(p, "spawn.population.normal.players.per.boss", 6, 1, 1000);
        elitePlayersPerBoss = parseInt(p, "spawn.population.elite.players.per.boss", 12, 1, 1000);
        worldPlayersPerBoss = parseInt(p, "spawn.population.world.players.per.boss", 25, 1, 1000);
        brolyPlayersPerBoss = parseInt(p, "spawn.population.broly.players.per.boss", 5, 1, 1000);
        superBrolyPlayersPerBoss = parseInt(p, "spawn.population.superbroly.players.per.boss", 20, 1, 1000);
        superBrolyMinPlayers = parseInt(p, "spawn.population.superbroly.min.players", 8, 0, 1000);
        normalMinPlayers = parseInt(p, "spawn.population.normal.min.players", 1, 0, 1000);
        eliteMinPlayers = parseInt(p, "spawn.population.elite.min.players", 3, 0, 1000);
        worldMinPlayers = parseInt(p, "spawn.population.world.min.players", 8, 0, 1000);
        brolyMinPlayers = parseInt(p, "spawn.population.broly.min.players", 1, 0, 1000);
        onlinePlayersCacheAt = 0L;

        dailyBonusEnabled = parseBool(p, "spawn.daily.bonus.enabled", true);
        dailyBonusDurationHours = parseInt(p, "spawn.daily.bonus.hours", 2, 1, 6);
        dailyBonusNormal = parseBool(p, "spawn.daily.bonus.normal", true);
        dailyBonusElite = parseBool(p, "spawn.daily.bonus.elite", true);

        softWindowEnabled = parseBool(p, "spawn.soft.window.enabled", true);
        softWindowSpawnChance = parseInt(p, "spawn.soft.window.spawn.chance", 88, 1, 100);
        softWindowDeferMinSec = parseInt(p, "spawn.soft.window.defer.min.sec", 45, 5, 600);
        softWindowDeferMaxSec = parseInt(p, "spawn.soft.window.defer.max.sec", 180, 10, 1800);

        windowAlignEnabled = parseBool(p, "spawn.window.align.enabled", true);
        intraWindowSpreadMinSec = parseInt(p, "spawn.intra.window.spread.min.sec", 30, 0, 3600);
        intraWindowSpreadMaxSec = parseInt(p, "spawn.intra.window.spread.max.sec", 900, 0, 3600);
        if (intraWindowSpreadMaxSec < intraWindowSpreadMinSec) {
            intraWindowSpreadMaxSec = intraWindowSpreadMinSec;
        }

        dailyBonusPreferGap = parseBool(p, "spawn.daily.bonus.prefer.gap", true);
        crossTierGapSec = parseInt(p, "spawn.cross.tier.gap.sec", 120, 0, 3600);
        adaptiveGapEnabled = parseBool(p, "spawn.adaptive.gap.enabled", true);
        adaptiveGapPerReadySec = parseInt(p, "spawn.adaptive.gap.per.ready.sec", 20, 0, 300);
        waitBoostEnabled = parseBool(p, "spawn.wait.boost.enabled", true);
        waitBoostAfterSec = parseInt(p, "spawn.wait.boost.after.sec", 240, 30, 3600);
        waitBoostChance = parseInt(p, "spawn.wait.boost.chance", 96, 50, 100);

        String miniSpec = p.getProperty("spawn.mini.hours", "all");
        miniHours = "all".equalsIgnoreCase(miniSpec.trim()) ? HourWindows.allDay() : HourWindows.parse(miniSpec);
        normalWeekday = HourWindows.parse(p.getProperty("spawn.normal.hours.weekday", "9-12,14-17,19-23"));
        normalWeekend = HourWindows.parse(p.getProperty("spawn.normal.hours.weekend", "9-12,12-14,14-17,19-23"));
        eliteWeekday = HourWindows.parse(p.getProperty("spawn.elite.hours.weekday", "10-15,18-23"));
        eliteWeekend = HourWindows.parse(p.getProperty("spawn.elite.hours.weekend", "10-23"));
        worldWeekday = HourWindows.parse(p.getProperty("spawn.world.hours.weekday", "20-22"));
        worldWeekend = HourWindows.parse(p.getProperty("spawn.world.hours.weekend", "19-23"));

        jitterMini = parseRange(p, "spawn.jitter.mini", 60, 140);
        jitterNormal = parseRange(p, "spawn.jitter.normal", 75, 125);
        jitterElite = parseRange(p, "spawn.jitter.elite", 85, 115);
        jitterWorld = parseRange(p, "spawn.jitter.world", 90, 110);

        staggerMiniSec = parseRangeLong(p, "spawn.stagger.mini.sec", 15, 180);
        staggerNormalSec = parseRangeLong(p, "spawn.stagger.normal.sec", 60, 600);
        staggerEliteSec = parseRangeLong(p, "spawn.stagger.elite.sec", 300, 1800);
        staggerWorldSec = parseRangeLong(p, "spawn.stagger.world.sec", 900, 3600);

        brolyInitialCount = parseInt(p, "spawn.broly.initial.count", 75, 1, 100);
        brolyRestSec = parseInt(p, "spawn.broly.rest.sec", 180, 60, 3600);
        brolyMaxConcurrent = parseInt(p, "spawn.broly.max.concurrent", 75, 1, 100);
        brolyMaxPerMap = parseInt(p, "spawn.broly.max.per.map", 5, 1, 10);
        String brolyWeekdaySpec = p.getProperty("spawn.broly.hours.weekday", "10-23,0-5");
        brolyHoursWeekday = "all".equalsIgnoreCase(brolyWeekdaySpec.trim())
                ? HourWindows.allDay() : HourWindows.parse(brolyWeekdaySpec);
        String brolyWeekendSpec = p.getProperty("spawn.broly.hours.weekend", "10-23,0-5");
        brolyHoursWeekend = "all".equalsIgnoreCase(brolyWeekendSpec.trim())
                ? HourWindows.allDay() : HourWindows.parse(brolyWeekendSpec);
        superBrolyEnabled = parseBool(p, "spawn.superbroly.enabled", true);
                superBrolyMaxConcurrent = parseInt(p, "spawn.superbroly.max.concurrent", 6, 1, 20);
        superBrolyConcurrentMin = parseInt(p, "spawn.superbroly.concurrent.min", 1, 1, 20);
        superBrolyConcurrentMax = parseInt(p, "spawn.superbroly.concurrent.max", superBrolyMaxConcurrent, 1, 20);
        if (superBrolyConcurrentMax < superBrolyConcurrentMin) {
            superBrolyConcurrentMax = superBrolyConcurrentMin;
        }
        superBrolyMaxConcurrent = superBrolyConcurrentMax;
        superBrolyTargetMin = parseInt(p, "spawn.superbroly.target.min", 3, 1, 10);
        superBrolyMinIntervalSec = parseInt(p, "spawn.superbroly.min.interval.sec", 480, 60, 86400);
        superBrolyMinBrolyActiveSec = parseInt(p, "spawn.superbroly.broly.min.active.sec", 120, 30, 3600);
        superBrolyHpThreshold = parseInt(p, "spawn.superbroly.hp.threshold", 1_000_000, 100_000, 20_000_000);
        superBrolyHpThresholdMin = parseInt(p, "spawn.superbroly.hp.threshold.min", 1_500, 100, 100_000_000);
        superBrolyHpThresholdMax = parseInt(p, "spawn.superbroly.hp.threshold.max", 150_000, 100, 100_000_000);
        if (superBrolyHpThresholdMax < superBrolyHpThresholdMin) {
            superBrolyHpThresholdMax = superBrolyHpThresholdMin;
        }
        superBrolyDeathHpMin = parseLong(p, "spawn.superbroly.death.hp.min", 1_500L, 100L, 100_000_000L);
        superBrolyDeathHpMax = parseLong(p, "spawn.superbroly.death.hp.max", 100_000_000L, 1_000L, 100_000_000L);
        if (superBrolyDeathHpMax < superBrolyDeathHpMin) {
            superBrolyDeathHpMax = superBrolyDeathHpMin;
        }
        superBrolyTransformChanceMin = parseInt(p, "spawn.superbroly.transform.chance.min", 8, 1, 99);
        superBrolyTransformChanceMax = parseInt(p, "spawn.superbroly.transform.chance.max", 85, 1, 99);
        if (superBrolyTransformChanceMax < superBrolyTransformChanceMin) {
            superBrolyTransformChanceMax = superBrolyTransformChanceMin;
        }
        superBrolySpawnDelayMinSec = parseInt(p, "spawn.superbroly.spawn.delay.min.sec", 60, 10, 600);
        superBrolySpawnDelayMaxSec = parseInt(p, "spawn.superbroly.spawn.delay.max.sec", 120, 10, 900);
        if (superBrolySpawnDelayMaxSec < superBrolySpawnDelayMinSec) {
            superBrolySpawnDelayMaxSec = superBrolySpawnDelayMinSec;
        }
        superBrolyTimeSlots = parseInt(p, "spawn.superbroly.time.slots", 4, 1, 8);
                superBrolyMaxPerSlot = parseInt(p, "spawn.superbroly.max.per.slot", 1, 1, 4);
        superBrolyMaxPerMap = parseInt(p, "spawn.superbroly.max.per.map", 5, 1, 10);
        superBrolyMapMin = parseInt(p, "spawn.superbroly.map.min", 1, 1, 10);
        superBrolyMapMax = parseInt(p, "spawn.superbroly.map.max", superBrolyMaxPerMap, 1, 10);
        if (superBrolyMapMax < superBrolyMapMin) {
            superBrolyMapMax = superBrolyMapMin;
        }
        superBrolyMaxPerMap = superBrolyMapMax;
        superBrolyNaturalEnabled = parseBool(p, "spawn.superbroly.natural.enabled", true);
        superBrolyNaturalChancePercent = parseInt(p, "spawn.superbroly.natural.chance.percent", 8, 1, 100);
        superBrolyNaturalRollMinSec = parseInt(p, "spawn.superbroly.natural.roll.min.sec", 120, 30, 3600);
        superBrolyNaturalRollMaxSec = parseInt(p, "spawn.superbroly.natural.roll.max.sec", 300, 60, 7200);
        if (superBrolyNaturalRollMaxSec < superBrolyNaturalRollMinSec) {
            superBrolyNaturalRollMaxSec = superBrolyNaturalRollMinSec;
        }
        superBrolySlotMin = parseInt(p, "spawn.superbroly.slot.min", 1, 1, 4);
        superBrolySlotMax = parseInt(p, "spawn.superbroly.slot.max", 2, 1, 4);
        if (superBrolySlotMax < superBrolySlotMin) {
            superBrolySlotMax = superBrolySlotMin;
        }
        superBrolyIntervalMinSec = parseInt(p, "spawn.superbroly.interval.min.sec", 240, 30, 86400);
        superBrolyIntervalMaxSec = parseInt(p, "spawn.superbroly.interval.max.sec", 900, 60, 172800);
        if (superBrolyIntervalMaxSec < superBrolyIntervalMinSec) {
            superBrolyIntervalMaxSec = superBrolyIntervalMinSec;
        }
        superBrolyProfileMinSec = parseInt(p, "spawn.superbroly.profile.min.sec", 180, 30, 86400);
        superBrolyProfileMaxSec = parseInt(p, "spawn.superbroly.profile.max.sec", 600, 60, 172800);
        if (superBrolyProfileMaxSec < superBrolyProfileMinSec) {
            superBrolyProfileMaxSec = superBrolyProfileMinSec;
        }
        String superWeekdaySpec = p.getProperty("spawn.superbroly.hours.weekday", "10-23,0-5");
        superBrolyHoursWeekday = "all".equalsIgnoreCase(superWeekdaySpec.trim())
                ? HourWindows.allDay() : HourWindows.parse(superWeekdaySpec);
        String superWeekendSpec = p.getProperty("spawn.superbroly.hours.weekend", "10-23,0-5");
        superBrolyHoursWeekend = "all".equalsIgnoreCase(superWeekendSpec.trim())
                ? HourWindows.allDay() : HourWindows.parse(superWeekendSpec);

        Logger.success("Đã tải " + FILE_PATH + " | elite max=" + maxEliteConcurrent
                + ", normal max=" + maxNormalConcurrent
                + ", phân bổ=" + (distributionEnabled ? "bật" : "tắt"));
    }

    /** Số player thật đang online, cache tối đa 5 giây để không quét danh sách ở mỗi boss tick. */
    public static int onlinePlayerCount() {
        long now = System.currentTimeMillis();
        if (now - onlinePlayersCacheAt < 5_000L) {
            return onlinePlayersCache;
        }
        int count = 0;
        List<Player> players = Client.gI().getPlayers();
        synchronized (players) {
            for (Player player : players) {
                if (player != null && player.isPl()) {
                    count++;
                }
            }
        }
        onlinePlayersCache = count;
        onlinePlayersCacheAt = now;
        return count;
    }

    /**
     * Giới hạn động: không vượt trần cấu hình, nhưng tự giảm khi server vắng.
     * Trả 0 khi chưa đủ người chơi tối thiểu cho tier đó.
     */
    public static int effectiveConcurrentLimit(BossSpawnTier tier, int configuredLimit) {
        if (configuredLimit <= 0 || !populationAdaptiveEnabled) {
            return configuredLimit;
        }
        int players = onlinePlayerCount();
        int minPlayers;
        int playersPerBoss;
        switch (tier) {
            case ELITE -> {
                minPlayers = eliteMinPlayers;
                playersPerBoss = elitePlayersPerBoss;
            }
            case WORLD -> {
                minPlayers = worldMinPlayers;
                playersPerBoss = worldPlayersPerBoss;
            }
            case NORMAL -> {
                minPlayers = normalMinPlayers;
                playersPerBoss = normalPlayersPerBoss;
            }
            default -> {
                return configuredLimit;
            }
        }
        if (players < minPlayers) {
            return 0;
        }
        int dynamicLimit = Math.max(1, (players + playersPerBoss - 1) / playersPerBoss);
        return Math.min(configuredLimit, dynamicLimit);
    }

        public static int effectiveBrolyLimit() {
        if (!populationAdaptiveEnabled || brolyMaxConcurrent <= 0) {
            return brolyMaxConcurrent;
        }
        int players = onlinePlayerCount();
        if (players < brolyMinPlayers) {
            return 0;
        }
        int dynamicLimit = Math.max(1, (players + brolyPlayersPerBoss - 1) / brolyPlayersPerBoss);
        return Math.min(brolyMaxConcurrent, dynamicLimit);
    }

    public static int effectiveSuperBrolyLimit() {
        if (!populationAdaptiveEnabled || superBrolyMaxConcurrent <= 0) {
            return superBrolyMaxConcurrent;
        }
        int players = onlinePlayerCount();
        if (players < superBrolyMinPlayers) {
            return 0;
        }
        int dynamicLimit = Math.max(1, (players + superBrolyPlayersPerBoss - 1) / superBrolyPlayersPerBoss);
        return Math.min(superBrolyMaxConcurrent, dynamicLimit);
    }

    public static HourWindows windowsFor(BossSpawnTier tier, boolean weekend) {
        return switch (tier) {
            case MINI -> miniHours;
            case NORMAL -> weekend ? normalWeekend : normalWeekday;
            case ELITE -> weekend ? eliteWeekend : eliteWeekday;
            case WORLD -> weekend ? worldWeekend : worldWeekday;
        };
    }

    public static HourWindows superBrolyWindowsFor(boolean weekend) {
        return weekend ? superBrolyHoursWeekend : superBrolyHoursWeekday;
    }

    public static HourWindows brolyWindowsFor(boolean weekend) {
        return weekend ? brolyHoursWeekend : brolyHoursWeekday;
    }

    /** Khung Broly/Super Broly chính xác theo phút: từ 10:00 đến trước 05:00 hôm sau. */
    public static boolean isBrolyFamilyWindow(ZonedDateTime moment) {
        if (moment == null) return false;
        LocalTime time = moment.withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalTime();
        return !time.isBefore(LocalTime.of(10, 0)) || time.isBefore(LocalTime.of(5, 0));
    }

    public static int jitterMin(BossSpawnTier tier) {
        return switch (tier) {
            case MINI -> jitterMini[0];
            case NORMAL -> jitterNormal[0];
            case ELITE -> jitterElite[0];
            case WORLD -> jitterWorld[0];
        };
    }

    public static int jitterMax(BossSpawnTier tier) {
        return switch (tier) {
            case MINI -> jitterMini[1];
            case NORMAL -> jitterNormal[1];
            case ELITE -> jitterElite[1];
            case WORLD -> jitterWorld[1];
        };
    }

    public static long staggerMinMs(BossSpawnTier tier) {
        long sec = switch (tier) {
            case MINI -> staggerMiniSec[0];
            case NORMAL -> staggerNormalSec[0];
            case ELITE -> staggerEliteSec[0];
            case WORLD -> staggerWorldSec[0];
        };
        return sec * 1000L;
    }

    public static long staggerMaxMs(BossSpawnTier tier) {
        long sec = switch (tier) {
            case MINI -> staggerMiniSec[1];
            case NORMAL -> staggerNormalSec[1];
            case ELITE -> staggerEliteSec[1];
            case WORLD -> staggerWorldSec[1];
        };
        return sec * 1000L;
    }

    public static boolean isWeekend(ZonedDateTime time) {
        DayOfWeek d = time.getDayOfWeek();
        return d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
    }

    private static void applyDefaults() {
        enabled = true;
        eliteWarnEnabled = false;
        eliteWarnMinutes = 5;
        maxEliteConcurrent = 5;
        maxWorldConcurrent = 1;
        maxNormalConcurrent = 12;
        distributionEnabled = true;
        maxBossesPerMap = 2;
        eliteMinGapSec = 90;
        worldMinGapSec = 1800;
        normalMinGapSec = 30;
        fairnessEnabled = true;
        fairnessEliteEnabled = true;
        populationAdaptiveEnabled = true;
        normalPlayersPerBoss = 6;
        elitePlayersPerBoss = 12;
        worldPlayersPerBoss = 25;
        brolyPlayersPerBoss = 5;
        superBrolyPlayersPerBoss = 20;
        superBrolyMinPlayers = 8;
        normalMinPlayers = 1;
        eliteMinPlayers = 3;
        worldMinPlayers = 8;
        brolyMinPlayers = 1;
        onlinePlayersCacheAt = 0L;
        onlinePlayersCache = 0;
        dailyBonusEnabled = true;
        dailyBonusDurationHours = 2;
        dailyBonusNormal = true;
        dailyBonusElite = true;
        softWindowEnabled = true;
        softWindowSpawnChance = 88;
        softWindowDeferMinSec = 45;
        softWindowDeferMaxSec = 180;
        windowAlignEnabled = true;
        intraWindowSpreadMinSec = 30;
        intraWindowSpreadMaxSec = 900;
        dailyBonusPreferGap = true;
        crossTierGapSec = 120;
        adaptiveGapEnabled = true;
        adaptiveGapPerReadySec = 20;
        waitBoostEnabled = true;
        waitBoostAfterSec = 240;
        waitBoostChance = 96;
        brolyInitialCount = 75;
        brolyRestSec = 180;
        brolyMaxConcurrent = 75;
        brolyMaxPerMap = 5;
        brolyHoursWeekday = HourWindows.parse("10-23,0-5");
        brolyHoursWeekend = HourWindows.parse("10-23,0-5");
        superBrolyEnabled = true;
        superBrolyMaxConcurrent = 6;
        superBrolyConcurrentMin = 1;
        superBrolyConcurrentMax = 6;
        superBrolyTargetMin = 3;
        superBrolyMinIntervalSec = 480;
        superBrolyMinBrolyActiveSec = 120;
        superBrolyHpThreshold = 1_000_000;
        superBrolyHpThresholdMin = 1_500;
        superBrolyHpThresholdMax = 150_000;
        superBrolyDeathHpMin = 1_500L;
        superBrolyDeathHpMax = 100_000_000L;
        superBrolyTransformChanceMin = 8;
        superBrolyTransformChanceMax = 85;
        superBrolySpawnDelayMinSec = 60;
        superBrolySpawnDelayMaxSec = 120;
        superBrolyTimeSlots = 4;
        superBrolyMaxPerSlot = 1;
        superBrolyMaxPerMap = 5;
        superBrolyMapMin = 1;
        superBrolyMapMax = 5;
        superBrolyNaturalEnabled = true;
        superBrolyNaturalChancePercent = 8;
        superBrolyNaturalRollMinSec = 120;
        superBrolyNaturalRollMaxSec = 300;
        superBrolySlotMin = 1;
        superBrolySlotMax = 2;
        superBrolyIntervalMinSec = 240;
        superBrolyIntervalMaxSec = 900;
        superBrolyProfileMinSec = 180;
        superBrolyProfileMaxSec = 600;
        superBrolyHoursWeekday = HourWindows.parse("10-23,0-5");
        superBrolyHoursWeekend = HourWindows.parse("10-23,0-5");
    }

    /** Giờ không thuộc khung NORMAL hoặc ELITE — dùng chọn bonus ngày */
    public static List<Integer> gapHoursForDailyBonus(boolean weekend) {
        List<Integer> gaps = new ArrayList<>();
        HourWindows normalWin = windowsFor(BossSpawnTier.NORMAL, weekend);
        HourWindows eliteWin = windowsFor(BossSpawnTier.ELITE, weekend);
        for (int h = 7; h <= 23; h++) {
            if (!normalWin.contains(h) && !eliteWin.contains(h)) {
                gaps.add(h);
            }
        }
        return gaps;
    }

    private static boolean parseBool(Properties p, String key, boolean def) {
        String v = p.getProperty(key);
        if (v == null) {
            return def;
        }
        return "true".equalsIgnoreCase(v.trim()) || "1".equals(v.trim());
    }

    private static int parseInt(Properties p, String key, int def, int min, int max) {
        try {
            int v = Integer.parseInt(p.getProperty(key, String.valueOf(def)).trim());
            return Math.max(min, Math.min(max, v));
        } catch (Exception e) {
            return def;
        }
    }

    private static long parseLong(Properties p, String key, long def, long min, long max) {
        try {
            long v = Long.parseLong(p.getProperty(key, String.valueOf(def)).trim());
            return Math.max(min, Math.min(max, v));
        } catch (Exception e) {
            return def;
        }
    }

    private static int[] parseRange(Properties p, String key, int defMin, int defMax) {
        String v = p.getProperty(key);
        if (v == null || !v.contains(",")) {
            return new int[]{defMin, defMax};
        }
        try {
            String[] parts = v.split(",");
            return new int[]{
                Integer.parseInt(parts[0].trim()),
                Integer.parseInt(parts[1].trim())
            };
        } catch (Exception e) {
            return new int[]{defMin, defMax};
        }
    }

    private static long[] parseRangeLong(Properties p, String key, long defMin, long defMax) {
        String v = p.getProperty(key);
        if (v == null || !v.contains(",")) {
            return new long[]{defMin, defMax};
        }
        try {
            String[] parts = v.split(",");
            return new long[]{
                Long.parseLong(parts[0].trim()),
                Long.parseLong(parts[1].trim())
            };
        } catch (Exception e) {
            return new long[]{defMin, defMax};
        }
    }

    /** Khung giờ dạng {@code 9-12,14-17} */
    public static final class HourWindows {

        private final List<int[]> ranges;

        public HourWindows(List<int[]> ranges) {
            this.ranges = ranges == null || ranges.isEmpty()
                    ? List.of(new int[]{0, 23}) : ranges;
        }

        public static HourWindows allDay() {
            return new HourWindows(List.of(new int[]{0, 23}));
        }

        public static HourWindows parse(String spec) {
            List<int[]> list = new ArrayList<>();
            if (spec == null || spec.isBlank()) {
                return allDay();
            }
            for (String part : spec.split(",")) {
                part = part.trim();
                if (part.isEmpty()) {
                    continue;
                }
                String[] se = part.split("-");
                if (se.length == 2) {
                    int a = Integer.parseInt(se[0].trim());
                    int b = Integer.parseInt(se[1].trim());
                    list.add(new int[]{a, b});
                }
            }
            return list.isEmpty() ? allDay() : new HourWindows(list);
        }

        public boolean contains(int hour) {
            for (int[] r : ranges) {
                if (hour >= r[0] && hour <= r[1]) {
                    return true;
                }
            }
            return false;
        }

        /** Phút đến khi vào khung giờ kế (0 nếu đang trong khung) */
        public int minutesUntilOpen(ZonedDateTime from) {
            if (contains(from.getHour())) {
                return 0;
            }
            for (int m = 1; m <= 24 * 60; m++) {
                ZonedDateTime t = from.plusMinutes(m);
                if (contains(t.getHour())) {
                    return m;
                }
            }
            return 24 * 60;
        }
    }
}
