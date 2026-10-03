package nro.models.boss.tieu_doi_sat_thu;

import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;

import java.time.LocalTime;
import java.util.Random;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

public class TDT extends Boss {

    private long st;

    private long lastBodyChangeTime;

    public TDT() throws Exception {
        super(BossID.TIEU_DOI_TRUONG, false, true, BossesData.TIEU_DOI_TRUONG);
    }

    private void bodyChangePlayerInMap() {
        if (this.zone != null) {
            for (Player pl : this.zone.getPlayers()) {
                if (Util.isTrue(5, 10) && pl.effectSkill != null && !pl.effectSkill.isBodyChangeTechnique) {
                    EffectSkillService.gI().setIsBodyChangeTechnique(pl);
                }
            }
        }
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
    public void attack() {
        if (Util.canDoWithTime(lastBodyChangeTime, 10000)) {
            bodyChangePlayerInMap();
            this.chat("Úm ba la xì bùa");
            this.lastBodyChangeTime = System.currentTimeMillis();
        }
        super.attack();
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
    public void joinMap() {
        super.joinMap();
        st = System.currentTimeMillis();
        TieuDoiSatThuHelper.checkEvictFinishedPlayers(this);
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
    public void leaveMap() {
        if (this.bossAppearTogether != null && this.currentLevel >= 0 && this.currentLevel < this.bossAppearTogether.length && this.bossAppearTogether[this.currentLevel] != null) {
            for (Boss boss : this.bossAppearTogether[this.currentLevel]) {
                if (boss != null && boss.zone != null) {
                    boss.leaveMap();
                }
            }
        }
        super.leaveMap();
    }
}
