package nro.models.boss.tieu_doi_sat_thu_namek;


import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import java.util.List;
import nro.models.boss.BossesData;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.Util;

public class SO1_NM extends Boss {

    private long st;

    public SO1_NM() throws Exception {
        super(BossID.SO_1_NM, false, true, BossesData.SO_1_NM);
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

    for (int i = 0; i < 20; i++) {

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
    public void doneChatS() {
        this.changeStatus(BossStatus.AFK);
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
        super.joinMap();
        st = System.currentTimeMillis();
    }

    @Override
    public void doneChatE() {
        if (this.parentBoss == null || this.parentBoss.bossAppearTogether == null
                || this.parentBoss.bossAppearTogether[this.parentBoss.currentLevel] == null) {
            return;
        }
        for (Boss boss : this.parentBoss.bossAppearTogether[this.parentBoss.currentLevel]) {
            if (boss.id == BossID.SO_2_NM && !boss.isDie()) {
                return;
            }
        }
        this.parentBoss.changeStatus(BossStatus.ACTIVE);
    }

}
