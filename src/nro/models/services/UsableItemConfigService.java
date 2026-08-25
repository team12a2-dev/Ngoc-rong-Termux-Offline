package nro.models.services;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import nro.models.data.LocalManager;
import nro.models.item.Item;
import nro.models.player.Player;

/**
 * Mapping item_template -> behavior cho các item dùng được do panel quản lý.
 * Item mới dùng cùng state/effect với item bổ huyết hiện có, không cần hardcode ID trong UseItem.
 */
public final class UsableItemConfigService {

    private static final UsableItemConfigService INSTANCE = new UsableItemConfigService();
    private static final String BO_HUYET = "bo_huyet";
    private static final String BO_HUYET_2 = "bo_huyet_2";

    private volatile Map<Integer, String> behaviors = Collections.emptyMap();
    private volatile boolean loaded;

    private UsableItemConfigService() {
    }

    public static UsableItemConfigService gI() {
        return INSTANCE;
    }

    public synchronized int reload() {
        Map<Integer, String> next = new LinkedHashMap<>();
        try (Connection con = LocalManager.getConnection();
             PreparedStatement stmt = con.prepareStatement(
                     "SELECT template_id, behavior_key FROM panel_usable_items WHERE enabled = 1 ORDER BY template_id");
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                String behavior = normalizeBehavior(rs.getString("behavior_key"));
                if (behavior != null) {
                    next.put(rs.getInt("template_id"), behavior);
                }
            }
            behaviors = Collections.unmodifiableMap(next);
            loaded = true;
            System.out.println("[NRO][USABLE] Loaded " + next.size() + " usable item mapping(s)");
            return next.size();
        } catch (Exception e) {
            // Không làm hỏng server cũ nếu panel schema chưa được đồng bộ.
            if (!loaded) behaviors = Collections.emptyMap();
            loaded = true;
            System.err.println("[NRO][USABLE] Reload failed: " + e.getMessage());
            return behaviors.size();
        }
    }

    /**
     * Trả về true nếu item đã được panel đăng ký và đã xử lý thành công hoặc bị từ chối do xung đột buff.
     */
    public boolean use(Player player, Item item) {
        if (player == null || item == null || !item.isNotNullItem() || item.template == null) return false;
        if (!loaded) reload();
        String behavior = behaviors.get(item.template.id);
        if (behavior == null) return false;
        if (item.template.type != 29) {
            Service.gI().sendThongBao(player, "Item bổ trợ phải có type 29");
            return true;
        }

        boolean activated;
        if (BO_HUYET.equals(behavior)) {
            if (player.itemTime.isUseBoHuyet2) {
                Service.gI().sendThongBao(player, "Chỉ có thể sử dụng cùng lúc 1 vật phẩm bổ huyết cùng loại");
                return true;
            }
            player.itemTime.lastTimeBoHuyet = System.currentTimeMillis();
            player.itemTime.isUseBoHuyet = true;
            activated = true;
        } else if (BO_HUYET_2.equals(behavior)) {
            if (player.itemTime.isUseBoHuyet) {
                Service.gI().sendThongBao(player, "Chỉ có thể sử dụng cùng lúc 1 vật phẩm bổ huyết cùng loại");
                return true;
            }
            player.itemTime.lastTimeBoHuyet2 = System.currentTimeMillis();
            player.itemTime.isUseBoHuyet2 = true;
            activated = true;
        } else {
            return false;
        }

        if (activated) {
            Service.gI().point(player);
            ItemTimeService.gI().sendAllItemTime(player);
            InventoryService.gI().subQuantityItemsBag(player, item, 1);
            InventoryService.gI().sendItemBags(player);
        }
        return true;
    }

    private static String normalizeBehavior(String behavior) {
        if (behavior == null) return null;
        String value = behavior.trim().toLowerCase();
        return BO_HUYET.equals(value) || BO_HUYET_2.equals(value) ? value : null;
    }
}
