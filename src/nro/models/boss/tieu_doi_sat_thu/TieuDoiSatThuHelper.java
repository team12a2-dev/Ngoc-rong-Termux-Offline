package nro.models.boss.tieu_doi_sat_thu;

import java.time.ZonedDateTime;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.spawn.BossSpawnConfig;
import nro.models.boss.spawn.BossSpawnSchedule;
import nro.models.consts.BossStatus;
import nro.models.map.service.ChangeMapService;
import nro.models.player.Player;
import nro.models.services.Service;

public final class TieuDoiSatThuHelper {

    private TieuDoiSatThuHelper() {
    }

    /**
     * Khung giờ hỗ trợ tân thủ làm nhiệm vụ
     */
    public static boolean isLimitSupportHour() {
        return BossSpawnConfig.isTDSTSupportHour(ZonedDateTime.now(BossSpawnSchedule.ZONE_VN));
    }

    public static boolean isTDSTBossId(long bossId) {
        return bossId == BossID.TIEU_DOI_TRUONG
                || bossId == BossID.SO_4
                || bossId == BossID.SO_3
                || bossId == BossID.SO_2
                || bossId == BossID.SO_1;
    }

    /**
     * Kiểm tra người chơi đã hoàn thành nhiệm vụ Tiểu Đội Sát Thủ (vượt qua nhiệm vụ 20)
     */
    public static boolean hasFinishedTaskTDST(Player player) {
        if (player == null || player.playerTask == null || player.playerTask.taskMain == null) {
            return false;
        }
        return player.playerTask.taskMain.id > 20;
    }

    /**
     * Kiểm tra người chơi có đang ở đúng nhiệm vụ 20 hay không
     */
    public static boolean isDoingTaskTDST(Player player) {
        if (player == null || player.playerTask == null || player.playerTask.taskMain == null) {
            return false;
        }
        return player.playerTask.taskMain.id == 20;
    }

    /**
     * Khi boss xuất hiện trong giờ hỗ trợ, đưa những người chơi đã làm xong nhiệm vụ về nhà
     */
    public static void checkEvictFinishedPlayers(Boss boss) {
        if (!isLimitSupportHour() || boss == null || boss.zone == null) {
            return;
        }
        for (Player pl : boss.zone.getPlayers()) {
            if (pl != null && !pl.isBoss && !pl.isPet && !pl.isAdmin()) {
                if (hasFinishedTaskTDST(pl)) {
                    Service.gI().sendThongBao(pl, "Đang trong khung giờ hỗ trợ tân thủ làm nhiệm vụ Tiểu Đội Sát Thủ, bạn đã hoàn thành nhiệm vụ này nên được đưa về nhà!");
                    ChangeMapService.gI().changeMapBySpaceShip(pl, pl.gender + 21, -1, 400);
                }
            }
        }
    }
}
