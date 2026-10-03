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

    // Tỷ lệ tổng theo tier: 0,05%; 0,03%; 0,02%; 0,01%; 0,005%; 0,002%.
    private static final int[] DROP_CHANCE_BP = {500, 300, 200, 100, 50, 20};

    private StarEquipmentDropService() {
    }

    public static StarEquipmentDropService gI() {
        return INSTANCE;
    }

    /** Roll tối đa một trang bị cho mỗi lần quái chết. */
    public ItemMap roll(Player player, Mob mob, int x, int yEnd) {
        if (ServerLaunchConfigService.gI().isBlockStarCrystalItemDrops()) {
            return null;
        }
        if (player == null || mob == null || mob.zone == null || mob.isBigBoss() || !hasSeed(player)) {
            return null;
        }

        int mapId = mob.zone.map.mapId;
        int tier = getTier(mapId, mob.point.getHpFull());
        int chance = DROP_CHANCE_BP[tier - 1];
        if (player.itemTime != null && player.itemTime.isUseCoBonLa) {
            chance *= 2;
        }
        if (!Util.isTrue(chance, DENOMINATOR)) {
            return null;
        }

        int star = rollStar(tier);
        ItemMap item = createItem(player, mob.zone, tier, star, x, yEnd);
        if (item != null && item.itemTemplate != null) {
            item.options.add(new ItemOption(107, star));
        }
        return item;
    }

    public boolean hasSeed(Player player) {
        return player != null && player.isNewMember;
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

    /**
     * Roll số lỗ sao pha lê (chỉ từ 1 đến 3 sao).
     */
    private int rollStar(int tier) {
        int roll = Util.nextInt(100);
        if (tier == 1) {
            // Tier 1: 65% 1 sao, 25% 2 sao, 10% 3 sao
            return roll < 65 ? 1 : roll < 90 ? 2 : 3;
        }
        if (tier == 2) {
            // Tier 2: 55% 1 sao, 30% 2 sao, 15% 3 sao
            return roll < 55 ? 1 : roll < 85 ? 2 : 3;
        }
        if (tier == 3) {
            // Tier 3: 45% 1 sao, 35% 2 sao, 20% 3 sao
            return roll < 45 ? 1 : roll < 80 ? 2 : 3;
        }
        if (tier == 4) {
            // Tier 4: 35% 1 sao, 40% 2 sao, 25% 3 sao
            return roll < 35 ? 1 : roll < 75 ? 2 : 3;
        }
        if (tier == 5) {
            // Tier 5: 25% 1 sao, 45% 2 sao, 30% 3 sao
            return roll < 25 ? 1 : roll < 70 ? 2 : 3;
        }
        // Tier 6: 15% 1 sao, 50% 2 sao, 35% 3 sao
        return roll < 15 ? 1 : roll < 65 ? 2 : 3;
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
