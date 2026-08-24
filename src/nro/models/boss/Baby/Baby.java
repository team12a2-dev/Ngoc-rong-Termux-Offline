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
import nro.models.utils.Util;

public class Baby extends Boss {

    public Baby() throws Exception {
        super(BossID.BABY, BossesData.BABY, BossesData.BABY_2, BossesData.BABY_3);
    }

  @Override
public void reward(Player plKill) {

    int x = this.location.x;
    int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

    // ================== 30% RƠI ĐỒ THẦN LINH ==================
    if (Util.isTrue(30, 100)) {

        ItemMap it = ItemService.gI().randDoTLBoss(this.zone, 1, x, y, plKill.id);
        if (it != null) {
            Service.gI().dropItemMap(zone, it);
        }

    } else {

        // ================== 70% RƠI ĐỒ CUSTOM ==================
        int[] dropItems = {
            241, 253, 265, 277,
            233, 245, 257, 269,
            237, 249, 261, 273,
            281
        };

        int itemId = dropItems[Util.nextInt(dropItems.length)];
        ItemMap it = new ItemMap(zone, itemId, 1, x, y, plKill.id);

        // ===== OPTION 107 (Sao pha lê) =====
        int rd = Util.nextInt(100);
        int sao;

        if (rd < 70) {        // 70%
            sao = 0;
        } else if (rd < 95) { // 25%
            sao = 1;
        } else {              // 5%
            sao = 2;
        }

        it.options.add(new Item.ItemOption(107, sao));

        // ===== OPTION THEO TỪNG ITEM =====
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
