package nro.models.event;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import nro.models.data.LocalManager;
import nro.models.utils.Logger;

/** SQL is the source of truth. The map below is only a disposable runtime snapshot. */
public final class DynamicEventManager {
    private static final DynamicEventManager INSTANCE = new DynamicEventManager();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "DynamicEvent-SQL-Sync");
        t.setDaemon(true);
        return t;
    });
    private volatile Map<String, EventRuntime> activeEvents = Collections.emptyMap();
    private boolean initialized;

    public static DynamicEventManager gI() {
        return INSTANCE;
    }

    private DynamicEventManager() {
    }

    public synchronized void init() {
        if (initialized) return;
        initialized = true;
        reload();
        scheduler.scheduleWithFixedDelay(this::reload, 30, 30, TimeUnit.SECONDS);
    }

    public synchronized Map<String, Object> reload() {
        Map<String, EventRuntime> next = new LinkedHashMap<>();
        String sql = "SELECT id, event_key, name, event_type, status, enabled, starts_at, ends_at, config_json "
                + "FROM panel_events WHERE enabled = 1 AND status IN ('scheduled','active') "
                + "AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at > NOW()) "
                + "ORDER BY id";
        try (Connection con = LocalManager.getConnection(); PreparedStatement ps = con.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                EventRuntime event = new EventRuntime(rs.getLong("id"), rs.getString("event_key"), rs.getString("name"),
                        rs.getString("event_type"), rs.getString("status"), rs.getInt("enabled") == 1,
                        rs.getTimestamp("starts_at"), rs.getTimestamp("ends_at"), rs.getString("config_json"));
                next.put(event.eventKey(), event);
            }
            activeEvents = Collections.unmodifiableMap(next);
            Logger.success("Dynamic events synced from SQL: " + next.size() + "\n");
            return Map.of("ok", true, "active", next.size());
        } catch (Exception e) {
            Logger.warning("Dynamic events chưa được đồng bộ: " + e.getMessage() + "\n");
            return Map.of("ok", false, "active", activeEvents.size(), "error", String.valueOf(e.getMessage()));
        }
    }

    public List<EventRuntime> activeEvents() {
        return new ArrayList<>(activeEvents.values());
    }

    public EventRuntime find(String eventKey) {
        return activeEvents.get(eventKey);
    }

    public record EventRuntime(long id, String eventKey, String name, String eventType, String status,
            boolean enabled, java.sql.Timestamp startsAt, java.sql.Timestamp endsAt, String configJson) {
        public boolean isOpen() {
            Instant now = Instant.now();
            return enabled && (startsAt == null || startsAt.toInstant().compareTo(now) <= 0)
                    && (endsAt == null || endsAt.toInstant().compareTo(now) > 0);
        }
    }
}
