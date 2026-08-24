package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.consts.ConstPlayer;
import nro.models.item.Item;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.shop.ShopService;
import nro.models.data.LocalManager;
import nro.models.utils.Util;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class Bulma extends Npc {

    public Bulma(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    // ================= MENU CHÍNH =================
    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            if (!TaskService.gI().checkDoneTaskTalkNpc(player, this)) {

                if (player.gender == ConstPlayer.TRAI_DAT) {
                    this.createOtherMenu(player, ConstNpc.BASE_MENU,
                            "Tuy cậu không có người yêu,\nNhưng cậu vẫn có thể tặng quà tớ nha,\n\n"
                                    + "Tuy quà cậu ít nhưng tớ không chê đâu\nNhưng cậu phải xếp hàng nha",
                            "Cửa\nhàng",
                            "Tặng\nquà",
                            "Nhận\nMốc",
                            "BXH\nSự Kiện");
                } else {
                    this.createOtherMenu(player, ConstNpc.BASE_MENU,
                            "Tuy cậu không có người yêu,\nNhưng cậu vẫn có thể tặng quà tớ nha\n\n" 
                            + "Tuy quà cậu ít nhưng tớ không chê đâu\nNhưng cậu phải xếp hành nha",
                            "Tặng\nquà",  "Nhận\nMốc",
                            "BXH\nSự Kiện");
                }
            }
        }
    }

    // ================= XỬ LÝ MENU =================
    @Override
    public void confirmMenu(Player player, int select) {
        if (!canOpenNpc(player)) return;

        // MENU CHÍNH
        if (player.idMark.isBaseMenu()) {

            if (player.gender == ConstPlayer.TRAI_DAT) {
                switch (select) {
                    case 0 -> ShopService.gI().opendShop(player, "BUNMA", true);
                    case 1 -> openTangQuaMenu(player);
                    case 2 -> showMilestoneMenu(player);
                    case 3 -> showTop2207(player);
                }
            } else {
                switch (select) {
                    case 0 -> openTangQuaMenu(player);
                      case 1 -> showMilestoneMenu(player);
                    case 2 -> showTop2207(player);
                }
            }
        }

        // MENU TẶNG QUÀ
        else if (player.idMark.getIndexMenu() == 1) {
            if (select == 0) {
                tangQua(player);
            }
        }

        // MENU NHẬN MỐC
        else if (player.idMark.getIndexMenu() == 2207) {

            int point = player.point_2207;

            switch (select) {

                case 0 -> {
                    if (player.reward_100_2207) {
                        Service.gI().sendThongBao(player, "Đã nhận mốc 100");
                    } else if (point < 100) {
                        Service.gI().sendThongBao(player, "Chưa đủ 100 điểm");
                    } else {
                        player.reward_100_2207 = true;
                        giveReward2207(player, 100);
                    }
                }

                case 1 -> {
                    if (player.reward_200_2207) {
                        Service.gI().sendThongBao(player, "Đã nhận mốc 200");
                    } else if (point < 200) {
                        Service.gI().sendThongBao(player, "Chưa đủ 200 điểm");
                    } else {
                        player.reward_200_2207 = true;
                        giveReward2207(player, 200);
                    }
                }

                case 2 -> {
                    if (player.reward_300_2207) {
                        Service.gI().sendThongBao(player, "Đã nhận mốc 300");
                    } else if (point < 300) {
                        Service.gI().sendThongBao(player, "Chưa đủ 300 điểm");
                    } else {
                        player.reward_300_2207 = true;
                        giveReward2207(player, 300);
                    }
                }

                case 3 -> {
                    if (player.reward_500_2207) {
                        Service.gI().sendThongBao(player, "Đã nhận mốc 500");
                    } else if (point < 500) {
                        Service.gI().sendThongBao(player, "Chưa đủ 500 điểm");
                    } else {
                        player.reward_500_2207 = true;
                        giveReward2207(player, 500);
                    }
                }
            }
        }
    }

    // ================= MENU MỐC =================
    private void showMilestoneMenu(Player player) {

        int point = player.point_2207;

        String text = "Điểm tặng quà hiện tại: " + point + "\n\n"
                + "Mốc 10: Đuôi Khỉ x2 TNSM\n"
                + "Mốc 200: Trứng Đệ Tử Mabư\n"
                + "Mốc 300: Avatar VIP\n"
                + "Mốc 500: Vật Phẩm Siêu Mạnh";

        this.createOtherMenu(player, 2207, text,
                "Nhận 100",
                "Nhận 200",
                "Nhận 300",
                "Nhận 500");
    }

    // ================= MENU TẶNG QUÀ =================
    private void openTangQuaMenu(Player player) {
        this.createOtherMenu(player, 1,
                "Muốn tặng quà cho tôi sao?\nCậu có bao nhiêu tiền trong ví\n"
                        + "Cần:\n"
                        + "- 99 Hoa Vô Sắc (Úp ở Xên 8)\n"
                        + "- 99 Ngọc Xanh\n"
                        + "- 9 Sô Cô La (Đi Săn TĐST)\n\n"
                        + "Thưởng: 1 cái nịt +1 điểm",
                "Đồng Ý",
                "Chấp nhận");
    }

    private void tangQua(Player player) {

        Item hoa = InventoryService.gI().findItemBag(player, 1508);
        Item socola = InventoryService.gI().findItemBag(player, 1507);

        if (hoa == null || hoa.quantity < 99
                || player.inventory.gem < 99
                || socola == null || socola.quantity < 9) {

            Service.gI().sendThongBao(player, "Bạn chưa đủ vật phẩm");
            return;
        }

        if (InventoryService.gI().getCountEmptyBag(player) == 0) {
            Service.gI().sendThongBao(player, "Hành trang đã đầy");
            return;
        }

        InventoryService.gI().subQuantityItemsBag(player, hoa, 99);
        InventoryService.gI().subQuantityItemsBag(player, socola, 9);

        player.inventory.gem -= 99;

        Item item = ItemService.gI().createNewItem((short) 1511);
        InventoryService.gI().addItemBag(player, item);

        player.point_2207++;

        InventoryService.gI().sendItemBags(player);
        Service.gI().sendMoney(player);

        Service.gI().sendThongBao(player,
                "Bạn nhận được cái nịt");
    }

    // ================= NHẬN MỐC =================
    private void giveReward2207(Player player, int milestone) {

        Item item = null;

        switch (milestone) {

          case 100 -> {
    item = ItemService.gI().createNewItem((short) 579);
    item.quantity = 10;
    item.itemOptions.add(new Item.ItemOption(30, 1));
}

            case 200 -> {
                item = ItemService.gI().createNewItem((short) 568);
                item.itemOptions.add(new Item.ItemOption(30, 1));
            }

            case 300 -> {

                int[] items = {227, 228, 229};
                int id = items[Util.nextInt(0, 3)];

                item = ItemService.gI().createNewItem((short) id);

                item.itemOptions.add(new Item.ItemOption(50, 25));
                item.itemOptions.add(new Item.ItemOption(77, 35));
                item.itemOptions.add(new Item.ItemOption(103, 35));
                item.itemOptions.add(new Item.ItemOption(5, 25));
            }

            case 500 -> {
                item = ItemService.gI().createNewItem((short) 12);
                item.itemOptions.add(new Item.ItemOption(30, 1));
            }
        }

        if (item == null) return;

        InventoryService.gI().addItemBag(player, item);
        InventoryService.gI().sendItemBags(player);

        Service.gI().sendThongBao(player,
                "Nhận thành công mốc " + milestone + " điểm!");
    }

    // ================= BXH =================
    private void showTop2207(Player player) {

        StringBuilder text = new StringBuilder("TOP 10 Tặng Quà Bulma\n\n");

        try (Connection con = LocalManager.gI().getConnection();
             PreparedStatement ps = con.prepareStatement(
                     "SELECT name, point_2207 FROM player ORDER BY point_2207 DESC LIMIT 10");
             ResultSet rs = ps.executeQuery()) {

            int i = 1;

            while (rs.next()) {
                text.append(i++)
                        .append(". ")
                        .append(rs.getString("name"))
                        .append(" - ")
                        .append(rs.getInt("point_2207"))
                        .append(" điểm\n");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        this.createOtherMenu(player, ConstNpc.IGNORE_MENU,
                text.toString(),
                "Đóng");
    }
}