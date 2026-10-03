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
    public static int eliteMinGapSec = 15;
    public static int worldMinGapSec = 60;
    public static int normalMinGapSec = 10;
    public static boolean fairnessEnabled = true;
    /** ELITE: false = bỏ hàng đợi FIFO (khuyến nghị khi nhiều boss ELITE). true = xoay vòng theo lần spawn gần nhất */
    public static boolean fairnessEliteEnabled = true;

    /** Co giãn giới hạn boss theo số player thực đang online. */
    public static boolean populationAdaptiveEnabled = false;
    public static int normalPlayersPerBoss = 6;
    public static int elitePlayersPerBoss = 12;
    public static int worldPlayersPerBoss = 25;
    public static int brolyPlayersPerBoss = 5;
    public static int superBrolyPlayersPerBoss = 20;
    public static int superBrolyMinPlayers = 0;
    public static int normalMinPlayers = 0;
    public static int eliteMinPlayers = 0;
    public static int worldMinPlayers = 0;
    public static int brolyMinPlayers = 0;
    private static volatile long onlinePlayersCacheAt;
    private static volatile int onlinePlayersCache;

    public static boolean dailyBonusEnabled = true;
    public static int dailyBonusDurationHours = 2;
    public static boolean dailyBonusNormal = true;
    public static boolean dailyBonusElite = true;

    public static boolean softWindowEnabled = false;
    public static int softWindowSpawnChance = 100;
    public static int softWindowDeferMinSec = 10;
    public static int softWindowDeferMaxSec = 30;

    /** Căn cooldown kết thúc vào khung giờ hợp lệ — tránh chờ thêm sau khi hết nghỉ */
    public static boolean windowAlignEnabled = false;
    /** Phút trải đều trong khung (tránh dồn ở đầu giờ) */
    public static int intraWindowSpreadMinSec = 0;
    public static int intraWindowSpreadMaxSec = 0;

    /** Bonus ngày ưu tiên giờ ngoài khung cố định NORMAL/ELITE */
    public static boolean dailyBonusPreferGap = true;

    /** Khoảng cách tối thiểu giữa spawn ELITE và WORLD */
    public static int crossTierGapSec = 0;

    /** Tăng gap khi nhiều boss cùng tier sẵn sàng spawn */
    public static boolean adaptiveGapEnabled = false;
    public static int adaptiveGapPerReadySec = 0;

    /** Boss chờ lâu trong khung giờ được ưu tiên spawn (soft window) */
    public static boolean waitBoostEnabled = true;
    public static int waitBoostAfterSec = 60;
    public static int waitBoostChance = 100;

    private static HourWindows miniHours = HourWindows.allDay();
    private static HourWindows normalWeekday = HourWindows.allDay();
    private static HourWindows normalWeekend = HourWindows.allDay();
    private static HourWindows eliteWeekday = HourWindows.allDay();
    private static HourWindows eliteWeekend = HourWindows.allDay();
    private static HourWindows worldWeekday = HourWindows.allDay();
    private static HourWindows worldWeekend = HourWindows.allDay();

    public static boolean tdstScheduled = true;
    public static int tdstRestMinSec = 900;
    public static int tdstRestMaxSec = 1200;
    public static int tdstNmRestMinSec = 1500;
    public static int tdstNmRestMaxSec = 2100;
    private static HourWindows tdstHoursWeekday = HourWindows.allDay();
    private static HourWindows tdstHoursWeekend = HourWindows.allDay();
    public static boolean tdstSupportHourEnabled = false;
    private static HourWindows tdstSupportHours = HourWindows.parse("1,14");

    private static int[] jitterMini = {80, 120};
    private static int[] jitterNormal = {80, 120};
    private static int[] jitterElite = {85, 115};
    private static int[] jitterWorld = {90, 110};

    private static long[] staggerMiniSec = {5, 20};
    private static long[] staggerNormalSec = {10, 30};
    private static long[] staggerEliteSec = {15, 60};
    private static long[] staggerWorldSec = {30, 120};

    /** Số Broly spawn lúc mở server (Default event) — 15 map × 5 khu */
    public static int brolyInitialCount = 75;
    /** Thời gian nghỉ cơ bản giữa các lần Broly xuất hiện (giây) */
    public static int brolyRestSec = 180;
    /** Tối đa Broly đang hoạt động cùng lúc */
    public static int brolyMaxConcurrent = 75;
    /** Tối đa Broly trên một map (mỗi khu một boss) */
    public static int brolyMaxPerMap = 5;
    /** Khung giờ Broly — 24/7 */
    private static HourWindows brolyHoursWeekday = HourWindows.allDay();
    private static HourWindows brolyHoursWeekend = HourWindows.allDay();
    public static boolean superBrolyEnabled = true;
    /** Trần an toàn; giới hạn thực tế được roll trong khoảng động. */
    public static int superBrolyMaxConcurrent = 6;
    /** Khoảng số Super Broly đồng thời trong profile hiện tại. */
    public static int superBrolyConcurrentMin = 1;
    public static int superBrolyConcurrentMax = 6;
    /** Mục tiêu tối thiểu — tăng tỉ lệ biến hình khi dưới ngưỡng này */
    public static int superBrolyTargetMin = 3;
    /** Tối thiểu giây giữa hai lần Super Broly xuất hiện (toàn server) */
    public static int superBrolyMinIntervalSec = 180;
    /** Broly phải sống trên map tối thiểu (giây) trước khi có thể biến hình */
    public static int superBrolyMinBrolyActiveSec = 60;
    /** Ngưỡng HP cố định (legacy) — dùng khi min/max bằng nhau */
    public static int superBrolyHpThreshold = 1_000_000;
    /** Ngưỡng HP ngẫu nhiên mỗi Broly khi chết — min/max */
    public static int superBrolyHpThresholdMin = 1_500;
    public static int superBrolyHpThresholdMax = 150_000;
    /** Thang HP khi chết để tính tỉ lệ Super Broly (1.500 – 100.000.000) */
    public static long superBrolyDeathHpMin = 1_500L;
    public static long superBrolyDeathHpMax = 100_000_000L;
    /** Tỉ lệ % Super Broly khi Broly bị tiêu diệt (min @ HP thấp, max @ HP cao) */
    public static int superBrolyTransformChanceMin = 15;
    public static int superBrolyTransformChanceMax = 85;
    /** Trễ ngẫu nhiên trước khi Super Broly xuất hiện sau khi roll trúng (giây) */
    public static int superBrolySpawnDelayMinSec = 15;
    public static int superBrolySpawnDelayMaxSec = 60;
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
    private static HourWindows superBrolyHoursWeekday = HourWindows.allDay();
    private static HourWindows superBrolyHoursWeekend = HourWindows.allDay();

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
        try (FileInputStream in = new FileInputStream(file);
             java.io.InputStreamReader reader = new java.io.InputStreamReader(in, java.nio.charset.StandardCharsets.UTF_8)) {
            p.load(reader);
        } catch (IOException e) {
            Logger.error("Không đọc được " + FILE_PATH + ": " + e.getMessage());
            applyDefaults();
            return;
        }
        enabled = parseBool(p, "spawn.enabled", true);
        eliteWarnEnabled = parseBool(p, "spawn.elite.warn.enabled", false);
        distributionEnabled = parseBool(p, "spawn.distribution.enabled", true);
        maxBossesPerMap = parseInt(p, "spawn.map.max.per.map", 2, 0, 10);
        eliteMinGapSec = parseInt(p, "spawn.elite.min.gap.sec", 15, 0, 3600);
        worldMinGapSec = parseInt(p, "spawn.world.min.gap.sec", 60, 0, 86400);
        normalMinGapSec = parseInt(p, "spawn.normal.min.gap.sec", 10, 0, 600);
        fairnessEnabled = parseBool(p, "spawn.fairness.enabled", true);
        fairnessEliteEnabled = parseBool(p, "spawn.fairness.elite.enabled", true);

        populationAdaptiveEnabled = parseBool(p, "spawn.population.adaptive.enabled", false);
        normalPlayersPerBoss = parseInt(p, "spawn.population.normal.players.per.boss", 6, 1, 1000);
        elitePlayersPerBoss = parseInt(p, "spawn.population.elite.players.per.boss", 12, 1, 1000);
        worldPlayersPerBoss = parseInt(p, "spawn.population.world.players.per.boss", 25, 1, 1000);
        brolyPlayersPerBoss = parseInt(p, "spawn.population.broly.players.per.boss", 5, 1, 1000);
        superBrolyPlayersPerBoss = parseInt(p, "spawn.population.superbroly.players.per.boss", 20, 1, 1000);
        superBrolyMinPlayers = parseInt(p, "spawn.population.superbroly.min.players", 0, 0, 1000);
        normalMinPlayers = parseInt(p, "spawn.population.normal.min.players", 0, 0, 1000);
        eliteMinPlayers = parseInt(p, "spawn.population.elite.min.players", 0, 0, 1000);
        worldMinPlayers = parseInt(p, "spawn.population.world.min.players", 0, 0, 1000);
        brolyMinPlayers = parseInt(p, "spawn.population.broly.min.players", 0, 0, 1000);
        onlinePlayersCacheAt = 0L;

        dailyBonusEnabled = parseBool(p, "spawn.daily.bonus.enabled", true);
        dailyBonusDurationHours = parseInt(p, "spawn.daily.bonus.hours", 2, 1, 6);
        dailyBonusNormal = parseBool(p, "spawn.daily.bonus.normal", true);
        dailyBonusElite = parseBool(p, "spawn.daily.bonus.elite", true);

        softWindowEnabled = parseBool(p, "spawn.soft.window.enabled", false);
        softWindowSpawnChance = parseInt(p, "spawn.soft.window.spawn.chance", 100, 1, 100);
        softWindowDeferMinSec = parseInt(p, "spawn.soft.window.defer.min.sec", 10, 1, 600);
        softWindowDeferMaxSec = parseInt(p, "spawn.soft.window.defer.max.sec", 30, 1, 1800);

        windowAlignEnabled = parseBool(p, "spawn.window.align.enabled", false);
        intraWindowSpreadMinSec = parseInt(p, "spawn.intra.window.spread.min.sec", 0, 0, 3600);
        intraWindowSpreadMaxSec = parseInt(p, "spawn.intra.window.spread.max.sec", 0, 0, 3600);
        if (intraWindowSpreadMaxSec < intraWindowSpreadMinSec) {
            intraWindowSpreadMaxSec = intraWindowSpreadMinSec;
        }

        dailyBonusPreferGap = parseBool(p, "spawn.daily.bonus.prefer.gap", true);
        crossTierGapSec = parseInt(p, "spawn.cross.tier.gap.sec", 0, 0, 3600);
        adaptiveGapEnabled = parseBool(p, "spawn.adaptive.gap.enabled", false);
        adaptiveGapPerReadySec = parseInt(p, "spawn.adaptive.gap.per.ready.sec", 0, 0, 300);
        waitBoostEnabled = parseBool(p, "spawn.wait.boost.enabled", true);
        waitBoostAfterSec = parseInt(p, "spawn.wait.boost.after.sec", 60, 10, 3600);
        waitBoostChance = parseInt(p, "spawn.wait.boost.chance", 100, 50, 100);

        String miniSpec = p.getProperty("spawn.mini.hours", "all");
        miniHours = "all".equalsIgnoreCase(miniSpec.trim()) ? HourWindows.allDay() : HourWindows.parse(miniSpec);
        normalWeekday = HourWindows.parse(p.getProperty("spawn.normal.hours.weekday", "all"));
        normalWeekend = HourWindows.parse(p.getProperty("spawn.normal.hours.weekend", "all"));
        eliteWeekday = HourWindows.parse(p.getProperty("spawn.elite.hours.weekday", "all"));
        eliteWeekend = HourWindows.parse(p.getProperty("spawn.elite.hours.weekend", "all"));
        worldWeekday = HourWindows.parse(p.getProperty("spawn.world.hours.weekday", "all"));
        worldWeekend = HourWindows.parse(p.getProperty("spawn.world.hours.weekend", "all"));

        tdstScheduled = parseBool(p, "spawn.tdst.scheduled", true);
        tdstRestMinSec = parseInt(p, "spawn.tdst.rest.min.sec", 900, 30, 86400);
        tdstRestMaxSec = parseInt(p, "spawn.tdst.rest.max.sec", 1200, 30, 86400);
        if (tdstRestMaxSec < tdstRestMinSec) {
            tdstRestMaxSec = tdstRestMinSec;
        }
        tdstNmRestMinSec = parseInt(p, "spawn.tdst.nm.rest.min.sec", 1500, 30, 86400);
        tdstNmRestMaxSec = parseInt(p, "spawn.tdst.nm.rest.max.sec", 2100, 30, 86400);
        if (tdstNmRestMaxSec < tdstNmRestMinSec) {
            tdstNmRestMaxSec = tdstNmRestMinSec;
        }
        String tdstWeekdaySpec = p.getProperty("spawn.tdst.hours.weekday", "all");
        tdstHoursWeekday = "all".equalsIgnoreCase(tdstWeekdaySpec.trim())
                ? HourWindows.allDay() : HourWindows.parse(tdstWeekdaySpec);
        String tdstWeekendSpec = p.getProperty("spawn.tdst.hours.weekend", "all");
        tdstHoursWeekend = "all".equalsIgnoreCase(tdstWeekendSpec.trim())
                ? HourWindows.allDay() : HourWindows.parse(tdstWeekendSpec);
        tdstSupportHourEnabled = parseBool(p, "spawn.tdst.support.hour.enabled", false);
        String tdstSupportSpec = p.getProperty("spawn.tdst.support.hours", "1,14");
        tdstSupportHours = "none".equalsIgnoreCase(tdstSupportSpec.trim())
                ? HourWindows.empty() : HourWindows.parse(tdstSupportSpec);

        jitterMini = parseRange(p, "spawn.jitter.mini", 80, 120);
        jitterNormal = parseRange(p, "spawn.jitter.normal", 80, 120);
        jitterElite = parseRange(p, "spawn.jitter.elite", 85, 115);
        jitterWorld = parseRange(p, "spawn.jitter.world", 90, 110);

        staggerMiniSec = parseRangeLong(p, "spawn.stagger.mini.sec", 5, 20);
        staggerNormalSec = parseRangeLong(p, "spawn.stagger.normal.sec", 10, 30);
        staggerEliteSec = parseRangeLong(p, "spawn.stagger.elite.sec", 15, 60);
        staggerWorldSec = parseRangeLong(p, "spawn.stagger.world.sec", 30, 120);

        brolyInitialCount = parseInt(p, "spawn.broly.initial.count", 75, 1, 100);
        brolyRestSec = parseInt(p, "spawn.broly.rest.sec", 180, 60, 3600);
        brolyMaxConcurrent = parseInt(p, "spawn.broly.max.concurrent", 75, 1, 100);
        brolyMaxPerMap = parseInt(p, "spawn.broly.max.per.map", 5, 1, 10);
        String brolyWeekdaySpec = p.getProperty("spawn.broly.hours.weekday", "all");
        brolyHoursWeekday = "all".equalsIgnoreCase(brolyWeekdaySpec.trim())
                ? HourWindows.allDay() : HourWindows.parse(brolyWeekdaySpec);
        String brolyWeekendSpec = p.getProperty("spawn.broly.hours.weekend", "all");
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
        superBrolyMinIntervalSec = parseInt(p, "spawn.superbroly.min.interval.sec", 180, 10, 86400);
        superBrolyMinBrolyActiveSec = parseInt(p, "spawn.superbroly.broly.min.active.sec", 60, 10, 3600);
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
        superBrolyTransformChanceMin = parseInt(p, "spawn.superbroly.transform.chance.min", 15, 1, 99);
        superBrolyTransformChanceMax = parseInt(p, "spawn.superbroly.transform.chance.max", 85, 1, 99);
        if (superBrolyTransformChanceMax < superBrolyTransformChanceMin) {
            superBrolyTransformChanceMax = superBrolyTransformChanceMin;
        }
        superBrolySpawnDelayMinSec = parseInt(p, "spawn.superbroly.spawn.delay.min.sec", 15, 5, 600);
        superBrolySpawnDelayMaxSec = parseInt(p, "spawn.superbroly.spawn.delay.max.sec", 60, 5, 900);
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
        superBrolyNaturalChancePercent = parseInt(p, "spawn.superbroly.natural.chance.percent", 15, 1, 100);
        superBrolyNaturalRollMinSec = parseInt(p, "spawn.superbroly.natural.roll.min.sec", 60, 10, 3600);
        superBrolyNaturalRollMaxSec = parseInt(p, "spawn.superbroly.natural.roll.max.sec", 180, 20, 7200);
        if (superBrolyNaturalRollMaxSec < superBrolyNaturalRollMinSec) {
            superBrolyNaturalRollMaxSec = superBrolyNaturalRollMinSec;
        }
        superBrolySlotMin = parseInt(p, "spawn.superbroly.slot.min", 1, 1, 4);
        superBrolySlotMax = parseInt(p, "spawn.superbroly.slot.max", 2, 1, 4);
        if (superBrolySlotMax < superBrolySlotMin) {
            superBrolySlotMax = superBrolySlotMin;
        }
        superBrolyIntervalMinSec = parseInt(p, "spawn.superbroly.interval.min.sec", 120, 10, 86400);
        superBrolyIntervalMaxSec = parseInt(p, "spawn.superbroly.interval.max.sec", 600, 30, 172800);
        if (superBrolyIntervalMaxSec < superBrolyIntervalMinSec) {
            superBrolyIntervalMaxSec = superBrolyIntervalMinSec;
        }
        superBrolyProfileMinSec = parseInt(p, "spawn.superbroly.profile.min.sec", 180, 30, 86400);
        superBrolyProfileMaxSec = parseInt(p, "spawn.superbroly.profile.max.sec", 600, 60, 172800);
        if (superBrolyProfileMaxSec < superBrolyProfileMinSec) {
            superBrolyProfileMaxSec = superBrolyProfileMinSec;
        }
        String superWeekdaySpec = p.getProperty("spawn.superbroly.hours.weekday", "all");
        superBrolyHoursWeekday = "all".equalsIgnoreCase(superWeekdaySpec.trim())
                ? HourWindows.allDay() : HourWindows.parse(superWeekdaySpec);
        String superWeekendSpec = p.getProperty("spawn.superbroly.hours.weekend", "all");
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

    public static boolean isSuperBrolyWindow(ZonedDateTime moment) {
        if (moment == null) return false;
        boolean weekend = isWeekend(moment);
        return superBrolyWindowsFor(weekend).contains(moment.getHour());
    }

    public static HourWindows tdstWindowsFor(boolean weekend) {
        return weekend ? tdstHoursWeekend : tdstHoursWeekday;
    }

    public static HourWindows tdstSupportHours() {
        return tdstSupportHours;
    }

    public static boolean isTDSTSupportHour(ZonedDateTime moment) {
        if (!tdstSupportHourEnabled || moment == null) {
            return false;
        }
        return tdstSupportHours.contains(moment.getHour());
    }

    public static boolean isTDSTWindow(ZonedDateTime moment) {
        if (moment == null) return false;
        boolean weekend = isWeekend(moment);
        return tdstWindowsFor(weekend).contains(moment.getHour());
    }

    public static HourWindows brolyWindowsFor(boolean weekend) {
        return weekend ? brolyHoursWeekend : brolyHoursWeekday;
    }

    /** Khung Broly/Super Broly: kiểm tra theo cấu hình giờ */
    public static boolean isBrolyFamilyWindow(ZonedDateTime moment) {
        if (moment == null) return false;
        boolean weekend = isWeekend(moment);
        return brolyWindowsFor(weekend).contains(moment.getHour());
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

    public static long minStaggerMs(BossSpawnTier tier) {
        return staggerMinMs(tier);
    }

    public static long maxStaggerMs(BossSpawnTier tier) {
        return staggerMaxMs(tier);
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
        eliteMinGapSec = 15;
        worldMinGapSec = 60;
        normalMinGapSec = 10;
        fairnessEnabled = true;
        fairnessEliteEnabled = true;
        populationAdaptiveEnabled = false;
        normalPlayersPerBoss = 6;
        elitePlayersPerBoss = 12;
        worldPlayersPerBoss = 25;
        brolyPlayersPerBoss = 5;
        superBrolyPlayersPerBoss = 20;
        superBrolyMinPlayers = 0;
        normalMinPlayers = 0;
        eliteMinPlayers = 0;
        worldMinPlayers = 0;
        brolyMinPlayers = 0;
        onlinePlayersCacheAt = 0L;
        onlinePlayersCache = 0;
        dailyBonusEnabled = true;
        dailyBonusDurationHours = 2;
        dailyBonusNormal = true;
        dailyBonusElite = true;
        softWindowEnabled = false;
        softWindowSpawnChance = 100;
        softWindowDeferMinSec = 10;
        softWindowDeferMaxSec = 30;
        windowAlignEnabled = false;
        intraWindowSpreadMinSec = 0;
        intraWindowSpreadMaxSec = 0;
        dailyBonusPreferGap = true;
        crossTierGapSec = 0;
        adaptiveGapEnabled = false;
        adaptiveGapPerReadySec = 0;
        waitBoostEnabled = true;
        waitBoostAfterSec = 60;
        waitBoostChance = 100;
        miniHours = HourWindows.allDay();
        normalWeekday = HourWindows.allDay();
        normalWeekend = HourWindows.allDay();
        eliteWeekday = HourWindows.allDay();
        eliteWeekend = HourWindows.allDay();
        worldWeekday = HourWindows.allDay();
        worldWeekend = HourWindows.allDay();
        tdstScheduled = true;
        tdstRestMinSec = 900;
        tdstRestMaxSec = 1200;
        tdstNmRestMinSec = 1500;
        tdstNmRestMaxSec = 2100;
        tdstHoursWeekday = HourWindows.allDay();
        tdstHoursWeekend = HourWindows.allDay();
        tdstSupportHourEnabled = false;
        tdstSupportHours = HourWindows.parse("1,14");
        jitterMini = new int[]{80, 120};
        jitterNormal = new int[]{80, 120};
        jitterElite = new int[]{85, 115};
        jitterWorld = new int[]{90, 110};
        staggerMiniSec = new long[]{5, 20};
        staggerNormalSec = new long[]{10, 30};
        staggerEliteSec = new long[]{15, 60};
        staggerWorldSec = new long[]{30, 120};
        brolyInitialCount = 75;
        brolyRestSec = 180;
        brolyMaxConcurrent = 75;
        brolyMaxPerMap = 5;
        brolyHoursWeekday = HourWindows.allDay();
        brolyHoursWeekend = HourWindows.allDay();
        superBrolyEnabled = true;
        superBrolyMaxConcurrent = 6;
        superBrolyConcurrentMin = 1;
        superBrolyConcurrentMax = 6;
        superBrolyTargetMin = 3;
        superBrolyMinIntervalSec = 180;
        superBrolyMinBrolyActiveSec = 60;
        superBrolyHpThreshold = 1_000_000;
        superBrolyHpThresholdMin = 1_500;
        superBrolyHpThresholdMax = 150_000;
        superBrolyDeathHpMin = 1_500L;
        superBrolyDeathHpMax = 100_000_000L;
        superBrolyTransformChanceMin = 15;
        superBrolyTransformChanceMax = 85;
        superBrolySpawnDelayMinSec = 15;
        superBrolySpawnDelayMaxSec = 60;
        superBrolyTimeSlots = 4;
        superBrolyMaxPerSlot = 1;
        superBrolyMaxPerMap = 5;
        superBrolyMapMin = 1;
        superBrolyMapMax = 5;
        superBrolyNaturalEnabled = true;
        superBrolyNaturalChancePercent = 15;
        superBrolyNaturalRollMinSec = 60;
        superBrolyNaturalRollMaxSec = 180;
        superBrolySlotMin = 1;
        superBrolySlotMax = 2;
        superBrolyIntervalMinSec = 120;
        superBrolyIntervalMaxSec = 600;
        superBrolyProfileMinSec = 180;
        superBrolyProfileMaxSec = 600;
        superBrolyHoursWeekday = HourWindows.allDay();
        superBrolyHoursWeekend = HourWindows.allDay();
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
            this.ranges = ranges == null ? java.util.Collections.emptyList() : ranges;
        }

        public static HourWindows empty() {
            return new HourWindows(java.util.Collections.emptyList());
        }

        public static HourWindows allDay() {
            return new HourWindows(List.of(new int[]{0, 23}));
        }

        public static HourWindows parse(String spec) {
            if (spec == null || spec.isBlank()) {
                return allDay();
            }
            if ("none".equalsIgnoreCase(spec.trim()) || "empty".equalsIgnoreCase(spec.trim())) {
                return empty();
            }
            if ("all".equalsIgnoreCase(spec.trim())) {
                return allDay();
            }
            List<int[]> list = new ArrayList<>();
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
                } else if (se.length == 1) {
                    int a = Integer.parseInt(se[0].trim());
                    list.add(new int[]{a, a});
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
