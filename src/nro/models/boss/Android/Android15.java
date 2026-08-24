package nro.models.boss.Android;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import java.util.Random;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

public class Android15 extends Boss {

    public boolean callApk13;

    public Android15() throws Exception {
        super(BossID.ANDROID_15, BossesData.ANDROID_15);
    }

@Override
public void reward(Player plKill) {
    TaskService.gI().checkDoneTaskKillBoss(plKill, this);

    if (plKill == null || this.zone == null) return;

    int x = this.location.x;
    int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

    int rand = Util.nextInt(100);
    int itemId;

    // 40% = 18 | 40% = 17 | 20% = 16
    if (rand < 40) {
        itemId = 18;
    } else if (rand < 80) {
        itemId = 17;
    } else {
        itemId = 16;
    }

    ItemMap it = new ItemMap(this.zone, itemId, 1, x, y, plKill.id);

    // nếu muốn thêm option giống style boss khác thì thêm ở đây
    // ví dụ:
    // it.options.add(new Item.ItemOption(30, Util.nextInt(5, 15)));

    Service.gI().dropItemMap(this.zone, it);
}
    @Override
    protected void resetBase() {
        super.resetBase();
        this.callApk13 = false;
    }

    @Override
    public void active() {
        this.attack();
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.callApk13 && damage >= this.nPoint.hp) {
            if (this.parentBoss != null) {
                ((Android14) this.parentBoss).callApk13();
            }
            return 0;
        }
        return super.injured(plAtt, damage, piercing, isMobAttack);
    }

    public void recoverHP() {
        PlayerService.gI().hoiPhuc(this, this.nPoint.hpMax, 0);
    }
}
