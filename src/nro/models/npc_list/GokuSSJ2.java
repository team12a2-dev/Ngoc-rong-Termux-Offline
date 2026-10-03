package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.item.Item;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.Util;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class GokuSSJ2 extends Npc {

    public GokuSSJ2(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    private int getBiKiepCount(Player player) {
        int count = 0;
        if (player.inventory != null && player.inventory.itemsBag != null) {
            for (Item item : player.inventory.itemsBag) {
                if (item != null && item.isNotNullItem() && item.template.id == 590) {
                    boolean hasOption31 = false;
                    for (Item.ItemOption op : item.itemOptions) {
                        if (op.optionTemplate != null && op.optionTemplate.id == 31) {
                            count += op.param;
                            hasOption31 = true;
                            break;
                        }
                    }
                    if (!hasOption31) {
                        count += item.quantity;
                    }
                }
            }
        }
        return count;
    }

    private boolean subBiKiep(Player player, int amount) {
        if (getBiKiepCount(player) < amount) {
            return false;
        }
        int need = amount;
        for (int i = 0; i < player.inventory.itemsBag.size(); i++) {
            Item item = player.inventory.itemsBag.get(i);
            if (item != null && item.isNotNullItem() && item.template.id == 590) {
                boolean hasOption31 = false;
                for (Item.ItemOption op : item.itemOptions) {
                    if (op.optionTemplate != null && op.optionTemplate.id == 31) {
                        hasOption31 = true;
                        if (op.param <= need) {
                            need -= op.param;
                            InventoryService.gI().removeItemBag(player, item);
                        } else {
                            op.param -= need;
                            need = 0;
                        }
                        break;
                    }
                }
                if (!hasOption31) {
                    if (item.quantity <= need) {
                        need -= item.quantity;
                        InventoryService.gI().removeItemBag(player, item);
                    } else {
                        item.quantity -= need;
                        need = 0;
                    }
                }
                if (need <= 0) {
                    break;
                }
            }
        }
        return true;
    }

    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            int soluong = getBiKiepCount(player);
            this.createOtherMenu(player, ConstNpc.BASE_MENU,
                    "Hãy cố gắng luyện tập\nThu thập 9.999 bí kiếp để đổi trang phục Yardrat nhé!\n(Hiện có: " + Util.formatNumber(soluong) + "/9.999 bí kiếp)",
                    "Nhận\nthưởng", "OK");
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            if (player.idMark.getIndexMenu() == ConstNpc.BASE_MENU) {
                if (select == 0) {
                    int soluong = getBiKiepCount(player);
                    if (soluong < 9999) {
                        Service.gI().sendThongBaoOK(player, "Bạn chưa đủ 9.999 bí kiếp Yardrat để đổi trang phục!\n(Hiện có: " + Util.formatNumber(soluong) + "/9.999 bí kiếp)");
                        return;
                    }
                    if (InventoryService.gI().getCountEmptyBag(player) == 0) {
                        Service.gI().sendThongBao(player, "Hành trang của bạn không đủ chỗ trống!");
                        return;
                    }
                    if (subBiKiep(player, 9999)) {
                        Item yardart = ItemService.gI().createNewItem((short) (player.gender + 592));
                        yardart.itemOptions.add(new Item.ItemOption(47, 400));
                        yardart.itemOptions.add(new Item.ItemOption(97, 10));
                        yardart.itemOptions.add(new Item.ItemOption(14, 10));
                        yardart.itemOptions.add(new Item.ItemOption(33, 0));
                        InventoryService.gI().addItemBag(player, yardart);
                        InventoryService.gI().sendItemBags(player);
                        Service.gI().sendThongBaoOK(player, "Chúc mừng bạn đã nhận được Võ phục Yardrat!");
                    } else {
                        Service.gI().sendThongBao(player, "Có lỗi xảy ra, vui lòng thử lại!");
                    }
                }
            }
        }
    }
}
