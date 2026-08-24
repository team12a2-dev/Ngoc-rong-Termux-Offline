package nro.models.boss.Android;


import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import java.util.Random;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.skill.Skill;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

public class Android19 extends Boss {

    public Android19() throws Exception {
        super(BossID.ANDROID_19, BossesData.ANDROID_19);
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
    public void autoLeaveMap() {
        if (Util.canDoWithTime(st, 900000)) {
            this.leaveMapNew();
        }
        if (this.zone != null && this.zone.getNumOfPlayers() > 0) {
            st = System.currentTimeMillis();
        }
    }

    @Override
    public void joinMap() {
        super.joinMap(); //To change body of generated methods, choose Tools | Templates.
        st = System.currentTimeMillis();
    }
    private long st;

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (plAtt != null) {
            switch (plAtt.playerSkill.skillSelect.template.id) {
                case Skill.KAMEJOKO:
                case Skill.MASENKO:
                case Skill.ANTOMIC:
                    int hpHoi = (int) ((long) damage * 80 / 100);
                    PlayerService.gI().hoiPhuc(this, hpHoi, 0);
                    if (Util.isTrue(1, 5)) {
                        this.chat("Hấp thụ.. các ngươi nghĩ sao vậy?");
                    }
                    return 0;
            }
        }
        return super.injured(plAtt, damage, piercing, isMobAttack);
    }

    @Override
    public void wakeupAnotherBossWhenDisappear() {
        if (this.parentBoss != null) {
            this.parentBoss.changeToTypePK();
        }
    }

}
