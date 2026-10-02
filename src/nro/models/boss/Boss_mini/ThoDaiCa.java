package nro.models.boss.Boss_mini;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstItem;
import nro.models.item.Item;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.utils.Logger;
import nro.models.utils.Util;

/** Mini boss Thỏ Đại Ca: biến người chơi chạm vào thành cà rốt. */
public class ThoDaiCa extends Boss {

    private static final int CARROT_DURATION_MS = 5 * 60 * 1000;
    /** Bán kính chạm, khớp bán kính nhặt vật phẩm rơi trong Zone.pickItem. */
    private static final int TOUCH_DISTANCE = 60;
    private static final long TOUCH_SCAN_INTERVAL_MS = 250;
    /** Sát thương tối đa mỗi đòn nhận, tính theo % HPMax: tối thiểu 10 đòn mới hạ boss. */
    private static final int MAX_DAMAGE_PERCENT = 10;

    private long lastCarrotTouchScan;
    private long lastCarrotChat;
    private boolean carrotScanWarned;

    public ThoDaiCa() throws Exception {
        super(BossID.THO_DAI_CA, BossesData.THO_DAI_CA);
    }

    @Override
    public void update() {
        transformPlayersOnTouch();
        super.update();
    }

    private void transformPlayersOnTouch() {
        if (this.zone == null || this.location == null || this.isDie()
                || this.bossStatus != BossStatus.ACTIVE
                || !Util.canDoWithTime(lastCarrotTouchScan, TOUCH_SCAN_INTERVAL_MS)) {
            return;
        }
        lastCarrotTouchScan = System.currentTimeMillis();
        List<Player> players;
        try {
            // Zone.getNotBosses() trả thẳng ArrayList dùng chung, bị add/remove từ thread update
            // map; duyệt trực tiếp sẽ ném ConcurrentModificationException, lỗi đó bị nuốt ở
            // BossManager.run() và làm hỏng luôn vòng update của các boss còn lại.
            players = new ArrayList<>(this.zone.getNotBosses());
        } catch (Exception e) {
            Logger.logException(ThoDaiCa.class, e);
            return;
        }
        for (Player player : players) {
            if (!isValidCarrotTarget(player)) {
                continue;
            }
            if (EffectSkillService.gI().setCarrot(player, CARROT_DURATION_MS)) {
                if (Util.canDoWithTime(lastCarrotChat, 5000)) {
                    this.chat("Biến thành cà rốt nào!");
                    lastCarrotChat = System.currentTimeMillis();
                }
            } else if (!carrotScanWarned) {
                carrotScanWarned = true;
                Logger.warningln("[ThoDaiCa] setCarrot bị từ chối cho " + player.name
                        + " - kiểm tra lại isCarrot / zone của người chơi.");
            }
        }
    }

    private boolean isValidCarrotTarget(Player player) {
        if (player == null || !player.isPl() || player.isDie() || player.location == null
                || player.zone == null || !player.zone.equals(this.zone)
                || player.effectSkill == null || player.effectSkill.isCarrot) {
            return false;
        }
        if (Util.getDistance(this, player) > TOUCH_DISTANCE) {
            return false;
        }
        return !isWearingRabbitDisguise(player);
    }

    private boolean isWearingRabbitDisguise(Player player) {
        if (player.inventory == null || player.inventory.itemsBody == null
                || player.inventory.itemsBody.size() <= 5) {
            return false;
        }
        Item costume = player.inventory.itemsBody.get(5);
        if (costume == null || !costume.isNotNullItem() || costume.template == null) {
            return false;
        }
        int itemId = costume.template.id;
        return itemId == ConstItem.CAI_TRANG_THO_DAI_CA
                || itemId == ConstItem.CAI_TRANG_THO_BUNMA
                || itemId == ConstItem.CAI_TRANG_THO_BUNMA_2;
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie() && this.nPoint != null && this.nPoint.hpMax > 0) {
            long maxDamage = Math.max(1L, this.nPoint.hpMax / (long) MAX_DAMAGE_PERCENT);
            if (damage > maxDamage) {
                damage = maxDamage;
            }
        }
        return super.injured(plAtt, damage, piercing, isMobAttack);
    }
}
