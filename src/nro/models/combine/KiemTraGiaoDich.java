package nro.models.combine;

import nro.models.data.LocalManager;
import nro.models.data.LocalResultSet;
import nro.models.database.HistoryTransactionDAO;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.utils.TimeUtil;
import java.sql.Timestamp;

/**
 * Chức năng "Kiểm tra Giao dịch" tại NPC Bà Hạt Mít (đảo Kame).
 * Cho phép người chơi xem lại lịch sử giao dịch player↔player:
 * giao dịch những gì, thời gian, số lượng, thành công hay chưa.
 * Phí: 1 ngọc xanh / lần kiểm tra.
 *
 * @author By AmodsubVN
 */
public class KiemTraGiaoDich {

    private static final int COST_GEM = 1;
    private static final int MAX_HISTORY = 10;

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
        StringBuilder sb = new StringBuilder();
        sb.append("=== LỊCH SỬ GIAO DỊCH ===\n");
        int count = 0;
        LocalResultSet rs = null;
        try {
            rs = LocalManager.executeQuery(
                    "SELECT player_1, player_2, item_player_1, item_player_2, time_tran, status "
                    + "FROM history_transaction WHERE player_1 = ? OR player_2 = ? "
                    + "ORDER BY time_tran DESC LIMIT " + MAX_HISTORY,
                    playerKey, playerKey);
            while (rs.next()) {
                String p1 = rs.getString("player_1");
                String p2 = rs.getString("player_2");
                String items1 = rs.getString("item_player_1");
                String items2 = rs.getString("item_player_2");
                Timestamp time = rs.getTimestamp("time_tran");
                int status = rs.getInt("status");

                boolean iAmP1 = playerKey.equals(p1);
                String doiPhuong = iAmP1 ? p2 : p1;
                String banDua = iAmP1 ? items1 : items2;
                String nhanDuoc = iAmP1 ? items2 : items1;
                String timeStr = time != null
                        ? TimeUtil.formatTime(time.getTime(), "dd/MM/yyyy HH:mm") : "---";
                String statusStr = status == 1 ? "Thành công" : "Thất bại";

                count++;
                sb.append("[").append(count).append("] ").append(timeStr)
                        .append(" - Với: ").append(doiPhuong).append("\n");
                sb.append("  Đưa: ").append(banDua).append("\n");
                sb.append("  Nhận: ").append(nhanDuoc).append("\n");
                sb.append("  Trạng thái: ").append(statusStr).append("\n");
            }
        } catch (Exception ex) {
            Service.gI().sendThongBao(player, "Lỗi khi lấy lịch sử giao dịch!");
            return;
        } finally {
            if (rs != null) {
                rs.dispose();
            }
        }
        if (count == 0) {
            sb.append("Không có lịch sử giao dịch nào.\n");
        }
        Service.gI().sendThongBao(player, sb.toString());
    }
}
