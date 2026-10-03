package nro.models.boss.Boss_mini;

import nro.models.consts.ConstItem;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.utils.Util;

/** Mini boss Thỏ Đại Ca: biến người chơi chạm vào thành cà rốt. */
public class ThoDaiCa extends Boss {
    private static final int COSTUME_DROP_CHANCE_PERCENT = 20;
    private static final int PERMANENT_COSTUME_CHANCE_PERCENT = 2;
    private static final int TEMP_COSTUME_MIN_DAYS = 1;
    private static final int TEMP_COSTUME_MAX_DAYS = 7;
    private static final int CARROT_ITEM_ID = 462;
    private static final int GOLD_MIN = 10_000;
    private static final int GOLD_MAX = 50_000;
    /** Khoảng sát thương chuẩn hóa cho đòn thường, tính theo HP tối đa của boss. */
    private static final int NORMAL_DAMAGE_MIN_PERCENT = 1;
    private static final int NORMAL_DAMAGE_MAX_PERCENT = 2;
    /** Đòn xuyên giáp được ưu tiên hơn nhưng vẫn nằm trong khoảng kiểm soát. */
    private static final int PIERCING_DAMAGE_MIN_PERCENT = 1;
    private static final int PIERCING_DAMAGE_MAX_PERCENT = 3;

    public ThoDaiCa() throws Exception {
        // Mini boss này xuất hiện ngẫu nhiên theo map, không phát thông báo toàn server.
        super(BossID.THO_DAI_CA, true, false, BossesData.THO_DAI_CA);
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
     * Giữ đòn nhỏ theo sát thương thực tế; với packet quá lớn, boss dùng một giới hạn ngẫu nhiên
     * theo HP tối đa thay vì cho sát thương tăng tuyến tính theo chỉ số người chơi.
     */
    private long balanceDamage(long damage, boolean piercing) {
        if (damage <= 0) {
            return damage;
        }
        int minPercent = piercing ? PIERCING_DAMAGE_MIN_PERCENT : NORMAL_DAMAGE_MIN_PERCENT;
        int maxPercent = piercing ? PIERCING_DAMAGE_MAX_PERCENT : NORMAL_DAMAGE_MAX_PERCENT;
        // Sát thương vượt khoảng chuẩn hóa không còn tăng tuyến tính theo chỉ số người chơi.
        // Mỗi packet lớn được lấy một ngưỡng ngẫu nhiên trong khoảng vừa phải, tránh one-shot
        // nhưng vẫn tạo cảm giác các đòn đánh không bị đóng đinh vào cùng một con số.
        long normalizedLimit = this.nPoint.hpMax * Util.nextInt(minPercent, maxPercent) / 100L;
        return Math.min(damage, Math.max(1L, normalizedLimit));
    }

    @Override
    public void reward(Player plKill) {
        super.reward(plKill);
        if (this.zone == null || this.location == null) {
            return;
        }
        if (plKill != null && !plKill.isBot && Util.isTrue(COSTUME_DROP_CHANCE_PERCENT, 100)) {
            dropRabbitCostume(plKill);
        }
        dropCarrotsAndGold();
    }

    private void dropRabbitCostume(Player player) {
        Item costume = ItemServiceHolder.createCostume();
        if (costume == null) {
            return;
        }
        costume.itemOptions.add(new Item.ItemOption(116, 1)); // Kháng Thái Dương Hạ San
        costume.itemOptions.add(new Item.ItemOption(114, 25)); // Tốc độ chạy +25%
        costume.itemOptions.add(new Item.ItemOption(30, 0)); // Không thể giao dịch
        if (Util.isTrue(PERMANENT_COSTUME_CHANCE_PERCENT, 100)) {
            costume.itemOptions.add(new Item.ItemOption(73, 0)); // Vĩnh viễn
        } else {
            costume.itemOptions.add(new Item.ItemOption(93,
                    Util.nextInt(TEMP_COSTUME_MIN_DAYS, TEMP_COSTUME_MAX_DAYS)));
        }
        ItemMap itemMap = new ItemMap(this.zone, costume.template, 1,
                this.location.x, groundY(this.location.x), player.id);
        itemMap.options.addAll(costume.itemOptions);
        Service.gI().dropItemMap(this.zone, itemMap);
    }

    private void dropCarrotsAndGold() {
        int carrotCount = Util.nextInt(1, 5);
        for (int i = 0; i < carrotCount; i++) {
            int x = this.location.x + (i - carrotCount / 2) * 28 + Util.nextInt(-8, 8);
            Service.gI().dropItemMap(this.zone,
                    new ItemMap(this.zone, CARROT_ITEM_ID, 1, x, groundY(x), -1));
        }

        int totalGold = Util.nextInt(GOLD_MIN, GOLD_MAX);
        int piles = Util.nextInt(8, 12);
        int remaining = totalGold;
        for (int i = 0; i < piles; i++) {
            int pilesLeft = piles - i;
            int amount = i == piles - 1
                    ? remaining
                    : Util.nextInt(1, Math.max(1, remaining - (pilesLeft - 1)));
            remaining -= amount;
            int x = this.location.x + (i - piles / 2) * 20 + Util.nextInt(-6, 6);
            Service.gI().dropItemMap(this.zone,
                    new ItemMap(this.zone, 189, amount, x, groundY(x), -1));
        }
    }

    private int groundY(int x) {
        int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);
        return y > 0 ? y : this.location.y;
    }

    private static final class ItemServiceHolder {
        private static Item createCostume() {
            return nro.models.services.ItemService.gI().createNewItem(
                    (short) ConstItem.CAI_TRANG_THO_DAI_CA);
        }
    }
}
