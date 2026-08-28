package nro.models.services;

import java.util.ArrayList;
import java.util.List;
import nro.models.item.Item;
import nro.models.item.Item.ItemOption;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.mob.Mob;
import nro.models.player.Player;
import nro.models.utils.Util;

/**
 * Drop trang bị có lỗ sao theo sức mạnh map/quái.
 * Tỷ lệ dùng basis 1.000.000 để hỗ trợ các mức phần trăm rất nhỏ.
 */
public final class StarEquipmentDropService {

    private static final StarEquipmentDropService INSTANCE = new StarEquipmentDropService();
    private static final int DENOMINATOR = 1_000_000;

    // Tỷ lệ tổng theo tier: 0,20%; 0,12%; 0,07%; 0,035%; 0,015%; 0,005%.
    private static final int[] DROP_CHANCE_BP = {2_000, 1_200, 700, 350, 150, 50};

    private StarEquipmentDropService() {
    }

    public static StarEquipmentDropService gI() {
        return INSTANCE;
    }

    /** Roll tối đa một trang bị cho mỗi lần quái chết. */
    public ItemMap roll(Player player, Mob mob, int x, int yEnd) {
        if (player == null || mob == null || mob.zone == null || mob.isBigBoss()) {
            return null;
        }

        int tier = getTier(mob.zone.map.mapId, mob.point.getHpFull());
        if (!Util.isTrue(DROP_CHANCE_BP[tier - 1], DENOMINATOR)) {
            return null;
        }

        int star = rollStar(tier);
        ItemMap item = createItem(player, mob.zone, tier, star, x, yEnd);
        if (item != null && item.itemTemplate != null) {
            item.options.add(new ItemOption(107, star));
        }
        return item;
    }

    /**
     * Gán tier ưu tiên theo ba map đầu của mỗi hành tinh; các map còn lại
     * được phân tầng theo HP tối đa của mob để không phụ thuộc ID map.
     */
    public int getTier(int mapId, int mobHp) {
        if (mapId == 1 || mapId == 8 || mapId == 15) {
            return 1;
        }
        if (mapId == 2 || mapId == 9 || mapId == 16) {
            return 2;
        }
        if (mapId == 3 || mapId == 11 || mapId == 17) {
            return 3;
        }

        if (mobHp < 100_000) {
            return 1;
        }
        if (mobHp < 500_000) {
            return 2;
        }
        if (mobHp < 2_000_000) {
            return 3;
        }
        if (mobHp < 10_000_000) {
            return 4;
        }
        if (mobHp < 50_000_000) {
            return 5;
        }
        return 6;
    }

    private int rollStar(int tier) {
        int roll = Util.nextInt(100);
        if (tier == 1) {
            return roll < 50 ? 1 : roll < 85 ? 2 : 3;
        }
        if (tier == 2) {
            return roll < 35 ? 1 : roll < 70 ? 2 : roll < 95 ? 3 : 4;
        }
        if (tier == 3) {
            return roll < 20 ? 1 : roll < 55 ? 2 : roll < 85 ? 3 : roll < 97 ? 4 : 5;
        }
        if (tier == 4) {
            return roll < 10 ? 1 : roll < 35 ? 2 : roll < 67 ? 3 : roll < 89 ? 4 : roll < 98 ? 5 : 6;
        }
        if (tier == 5) {
            return roll < 5 ? 1 : roll < 20 ? 2 : roll < 45 ? 3 : roll < 75 ? 4 : roll < 92 ? 5 : roll < 99 ? 6 : 7;
        }
        return roll < 2 ? 1 : roll < 10 ? 2 : roll < 28 ? 3 : roll < 58 ? 4 : roll < 83 ? 5 : roll < 97 ? 6 : 7;
    }

    private ItemMap createItem(Player player, Zone zone, int tier, int star, int x, int yEnd) {
        if (tier >= 5) {
            // Tầng rất cao dùng pool Thần Linh hiện có để chất lượng item tăng theo map.
            return ItemService.gI().randDoTL(zone, 1, x, yEnd, player.id);
        }

        short tempId = (short) ItemService.gI().randDoSao(player.gender);
        ItemMap item = new ItemMap(zone, tempId, 1, x, yEnd, player.id);
        List<ItemOption> options = ItemService.gI().getListOptionItemShop(tempId);
        if (!options.isEmpty()) {
            item.options = new ArrayList<>();
            for (ItemOption option : options) {
                item.options.add(new ItemOption(option.optionTemplate.id, option.param));
            }
        }
        return item;
    }
}
