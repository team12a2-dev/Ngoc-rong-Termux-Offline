package nro.models.boss.Boss_mini;

import java.util.List;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.consts.ConstItem;
import nro.models.item.Item;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.utils.Util;

/** Mini boss Thỏ Đại Ca: biến người chơi chạm vào thành cà rốt. */
public class ThoDaiCa extends Boss {

    private static final int CARROT_DURATION_MS = 5 * 60 * 1000;
    private static final int TOUCH_DISTANCE = 45;
    private static final long TOUCH_SCAN_INTERVAL_MS = 250;

    private long lastCarrotTouchScan;
    private long lastCarrotChat;

    public ThoDaiCa() throws Exception {
        super(BossID.THO_DAI_CA, BossesData.THO_DAI_CA);
    }

    @Override
    public void attack() {
        transformPlayersOnTouch();
        super.attack();
    }

    private void transformPlayersOnTouch() {
        if (this.zone == null || this.isDie()
                || !Util.canDoWithTime(lastCarrotTouchScan, TOUCH_SCAN_INTERVAL_MS)) {
            return;
        }
        lastCarrotTouchScan = System.currentTimeMillis();
        List<Player> players = this.zone.getNotBosses();
        for (Player player : players) {
            if (player == null || !player.isPl() || player.isDie() || player.location == null
                    || player.effectSkill == null || player.effectSkill.isCarrot
                    || Util.getDistance(this, player) > TOUCH_DISTANCE
                    || isWearingRabbitDisguise(player)) {
                continue;
            }
            if (EffectSkillService.gI().setCarrot(this, player, CARROT_DURATION_MS)
                    && Util.canDoWithTime(lastCarrotChat, 5000)) {
                this.chat("Biến thành cà rốt nào!");
                lastCarrotChat = System.currentTimeMillis();
            }
        }
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
}
