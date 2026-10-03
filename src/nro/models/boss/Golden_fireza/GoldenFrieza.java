package nro.models.boss.Golden_fireza;

import nro.models.services.SkillService;
import nro.models.services.Service;
import nro.models.services.EffectSkillService;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;
import nro.models.utils.TimeUtil;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.item.Item;
import nro.models.item.Item.ItemOption;
import nro.models.map.ItemMap;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.mob.Mob;
import nro.models.network.Message;
import nro.models.player.Player;
import nro.models.services.PlayerService;

import java.util.*;
import java.util.concurrent.*;

public class GoldenFrieza extends Boss {

    private static final ScheduledExecutorService bombScheduler = Executors.newScheduledThreadPool(1);

    private int status;
    private long lastStatusChange;
    private int timeChanges;
    private boolean callDeathBeam;

    public GoldenFrieza() throws Exception {
        super(BossID.GOLDEN_FRIEZA, BossesData.GOLDEN_FRIEZA);
    }

    public GoldenFrieza(nro.models.map.Zone zone) throws Exception {
        super(BossID.GOLDEN_FRIEZA - (zone != null ? zone.zoneId : 0), BossesData.GOLDEN_FRIEZA);
        this.zoneFinal = zone;
    }

    @Override
    public void reward(Player plKill) {
        super.reward(plKill);
        int diem = 5;
        plKill.event.addEventPoint(diem);
        Service.gI().sendThongBao(plKill, "+5 Point");
        ItemMap CaiTrangFideVang = new ItemMap(zone, 629, 1, this.location.x + Util.nextInt(-50, 50), this.zone.map.yPhysicInTop(this.location.x, this.location.y - 24), plKill.id);
        CaiTrangFideVang.options.add(new Item.ItemOption(30, 1));
        CaiTrangFideVang.options.add(new Item.ItemOption(50, 20));
        CaiTrangFideVang.options.add(new Item.ItemOption(77, 20));
        CaiTrangFideVang.options.add(new Item.ItemOption(103, 20));
        CaiTrangFideVang.options.add(new Item.ItemOption(93, 20));
        Service.gI().dropItemMap(this.zone, CaiTrangFideVang);
    }

    @Override
    public void active() {
        super.active();
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (this.isDie()) return 0;

        if (!piercing && Util.isTrue(this.nPoint.tlNeDon, 1000)) {
            this.chat("Xí hụt");
            return 0;
        }

        damage = this.nPoint.subDameInjureWithDeff(damage);

        if (!piercing && effectSkill.isShielding) {
            if (damage > nPoint.hpMax) {
                EffectSkillService.gI().breakShield(this);
            }
            damage = 1;
        }

        damage = Math.min(damage, 50_000_000);
        this.nPoint.subHP(damage);

        if (isDie()) {
            this.setDie(plAtt);
            die(plAtt);
        }

        return (int) damage;
    }

    @Override
    public void rest() {
        if (TimeUtil.is21H()) {
            if (Util.canDoWithTime(this.lastTimeRest, this.secondsRest * 1000L)) {
                this.changeStatus(BossStatus.RESPAWN);
            }
        }
    }

    @Override
    public void autoLeaveMap() {
        if (!TimeUtil.is21H()) {
            this.leaveMap();
        }
    }

    @Override
    public void joinMap() {
        if (TimeUtil.is21H()) {
            this.name = this.data[this.currentLevel].getName() + " " + Util.nextInt(1, 100);
            if (this.zoneFinal != null) {
                this.zone = this.zoneFinal;
            } else if (this.zone == null) {
                this.zone = getMapJoin();
            }
            if (this.zone != null) {
                int x = Util.nextInt(60, 120); // Xuất hiện ở đầu map (phía bên trái)
                int y = this.zone.map.yPhysicInTop(x, 100);
                ChangeMapService.gI().changeMap(this, this.zone, x, y);
                this.notifyJoinMap();
                this.changeStatus(BossStatus.CHAT_S);
                this.wakeupAnotherBossWhenAppear();
                
                for (Mob mob : this.zone.mobs) {
                    mob.injured(this, 99999999, true);
                }
                this.zone.isGoldenFriezaAlive = true;
                this.lastTimeBomb = System.currentTimeMillis();
                this.lastTimeCallDeathBeam = System.currentTimeMillis();
            }
        } else {
            this.lastTimeRest = System.currentTimeMillis();
            this.changeStatus(BossStatus.REST);
        }
    }

