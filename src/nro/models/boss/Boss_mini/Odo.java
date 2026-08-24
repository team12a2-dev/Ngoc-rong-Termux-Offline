package nro.models.boss.Boss_mini;

import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.consts.BossStatus;
import static nro.models.consts.BossType.ANTROM;
import nro.models.consts.ConstPlayer;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.services.PlayerService;
import nro.models.skill.Skill;
import nro.models.utils.Util;
import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.consts.BossStatus;
import static nro.models.consts.BossType.ANTROM;
import nro.models.consts.ConstPlayer;
import nro.models.consts.ConstTaskBadges;
import java.util.List;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.EffectSkin;
import static nro.models.player.EffectSkin.textOdo;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.services.PlayerService;
import nro.models.skill.Skill;
import nro.models.task.BadgesTaskService;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;

public class Odo extends Boss {

    private long lastTimeOdo;
    private long lastTimeHpRegen;

    public Odo() throws Exception {
        super(BossID.O_DO1, BossesData.O_DO);
    }

@Override
public int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
    if (this.isDie()) {
        return 0;
    }

    damage = 30; // ✅ pem chỉ trừ 10 HP
    this.nPoint.subHP(damage);

    if (this.isDie()) {
        this.setDie(plAtt);
        die(plAtt);
    }
    return (int) damage;
}

    // private void updateOdo() {
    //     try {
    //         int param = 10;
    //         int randomTime = Util.nextInt(3000, 5000);
    //         if (Util.canDoWithTime(lastTimeOdo, randomTime)) {
    //             List<Player> playersMap = this.zone.getNotBosses();
    //             for (int i = playersMap.size() - 1; i >= 0; i--) {
    //                 Player pl = playersMap.get(i);
    //                 if (pl != null && pl.nPoint != null && !this.equals(pl) && !pl.isBoss && !pl.isDie()
    //                         && Util.getDistance(this, pl) <= 200) {
    //                     int subHp = (int) ((long) pl.nPoint.hpMax * param / 100);
    //                     if (subHp >= pl.nPoint.hp) {
    //                         subHp = pl.nPoint.hp - 1;
    //                     }
    //                     this.chat("Bùm Bùm");
    //                     Service.gI().chat(pl, textOdo[Util.nextInt(0, textOdo.length - 1)]);
    //                     PlayerService.gI().sendInfoHpMpMoney(pl);
    //                     pl.injured(null, subHp, true, false);
    //                 }
    //             }
    //             this.lastTimeOdo = System.currentTimeMillis(); // Cập nhật thời gian của Odo
    //         }
    //     } catch (Exception e) {
    //         e.printStackTrace();
    //     }
    // }

    // private void regenHp() {
    //     try {
    //         if (Util.canDoWithTime(lastTimeHpRegen, 30000)) {
    //             int regenPercentage = Util.nextInt(10, 20);
    //             int regenAmount = (this.nPoint.hpMax * regenPercentage / 100);
    //             PlayerService.gI().hoiPhuc(this, regenAmount, 0);
    //             this.chat("Mùi Của Các Ngươi Thơm Quá!! HAHA");
    //             this.lastTimeHpRegen = System.currentTimeMillis();
    //         }
    //     } catch (Exception e) {
    //         e.printStackTrace();
    //     }
    // }

    // @Override
    // public void attack() {
    //     if (Util.canDoWithTime(this.lastTimeAttack, 100) && this.typePk == ConstPlayer.PK_ALL) {
    //         this.lastTimeAttack = System.currentTimeMillis();
    //         try {
    //             Player pl = this.getPlayerAttack();
    //             if (pl == null || pl.isDie()) {
    //                 return;
    //             }
    //             this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));

    //             if (Util.getDistance(this, pl) <= 40) {
    //                 if (Util.isTrue(5, 20)) {
    //                     if (SkillUtil.isUseSkillChuong(this)) {
    //                         this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 200)),
    //                                 Util.nextInt(10) % 2 == 0 ? pl.location.y : pl.location.y - Util.nextInt(0, 70));
    //                     } else {
    //                         this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(10, 40)),
    //                                 Util.nextInt(10) % 2 == 0 ? pl.location.y : pl.location.y - Util.nextInt(0, 50));
    //                     }
    //                 }
    //                 SkillService.gI().useSkill(this, pl, null, -1, null);
    //                 checkPlayerDie(pl);
    //                 this.updateOdo();

    //             } else {
    //                 if (Util.isTrue(1, 2)) {
    //                     this.moveToPlayer(pl);
    //                 }
    //             }
    //         } catch (Exception ex) {
    //             ex.printStackTrace();
    //         }
    //     }
    //     this.regenHp();
    // }

    @Override
    public void moveTo(int x, int y) {
        byte dir = (byte) (this.location.x - x < 0 ? 1 : -1);
        byte move = (byte) Util.nextInt(30, 40);
        PlayerService.gI().playerMove(this, this.location.x + (dir == 1 ? move : -move), y);
    }

   @Override
public void reward(Player plKill) {
    try {
        int x = this.location.x + Util.nextInt(-20, 20);
        int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

        ItemMap item = new ItemMap(this.zone, 19, 1, x, y, plKill.id);
        Service.gI().dropItemMap(this.zone, item);

        BadgesTaskService.updateCountBagesTask(plKill, ConstTaskBadges.O_DO, 1);

        // int diem = 5;
        // plKill.event.addEventPoint(diem);
        Service.gI().sendThongBao(plKill, "+5 Point");

        TaskService.gI().checkDoneTaskKillBoss(plKill, this);
    } catch (Exception e) {
        e.printStackTrace();
    }
}


    private long st;

    @Override
    public void active() {
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
        }
        this.attack();
        if (Util.canDoWithTime(st, 900000)) {
            this.changeStatus(BossStatus.LEAVE_MAP);
        }
    }

    @Override
    public void joinMap() {
        this.joinMap2();
        st = System.currentTimeMillis();
    }

    public void joinMap2() {
        if (this.zone == null) {
            if (this.parentBoss != null) {
                this.zone = parentBoss.zone;
            } else if (this.lastZone == null) {
                this.zone = getMapJoin();
            } else {
                this.zone = this.lastZone;
            }
        }
        if (this.zone != null) {
            try {
                int zoneid = 0;
                this.zone = this.zone.map.zones.get(zoneid);
                ChangeMapService.gI().changeMap(this, this.zone, -1, -1);

                this.changeStatus(BossStatus.CHAT_S);
            } catch (Exception e) {
                this.changeStatus(BossStatus.REST);
            }
        } else {
            this.changeStatus(BossStatus.RESPAWN);
        }
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        markRestAndSchedule();
        this.changeStatus(BossStatus.REST);
    }
}
