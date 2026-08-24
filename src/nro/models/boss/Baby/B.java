package nro.models.boss.Baby;

import java.util.List;
import nro.models.consts.ConstPlayer;
import nro.models.boss.Boss;
import nro.models.boss.BossesData;
import nro.models.boss.BossID;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.services.TaskService;
import nro.models.utils.Util;

public class B extends Boss {

    public B() throws Exception {
        super(BossID.B, BossesData.B, BossesData.B2, BossesData.B3);
    }

    @Override
public void reward(Player plKill) {

    int x = this.location.x;
    int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

    // ================== 10% RƠI NHÓM 1 (BOSS) ==================
    if (Util.isTrue(20, 100)) {

        int[] dropItems = {
            241, 253, 265, 277,
            233, 245, 257, 269,
            237, 249, 261, 273,
            281
        };
        int itemId = dropItems[Util.nextInt(dropItems.length)];

        // Chỉ người hạ boss nhặt được
        ItemMap it = new ItemMap(zone, itemId, 1, x, y, plKill.id);

        // Option 107 random 0–2
        it.options.add(new Item.ItemOption(107, Util.nextInt(3, 4)));

        // Option theo nhóm item
        switch (itemId) {
            case 241:
            case 233:
            case 237:
                it.options.add(new Item.ItemOption(47, Util.nextInt(400, 550)));
                break;

            case 253:
            case 245:
            case 249:
                it.options.add(new Item.ItemOption(6, Util.nextInt(22000, 27000)));
                it.options.add(new Item.ItemOption(27, Util.nextInt(3000, 5000)));
                break;

            case 265:
            case 261:
            case 257:
                it.options.add(new Item.ItemOption(0, Util.nextInt(2100, 2400)));
                break;

            case 277:
            case 269:
            case 273:
                it.options.add(new Item.ItemOption(7, Util.nextInt(22000, 26000)));
                it.options.add(new Item.ItemOption(28, Util.nextInt(4000, 6000)));
                break;

            case 281:
                it.options.add(new Item.ItemOption(14, Util.nextInt(11, 13)));
                break;
        }

        Service.gI().dropItemMap(zone, it);
    }

    // ================== 10% RƠI ITEM 16 / 17 (x1) ==================
    if (Util.isTrue(20, 100)) {
        int itemId = Util.isTrue(50, 100) ? 16 : 17;
        ItemMap it = new ItemMap(zone, itemId, 1, x + 10, y, plKill.id);
        Service.gI().dropItemMap(zone, it);
    }


}

    @Override
    public void active() {
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
        }
        this.attack();
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack
    ) {
        if (!this.isDie()) {
            if (!piercing && Util.isTrue(this.nPoint.tlNeDon, 1000)) {
                this.chat("Xí hụt");
                return 0;
            }

            damage = (long) (damage * 0.7);

            damage = this.nPoint.subDameInjureWithDeff(damage / 2);

            if (!piercing && effectSkill.isShielding) {
                if (damage > nPoint.hpMax) {
                    EffectSkillService.gI().breakShield(this);
                }
                damage = damage / 4;
            }

            this.nPoint.subHP(damage);

            if (isDie()) {
                this.setDie(plAtt);
                die(plAtt);
            }
            return (int) damage;
        } else {
            return 0;
        }
    }

}
