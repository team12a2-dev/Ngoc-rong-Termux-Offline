package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.consts.ConstTask;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.map.service.NpcService;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.Util;
import java.util.ArrayList;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class Cargo extends Npc {

    public Cargo(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player pl) {
        if (canOpenNpc(pl)) {
            if (!TaskService.gI().checkDoneTaskTalkNpc(pl, this)) {
                if (pl.playerTask.taskMain.id == 7) {
                    NpcService.gI().createTutorial(pl, this.avartar, "Hãy lên đường cứu đứa bé nhà tôi\nChắc bây giờ nó đang sợ hãi lắm rồi");
                } else {
                    ArrayList<String> menu = new ArrayList<>();
                    menu.add("Đến\nTrái Đất");
                    menu.add("Đến\nXayda");
                    menu.add("Siêu thị");
                    if (pl.clan != null) {
                        menu.add("Nhiệm vụ Bang\n[" + pl.playerTask.clanTask.leftTask + "/" + ConstTask.MAX_CLAN_TASK + "]");
                    }
                    this.createOtherMenu(pl, ConstNpc.BASE_MENU,
                            "Tàu Vũ Trụ của ta có thể đưa cậu đến hành tinh khác chỉ trong 3 giây. Cậu muốn đi đâu?",
                            menu.toArray(String[]::new));
                }
            }
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            if (player.idMark.isBaseMenu()) {
                switch (select) {
                    case 0 ->
                        ChangeMapService.gI().changeMapBySpaceShip(player, 24, -1, -1);
                    case 1 ->
                        ChangeMapService.gI().changeMapBySpaceShip(player, 26, -1, -1);
                    case 2 ->
                        ChangeMapService.gI().changeMapBySpaceShip(player, 84, -1, -1);
                    case 3 -> {
                        if (player.clan != null) {
                            if (player.playerTask.clanTask.template != null) {
                                if (player.playerTask.clanTask.isDone()) {
                                    createOtherMenu(player, ConstNpc.MENU_CLAN_TASK, "Nhiệm vụ đã hoàn thành, hãy nhận " + ((player.playerTask.clanTask.level + 1) * 10) + " capsule bang", "Nhận\nthưởng", "Đóng");
                                } else {
                                    createOtherMenu(player, ConstNpc.MENU_CLAN_TASK, "Nhiệm vụ hiện tại: " + player.playerTask.clanTask.getName() + ". Đã hạ được " + player.playerTask.clanTask.count, "OK", "Hủy bỏ\nNhiệm vụ\nnày");
                                }
                            } else {
                                TaskService.gI().changeClanTask(this, player, (byte) Util.nextInt(5));
                            }
                        }
                    }
                }
            } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_CLAN_TASK) {
                if (player.playerTask.clanTask.template != null) {
                    switch (select) {
                        case 0 -> {
                            if (player.playerTask.clanTask.isDone()) {
                                TaskService.gI().payClanTask(player);
                            }
                        }
                        case 1 -> {
                            if (!player.playerTask.clanTask.isDone()) {
                                createOtherMenu(player, ConstNpc.MENU_CLAN_TASK_REMOVE, "Bạn có chắc muốn hủy nhiệm vụ này?\nNếu hủy nhiệm vụ bạn sẽ mất 1 lượt nhiệm vụ trong ngày.", "Đồng ý", "Từ chối");
                            }
                        }
                    }
                }
            } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_CLAN_TASK_REMOVE) {
                if (player.playerTask.clanTask.template != null) {
                    if (select == 0 && !player.playerTask.clanTask.isDone()) {
                        TaskService.gI().removeClanTask(player);
                    }
                }
            }
        }
    }
}
