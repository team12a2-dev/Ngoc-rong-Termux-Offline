package nro.models.boss.yardrat;

import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.consts.BossType;
import nro.models.player.Player;

/**
 * Boss Yardrat đã bị vô hiệu hóa.
 */
public abstract class Yardart extends Boss {

    protected int x;
    protected int x2;
    protected int y;
    protected int y2;
    protected int range;
    protected int range2;
    protected long lastTimeMove;
    protected long lastTimeHoiHP;
    protected int timeHoiHP;
    protected int rewardRatio;

    public Yardart(BossType yardart, int id, BossData... data) throws Exception {
        super(yardart, id, data);
    }

    protected void init() {
        // Không làm gì
    }

    @Override
    public void respawn() {
        super.respawn();
        this.init();
    }

    @Override
    public void joinMap() {
        // Không làm gì
    }

    @Override
    public void reward(Player plKill) {
        // Không làm gì
    }

    @Override
    public void attack() {
        // Không làm gì
    }

    @Override
    public void moveToPlayer(Player pl) {
        // Không làm gì
    }

    @Override
    public void moveTo(int x, int y) {
        // Không làm gì
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        return 0;
    }

    @Override
    protected int getRangeCanAttackWithSkillSelect() {
        return 0;
    }
}
