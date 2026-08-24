package nro.models.boss.trai_dat;

import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;
import nro.models.item.Item;
import java.util.List;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.Util;

public class BIDO extends Boss {

    private long st;

    public BIDO() throws Exception {
        super(BossID.BIDO, false, true, BossesData.BIDO);
    }

    @Override
    public void moveTo(int x, int y) {
        if (this.currentLevel == 1) {
            return;
        }
        super.moveTo(x, y);
    }

    
   @Override
public void reward(Player plKill) {

    short itemId = 77;

    for (int i = 0; i < 10; i++) {

        int x = this.location.x + Util.nextInt(-60, 60);
        int y = this.zone.map.yPhysicInTop(this.location.x, this.location.y - 24);

        ItemMap item = new ItemMap(
                this.zone,
                itemId,
                1,
                x,
                y,
                -1 // ai cũng nhặt được
        );

        Service.gI().dropItemMap(this.zone, item);
    }

   
}

    @Override
    protected void notifyJoinMap() {
        if (this.currentLevel == 1) {
            return;
        }
        super.notifyJoinMap();
    }

    @Override
    public void joinMap() {
        super.joinMap();
        st = System.currentTimeMillis();
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
    public void doneChatE() {
        if (this.parentBoss == null || this.parentBoss.bossAppearTogether == null
                || this.parentBoss.bossAppearTogether[this.parentBoss.currentLevel] == null) {
            return;
        }
        for (Boss boss : this.parentBoss.bossAppearTogether[this.parentBoss.currentLevel]) {
            if ((boss.id == BossID.BUJIN || boss.id == BossID.KOGU || boss.id == BossID.ZANGYA) && !boss.isDie()) {
                return;
            }
        }
        this.parentBoss.changeStatus(BossStatus.ACTIVE);
    }
}
