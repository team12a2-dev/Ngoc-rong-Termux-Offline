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
import nro.models.boss.Boss;
import nro.models.data.LocalManager;
import nro.models.map.ItemMap;
import nro.models.event.DynamicEventManager;
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
