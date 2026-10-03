package nro.models.services;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import nro.models.data.LocalManager;
import nro.models.item.Item;
import nro.models.item.Item.ItemOption;
import nro.models.player.Player;
import nro.models.utils.Logger;

/**
 * Service quản lý cấu hình Khai Mở Server & Đua Top từ Web Panel (bảng panel_server_launches).
 * Cung cấp các cờ kiểm tra thời gian thực cho 10 quy tắc/giới hạn và quà tặng NPC Chi Chi.
 */
public final class ServerLaunchConfigService {

    private static final ServerLaunchConfigService INSTANCE = new ServerLaunchConfigService();
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private volatile boolean loaded = false;
    private volatile boolean isActive = true;
    private volatile String serverName = "VŨ TRỤ 15";
    private volatile String opensAt = "2026-08-28 10:00:00";
    private volatile String topRaceEndsAt = "2026-09-07 23:00:00";
    private volatile String restrictionsEndAt = "2026-10-31 23:59:59";
    private volatile String status = "active";

    // 1. Quà NPC Chi Chi
    private volatile boolean npcGiftEnabled = true;
    private volatile int npcGiftNpcId = 81;
    private volatile String npcGiftName = "Ván Bay MT (Vĩnh Viễn)";
    private volatile int npcGiftItemTemplateId = 1984; // 1984: MT Gaming / Ván Bay MT (Type 23)
    private volatile Integer npcGiftDurationDays = null;
    private volatile String npcGiftExpiresAt = "2026-10-31 23:59:59";

    // 2. 10 Quy tắc & Giới hạn
    private volatile boolean restrictionsEnabled = true;
    private final Map<String, RestrictionRule> rules = new HashMap<>();

    public static class RestrictionRule {
        public boolean enabled;
        public String title;
        public String desc;
        public String until;
        public String startDate;

        public RestrictionRule(boolean enabled, String title, String desc, String until, String startDate) {
            this.enabled = enabled;
            this.title = title;
            this.desc = desc;
            this.until = until;
            this.startDate = startDate;
        }

        public boolean isEffectActive() {
            if (!enabled) {
                return false;
            }
            if (until != null && !until.trim().isEmpty()) {
                LocalDateTime untilTime = parseDateTimeSafe(until);
                if (untilTime != null && LocalDateTime.now().isAfter(untilTime)) {
                    return false;
                }
            }
            return true;
        }

        public boolean isScheduleLocked() {
            if (!enabled) {
                return false;
            }
            if (startDate != null && !startDate.trim().isEmpty()) {
                LocalDateTime startTime = parseDateTimeSafe(startDate);
                if (startTime != null && LocalDateTime.now().isBefore(startTime)) {
                    return true; // Vẫn đang bị khóa do chưa tới ngày mở
                }
            }
            return false;
        }
    }

