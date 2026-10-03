package nro.models.combine;

import nro.models.data.LocalManager;
import nro.models.data.LocalResultSet;
import nro.models.database.HistoryTransactionDAO;
import nro.models.network.Message;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.utils.TimeUtil;
import java.sql.Timestamp;

/**
 * Chức năng "Kiểm tra Giao dịch" tại NPC Bà Hạt Mít (đảo Kame).
 * Cho phép người chơi xem lại lịch sử giao dịch player↔player dưới dạng
 * bảng dialog: giao dịch những gì, thời gian, số lượng, thành công hay chưa.
 * Phí: 1 ngọc xanh / lần kiểm tra.
 *
 * @author By AmodsubVN
 */
public class KiemTraGiaoDich {

    private static final int COST_GEM = 1;
    private static final int MAX_HISTORY = 10;
    private static final int INFO1_MAX = 42;
    private static final int INFO2_MAX = 30;

    private static KiemTraGiaoDich instance;

    public static KiemTraGiaoDich gI() {
        if (instance == null) {
            instance = new KiemTraGiaoDich();
        }
        return instance;
    }

    public void showTradeHistory(Player player) {
        if (player == null || player.inventory == null) {
            return;
        }
        if (player.inventory.gem < COST_GEM) {
            Service.gI().sendThongBao(player,
                    "Không đủ ngọc để kiểm tra giao dịch! Cần " + COST_GEM + " ngọc xanh.");
            return;
        }
        player.inventory.subGem(COST_GEM);
        Service.gI().sendMoney(player);

        HistoryTransactionDAO.ensureStatusColumn();

        String playerKey = player.name + " (" + player.id + ")";
        LocalResultSet rs = null;
        try {
            rs = LocalManager.executeQuery(
                    "SELECT player_1, player_2, item_player_1, item_player_2, time_tran, status "
                    + "FROM history_transaction WHERE player_1 = ? OR player_2 = ? "
                    + "ORDER BY time_tran DESC LIMIT " + MAX_HISTORY,
                    playerKey, playerKey);

            // Đếm số dòng trước khi gửi bảng (cần biết count để writeByte)
            java.util.List<String[]> rows = new java.util.ArrayList<>();
            while (rs.next()) {
                rows.add(new String[]{
                    rs.getString("player_1"),
                    rs.getString("player_2"),
                    rs.getString("item_player_1"),
                    rs.getString("item_player_2"),
                    rs.getTimestamp("time_tran") == null ? null
                            : TimeUtil.formatTime(rs.getTimestamp("time_tran").getTime(), "dd/MM HH:mm"),
                    String.valueOf(rs.getInt("status"))
                });
            }

            if (rows.isEmpty()) {
                Service.gI().sendThongBao(player, "Không có lịch sử giao dịch nào.");
                return;
            }

            sendTableDialog(player, playerKey, rows);
        } catch (Exception ex) {
            Service.gI().sendThongBao(player, "Lỗi khi lấy lịch sử giao dịch!");
        } finally {
            if (rs != null) {
                rs.dispose();
            }
        }
    }

    private void sendTableDialog(Player player, String playerKey, java.util.List<String[]> rows) {
        Message msg = new Message(-96);
        try {
            msg.writer().writeByte(0);
            msg.writer().writeUTF("Lịch sử giao dịch");
            msg.writer().writeByte(rows.size());

            int stt = 0;
            for (String[] row : rows) {
                String p1 = row[0];
                String p2 = row[1];
                String items1 = row[2];
                String items2 = row[3];
                String timeStr = row[4] == null ? "---" : row[4];
                String statusStr = "1".equals(row[5]) ? "Thành công" : "Thất bại";

                boolean iAmP1 = playerKey.equals(p1);
                String doiPhuongKey = iAmP1 ? p2 : p1;
                String banDua = iAmP1 ? items1 : items2;
                String nhanDuoc = iAmP1 ? items2 : items1;

                String[] parsed = parsePlayerKey(doiPhuongKey);
                String doiPhuongName = parsed[0];
                int doiPhuongId = parseIntSafe(parsed[1]);
                short[] avatar = loadAvatar(doiPhuongId);

                stt++;
                msg.writer().writeInt(stt);
                msg.writer().writeInt(doiPhuongId);
                msg.writer().writeShort(avatar[0]);
                if (player.getSession().version > 214) {
                    msg.writer().writeShort(-1);
                }
                msg.writer().writeShort(avatar[1]);
                msg.writer().writeShort(avatar[2]);
                msg.writer().writeUTF(doiPhuongName);
                msg.writer().writeUTF("Đưa: " + truncate(banDua, INFO1_MAX));
                msg.writer().writeUTF("Nhận: " + truncate(nhanDuoc, INFO2_MAX)
                        + " | " + timeStr + " | " + statusStr);
            }

            player.sendMessage(msg);
        } catch (Exception ex) {
            Service.gI().sendThongBao(player, "Lỗi khi hiển thị lịch sử giao dịch!");
        } finally {
            msg.cleanup();
        }
    }

    /**
     * Phân tích chuỗi "name (id)" thành [name, id].
     */
    private static String[] parsePlayerKey(String key) {
        if (key == null) {
            return new String[]{"?", "0"};
        }
        int idx = key.lastIndexOf(" (");
        if (idx > 0 && key.endsWith(")")) {
            String name = key.substring(0, idx);
            String idStr = key.substring(idx + 2, key.length() - 1);
            return new String[]{name, idStr};
        }
        return new String[]{key, "0"};
    }

    private static int parseIntSafe(String s) {
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    /**
     * Lấy avatar [head, body, leg] của người chơi từ CSDL.
     * Mặc định theo gender nếu không tìm thấy.
     */
    private static short[] loadAvatar(int playerId) {
        if (playerId <= 0) {
            return new short[]{102, 57, 58};
        }
        LocalResultSet rs = null;
        try {
            rs = LocalManager.executeQuery(
                    "SELECT head, gender FROM player WHERE id = ?", playerId);
            if (rs.first()) {
                int head = rs.getInt("head");
                int gender = rs.getInt("gender");
                short body = (short) (gender == 1 ? 59 : 57);
                short leg = (short) (gender == 1 ? 60 : 58);
                return new short[]{(short) head, body, leg};
            }
        } catch (Exception ex) {
            // bỏ qua, dùng mặc định
        } finally {
            if (rs != null) {
                rs.dispose();
            }
        }
        return new short[]{102, 57, 58};
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        s = s.trim();
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, Math.max(0, max - 1)) + "…";
    }
}
