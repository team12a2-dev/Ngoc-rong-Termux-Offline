package nro.models.boss.Tau_PayPay;


import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.FinalBossManager;
import nro.models.boss.BossesData;
import static nro.models.consts.BossType.FINAL;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstMap;
import nro.models.consts.ConstPlayer;
import nro.models.map.Zone;
import nro.models.map.service.ChangeMapService;
import nro.models.player.Pet;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.utils.Util;

public class TaoPaiPai extends Boss {

    private static final int GRACE_MS = 10_000;

    private long lastTimeGraceStart;

    public TaoPaiPai() throws Exception {
        super(FINAL, BossID.TAU_PAY_PAY_DONG_NAM_KARIN, BossesData.TAU_PAY_PAY_DONG_NAM_KARIN);
        this.lastTimeGraceStart = System.currentTimeMillis();
    }

    /** Mỗi lần player vào map 111: boss đứng yên ~10s, tên chưa đỏ. */
    public static void onPlayerEnterZone(Zone zone) {
        if (zone == null || zone.map == null || zone.map.mapId != ConstMap.DONG_NAM_KARIN) {
            return;
        }
        TaoPaiPai boss = findBossInZone(zone);
        if (boss == null) {
            ensureBossSpawned(zone);
            boss = findBossInZone(zone);
        }
        if (boss != null && !boss.isDie()) {
            boss.beginGracePeriod();
            boss.notifyBossToPlayers(zone);
        }
    }

    private static TaoPaiPai findBossInZone(Zone zone) {
        for (Player entity : zone.getBosses()) {
            if (entity instanceof TaoPaiPai boss) {
                return boss;
            }
        }
        return null;
    }

    /** Boss map cố định: hồi sinh / vào map nếu đang REST hoặc chưa có trên zone. */
    private static void ensureBossSpawned(Zone zone) {
        TaoPaiPai found = FinalBossManager.gI().getBosses().stream()
                .filter(b -> b instanceof TaoPaiPai)
                .map(b -> (TaoPaiPai) b)
                .filter(b -> b.zoneFinal != null && b.zoneFinal.equals(zone))
                .findFirst()
                .orElse(null);
        if (found == null) {
            return;
        }
        if (found.zone != null && found.bossStatus == BossStatus.ACTIVE && !found.isDie()) {
            return;
        }
        if (found.bossStatus == BossStatus.DIE || found.bossStatus == BossStatus.CHAT_E
                || found.bossStatus == BossStatus.LEAVE_MAP) {
            ChangeMapService.gI().exitMap(found);
            found.zone = null;
            found.changeStatus(BossStatus.REST);
        }
        if (found.bossStatus == BossStatus.REST || found.bossStatus == BossStatus.RESPAWN
                || found.bossStatus == BossStatus.JOIN_MAP || found.zone == null || found.isDie()) {
            found.setLastTimeRest(0);
            found.respawn();
            found.joinMap();
        }
    }

    public void beginGracePeriod() {
        this.lastTimeGraceStart = System.currentTimeMillis();
        this.changeToTypeNonPK();
    }

    private boolean isGracePeriod() {
        return !Util.canDoWithTime(lastTimeGraceStart, GRACE_MS);
    }

    @Override
    public void joinMap() {
        if (zoneFinal != null) {
            this.zone = zoneFinal;
            int x = this.zone.map.mapWidth > 100
                    ? Util.nextInt(100, this.zone.map.mapWidth - 100) : Util.nextInt(100);
            int y = this.zone.map.yPhysicInTop(x, 100);
            ChangeMapService.gI().changeMap(this, this.zone, x, y);
            Service.gI().sendFlagBag(this);
            this.wakeupAnotherBossWhenAppear();
            beginGracePeriod();
            this.changeStatus(BossStatus.ACTIVE);
            notifyBossToPlayers(this.zone);
        } else {
            super.joinMap();
        }
    }

    private void notifyBossToPlayers(Zone zone) {
        if (zone == null) {
            return;
        }
        for (Player pl : zone.getPlayers()) {
            if (pl != null && pl.isPl()) {
                zone.load_Another_To_Me(pl);
            }
        }
    }

    @Override
    public void respawn() {
        super.respawn();
        beginGracePeriod();
    }

    @Override
    public void active() {
        if (isGracePeriod()) {
            return;
        }
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
        }
        this.attack();
    }

    @Override
    public void attack() {
        if (isGracePeriod()) {
            return;
        }
        super.attack();
    }

    /** Player thật (kể cả khi đánh bằng đệ tử). */
    public static Player resolveRewardPlayer(Player plAtt) {
        if (plAtt == null) {
            return null;
        }
        if (plAtt.isPet && plAtt instanceof Pet pet) {
            return pet.master;
        }
        return plAtt.isPl() ? plAtt : null;
    }

    /** ×2 tiềm năng + sức mạnh — chỉ boss Tàu Pảy Pảy map Đông Nam Karin (111). */
    public void grantTnSmFromAttack(Player plAtt, long damageBase) {
        Player player = resolveRewardPlayer(plAtt);
        if (player == null || player.isBot || damageBase <= 0) {
            return;
        }
        if (this.zone == null || this.zone.map == null
                || this.zone.map.mapId != ConstMap.DONG_NAM_KARIN) {
            return;
        }
        if (player.nPoint.power >= 1_500_000_000L) {
            return;
        }
        Service.gI().addSMTN(player, (byte) 2, damageBase * 2, true);
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (!piercing && Util.isTrue(this.nPoint.tlNeDon, 1)) {
                this.chat("Xí hụt");
                return 0;
            }
            damage = this.nPoint.subDameInjureWithDeff(damage);
            long dameForReward = damage;
            if (!piercing && effectSkill.isShielding) {
                if (!isMobAttack && this.idMark != null) {
                    this.idMark.setDamePST((int) Math.min(damage, 2_147_483_647L));
                }
                if (damage > nPoint.hpMax) {
                    EffectSkillService.gI().breakShield(this);
                }
                damage = 1;
            }
            this.nPoint.subHP(damage);
            grantTnSmFromAttack(plAtt, dameForReward);

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
    public void reward(Player plKill) {
    }

    @Override
    public void die(Player plKill) {
        if (plKill != null) {
            this.setDie(plKill);
        }
        this.changeStatus(BossStatus.DIE);
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        markRestAndSchedule();
        this.setLastTimeRest(System.currentTimeMillis());
        this.changeStatus(BossStatus.REST);
    }
}