    public static LocalDateTime parseDateTimeSafe(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String clean = input.trim().replace("T", " ");
        if (clean.length() == 10) {
            clean += " 23:59:59";
        } else if (clean.length() == 16) {
            clean += ":00";
        } else if (clean.length() > 19) {
            clean = clean.substring(0, 19);
        }
        try {
            return LocalDateTime.parse(clean, DATE_TIME_FORMATTER);
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(clean.replace(" ", "T"));
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private ServerLaunchConfigService() {
    }

    public static ServerLaunchConfigService gI() {
        return INSTANCE;
    }

    /**
     * Bản cài Termux cũ có thể đã import sql/ngocrong.sql trước khi bảng này được thêm.
     * Tạo bổ sung theo kiểu idempotent để không cần reimport hoặc xóa dữ liệu người chơi.
     */
    private void ensureLaunchTable(Connection con) throws Exception {
        String ddl = "CREATE TABLE IF NOT EXISTS panel_server_launches ("
                + "id INT AUTO_INCREMENT PRIMARY KEY,"
                + "server_id INT NOT NULL DEFAULT 1,"
                + "server_name VARCHAR(120) NOT NULL DEFAULT 'VŨ TRỤ 15',"
                + "title VARCHAR(255) NOT NULL DEFAULT 'KHAI MỞ VŨ TRỤ 15',"
                + "description TEXT NULL,"
                + "opens_at DATETIME NOT NULL DEFAULT '2026-08-28 10:00:00',"
                + "top_race_ends_at DATETIME NOT NULL DEFAULT '2026-09-07 23:00:00',"
                + "restrictions_end_at DATETIME NOT NULL DEFAULT '2026-10-31 23:59:59',"
                + "status VARCHAR(20) NOT NULL DEFAULT 'active',"
                + "is_active TINYINT(1) NOT NULL DEFAULT 1,"
                + "npc_gift_enabled TINYINT(1) NOT NULL DEFAULT 1,"
                + "npc_gift_config JSON NULL,"
                + "first_recharge_enabled TINYINT(1) NOT NULL DEFAULT 1,"
                + "first_recharge_config JSON NULL,"
                + "race_enabled TINYINT(1) NOT NULL DEFAULT 1,"
                + "race_config JSON NULL,"
                + "restrictions_enabled TINYINT(1) NOT NULL DEFAULT 1,"
                + "restrictions_config JSON NULL,"
                + "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
                + "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,"
                + "UNIQUE KEY uq_launch_server (server_id)"
                + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        try (PreparedStatement schema = con.prepareStatement(ddl)) {
            schema.executeUpdate();
        }
    }

    public synchronized boolean reload() {
        try (Connection con = LocalManager.getConnection();
             PreparedStatement ignored = con.prepareStatement("SELECT 1")) {
            ensureLaunchTable(con);
        } catch (Exception e) {
            Logger.logException(ServerLaunchConfigService.class, e, "Lỗi tạo schema panel_server_launches");
            return false;
        }
        try (Connection con = LocalManager.getConnection();
             PreparedStatement ps = con.prepareStatement(
                     "SELECT * FROM panel_server_launches WHERE server_id = 1 LIMIT 1");
             ResultSet rs = ps.executeQuery()) {

            if (rs.next()) {
                this.serverName = rs.getString("server_name");
                this.opensAt = rs.getString("opens_at");
                this.topRaceEndsAt = rs.getString("top_race_ends_at");
                this.restrictionsEndAt = rs.getString("restrictions_end_at");
                this.status = rs.getString("status");
                this.isActive = rs.getInt("is_active") == 1;

                this.npcGiftEnabled = rs.getInt("npc_gift_enabled") == 1;
                parseNpcGiftConfig(rs.getString("npc_gift_config"));

                this.restrictionsEnabled = rs.getInt("restrictions_enabled") == 1;
                parseRestrictionsConfig(rs.getString("restrictions_config"));

                this.loaded = true;
                Logger.log("Đã tải cấu hình Khai Mở Máy Chủ [" + serverName + "] - Trạng thái: " + status);
                return true;
            } else {
                Logger.log("Chưa có bảng ghi panel_server_launches cho server_id=1");
            }
        } catch (Exception e) {
            Logger.logException(ServerLaunchConfigService.class, e, "Lỗi reload ServerLaunchConfigService");
        }
        return false;
    }

    private void parseNpcGiftConfig(String jsonStr) {
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            return;
        }
        try {
            JsonElement el = new JsonParser().parse(jsonStr);
            if (el != null && el.isJsonObject()) {
                JsonObject obj = el.getAsJsonObject();
                if (obj.has("npc_id")) this.npcGiftNpcId = obj.get("npc_id").getAsInt();
                if (obj.has("gift_name")) this.npcGiftName = obj.get("gift_name").getAsString();
                if (obj.has("item_template_id")) this.npcGiftItemTemplateId = obj.get("item_template_id").getAsInt();
                if (obj.has("duration_days") && !obj.get("duration_days").isJsonNull()) {
                    this.npcGiftDurationDays = obj.get("duration_days").getAsInt();
                } else {
                    this.npcGiftDurationDays = null;
                }
                if (obj.has("expires_at") && !obj.get("expires_at").isJsonNull()) {
                    this.npcGiftExpiresAt = obj.get("expires_at").getAsString();
                }
            }
        } catch (Exception e) {
            Logger.logException(ServerLaunchConfigService.class, e, "Lỗi parse npc_gift_config");
        }
    }

    private void parseRestrictionsConfig(String jsonStr) {
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            return;
        }
        try {
            JsonElement el = new JsonParser().parse(jsonStr);
            if (el != null && el.isJsonObject()) {
                JsonObject root = el.getAsJsonObject();
                rules.clear();
                for (String key : root.keySet()) {
                    JsonElement subEl = root.get(key);
                    if (subEl != null && subEl.isJsonObject()) {
                        JsonObject sub = subEl.getAsJsonObject();
                        boolean en = sub.has("enabled") && sub.get("enabled").getAsBoolean();
                        String title = sub.has("title") ? sub.get("title").getAsString() : "";
                        String desc = sub.has("desc") ? sub.get("desc").getAsString() : "";
                        String until = sub.has("until") && !sub.get("until").isJsonNull() ? sub.get("until").getAsString() : null;
                        String startDate = sub.has("start_date") && !sub.get("start_date").isJsonNull() ? sub.get("start_date").getAsString() : null;
                        rules.put(key, new RestrictionRule(en, title, desc, until, startDate));
                    }
                }
            }
        } catch (Exception e) {
            Logger.logException(ServerLaunchConfigService.class, e, "Lỗi parse restrictions_config");
        }
    }

