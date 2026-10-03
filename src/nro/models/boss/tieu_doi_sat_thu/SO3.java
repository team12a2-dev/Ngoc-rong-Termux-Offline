package nro.models.boss.tieu_doi_sat_thu;

import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;

import java.time.LocalTime;
import java.util.Random;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

public class SO3 extends Boss {

    private long st;

    public SO3() throws Exception {
        super(BossID.SO_3, false, true, BossesData.SO_3);
    }

    @Override
    public void moveTo(int x, int y) {
        if (this.currentLevel == 1) {
            return;
        }
        super.moveTo(x, y);
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (TieuDoiSatThuHelper.isLimitSupportHour()) {
            if (!TieuDoiSatThuHelper.isDoingTaskTDST(plAtt)) {
                return 0;
            }
        }
        return super.injured(plAtt, damage, piercing, isMobAttack);
    }

    @Override
    public void reward(Player plKill) {

        short itemId = 1507;

        int totalDrop = Util.nextInt(1, 3); // random số lượng rơi

        for (int i = 0; i < totalDrop; i++) {

            int x = this.location.x + Util.nextInt(-60, 60);
            int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

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
        TaskService.gI().checkDoneTaskKillBoss(plKill, this);
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
    public void joinMap() {
        super.joinMap();
        st = System.currentTimeMillis();
        TieuDoiSatThuHelper.checkEvictFinishedPlayers(this);
    }

    @Override
    public void autoLeaveMap() {
        if (this.parentBoss != null && (this.parentBoss.zone == null || this.parentBoss.bossStatus == BossStatus.REST)) {
            this.leaveMapNew();
            return;
        }
        if (Util.canDoWithTime(st, 900000)) {
            if (this.parentBoss != null) {
                this.parentBoss.leaveMapNew();
            } else {
                this.leaveMapNew();
            }
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
            if ((boss.id == BossID.SO_2 || boss.id == BossID.SO_1) && !boss.isDie()) {
                boss.changeStatus(BossStatus.ACTIVE);
                // break;
            }
        }
    }

}
