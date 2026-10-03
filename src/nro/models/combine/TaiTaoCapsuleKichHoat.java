package nro.models.combine;

import nro.models.consts.ConstNpc;
import nro.models.item.Item;
import java.util.ArrayList;
import java.util.List;
import nro.models.player.Player;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.Util;

/**
 *
 * @author By AmodsubVN
 */
public class TaiTaoCapsuleKichHoat {

    private static final int GEM_TAI_TAO = 500;
    private static final int RATIO_TAI_TAO = 100;

    private static final int KHOANG_TAI_CHE_ID = 1656;
    private static final int CAPSULE_VO_ID = 1634;
    private static final int CAPSULE_KICH_HOAT_ID = 1655;

    private static final int REQUIRED_KHOANG = 3;
    private static final int REQUIRED_CAPSULE_VO = 1;

    private static boolean isKhoangTaiChe(int itemId) {
        return itemId == KHOANG_TAI_CHE_ID;
    }

    public static void showInfoCombine(Player player) {
        if (player.combineNew.itemsCombine.isEmpty()) {
            CombineService.gI().baHatMit.createOtherMenu(player, ConstNpc.IGNORE_MENU,
                    "Cần đặt đủ vật phẩm!", "Đóng");
            return;
        }

        int countKhoang = 0;
        int countCapsuleVo = 0;

        for (Item item : player.combineNew.itemsCombine) {
            if (item != null && item.template != null) {
                if (isKhoangTaiChe(item.template.id)) {
                    countKhoang += item.quantity;
                } else if (item.template.id == CAPSULE_VO_ID) {
                    countCapsuleVo += item.quantity;
                }
            }
        }

        if (countKhoang < REQUIRED_KHOANG || countCapsuleVo < REQUIRED_CAPSULE_VO) {
            CombineService.gI().baHatMit.createOtherMenu(player, ConstNpc.IGNORE_MENU,
                    "Thiếu vật phẩm cần thiết!\n"
                    + "- Cần: " + REQUIRED_KHOANG + " Khoáng tái chế\n"
                    + "- Cần: " + REQUIRED_CAPSULE_VO + " Capsule Vỡ\n"
                    + "- Cần: " + GEM_TAI_TAO + " ngọc xanh",
                    "Đóng");
            return;
        }

        player.combineNew.gemCombine = GEM_TAI_TAO;
        player.combineNew.ratioCombine = RATIO_TAI_TAO;

        String npcSay = "|2|Tái chế Set Kích Hoạt\n\n"
                + "|2|Tỉ lệ thành công: " + RATIO_TAI_TAO + "%\n"
                + "|2|Cần: " + REQUIRED_KHOANG + " Khoáng tái chế\n"
                + "|2|Cần: " + REQUIRED_CAPSULE_VO + " Capsule Vỡ\n"
                + "|2|Cần: " + GEM_TAI_TAO + " ngọc xanh\n"
                + "|2|Nhận: 1 Capsule tự chọn Set Kích Hoạt\n";

        if (player.inventory.gem < GEM_TAI_TAO) {
            npcSay += "|7|Còn thiếu " + (GEM_TAI_TAO - player.inventory.gem) + " ngọc xanh\n";
            CombineService.gI().baHatMit.createOtherMenu(player, ConstNpc.IGNORE_MENU,
                    npcSay, "Đóng");
        } else {
            CombineService.gI().baHatMit.createOtherMenu(player,
                    ConstNpc.MENU_START_COMBINE,
                    npcSay,
                    "Nâng cấp\n" + GEM_TAI_TAO + " ngọc", "Từ chối");
        }
    }

    public static void thucHienTaiTao(Player player) {
        if (player.combineNew.itemsCombine.isEmpty()) {
            Service.gI().sendThongBao(player, "Cần đặt đủ vật phẩm!");
            return;
        }

        int countKhoang = 0;
        int countCapsuleVo = 0;

        for (Item item : player.combineNew.itemsCombine) {
            if (item != null && item.template != null) {
                if (isKhoangTaiChe(item.template.id)) {
                    countKhoang += item.quantity;
                } else if (item.template.id == CAPSULE_VO_ID) {
                    countCapsuleVo += item.quantity;
                }
            }
        }

        if (countKhoang < REQUIRED_KHOANG || countCapsuleVo < REQUIRED_CAPSULE_VO) {
            Service.gI().sendThongBao(player,
                    "Không đủ vật phẩm cần thiết để Nâng cấp!");
            return;
        }

        if (player.inventory.gem < GEM_TAI_TAO) {
            Service.gI().sendThongBao(player,
                    "Không đủ ngọc xanh để thực hiện! Còn thiếu " + (GEM_TAI_TAO - player.inventory.gem) + " ngọc");
            return;
        }

        player.inventory.subGem(GEM_TAI_TAO);

        removeKhoangTaiChe(player, REQUIRED_KHOANG);
        removeItem(player, CAPSULE_VO_ID, REQUIRED_CAPSULE_VO);

        if (Util.isTrue(RATIO_TAI_TAO, 100)) {
            Item newItem = ItemService.gI().createNewItem((short) CAPSULE_KICH_HOAT_ID);
            newItem.quantity = 1;
            InventoryService.gI().addItemBag(player, newItem);

            CombineService.gI().sendEffectSuccessCombine(player);
            Service.gI().sendThongBao(player,
                    "Tái chế thành công! Nhận 1 Capsule tự chọn Set Kích Hoạt");
        } else {
            CombineService.gI().sendEffectFailCombine(player);
            Service.gI().sendThongBao(player,
                    "Tái chế thất bại!");
        }

        InventoryService.gI().sendItemBags(player);
        Service.gI().sendMoney(player);
        CombineService.gI().reOpenItemCombine(player);
    }

    private static void removeKhoangTaiChe(Player player, int quantityToRemove) {
        List<Item> items = new ArrayList<>(player.combineNew.itemsCombine);
        for (Item item : items) {
            if (item != null && item.template != null && quantityToRemove > 0) {
                if (isKhoangTaiChe(item.template.id)) {
                    int remove = Math.min(item.quantity, quantityToRemove);
                    InventoryService.gI().subQuantityItemsBag(player, item, remove);
                    quantityToRemove -= remove;
                }
            }
        }
    }

    private static void removeItem(Player player, int itemId, int quantityToRemove) {
        List<Item> items = new ArrayList<>(player.combineNew.itemsCombine);
        for (Item item : items) {
            if (item != null && item.template != null && quantityToRemove > 0) {
                if (item.template.id == itemId) {
                    int remove = Math.min(item.quantity, quantityToRemove);
                    InventoryService.gI().subQuantityItemsBag(player, item, remove);
                    quantityToRemove -= remove;
                }
            }
        }
    }
}
