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

public class Dracula extends DeathOrAliveArena {

    /** Hút mỗi 8 giây (trước 15 giây) */
    private static final int COOLDOWN_HUT_MAU_MS = 8000;
    /** ~17% HP tối đa player mỗi lần (trước 10%) */
    private static final int TILE_HUT_MAU_PLAYER = 6;
    /** Hồi thêm 50% lượng hút vào boss */
    private static final int TILE_HOI_MAU_BOSS = 150;

    private long lastTimeHutMau = System.currentTimeMillis();

    public Dracula(Player player) throws Exception {
        super(PHOBAN, BossID.DRACULA, BossesData.DRACULA);
        this.playerAtt = player;
    }

    @Override
    public void hutMau() {
        try {
            if (playerAtt == null || playerAtt.isDie()) {
                return;
            }
            if (Util.canDoWithTime(lastTimeHutMau, COOLDOWN_HUT_MAU_MS) && this.nPoint.hp > this.nPoint.hpMax / 50) {
                long hpHut = playerAtt.nPoint.hpMax / TILE_HUT_MAU_PLAYER;
                if (playerAtt.nPoint.hp < hpHut) {
                    hpHut = playerAtt.nPoint.hp;
                }
                if (hpHut <= 0) {
                    return;
                }
                playerAtt.nPoint.subHP(hpHut);
                long hpHoi = hpHut * TILE_HOI_MAU_BOSS / 100;
                this.nPoint.addHp(hpHoi);
                if (this.nPoint.hp > this.nPoint.hpMax) {
                    this.nPoint.hp = this.nPoint.hpMax;
                }
                Service.gI().Send_Info_NV(this);
                Service.gI().Send_Info_NV_do_Injure(playerAtt);
                this.chat("Máu ngon quá hehe");
                lastTimeHutMau = System.currentTimeMillis();
            }
        } catch (Exception e) {
        }
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
                } else {
                    goToPlayer(playerAtt, false);
                }
            } else {
                this.leaveMap();
            }
        } catch (Exception ex) {
        }
    }

    @Override
    protected void goToPlayer(Player pl, boolean isTeleport) {
        goToXY(pl.location.x, pl.location.y, isTeleport);
    }
     @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
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
    
}

