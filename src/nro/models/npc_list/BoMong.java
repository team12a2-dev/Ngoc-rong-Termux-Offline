package nro.models.npc_list;

import java.time.LocalDate;
import java.time.LocalDateTime;
import nro.models.consts.ConstNpc;
import nro.models.consts.ConstTask;
import nro.models.item.Item;
import nro.models.services.AchievementService;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.services.TrainingService;
import nro.models.services_func.Input;

/**
 *
 * @author By AmodsubVN
 *
 */
public class BoMong extends Npc {

    public BoMong(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player player) {
        if (TaskService.gI().checkDoneTaskTalkNpc(player, this)) {
            return;
        }

        if (canOpenNpc(player)) {
            if (this.mapId == 47 || this.mapId == 84) {
                if (TaskService.gI().isCurrentTaskTauPayPayQuest(player)) {
                    if (TrainingService.gI().isTauPayPayQuestBossAlive(player)) {
                        this.npcChat(player, "Tên sát thủ Tàu Pảy Pảy đang ở đằng kia kìa! Con hãy mau cẩn thận tiêu diệt hắn và đoạt lại Ngọc Rồng 6 Sao!");
                        return;
                    } else {
                        this.createOtherMenu(player, ConstNpc.MENU_BO_MONG_SPAWN_TAU_77,
                                "Nguy hiểm quá! Tên sát thủ Tàu Pảy Pảy khét tiếng vừa xuất hiện để cướp Ngọc Rồng!\n"
                                + "Hắn đang chuẩn bị đáp phi thuyền xuống đây, con hãy mau cẩn thận!",
                                "Ta sẽ tiêu diệt hắn!");
                        return;
                    }
                }
                this.createOtherMenu(player, ConstNpc.BASE_MENU,
                        "Ngươi muốn có thêm ngọc thì chịu khó làm vài nhiệm vụ sẽ được ngọc thưởng",
                        "Nạp Ngọc",
                        "Nhận ngọc\nMiễn phí",
                        "Nhiệm vụ\nhàng ngày");
            }
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            if (this.mapId == 47 || this.mapId == 84) {
                if (player.idMark.getIndexMenu() == ConstNpc.MENU_BO_MONG_SPAWN_TAU_77) {
                    TrainingService.gI().trySpawnTauPayPayQuestBoss(player);
                    return;
                }
                if (player.idMark.isBaseMenu()) {
                    switch (select) {
                        case 0 -> { // Nạp Ngọc
                            this.createOtherMenu(player, ConstNpc.MENU_NAP_NGOC,
                                    "Chọn chức năng nạp",
                                    "Quy Đổi Ngọc",
                                    "Nhập Gift Code",
                                    "Từ chối");
                        }
                        case 1 -> { // Nhận ngọc Miễn phí
                            AchievementService.gI().openAchievementUI(player);
                        }
                        case 2 -> { // Nhiệm vụ hàng ngày
                            if (player.playerTask.sideTask.template != null) {
                                String npcSay = "Nhiệm vụ hiện tại: " + player.playerTask.sideTask.getName() + " ("
                                        + player.playerTask.sideTask.getLevel() + ")"
                                        + "\nHiện tại đã hoàn thành: " + player.playerTask.sideTask.count + "/"
                                        + player.playerTask.sideTask.maxCount + " ("
                                        + player.playerTask.sideTask.getPercentProcess() + "%)\nSố nhiệm vụ còn lại trong ngày: "
                                        + player.playerTask.sideTask.leftTask + "/" + ConstTask.MAX_SIDE_TASK;
                                this.createOtherMenu(player, ConstNpc.MENU_OPTION_PAY_SIDE_TASK,
                                        npcSay, "Trả nhiệm\nvụ", "Hủy nhiệm\nvụ");
                            } else {
                                this.createOtherMenu(player, ConstNpc.MENU_OPTION_LEVEL_SIDE_TASK,
                                        "Tôi có vài nhiệm vụ theo cấp bậc, càng khó càng nhiều Vàng và Ngọc Xanh\n"
                                        + "sức cậu có thể làm được cái nào?",
                                        "Dễ", "Bình thường", "Khó", "Từ chối");
                            }
                        }
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_NAP_NGOC) {
                    switch (select) {
                        case 0 -> Input.gI().createFormTradeGem(player);
                        case 1 -> Input.gI().createFormGiftCode(player);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_OPTION_LEVEL_SIDE_TASK) {
                    switch (select) {
                        case 0, 1, 2 ->
                            TaskService.gI().changeSideTask(player, (byte) select);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_OPTION_PAY_SIDE_TASK) {
                    switch (select) {
                        case 0 ->
                            TaskService.gI().paySideTask(player);
                        case 1 ->
                            TaskService.gI().removeSideTask(player);
                    }
                }
            }
        }
    }
}
