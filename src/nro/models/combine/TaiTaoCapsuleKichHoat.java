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

    // Khoáng tái chế: 1656 hoặc 555 -> 567
    private static final int KHOANG_TAI_CHE_ID = 1656;
    private static final int KHOANG_TAI_CHE_MIN = 555;
    private static final int KHOANG_TAI_CHE_MAX = 567;

    private static final int REQUIRED_KHOANG = 3;
    private static final int REQUIRED_CAPSULE = 1;

    // ================== CHECK KHOÁNG ==================
    private static boolean isKhoangTaiChe(int itemId) {
        return itemId == KHOANG_TAI_CHE_ID || (itemId >= KHOANG_TAI_CHE_MIN && itemId <= KHOANG_TAI_CHE_MAX);
    }

    private static boolean isCapsuleVo(int itemId) {
        return itemId == 1634;
    }

    // ================== SHOW INFO ==================
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
                } else if (isCapsuleVo(item.template.id)) {
                    countCapsuleVo += item.quantity;
                }
            }
        }

        if (countKhoang < REQUIRED_KHOANG || countCapsuleVo < REQUIRED_CAPSULE) {
            CombineService.gI().baHatMit.createOtherMenu(player, ConstNpc.IGNORE_MENU,
                    "Thiếu vật phẩm cần thiết!\n"
                    + "- Cần: " + REQUIRED_KHOANG + " Khoáng tái chế (bất kỳ)\n"
                    + "- Cần: " + REQUIRED_CAPSULE + " Capsule Vỡ",
                    "Đóng");
            return;
        }

        player.combineNew.goldCombine = 0;
        player.combineNew.gemCombine = GEM_TAI_TAO;
        player.combineNew.ratioCombine = RATIO_TAI_TAO;

        String npcSay = "Con có chắc muốn dùng " + REQUIRED_KHOANG + " Khoáng tái chế và " + REQUIRED_CAPSULE + " Capsule Vỡ\n"
                + "để tái tạo thành 1 Capsule Kích Hoạt (Không thể giao dịch)?";

        if (player.inventory.gem < GEM_TAI_TAO) {
            npcSay += "\nCòn thiếu "
                    + Util.numberToMoney(GEM_TAI_TAO - player.inventory.gem)
                    + " ngọc xanh";
            CombineService.gI().baHatMit.createOtherMenu(player, ConstNpc.IGNORE_MENU,
                    npcSay, "Đóng");
        } else {
            CombineService.gI().baHatMit.createOtherMenu(player,
                    ConstNpc.MENU_START_COMBINE,
                    npcSay,
                    "Tái tạo\n" + Util.numberToMoney(GEM_TAI_TAO) + " ngọc",
                    "Từ chối");
        }
    }

    // ================== THỰC HIỆN ==================
    public static void thucHienTaiTao(Player player) {
        if (player.combineNew.itemsCombine.isEmpty()) {
            Service.gI().sendThongBao(player, "Cần đặt đủ vật phẩm!");
            return;
        }

        int countKhoang = 0;
        int countCapsule = 0;

        for (Item item : player.combineNew.itemsCombine) {
            if (item != null && item.template != null) {
                if (isKhoangTaiChe(item.template.id)) {
                    countKhoang += item.quantity;
                } else if (isCapsuleVo(item.template.id)) {
                    countCapsule += item.quantity;
                }
            }
        }

        if (countKhoang < REQUIRED_KHOANG || countCapsule < REQUIRED_CAPSULE) {
            Service.gI().sendThongBao(player,
                    "Không đủ vật phẩm cần thiết để Tái tạo Capsule!");
            return;
        }

        if (player.inventory.gem < GEM_TAI_TAO) {
            Service.gI().sendThongBao(player,
                    "Không đủ ngọc xanh để thực hiện!");
            return;
        }

        if (InventoryService.gI().getCountEmptyBag(player) < 1) {
            Service.gI().sendThongBao(player, "Hành trang cần ít nhất 1 ô trống để nhận Capsule!");
            return;
        }

        player.inventory.gem -= GEM_TAI_TAO;

        removeKhoangTaiChe(player, REQUIRED_KHOANG);
        removeCapsuleVo(player, REQUIRED_CAPSULE);

        if (Util.isTrue(RATIO_TAI_TAO, 100)) {
            int itemId = 1655;
            Item newItem = ItemService.gI().createNewItem((short) itemId, 1);
            newItem.itemOptions.add(new Item.ItemOption(30, 0)); // Không thể giao dịch
            InventoryService.gI().addItemBag(player, newItem);

            CombineService.gI().sendEffectSuccessCombine(player);
            Service.gI().sendThongBao(player,
                    "Tái tạo thành công! Bạn nhận được 1 " + newItem.template.name);
        } else {
            CombineService.gI().sendEffectFailCombine(player);
            Service.gI().sendThongBao(player,
                    "Tái tạo thất bại!");
        }

        InventoryService.gI().sendItemBags(player);
        Service.gI().sendMoney(player);
        CombineService.gI().reOpenItemCombine(player);
    }

    // ================== REMOVE KHOÁNG ==================
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

    // ================== REMOVE CAPSULE VỠ ==================
    private static void removeCapsuleVo(Player player, int quantityToRemove) {
        List<Item> items = new ArrayList<>(player.combineNew.itemsCombine);
        for (Item item : items) {
            if (item != null && item.template != null && quantityToRemove > 0) {
                if (isCapsuleVo(item.template.id)) {
                    int remove = Math.min(item.quantity, quantityToRemove);
                    InventoryService.gI().subQuantityItemsBag(player, item, remove);
                    quantityToRemove -= remove;
                }
            }
        }
    }
}

