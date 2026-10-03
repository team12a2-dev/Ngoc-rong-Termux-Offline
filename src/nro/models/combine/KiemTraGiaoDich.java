package nro.models.combine;

import nro.models.data.LocalManager;
import nro.models.data.LocalResultSet;
import nro.models.database.HistoryTransactionDAO;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.utils.TimeUtil;

/**
 * Chức năng "Kiểm tra Giao dịch" tại NPC Bà Hạt Mít (đảo Kame).
 * Hiển thị lịch sử giao dịch player↔player trong hộp thoại xác nhận có nút OK.
 * Phí: 1 ngọc xanh / lần kiểm tra.
 *
 * @author By AmodsubVN
 */
public class KiemTraGiaoDich {

    private static final int COST_GEM = 1;
    private static final int MAX_HISTORY = 5;
    private static final int MAX_ITEM_TEXT = 72;

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

            StringBuilder history = new StringBuilder("Lịch sử giao dịch gần đây\n\n");
            int totalRows = rs.getRows();
            int count = 0;
            while (rs.next()) {
                String player1 = rs.getString("player_1");
                String player2 = rs.getString("player_2");
                boolean isPlayer1 = playerKey.equals(player1);
                String opponent = isPlayer1 ? player2 : player1;
                String given = isPlayer1
                        ? rs.getString("item_player_1") : rs.getString("item_player_2");
                String received = isPlayer1
                        ? rs.getString("item_player_2") : rs.getString("item_player_1");
                String time = rs.getTimestamp("time_tran") == null
                        ? "---"
                        : TimeUtil.formatTime(rs.getTimestamp("time_tran").getTime(), "dd/MM HH:mm");
                String status = rs.getInt("status") == 1 ? "Thành công" : "Thất bại";

                count++;
                history.append(count).append(") ").append(time).append(" - Với: ")
                        .append(opponentName(opponent)).append('\n')
                        .append("Đưa: ").append(truncate(given, MAX_ITEM_TEXT)).append('\n')
                        .append("Nhận: ").append(truncate(received, MAX_ITEM_TEXT)).append('\n')
                        .append("Trạng thái: ").append(status);
                if (count < totalRows) {
                    history.append("\n\n");
                }
            }

            if (count == 0) {
                Service.gI().sendThongBaoOK(player, "Không có lịch sử giao dịch nào.");
                return;
            }
            Service.gI().sendThongBaoOK(player, history.toString());
        } catch (Exception ex) {
            Service.gI().sendThongBao(player, "Lỗi khi lấy lịch sử giao dịch!");
        } finally {
            if (rs != null) {
                rs.dispose();
            }
        }
    }

    private static String opponentName(String playerKey) {
        if (playerKey == null) {
            return "Không rõ";
        }
        int idStart = playerKey.lastIndexOf(" (");
        if (idStart > 0 && playerKey.endsWith(")")) {
            return playerKey.substring(0, idStart);
        }
        return playerKey;
    }

    private static String truncate(String text, int maxLength) {
        if (text == null || text.isBlank()) {
            return "Không có";
        }
        String normalized = text.trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, maxLength - 1) + "…";
    }
}
