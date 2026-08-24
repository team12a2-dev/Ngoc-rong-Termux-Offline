package nro.models.npc_list;

import nro.models.consts.ConstMap;
import nro.models.consts.ConstNpc;
import nro.models.map.service.ChangeMapService;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.TaskService;

/**
 *
 * @author By AmodsubVN
 */
public class DrMyuu extends Npc {

    /** Vị trí spawn khi vào / ra phòng thí nghiệm */
    private static final int LAB_ENTER_X = 480;
    private static final int LAB_ENTER_Y = 312;
    private static final int FOREST_RETURN_X = 478;
    private static final int FOREST_RETURN_Y = 288;

    public DrMyuu(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player player) {
        if (!canOpenNpc(player)) {
            return;
        }
        if (TaskService.gI().checkDoneTaskTalkNpc(player, this)) {
            return;
        }
        if (this.mapId == ConstMap.PHONG_THI_NGHIEM_MYUU) {
            this.createOtherMenu(player, ConstNpc.BASE_MENU,
                    "Đây là phòng thí nghiệm của ta.\nNgươi muốn quay ra ngoài không?",
                    "Quay lại Rừng thông Xayda",
                    "Ở lại");
            return;
        }
        this.createOtherMenu(player, ConstNpc.BASE_MENU,
                "Năm 740, ta tìm thấy các kí sinh trùng của King Tuffle,\nsau đó ta đã nghiên cứu và chế tạo kí sinh trùng Baby.\nBaby có khả năng bám vào cơ thể người khác,\nkiểm soát sức mạnh của họ và làm việc theo ý của ta.\nTuy nhiên ta đã mất kiểm soát nó hoàn toàn...\nNgươi có thể giúp ta chế ngự nó không?\nTa có thể đưa ngươi vào phòng thí nghiệm.",
                "Vào phòng thí nghiệm",
                "Từ chối");
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (!canOpenNpc(player) || !player.idMark.isBaseMenu()) {
            return;
        }
        if (this.mapId == ConstMap.PHONG_THI_NGHIEM_MYUU) {
            if (select == 0) {
                ChangeMapService.gI().changeMapNonSpaceship(player,
                        ConstMap.RUNG_THONG_XAYDA, FOREST_RETURN_X, FOREST_RETURN_Y);
            }
            return;
        }
        if (this.mapId == ConstMap.RUNG_THONG_XAYDA && select == 0) {
            ChangeMapService.gI().changeMapNonSpaceship(player,
                    ConstMap.PHONG_THI_NGHIEM_MYUU, LAB_ENTER_X, LAB_ENTER_Y);
        }
    }
}