    private boolean checkRuleActive(String key) {
        if (!loaded) {
            reload();
        }
        if (!isActive || !restrictionsEnabled) {
            return false;
        }
        RestrictionRule rule = rules.get(key);
        return rule != null && rule.isEffectActive();
    }

    // 1. Khóa Đục Lỗ & Ép Sao Pha Lê
    public boolean isBlockSocketAndStarCombine() {
        return checkRuleActive("block_socket_and_star_combine");
    }

    // 2. Santa Không Bán Thỏi Vàng
    public boolean isSantaNoGoldBars() {
        return checkRuleActive("santa_no_gold_bars");
    }

    // 3. Không Bán Phiếu Sao Vàng May Mắn
    public boolean isSantaNoLuckyStarTickets() {
        return checkRuleActive("santa_no_lucky_star_tickets");
    }

    // 4. Giới Hạn / Khóa Giao Dịch Vàng
    public boolean isRestrictGoldTrading() {
        return checkRuleActive("restrict_gold_trading");
    }

    // 5. Giải Ngọc Rồng Sao Đen Mở Từ Ngày Cụ Thể (start_date)
    public boolean isBlackBallWarScheduleLocked() {
        if (!loaded) {
            reload();
        }
        if (!isActive || !restrictionsEnabled) {
            return false;
        }
        RestrictionRule rule = rules.get("black_ball_war_schedule");
        return rule != null && rule.isScheduleLocked();
    }

    public String getBlackBallWarStartDate() {
        RestrictionRule rule = rules.get("black_ball_war_schedule");
        return (rule != null && rule.startDate != null) ? rule.startDate : "07/09/2026";
    }

    // 6. Bỏ Yêu Cầu Sức Mạnh 40 Tỷ Vào NR Sao Đen
    public boolean isBlackBallWarNo40bLimit() {
        return checkRuleActive("black_ball_war_no_40b_limit");
    }

    // 7. Cấm Ước Rồng Thiêng Ban Sức Mạnh
    public boolean isBlockShenronPowerWish() {
        return checkRuleActive("block_shenron_power_wish");
    }

    // 8. Vô Hiệu Hóa Bùa x3, x4 TNSM
    public boolean isBlockTnsmCharmsX3X4() {
        return checkRuleActive("block_tnsm_charms_x3_x4");
    }

    // 9. Tắt Vòng Quay Thường NPC Thượng Đế
    public boolean isDisableGodNormalSpin() {
        return checkRuleActive("disable_god_normal_spin");
    }

    // 10. Không Rơi Đồ Sao Pha Lê
    public boolean isBlockStarCrystalItemDrops() {
        return checkRuleActive("block_star_crystal_item_drops");
    }

    // --- QUÀ NPC CHI CHI ---
    public boolean isNpcGiftChiChiActive() {
        if (!loaded) {
            reload();
        }
        if (!isActive || !npcGiftEnabled) {
            return false;
        }
        if (npcGiftExpiresAt != null && !npcGiftExpiresAt.trim().isEmpty()) {
            LocalDateTime expire = parseDateTimeSafe(npcGiftExpiresAt);
            if (expire != null && LocalDateTime.now().isAfter(expire)) {
                return false;
            }
        }
        return true;
    }

    public String getNpcGiftName() {
        return npcGiftName;
    }

    public int getNpcGiftItemTemplateId() {
        return npcGiftItemTemplateId;
    }

    public Integer getNpcGiftDurationDays() {
        return npcGiftDurationDays;
    }

