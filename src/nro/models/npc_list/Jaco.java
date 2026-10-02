package nro.models.npc_list;

import nro.models.consts.ConstMap;
import nro.models.consts.ConstNpc;
import nro.models.consts.ConstTask;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.map.service.ChangeMapService;
import nro.models.services.Service;
import nro.models.services.TaskService;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class Jaco extends Npc {

    public Jaco(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    /**
     * Jaco ở Trạm tàu vũ trụ (map 24) chỉ xuất hiện từ nhiệm vụ chính 22
     * "Chú bé đến từ tương lai" trở đi - đó là nhiệm vụ của Calích, khớp với lời thoại
     * của Jaco về Gô Tên, Calích và Monaka ở hành tình Potaufeu. Hai bước cuối của
     * nhiệm vụ 22 dẫn người chơi tới chỗ Jaco rồi sang Potaufeu.
     *
     * Trước đây Jaco nằm sẵn trong map_template.npcs của map 24 mà không có điều kiện nào,
     * nên nhân vật mới tạo đi từ Làng Aru tới Thung lũng tre là vào được map 24,
     * bấm vào Jaco là bay thẳng sang Potaufeu và bỏ qua toàn bộ main quest.
     *
     * Jaco ở Hành tình Potaufeu (map 139) luôn mở: map 139 chỉ nối với Hang động Potaufeu
     * (map 140) và không có lối ra nào khác, chặn Jaco ở đó sẽ kẹt người chơi.
     */
    public boolean isUnlocked(Player player) {
        if (this.mapId != ConstMap.TRAM_TAU_VU_TRU) {
            return true;
        }
        return player != null && player.playerTask != null && player.playerTask.taskMain != null
                && player.playerTask.taskMain.id >= ConstTask.TASK_MAIN_22_CALICH;
    }

    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            if (!isUnlocked(player)) {
                Service.gI().hideWaitDialog(player);
                Service.gI().sendThongBao(player, "Jaco chưa có tin gì để nói với cậu");
                return;
            }
            if (TaskService.gI().checkDoneTaskTalkNpc(player, this)) {
                return;
            }
            switch (this.mapId) {
                case ConstMap.TRAM_TAU_VU_TRU ->
                    this.createOtherMenu(player, ConstNpc.BASE_MENU,
                            "Gô Tên, Calích và Monaka đang gặp chuyện ở hành tình\nPotaufeu\nHãy đến đó ngay", "Đến\nPotaufeu", "Từ chối");
                case ConstMap.HANH_TINH_POTAUFEU ->
                    this.createOtherMenu(player, ConstNpc.BASE_MENU,
                            "Tàu Vũ Trụ của ta có thể đưa cậu đến hành tình khác chỉ trong 3 giây.\nCậu muốn đi đâu?", "Đến\nTrái Đất", "Đến\nNamếc", "Đến\nXayda", "Từ chối");
                default -> {
                }
            }
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            if (!isUnlocked(player)) {
                Service.gI().hideWaitDialog(player);
                Service.gI().sendThongBao(player, "Jaco chưa có tin gì để nói với cậu");
                return;
            }
            if (player.idMark.isBaseMenu()) {
                switch (this.mapId) {
                    case ConstMap.TRAM_TAU_VU_TRU -> {
                        if (select == 0) {
                            ChangeMapService.gI().goToPotaufeu(player);
                        }
                    }
                    case ConstMap.HANH_TINH_POTAUFEU -> {
                        switch (select) {
                            case 0 ->
                                ChangeMapService.gI().changeMapBySpaceShip(player, 24, -1, -1);
                            case 1 ->
                                ChangeMapService.gI().changeMapBySpaceShip(player, 25, -1, -1);
                            case 2 ->
                                ChangeMapService.gI().changeMapBySpaceShip(player, 26, -1, -1);
                        }
                    }
                }
            }
        }
    }
}
