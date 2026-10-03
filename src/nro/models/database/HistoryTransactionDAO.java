package nro.models.database;
import nro.models.data.LocalManager;
import nro.models.item.Item;
import nro.models.player.Player;
import nro.models.utils.TimeUtil;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

public class HistoryTransactionDAO {

    /**
     * Đảm bảo schema cũ có cột trạng thái dùng bởi màn hình kiểm tra giao dịch.
     * ALTER thất bại khi cột đã tồn tại hoặc tài khoản không có quyền đổi schema
     * được bỏ qua để không làm dừng server khởi động.
     */
    public static void ensureStatusColumn() {
        try {
            LocalManager.executeUpdate(
                    "ALTER TABLE history_transaction ADD COLUMN status TINYINT NOT NULL DEFAULT 1");
        } catch (Exception ex) {
            // Idempotent: schema đã có cột hoặc DB chưa sẵn sàng.
        }
    }

    public static void insert(Player pl1, Player pl2,
            int goldP1, int goldP2, List<Item> itemP1, List<Item> itemP2,
            List<Item> bag1Before, List<Item> bag2Before,
            List<Item> bag1After,
            List<Item> bag2After,
            long gold1Before, long gold2Before, long gold1After, long gold2After) {

        String player1 = pl1.name + " (" + pl1.id + ")";
        String player2 = pl2.name + " (" + pl2.id + ")";
        String itemPlayer1 = "Gold: " + goldP1 + ", ";
        String itemPlayer2 = "Gold: " + goldP2 + ", ";
        List<Item> doGD1 = new ArrayList<>();
        List<Item> doGD2 = new ArrayList<>();
        for (Item item : itemP1) {
            if (item.isNotNullItem() && doGD1.stream().noneMatch(item1 -> item1.template.id == item.template.id)) {
                doGD1.add(item);
            } else if (item.isNotNullItem()) {
                doGD1.stream().filter(item1 -> item1.template.id == item.template.id).findFirst().get().quantityGD += item.quantityGD;
            }
        }
        for (Item item : itemP2) {
            if (item.isNotNullItem() && doGD2.stream().noneMatch(item1 -> item1.template.id == item.template.id)) {
                doGD2.add(item);
            } else if (item.isNotNullItem()) {
                doGD2.stream().filter(item1 -> item1.template.id == item.template.id).findFirst().get().quantityGD += item.quantityGD;
            }
        }

        for (Item item : doGD1) {
            if (item.isNotNullItem()) {
                itemPlayer1 += item.template.name + " (x" + item.quantityGD + "),";
//                System.out.println(item.template.name + " (x" + item.quantityGD + "),");
            }
        }
        for (Item item : doGD2) {
            if (item.isNotNullItem()) {
                itemPlayer2 += item.template.name + " (x" + item.quantityGD + "),";
//                System.out.println(item.template.name + " (x" + item.quantityGD + "),");
            }
        }
        String beforeTran1 = "";
        String beforeTran2 = "";
        for (Item item : bag1Before) {
            if (item.isNotNullItem()) {
                beforeTran1 += item.template.name + " (x" + item.quantity + "),";
            }
        }
        for (Item item : bag2Before) {
            if (item.isNotNullItem()) {
                beforeTran2 += item.template.name + " (x" + item.quantity + "),";
            }
        }
        String afterTran1 = "";
        String afterTran2 = "";
        for (Item item : bag1After) {
            if (item.isNotNullItem()) {
                afterTran1 += item.template.name + " (x" + item.quantity + "),";
            }
        }
        for (Item item : bag2After) {
            if (item.isNotNullItem()) {
                afterTran2 += item.template.name + " (x" + item.quantity + "),";
            }
        }
        try {
            LocalManager.executeUpdate("INSERT INTO history_transaction (player_1, player_2, item_player_1, item_player_2, bag_1_before_tran, bag_2_before_tran, bag_1_after_tran, bag_2_after_tran, time_tran) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", player1, player2, itemPlayer1, itemPlayer2, beforeTran1, beforeTran2, afterTran1, afterTran2, new Timestamp(System.currentTimeMillis()));
        } catch (Exception ex) {
        }
    }

