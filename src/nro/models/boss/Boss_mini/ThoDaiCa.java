package nro.models.boss.Boss_mini;

import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.utils.Util;

/** Mini boss Thỏ Đại Ca: biến người chơi chạm vào thành cà rốt. */
public class ThoDaiCa extends Boss {
    /** Ngưỡng bắt đầu giảm dần sát thương đòn thường. */
    private static final int NORMAL_DAMAGE_SOFT_CAP_PERCENT = 2;
    /** Ngưỡng bắt đầu giảm dần sát thương đòn xuyên giáp. */
    private static final int PIERCING_DAMAGE_SOFT_CAP_PERCENT = 3;
    /** Trần an toàn cuối cùng cho đòn thường sau khi đã giảm dần. */
    private static final int NORMAL_DAMAGE_HARD_CAP_PERCENT = 5;
    /** Trần an toàn cuối cùng cho đòn xuyên giáp sau khi đã giảm dần. */
    private static final int PIERCING_DAMAGE_HARD_CAP_PERCENT = 7;
    /** Hệ số nén phần sát thương vượt soft-cap; càng lớn càng giữ lại nhiều lực đánh. */
    private static final double DAMAGE_COMPRESSION = 2.0D;

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
            damage = balanceDamage(damage, piercing);
        }
        return super.injured(plAtt, damage, piercing, isMobAttack);
    }

    /**
     * Giữ nguyên đòn trong ngưỡng hợp lý; phần vượt ngưỡng bị nén theo log thay vì bị ép
     * thành cùng một con số. Nhờ vậy đòn 2.1%, 3%, 5% và 20% HP vẫn cho kết quả khác nhau,
     * nhưng đòn cực lớn không thể kết liễu boss trong một packet.
     */
    private long balanceDamage(long damage, boolean piercing) {
        if (damage <= 0) {
            return damage;
        }
        int softCapPercent = piercing
                ? PIERCING_DAMAGE_SOFT_CAP_PERCENT : NORMAL_DAMAGE_SOFT_CAP_PERCENT;
        int hardCapPercent = piercing
                ? PIERCING_DAMAGE_HARD_CAP_PERCENT : NORMAL_DAMAGE_HARD_CAP_PERCENT;
        long softCap = Math.max(1L, this.nPoint.hpMax * softCapPercent / 100L);
        long hardCap = Math.max(softCap, this.nPoint.hpMax * hardCapPercent / 100L);
        if (damage <= softCap) {
            return damage;
        }

        double overflowRatio = (double) (damage - softCap) / softCap;
        long compressedOverflow = Math.round(softCap
                * Math.log1p(overflowRatio) / DAMAGE_COMPRESSION);
        return Math.min(hardCap, softCap + Math.max(1L, compressedOverflow));
    }
}
