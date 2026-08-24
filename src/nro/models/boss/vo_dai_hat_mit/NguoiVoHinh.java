package nro.models.boss.vo_dai_hat_mit;


import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import static nro.models.consts.BossType.PHOBAN;
import nro.models.consts.ConstRatio;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;

public class NguoiVoHinh extends DeathOrAliveArena {

    /** Kích hoạt tàng hình mỗi ~4.5 giây (trước 8 giây) */
    private static final int COOLDOWN_TAN_HINH_MS = 4500;
    /** Tàng hình 2–7 giây (trước 1–5 giây) */
    private static final int TAN_HINH_MIN_MS = 2000;
    private static final int TAN_HINH_MAX_MS = 7000;
    /** 35% né đòn khi đang tàng hình */
    private static final int TILE_NE_DON_TAN_HINH = 350;

    private long lastTimeTanHinh;

    public NguoiVoHinh(Player player) throws Exception {
        super(PHOBAN, BossID.NGUOI_VO_HINH, BossesData.NGUOI_VO_HINH);
        this.playerAtt = player;
        lastTimeTanHinh = 0;
    }

    @Override
    public void attack() {
        try {
            if (playerAtt.location != null && playerAtt != null && playerAtt.zone != null && this.zone != null && this.zone.equals(playerAtt.zone)) {
                if (this.isDie()) {
                    return;
                }
                hutMau();
                tanHinh();
                bayLungTung();
                selectRandomAttackSkill();
                if (Util.getDistance(this, playerAtt) <= this.getRangeCanAttackWithSkillSelect()) {
                    if (Util.isTrue(15, ConstRatio.PER100) && SkillUtil.isUseSkillChuong(this)) {
                        goToXY(playerAtt.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 80)), Util.nextInt(10) % 2 == 0 ? playerAtt.location.y : playerAtt.location.y - Util.nextInt(0, 50), false);
                    }
                    SkillService.gI().useSkill(this, playerAtt, null, -1, null);
                    checkPlayerDie(playerAtt);
                } else if (isDangTanHinh()) {
                    Service.gI().setPos2(this, playerAtt.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 200)), 10000);
                } else {
                    goToPlayer(playerAtt, false);
                }
            } else {
                this.leaveMap();
            }
        } catch (Exception ex) {
        }
    }

    protected void goToPlayer(Player pl, boolean isTeleport) {
        goToXY(pl.location.x, pl.location.y, isTeleport);
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (!piercing && isDangTanHinh() && Util.isTrue(TILE_NE_DON_TAN_HINH, 1000)) {
                return 0;
            }
            if (!piercing && Util.isTrue(100, 1000)) {
                this.chat("Xí hụt");
                return 0;
            }

            if (plAtt != null && plAtt.idNRNM != -1) {
                return 1;
            }
            if (damage > this.nPoint.hpMax / 10) {
                damage = this.nPoint.hpMax / 10;
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
    public void tanHinh() {
        if (isDangTanHinh()) {
            return;
        }
        if (Util.canDoWithTime(lastTimeTanHinh, COOLDOWN_TAN_HINH_MS)) {
            int duration = Util.nextInt(TAN_HINH_MIN_MS, TAN_HINH_MAX_MS);
            EffectSkillService.gI().setIsTanHinh(this, duration);
            lastTimeTanHinh = System.currentTimeMillis();
        }
    }

    private boolean isDangTanHinh() {
        return this.effectSkill != null && this.effectSkill.isTanHinh;
    }

    @Override
    public void leaveMap() {
        if (isDangTanHinh()) {
            EffectSkillService.gI().removeTanHinh(this);
        }
        super.leaveMap();
    }
}
