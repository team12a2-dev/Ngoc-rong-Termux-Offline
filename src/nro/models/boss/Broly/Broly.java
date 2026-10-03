package nro.models.boss.Broly;

import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import static nro.models.consts.BossType.BROLY;
import nro.models.consts.ConstPlayer;
import nro.models.map.Map;
import nro.models.map.Zone;
import nro.models.map.service.MapService;
import nro.models.player.Player;
import nro.models.services.SkillService;
import nro.models.map.service.ChangeMapService;
import nro.models.skill.Skill;
import nro.models.boss.spawn.BossSpawnConfig;
import nro.models.boss.spawn.BrolySpawnGate;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;

public class Broly extends Boss {
    private long lastTimeAttack;
    /** Ngưỡng HP ngẫu nhiên (1.500–150.000) — phải đạt trước khi chết mới roll Super */
    private int superHpThreshold;
    private boolean diedInCombat;
    /** Số lần tangChiSo — tăng sát thương đánh trả theo stack */
    private int powerStacks;

    public Broly() throws Exception {

        super(BROLY, BossID.BROLY, new BossData(
                "Broly", //name
                ConstPlayer.XAYDA, //gender
                new short[]{291, 292, 293, -1, -1, -1}, //outfit {head, body, leg, bag, aura, eff}
                100, //dame
                new int[]{500}, //hp
                BrolySpawnGate.brolyMaps(), //map join
                new int[][]{
                    {Skill.TAI_TAO_NANG_LUONG, 1, 1000}, {Skill.TAI_TAO_NANG_LUONG, 2, 1000}, {Skill.TAI_TAO_NANG_LUONG, 3, 1000}, {Skill.TAI_TAO_NANG_LUONG, 4, 1000}, {Skill.TAI_TAO_NANG_LUONG, 5, 1000}, {Skill.TAI_TAO_NANG_LUONG, 6, 1000}, {Skill.TAI_TAO_NANG_LUONG, 7, 100},
                    {Skill.DRAGON, 1, 1000}, {Skill.DRAGON, 2, 1000}, {Skill.DRAGON, 3, 1000}, {Skill.DRAGON, 4, 1000}, {Skill.DRAGON, 5, 1000}, {Skill.DRAGON, 6, 1000}, {Skill.DRAGON, 7, 1000},
                    {Skill.DEMON, 1, 1000}, {Skill.DEMON, 2, 1000}, {Skill.DEMON, 3, 1000}, {Skill.DEMON, 4, 1000}, {Skill.DEMON, 5, 1000}, {Skill.DEMON, 6, 1000}, {Skill.DEMON, 7, 1000},
                    {Skill.GALICK, 1, 1000}, {Skill.GALICK, 2, 1000}, {Skill.GALICK, 3, 1000}, {Skill.GALICK, 4, 1000}, {Skill.GALICK, 5, 1000}, {Skill.GALICK, 6, 1000}, {Skill.GALICK, 7, 1000},
                    {Skill.KAMEJOKO, 1, 1000}, {Skill.KAMEJOKO, 2, 1000}, {Skill.KAMEJOKO, 3, 1000}, {Skill.KAMEJOKO, 4, 1000}, {Skill.KAMEJOKO, 5, 1000}, {Skill.KAMEJOKO, 6, 1000}, {Skill.KAMEJOKO, 7, 1000},
                    {Skill.MASENKO, 1, 1000}, {Skill.MASENKO, 2, 1000}, {Skill.MASENKO, 3, 1000}, {Skill.MASENKO, 4, 1000}, {Skill.MASENKO, 5, 1000}, {Skill.MASENKO, 6, 1000}, {Skill.MASENKO, 7, 1000},
                    {Skill.ANTOMIC, 1, 1000}, {Skill.ANTOMIC, 2, 1000}, {Skill.ANTOMIC, 3, 1000}, {Skill.ANTOMIC, 4, 1000}, {Skill.ANTOMIC, 5, 1000}, {Skill.ANTOMIC, 6, 1000}, {Skill.ANTOMIC, 7, 1000},}, //skill
                new String[]{}, //text chat 1
                new String[]{"|-1|Haha! ta sẽ giết hết các ngươi",
                    "|-1|Sức mạnh của ta là tuyệt đối",
                    "|-1|Vào hết đây!!!",}, //text chat 2
                new String[]{"|-1|Các ngươi giỏi lắm. Ta sẽ quay lại."}, //text chat 3
                BossSpawnConfig.brolyRestSec//type appear
        ));
    }

