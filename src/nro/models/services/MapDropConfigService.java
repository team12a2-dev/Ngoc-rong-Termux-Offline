package nro.models.services;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import nro.models.data.LocalManager;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.utils.Util;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

/**
 * Cấu hình drop theo map được panel ghi vào panel_map_drop_*.
 * Dữ liệu được cache trong JVM và chỉ đọc lại khi Panel Agent gọi reload.
 */
public final class MapDropConfigService {

    private static final MapDropConfigService INSTANCE = new MapDropConfigService();
    private volatile Map<Integer, DropRule> rules = Collections.emptyMap();
    private volatile boolean loaded;

    private MapDropConfigService() {
    }

    public static MapDropConfigService gI() {
        return INSTANCE;
    }

    public synchronized int reload() {
        Map<Integer, DropRule> next = new LinkedHashMap<>();
        try (Connection con = LocalManager.getConnection();
             PreparedStatement ruleStmt = con.prepareStatement(
                     "SELECT id, map_id, enabled, gold_enabled, gold_chance_percent, gold_min, gold_max, "
                             + "activation_enabled, activation_chance_percent "
                             + "FROM panel_map_drop_configs WHERE server_id = 1 ORDER BY map_id");
             ResultSet ruleRs = ruleStmt.executeQuery()) {
            while (ruleRs.next()) {
                DropRule rule = new DropRule(
                        ruleRs.getInt("id"),
                        ruleRs.getInt("map_id"),
                        ruleRs.getInt("enabled") == 1,
                        ruleRs.getInt("gold_enabled") == 1,
                        ruleRs.getDouble("gold_chance_percent"),
                        ruleRs.getInt("gold_min"),
                        ruleRs.getInt("gold_max"),
                        ruleRs.getInt("activation_enabled") == 1,
                        ruleRs.getDouble("activation_chance_percent")
                );
                loadItems(con, rule);
                next.put(rule.mapId, rule);
            }
            rules = Collections.unmodifiableMap(next);
            loaded = true;
            System.out.println("[NRO][DROP] Loaded " + next.size() + " map drop rule(s)");
            return next.size();
        } catch (Exception e) {
            // Giữ cache cũ khi reload lỗi để không làm thay đổi drop giữa chừng.
            loaded = true;
            System.err.println("[NRO][DROP] Reload failed: " + e.getMessage());
            return rules.size();
        }
    }

    private void loadItems(Connection con, DropRule rule) throws Exception {
        try (PreparedStatement itemStmt = con.prepareStatement(
                "SELECT temp_id, mob_temp_id, enabled, chance_percent, quantity_min, quantity_max, options_json "
                        + "FROM panel_map_drop_items WHERE config_id = ? ORDER BY id")) {
            itemStmt.setInt(1, rule.id);
            try (ResultSet rs = itemStmt.executeQuery()) {
                while (rs.next()) {
                    rule.items.add(new ItemDrop(
                            rs.getInt("temp_id"),
                            rs.getInt("mob_temp_id"),
                            rs.getInt("enabled") == 1,
                            rs.getDouble("chance_percent"),
                            rs.getInt("quantity_min"),
                            rs.getInt("quantity_max"),
                            parseOptions(rs.getString("options_json"))
                    ));
                }
            }
        }
    }

    private static List<Item.ItemOption> parseOptions(String raw) {
        if (raw == null || raw.isBlank()) return new ArrayList<>();
        Object parsed = JSONValue.parse(raw);
        if (!(parsed instanceof JSONArray array)) return new ArrayList<>();
        List<Item.ItemOption> result = new ArrayList<>();
        for (Object value : array) {
            if (!(value instanceof JSONObject option)) continue;
            int id = number(option.get("id"), -1);
            int param = number(option.get("param"), 0);
            if (id >= 0) result.add(new Item.ItemOption(id, param));
        }
        return result;
    }

