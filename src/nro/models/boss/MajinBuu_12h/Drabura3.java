package nro.models.boss.MajinBuu_12h;


import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;
import static nro.models.consts.BossType.FINAL;
import nro.models.consts.ConstPlayer;
import nro.models.item.Item;
import java.util.ArrayList;
import java.util.List;
import nro.models.map.ItemMap;
import nro.models.player.Pet;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.utils.Util;
import nro.models.server.ServerNotify;
import nro.models.services.ItemService;
import nro.models.services.PlayerService;
import nro.models.services.SkillService;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.services_dungeon.MajinBuuService;
import nro.models.utils.SkillUtil;

public class Drabura3 extends Boss {

    private long lastTimeJoin;

    private long lastTimePetrify;

    private long lastTimeChatAfk;

    private int timeChat;

    public Drabura3() throws Exception {
        super(FINAL, BossID.DRABURA_3, BossesData.DRABURA_3);
    }

    @Override
    public void joinMap() {
        this.lastTimeJoin = System.currentTimeMillis();
        this.zone = this.parentBoss.zoneFinal;
        ChangeMapService.gI().changeMap(this, this.zone, Util.nextInt(300, 400), 336);
        MajinBuuService.gI().armBossForPlayerCombat(this);
        this.changeStatus(BossStatus.CHAT_S);
    }

    private byte resolveAttackerFlag(Player plAtt) {
        if (plAtt == null) {
            return 0;
        }
        if (plAtt.isPet && plAtt instanceof Pet pet && pet.master != null) {
            return pet.master.cFlag;
        }
        return plAtt.cFlag;
    }

    private boolean isHostileAttacker(Player plAtt) {
        if (plAtt == null) {
            return false;
        }
        if (MajinBuuService.gI().isHostileToMabu12hBoss(plAtt, this)) {
            return true;
        }
        byte attackerFlag = resolveAttackerFlag(plAtt);
        if (attackerFlag == 0 || this.cFlag == 0) {
            return false;
        }
        return attackerFlag != this.cFlag;
    }

    private void syncCombatMode() {
        if (this.zone == null) {
            return;
        }
        boolean hasEnemy = false;
        for (Player pl : this.zone.getNotBosses()) {
            if (pl != null && pl.isPl() && !pl.isDie() && pl.cFlag != this.cFlag) {
                hasEnemy = true;
                break;
            }
        }
        if (hasEnemy) {
            if (this.typePk == ConstPlayer.NON_PK) {
                this.changeToTypePK();
            }
        } else if (this.typePk == ConstPlayer.PK_ALL
                && (this.zone == null || !MapService.gI().isMapMaBu(this.zone.map.mapId))) {
            this.changeToTypeNonPK();
        }
    }

    @Override
    public Player getPlayerAttack() {
        List<Player> plNotVoHinh = new ArrayList<>();
        for (Player pl : this.zone.getNotBosses()) {
            if (pl != null && (pl.effectSkin == null || !pl.effectSkin.isVoHinh) && pl.cFlag != this.cFlag) {
                plNotVoHinh.add(pl);
            }
        }
        if (!plNotVoHinh.isEmpty()) {
            return plNotVoHinh.get(Util.nextInt(0, plNotVoHinh.size() - 1));
        }
        return null;
    }

    @Override
    public void active() {
        syncCombatMode();
        this.attack();
    }

    private void petrifyPlayersInTheMap() {
        for (Player pl : this.zone.getNotBosses()) {
            if (pl == null || !pl.isPl() || pl.isDie() || pl.cFlag == this.cFlag) {
                continue;
            }
            if (Util.isTrue(1, 10)) {
                this.chat("phẹt");
                EffectSkillService.gI().setIsStone(pl, 22000);
            }
        }
    }

   @Override
public void reward(Player plKill) {



    // Điểm Mabu (nếu có dùng)
    plKill.fightMabu.changePoint((byte) 10, this.name);

    // Chỉ check hoàn thành nhiệm vụ boss
    TaskService.gI().checkDoneTaskKillBoss(plKill, this);
}
    @Override
    public void autoLeaveMap() {
        if (Util.canDoWithTime(this.lastTimeJoin, 60000)) {
            this.leaveMap();
        }
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (plAtt != null && (plAtt.isPl() || plAtt.isPet)) {
                syncCombatMode();
            }
            if (!piercing && Util.isTrue(this.nPoint.tlNeDon, 1000)) {
                this.chat("Xí hụt");
                return 0;
            }
            if (damage >= 20000000) {
                damage = 20000000;
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

    @Override
    public void afk() {
        if (Util.canDoWithTime(lastTimeChatAfk, timeChat)) {
            this.chat("Đừng vội mừng, ta sẽ hồi sinh và thịt hết bọn mi");
            this.lastTimeChatAfk = System.currentTimeMillis();
            this.timeChat = Util.nextInt(10000, 15000);
        }
    }

    @Override
    public void die(Player plKill) {
        if (plKill != null) {
            reward(plKill);
            ServerNotify.gI().notify(plKill.name + ": Đã tiêu diệt được " + this.name + " mọi người đều ngưỡng mộ.");
        }
        this.lastTimeChatAfk = System.currentTimeMillis();
        this.changeStatus(BossStatus.AFK);
    }

    @Override
    public void attack() {
        if (this.typePk != ConstPlayer.PK_ALL) {
            return;
        }
        if (Util.canDoWithTime(this.lastTimeAttack, 100)) {
            if (Util.canDoWithTime(lastTimePetrify, 10000)) {
                petrifyPlayersInTheMap();
                this.lastTimePetrify = System.currentTimeMillis();
            }
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    return;
                }
                this.playerSkill.skillSelect = this.playerSkill.skills.get(
                        Util.nextInt(0, this.playerSkill.skills.size() - 1));
                if (Util.getDistance(this, pl) <= this.getRangeCanAttackWithSkillSelect()) {
                    if (Util.isTrue(5, 20)) {
                        if (SkillUtil.isUseSkillChuong(this)) {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 200)), pl.location.y);
                        } else {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(10, 40)), pl.location.y);
                        }
                    }
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                } else {
                    if (Util.isTrue(1, 2)) {
                        this.moveToPlayer(pl);
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    @Override
    public void moveTo(int x, int y) {
        byte dir = (byte) (this.location.x - x < 0 ? 1 : -1);
        byte move = (byte) Util.nextInt(50, 100);
        PlayerService.gI().playerMove(this, this.location.x + (dir == 1 ? move : -move), y);
    }

    @Override
    public void moveToPlayer(Player pl) {
        moveTo(pl.location.x, pl.location.y);
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.lastTimeRest = System.currentTimeMillis();
        this.changeStatus(BossStatus.REST);
    }

}
