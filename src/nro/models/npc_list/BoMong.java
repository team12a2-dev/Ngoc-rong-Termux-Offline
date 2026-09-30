package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.consts.ConstTask;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.AchievementService;
import nro.models.services.TaskService;
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

    private void openRechargeGuide(Player player, int page) {
        switch (page) {
            case 1 -> this.createOtherMenu(player, ConstNpc.MENU_OPTION_RECHARGE_GUIDE_1,
                    "Ta sẽ hướng dẫn ngươi cách nạp thẻ.\nBước 1: Nạp thẻ qua kênh nạp của máy chủ, chọn đúng nhà mạng và mệnh giá, rồi nhập chính xác mã thẻ cùng số seri.",
                    "Tiếp tục", "Quy đổi ngọc");
            case 2 -> this.createOtherMenu(player, ConstNpc.MENU_OPTION_RECHARGE_GUIDE_2,
                    "Bước 2: Chờ hệ thống xác nhận giao dịch. Khi thành công, tiền sẽ được cộng vào số dư VNĐ của tài khoản. Nếu giao dịch chưa cập nhật, hãy kiểm tra trạng thái hoặc liên hệ quản trị viên; đừng gửi lại thẻ đã dùng.",
                    "Tiếp tục", "Quy đổi ngọc", "Quay lại");
            case 3 -> this.createOtherMenu(player, ConstNpc.MENU_OPTION_RECHARGE_GUIDE_3,
                    "Bước 3: Dùng số dư VNĐ để đổi thành Ngọc Xanh. Tỉ lệ: 10.000 VNĐ = 120 ngọc. Mỗi lần đổi tối thiểu 10.000 VNĐ và tối đa 5.000.000 VNĐ. Chọn Quy đổi ngọc để nhập số tiền cần đổi.",
                    "Quy đổi ngọc", "Quay lại");
        }
    }


    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            if (this.mapId == 47 || this.mapId == 84||this.mapId == 21||this.mapId == 22||this.mapId == 23) {
                if (player.idMark.isBaseMenu()) {
                    switch (select) {
                        case 0 -> this.createOtherMenu(player, ConstNpc.MENU_OPTION_RECHARGE_GEM,
                                "Ngươi muốn nạp ngọc bằng cách nào?", "Hướng dẫn nạp thẻ", "Nhập Gift Code");
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
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_OPTION_RECHARGE_GEM) {
                    switch (select) {
                        case 0 -> openRechargeGuide(player, 1);
                        case 1 -> Input.gI().createFormGiftCode(player);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_OPTION_RECHARGE_GUIDE_1) {
                    switch (select) {
                        case 0 -> openRechargeGuide(player, 2);
                        case 1 -> Input.gI().createFormTradeGem(player);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_OPTION_RECHARGE_GUIDE_2) {
                    switch (select) {
                        case 0 -> openRechargeGuide(player, 3);
                        case 1 -> Input.gI().createFormTradeGem(player);
                        case 2 -> openRechargeGuide(player, 1);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_OPTION_RECHARGE_GUIDE_3) {
                    switch (select) {
                        case 0 -> Input.gI().createFormTradeGem(player);
                        case 1 -> openRechargeGuide(player, 2);
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
