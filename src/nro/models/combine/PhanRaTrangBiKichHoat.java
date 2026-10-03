package nro.models.combine;

import nro.models.consts.ConstNpc;
import nro.models.item.Item;
import nro.models.item.Item.ItemOption;
import nro.models.player.Player;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.Util;

/**
 *
 * @author By AmodsubVN
 */

public class PhanRaTrangBiKichHoat {

    public static class PhanRaTrangBi {

        private static final int RATIO_PHAN_RA = 100;      // 100% thành công
        private static final int[] OPTION_KICH_HOAT = {
            127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 233, 237, 241, 245
        };

        public static void showInfoCombine(Player player) {
            if (player.combineNew.itemsCombine.size() != 1) {
                CombineService.gI().baHatMit.createOtherMenu(player, ConstNpc.IGNORE_MENU, "Cần đặt 1 trang bị có chỉ số kích hoạt!", "Đóng");
                return;
            }

            Item item1 = player.combineNew.itemsCombine.get(0);

            if (!isValidItem(item1)) {
                CombineService.gI().baHatMit.createOtherMenu(player, ConstNpc.IGNORE_MENU, "Vật phẩm không phải là trang bị kích hoạt để phân rã!", "Đóng");
                return;
            }

            player.combineNew.goldCombine = 0;
            player.combineNew.gemCombine = 0;
            player.combineNew.ratioCombine = RATIO_PHAN_RA;

            String npcSay = "Con có chắc muốn phân rã " + item1.template.name + "\n"
                    + "và nhận 1 Khoáng tái chế (Không thể giao dịch)?";

            CombineService.gI().baHatMit.createOtherMenu(player, ConstNpc.MENU_START_COMBINE, npcSay,
                    "Phân rã", "Từ chối");
        }

        public static void ThucHienPhanRa(Player player) {
            if (player.combineNew.itemsCombine.size() != 1) {
                Service.gI().sendThongBao(player, "Cần đặt đúng 1 trang bị kích hoạt!");
                return;
            }

            Item item1 = player.combineNew.itemsCombine.get(0);

            if (!isValidItem(item1)) {
                Service.gI().sendThongBao(player, "Vật phẩm không đủ điều kiện để phân rã!");
                return;
            }

            if (InventoryService.gI().getCountEmptyBag(player) < 1) {
                Service.gI().sendThongBao(player, "Hành trang cần ít nhất 1 ô trống để nhận khoáng tái chế!");
                return;
            }

            if (item1.quantity < 1) {
                Service.gI().sendThongBao(player, "Không đủ vật phẩm để thực hiện!");
                return;
            }

            InventoryService.gI().subQuantityItemsBag(player, item1, 1);

            if (Util.isTrue(RATIO_PHAN_RA, 100)) {
                int khoangId = 1656;
                Item khoang = ItemService.gI().createNewItem((short) khoangId, 1);
                khoang.itemOptions.add(new ItemOption(30, 0)); // Không thể giao dịch
                InventoryService.gI().addItemBag(player, khoang);

                CombineService.gI().sendEffectSuccessCombine(player);
                Service.gI().sendThongBao(player, "Phân rã thành công! Bạn nhận được 1 " + khoang.template.name);
            } else {
                CombineService.gI().sendEffectFailCombine(player);
                Service.gI().sendThongBao(player, "Phân rã thất bại!");
            }

            InventoryService.gI().sendItemBags(player);
            Service.gI().sendMoney(player);
            CombineService.gI().reOpenItemCombine(player);
        }

        private static boolean isValidItem(Item item) {
            if (item == null || item.itemOptions == null) {
                return false;
            }
            for (ItemOption option : item.itemOptions) {
                if (option != null && option.optionTemplate != null) {
                    int id = option.optionTemplate.id;
                    if ((id >= 127 && id <= 144) || (id >= 233 && id <= 248)) {
                        return true;
                    }
                }
            }
            return false;
        }

    }
}


