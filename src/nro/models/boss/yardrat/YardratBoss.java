package nro.models.boss.yardrat;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.ConstItem;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.utils.Util;

/** A configured Yardrat boss whose reward contributes to the Goku SSJ2 exchange. */
public final class YardratBoss extends Yardart {

    private static final int TILE_SIZE = 24;
    private static final int SPAWN_MARGIN = 120;
    private static final int MAX_VERTICAL_DELTA = 48;
    private static final int CHILD_COUNT = 5;

    private record SpawnPoint(int x, int y) {
    }

    public YardratBoss(int id, BossData data) throws Exception {
        super(id, data);
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

        int x = this.location.x + Util.nextInt(-20, 20);
        int y = this.zone.map.yPhysicInTop(x, this.location.y - TILE_SIZE);
        ItemMap biKiep = new ItemMap(this.zone, ConstItem.BI_KIEP, 1, x, y, player.id);
        biKiep.options.add(new Item.ItemOption(31, points));
        Service.gI().dropItemMap(this.zone, biKiep);
    }

    @Override
    protected int getMapSpawnX() {
        List<SpawnPoint> points = getStableSpawnPoints();
        if (points.isEmpty()) {
            return this.zone != null && this.zone.map != null ? this.zone.map.mapWidth / 2 : super.getMapSpawnX();
        }
        return points.get(rootSpawnIndex(points)).x();
    }

    @Override
    protected int getGroupMemberSpawnX() {
        List<SpawnPoint> points = getStableSpawnPoints();
        if (this.parentBoss == null || points.size() < CHILD_COUNT + 1) {
            return super.getGroupMemberSpawnX();
        }

        int rootIndex = rootSpawnIndex(points);
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

    @Override
    protected int getMapSpawnY(int x) {
        if (this.zone == null || this.zone.map == null) {
            return super.getMapSpawnY(x);
        }
        int baseline = preferredSpawnY();
        int surfaceY = this.zone.map.yPhysicInTop(x, baseline);
        return surfaceY > 0 && Math.abs(surfaceY - baseline) <= MAX_VERTICAL_DELTA ? surfaceY : baseline;
    }

    @Override
    protected boolean canAttackTargetAtCurrentHeight(Player target) {
        return target != null && target.zone == this.zone && this.location != null && target.location != null
                && Math.abs(target.location.y - this.location.y) <= MAX_VERTICAL_DELTA;
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

    private List<SpawnPoint> getStableSpawnPoints() {
        List<SpawnPoint> points = new ArrayList<>();
        if (this.zone == null || this.zone.map == null) {
            return points;
        }
        int width = this.zone.map.mapWidth;
        int baseline = preferredSpawnY();
        for (int x = SPAWN_MARGIN; x < width - SPAWN_MARGIN; x += TILE_SIZE) {
            int y = this.zone.map.yPhysicInTop(x, baseline);
            if (y > 0 && Math.abs(y - baseline) <= MAX_VERTICAL_DELTA) {
                points.add(new SpawnPoint(x, y));
            }
        }
        return points;
    }

    private int rootSpawnIndex(List<SpawnPoint> points) {
        int zoneId = this.zone == null ? 0 : this.zone.zoneId;
        int mapId = this.zone == null || this.zone.map == null ? 0 : this.zone.map.mapId;
        return Math.floorMod(zoneId + mapId, points.size());
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
