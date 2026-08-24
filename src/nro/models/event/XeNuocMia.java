package nro.models.event;

import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.consts.ConstNpc;
import nro.models.item.Item;
import nro.models.shop.ShopService;
import nro.models.utils.Util;

public class XeNuocMia extends Npc {

    public XeNuocMia(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    // ================== MENU CHÍNH ==================
    @Override
    public void openBaseMenu(Player player) {
        if (!canOpenNpc(player)) {
            return;
        }

        player.idMark.setIndexMenu(ConstNpc.BASE_MENU);

        createOtherMenu(player,
                ConstNpc.BASE_MENU,
                "Xin chào, chán cơm thì thèm phở chứ gì\nMày còn tệ hơn Cậu Vàng của tao!\nMà khoan, Cậu Vàng đã bị bắt mất, hãy tìm về giúp tao",
                "Thực Đơn\ncủa\nCậu Vàng",
                "Sờ\nCậu Vàng",
                "Trao Trả\nCậu Vàng",
                "Đốt\nTiệm");
    }

    // ================== XỬ LÝ MENU ==================
    @Override
    public void confirmMenu(Player player, int select) {
        if (!canOpenNpc(player)) {
            return;
        }

        // ===== MENU CHÍNH =====
        if (player.idMark.isBaseMenu()) {
            switch (select) {

                case 0: // Shop
                    ShopService.gI().opendShop(player, "DOI_SKILL_DE", false);
                    break;

                case 1: // Sờ Cậu Vàng
                    createOtherMenu(player,
                            111,
                            "Sờ Cậu Vàng mất 5000 ngọc\nNhận được quà xịn nếu không bị cắn\nTỉ lệ bị cắn chỉ 1%",
                            "Đồng ý",
                            "Từ chối");
                    break;

              case 2: // Trao Trả Cậu Vàng

    int requiredId = 1824;

    // Kiểm tra có item 1824 không
    Item item1824 = InventoryService.gI().findItemBag(player, requiredId);

    if (item1824 == null || item1824.quantity < 1) {
        Service.gI().sendThongBao(player, "Bạn cần x1 Cậu Vàng trong hành trang!");
        return;
    }

    // Trừ 1 item 1824
    InventoryService.gI().subQuantityItemsBag(player, item1824, 1);

    // Random 1591 hoặc 1592
    short rewardId = Util.nextInt(1, 2) == 1
            ? (short) 1591
            : (short) 1592;

    Item reward = ItemService.gI().createNewItem(rewardId);
    reward.quantity = 1;

    InventoryService.gI().addItemBag(player, reward);
    InventoryService.gI().sendItemBags(player);

    Service.gI().sendThongBaoOK(player,
            "Đây là quà cảm ơn: " + reward.template.name);

    break;

                case 3: // Đốt Tiệm
                    Service.gI().sendThongBaoOK(player,
                            "Chức năng đã đóng");
                    break;
            }
        }

        // ===== MENU SỜ CẬU VÀNG =====
        if (player.idMark.getIndexMenu() == 111) {

            if (select == 0) { // Đồng ý

                long cost = 5000;

                if (player.inventory.gem < cost) {
                    Service.gI().sendThongBao(player, "Không đủ 5000 ngọc ngọc!");
                    return;
                }

                // Trừ vàng
                player.inventory.gem -= cost;
                Service.gI().sendMoney(player);

                int rand = Util.nextInt(1, 100);

                // 50% trượt
                if (rand <= 50) {
                    Service.gI().sendThongBaoOK(player,
                            "Ngu, Mày đã bị lừa");
                } else {

                    // Random 1591 hoặc 1592
                short rewardId = Util.nextInt(1, 2) == 1
        ? (short) 1591
        : (short) 1592;

Item item = ItemService.gI().createNewItem(rewardId);
item.quantity = 1;

// ===== THÊM OPTION 30 PARAM 1 =====
item.itemOptions.add(new Item.ItemOption(30, 1));

InventoryService.gI().addItemBag(player, item);
InventoryService.gI().sendItemBags(player);

Service.gI().sendThongBao(player,
        "Chúc mừng! +1 " + item.template.name);
            }
        }
    }
    }
}

// package nro.models.event;

// import nro.models.npc.Npc;
// import nro.models.player.Player;
// import nro.models.services.Service;
// import nro.models.consts.ConstNpc;

// public class XeNuocMia extends Npc {

//     public XeNuocMia(int mapId, int status, int cx, int cy, int tempId, int avartar) {
//         super(mapId, status, cx, cy, tempId, avartar);
//     }

//     @Override
//     public void openBaseMenu(Player player) {
//         if (!canOpenNpc(player)) return;

//         createOtherMenu(player,
//                 ConstNpc.BASE_MENU,
//                 "Sự kiện sắp ra mắt",
//                 "Xem lộ trình",
//                 "Đóng");
//     }

//     @Override
//     public void confirmMenu(Player player, int select) {
//         if (!canOpenNpc(player)) return;

//         if (player.idMark.isBaseMenu()) {
//             if (select == 0) {
//                 Service.gI().sendThongBaoOK(player,
//                         "Sự kiện sẽ mở sau 7 ngày nữa!");
//             }
//         }
//     }
// }