    private long lastTimeBomb;
    private long lastTimeCallDeathBeam;

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 100) && this.typePk == ConstPlayer.PK_ALL) {
            this.lastTimeAttack = System.currentTimeMillis();

            try {
                // 1. Kích hoạt gọi Death Beam định kỳ (hỗ trợ chiến đấu sau mỗi 90s)
                if (Util.canDoWithTime(lastTimeCallDeathBeam, 90000)) {
                    lastTimeCallDeathBeam = System.currentTimeMillis();
                    if (this.bossAppearTogether != null && this.bossAppearTogether[this.currentLevel] != null) {
                        for (Boss boss : this.bossAppearTogether[this.currentLevel]) {
                            if (boss != null && boss.bossStatus == BossStatus.REST) {
                                boss.changeStatus(BossStatus.RESPAWN);
                            }
                        }
                    }
                }

                // 2. Kích hoạt chiêu nộ quả cầu hủy diệt / bom nổ định kỳ (sau mỗi 120s)
                if (Util.canDoWithTime(lastTimeBomb, 120000)) {
                    lastTimeBomb = System.currentTimeMillis();
                    setBom();
                }

                // 3. Tìm mục tiêu tấn công dồn dập
                Player pl = getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    if (this.zone != null) {
                        pl = this.zone.getRandomPlayerInMap();
                    }
                }
                if (pl == null || pl.isDie()) {
                    return;
                }

                // Chọn kỹ năng tấn công
                if (this.playerSkill.skills != null && !this.playerSkill.skills.isEmpty()) {
                    this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
                }

                int dist = Util.getDistance(this, pl);
                int attackRange = this.getRangeCanAttackWithSkillSelect();

                // Nếu ngoài tầm đánh -> Chủ động bay áp sát mục tiêu cực nhanh
                if (dist > attackRange) {
                    moveToPlayer(pl);
                }

                // Nếu trong tầm đánh -> Tung chiêu ngay lập tức & biến ảo di chuyển né đòn / ép góc
                if (dist <= attackRange + 100) {
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);

                    // Di chuyển linh hoạt, lướt liên tục quanh người chơi
                    if (Util.isTrue(7, 10)) {
                        int targetX = pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 150));
                        int targetY = (Util.isTrue(1, 2) ? pl.location.y : Math.max(pl.location.y - Util.nextInt(20, 80), 50));
                        this.moveTo(targetX, targetY);
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    @Override
    public void moveToPlayer(Player pl) {
        if (pl != null && pl.location != null) {
            int dir = (this.location.x - pl.location.x < 0 ? 1 : -1);
            int speed = Util.nextInt(80, 150);
            int targetX = this.location.x + (dir * speed);
            int targetY = pl.location.y;
            this.moveTo(targetX, targetY);
        }
    }

    @Override
    public void moveTo(int x, int y) {
        if (this.zone != null && this.zone.map != null) {
            x = Math.max(50, Math.min(x, this.zone.map.mapWidth - 50));
        }
        PlayerService.gI().playerMove(this, x, y);
    }

    public void setBom() {
        if (this.playerSkill.prepareTuSat) return;

        this.playerSkill.prepareTuSat = true;
        this.playerSkill.lastTimePrepareTuSat = System.currentTimeMillis();
        this.chat("Các ngươi hãy nếm thử Quả Cầu Hủy Diệt của ta!");

        try {
            Message msg = new Message(-45);
            msg.writer().writeByte(7);
            msg.writer().writeInt((int) this.id);
            msg.writer().writeShort(104);
            msg.writer().writeShort(2000);
            Service.gI().sendMessAllPlayerInMap(this, msg);
            msg.cleanup();
        } catch (Exception e) {
            e.printStackTrace();
        }

        bombScheduler.schedule(() -> {
            this.playerSkill.prepareTuSat = false;
            if (this.zone != null) {
                List<Player> playersMap = this.zone.getNotBosses();
                if (!MapService.gI().isMapOffline(this.zone.map.mapId)) {
                    for (Player pl : playersMap) {
                        if (!this.equals(pl) && !pl.isDie()) {
                            long dame = (long) (pl.nPoint.hpMax * 0.7);
                            if (dame <= 0) {
                                dame = 500000;
                            }
                            pl.injured(this, dame, false, false);
                            PlayerService.gI().sendInfoHpMpMoney(pl);
                            Service.gI().Send_Info_NV(pl);
                        }
                    }
                }
            }
        }, 2500, TimeUnit.MILLISECONDS);
    }

    @Override
    public void leaveMap() {
        if (this.zone != null) {
            this.zone.isGoldenFriezaAlive = false;
        }
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.lastTimeRest = System.currentTimeMillis();
        this.changeStatus(BossStatus.REST);
    }
}
