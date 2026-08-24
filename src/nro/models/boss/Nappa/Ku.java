package nro.models.boss.Nappa;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;
import nro.models.item.Item;
import java.util.Random;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

public class Ku extends Boss {

    private long st;

    public Ku() throws Exception {
        super(BossID.KU, false, true, BossesData.KU);
    }

    @Override
    public void joinMap() {
        super.joinMap();
        st = System.currentTimeMillis();
    }
// @Override
// public int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
//     if (this.isDie()) {
//         return 0;
//     }

//     // damage tối đa = 1% HP hiện tại boss
//     long maxDamage = this.nPoint.hp / 100;

//     if (maxDamage < 1) {
//         maxDamage = 1;
//     }

//     // nếu damage người chơi lớn hơn giới hạn thì giảm xuống
//     if (damage > maxDamage) {
//         damage = maxDamage;
//     }

//     damage = this.nPoint.subDameInjureWithDeff(damage);
//     this.nPoint.subHP(damage);

//     if (this.isDie()) {
//         this.setDie(plAtt);
//         die(plAtt);
//     }

//     return (int) damage;
// }
@Override
public void reward(Player plKill) {


    Random rand = new Random();

    // ===== 20% rơi item 568 (private) =====
    if (rand.nextInt(100) < 30) {

        ItemMap itemDrop = new ItemMap(
                this.zone,
                568, // ID item
                1,
                this.location.x,
                this.zone.map.yPhysicInTop(
                        this.location.x,
                        this.location.y - 24
                ),
                plKill.id // chỉ người giết nhặt
        );

        Service.gI().dropItemMap(this.zone, itemDrop);

    } else {

        // ===== 80% rơi 10 cục item 190 x5000 rải vòng tròn =====
        int totalDrop = 10;
        int radius = 60;

        for (int i = 0; i < totalDrop; i++) {

            double angle = 2 * Math.PI * i / totalDrop;

            int dropX = this.location.x + (int) (radius * Math.cos(angle));
            int dropY = this.zone.map.yPhysicInTop(
                    dropX,
                    this.location.y - 24
            );

            ItemMap itemDrop = new ItemMap(
                    this.zone,
                    190,
                    5000,
                    dropX,
                    dropY,
                    -1 // ai cũng nhặt được
            );

            Service.gI().dropItemMap(this.zone, itemDrop);
        }
    }
}  @Override
    public void autoLeaveMap() {
        if (Util.canDoWithTime(st, 900000)) {
            this.changeStatus(BossStatus.LEAVE_MAP);
        }
//        if (this.zone != null && this.zone.getNumOfPlayers() > 0) {
//            st = System.currentTimeMillis();
//        }
    }
}