    @Override
    public Zone getMapJoin() {
        int nextLevel = this.currentLevel;
        int mapId = BrolySpawnGate.pickSpreadMapId(this.data[nextLevel].getMapJoin());
        return MapService.gI().getMapWithRandZone(mapId);
    }

    @Override
    public void joinMap() {
        this.name = "Broly " + Util.nextInt(10, 100);
        this.nPoint.hpMax = Util.nextInt(1500, 150000);
        this.nPoint.hp = this.nPoint.hpMax;
        this.nPoint.dame = this.nPoint.hpMax / 100;
        this.nPoint.crit = Util.nextInt(50);
        this.joinMap2();
        st = System.currentTimeMillis();
        superHpThreshold = BrolySpawnGate.rollSuperHpThreshold();
        diedInCombat = false;
        powerStacks = 0;
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
                Zone target = BrolySpawnGate.pickRandomFreeZone(this.zone.map);
                if (target == null) {
                    int mapId = BrolySpawnGate.pickSpreadMapId(this.data[0].getMapJoin());
                    Map map = MapService.gI().getMapById(mapId);
                    target = BrolySpawnGate.pickRandomFreeZone(map);
                }
                if (target == null) {
                    this.zone = null;
                    this.lastZone = null;
                    this.changeStatus(BossStatus.REST);
                    return;
                }
                this.zone = target;

                if (this.zone.zoneId < 2) {
                    this.leaveMap();
                    return;
                }

                ChangeMapService.gI().changeMap(this, this.zone, -1, -1);
                this.changeStatus(BossStatus.CHAT_S);
            } catch (Exception e) {
                this.changeStatus(BossStatus.REST);
            }
        } else {
            this.changeStatus(BossStatus.RESPAWN);
        }
    }

    private long st;

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (!piercing && Util.isTrue(this.nPoint.tlNeDon, 1000)) {
                this.chat("Xí hụt");
                return 0;
            }
            if (Util.isTrue(1, 3)) {
                this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, 6));
                this.tangChiSo();
                SkillService.gI().useSkill(this, null, null, -1, null);
            }
            damage = this.nPoint.subDameInjureWithDeff(damage);
            if (!piercing && plAtt.playerSkill.skillSelect.template.id != Skill.TU_SAT && damage > this.nPoint.hpMax / 100) {
                damage = this.nPoint.hpMax / 100;
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
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 10) && this.typePk == ConstPlayer.PK_ALL) {
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    return;
                }
                this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(7, this.playerSkill.skills.size() - 1));
                if (Util.getDistance(this, pl) <= this.getRangeCanAttackWithSkillSelect()) {
                    if (Util.isTrue(5, 20)) {
                        if (SkillUtil.isUseSkillChuong(this)) {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 200)),
                                    Util.nextInt(10) % 2 == 0 ? pl.location.y : pl.location.y - Util.nextInt(0, 70));
                        } else {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(10, 40)),
                                    Util.nextInt(10) % 2 == 0 ? pl.location.y : pl.location.y - Util.nextInt(0, 50));
                        }
                    }
                    if (Util.isTrue(1, 100)) {
                        this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, 6));
                        this.tangChiSo();
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
    public void die(Player plKill) {
        diedInCombat = true;
        this.changeStatus(BossStatus.DIE);
    }

    private void tangChiSo() {
        int hpMax = this.nPoint.hpMax;
        int rand = Util.nextInt(10, 50);
        hpMax = hpMax + hpMax / rand < 16_070_777 ? hpMax + hpMax / rand : 16_070_777;
        this.nPoint.hpMax = hpMax;
        this.nPoint.hp = Math.min(this.nPoint.hp + hpMax / rand, hpMax);
        powerStacks++;
        int dameDivisor = Math.max(5, 35 - powerStacks * 2);
        this.nPoint.dame = hpMax / dameDivisor;
    }

    @Override
    public void leaveMap() {
        Zone zone = this.zone;
        int x = this.location.x;
        int y = this.location.y;
        ChangeMapService.gI().exitMap(this);
        if (diedInCombat && zone != null
                && this.nPoint.hpMax >= superHpThreshold
                && BrolySpawnGate.rollSuperOnDeath(this, st, superHpThreshold)) {
            int slot = BrolySpawnGate.currentTimeSlot();
            BrolySpawnGate.scheduleSuperBrolySpawn(zone, x, y, slot);
        }
        this.lastZone = null;
        diedInCombat = false;
        markRestAndSchedule();
        this.changeStatus(BossStatus.REST);
    }
}
