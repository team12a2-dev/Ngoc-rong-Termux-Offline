package nro.models.boss.yardrat;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.boss.spawn.BossSpawnConfig;
import nro.models.consts.ConstItem;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Pet;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.utils.Logger;
import nro.models.utils.Util;

/** A configured Yardrat boss whose reward contributes to the Goku SSJ2 exchange. */
public final class YardratBoss extends Yardart {

    private static final int TILE_SIZE = 24;
    private static final int SPAWN_MARGIN = 120;
    private static final int MAX_VERTICAL_DELTA = 48;
    /** Chênh lệch cao tối đa được phép — chặn đánh lên người chơi đứng trên khu cao (1 ô = 24px) */
    private static final int MAX_ABOVE_TARGET_DELTA = 12;
    private static final int CHILD_COUNT = 5;

    /** Số lần nhóm boss chính đã vào map — dùng để xoay vị trí, không spawn cố định 1 điểm */
    private int spawnCounter;
    /** Index điểm rải đã dùng cho boss chính; boss con đọc lại để giãn đều quanh điểm này */
    private int spawnRootIndex = -1;
    /** Lần tính điểm rải gần nhất có phải chia đều bề ngang (dùng cho log chẩn đoán) */
    private boolean lastPointsEvenSpread;

    private record SpawnPoint(int x, int y) {
    }

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

    @Override
    protected int getMapSpawnX() {
        List<SpawnPoint> points = getStableSpawnPoints();
        if (points.isEmpty()) {
            this.spawnRootIndex = -1;
            return super.getMapSpawnX();
        }
        // Xoay vòng mỗi lần spawn: không bắn boss chính về đúng một điểm cố định
        this.spawnRootIndex = Util.nextInt(0, points.size() - 1);
        this.spawnCounter++;
        return points.get(this.spawnRootIndex).x();
    }

    @Override
    protected int getGroupMemberSpawnX() {
        List<SpawnPoint> points = getStableSpawnPoints();
        if (this.parentBoss == null || points.size() < CHILD_COUNT + 1) {
            return super.getGroupMemberSpawnX();
        }

        int rootIndex = currentRootIndex(points.size());
        List<SpawnPoint> available = new ArrayList<>(points.size() - 1);
        for (int i = 0; i < points.size(); i++) {
            if (i != rootIndex) {
                available.add(points.get(i));
            }
        }
        int childIndex = Math.max(0, Math.min(CHILD_COUNT - 1, this.lv));
        int slot = (int) Math.round((double) childIndex * (available.size() - 1) / (CHILD_COUNT - 1));
        return available.get(slot).x();
    }

    /** Chẩn đoán: in số điểm rải và điểm boss chính vừa chọn. */
    @Override
    protected void logSpawnPosition(String role) {
        super.logSpawnPosition(role);
        if (!BossSpawnConfig.spawnDebugLog || this.zone == null || this.zone.map == null) {
            return;
        }
        List<SpawnPoint> points = getStableSpawnPoints();
        Logger.warningln(String.format(
                "[SPAWN-YARDART] id=%d zone=%d spawnNo=%d points=%d rootIndex=%d evenSpread=%s baselineY=%d mapHeight=%d",
                (int) this.id,
                this.zone.zoneId,
                this.spawnCounter,
                points.size(),
                points.isEmpty() ? -1 : currentRootIndex(points.size()),
                lastPointsEvenSpread,
                clampedBaseline(),
                this.zone.map.mapHeight));
    }

    @Override
    protected int getMapSpawnY(int x) {
        if (this.zone == null || this.zone.map == null) {
            return super.getMapSpawnY(x);
        }
        return groundYAt(x);
    }

    @Override
    protected boolean canAttackTargetAtCurrentHeight(Player target) {
        return isTargetWithinHeight(target);
    }

    /** Chốt chặn cuối cho mọi đường đánh (chiêu, lan, bom) — xem Player.injured. */
    @Override
    public boolean canHitTargetAtHeight(Player target) {
        return isTargetWithinHeight(target);
    }

