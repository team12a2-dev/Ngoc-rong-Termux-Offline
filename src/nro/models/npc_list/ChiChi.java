package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.item.Item;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.InventoryService;
import nro.models.services.Service;

public class ChiChi extends Npc {

    public ChiChi(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            createOtherMenu(
                    player,
                    ConstNpc.BASE_MENU,
                    "Chi sẽ giúp bạn loại bỏ những trang bị có HSD ở hành trang\n(trang bị đang mặc không bị ảnh hưởng)\nHãy đọc kỹ rồi chọn nhé",
                    "Hủy bỏ\ntrang bị\ncó hsd",
                    "Thông tin\nsự kiện mới",
                    "Đóng"
            );
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (!canOpenNpc(player)) {
            return;
        }

        if (player.idMark.isBaseMenu()) {
            switch (select) {
                case 0:
                    vutTrangBiHSD(player);
                    break;
                case 1:
                    Service.gI().sendThongBaoOK(player,
                            "Sự kiện mới sẽ update sau 7 ngày Open Server.");
                    break;
                default:
                    break;
            }
        }
    }

    private void vutTrangBiHSD(Player player) {
        boolean daXoa = false;

        for (int i = 0; i < player.inventory.itemsBag.size(); i++) {
            Item item = player.inventory.itemsBag.get(i);

            if (item == null || !item.isNotNullItem()) {
                continue;
            }

            for (int j = 0; j < item.itemOptions.size(); j++) {
                if (item.itemOptions.get(j).optionTemplate.id == 93) {
                    Item empty = new Item();
                    empty.template = null;
                    player.inventory.itemsBag.set(i, empty);
                    daXoa = true;
                    break;
                }
            }
        }

        if (!daXoa) {
            Service.gI().sendThongBao(player,
                    "Hành trang không có trang bị nào có hạn sử dụng.");
            return;
        }

        InventoryService.gI().sendItemBags(player);
        Service.gI().sendThongBao(player,
                "Đã vứt bỏ toàn bộ trang bị có hạn sử dụng.");
    }
}
