package nro.models.services;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import nro.models.data.LocalManager;
import nro.models.item.Item;
import nro.models.player.Player;
import nro.models.utils.Logger;

/** SQL-backed configuration and draw engine for the Thượng Đế lucky round. */
public final class GodSpinConfigService {
    private static final GodSpinConfigService INSTANCE = new GodSpinConfigService();
    private static final int DEFAULT_SERVER_ID = 1;

    private GodSpinConfigService() {
    }

    public static GodSpinConfigService gI() {
        return INSTANCE;
    }

    /**
     * Returns null when no SQL configuration is active so the legacy reward
     * table remains a safe compatibility fallback during migration.
     */
    public List<Item> roll(Player player, int count, boolean vip) {
        if (player == null || count <= 0) return new ArrayList<>();
        boolean configured = false;
        try (Connection con = LocalManager.getConnection()) {
            con.setAutoCommit(false);
            Config config = loadConfig(con);
            configured = config != null;
            if (config == null) {
                con.rollback();
                return null;
            }
            ensureStatsRow(con, config.id(), player.id);
            PlayerStats stats = lockStats(con, config.id(), player.id);
            int allowed = Math.min(count, Math.max(0, config.dailyLimit() - stats.dailySpins()));
            if (allowed < count) {
                con.rollback();
                Service.gI().sendThongBao(player, "Bạn đã đạt giới hạn lượt quay hôm nay.");
                return new ArrayList<>();
            }
            List<SpinItem> pool = loadItems(con, config.id(), vip);
            if (pool.isEmpty()) {
                con.rollback();
                Service.gI().sendThongBao(player, "Vòng quay chưa có item hợp lệ.");
                return new ArrayList<>();
            }
            Map<Long, Integer> wins = loadWinCounts(con, config.id(), player.id);
            int capacity = 0;
            for (SpinItem item : pool) {
                capacity += item.maxWins() == null ? count : Math.max(0, item.maxWins() - wins.getOrDefault(item.id(), 0));
                if (capacity >= count) break;
            }
            if (capacity < count) {
                con.rollback();
                Service.gI().sendThongBao(player, "Pool phần thưởng hiện không còn đủ lượt hợp lệ.");
                return new ArrayList<>();
            }
            List<Item> result = new ArrayList<>();
            for (int i = 0; i < allowed; i++) {
                List<SpinItem> eligible = new ArrayList<>();
                for (SpinItem item : pool) {
                    int currentWins = wins.getOrDefault(item.id(), 0);
                    if (item.maxWins() == null || currentWins < item.maxWins()) eligible.add(item);
                }
                SpinItem selected = choose(eligible);
                if (selected == null) break;
                result.add(createItem(selected));
                wins.merge(selected.id(), 1, Integer::sum);
                logDraw(con, config.id(), player.id, selected);
            }
            updateStats(con, config.id(), player.id, stats, result.size());
            con.commit();
            return result;
        } catch (Exception e) {
            Logger.warning("GodSpin SQL error: " + e.getMessage() + "\\n");
            return configured ? new ArrayList<>() : null;
        }
    }

    public boolean isActiveConfig() {
        try (Connection con = LocalManager.getConnection()) {
            return loadConfig(con) != null;
        } catch (Exception e) {
            return false;
        }
    }

    public Integer configuredCost(byte type) {
        try (Connection con = LocalManager.getConnection()) {
            Config config = loadConfig(con);
            if (config == null) return null;
            if (type == 7 && "gold".equals(config.currencyMode())) return -1;
            if (type == 0 && "gem".equals(config.currencyMode())) return -1;
            if (type == 1) return config.costTicket() > 0 && config.ticketTempId() != null ? config.costTicket() : -1;
            return type == 7 ? config.costGem() : config.costGold();
        } catch (Exception e) {
            Logger.warning("Không thể đọc giá GodSpin SQL: " + e.getMessage() + "\\n");
            return null;
        }
    }

    public Integer configuredTicketTempId() {
        try (Connection con = LocalManager.getConnection()) {
            Config config = loadConfig(con);
            return config == null ? null : config.ticketTempId();
        } catch (Exception e) {
            Logger.warning("Không thể đọc vé GodSpin SQL: " + e.getMessage() + "\\n");
            return null;
        }
    }