    public static void deleteHistory() {
        PreparedStatement ps = null;
        try (Connection con = LocalManager.getConnection();) {
            ps = con.prepareStatement("delete from history_transaction where time_tran < '"
                    + TimeUtil.getTimeBeforeCurrent(3 * 24 * 60 * 60 * 1000, "yyyy-MM-dd") + "'");
            ps.executeUpdate();
            ps.close();
        } catch (Exception e) {
        } finally {
            try {
                ps.close();
            } catch (SQLException ex) {
            }
        }
    }

    public static boolean hasTransaction(Player player) {
        String query = "SELECT 1 FROM history_transaction WHERE player_1 LIKE ? OR player_2 LIKE ? LIMIT 1";
        try (Connection con = LocalManager.getConnection();
             PreparedStatement ps = con.prepareStatement(query)) {
            String pattern = "%(" + player.id + ")%";
            ps.setString(1, pattern);
            ps.setString(2, pattern);
            try (java.sql.ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public static String getHistory(Player player) {
        StringBuilder sb = new StringBuilder();
        sb.append("--- LỊCH SỬ GIAO DỊCH GẦN ĐÂY ---\n");
        String query = "SELECT player_1, player_2, item_player_1, item_player_2, time_tran FROM history_transaction WHERE player_1 LIKE ? OR player_2 LIKE ? ORDER BY time_tran DESC LIMIT 10";
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm:ss dd/MM/yyyy");
        int count = 0;
        try (Connection con = LocalManager.getConnection();
             PreparedStatement ps = con.prepareStatement(query)) {
            String pattern = "%(" + player.id + ")%";
            ps.setString(1, pattern);
            ps.setString(2, pattern);
            try (java.sql.ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    count++;
                    String p1 = rs.getString("player_1");
                    String p2 = rs.getString("player_2");
                    String item1 = rs.getString("item_player_1");
                    String item2 = rs.getString("item_player_2");
                    Timestamp time = rs.getTimestamp("time_tran");

                    String timeStr = time != null ? sdf.format(time) : "Không rõ";
                    boolean isP1 = p1 != null && p1.contains("(" + player.id + ")");
                    String partner = isP1 ? p2 : p1;
                    String give = isP1 ? item1 : item2;
                    String receive = isP1 ? item2 : item1;

                    give = formatItemTrade(give);
                    receive = formatItemTrade(receive);

                    sb.append("[").append(count).append("] ").append(timeStr).append("\n");
                    sb.append("• Đối tác: ").append(partner).append("\n");
                    sb.append("• Chuyển đi: ").append(give).append("\n");
                    sb.append("• Nhận về: ").append(receive).append("\n");
                    if (count < 10) {
                        sb.append("\n");
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "Không thể lấy lịch sử giao dịch lúc này, vui lòng thử lại sau!";
        }

        if (count == 0) {
            return "Con chưa thực hiện cuộc giao dịch nào gần đây!";
        }
        return sb.toString().trim();
    }

    private static String formatItemTrade(String itemStr) {
        if (itemStr == null || itemStr.trim().isEmpty()) {
            return "Không có";
        }
        itemStr = itemStr.trim();
        if (itemStr.endsWith(",")) {
            itemStr = itemStr.substring(0, itemStr.length() - 1).trim();
        }

        if (itemStr.startsWith("Gold: ")) {
            int commaIdx = itemStr.indexOf(",");
            if (commaIdx != -1) {
                String goldPart = itemStr.substring("Gold: ".length(), commaIdx).trim();
                String restPart = itemStr.substring(commaIdx + 1).trim();
                try {
                    long g = Long.parseLong(goldPart);
                    if (g > 0) {
                        itemStr = nro.models.utils.Util.formatNumber(g) + " Vàng" + (restPart.isEmpty() ? "" : ", " + restPart);
                    } else {
                        itemStr = restPart;
                    }
                } catch (Exception e) {
                }
            } else {
                String goldPart = itemStr.substring("Gold: ".length()).trim();
                try {
                    long g = Long.parseLong(goldPart);
                    if (g > 0) {
                        return nro.models.utils.Util.formatNumber(g) + " Vàng";
                    } else {
                        return "Không có";
                    }
                } catch (Exception e) {
                }
            }
        }

        if (itemStr.isEmpty() || itemStr.equalsIgnoreCase("Không có")) {
            return "Không có";
        }
        return itemStr;
    }

}
