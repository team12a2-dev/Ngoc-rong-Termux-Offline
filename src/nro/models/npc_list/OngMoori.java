package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.data.LocalManager;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.services_func.Input;

public class OngMoori extends Npc {

    public OngMoori(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            if (!TaskService.gI().checkDoneTaskTalkNpc(player, this)) {
                this.createOtherMenu(player, ConstNpc.BASE_MENU,
                        "Con cố gắng theo Quy Lão Kame học thành tài,\nđừng lo lắng cho ta.",
                        "Nhập\nGiftcode"
                        ,
                        "Mở\nTV Free",
                        "Đóng"
                    );
            }
        }
    }
@Override
public void confirmMenu(Player player, int select) {
    if (!canOpenNpc(player)) return;

    if (player.idMark.isBaseMenu()) {
        switch (select) {

            case 0 -> {
                // Nhập giftcode
                Input.gI().createFormGiftCode(player);
            }

         case 1 -> {
    // Check nhiệm vụ
    if (player.playerTask.taskMain.id <= 21) {
        Service.gI().sendThongBao(player,
                "Xong Nv Fide!");
        return;
    }

    // Đã active chưa
    if (player.getSession().actived) {
        Service.gI().sendThongBao(player,
                "Tài khoản của con đã mở TV Free rồi!");
        return;
    }

    // Set active trong session
    player.getSession().actived = true;

    // Update DB (PHẢI try-catch)
    try {
        LocalManager.executeUpdate(
                "UPDATE account SET active = 1 WHERE id = ?",
                player.getSession().userId
        );
    } catch (Exception e) {
        Service.gI().sendThongBao(player,
                "Có lỗi xảy ra, vui lòng thử lại!");
        e.printStackTrace();
        return;
    }

    Service.gI().sendThongBao(player,
            "Mở TV Free thành cong!!");
}
        }
    }
}}