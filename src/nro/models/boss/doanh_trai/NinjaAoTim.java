package nro.models.boss.doanh_trai;

import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.boss.Boss_Manager.RedRibbonHQManager;
import static nro.models.consts.BossType.PHOBANDT;
import nro.models.clan.Clan;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Pet;
import nro.models.player.Player;
import nro.models.skill.Skill;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.Util;

public class NinjaAoTim extends Boss {

    private boolean calledNinja;

    public NinjaAoTim(Zone zone, Clan clan, int dame, int hp) throws Exception {
        super(PHOBANDT, BossID.NINJA_AO_TIM, new BossData(
                "Ninja Áo Tím", //name
                ConstPlayer.TRAI_DAT, //gender
                new short[]{123, 124, 125, -1, -1, -1}, //outfit {head, body, leg, bag, aura, eff}
                Math.max(1, dame), //dame
                new int[]{Math.max(1000, hp)}, //hp
                new int[]{54}, //map join
                new int[][]{
                    {Skill.DEMON, 3, 1}, {Skill.DEMON, 6, 2}, {Skill.DRAGON, 7, 3}, {Skill.DRAGON, 1, 4}, {Skill.GALICK, 5, 5},
                    {Skill.KAMEJOKO, 7, 6}, {Skill.KAMEJOKO, 6, 7}, {Skill.KAMEJOKO, 5, 8}, {Skill.KAMEJOKO, 4, 9}, {Skill.KAMEJOKO, 3, 10}, {Skill.KAMEJOKO, 2, 11}, {Skill.KAMEJOKO, 1, 12},
                    {Skill.ANTOMIC, 1, 13}, {Skill.ANTOMIC, 2, 14}, {Skill.ANTOMIC, 3, 15}, {Skill.ANTOMIC, 4, 16}, {Skill.ANTOMIC, 5, 17}, {Skill.ANTOMIC, 6, 19}, {Skill.ANTOMIC, 7, 20},
                    {Skill.MASENKO, 1, 21}, {Skill.MASENKO, 5, 22}, {Skill.MASENKO, 6, 23},
                    {Skill.KAMEJOKO, 7, 1000},},
                new String[]{}, //text chat 1
                new String[]{"|-1|Ta sẽ xé xác ngươi ra thành trăm mảnh",
                    "|-1|Ha ha ha"}, //text chat 2
                new String[]{}, //text chat 3
                0 // secondsRest = 0 để spawn ngay lập tức
        ));

        this.zone = zone;
        this.clan = clan;
    }

    @Override
    public void reward(Player plKill) {
        if (plKill == null) {
            return;
        }
        Player realPlayer = plKill.isPet ? ((Pet) plKill).master : plKill;
        long ownerId = (realPlayer != null) ? realPlayer.id : plKill.id;

        // 100% rơi Ngọc Rồng 4-7 sao theo độ hiếm tăng dần (7s: 50%, 6s: 30%, 5s: 15%, 4s: 5%)
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

        int dropY = this.zone.map.yPhysicInTop(this.location.x, this.location.y - 24);
        if (dropY <= 0) {
            dropY = this.location.y;
        }
        ItemMap it = new ItemMap(
                this.zone,
                nrId,
                1,
                this.location.x,
                dropY,
                ownerId
        );
        Service.gI().dropItemMap(this.zone, it);
    }

    @Override
    public void joinMap() {
        ChangeMapService.gI().changeMap(this, this.zone, 190, 312);
        this.changeStatus(BossStatus.CHAT_S);
    }

    @Override
    public void doneChatS() {
        super.doneChatS();
        Service.gI().setPos(this, 190, 312);
    }

    @Override
    public void active() {
        super.active();
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (!piercing && Util.isTrue(30, 100)) {
                this.chat("Xí hụt");
                return 0;
            }
            damage = this.nPoint.subDameInjureWithDeff(damage / 2);
            if (!piercing && effectSkill != null && effectSkill.isShielding) {
                if (damage > nPoint.hpMax) {
                    EffectSkillService.gI().breakShield(this);
                }
                damage = damage / 2;
            }

            // Chuẩn TeaMobi: Khi máu xuống <= 50% HP (hoặc đòn đánh làm máu rơi xuống dưới 50%), lập tức phân thân
            if (!this.calledNinja && (this.nPoint.hp <= this.nPoint.hpMax / 2 || (this.nPoint.hp - damage) <= this.nPoint.hpMax / 2)) {
                this.calledNinja = true;
                if (this.nPoint.hp - damage < this.nPoint.hpMax / 2) {
                    this.nPoint.hp = this.nPoint.hpMax / 2;
                } else {
                    this.nPoint.subHP(damage);
                }
                this.chat("Phân thân chi thuật!");
                callNinjaClones();
                return 0;
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

    private void callNinjaClones() {
        int dameClone = Math.max(1, this.nPoint.dame / 10);
        int hpClone = Math.max(1000, this.nPoint.hpMax / 10);
        try {
            NinjaClone clone1 = new NinjaClone(this.zone, this, dameClone, hpClone, BossID.NINJA_AO_TIM1);
            NinjaClone clone2 = new NinjaClone(this.zone, this, dameClone, hpClone, BossID.NINJA_AO_TIM2);
            NinjaClone clone3 = new NinjaClone(this.zone, this, dameClone, hpClone, BossID.NINJA_AO_TIM3);
            NinjaClone clone4 = new NinjaClone(this.zone, this, dameClone, hpClone, BossID.NINJA_AO_TIM4);

            if (this.clan != null && this.clan.doanhTrai != null && this.clan.doanhTrai.bosses != null) {
                synchronized (this.clan.doanhTrai.bosses) {
                    this.clan.doanhTrai.bosses.add(clone1);
                    this.clan.doanhTrai.bosses.add(clone2);
                    this.clan.doanhTrai.bosses.add(clone3);
                    this.clan.doanhTrai.bosses.add(clone4);
                }
            }

            if (Util.isTrue(1, 2)) {
                NinjaClone clone5 = new NinjaClone(this.zone, this, dameClone, hpClone, BossID.NINJA_AO_TIM5);
                NinjaClone clone6 = new NinjaClone(this.zone, this, dameClone, hpClone, BossID.NINJA_AO_TIM6);
                if (this.clan != null && this.clan.doanhTrai != null && this.clan.doanhTrai.bosses != null) {
                    synchronized (this.clan.doanhTrai.bosses) {
                        this.clan.doanhTrai.bosses.add(clone5);
                        this.clan.doanhTrai.bosses.add(clone6);
                    }
                }
            }
        } catch (Exception ex) {
            ex.printStackTrace();
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
