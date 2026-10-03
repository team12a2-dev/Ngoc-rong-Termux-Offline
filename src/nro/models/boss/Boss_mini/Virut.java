package nro.models.boss.Boss_mini;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.services.ItemTimeService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.item.Item;
import nro.models.consts.ConstItem;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.skill.Skill;
import nro.models.utils.Util;

public class Virut extends Boss {

    private final Map<Long, Long> globalEffectTimers = new ConcurrentHashMap<>();
    private long st;
    private long lastTimeCheckEffect;

    public Virut() throws Exception {
        super(BossID.Virut, new BossData(
                "Virut " + Util.nextInt(1, 49),
                ConstPlayer.TRAI_DAT,
                new short[] { 651, 778, 779, -1, -1, -1 },
                10,
                new int[] { 100 },
                new int[] { 1, 2, 3, 8, 9, 10, 15, 16, 17 },
                new int[][] { { Skill.DRAGON, 7, 1000 } },
                new String[] {
                        "|-1|Khè khè... Môi trường ở đây thật hoàn hảo để nhân bản!",
                        "|-1|Hắt xìii! Một giọt bắn, vạn người lây!"
                },
                new String[] {
                        "|-1|Mầm bệnh đã xâm nhập vào huyết quản của ngươi... Đếm ngược thời gian phát sốt đi!",
                        "|-1|Khè khè! Chúc mừng bạn đã trúng gói độc quyền sốt 39 độ 5!",
                        "|-1|Đừng hòng chạy thoát khỏi siêu vi khuẩn!"
                },
                new String[] {
                        "|-1|Thuốc kháng sinh ở đâu ra mà mạnh thế này... Ta sẽ biến chủng sau!"
                },
                600));
    }

    @Override
    public void die(Player plKill) {
        this.chat("Khụ khụ... Ta bị tiêu diệt rồi nhưng mầm bệnh vẫn còn đó!");
        this.reward(plKill);
        globalEffectTimers.clear();
        this.changeStatus(BossStatus.DIE);
    }

    private void applyEffect(Player player) {
        if (player == null || player.isDie() || player.zone == null || player.zone.map == null
                || MapService.gI().isMapSafeOrHome(player.zone.map.mapId)) {
            return;
        }
        long effectEndTime = System.currentTimeMillis() + 60000; // 60s
        globalEffectTimers.put(player.id, effectEndTime);
        ItemTimeService.gI().sendItemTime(player, 7143, 60);
        this.chat("Khè Khè, " + player.name + " đã dính mầm bệnh! Chuẩn bị sốt rét đi!");
    }

