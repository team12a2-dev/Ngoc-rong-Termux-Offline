package nro.models.boss.Boss_mini;

import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.utils.Util;

/** Mini boss Thỏ Đại Ca: biến người chơi chạm vào thành cà rốt. */
public class ThoDaiCa extends Boss {

    private static final int MAX_DAMAGE_PERCENT = 10;

    public ThoDaiCa() throws Exception {
        super(BossID.THO_DAI_CA, BossesData.THO_DAI_CA);
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
