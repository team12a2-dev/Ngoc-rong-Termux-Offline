package nro.models.services;

import java.util.ArrayList;
import java.util.List;
import nro.models.item.Item;
import nro.models.item.Item.ItemOption;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.map.service.MapService;
import nro.models.mob.Mob;
import nro.models.player.Player;
import nro.models.utils.Util;

/** Drop sét kích hoạt hiếm theo tier map và sức mạnh quái. */
public final class ActivationEquipmentDropService {

    private static final ActivationEquipmentDropService INSTANCE = new ActivationEquipmentDropService();
    private static final int DENOMINATOR = 1_000_000;

    // Tỷ lệ dành cho tân thủ: 5% ở mọi tier để dễ kiểm tra quyền lợi hạt mầm.
    private static final int[] DROP_CHANCE_BP = {50_000, 50_000, 50_000, 50_000, 50_000, 50_000};

    private ActivationEquipmentDropService() {
    }

    public static ActivationEquipmentDropService gI() {
        return INSTANCE;
    }

    public ItemMap roll(Player player, Mob mob, int x, int yEnd) {
        if (player == null || mob == null || mob.zone == null || mob.isBigBoss()
                || !hasSeed(player)) {
            return null;
        }

        int mapId = mob.zone.map.mapId;
        int tier = StarEquipmentDropService.gI().getTier(mapId, mob.point.getHpFull());
        if (!Util.isTrue(DROP_CHANCE_BP[tier - 1], DENOMINATOR)) {
            return null;
        }

        short tempId = chooseActivationItem(player.gender, tier);
        ItemMap item = new ItemMap(mob.zone, tempId, 1, x, yEnd, player.id);
        if (item.itemTemplate == null) {
            return null;
        }

        List<ItemOption> shopOptions = ItemService.gI().getListOptionItemShop(tempId);
        if (!shopOptions.isEmpty()) {
            item.options = new ArrayList<>();
            for (ItemOption option : shopOptions) {
                item.options.add(new ItemOption(option.optionTemplate.id, option.param));
            }
        }

        int[] randomOptions = ItemService.gI().randOptionItemKichHoat(player.gender);
        for (int optionId : randomOptions) {
            if (optionId > 0) {
                item.options.add(new ItemOption(optionId, 0));
            }
        }
        item.options.add(new ItemOption(30, 0));
        return item;
    }

    private boolean hasSeed(Player player) {
        return player != null && player.isNewMember;
    }

    private short chooseActivationItem(int gender, int tier) {
        // Tier 1–2 dùng nhóm trang bị khởi đầu; tier 3 trở lên dùng pool đồ sao
        // có template cấp cao hơn nhưng vẫn gắn option kích hoạt theo hệ phái.
        if (tier <= 2) {
            return (short) ItemService.gI().randTempItemKichHoat(gender);
        }
        return (short) ItemService.gI().randTempItemDoSao(gender);
    }
}
