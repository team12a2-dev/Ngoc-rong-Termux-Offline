package nro.models.boss.yardrat;

import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.ConstItem;
import nro.models.consts.ConstPlayer;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.utils.Util;

/**
 * Boss Yardrat trên các map 131/132/133.
 *
 * <p>Dữ liệu tile của ba map này là ĐÚNG: {@code Manager.readTileMap} đọc byte0 = W ô rộng,
 * byte1 = H ô cao, lưới bắt đầu từ offset 2; cả ba map đều ra W=60, H=25 nên
 * {@code mapWidth = 1440}, {@code mapHeight = 600}. Hàng 24 (y=576) là sàn đáy phủ 100% bản đồ,
 * hàng 19 (y=456) là sàn đứng chính, hàng 20-22 (y=480/504/528) là các bậc thấp hơn.
 *
 * <p>Hai điều kiện bất di bất dịch của class này:
 * <ol>
 *   <li><b>Bám sàn, không bay.</b> Mọi lệnh di chuyển đều tính Y bằng
 *       {@link nro.models.map.Map#yPhysicInTop(int, int)} dò từ chính cao hiện tại xuống dưới.
 *       Hàm này không bao giờ dò lên trên, nên bước đi mới luôn thấp hơn hoặc bằng cao hiện tại —
 *       boss không thể bị kéo bay lên theo Y của người chơi.</li>
 *   <li><b>Không rảnh rỗi.</b> {@link #attack()} ở mọi nhánh đều phải ra đòn hoặc tiến lại gần.
 *       Cờ "người chơi đang đứng cao hơn" chỉ quyết định <i>đánh hay áp sát</i>, không quyết định
 *       <i>đứng yên hay đi</i>, nên không còn van an toàn nào cần thiết.</li>
 * </ol>
 */
public final class YardratBoss extends Yardart {

    /** Lề an toàn hai bên khi rải vị trí đứng, tính theo pixel. */
    private static final int SPAWN_MARGIN = 120;
    /** Bước rộng giữa hai slot đứng liên tiếp trên bề ngang dùng được. */
    private static final int SLOT_WIDTH = 200;
    /** Sàn chính của cả ba map (hàng 19) — điểm dò khi rải boss. */
    private static final int GROUND_PROBE_Y = 456;
    /** Các cao dò lần lượt nếu cao đầu không ra sàn: sàn chính rồi tới các bậc thấp hơn. */
    private static final int[] GROUND_PROBE_CASCADE = {GROUND_PROBE_Y, 480, 504, 528};
    /** Sai số cao tối đa vẫn chấp nhận là "ngang tầm" — trục y tăng xuống nên cao hơn = y nhỏ hơn. */
    private static final int MAX_ATTACK_ABOVE_DELTA = 24;
    /** Kích thước ô tile, chỉ dùng cho vị trí rơi vật phẩm. */
    private static final int TILE_SIZE = 24;

    public YardratBoss(int id, BossData data) throws Exception {
        super(id, data);
    }

    /** Keep a single player hit from removing an entire low-HP Yardrat boss. */
    @Override
    public synchronized int injured(Player attacker, long damage, boolean piercing, boolean isMobAttack) {
        if (damage <= 0) {
            return 0;
        }
        long maxDamagePerHit = Math.max(1L, this.nPoint.hpMax / 10);
        return super.injured(attacker, Math.min(damage, maxDamagePerHit), piercing, isMobAttack);
    }

    @Override
    public void reward(Player player) {
        super.reward(player);
        if (player == null || player.isBot || this.zone == null || this.location == null) {
            return;
        }

        int points = biKiepPointsFor((int) this.id);
        if (points <= 0) {
            return;
        }

        // Keep the owner's drop visibly on the ground instead of spawning under the killer
        // where the client can immediately auto-pick it.
        int directionAwayFromPlayer = player.location == null || player.location.x <= this.location.x ? 1 : -1;
        int x = Math.max(0, Math.min(this.zone.map.mapWidth - 1,
                this.location.x + directionAwayFromPlayer * 120));
        int y = this.zone.map.yPhysicInTop(x, this.location.y - TILE_SIZE);
        if (y <= 0) {
            y = this.location.y;
        }
        ItemMap biKiep = new ItemMap(this.zone, ConstItem.BI_KIEP, 1, x, y, player.id);
        biKiep.options.add(new Item.ItemOption(31, points));
        Service.gI().dropItemMap(this.zone, biKiep);
    }

