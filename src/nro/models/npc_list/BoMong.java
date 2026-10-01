package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.consts.ConstTask;
import nro.models.map.service.NpcService;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.AchievementService;
import nro.models.services.TaskService;

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
       boolean doneTalkNpcTask = TaskService.gI().checkDoneTaskTalkNpc(player, this);
       boolean showFastMainTask = TaskService.gI().isFastMainTaskQuest(player);

            if (canOpenNpc(player)) {
                if (this.mapId == 47 || this.mapId == 84 ||this.mapId == 21||this.mapId == 22||this.mapId == 23) {
                    if (doneTalkNpcTask) {
                        if (showFastMainTask) {
                            this.createOtherMenu(player, ConstNpc.MENU_OPTION_FAST_MAIN_TASK,
                                    TaskService.gI().getFastMainTaskSay(player), "Đồng ý", "Từ chối");
                        }
                        return;
                    }
                    String[] menuSelect = {"Nạp Ngọc", "Nhận ngọc\nMiễn phí", "Nhiệm vụ\nhàng ngày",
                        "Hoàn thành nhanh\nnhiệm vụ chính"};
                    this.createOtherMenu(player, ConstNpc.BASE_MENU,
                            "Ngươi muốn có thêm ngọc thì chịu khó làm vài nhiệm vụ sẽ được ngọc thưởng", menuSelect);
            }
        }
    }

    private void openRechargeMenu(Player player) {
        NpcService.gI().createTutorial(player, tempId, avartar,
                "Bạn có thể có ngọc từ ví điện tử, gift code (thẻ cào rốt)");
    }


    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            if (this.mapId == 47 || this.mapId == 84||this.mapId == 21||this.mapId == 22||this.mapId == 23) {
                if (player.idMark.isBaseMenu()) {
                    switch (select) {
                        case 0 -> openRechargeMenu(player);
                        case 1 -> AchievementService.gI().openAchievementUI(player);
                        case 2 -> {
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
                        case 3 -> this.createOtherMenu(player, ConstNpc.MENU_OPTION_FAST_MAIN_TASK,
                                TaskService.gI().getFastMainTaskSay(player), "Đồng ý", "Từ chối");

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
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_OPTION_FAST_MAIN_TASK) {
                    switch (select) {
                        case 0 -> {
                            TaskService.gI().fastMainTask(player);
                            this.openBaseMenu(player);
                        }
                    }
                }
            }
        }
    }
}
