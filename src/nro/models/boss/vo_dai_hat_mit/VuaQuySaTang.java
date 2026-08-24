package nro.models.boss.vo_dai_hat_mit;


import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import static nro.models.consts.BossType.PHOBAN;
import nro.models.consts.ConstRatio;
import nro.models.player.Player;
import nro.models.services.SkillService;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;

public class VuaQuySaTang extends DeathOrAliveArena {

    private static final int TILE_BAY_TREN_KHONG = 75;

    private long lastTimeBay;

    public VuaQuySaTang(Player player) throws Exception {
        super(PHOBAN, BossID.VUA_QUY_SA_TANG, BossesData.VUA_QUY_SA_TANG);
        this.playerAtt = player;
        lastTimeBay = System.currentTimeMillis();
    }

    private boolean isBayTrenKhong() {
        return Util.isTrue(TILE_BAY_TREN_KHONG, 100);
    }

    @Override
    public void bayLungTung() {
        if (!isBayTrenKhong()) {
            return;
        }
        if (Util.canDoWithTime(lastTimeBay, 3000)) {
            goToXY(playerAtt.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 80)),
                    playerAtt.location.y + Util.getOne(-80, -25), false);
            lastTimeBay = System.currentTimeMillis();
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
                        int y = isBayTrenKhong()
                                ? playerAtt.location.y + Util.getOne(-70, -20)
                                : (Util.nextInt(10) % 2 == 0 ? playerAtt.location.y : playerAtt.location.y - Util.nextInt(0, 50));
                        goToXY(playerAtt.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 80)), y, false);
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
        if (isBayTrenKhong()) {
            goToXY(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(10, 40)), pl.location.y + Util.getOne(-70, -20), isTeleport);
        } else {
            goToXY(pl.location.x, pl.location.y, isTeleport);
        }
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