    /**
     * Boss Yardrat đứng trên mặt đất nên chỉ đánh được mục tiêu cùng tầm hoặc thấp hơn,
     * không đánh lên người chơi đang đứng trên khu cao. Trục y tăng xuống nên mục tiêu
     * ở trên cao có y nhỏ hơn boss.
     */
    private boolean isTargetWithinHeight(Player target) {
        if (target == null || this.zone == null || target.zone == null || !this.zone.equals(target.zone)) {
            return false;
        }
        if (this.location == null || target.location == null) {
            return false;
        }
        int deltaY = target.location.y - this.location.y;
        return deltaY >= -MAX_ABOVE_TARGET_DELTA && deltaY <= MAX_VERTICAL_DELTA;
    }

    /** Ưu tiên mục tiêu đứng cùng tầm với boss thay vì chọn ngẫu nhiên rồi đứng yên. */
    @Override
    public Player getPlayerAttack() {
        Player target = super.getPlayerAttack();
        if (isTargetWithinHeight(target)) {
            return target;
        }
        Player onSameGround = pickTargetOnSameGround();
        if (onSameGround != null) {
            this.playerTarger = onSameGround;
            this.lastTimeTargetPlayer = System.currentTimeMillis();
            this.timeTargetPlayer = Util.nextInt(5000, 7000);
            return onSameGround;
        }
        this.playerTarger = null;
        return null;
    }

