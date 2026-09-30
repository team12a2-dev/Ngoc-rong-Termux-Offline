package nro.models.npc_list;

import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.NpcService;
import nro.models.services.TaskService;

public class OngGohan extends Npc {

    public OngGohan(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player player) {
        if (!canOpenNpc(player)) {
            return;
        }

        // Giữ nguyên các đoạn thoại và tiến độ khi nhiệm vụ yêu cầu nói chuyện với NPC ở nhà.
        if (TaskService.gI().checkDoneTaskTalkNpc(player, this)) {
            return;
        }

        NpcService.gI().createTutorial(player, this.tempId, this.avartar,
                "Con cố gắng theo Quy Lão Kame học thành tài,\nđừng lo lắng cho ta.");
    }

    @Override
    public void confirmMenu(Player player, int select) {
        // NPC ở nhà chỉ có hộp thoại, không có thao tác chức năng.
    }
}