    public Map<String, Object> reload() {
        try (Connection con = LocalManager.getConnection()) {
            Config config = loadConfig(con);
            if (config == null) return Map.of("ok", true, "configured", false, "items", 0);
            int items = loadItems(con, config.id(), true).size();
            return Map.of("ok", true, "configured", true, "configId", config.id(), "items", items);
        } catch (Exception e) {
            Logger.warning("Không thể reload GodSpin SQL: " + e.getMessage() + "\\n");
            return Map.of("ok", false, "error", e.getMessage() == null ? "unknown" : e.getMessage());
        }
    }

    public List<Integer> previewIconIds() {
        List<Integer> ids = new ArrayList<>();
        try (Connection con = LocalManager.getConnection()) {
            Config config = loadConfig(con);
            if (config == null) return ids;
            for (SpinItem item : loadItems(con, config.id(), true)) {
                if (ids.size() >= 7) break;
                try {
                    ids.add((int) ItemService.gI().getTemplate(item.tempId()).iconID);
                } catch (Exception ignored) {
                    ids.add(419);
                }
            }
        } catch (Exception e) {
            Logger.warning("Không thể đọc preview GodSpin SQL: " + e.getMessage() + "\n");
        }
        return ids;
    }

    private Config loadConfig(Connection con) throws Exception {
        String sql = "SELECT id, daily_limit, currency_mode, cost_gem, cost_gold, cost_ticket, ticket_temp_id FROM panel_god_spin_configs WHERE server_id = ? AND enabled = 1 "
                + "AND status IN ('scheduled','active') AND (starts_at IS NULL OR starts_at <= NOW()) "
                + "AND (ends_at IS NULL OR ends_at > NOW()) ORDER BY id DESC LIMIT 1";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, DEFAULT_SERVER_ID);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? new Config(rs.getLong("id"), Math.max(1, rs.getInt("daily_limit")), rs.getString("currency_mode"),
                        Math.max(0, rs.getInt("cost_gem")), Math.max(0, rs.getInt("cost_gold")), Math.max(0, rs.getInt("cost_ticket")),
                        rs.getObject("ticket_temp_id") == null ? null : rs.getInt("ticket_temp_id")) : null;
            }
        }
    }

    private List<SpinItem> loadItems(Connection con, long configId, boolean vip) throws Exception {
        List<SpinItem> result = new ArrayList<>();
        String sql = "SELECT id, temp_id, weight, quantity_min, quantity_max, options_json, duration_days, vip_only, max_wins "
                + "FROM panel_god_spin_items WHERE config_id = ? AND enabled = 1 AND (vip_only = 0 OR ? = 1) "
                + "ORDER BY sort_order, id";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, configId);
            ps.setBoolean(2, vip);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    result.add(new SpinItem(rs.getLong("id"), rs.getInt("temp_id"), Math.max(1, rs.getInt("weight")),
                            Math.max(1, rs.getLong("quantity_min")), Math.max(1, rs.getLong("quantity_max")),
                            rs.getString("options_json"), rs.getObject("duration_days") == null ? null : rs.getInt("duration_days"),
                            rs.getObject("max_wins") == null ? null : Math.max(0, rs.getInt("max_wins"))));
                }
            }
        }
        return result;
    }

    private void ensureStatsRow(Connection con, long configId, long playerId) throws Exception {
        try (PreparedStatement ps = con.prepareStatement(
                "INSERT IGNORE INTO panel_god_spin_player_stats (config_id, player_id, daily_date, daily_spins, total_spins) VALUES (?, ?, CURRENT_DATE, 0, 0)")) {
            ps.setLong(1, configId);
            ps.setLong(2, playerId);
            ps.executeUpdate();
        }
    }

    private Map<Long, Integer> loadWinCounts(Connection con, long configId, long playerId) throws Exception {
        Map<Long, Integer> counts = new HashMap<>();
        String sql = "SELECT item_id, COUNT(*) AS wins FROM panel_god_spin_logs WHERE config_id = ? AND player_id = ? AND item_id IS NOT NULL GROUP BY item_id";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, configId);
            ps.setLong(2, playerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) counts.put(rs.getLong("item_id"), rs.getInt("wins"));
            }
        }
        return counts;
    }

    private void logDraw(Connection con, long configId, long playerId, SpinItem item) throws Exception {
        String sql = "INSERT INTO panel_god_spin_logs (config_id, player_id, item_id, temp_id, spin_count, payload) VALUES (?, ?, ?, ?, 1, ?)";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, configId);
            ps.setLong(2, playerId);
            ps.setLong(3, item.id());
            ps.setInt(4, item.tempId());
            ps.setString(5, "{\"weight\":" + item.weight() + "}");
            ps.executeUpdate();
        }
    }

    private PlayerStats lockStats(Connection con, long configId, long playerId) throws Exception {
        String select = "SELECT daily_date, daily_spins, total_spins FROM panel_god_spin_player_stats WHERE config_id = ? AND player_id = ? FOR UPDATE";
        try (PreparedStatement ps = con.prepareStatement(select)) {
            ps.setLong(1, configId);
            ps.setLong(2, playerId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    LocalDate date = rs.getDate("daily_date") == null ? LocalDate.now() : rs.getDate("daily_date").toLocalDate();
                    int daily = date.equals(LocalDate.now()) ? Math.max(0, rs.getInt("daily_spins")) : 0;
                    return new PlayerStats(date, daily, Math.max(0, rs.getInt("total_spins")), true);
                }
            }
        }
        return new PlayerStats(LocalDate.now(), 0, 0, false);
    }

    private void updateStats(Connection con, long configId, long playerId, PlayerStats stats, int delta) throws Exception {
        String sql = "INSERT INTO panel_god_spin_player_stats (config_id, player_id, daily_date, daily_spins, total_spins) VALUES (?, ?, CURRENT_DATE, ?, ?) "
                + "ON DUPLICATE KEY UPDATE daily_date = CURRENT_DATE, daily_spins = VALUES(daily_spins), total_spins = VALUES(total_spins)";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, configId);
            ps.setLong(2, playerId);
            ps.setInt(3, stats.dailySpins() + delta);
            ps.setInt(4, stats.totalSpins() + delta);
            ps.executeUpdate();
        }
    }

    private SpinItem choose(List<SpinItem> pool) {
        long total = 0;
        for (SpinItem item : pool) total += item.weight();
        if (total <= 0) return null;
        long cursor = ThreadLocalRandom.current().nextLong(total);
        for (SpinItem item : pool) {
            cursor -= item.weight();
            if (cursor < 0) return item;
        }
        return pool.get(pool.size() - 1);
    }

    private Item createItem(SpinItem source) {
        int quantity = source.quantityMin() == source.quantityMax() ? (int) source.quantityMin()
                : (int) ThreadLocalRandom.current().nextLong(source.quantityMin(), source.quantityMax() + 1);
        Item item = ItemService.gI().createNewItem((short) source.tempId(), quantity);
        item.itemOptions.clear();
        try {
            if (source.optionsJson() != null && !source.optionsJson().isBlank()) {
                JsonArray options = new JsonParser().parse(source.optionsJson()).getAsJsonArray();
                for (JsonElement element : options) {
                    if (!element.isJsonObject()) continue;
                    int id = element.getAsJsonObject().has("id") ? element.getAsJsonObject().get("id").getAsInt() : -1;
                    if (id < 0) continue;
                    int param;
                    if (element.getAsJsonObject().has("param")) param = element.getAsJsonObject().get("param").getAsInt();
                    else {
                        int min = element.getAsJsonObject().has("min") ? element.getAsJsonObject().get("min").getAsInt() : 0;
                        int max = element.getAsJsonObject().has("max") ? element.getAsJsonObject().get("max").getAsInt() : min;
                        param = min == max ? min : ThreadLocalRandom.current().nextInt(Math.min(min, max), Math.max(min, max) + 1);
                    }
                    item.itemOptions.add(new Item.ItemOption(id, param));
                }
            }
        } catch (Exception e) {
            Logger.warning("Option GodSpin không hợp lệ item " + source.tempId() + ": " + e.getMessage() + "\n");
        }
        if (source.durationDays() != null && source.durationDays() > 0 && item.itemOptions.stream().noneMatch(option -> option.optionTemplate != null && option.optionTemplate.id == 93)) {
            item.itemOptions.add(new Item.ItemOption(93, source.durationDays()));
        }
        item.content = item.getContent();
        item.info = item.getInfo();
        return item;
    }

    private record Config(long id, int dailyLimit, String currencyMode, int costGem, int costGold, int costTicket, Integer ticketTempId) { }
    private record PlayerStats(LocalDate date, int dailySpins, int totalSpins, boolean existing) { }
    private record SpinItem(long id, int tempId, int weight, long quantityMin, long quantityMax, String optionsJson, Integer durationDays, Integer maxWins) { }
}