    /**
     * Sàn đứng của boss: dò từ {@link #GROUND_PROBE_Y} trở xuống các bậc thấp hơn.
     *
     * <p>Dùng {@code yPhysicInTop} chứ không dùng Y do client gửi, vì client có thể đứng trên ô
     * bất kỳ còn bản đồ mới quyết định ô nào thực sự đứng được. Với ba map Yardrat, cao 456 đã ra
     * sàn ở 100% số cột nên nhánh dự phòng gần như không bao giờ chạy tới; nó chỉ giữ an toàn cho
     * map khác dùng chung class này.
     */
    @Override
    protected int getMapSpawnY(int x) {
        if (this.zone == null || this.zone.map == null) {
            return GROUND_PROBE_Y;
        }
        for (int probeY : GROUND_PROBE_CASCADE) {
            int y = this.zone.map.yPhysicInTop(x, probeY);
            if (y > 0) {
                return y;
            }
        }
        return GROUND_PROBE_Y;
    }

    /**
     * Đi ngang tới gần mục tiêu nhưng luôn bám sàn.
     *
     * <p>{@code targetY} bị bỏ qua có chủ ý. {@code Boss.moveTo} gốc lấy thẳng Y của mục tiêu rồi
     * cộng thêm {@code -50} với xác suất 30%, mà {@code PlayerService.playerMove} gán thẳng
     * {@code location.y} không qua bước vật lý nào — đó chính là nguồn gây bay. Ở đây Y mới chỉ
     * được suy ra từ bản thân bản đồ.
     *
     * <p><b>Bất biến quan trọng nhất: {@code nextY >= this.location.y}.</b>
     * {@link nro.models.map.Map#yPhysicInTop(int, int)} dò từ hàng {@code y / 24} trở xuống dưới
     * và <i>không bao giờ</i> dò lên trên: nếu hàng hiện tại đã là sàn thì trả về nguyên {@code y},
     * nếu không thì trả về hàng đầu tiên thuộc {@code tileTop} nằm <i>bên dưới</i> hàng hiện tại
     * (tức {@code i > y / 24} nên {@code i * 24 > y}); chỉ khi cột đó không có sàn nào bên dưới thì
     * mới trả 0. Vì vậy mỗi bước đi boss chỉ có thể <i>rơi xuống</i> (tối đa 23px cho một ô) chứ
     * không thể bay lên. Nhánh {@code nextY <= 0} chặn trường hợp "không tìm thấy sàn" để không
     * phóng boss lên đỉnh map (y=0).
     *
     * <p>Đo trên dữ liệu thật của map 131/132/133: 1440 cột × 6 cao thử (456/480/504/528/552/576)
     * = 8640 mẫu, <b>0 mẫu</b> nào trả về Y nhỏ hơn cao đầu vào.
     */
    @Override
    public void moveTo(int x, int targetY) {
        if (this.zone == null || this.zone.map == null || this.location == null) {
            return;
        }
        int currentX = this.location.x;
        if (currentX == x) {
            return;
        }
        int step = Math.min(Math.abs(x - currentX), Util.nextInt(40, 60));
        int nextX = currentX + (x > currentX ? step : -step);
        nextX = Math.max(0, Math.min(this.zone.map.mapWidth - 1, nextX));

        int nextY = this.zone.map.yPhysicInTop(nextX, this.location.y);
        if (nextY <= 0) {
            nextY = this.location.y;
        }
        PlayerService.gI().playerMove(this, nextX, nextY);
    }