    private static int number(Object value, int fallback) {
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ignored) {
            return fallback;
        }
    }

    public DropRule getRule(int mapId) {
        if (!loaded) reload();
        return rules.get(mapId);
    }

    public List<ItemMap> rollItems(DropRule rule, Zone zone, Player player, int mobTempId, int x, int yEnd) {
        List<ItemMap> drops = new ArrayList<>();
        if (rule == null || !rule.enabled || player == null || zone == null) return drops;
        for (ItemDrop drop : rule.items) {
            if (!drop.enabled || (drop.mobTempId >= 0 && drop.mobTempId != mobTempId)
                    || !roll(drop.chancePercent)) continue;
            int quantity = randomQuantity(drop.quantityMin, drop.quantityMax);
            try {
                ItemMap item = new ItemMap(zone, drop.tempId, quantity, x, yEnd, player.id);
                if (item.itemTemplate == null) continue;
                for (Item.ItemOption option : drop.options) {
                    item.options.add(new Item.ItemOption(option.optionTemplate.id, option.param));
                }
                drops.add(item);
            } catch (Exception e) {
                System.err.println("[NRO][DROP] Skip invalid item " + drop.tempId + ": " + e.getMessage());
            }
        }
        return drops;
    }

    public ItemMap rollGold(DropRule rule, Zone zone, Player player, int x, int yEnd) {
        if (rule == null || !rule.enabled || !rule.goldEnabled || !roll(rule.goldChancePercent)) return null;
        int min = Math.max(0, rule.goldMin);
        int max = Math.max(min, rule.goldMax);
        int quantity = randomQuantity(min, max);
        if (quantity <= 0) return null;
        int itemId = quantity < 10000 ? 188 : quantity < 100000 ? 189 : 190;
        return new ItemMap(zone, itemId, quantity, x, yEnd, player.id);
    }

    public ItemMap rollActivation(DropRule rule, Zone zone, Player player, int x, int yEnd) {
        if (rule == null || !rule.enabled || !rule.activationEnabled || !roll(rule.activationChancePercent)) return null;
        short tempId = (short) ItemService.gI().randTempItemKichHoat(player.gender);
        ItemMap item = new ItemMap(zone, tempId, 1, x, yEnd, player.id);
        if (item.itemTemplate == null) return null;
        List<Item.ItemOption> shopOptions = ItemService.gI().getListOptionItemShop(tempId);
        if (!shopOptions.isEmpty()) item.options = shopOptions;
        int[] randomOptions = ItemService.gI().randOptionItemKichHoat(player.gender);
        for (int optionId : randomOptions) {
            if (optionId > 0) item.options.add(new Item.ItemOption(optionId, 0));
        }
        item.options.add(new Item.ItemOption(30, 0));
        return item;
    }

    private static boolean roll(double percent) {
        if (percent <= 0) return false;
        if (percent >= 100) return true;
        long basisPoints = Math.round(percent * 100.0);
        return Util.isTrue(basisPoints, 10000);
    }

    private static int randomQuantity(int min, int max) {
        int safeMin = Math.max(0, min);
        int safeMax = Math.max(safeMin, max);
        if (safeMin == safeMax) return safeMin;
        return (int) Util.nextLong((long) safeMin, (long) safeMax);
    }

    public static final class DropRule {
        public final int id;
        public final int mapId;
        public final boolean enabled;
        public final boolean goldEnabled;
        public final double goldChancePercent;
        public final int goldMin;
        public final int goldMax;
        public final boolean activationEnabled;
        public final double activationChancePercent;
        public final List<ItemDrop> items = new ArrayList<>();

        private DropRule(int id, int mapId, boolean enabled, boolean goldEnabled,
                         double goldChancePercent, int goldMin, int goldMax,
                         boolean activationEnabled, double activationChancePercent) {
            this.id = id;
            this.mapId = mapId;
            this.enabled = enabled;
            this.goldEnabled = goldEnabled;
            this.goldChancePercent = goldChancePercent;
            this.goldMin = goldMin;
            this.goldMax = Math.max(goldMin, goldMax);
            this.activationEnabled = activationEnabled;
            this.activationChancePercent = activationChancePercent;
        }
    }

    public static final class ItemDrop {
        public final int tempId;
        public final int mobTempId;
        public final boolean enabled;
        public final double chancePercent;
        public final int quantityMin;
        public final int quantityMax;
        public final List<Item.ItemOption> options;

        private ItemDrop(int tempId, int mobTempId, boolean enabled, double chancePercent,
                         int quantityMin, int quantityMax, List<Item.ItemOption> options) {
            this.tempId = tempId;
            this.mobTempId = mobTempId;
            this.enabled = enabled;
            this.chancePercent = chancePercent;
            this.quantityMin = Math.max(1, quantityMin);
            this.quantityMax = Math.max(this.quantityMin, quantityMax);
            this.options = options;
        }
    }
}
