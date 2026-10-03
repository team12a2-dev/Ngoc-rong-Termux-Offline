package nro.models.boss.doanh_trai;

import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.boss.Boss_Manager.RedRibbonHQManager;
import static nro.models.consts.BossType.PHOBANDT;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Pet;
import nro.models.player.Player;
import nro.models.skill.Skill;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.Util;

public class TrungUyXanhLo extends Boss {

    public TrungUyXanhLo(Zone zone, int dame, int hp) throws Exception {
        super(PHOBANDT, BossID.TRUNG_UY_XANH_LO, new BossData(
                "Trung uý Xanh Lơ", //name
                ConstPlayer.TRAI_DAT, //gender
                new short[]{135, 136, 137, -1, -1, -1}, //outfit {head, body, leg, bag, aura, eff}
                ((dame)), //dame
                new int[]{((hp))}, //hp
                new int[]{62}, //map join
                new int[][]{
                    {Skill.DEMON, 3, 1}, {Skill.DEMON, 6, 2}, {Skill.DRAGON, 7, 3}, {Skill.DRAGON, 1, 4}, {Skill.GALICK, 5, 5},
                    {Skill.KAMEJOKO, 7, 6}, {Skill.KAMEJOKO, 6, 7}, {Skill.KAMEJOKO, 5, 8}, {Skill.KAMEJOKO, 4, 9}, {Skill.KAMEJOKO, 3, 10}, {Skill.KAMEJOKO, 2, 11}, {Skill.KAMEJOKO, 1, 12},
                    {Skill.ANTOMIC, 1, 13}, {Skill.ANTOMIC, 2, 14}, {Skill.ANTOMIC, 3, 15}, {Skill.ANTOMIC, 4, 16}, {Skill.ANTOMIC, 5, 17}, {Skill.ANTOMIC, 6, 19}, {Skill.ANTOMIC, 7, 20},
                    {Skill.MASENKO, 1, 21}, {Skill.MASENKO, 5, 22}, {Skill.MASENKO, 6, 23},
                    {Skill.KAMEJOKO, 7, 1000}, {Skill.THAI_DUONG_HA_SAN, 7, 60000},},
                new String[]{}, //text chat 1
                new String[]{"|-1|Xem các ngươi mạnh đến đâu",
                    "|-1|He he he"}, //text chat 2
                new String[]{}, //text chat 3
                60
        ));

        this.zone = zone;
    }

    @Override
    public void reward(Player plKill) {
        if (plKill == null) {
            return;
        }
        Player realPlayer = plKill.isPet ? ((Pet) plKill).master : plKill;
        long ownerId = (realPlayer != null) ? realPlayer.id : plKill.id;

        int dropY = this.zone.map.yPhysicInTop(this.location.x, this.location.y - 24);
        if (dropY <= 0) {
            dropY = this.location.y;
        }

        // 1. Rơi Bản đồ kho báu (Item 611)
        ItemMap bdkb = new ItemMap(
                this.zone,
                611,
                Util.nextInt(1, 2),
                this.location.x + Util.nextInt(-15, 15),
                dropY,
                ownerId
        );
        Service.gI().dropItemMap(this.zone, bdkb);

        // 2. 100% rơi Ngọc Rồng 4-7 sao theo độ hiếm tăng dần (7s: 50%, 6s: 30%, 5s: 15%, 4s: 5%)
        int rand = Util.nextInt(1, 100);
        int nrId;
        if (rand <= 50) {
            nrId = 20; // 7 sao
        } else if (rand <= 80) {
            nrId = 19; // 6 sao
        } else if (rand <= 95) {
            nrId = 18; // 5 sao
        } else {
            nrId = 17; // 4 sao
        }

        ItemMap nr = new ItemMap(
                this.zone,
                nrId,
                1,
                this.location.x,
                dropY,
                ownerId
        );
        Service.gI().dropItemMap(this.zone, nr);
    }

    @Override
    public void active() {
        super.active();
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (!piercing && Util.isTrue(20, 100)) {
                this.chat("Xí hụt");
                return 0;
            }
            damage = this.nPoint.subDameInjureWithDeff(damage / 2);
            if (!piercing && effectSkill.isShielding) {
                if (damage > nPoint.hpMax) {
                    EffectSkillService.gI().breakShield(this);
                }
                damage = damage / 2;
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
    public void joinMap() {
        ChangeMapService.gI().changeMap(this, this.zone, 1210, 384);
        this.changeStatus(BossStatus.CHAT_S);
    }

    @Override
    public void doneChatS() {
        this.changeStatus(BossStatus.AFK);
        Service.gI().setPos(this, 1210, 384);
    }

    @Override
    public void afk() {
        Player pl = getPlayerAttack();
        if (pl == null || pl.isDie()) {
            return;
        }
        if (Util.getDistance(this, pl) <= 500) {
            this.changeStatus(BossStatus.ACTIVE);
        }
    }

    @Override
    public void die(Player plKill) {
        if (plKill != null) {
            reward(plKill);
        }
        this.changeStatus(BossStatus.DIE);
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.lastTimeRest = System.currentTimeMillis();
        this.changeStatus(BossStatus.REST);
        RedRibbonHQManager.gI().removeBoss(this);
        this.dispose();
    }
}