    /**
     * Trao quà Chi Chi cho người chơi (Kiểm tra lưu trữ qua bảng panel_server_launch_claimed_gifts)
     */
    public boolean claimChiChiGift(Player player) {
        if (player == null) return false;
        if (!isNpcGiftChiChiActive()) {
            Service.gI().sendThongBao(player, "Sự kiện tặng quà Khai Mở Máy Chủ đã kết thúc!");
            return false;
        }

        try (Connection con = LocalManager.getConnection()) {
            // Đảm bảo bảng lưu lịch sử nhận quà tồn tại
            try (PreparedStatement createTbl = con.prepareStatement(
                    "CREATE TABLE IF NOT EXISTS panel_server_launch_claimed_gifts ("
                    + "player_id INT PRIMARY KEY, "
                    + "gift_name VARCHAR(100), "
                    + "claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP"
                    + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")) {
                createTbl.executeUpdate();
            }

            // Kiểm tra đã nhận chưa
            try (PreparedStatement check = con.prepareStatement(
                    "SELECT player_id FROM panel_server_launch_claimed_gifts WHERE player_id = ?")) {
                check.setInt(1, (int) player.id);
                try (ResultSet rs = check.executeQuery()) {
                    if (rs.next()) {
                        Service.gI().sendThongBao(player, "Bạn đã nhận quà Khai Mở Máy Chủ này rồi!");
                        return false;
                    }
                }
            }

            // Kiểm tra hành trang
            if (InventoryService.gI().getCountEmptyBag(player) < 1) {
                Service.gI().sendThongBao(player, "Hành trang của bạn không đủ chỗ trống để nhận quà!");
                return false;
            }

            // Tạo item quà tặng (Default 1984 Ván bay MT)
            int itemTemplateId = npcGiftItemTemplateId > 0 ? npcGiftItemTemplateId : 1984;
            Item item = ItemService.gI().createNewItem((short) itemTemplateId);
            if (item == null || item.template == null) {
                Service.gI().sendThongBao(player, "Không tìm thấy vật phẩm quà tặng trong cơ sở dữ liệu!");
                return false;
            }

            // Thiết lập đầy đủ các option cho Ván Bay MT (ID 1984 / Type 23,24) theo đúng hình ảnh yêu cầu
            item.itemOptions.clear();
            if (npcGiftDurationDays != null && npcGiftDurationDays > 0) {
                item.itemOptions.add(new ItemOption(93, npcGiftDurationDays)); // HSD ngày
            } else {
                item.itemOptions.add(new ItemOption(73, 0)); // Vĩnh viễn
            }
            item.itemOptions.add(new ItemOption(50, 8));   // Sức đánh+8%
            item.itemOptions.add(new ItemOption(77, 8));   // HP+8%
            item.itemOptions.add(new ItemOption(103, 8));  // KI +8%
            item.itemOptions.add(new ItemOption(94, 2));   // Giảm 2% sát thương
            item.itemOptions.add(new ItemOption(5, 3));    // +3% sức đánh chí mạng
            item.itemOptions.add(new ItemOption(162, 2));  // Cute hồi 2% KI/s bản thân và xung quanh
            item.itemOptions.add(new ItemOption(84, 0));   // Dùng để bay không tốn KI
            item.itemOptions.add(new ItemOption(30, 0));   // Không giao dịch
            item.itemOptions.add(new ItemOption(100, 1));  // +1% vàng rơi
            item.itemOptions.add(new ItemOption(14, 1));   // Chí mạng+1%
            item.itemOptions.add(new ItemOption(95, 2));   // Biến 2% tấn công thành HP

            InventoryService.gI().addItemBag(player, item);
            InventoryService.gI().sendItemBags(player);

            // Ghi nhận đã nhận vào database
            try (PreparedStatement insert = con.prepareStatement(
                    "INSERT INTO panel_server_launch_claimed_gifts (player_id, gift_name) VALUES (?, ?)")) {
                insert.setInt(1, (int) player.id);
                insert.setString(2, npcGiftName != null ? npcGiftName : item.template.name);
                insert.executeUpdate();
            }

            String giftDisplayName = npcGiftName != null && !npcGiftName.isBlank() ? npcGiftName : item.template.name;
            Service.gI().sendThongBaoOK(player, "Chúc mừng bạn đã nhận thành công Quà Khai Mở Server:\n" + giftDisplayName + "!");
            return true;

        } catch (Exception e) {
            Logger.logException(ServerLaunchConfigService.class, e, "Lỗi claimChiChiGift");
            Service.gI().sendThongBao(player, "Có lỗi xảy ra khi nhận quà. Vui lòng thử lại sau!");
            return false;
        }
    }
}