    private Player pickTargetOnSameGround() {
        if (this.zone == null) {
            return null;
        }
        List<Player> candidates = this.zone.getNotBosses();
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }
        List<Player> valid = new ArrayList<>();
        for (Player player : candidates) {
            if (player == null || player.isDie()) {
                continue;
            }
            // Giữ đúng bộ lọc mục tiêu của Zone.getRandomPlayerInMap
            if (player.effectSkin != null && player.effectSkin.isVoHinh) {
                continue;
            }
            if (player.maBuHold != null || player.isMabuHold) {
                continue;
            }
            if (player.isPet && ((Pet) player).master != null && ((Pet) player).master.equals(this)) {
                continue;
            }
            if (isTargetWithinHeight(player)) {
                valid.add(player);
            }
        }
        if (valid.isEmpty()) {
            return null;
        }
        return valid.get(Util.nextInt(0, valid.size() - 1));
    }

    /** Yardrat bosses walk horizontally on their current/lower surface; they do not jump to a higher target. */
    @Override
    public void moveTo(int x, int ignoredY) {
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

        int nextY = this.location.y;
        int surfaceY = this.zone.map.yPhysicInTop(nextX, nextY);
        if (surfaceY >= nextY && surfaceY - nextY <= MAX_VERTICAL_DELTA) {
            nextY = surfaceY;
        }
        PlayerService.gI().playerMove(this, nextX, nextY);
    }

    /**
     * Các cột đứng an toàn để rải boss. Không phụ thuộc mốc Y hardcode: mốc nằm ngoài map
     * (tile data thiếu/nhỏ hơn) sẽ được kẹp vào trong map, và nếu map không có đủ điểm
     * đệm thì chia đều bề ngang — tuyệt đối không rơi về dồn cụm 30px của boss con.
     */
    private List<SpawnPoint> getStableSpawnPoints() {
        List<SpawnPoint> points = new ArrayList<>();
        lastPointsEvenSpread = false;
        if (this.zone == null || this.zone.map == null) {
            return points;
        }
        int width = this.zone.map.mapWidth;
        int baseline = clampedBaseline();
        for (int x = SPAWN_MARGIN; x < width - SPAWN_MARGIN; x += TILE_SIZE) {
            int y = this.zone.map.yPhysicInTop(x, baseline);
            if (isValidSurface(y, baseline)) {
                points.add(new SpawnPoint(x, y));
            }
        }
        if (points.size() < CHILD_COUNT + 1) {
            points = evenlySpreadPoints();
            lastPointsEvenSpread = true;
        }
        return points;
    }

    /** Chia đều CHILD_COUNT + 1 điểm trên bề ngang dùng được — thay cho fallback dồn cụm. */
    private List<SpawnPoint> evenlySpreadPoints() {
        List<SpawnPoint> points = new ArrayList<>();
        if (this.zone == null || this.zone.map == null) {
            return points;
        }
        int width = this.zone.map.mapWidth;
        int lastX = width - SPAWN_MARGIN - 1;
        if (lastX <= SPAWN_MARGIN) {
            // Map quá hẹp để rải — để Boss tự random thay vì chồng lên nhau
            return points;
        }
        int slot = Math.max(TILE_SIZE, (width - 2 * SPAWN_MARGIN) / (CHILD_COUNT + 1));
        for (int i = 0; i <= CHILD_COUNT; i++) {
            int x = Math.min(lastX, SPAWN_MARGIN + i * slot);
            points.add(new SpawnPoint(x, groundYAt(x)));
        }
        return points;
    }

    /** Mốc Y ưu tiên, kẹp vào trong map để yPhysicInTop không trả về giá trị ngoài bản đồ. */
    private int clampedBaseline() {
        if (this.zone == null || this.zone.map == null) {
            return 456;
        }
        int height = this.zone.map.mapHeight;
        int baseline = preferredSpawnY();
        if (baseline <= 0) {
            return Math.max(TILE_SIZE, height - MAX_VERTICAL_DELTA);
        }
        if (baseline >= height) {
            return Math.max(TILE_SIZE, height - TILE_SIZE);
        }
        return baseline;
    }

    /** Nền thật tại cột x: dò quanh mốc ưu tiên (trên và dưới) để không bị lơ lửng. */
    private int groundYAt(int x) {
        if (this.zone == null || this.zone.map == null) {
            return 0;
        }
        int baseline = clampedBaseline();
        // 1) Dò xuống từ mốc — nơi nền thật nằm ở hoặc thấp hơn mốc
        int y = this.zone.map.yPhysicInTop(x, baseline);
        if (isValidSurface(y, baseline)) {
            return y;
        }
        // 2) Dò lên trên — mốc hardcode có thể thấp hơn nền thật, đứng ở mốc sẽ bị lơ lửng
        int topLimit = Math.max(TILE_SIZE, baseline - TILE_SIZE * 4);
        for (int probe = baseline - TILE_SIZE; probe >= topLimit; probe -= TILE_SIZE) {
            y = this.zone.map.yPhysicInTop(x, probe);
            if (y > 0 && y < this.zone.map.mapHeight && y <= baseline) {
                return y;
            }
        }
        // 3) Dò từ đáy map — phòng map không có nền đúng mốc
        y = this.zone.map.yPhysicInTop(x, Math.max(TILE_SIZE, this.zone.map.mapHeight - TILE_SIZE));
        if (isValidSurface(y, baseline)) {
            return y;
        }
        return baseline;
    }

    private boolean isValidSurface(int y, int baseline) {
        return y > 0 && y < this.zone.map.mapHeight && Math.abs(y - baseline) <= MAX_VERTICAL_DELTA;
    }

    /** Boss con dùng lại đúng điểm boss chính vừa chọn, nếu không mới quay về điểm mặc định. */
    private int currentRootIndex(int pointCount) {
        if (this.parentBoss instanceof YardratBoss parent
                && parent.spawnRootIndex >= 0 && parent.spawnRootIndex < pointCount) {
            return parent.spawnRootIndex;
        }
        return Math.floorMod(rootSpawnIndex(), pointCount);
    }

    private int rootSpawnIndex() {
        int zoneId = this.zone == null ? 0 : this.zone.zoneId;
        int mapId = this.zone == null || this.zone.map == null ? 0 : this.zone.map.mapId;
        return zoneId + mapId;
    }

    private int preferredSpawnY() {
        if (this.zone == null || this.zone.map == null) {
            return 456;
        }
        return switch (this.zone.map.mapId) {
            case 131 -> 456;
            case 132 -> 432;
            case 133 -> 288;
            default -> Math.max(200, this.zone.map.mapHeight - 144);
        };
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
