package nro.models.boss.yardrat;

import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.ConstItem;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.utils.Util;

/** A configured Yardrat boss whose reward contributes to the Goku SSJ2 exchange. */
public final class YardratBoss extends Yardart {

    public YardratBoss(int id, BossData data) throws Exception {
        super(id, data);
    }

    @Override
    public void reward(Player player) {
        super.reward(player);
        if (player == null || player.isBot || this.zone == null || this.location == null) {
            return;
        }

        int points = biKiepPointsFor((int) this.id);
        if (points <= 0) {
            return;
        }

        int x = this.location.x + Util.nextInt(-20, 20);
        int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);
        ItemMap biKiep = new ItemMap(this.zone, ConstItem.BI_KIEP, 1, x, y, player.id);
        biKiep.options.add(new Item.ItemOption(31, points));
        Service.gI().dropItemMap(this.zone, biKiep);
    }

    private static int biKiepPointsFor(int bossId) {
        return switch (bossId) {
            case BossID.TAP_SU_0, BossID.TAP_SU_1, BossID.TAP_SU_2,
                    BossID.TAP_SU_3, BossID.TAP_SU_4 -> 10;
            case BossID.TAN_BINH_5, BossID.TAN_BINH_0, BossID.TAN_BINH_1,
                    BossID.TAN_BINH_2, BossID.TAN_BINH_3, BossID.TAN_BINH_4 -> 20;
            case BossID.CHIEN_BINH_5, BossID.CHIEN_BINH_0, BossID.CHIEN_BINH_1,
                    BossID.CHIEN_BINH_2, BossID.CHIEN_BINH_3, BossID.CHIEN_BINH_4 -> 30;
            case BossID.DOI_TRUONG_5 -> 50;
            default -> 0;
        };
    }
}