    private void checkGlobalEffects() {
        long currentTime = System.currentTimeMillis();
        Iterator<Map.Entry<Long, Long>> it = globalEffectTimers.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<Long, Long> entry = it.next();
            long playerId = entry.getKey();
            long effectEndTime = entry.getValue();

            if (currentTime >= effectEndTime) {
                Player player = Client.gI().getPlayer(playerId);
                // Chỉ gây sát thương nếu người chơi còn sống, cùng zone với boss và không ở trong map nhà/an toàn
                if (player != null && !player.isDie() && player.zone != null && player.zone.map != null
                        && player.zone.equals(this.zone)
                        && !MapService.gI().isMapSafeOrHome(player.zone.map.mapId)) {
                    if (Util.isTrue(50, 100)) {
                        int dmg = (int) Math.min(player.nPoint.hpMax * 30 / 100, player.nPoint.hp - 1);
                        if (dmg > 0) {
                            player.injured(null, dmg, true, false);
                            Service.gI().sendThongBao(player,
                                    "Bạn bị Virut phát tác làm mất " + Util.numberToMoney(dmg) + " HP!");
                        }
                    }
                }
                it.remove();
            }
        }
    }

    private void updateInfection() {
        try {
            if (this.zone != null && this.zone.map != null && !MapService.gI().isMapSafeOrHome(this.zone.map.mapId) && Util.isTrue(30, 100)) {
                List<Player> playersMap = this.zone.getNotBosses();
                for (Player pl : playersMap) {
                    if (pl != null && pl.nPoint != null && !this.equals(pl) && !pl.isBoss && !pl.isDie()
                            && pl.zone != null && pl.zone.map != null && !MapService.gI().isMapSafeOrHome(pl.zone.map.mapId)
                            && Util.getDistance(this, pl) <= 200) {
                        if (!globalEffectTimers.containsKey(pl.id)) {
                            applyEffect(pl);
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 1000) && this.typePk == ConstPlayer.PK_ALL) {
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = this.getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    return;
                }

                if (this.playerSkill.skills != null && !this.playerSkill.skills.isEmpty()) {
                    this.playerSkill.skillSelect = this.playerSkill.skills
                            .get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
                }

                if (Util.getDistance(this, pl) <= 100) {
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                    this.updateInfection();
                } else {
                    this.moveToPlayer(pl);
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    @Override
    public void reward(Player plKill) {
        if (this.zone != null && plKill != null) {
            // 1. Tỉ lệ 50% rơi Ngọc Xanh (Item 77) từ 1 đến 50 viên rải rác hàng dài, 50% rơi các bãi vàng (Item 190)
            if (Util.isTrue(50, 100)) {
                int gemCount = Util.nextInt(1, 50);
                int step = 25; // Khoảng cách giữa các viên ngọc
                int startX = this.location.x - (gemCount * step) / 2;
                for (int i = 0; i < gemCount; i++) {
                    int dropX = startX + (i * step);
                    dropX = Math.max(50, Math.min(this.zone.map.mapWidth - 50, dropX));
                    int dropY = this.zone.map.yPhysicInTop(dropX, this.location.y - 24);

                    ItemMap gemDrop = new ItemMap(this.zone, 77, 1, dropX, dropY, plKill.id);
                    Service.gI().dropItemMap(this.zone, gemDrop);
                }
                Service.gI().sendThongBao(plKill, "Boss đánh rơi " + gemCount + " Ngọc Xanh rải rác!");
            } else {
                int piles = Util.nextInt(5, 10);
                int goldPerPile = Util.nextInt(50_000, 200_000);
                for (int i = 0; i < piles; i++) {
                    int dropX = this.location.x + Util.nextInt(-150, 150);
                    dropX = Math.max(50, Math.min(this.zone.map.mapWidth - 50, dropX));
                    int dropY = this.zone.map.yPhysicInTop(dropX, this.location.y - 24);

                    ItemMap goldDrop = new ItemMap(this.zone, 190, goldPerPile, dropX, dropY, plKill.id);
                    Service.gI().dropItemMap(this.zone, goldDrop);
                }
            }

            // 2. Cơ hội 5% rơi Phiếu Giảm Giá (Item 459 - Không thể giao dịch)
            if (Util.isTrue(5, 100)) {
                int dropX = this.location.x + Util.nextInt(-20, 20);
                int dropY = this.zone.map.yPhysicInTop(dropX, this.location.y - 24);
                ItemMap couponDrop = new ItemMap(this.zone, ConstItem.PHIEU_GIAM_GIA, 1, dropX, dropY, plKill.id);
                couponDrop.options.add(new Item.ItemOption(30, 0)); // Không thể giao dịch
                couponDrop.options.add(new Item.ItemOption(93, Util.nextInt(3, 7))); // HSD 3-7 ngày
                Service.gI().dropItemMap(this.zone, couponDrop);
                Service.gI().sendThongBao(plKill, "Bạn nhận được 1 Phiếu Giảm Giá!");
            }

            int diem = 5;
            plKill.event.addEventPoint(diem);
            Service.gI().sendThongBao(plKill, "+5 Point sự kiện từ Virut");
        }
    }

    private boolean isValidMapId(int mapId) {
        int[] maps = this.data[this.currentLevel].getMapJoin();
        for (int m : maps) {
            if (m == mapId) {
                return true;
            }
        }
        return false;
    }

    @Override
    public Zone getMapJoin() {
        int[] maps = this.data[this.currentLevel].getMapJoin();
        try {
            List<Integer> mapList = new ArrayList<>();
            for (int m : maps) {
                if (!MapService.gI().isMapSafeOrHome(m)) {
                    mapList.add(m);
                }
            }
            java.util.Collections.shuffle(mapList);
            for (int mapId : mapList) {
                nro.models.map.Map map = MapService.gI().getMapById(mapId);
                if (map != null && map.zones != null && !map.zones.isEmpty()) {
                    List<Zone> emptyZones = new ArrayList<>();
                    for (Zone z : map.zones) {
                        if (z != null && !BossManager.gI().hasBossInZone(z)) {
                            emptyZones.add(z);
                        }
                    }
                    if (!emptyZones.isEmpty()) {
                        return emptyZones.get(Util.nextInt(0, emptyZones.size() - 1));
                    }
                }
            }
        } catch (Exception ignored) {
        }
        int mapId = maps[Util.nextInt(0, maps.length - 1)];
        nro.models.map.Map map = MapService.gI().getMapById(mapId);
        return map.zones.get(Util.nextInt(0, map.zones.size() - 1));
    }

    @Override
    public void joinMap() {
        this.name = "Virut " + Util.nextInt(1, 49);
        this.nPoint.hpMax = 100;
        this.nPoint.hp = this.nPoint.hpMax;
        this.nPoint.dameg = 1;
        this.joinMap2();
        st = System.currentTimeMillis();
    }

    public void joinMap2() {
        if (this.zone == null) {
            if (this.parentBoss != null) {
                this.zone = parentBoss.zone;
            } else if (this.lastZone == null) {
                this.zone = getMapJoin();
            } else {
                this.zone = this.lastZone;
            }
        }
        if (this.zone != null) {
            try {
                if (MapService.gI().isMapSafeOrHome(this.zone.map.mapId)) {
                    this.changeStatus(BossStatus.REST);
                    return;
                }
                Zone target = null;
                if (!BossManager.gI().hasBossInZone(this.zone)) {
                    target = this.zone;
                } else {
                    List<Zone> validZones = new ArrayList<>();
                    for (Zone z : this.zone.map.zones) {
                        if (z != null && !BossManager.gI().hasBossInZone(z)) {
                            validZones.add(z);
                        }
                    }
                    if (!validZones.isEmpty()) {
                        target = validZones.get(Util.nextInt(0, validZones.size() - 1));
                    }
                }
                if (target != null) {
                    this.zone = target;
                } else {
                    this.zone = getMapJoin();
                }
                int spawnX = Util.nextInt(100, Math.max(150, this.zone.map.mapWidth - 100));
                int spawnY = this.zone.map.yPhysicInTop(spawnX, 100);
                ChangeMapService.gI().changeMap(this, this.zone, spawnX, spawnY);
                this.changeStatus(BossStatus.CHAT_S);
            } catch (Exception e) {
                this.changeStatus(BossStatus.REST);
            }
        } else {
            this.changeStatus(BossStatus.RESPAWN);
        }
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.lastTimeRest = System.currentTimeMillis();
        globalEffectTimers.clear();
        this.changeStatus(BossStatus.REST);
    }

    @Override
    public void active() {
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
        }
        this.attack();
        if (Util.canDoWithTime(lastTimeCheckEffect, 2000)) {
            lastTimeCheckEffect = System.currentTimeMillis();
            this.checkGlobalEffects();
        }
        if (Util.canDoWithTime(st, 900000)) {
            this.changeStatus(BossStatus.LEAVE_MAP);
            this.checkGlobalEffects();
        }
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            int actualDamage = (int) Math.min(damage > 0 ? damage : 1, 10);
            this.nPoint.subHP(actualDamage);

            if (this.nPoint.hp <= 0) {
                this.die(plAtt);
            }

            return actualDamage;
        } else {
            return 0;
        }
    }
}
