package nro.models.services;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.Gson;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import nro.models.boss.Boss;
import nro.models.data.LocalManager;
import nro.models.database.PlayerDAO;
import nro.models.map.ItemMap;
import nro.models.event.DynamicEventManager;
import nro.models.item.Item;
import nro.models.player.Inventory;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.player.Player;
import nro.models.utils.Logger;

/**
 * Progress hooks for SQL-backed events. SQL remains the source of truth; no
 * progress is kept in Player or an in-memory event object.
 */
public final class EventProgressService {
    private static final EventProgressService INSTANCE = new EventProgressService();
    private static final Gson GSON = new Gson();

    private EventProgressService() {
    }

    public static EventProgressService gI() {
        return INSTANCE;
    }

    public void onItemPicked(Player player, ItemMap itemMap, int quantity) {
        if (player == null || itemMap == null || itemMap.itemTemplate == null || quantity <= 0) return;
        if (DynamicEventManager.gI().activeEvents().isEmpty()) return;
        record(player, "collect", itemMap.itemTemplate.id, quantity, mapId(itemMap), null);
    }

    public void onBossKilled(Boss boss, Player killer) {
        if (boss == null || killer == null || killer.isBot) return;
        if (DynamicEventManager.gI().activeEvents().isEmpty()) return;
        record(killer, "kill", boss.id, 1, boss.zone == null ? null : boss.zone.map.mapId, boss.id);
    }

    /**
     * The shared combine success effect is the reliable success boundary.
     * The target id is the combine type; custom event configs can match it.
     */
    public void onCraftSuccess(Player player, int combineType, int quantity) {
        if (player == null || quantity <= 0) return;
        if (DynamicEventManager.gI().activeEvents().isEmpty()) return;
        record(player, "craft", combineType, quantity, player.zone == null ? null : player.zone.map.mapId, Long.valueOf(combineType));
    }

    private int mapId(ItemMap itemMap) {
        return itemMap.zone == null || itemMap.zone.map == null ? -1 : itemMap.zone.map.mapId;
    }

    private void record(Player player, String objectiveType, long targetId, long amount, Integer mapId, Long secondaryTarget) {
        try (Connection con = LocalManager.getConnection()) {
            con.setAutoCommit(false);
            try {
                List<Objective> objectives = findObjectives(con, objectiveType, targetId, secondaryTarget, mapId, player);
                for (Objective objective : objectives) {
                    if (!eligible(objective, player)) continue;
                    applyProgress(con, objective, player, amount);
                }
                con.commit();
                deliverPendingRewards(player);
            } catch (Exception e) {
                con.rollback();
                Logger.warning("Không thể ghi tiến độ event SQL: " + e.getMessage() + "\n");
            } finally {
                con.setAutoCommit(true);
            }
        } catch (Exception e) {
            // Event tables may not exist until panel db:sync; gameplay must continue normally.
            Logger.warning("Event progress hook bỏ qua: " + e.getMessage() + "\n");
        }
    }

