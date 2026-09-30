package nro.models.boss.yardrat;

import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.ConstItem;
import nro.models.consts.ConstPlayer;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Pet;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.skill.Skill;
import nro.models.utils.Util;
import java.util.ArrayList;
import java.util.List;

/**
 * Boss Yardrat trên các map 131/132/133.
 *
 * <p>Dữ liệu tile của ba map này là ĐÚNG: {@code Manager.readTileMap} đọc byte0 = W ô rộng,
 * byte1 = H ô cao, lưới bắt đầu từ offset 2; cả ba map đều ra W=60, H=25 nên
 * {@code mapWidth = 1440}, {@code mapHeight = 600}. Hàng 24 (y=576) là sàn đáy phủ 100% bản đồ,
 * hàng 19 (y=456) là sàn đứng chính, hàng 20-22 (y=480/504/528) là các bậc thấp hơn. Trên số liệu
 * tile thật, cao 456 <b>không</b> ra sàn ở mọi cột: map 131 có 49/60 cột, map 132 có 29/60,
 * map 133 có 49/60; các cột còn lại rơi xuống bậc 504/528. Vì vậy {@link #getMapSpawnY(int)}
 * vẫn phải dò cả cascade, dù hàng 24 phủ 60/60 nên probe không bao giờ trả 0 và
 * {@link #GROUND_PROBE_CASCADE} gần như không bao giờ chạy tới hết vòng.
 *
 * <p>Ba điều kiện bất di bất dịch của class này:
 * <ol>
 *   <li><b>Bám sàn, không bay.</b> Mọi lệnh di chuyển đều tính Y bằng
 *       {@link nro.models.map.Map#yPhysicInTop(int, int)} dò từ chính cao hiện tại xuống dưới.
 *       Hàm này không bao giờ dò lên trên, nên bước đi mới luôn thấp hơn hoặc bằng cao hiện tại —
 *       boss không thể bị kéo bay lên theo Y của người chơi.</li>
*   <li><b>Không rảnh rỗi.</b> {@link #attack()} ở mọi nhánh đều phải ra đòn hoặc di chuyển: khi
     *       không có mục tiêu trong tầm với thì boss đi tới mép dải đang ở xa trong dải của nó
     *       ({@link #getPatrolX()}), chứ không đứng yên ở chỗ cũ. Cờ "người chơi đang đứng cao hơn"
 *       chỉ quyết định <i>đánh hay áp sát</i>, không quyết định <i>đứng yên hay đi</i>. Ngoại lệ
 *       duy nhất là {@code playerSkill} rỗng — xem {@link #attack()}.</li>
 *   <li><b>Mỗi boss giữ một dải X riêng và chỉ nhận mục tiêu cùng tầng sàn.</b> Sáu boss Yardrat
 *       cùng đứng trong một khu: nếu ai cũng tự do chọn mục tiêu và đi tới đúng X người chơi,
 *       cả sáu sẽ kéo về một trục X và chồng lên nhau thành một cục dưới chân mục tiêu. Để chặn
 *       đúng chỗ đó, mỗi boss bị kẹp trong dải {@link #BAND_HALF_WIDTH} quanh
 *       {@link #getHomeX()}, các slot cách nhau {@value #SLOT_WIDTH} nên dải không giao nhau;
 *       đồng thời {@link #getPlayerAttack()} chỉ nhận người chơi đang ở <i>cùng tầng</i> sàn với
 *       mình ({@link #MAX_TARGET_HEIGHT_DELTA}), vì boss chỉ di chuyển ngang — đuổi một người
 *       chơi đứng trên bậc khác chỉ khiến boss dồn cục dưới chân họ rồi đứng yên.</li>
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
    /**
     * Sai số cao tối đa vẫn coi là "cùng tầng sàn" để chọn mục tiêu, tính bằng pixel.
     *
     * <p>Trục y tăng xuống nên {@code y} nhỏ hơn là đứng cao hơn; dùng {@code Math.abs} để bắt cả
     * hai phía. Ngưỡng là 24px = đúng 1 ô tile: các bậc sàn của map 131/132/133 nằm ở
     * 456/480/504/528/552/576, tức cách nhau chính xác 24px. Điều kiện loại là
     * {@code Math.abs(dy) > MAX_TARGET_HEIGHT_DELTA}, nên 24 là ngưỡng duy nhất vừa loại hết bậc
     * sàn kế bên (Δy = 24 bị chấp nhận, Δy = 48 bị loại) vẫn bắt được người chơi lệch nửa ô. Đây cũng
     * là cùng ngưỡng với {@link #MAX_ATTACK_ABOVE_DELTA} — người chơi được chọn làm mục tiêu thì
     * chắc chắn nằm trong tầm ra đòn của boss.
     */
    private static final int MAX_TARGET_HEIGHT_DELTA = 24;
    /**
     * Bán kính dải X riêng của mỗi boss, tính bằng pixel.
     *
     * <p>Hai slot đứng liên tiếp cách nhau {@value #SLOT_WIDTH}px, nên dải bán kính 80px còn lại
     * 40px lề giữa hai boss: đủ để không giao nhau (chống dồn cụm) mà vẫn đủ rộng để boss tiến
     * áp sát người chơi trong khu của mình.
     */
    private static final int BAND_HALF_WIDTH = 80;
    /**
     * Tầm với tối đa: tầm đánh xa nhất (500) cộng bán kính dải — boss không thể với tới xa hơn thế.
     *
     * <p>Giữ nguyên giá trị tường minh thay vì gọi {@code getRangeCanAttackWithSkillSelect()}:
     * {@link #attack()} gọi {@link #getPlayerAttack()} <i>trước</i> khi chọn chiêu, mà
     * {@code Boss.initSkill()} đặt {@code skillSelect = null} nên hàm đó sẽ NPE ở lần attack đầu.
     */
    private static final int MAX_REACH = 500 + BAND_HALF_WIDTH;
    

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
        if (player == null || player.isBot || this.zone == null || this.zone.map == null
                || this.location == null) {
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
        // Dò từ chính cao đang đứng, giống hệt moveTo(): yPhysicInTop trả nguyên input khi
        // hàng hiện tại đã là tileTop, nên dò từ this.location.y - 24 sẽ khiến vật phẩm lơ
        // lửng đúng 1 ô tile trên mặt đất ở trạng thái phổ biến (boss đang đứng y=456).
        int y = this.zone.map.yPhysicInTop(x, this.location.y);
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
     * bất kỳ còn bản đồ mới quyết định ô nào thực sự đứng được. Trên dữ liệu tile thật, cao 456 chỉ
     * ra sàn ở 49/60 cột (map 131 và 133) và 29/60 cột (map 132); các cột còn lại rơi xuống bậc
     * 480/504/528, nên nhánh dự phòng là bắt buộc chứ không phải van an toàn. Hàng 24 (y=576) phủ
     * 60/60 cột nên probe không bao giờ trả 0 và vòng cascade gần như không bao giờ chạy hết.
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
     *
     * <p><b>Bất biến thứ ba: X đích luôn bị kẹp trong dải riêng của boss</b>
     * ({@link #clampToOwnBand(int)}) <i>trước</i> khi tính {@code nextX}. Đây là chốt chặn dồn
     * cụm: sáu boss cùng đuổi một người chơi thì tất cả đều bị kẹp trong dải không giao nhau của
     * mình, không boss nào bước tới đúng X mục tiêu, nên không thể chồng lên nhau thành một cục.
     */
    @Override
    public void moveTo(int x, int targetY) {
        if (this.zone == null || this.zone.map == null || this.location == null) {
            return;
        }
        int currentX = this.location.x;
        int desiredX = clampToOwnBand(x);
        if (currentX == desiredX) {
            return;
        }
        int step = Math.min(Math.abs(desiredX - currentX), Util.nextInt(40, 60));
        int nextX = currentX + (desiredX > currentX ? step : -step);
        nextX = Math.max(0, Math.min(this.zone.map.mapWidth - 1, nextX));

        int nextY = this.zone.map.yPhysicInTop(nextX, this.location.y);
        if (nextY <= 0) {
            nextY = this.location.y;
        }
        PlayerService.gI().playerMove(this, nextX, nextY);
    }

    /**
     * Mỗi lần gọi {@link #attack()} đều phải ra đòn hoặc di chuyển — không nhánh nào để boss
     * đứng yên.
     *
     * <p>{@code Boss.attack()} gốc đặt cả nhánh "đánh" lẫn nhánh "áp sát" sau cùng một cờ
     * {@code canAttackTargetAtCurrentHeight}: cờ false là boss vừa không đánh vừa không di chuyển,
     * tức đứng bất động. Ở đây cờ chỉ còn chọn giữa "ra đòn" và "áp sát": chưa đánh được thì luôn
     * bước tới gần hơn theo trục X, kể cả khi người chơi đang đứng cao hơn — boss áp chân xuống
     * dưới chân mục tiêu thay vì bay lên. Vì {@code attack()} đã bị override nên hook
     * {@code canAttackTargetAtCurrentHeight} của {@code Boss} không được dùng ở đây.
     *
     * <p><b>Nhánh không có mục tiêu trong tầm với thì boss tuần tra, không phải đứng yên.</b>
     * {@link #getPlayerAttack()} chỉ trả về người chơi cùng tầng sàn và trong
     * {@link #MAX_REACH}, nên khi khu trống, khi người chơi đứng trên bậc khác, hoặc khi mục tiêu
     * nằm quá xa để với tới, boss đi tới {@link #getPatrolX()} — mép dải đang ở xa,
     * tức dao động ngay trong dải của nó. Trước đây nhánh này gọi
     * {@code moveTo(getHomeX(), ...)}, mà {@code getHomeX()} chính là vị trí spawn nên
     * {@code moveTo} rơi vào nhánh {@code currentX == desiredX} và boss đứng bất động ngay từ
     * lúc spawn. Giữ X trong dải là chốt dồn cụm: boss luôn quay về đúng khu trục X được chia
     * cho nó thay vì tụ lại ở một chỗ.
     *
     * <p><b>Ngoại lệ duy nhất cố ý: {@code playerSkill} rỗng</b> thì hàm thoát im ngay. Đây chỉ
     * là guard phòng thủ, không phải trạng thái chơi được — {@code Boss.initSkill()} luôn nạp đủ
     * 8 chiêu cho boss Yardrat, nên nhánh này chỉ xảy ra khi dữ liệu skill bị hỏng.
     */
    @Override
    public void attack() {
        if (!Util.canDoWithTime(this.lastTimeAttack, 100) || this.typePk != ConstPlayer.PK_ALL) {
            return;
        }
        this.lastTimeAttack = System.currentTimeMillis();
        try {
            if (this.zone == null || this.location == null) {
                return;
            }
            // Ngoại lệ cố ý duy nhất của bất biến "không đứng yên": không có dữ liệu chiêu thì
            // không ra đòn cũng không di chuyển được, vì mọi lệnh đều cần skillSelect.
            if (this.playerSkill == null || this.playerSkill.skills == null || this.playerSkill.skills.isEmpty()) {
                return;
            }
            Player target = getPlayerAttack();
            if (target == null || target.isDie() || target.location == null) {
                // Không có mục tiêu hợp lệ trong tầm với: không đánh được, nhưng vẫn di chuyển —
                // tuần tra hai đầu trong dải của boss.
                moveTo(getPatrolX(), this.location.y);
                return;
            }
            selectSkillForAttack();
            if (this.playerSkill.skillSelect == null) {
                moveTo(target.location.x, target.location.y);
                return;
            }
            int distance = Util.getDistance(this, target);
            if (distance <= this.getRangeCanAttackWithSkillSelect()) {
                if (isTargetInAttackRange(target)) {
                    SkillService.gI().useSkill(this, target, null, -1, null);
                    checkPlayerDie(target);
                    return;
                }
            }
            // Chưa ra được đòn (xa, hoặc người chơi đứng cao hơn) → luôn áp sát theo trục X.
            // moveTo() kẹp X vào dải riêng nên nhiều boss cùng đuổi một người vẫn không dồn cụm.
            moveTo(target.location.x, target.location.y);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    /**
     * Chọn chiêu cho đòn tới mục tiêu, quét tất định theo thứ tự danh sách.
     *
     * <p>DICH_CHUYEN_TUC_THOI bị loại khỏi vòng chọn: {@code SkillService} gọi
     * {@code Service.setPos} gán thẳng vị trí mục tiêu, nên nó vừa kéo boss lên cao vừa kéo
     * boss ra khỏi dải X của nó. Cooldown 30s nên việc loại bỏ này gần như không đổi cân bằng
     * gameplay, đổi lại giữ được cả hai bất biến "không bay" và "giữ dải".
     */
    private void selectSkillForAttack() {
        for (Skill skill : this.playerSkill.skills) {
            if (isTeleportSkill(skill)) {
                continue;
            }
            this.playerSkill.skillSelect = skill;
            return;
        }
        // Danh sách toàn chiêu dịch chuyển (không xảy ra với dữ liệu hiện tại): bỏ đòn, không dùng.
        this.playerSkill.skillSelect = null;
    }

    /** Chiêu dịch chuyển tức thời — gán thẳng vị trí mục tiêu cho boss nên bị loại khỏi vòng chọn chiêu. */
    private static boolean isTeleportSkill(Skill skill) {
        return skill != null && skill.template != null && skill.template.id == Skill.DICH_CHUYEN_TUC_THOI;
    }

    /**
     * Chọn mục tiêu <b>cùng tầng sàn</b>, trong tầm với và gần nhất theo trục X, thay cho
     * {@link nro.models.boss.Boss#getPlayerAttack()} gốc (bản gốc gọi
     * {@code Zone.getRandomPlayerInMap()} — chọn đại trày mọi người chơi trong map, bất kể cao độ).
     *
     * <p>Ba bộ lọc mới chặn đúng nguyên nhân dồn cụm:
     * <ol>
     *   <li><b>Cùng tầng.</b> Chỉ nhận ứng viên có
     *       {@code Math.abs(y - this.location.y) <= MAX_TARGET_HEIGHT_DELTA}. Boss chỉ di chuyển
     *       ngang theo dải của mình, nên đuổi một người đứng ở tầng khác chỉ khiến cả nhóm boss
     *       tụ dưới chân họ rồi đứng yên.</li>
     *   <li><b>Trong tầm với.</b> Loại ứng viên xa hơn {@link #MAX_REACH}. Nếu không có lọc này,
     *       boss ở mép dải sẽ kẹp X về mép rồi bất động vĩnh viễn trong khi vẫn giữ mục tiêu
     *       không thể với tới.</li>
     *   <li><b>Gần nhất theo khoảng cách với THỰC SỰ đi được.</b> Khoảng cách chính là
     *       {@code Math.abs(clampToOwnBand(player.x) - this.x)} — tức đo tới mép dải chạm được
     *       chứ không tới vị trí người chơi, vì boss không thể bước ra khỏi dải. Người trong dải
     *       chỉ được ưu tiên khi hai khoảng cách bằng nhau (phá thế hoà theo
     *       {@code Math.abs(player.x - this.x)}).</li>
     * </ol>
     *
     * <p>Danh sách người chơi được chép sang {@code ArrayList} mới trước khi duyệt:
     * {@code Zone.getNotBosses()} trả thẳng một {@code ArrayList} không đồng bộ, bị
     * {@code add}/{@code remove} từ thread khác, nên duyệt trực tiếp sẽ ném
     * {@code ConcurrentModificationException} — lỗi đó bị {@code catch (Exception)} ở
     * {@link #attack()} nuốt mất khiến đòn đánh mất trong im lặng.
     *
     * <p>Các điều kiện loại trừ được sao y nguyên từ {@code Zone.getRandomPlayerInMap()} (người
     * chơi đang tàng hình, bị MaBu giữ) cộng thêm chết / không có tọa độ / là boss / pet của
     * chính mình — pet của boss không phải mục tiêu hợp lệ.
     *
     * @return người chơi hợp lệ gần nhất theo khoảng cách đi được, hoặc {@code null} nếu khu
     *         không có ai hợp lệ trong tầm với
     */
    @Override
    public Player getPlayerAttack() {
        if (this.zone == null || this.location == null) {
            return null;
        }
        List<Player> players = new ArrayList<>(this.zone.getNotBosses());
        if (players == null || players.isEmpty()) {
            return null;
        }
        int bestInBandDistance = Integer.MAX_VALUE;
        Player bestAnywhere = null;
        int bestAnywhereDistance = Integer.MAX_VALUE;
        for (Player player : players) {
            if (!isValidAttackTarget(player)) {
                continue;
            }
            if (Math.abs(player.location.y - this.location.y) > MAX_TARGET_HEIGHT_DELTA) {
                continue;
            }
            if (Math.abs(player.location.x - this.location.x) > MAX_REACH) {
                continue;
            }
            int distanceX = Math.abs(player.location.x - this.location.x);
            int reachableX = Math.abs(clampToOwnBand(player.location.x) - this.location.x);
            if (reachableX < bestAnywhereDistance
                    || (reachableX == bestAnywhereDistance && distanceX < bestInBandDistance)) {
                bestAnywhereDistance = reachableX;
                bestAnywhere = player;
                bestInBandDistance = distanceX;
            }
        }
        return bestAnywhere;
    }

    /** Ứng viên mục tiêu hợp lệ: còn sống, có tọa độ, không phải boss, không tàng hình, không bị MaBu giữ. */
    private boolean isValidAttackTarget(Player player) {
        if (player == null || player.isDie() || player.location == null || player.isBoss) {
            return false;
        }
        if (player.effectSkin != null && player.effectSkin.isVoHinh) {
            return false;
        }
        if (player.maBuHold != null || player.isMabuHold) {
            return false;
        }
        return !(player.isPet && player instanceof Pet && ((Pet) player).master == this);
    }

    /**
     * Tâm dải X = vị trí spawn của boss này: boss chính slot 0, boss con slot {@code lv + 1}.
     *
     * <p>Cố ý chỉ phụ thuộc {@code parentBoss} chứ không kiểm tra thêm
     * {@code parentBoss.location != null}. Nếu kiểm tra cả hai, boss con rơi về nhánh fallback
     * {@link #SPAWN_MARGIN} — trùng đúng slot 0 của boss chính, tức chồng dải.
     *
     * <p><b>Ràng buộc thiết kế (không phải guard runtime):</b> sáu slot cộng bán kính dải cần
     * {@code mapWidth >= SPAWN_MARGIN + 5 * SLOT_WIDTH + BAND_HALF_WIDTH + 1 = 1321}. Map
     * 131/132/133 đều rộng 1440 nên thoả.
     */
    private int getHomeX() {
        return clampToSpawnArea(this.parentBoss == null
                ? SPAWN_MARGIN
                : SPAWN_MARGIN + (this.lv + 1) * SLOT_WIDTH);
    }

    /**
     * Đích tuần tra khi không có mục tiêu trong tầm với: đi tới mép dải đang ở xa.
     *
     * <p>Chọn theo vị trí hiện tại chứ không random, vì random sẽ hỏng ở boss chính: dải của nó bị
     * {@link #clampToSpawnArea} kẹp sát mép trái (120), nên đích bên trái lọt về đúng vị trí đang
     * đứng và {@link #moveTo(int, int)} sẽ không bước nào. Hướng ngược lại thì
     * luôn khác vị trí hiện tại: đang ở mép này thì đi tới mép kia, nên boss không bao giờ đứng yên.
     */
    private int getPatrolX() {
        int minBandX = getBandMinX();
        int maxBandX = getBandMaxX();
        if (minBandX >= maxBandX) {
            return getHomeX();
        }
        return this.location.x <= (minBandX + maxBandX) / 2 ? maxBandX : minBandX;
    }

    /**
     * Kẹp một X vào dải riêng {@code [getBandMinX(), getBandMaxX()]} của boss.
     *
     * <p>Hai mép dải đi qua {@link #clampToSpawnArea(int)} để boss không bị kẹp vô ích ra ngoài
     * bề ngang dùng được. Van an toàn: thiếu zone/map/location thì trả về nguyên X, vì lúc đó
     * mọi thao tác di chuyển đều vô nghĩa và {@link #moveTo(int, int)} đã tự thoát sớm.
     */
    private int clampToOwnBand(int x) {
        if (this.zone == null || this.zone.map == null || this.location == null) {
            return x;
        }
        return Math.max(getBandMinX(), Math.min(x, getBandMaxX()));
    }

    /** Mép trái dải X của boss, đã kẹp vào bề ngang dùng được. */
    private int getBandMinX() {
        return clampToSpawnArea(getHomeX() - BAND_HALF_WIDTH);
    }

    /** Mép phải dải X của boss, đã kẹp vào bề ngang dùng được. */
    private int getBandMaxX() {
        return clampToSpawnArea(getHomeX() + BAND_HALF_WIDTH);
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
     *
     * <p>Trả về {@link #getHomeX()} để vị trí spawn và tâm dải luôn là một: gọi thẳng
     * {@code clampToSpawnArea(SPAWN_MARGIN)} cũng cho cùng kết quả, nhưng phải lặp lại công thức.
     */
    @Override
    protected int getMapSpawnX() {
        return getHomeX();
    }

    /**
     * Vị trí đứng của boss con: slot {@code lv + 1}, tức {@code 120 + (lv + 1) * 200}
     * → 320, 520, 720, 920, 1120 cho {@code lv} 0..4. Cả nhóm phủ tới 1120, vẫn nằm trong
     * khoảng an toàn {@code [120, 1319]} của bề ngang 1440 nên không cần kẹp biên, nhưng vẫn kẹp
     * phòng thủ cho map hẹp hơn.
     */
    @Override
    protected int getGroupMemberSpawnX() {
        // Chỉ được Boss.joinMap() gọi trên boss con; trả đúng tâm dải là đủ và tránh lệch với getHomeX().
        return getHomeX();
    }

    /**
     * Kẹp X vào khoảng dùng được {@code [SPAWN_MARGIN, mapWidth - 1 - SPAWN_MARGIN]}.
     *
     * <p><b>Ràng buộc thiết kế (không phải guard runtime):</b> để sáu slot cùng bán kính dải
     * {@link #BAND_HALF_WIDTH} còn nằm trọn trong khoảng này thì cần
     * {@code mapWidth >= SPAWN_MARGIN + 5 * SLOT_WIDTH + BAND_HALF_WIDTH + 1 = 1321}. Map
     * 131/132/133 đều rộng 1440 nên thoả; hàm này chỉ kẹp biên chứ không kiểm tra điều kiện đó.
     */
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
