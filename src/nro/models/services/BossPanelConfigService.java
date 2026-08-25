package nro.models.services;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import nro.models.boss.Boss;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.item.Item;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.utils.Logger;
import nro.models.utils.Util;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

/** Runtime bridge for the structured Boss Management panel. */
public final class BossPanelConfigService {

    private static final Path CONFIG_FILE = Path.of("boss_panel.json");
    private static final BossPanelConfigService INSTANCE = new BossPanelConfigService();
    private volatile Map<Integer, BossRule> rules = Collections.emptyMap();
    private volatile boolean loaded;

    private BossPanelConfigService() {
    }

    public static BossPanelConfigService gI() {
        return INSTANCE;
    }

    public synchronized int reload() {
        if (!Files.exists(CONFIG_FILE)) {
            rules = Collections.emptyMap();
            loaded = true;
            return 0;
        }
        try {
            Object parsed = JSONValue.parse(Files.readString(CONFIG_FILE, StandardCharsets.UTF_8));
            Map<Integer, BossRule> next = new LinkedHashMap<>();
            if (parsed instanceof JSONObject root && root.get("rules") instanceof JSONArray array) {
                for (Object value : array) {
                    if (!(value instanceof JSONObject raw)) continue;
                    BossRule rule = BossRule.from(raw);
                    if (rule != null) next.put(rule.bossId, rule);
                }
            }
            rules = Collections.unmodifiableMap(next);
            loaded = true;
            Logger.success("Boss panel: loaded " + next.size() + " rule(s)\n");
            return next.size();
        } catch (Exception e) {
            Logger.error("Boss panel: reload failed: " + e.getMessage() + "\n");
            return rules.size();
        }
    }

    private void ensureLoaded() {
        if (!loaded) reload();
    }

    private BossRule ruleFor(Boss boss) {
        ensureLoaded();
        return boss == null ? null : rules.get((int) boss.id);
    }

    public boolean hasEnabledRule(Boss boss) {
        BossRule rule = ruleFor(boss);
        return rule != null && rule.enabled;
    }

    public boolean hasAvailableConfiguredZone(Boss boss) {
        return pickConfiguredZone(boss) != null;
    }

    public Zone pickConfiguredZone(Boss boss) {
        BossRule rule = ruleFor(boss);
        if (rule == null || !rule.enabled || rule.mapIds.isEmpty()) return null;
        List<Integer> maps = new ArrayList<>(rule.mapIds);
        Collections.shuffle(maps);
        for (int mapId : maps) {
            nro.models.map.Map map = nro.models.map.service.MapService.gI().getMapById(mapId);
            if (map == null || map.zones == null || map.zones.isEmpty()) continue;
            List<Zone> candidates = new ArrayList<>();
            int from = Math.max(0, rule.zoneMin);
            int to = Math.min(map.zones.size() - 1, rule.zoneMax);
            for (int zoneId = from; zoneId <= to; zoneId++) {
                Zone zone = map.zones.get(zoneId);
                if (zone != null && zone.getBosses().isEmpty()) candidates.add(zone);
            }
            if (candidates.isEmpty()) continue;
            if ("fixed".equals(rule.zonePolicy)) return candidates.get(0);
            return candidates.get(Util.nextInt(0, candidates.size() - 1));
        }
        return null;
    }

    public boolean passesActiveLimit(Boss boss) {
        BossRule rule = ruleFor(boss);
        if (rule == null || !rule.enabled || rule.maxActive <= 0) return true;
        int active = 0;
        for (Boss other : BossManager.getAllBosses()) {
            if (other == null || other.id != boss.id || other.getParentBoss() != null || other.isDie()
                    || other.zone == null || other.bossStatus == null
                    || other.bossStatus.name().equals("REST")
                    || other.bossStatus.name().equals("LEAVE_MAP")) continue;
            active++;
        }
        return active < rule.maxActive;
    }

    public boolean passesSpawnChance(Boss boss) {
        BossRule rule = ruleFor(boss);
        if (rule == null || !rule.enabled || rule.spawnChancePercent >= 100) return true;
        if (rule.spawnChancePercent <= 0) return false;
        long now = System.currentTimeMillis();
        if (boss.getPanelSpawnRetryAt() > now) return false;
        if (roll(rule.spawnChancePercent)) {
            boss.setPanelSpawnRetryAt(0L);
            return true;
        }
        int retryMin = Math.max(30, rule.respawnMinSec > 0 ? Math.min(rule.respawnMinSec, 300) : 60);
        int retryMax = Math.max(retryMin, rule.respawnMaxSec > 0 ? Math.min(rule.respawnMaxSec, 900) : 180);
        boss.setPanelSpawnRetryAt(now + (long) Util.nextInt(retryMin, retryMax) * 1000L);
        return false;
    }

    public long overrideRestDelayMs(Boss boss, long fallbackMs) {
        BossRule rule = ruleFor(boss);
        if (rule == null || !rule.enabled || rule.respawnMinSec <= 0 || rule.respawnMaxSec <= 0) return fallbackMs;
        int min = Math.max(1, rule.respawnMinSec);
        int max = Math.max(min, rule.respawnMaxSec);
        return (long) Util.nextInt(min, max) * 1000L;
    }

