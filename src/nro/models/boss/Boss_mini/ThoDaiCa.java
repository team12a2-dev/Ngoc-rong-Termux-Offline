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
import nro.models.services.PlayerService;
import nro.models.utils.Logger;
import nro.models.utils.Util;

/** Mini boss Thỏ Đại Ca: biến người chơi chạm vào thành cà rốt. */
public class ThoDaiCa extends Boss {

    private static final int CARROT_DURATION_MS = 5 * 60 * 1000;
    /** Bán kính chạm theo trục ngang, khớp bán kính nhặt vật phẩm rơi trong Zone.pickItem. */
    private static final int TOUCH_DISTANCE = 60;
    /**
     * Dung sai cao độ tối đa vẫn coi là chạm, tính bằng pixel (1 ô tile = 24).
     *
     * <p>Phải tách khỏi {@link Util#getDistance} vì hàm đó đo Euclid 2 chiều trên (x, y), nên
     * chênh lệch cao độ ăn vào bán kính. Đo lại bản đồ thật: {@code Boss.getMapSpawnY} gọi
     * {@code yPhysicInTop(x, 100)} trả về hàng sàn đầu tiên từ dưới lên, nên cao độ spawn trên
     * các map của {@code MINI_BOSS_MAPS} trải từ y=100 tới y=792 và khác nhau tới vài trăm pixel
     * giữa các bậc sàn. Với bán kính 60 gộp cả y, người chơi đứng dưới một bậc cao hơn sẽ không
     * bao giờ chạm được boss, dù đang đứng sát bên cạnh.
     */
    private static final int TOUCH_MAX_Y_DELTA = 40;
    private static final long TOUCH_SCAN_INTERVAL_MS = 250;
    /** Sát thương tối đa mỗi đòn nhận, tính theo % HPMax: tối thiểu 10 đòn mới hạ boss. */
    private static final int MAX_DAMAGE_PERCENT = 10;

    private long lastCarrotTouchScan;
    private long lastCarrotChat;
    private long spawnLoggedAt;
    private boolean carrotScanWarned;

    public ThoDaiCa() throws Exception {
        super(BossID.THO_DAI_CA, BossesData.THO_DAI_CA);
    }

    @Override
    public void update() {
        transformPlayersOnTouch();
        super.update();
    }

    /**
     * Đi ngang về phía mục tiêu và bám đúng sàn của mục tiêu đó.
     *
     * <p>{@link Boss#moveTo} gốc lấy thẳng Y của mục tiêu rồi cộng thêm {@code -50} với xác suất
     * 30%, trong khi {@code PlayerService.playerMove} gán thẳng {@code location.y} không qua bước
     * vật lý nào — mỗi lần đuổi làm boss lệch cao độ một cách ngẫu nhiên rồi trôi dần xuống bậc
     * thấp hơn. Ở đây Y luôn được suy ra từ bản đồ bằng {@code yPhysicInTop(nextX, targetY)}:
     * hàng sàn của mục tiêu là hàng ngay bên dưới Y họ đang đứng nên boss bám đúng tầng, đồng thời
     * không còn độ lệch 50px ngẫu nhiên nữa. Cột không có sàn nào bên dưới thì giữ nguyên Y cũ
     * thay vì trả 0 (y=0 là đỉnh map, sẽ làm boss bay).
     */
    @Override
    public void moveTo(int x, int targetY) {
        if (this.zone == null || this.zone.map == null || this.location == null) {
            return;
        }
        int currentX = this.location.x;
        int step = Math.min(Math.abs(x - currentX), Util.nextInt(40, 60));
        int nextX = currentX + (x > currentX ? step : -step);
        nextX = Math.max(0, Math.min(this.zone.map.mapWidth - 1, nextX));

        int nextY = this.zone.map.yPhysicInTop(nextX, targetY);
        if (nextY <= 0) {
            nextY = this.zone.map.yPhysicInTop(nextX, this.location.y);
        }
        if (nextY <= 0) {
            nextY = this.location.y;
        }
        PlayerService.gI().playerMove(this, nextX, nextY);
    }

    private void transformPlayersOnTouch() {
        if (this.zone == null || this.location == null || this.isDie()
                || this.bossStatus != BossStatus.ACTIVE
                || !Util.canDoWithTime(lastCarrotTouchScan, TOUCH_SCAN_INTERVAL_MS)) {
            return;
        }
        lastCarrotTouchScan = System.currentTimeMillis();
        if (!Util.canDoWithTime(spawnLoggedAt, 60000)) {
            spawnLoggedAt = System.currentTimeMillis();
            Logger.warningln("[ThoDaiCa] map=" + this.zone.map.mapId + " zone=" + this.zone.zoneId
                    + " x=" + this.location.x + " y=" + this.location.y);
        }
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
                Logger.warningln("[ThoDaiCa] bien " + player.name + " thanh ca rot ("
                        + (this.location.x - player.location.x) + ", "
                        + (this.location.y - player.location.y) + ")");
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
        int dx = Math.abs(this.location.x - player.location.x);
        int dy = Math.abs(this.location.y - player.location.y);
        if (dx > TOUCH_DISTANCE || dy > TOUCH_MAX_Y_DELTA) {
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
