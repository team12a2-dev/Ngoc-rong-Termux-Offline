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
import nro.models.player.Player;

/**
 * Runtime mapping item_template type 29 -> option chỉ số tạm thời do panel quản lý.
 * Không gán behavior cố định; hiệu ứng được tạo từ các ItemOption đã cấu hình.
 */
public final class UsableItemConfigService {

    private static final UsableItemConfigService INSTANCE = new UsableItemConfigService();
    private static final long MAX_DURATION_MILLIS = 30L * 24 * 60 * 60 * 1000;

    private volatile Map<Integer, UsableItemConfig> configs = Collections.emptyMap();
    private volatile boolean loaded;

    private UsableItemConfigService() {
    }

    public static UsableItemConfigService gI() {
        return INSTANCE;
    }

    public synchronized int reload() {
        Map<Integer, UsableItemConfig> next = new LinkedHashMap<>();
        try (Connection con = LocalManager.getConnection();
             PreparedStatement stmt = con.prepareStatement(
                     "SELECT u.template_id, u.duration_seconds, i.icon_id, "
                     + "o.option_id, o.option_param "
                     + "FROM panel_usable_items u "
                     + "JOIN item_template i ON i.id = u.template_id AND i.type = 29 "
                     + "LEFT JOIN panel_usable_item_options o "
                     + "ON o.usable_item_id = u.id AND o.enabled = 1 "
                     + "WHERE u.enabled = 1 "
                     + "ORDER BY u.template_id, o.sort_order, o.id")) {
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    int templateId = rs.getInt("template_id");
                    UsableItemConfig config = next.get(templateId);
                    if (config == null) {
                        config = new UsableItemConfig(rsInt(rs, "duration_seconds"));
                        next.put(templateId, config);
                    }
                    int optionId = rs.getInt("option_id");
                    if (!rs.wasNull() && optionId >= 0) {
                        config.options.add(new Item.ItemOption(optionId, rs.getInt("option_param")));
                    }
                }
            }
            next.values().removeIf(config -> config.options.isEmpty());
            for (UsableItemConfig config : next.values()) {
                config.options = List.copyOf(config.options);
            }
            configs = Collections.unmodifiableMap(next);
            loaded = true;
            System.out.println("[NRO][USABLE] Loaded " + next.size() + " option item mapping(s)");
            return next.size();
        } catch (Exception e) {
            // Không làm hỏng server nếu panel schema chưa được đồng bộ.
            if (!loaded) {
                configs = Collections.emptyMap();
            }
            loaded = true;
            System.err.println("[NRO][USABLE] Reload failed: " + e.getMessage());
            return configs.size();
        }
    }

    /**
     * Trả về true nếu item type 29 đã được panel đăng ký, kể cả trường hợp
     * cấu hình chưa có option và vì vậy bị từ chối mà không tiêu hao item.
     */
    public boolean use(Player player, Item item) {
        if (player == null || item == null || !item.isNotNullItem() || item.template == null) {
            return false;
        }
        if (!loaded) {
            reload();
        }
        UsableItemConfig config = configs.get((int) item.template.id);
        if (config == null) {
            return false;
        }
        if (item.template.type != 29) {
            Service.gI().sendThongBao(player, "Item bổ trợ phải có type 29");
            return true;
        }
        itemTimeReplace(player, config, item);
        Service.gI().point(player);
        ItemTimeService.gI().sendAllItemTime(player);
        InventoryService.gI().subQuantityItemsBag(player, item, 1);
        InventoryService.gI().sendItemBags(player);
        return true;
    }

    private void itemTimeReplace(Player player, UsableItemConfig config, Item item) {
        player.itemTime.isUseUsableItem = true;
        player.itemTime.lastTimeUseUsableItem = System.currentTimeMillis();
        player.itemTime.timeLengthUsableItem = config.durationMillis;
        player.itemTime.usableItemIcon = item.template.iconID;
        player.itemTime.usableItemTemplateId = item.template.id;
        player.itemTime.usableItemOptions.clear();
        for (Item.ItemOption option : config.options) {
            player.itemTime.usableItemOptions.add(new Item.ItemOption(option));
        }
    }

    private static int rsInt(ResultSet rs, String column) {
        try {
            return rs.getInt(column);
        } catch (Exception e) {
            return 0;
        }
    }

    private static final class UsableItemConfig {
        private final long durationMillis;
        private List<Item.ItemOption> options = new ArrayList<>();

        private UsableItemConfig(int durationSeconds) {
            long millis = Math.max(1L, durationSeconds) * 1000L;
            this.durationMillis = Math.min(millis, MAX_DURATION_MILLIS);
        }
    }
}
