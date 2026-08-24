package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.item.Item;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.services_func.LuckyRound;
import nro.models.shop.ShopService;
import nro.models.data.LocalManager;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
 import nro.models.map.service.ChangeMapService;

public class ThuongDe extends Npc {

    public ThuongDe(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    // ================= MENU CHÍNH =================
   @Override
public void openBaseMenu(Player player) {
    if (!canOpenNpc(player)) return;

    // Map 5
    if (player.zone.map.mapId == 5) {
        this.createOtherMenu(player, ConstNpc.BASE_MENU,
                "Chào con, chó là loài vật thật đáng yêu",
                "BXH\nQuay Tay",
                "Phòng Tập Thời Gian");
        return;
    }

    // Check nhiệm vụ Fide
    if (player.playerTask.taskMain.id < 21) {
        this.createOtherMenu(player, ConstNpc.IGNORE_MENU,
                "Hãy hoàn thành nhiệm vụ TĐST",
                "Đóng");
        return;
    }

    // Menu chính
    this.createOtherMenu(player, ConstNpc.BASE_MENU,
            "Lưu ý:\n Quay Tay (quay bằng tay) tỉ lệ vật phẩm hiếm cao hơn\n"
            + "Quay Không Tay (không quay bằng tay) tỉ lệ cũng như trên\n"
            + "Tích cực quay tay\n"
            + "Vận may không đến\n"
            + "Quay Tay nhiều có thể nhận được:\n"
            + "1. Socola, Thú cưỡi, Đeo Lưng, Pet\n"
            + "2. Rụng Tóc, Hói Đầu, Suy Thận ...\n",
            "Quay Tay",
            "Nhận Quà",
            "BXH\nQuay Tay",
            "Rương");
}

  @Override
public void confirmMenu(Player player, int select) {
    if (!canOpenNpc(player)) return;

    // Map 5
    if (player.zone.map.mapId == 5) {
        if (player.idMark.isBaseMenu()) {
            switch (select) {
                case 0 -> showTopLucky(player);
                case 1 -> ChangeMapService.gI().changeMapNonSpaceship(player, 49, 300, 360);
            }
        }
        return;
    }
if (player.playerTask.taskMain.id < 21) {
    this.createOtherMenu(player, ConstNpc.IGNORE_MENU,
            "Hãy hoàn thành nhiệm vụ TĐST",
            "Đóng");
    return;
}
    // ===== MENU CHÍNH =====
    if (player.idMark.isBaseMenu()) {
        switch (select) {
            case 0 -> LuckyRound.gI().openCrackBallUI(player, LuckyRound.USING_GEM);
            case 1 -> showMilestoneMenu(player);
            case 2 -> showTopLucky(player);
            case 3 -> ShopService.gI().opendShop(player, "ITEMS_LUCKY_ROUND", true);
        }
    }

    // ===== MENU NHẬN MỐC =====
    else if (player.idMark.getIndexMenu() == 5000) {

        int point = player.luckyRoundPoint;

        switch (select) {
            case 0 -> {
                if (player.reward100) {
                    Service.gI().sendThongBao(player, "Đã nhận quay 100 lần.");
                } else if (point < 100) {
                    Service.gI().sendThongBao(player, "Chưa đủ 100 lần.");
                } else {
                    player.reward100 = true;
                    giveReward(player, 100);
                }
            }

            case 1 -> {
                if (player.reward200) {
                    Service.gI().sendThongBao(player, "Đã nhận quay 200 lần.");
                } else if (point < 200) {
                    Service.gI().sendThongBao(player, "Chưa đủ 200 lần.");
                } else {
                    player.reward200 = true;
                    giveReward(player, 200);
                }
            }

            case 2 -> {
                if (player.reward300) {
                    Service.gI().sendThongBao(player, "Đã nhận quay 300 lần");
                } else if (point < 300) {
                    Service.gI().sendThongBao(player, "Chưa đủ 300 lần.");
                } else {
                    player.reward300 = true;
                    giveReward(player, 300);
                }
            }

            case 3 -> {
                if (player.reward500) {
                    Service.gI().sendThongBao(player, "Đã nhận quay 500 lần");
                } else if (point < 500) {
                    Service.gI().sendThongBao(player, "Chưa đủ 500 lần.");
                } else {
                    player.reward500 = true;
                    giveReward(player, 500);
                }
            }

            case 4 -> {
                if (player.reward700) {
                    Service.gI().sendThongBao(player, "Đã nhận mốc 700.");
                } else if (point < 700) {
                    Service.gI().sendThongBao(player, "Chưa đủ 700 lần.");
                } else {
                    player.reward700 = true;
                    giveReward(player, 700);
                }
            }

            case 5 -> {
                if (player.reward1000) {
                    Service.gI().sendThongBao(player, "Đã nhận mốc 1000.");
                } else if (point < 1000) {
                    Service.gI().sendThongBao(player, "Chưa đủ 1000 lần.");
                } else {
                    player.reward1000 = true;
                    giveReward(player, 1000);
                }
            }
        }
    }
}
    // ================= MENU MỐC ĐIỂM =================
   private void showMilestoneMenu(Player player) {

    int point = player.luckyRoundPoint;

    String text = "Số lần đã Quay Tay hiện tại: " + point + "\n\n"
            + "Mốc 100 lần: Thú Cưỡi VIP Kháng Bị Gank (TDHS)\n"
            + "Mốc 200 lần: Đeo Lưng VIP\n"
            + "Mốc 300 lần: PET CỰC VIP\n"
            + "Mốc 500 lần: Trứng Mabư\n"
            + "Mốc 700 lần: Bông Tay Porata Cấp 2\n"
            + "Mốc 1000 lần: Giáp Tập Luỵen Cấp 4";

    this.createOtherMenu(player, 5000, text,
            "Nhận 100",
            "Nhận 200",
            "Nhận 300",
            "Nhận 500",
            "Nhận 700",
            "Nhận 1000");
}
    // ================= TRAO QUÀ =================
   private void giveReward(Player player, int milestone) {

     if (InventoryService.gI().getCountEmptyBag(player) <= 1) {
        Service.gI().sendThongBao(player, "Hành trang đã đầy");
        return;
    }
    Item item = null;

    switch (milestone) {

        case 100 -> {
            item = ItemService.gI().createNewItem((short) 532);
            item.itemOptions.add(new Item.ItemOption(50, 6));
            item.itemOptions.add(new Item.ItemOption(77, 6));
            item.itemOptions.add(new Item.ItemOption(103, 6));
            item.itemOptions.add(new Item.ItemOption(106, 1));
        }

        case 200 -> {
            item = ItemService.gI().createNewItem((short) 1680);
            item.itemOptions.add(new Item.ItemOption(50, 12));
            item.itemOptions.add(new Item.ItemOption(77, 12));
            item.itemOptions.add(new Item.ItemOption(103, 12));
        }

        case 300 -> {
            item = ItemService.gI().createNewItem((short) 1631);
            item.itemOptions.add(new Item.ItemOption(50, 17));
            item.itemOptions.add(new Item.ItemOption(77, 17));
            item.itemOptions.add(new Item.ItemOption(103, 17));
            
        }
        case 500 -> {
    item = ItemService.gI().createNewItem((short) 568);
    item.quantity = 1;
}
case 700 -> {
    item = ItemService.gI().createNewItem((short) 921);
    item.itemOptions.add(new Item.ItemOption(50, 10));
    item.itemOptions.add(new Item.ItemOption(77, 10));
    item.itemOptions.add(new Item.ItemOption(103, 10));
    item.itemOptions.add(new Item.ItemOption(30, 1));
}

case 1000 -> {
    item = ItemService.gI().createNewItem((short) 1716);
    item.itemOptions.add(new Item.ItemOption(9, 1)); // 1%
    item.itemOptions.add(new Item.ItemOption(77, 10));
    item.itemOptions.add(new Item.ItemOption(103, 10));
    item.itemOptions.add(new Item.ItemOption(30, 1));
}
    }

    if (item == null) return;

    InventoryService.gI().addItemBag(player, item);
    InventoryService.gI().sendItemBags(player);

    Service.gI().sendThongBao(player,
            "Nhận thành công sau khi Quay Tay " + milestone + " lần!");
}
    // ================= BXH TOP 10 =================
  private void showTopLucky(Player player) {

    StringBuilder text = new StringBuilder("TOP 10 Quay Tay\n\n");

 try (java.sql.Connection con = LocalManager.gI().getConnection();
     java.sql.PreparedStatement ps = con.prepareStatement(
     "SELECT name, lucky_round_point FROM player ORDER BY lucky_round_point DESC LIMIT 10");
     java.sql.ResultSet rs = ps.executeQuery()) {

    int i = 1;
    while (rs.next()) {
        text.append(i++)
            .append(". ")
            .append(rs.getString("name"))
            .append(" - ")
            .append(rs.getInt("lucky_round_point"))
            .append(" lần\n");
    }

    } catch (Exception e) {
        e.printStackTrace();
    }

    this.createOtherMenu(player, ConstNpc.IGNORE_MENU, text.toString(), "Đóng");
}}