    private List<Objective> findObjectives(Connection con, String type, long targetId, Long secondaryTarget,
            Integer mapId, Player player) throws Exception {
        String sql = "SELECT e.id event_id, e.name event_name, e.once_per_player, e.min_power, e.vip_min, "
                + "e.require_clan, e.min_clan_members, o.id objective_id, o.required_count, o.target_id, o.map_ids "
                + "FROM panel_events e JOIN panel_event_objectives o ON o.event_id = e.id "
                + "WHERE e.enabled = 1 AND e.status IN ('scheduled','active') "
                + "AND (e.starts_at IS NULL OR e.starts_at <= NOW()) AND (e.ends_at IS NULL OR e.ends_at > NOW()) "
                + "AND o.objective_type = ? AND (o.target_id = ? OR o.target_id IS NULL)";
        List<Objective> result = new ArrayList<>();
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, type);
            ps.setLong(2, targetId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Objective objective = new Objective(rs.getLong("event_id"), rs.getString("event_name"),
                            rs.getInt("once_per_player") == 1, rs.getLong("min_power"), rs.getInt("vip_min"),
                            rs.getInt("require_clan") == 1, rs.getInt("min_clan_members"), rs.getLong("objective_id"),
                            rs.getLong("required_count"),                             rs.getObject("target_id") == null ? null : rs.getLong("target_id"),

                            rs.getString("map_ids"));
                    if (matchesTarget(objective, targetId, secondaryTarget) && matchesMap(objective.mapIds(), mapId)) {
                        result.add(objective);
                    }
                }
            }
        }
        return result;
    }

    private boolean matchesTarget(Objective objective, long targetId, Long secondaryTarget) {
        if (objective.targetId() == null) return true;
        if (objective.targetId().longValue() == targetId) return true;
        if (secondaryTarget != null && objective.targetId().equals(secondaryTarget)) return true;
        return false;
    }

    private boolean matchesMap(String mapIds, Integer mapId) {
        if (mapId == null || mapId < 0 || mapIds == null || mapIds.isBlank() || "[]".equals(mapIds.trim())) return true;
        try {
            JsonArray array = new JsonParser().parse(mapIds).getAsJsonArray();
            for (JsonElement element : array) if (element.getAsInt() == mapId) return true;
            return false;
        } catch (Exception ignored) {
            return true;
        }
    }

    private boolean eligible(Objective objective, Player player) {
        long power = player.nPoint == null ? 0 : player.nPoint.power;
        if (power < objective.minPower()) return false;
        if (Byte.toUnsignedInt(player.vip) < objective.vipMin()) return false;
        if (objective.requireClan() && player.clan == null) return false;
        if (objective.minClanMembers() > 0 && (player.clan == null || player.clan.members == null
                || player.clan.members.size() < objective.minClanMembers())) return false;
        return true;
    }

    private void applyProgress(Connection con, Objective objective, Player player, long amount) throws Exception {
        String select = "SELECT status, progress_json, points FROM panel_event_participants "
                + "WHERE event_id = ? AND player_id = ? FOR UPDATE";
        String status = null;
        String progressJson = "{}";
        long points = 0;
        try (PreparedStatement ps = con.prepareStatement(select)) {
            ps.setLong(1, objective.eventId());
            ps.setLong(2, player.id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    status = rs.getString("status");
                    progressJson = rs.getString("progress_json");
                    points = rs.getLong("points");
                }
            }
        }
        if ("completed".equals(status) && objective.oncePerPlayer()) return;

        JsonObject progress = parseObject(progressJson);
        String key = String.valueOf(objective.objectiveId());
        long current = progress.has(key) ? progress.get(key).getAsLong() : 0;
        long next = Math.min(objective.requiredCount(), current + amount);
        long delta = Math.max(0, next - current);
        if (delta <= 0) return;
        progress.addProperty(key, next);
        points += delta;
        boolean completed = next >= objective.requiredCount() && allObjectivesComplete(con, objective.eventId(), progress);
        String nextStatus = completed ? "completed" : "joined";
        String upsert = "INSERT INTO panel_event_participants (event_id, player_id, status, points, progress_json) VALUES (?, ?, ?, ?, ?) "
                + "ON DUPLICATE KEY UPDATE status = VALUES(status), points = points + VALUES(points), progress_json = VALUES(progress_json), updated_at = CURRENT_TIMESTAMP";
        try (PreparedStatement ps = con.prepareStatement(upsert)) {
            ps.setLong(1, objective.eventId());
            ps.setLong(2, player.id);
            ps.setString(3, nextStatus);
            ps.setLong(4, delta);
            ps.setString(5, GSON.toJson(progress));
            ps.executeUpdate();
        }
        if (completed) {
            queueRewards(con, objective.eventId(), player);
            try (PreparedStatement ps = con.prepareStatement("INSERT INTO panel_event_logs (event_id, action, payload) VALUES (?, 'completed', ?)") ) {
                JsonObject payload = new JsonObject();
                payload.addProperty("playerId", player.id);
                payload.addProperty("playerName", player.name);
                payload.addProperty("points", points);
                ps.setLong(1, objective.eventId());
                ps.setString(2, GSON.toJson(payload));
                ps.executeUpdate();
            }
            Service.gI().sendThongBao(player, "Bạn đã hoàn thành sự kiện: " + objective.eventName());
        }
    }

    private void queueRewards(Connection con, long eventId, Player player) throws Exception {
        String sql = "SELECT id, reward_type, temp_id, quantity_min, quantity_max, chance_percent, duration_days, rank_min, rank_max "
                + "FROM panel_event_rewards WHERE event_id = ? ORDER BY sort_order, id";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, eventId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    double chance = Math.max(0, Math.min(100, rs.getDouble("chance_percent")));
                    if (chance < 100 && ThreadLocalRandom.current().nextDouble(100) >= chance) continue;
                    long min = Math.max(0, rs.getLong("quantity_min"));
                    long max = Math.max(min, rs.getLong("quantity_max"));
                    long quantity = min == max ? min : ThreadLocalRandom.current().nextLong(min, max + 1);
                    if (quantity <= 0) continue;
                    try (PreparedStatement insert = con.prepareStatement(
                            "INSERT IGNORE INTO panel_event_reward_inbox (event_id, player_id, reward_id, reward_type, temp_id, quantity, duration_days) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
                        insert.setLong(1, eventId);
                        insert.setLong(2, player.id);
                        insert.setLong(3, rs.getLong("id"));
                        insert.setString(4, rs.getString("reward_type"));
                        if (rs.getObject("temp_id") == null) insert.setNull(5, java.sql.Types.INTEGER); else insert.setInt(5, rs.getInt("temp_id"));
                        insert.setLong(6, quantity);
                        if (rs.getObject("duration_days") == null) insert.setNull(7, java.sql.Types.INTEGER); else insert.setInt(7, rs.getInt("duration_days"));
                        insert.executeUpdate();
                    }
                }
            }
        }
    }

    /** Deliver pending rewards only after the progress transaction has committed. */
    public void deliverPendingRewards(Player player) {
        try (Connection con = LocalManager.getConnection()) {
            con.setAutoCommit(false);
            try (PreparedStatement ps = con.prepareStatement(
                    "SELECT id, reward_type, temp_id, quantity, duration_days FROM panel_event_reward_inbox WHERE player_id = ? AND status = 'pending' ORDER BY id FOR UPDATE")) {
                ps.setLong(1, player.id);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        long inboxId = rs.getLong("id");
                        String type = rs.getString("reward_type");
                        int tempId = rs.getInt("temp_id");
                        long quantity = rs.getLong("quantity");
                        String deliveryChannel = deliverReward(player, type, tempId, quantity);
                        if (deliveryChannel != null) {
                            PlayerDAO.updatePlayer(player);
                            try (PreparedStatement mark = con.prepareStatement(
                                    "UPDATE panel_event_reward_inbox SET status = 'delivered', delivery_channel = ?, delivered_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'")) {
                                mark.setString(1, deliveryChannel);
                                mark.setLong(2, inboxId);
                                mark.executeUpdate();
                            }
                        } else {
                            // The inbox row remains pending and is retried on the next gameplay hook/login.
                            break;
                        }
                    }
                }
            }
            con.commit();
        } catch (Exception e) {
            Logger.warning("Chưa thể phát phần thưởng event: " + e.getMessage() + "\n");
        }
    }

    private String deliverReward(Player player, String rewardType, int tempId, long quantity) {
        if ("gold".equalsIgnoreCase(rewardType) || "currency_gold".equalsIgnoreCase(rewardType)) {
            long next = Math.min(Inventory.LIMIT_GOLD, player.inventory.gold + quantity);
            if (next == player.inventory.gold) return null;
            player.inventory.gold = next;
            Service.gI().sendMoney(player);
            return "wallet";
        }
        if ("gem".equalsIgnoreCase(rewardType) || "currency_gem".equalsIgnoreCase(rewardType)) {
            long next = Math.min(Integer.MAX_VALUE, (long) player.inventory.gem + quantity);
            if (next == player.inventory.gem) return null;
            player.inventory.gem = (int) next;
            Service.gI().sendMoney(player);
            return "wallet";
        }
        if ("ruby".equalsIgnoreCase(rewardType) || "currency_ruby".equalsIgnoreCase(rewardType)) {
            long next = Math.min(Integer.MAX_VALUE, (long) player.inventory.ruby + quantity);
            if (next == player.inventory.ruby) return null;
            player.inventory.ruby = (int) next;
            Service.gI().sendMoney(player);
            return "wallet";
        }
        if (!"item".equalsIgnoreCase(rewardType)) return null;
        if (tempId < 0 || quantity > Integer.MAX_VALUE) return null;
        Item item = ItemService.gI().createNewItem((short) tempId, (int) quantity);
        if (InventoryService.gI().addItemBag(player, item)) {
            InventoryService.gI().sendItemBags(player);
            return "bag";
        }
        // itemsBox is the game's persistent fallback chest when the bag is full.
        if (InventoryService.gI().addItemBox(player, item)) {
            Service.gI().sendThongBao(player, "Túi đầy, phần thưởng event đã chuyển vào rương đồ.");
            return "box";
        }
        return null;
    }

    private boolean allObjectivesComplete(Connection con, long eventId, JsonObject progress) throws Exception {
        try (PreparedStatement ps = con.prepareStatement("SELECT id, required_count FROM panel_event_objectives WHERE event_id = ?")) {
            ps.setLong(1, eventId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String key = String.valueOf(rs.getLong("id"));
                    if (!progress.has(key) || progress.get(key).getAsLong() < rs.getLong("required_count")) return false;
                }
            }
        }
        return true;
    }

    private JsonObject parseObject(String json) {
        try {
            JsonElement element = new JsonParser().parse(json == null || json.isBlank() ? "{}" : json);
            return element.isJsonObject() ? element.getAsJsonObject() : new JsonObject();
        } catch (Exception ignored) {
            return new JsonObject();
        }
    }

    private record Objective(long eventId, String eventName, boolean oncePerPlayer, long minPower, int vipMin,
            boolean requireClan, int minClanMembers, long objectiveId, long requiredCount,             Long targetId, String mapIds) {

    }
}
