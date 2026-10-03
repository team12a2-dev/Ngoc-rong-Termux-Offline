package nro.models.boss.spawn;

import nro.models.utils.Util;

/**
 * Nhóm boss theo thời gian nghỉ cơ bản — quyết định độ lệch spawn và khung giờ.
 */
public enum BossSpawnTier {

    MINI(0, 119),
    NORMAL(120, 599),
    ELITE(600, 3599),
    WORLD(3600, Integer.MAX_VALUE);

    private final int minRestSec;
    private final int maxRestSec;

    BossSpawnTier(int minRestSec, int maxRestSec) {
        this.minRestSec = minRestSec;
        this.maxRestSec = maxRestSec;
    }

    public static BossSpawnTier fromRestSeconds(int secondsRest) {
        if (secondsRest < MINI.maxRestSec + 1) {
            return MINI;
        }
        if (secondsRest < NORMAL.maxRestSec + 1) {
            return NORMAL;
        }
        if (secondsRest < ELITE.maxRestSec + 1) {
            return ELITE;
        }
        return WORLD;
    }

    public long rollRestDelayMs(int baseSecondsRest) {
        int base = Math.max(baseSecondsRest, 5);
        int pct = rollJitterPercent();
        return base * 1000L * pct / 100;
    }

    /** Phân phối tam giác — tập trung quanh giữa, vẫn có đuôi ngẫu nhiên. */
    public int rollJitterPercent() {
        int min = BossSpawnConfig.jitterMin(this);
        int max = BossSpawnConfig.jitterMax(this);
        if (min >= max) {
            return min;
        }
        return (Util.nextInt(min, max) + Util.nextInt(min, max)) / 2;
    }

    public long rollInitialStaggerMs(int bossId) {
        long min = BossSpawnConfig.staggerMinMs(this);
        long max = BossSpawnConfig.staggerMaxMs(this);
        long spread = max - min;
        int slot = Math.abs(bossId) % 23;
        long offset = spread * slot / 23;
        long jitter = Util.nextInt(0, (int) Math.min(spread / 3, 180_000));
        long daySeed = java.time.ZonedDateTime.now(BossSpawnSchedule.ZONE_VN).toLocalDate().toEpochDay();
        long dayJitter = (Math.abs(bossId * 31 + (int) daySeed) % 100) * spread / 200;
        return min + offset + jitter + dayJitter;
    }
}