    public void rollDrops(Boss boss, Player killer) {
        BossRule rule = ruleFor(boss);
        if (rule == null || !rule.enabled || killer == null || killer.isBot || boss.zone == null) return;
        int x = boss.location != null ? boss.location.x : 300;
        int y = boss.location != null ? boss.location.y : 312;
        for (DropRule drop : rule.drops) {
            if (!drop.enabled || !roll(drop.chancePercent)) continue;
            int quantity = drop.quantityMin == drop.quantityMax
                    ? drop.quantityMin : Util.nextInt(drop.quantityMin, drop.quantityMax);
            try {
                nro.models.map.ItemMap item = new nro.models.map.ItemMap(boss.zone, drop.tempId, quantity, x, y, killer.id);
                if (item.itemTemplate == null) continue;
                for (ItemOption option : drop.options) {
                    item.options.add(new Item.ItemOption(option.id, option.param));
                }
                Service.gI().dropItemMap(boss.zone, item);
            } catch (Exception e) {
                Logger.error("Boss panel drop skip item " + drop.tempId + ": " + e.getMessage() + "\n");
            }
        }
    }

    private static boolean roll(double percent) {
        if (percent <= 0) return false;
        if (percent >= 100) return true;
        return Util.isTrue(Math.round(percent * 100.0), 10000);
    }

    private static int number(Object value, int fallback) {
        if (value instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(value)); } catch (Exception ignored) { return fallback; }
    }

    private static double percent(Object value, double fallback) {
        if (value instanceof Number n) return Math.max(0, Math.min(100, n.doubleValue()));
        try { return Math.max(0, Math.min(100, Double.parseDouble(String.valueOf(value)))); } catch (Exception ignored) { return fallback; }
    }

    private static boolean bool(Object value, boolean fallback) {
        if (value == null) return fallback;
        return value instanceof Boolean b ? b : "true".equalsIgnoreCase(String.valueOf(value)) || "1".equals(String.valueOf(value));
    }

    private static List<Integer> intList(Object value) {
        List<Integer> result = new ArrayList<>();
        if (value instanceof JSONArray array) {
            for (Object item : array) {
                int id = number(item, -1);
                if (id >= 0 && id <= 9999 && !result.contains(id)) result.add(id);
            }
        }
        return result;
    }

    private static List<ItemOption> optionList(Object value) {
        List<ItemOption> result = new ArrayList<>();
        if (value instanceof JSONArray array) {
            for (Object item : array) {
                if (!(item instanceof JSONObject raw)) continue;
                int id = number(raw.get("id"), -1);
                if (id >= 0) result.add(new ItemOption(id, number(raw.get("param"), 0)));
            }
        }
        return result;
    }

    private record ItemOption(int id, int param) {
    }

    private static final class DropRule {
        final int tempId;
        final boolean enabled;
        final double chancePercent;
        final int quantityMin;
        final int quantityMax;
        final List<ItemOption> options;

        private DropRule(int tempId, boolean enabled, double chancePercent, int quantityMin, int quantityMax, List<ItemOption> options) {
            this.tempId = tempId;
            this.enabled = enabled;
            this.chancePercent = chancePercent;
            this.quantityMin = Math.max(1, quantityMin);
            this.quantityMax = Math.max(this.quantityMin, quantityMax);
            this.options = options;
        }

        static DropRule from(Object value) {
            if (!(value instanceof JSONObject raw)) return null;
            int tempId = number(raw.get("tempId"), number(raw.get("temp_id"), -1));
            if (tempId < 0) return null;
            return new DropRule(tempId, bool(raw.get("enabled"), true), percent(raw.get("chancePercent"), 100),
                    number(raw.get("quantityMin"), 1), number(raw.get("quantityMax"), 1), optionList(raw.get("options")));
        }
    }

    private static final class BossRule {
        final int bossId;
        final boolean enabled;
        final List<Integer> mapIds;
        final String zonePolicy;
        final int zoneMin;
        final int zoneMax;
        final double spawnChancePercent;
        final int respawnMinSec;
        final int respawnMaxSec;
        final int maxActive;
        final List<DropRule> drops;

        private BossRule(int bossId, boolean enabled, List<Integer> mapIds, String zonePolicy, int zoneMin, int zoneMax,
                         double spawnChancePercent, int respawnMinSec, int respawnMaxSec, int maxActive, List<DropRule> drops) {
            this.bossId = bossId;
            this.enabled = enabled;
            this.mapIds = mapIds;
            this.zonePolicy = "fixed".equals(zonePolicy) ? "fixed" : "random";
            this.zoneMin = Math.max(0, zoneMin);
            this.zoneMax = Math.max(this.zoneMin, zoneMax);
            this.spawnChancePercent = percent(spawnChancePercent, 100);
            this.respawnMinSec = Math.max(0, respawnMinSec);
            this.respawnMaxSec = Math.max(this.respawnMinSec, respawnMaxSec);
            this.maxActive = Math.max(0, maxActive);
            this.drops = drops;
        }

        static BossRule from(JSONObject raw) {
            int bossId = number(raw.get("bossId"), number(raw.get("boss_id"), Integer.MIN_VALUE));
            if (bossId == Integer.MIN_VALUE) return null;
            List<DropRule> drops = new ArrayList<>();
            if (raw.get("drops") instanceof JSONArray array) {
                for (Object item : array) {
                    DropRule drop = DropRule.from(item);
                    if (drop != null) drops.add(drop);
                }
            }
            return new BossRule(bossId, bool(raw.get("enabled"), true), intList(raw.get("mapIds")),
                    String.valueOf(raw.getOrDefault("zonePolicy", "random")), number(raw.get("zoneMin"), 2),
                    number(raw.get("zoneMax"), 99), percent(raw.get("spawnChancePercent"), 100),
                    number(raw.get("respawnMinSec"), 0), number(raw.get("respawnMaxSec"), 0),
                    number(raw.get("maxActive"), 1), drops);
        }
    }
}