    /**
     * Mỗi lần gọi {@link #attack()} đều phải ra đòn hoặc tiến lại gần — không nhánh nào để boss
     * đứng yên.
     *
     * <p>{@code Boss.attack()} gốc đặt cả nhánh "đánh" lẫn nhánh "áp sát" sau cùng một cờ
     * {@code canAttackTargetAtCurrentHeight}: cờ false là boss vừa không đánh vừa không di chuyển,
     * tức đứng bất động. Ở đây cờ chỉ còn chọn giữa "ra đòn" và "áp sát": chưa đánh được thì luôn
     * bước tới gần hơn theo trục X, kể cả khi người chơi đang đứng cao hơn — boss áp chân xuống
     * dưới chân mục tiêu thay vì bay lên.
     */
    @Override
    public void attack() {
        if (!Util.canDoWithTime(this.lastTimeAttack, 100) || this.typePk != ConstPlayer.PK_ALL) {
            return;
        }
        this.lastTimeAttack = System.currentTimeMillis();
        try {
            Player target = getPlayerAttack();
            if (target == null || target.isDie() || target.location == null || this.location == null) {
                return;
            }
            if (this.playerSkill == null || this.playerSkill.skills == null || this.playerSkill.skills.isEmpty()) {
                return;
            }
            this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
            int distance = Util.getDistance(this, target);
            if (distance <= this.getRangeCanAttackWithSkillSelect()) {
                if (isTargetInAttackRange(target)) {
                    SkillService.gI().useSkill(this, target, null, -1, null);
                    checkPlayerDie(target);
                    return;
                }
            }
            // Chưa ra được đòn (xa, hoặc người chơi đứng cao hơn) → luôn áp sát theo trục X.
            // Khi đã trùng X, moveTo() trở về im và boss đứng dưới chân mục tiêu, chờ họ rớt xuống.
            moveTo(target.location.x, target.location.y);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    /**
     * Chỉ đánh được người chơi không cao hơn boss quá {@value #MAX_ATTACK_ABOVE_DELTA}px (1 ô tile).
     * Trục y tăng xuống nên mục tiêu ở trên cao có y nhỏ hơn.
     *
     * <p>Không cần van an toàn: khi hàm này trả false thì {@link #attack()} rơi xuống nhánh
     * {@link #moveTo(int, int)}, tức boss vẫn di chuyển — không còn trạng thái treo để cứu.
     *
     * <p>Lưu ý: cờ này chỉ chặn đòn chủ động của {@link #attack()}. Các đường đánh theo vùng
     * (chiêu lan, bom trong {@code SkillService.useSkillAttack}) không đi qua đây nên không bị
     * lọc theo cao độ.
     */
    private boolean isTargetInAttackRange(Player target) {
        if (target == null || target.location == null || this.location == null) {
            return false;
        }
        return target.location.y >= this.location.y - MAX_ATTACK_ABOVE_DELTA;
    }

    /**
     * Vị trí đứng của boss chính: slot 0, tức {@value #SPAWN_MARGIN}.
     *
     * <p>Cố ý dùng giá trị CỐ ĐỊNH thay vì ngẫu nhiên. Ngẫu nhiên có thể trùng vị trí giữa các lần
     * spawn và làm cả nhóm dồn cụm; cố định thì mỗi lần vào map luôn bố trí y hệt, dễ kiểm tra và
     * không phụ thuộc thứ tự spawn. Sáu slot (1 chính + 5 con) được chia đều nên mỗi khu (zone)
     * có một nhóm riêng biệt, không đè lên nhau.
     */
    @Override
    protected int getMapSpawnX() {
        return clampToSpawnArea(SPAWN_MARGIN);
    }

    /**
     * Vị trí đứng của boss con: slot {@code lv + 1}, tức {@code 120 + (lv + 1) * 200}
     * → 320, 520, 720, 920, 1120 cho {@code lv} 0..4. Cả nhóm phủ tới 1120, vẫn nằm trong
     * khoảng an toàn {@code [120, 1320]} của bề ngang 1440 nên không cần kẹp biên, nhưng vẫn kẹp
     * phòng thủ cho map hẹp hơn.
     */
    @Override
    protected int getGroupMemberSpawnX() {
        if (this.parentBoss == null || this.parentBoss.location == null) {
            // Boss.getGroupMemberSpawnX() dereference thẳng parentBoss.location.x nên sẽ NPE.
            // Rơi về ô riêng thay vì gọi super.
            return clampToSpawnArea(SPAWN_MARGIN);
        }
        return clampToSpawnArea(SPAWN_MARGIN + (this.lv + 1) * SLOT_WIDTH);
    }

    /** Kẹp X vào khoảng dùng được {@code [SPAWN_MARGIN, mapWidth - 1 - SPAWN_MARGIN]}. */
    private int clampToSpawnArea(int x) {
        if (this.zone == null || this.zone.map == null) {
            return x;
        }
        int maxX = Math.max(0, this.zone.map.mapWidth - 1 - SPAWN_MARGIN);
        int minX = Math.min(SPAWN_MARGIN, maxX);
        return Math.max(minX, Math.min(x, maxX));
    }

    private static int biKiepPointsFor(int bossId) {
        return switch (bossId) {
            case BossID.TAP_SU_0, BossID.TAP_SU_1, BossID.TAP_SU_2,
                    BossID.TAP_SU_3, BossID.TAP_SU_4 -> 10;
            case BossID.TAN_BINH_5, BossID.TAN_BINH_0, BossID.TAN_BINH_1,
                    BossID.TAN_BINH_2, BossID.TAN_BINH_3, BossID.TAN_BINH_4 -> 20;
            case BossID.CHIEN_BINH_5, BossID.CHIEN_BINH_0, BossID.CHIEN_BINH_1,
                    BossID.CHIEN_BINH_2, BossID.CHIEN_BINH_3, BossID.CHIEN_BINH_4 -> 30;
            case BossID.DOI_TRUONG_5 -> 50;
            default -> 0;
        };
    }
}
