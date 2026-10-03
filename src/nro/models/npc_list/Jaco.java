package nro.models.npc_list;

import nro.models.consts.ConstMap;
import nro.models.consts.ConstNpc;
import nro.models.consts.ConstTask;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.map.service.ChangeMapService;
import nro.models.services.TaskService;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class Jaco extends Npc {

    public static final long POWER_REQUIRED = 1_500_000_000L;

    public Jaco(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            switch (this.mapId) {
                case ConstMap.TRAM_TAU_VU_TRU, ConstMap.TRAM_TAU_VU_TRU_25, ConstMap.TRAM_TAU_VU_TRU_26 -> {
                    if (player.nPoint.power < POWER_REQUIRED || TaskService.gI().getIdTask(player) < ConstTask.TASK_21_0) {
                        this.createOtherMenu(player, ConstNpc.BASE_MENU,
                                "Cậu còn quá yếu hoặc chưa hoàn thành nhiệm vụ tiêu diệt Fide đại ca.\nHãy đạt ít nhất 1 tỷ 5 sức mạnh và nhận nhiệm vụ chạm trán Fide đại ca để cùng ta đến bảo vệ Potaufeu!", "Đóng");
                    } else {
                        this.createOtherMenu(player, ConstNpc.BASE_MENU,
                                "Gô Tên, Calích và Monaka đang gặp chuyện ở hành tinh\nPotaufeu\nHãy đến đó ngay", "Đến\nPotaufeu", "Từ chối");
                    }
                }
                case ConstMap.HANH_TINH_POTAUFEU ->
                    this.createOtherMenu(player, ConstNpc.BASE_MENU,
                            "Tàu Vũ Trụ của ta có thể đưa cậu đến hành tinh khác chỉ trong 3 giây.\nCậu muốn đi đâu?", "Đến\nTrái Đất", "Đến\nNamếc", "Đến\nXayda", "Từ chối");
                default -> {
                }
            }
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            if (player.idMark.isBaseMenu()) {
                switch (this.mapId) {
                    case ConstMap.TRAM_TAU_VU_TRU, ConstMap.TRAM_TAU_VU_TRU_25, ConstMap.TRAM_TAU_VU_TRU_26 -> {
                        if (select == 0 && player.nPoint.power >= POWER_REQUIRED && TaskService.gI().getIdTask(player) >= ConstTask.TASK_21_0) {
                            ChangeMapService.gI().goToPotaufeu(player);
                        }
                    }
                    case ConstMap.HANH_TINH_POTAUFEU -> {
                        switch (select) {
                            case 0 ->
                                ChangeMapService.gI().changeMapBySpaceShip(player, ConstMap.TRAM_TAU_VU_TRU, -1, -1);
                            case 1 ->
                                ChangeMapService.gI().changeMapBySpaceShip(player, ConstMap.TRAM_TAU_VU_TRU_25, -1, -1);
                            case 2 ->
                                ChangeMapService.gI().changeMapBySpaceShip(player, ConstMap.TRAM_TAU_VU_TRU_26, -1, -1);
                        }
                    }
                }
            }
        }
    }
}
