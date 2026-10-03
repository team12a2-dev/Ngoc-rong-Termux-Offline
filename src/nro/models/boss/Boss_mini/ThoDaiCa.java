package nro.models.boss.Boss_mini;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstItem;
import nro.models.consts.ConstPlayer;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.ItemService;
import nro.models.services.ItemTimeService;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;

import nro.models.server.Client;
import nro.models.map.service.MapService;

/**
 * Mini Boss Thỏ Đại Ca (Monster Carrot)
 * Xuất hiện tại Trái Đất, Namec, Xayda, Siêu Thị.
 * Có kỹ năng biến người chơi thành Củ Cà Rốt nếu không mặc Cải Trang Thỏ.
 */
public class ThoDaiCa extends Boss {

    private long lastTimeTransform;
    private long st;

    public ThoDaiCa() throws Exception {
        super(BossID.THO_DAI_CA, BossesData.THO_DAI_CA);
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
        // 1. Tỉ lệ nhỏ (20%) tìm zone có người chơi online nếu zone đó CHƯA CÓ BOSS NÀO
        try {
            List<Player> onlinePlayers = Client.gI().getPlayers();
            if (onlinePlayers != null && !onlinePlayers.isEmpty() && Util.isTrue(1, 5)) {
                List<Zone> validPlayerZones = new ArrayList<>();
                for (Player pl : onlinePlayers) {
                    if (pl != null && pl.isPl() && !pl.isDie() && pl.zone != null && pl.zone.map != null) {
                        int mapId = pl.zone.map.mapId;
                        if (isValidMapId(mapId)
                                && !MapService.gI().isMapSafeOrHome(mapId)
                                && !BossManager.gI().hasBossInZone(pl.zone)) {
                            validPlayerZones.add(pl.zone);
                        }
                    }
                }
                if (!validPlayerZones.isEmpty()) {
                    return validPlayerZones.get(Util.nextInt(0, validPlayerZones.size() - 1));
                }
            }
        } catch (Exception ignored) {
        }

        // 2. Mặc định: Rải rác ngẫu nhiên trên các map được cấu hình, ưu tiên zone trống
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
    public int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (this.isDie()) {
            return 0;
        }

        // Mini boss giới hạn sát thương nhận mỗi đòn để tăng tính tương tác
        long actualDmg = Math.min(damage > 0 ? damage : 1, 200);
        this.nPoint.subHP(actualDmg);

        if (this.isDie()) {
            this.setDie(plAtt);
            die(plAtt);
        }
        return (int) actualDmg;
    }

    /**
     * Kiểm tra xem người chơi có đang mặc Cải Trang Thỏ (miễn nhiễm) không
     */
    private boolean isImmuneToCarrot(Player pl) {
        if (pl == null) {
            return false;
        }
        try {
            if (pl.nPoint != null && pl.nPoint.isBienCarot) {
                return true;
            }
            if (pl.inventory != null && pl.inventory.itemsBody != null && pl.inventory.itemsBody.size() > 5) {
                Item ct = pl.inventory.itemsBody.get(5);
                if (ct != null && ct.isNotNullItem() && ct.template != null) {
                    int id = ct.template.id;
                    // Cải Trang Thỏ Đại Ca (463) hoặc Cải Trang Thỏ Bunma (464)
                    return id == ConstItem.CAI_TRANG_THO_DAI_CA || id == ConstItem.CAI_TRANG_THO_BUNMA;
                }
            }
        } catch (Exception e) {
        }
        return false;
    }

    /**
     * Biến đối thủ thành Củ Cà Rốt (hiệu ứng Socola/Biến dạng)
     */
    private void tryTransformToCarrot(Player pl) {
        if (pl == null || pl.isDie() || pl.effectSkill == null || pl.zone == null || pl.zone.map == null
                || MapService.gI().isMapSafeOrHome(pl.zone.map.mapId)) {
            return;
        }

        if (isImmuneToCarrot(pl)) {
            if (Util.isTrue(20, 100)) {
                this.chat("Hử? " + pl.name + " cũng là thỏ sao? Phép thuật không có tác dụng!");
            }
            return;
        }

        if (!pl.effectSkill.isSocola && Util.canDoWithTime(lastTimeTransform, 4000)) {
            lastTimeTransform = System.currentTimeMillis();
            int timeDuration = 15000; // 15 giây
            EffectSkillService.gI().setSocola(pl, System.currentTimeMillis(), timeDuration, 1);
            ItemTimeService.gI().sendItemTime(pl, 4082, timeDuration / 1000);
            this.chat("Úm ba la! " + pl.name + " đã biến thành Củ Cà Rốt rồi haha!");
            Service.gI().sendThongBao(pl, "Bạn bị Thỏ Đại Ca phù phép biến thành Củ Cà Rốt!");
        }
    }

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 600) && this.typePk == ConstPlayer.PK_ALL) {
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = this.getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    return;
                }

                if (this.playerSkill.skills != null && !this.playerSkill.skills.isEmpty()) {
                    this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
                }

                int dist = Util.getDistance(this, pl);
                if (dist <= 120) {
                    // Tỉ lệ tung kỹ năng biến thành Cà Rốt
                    if (Util.isTrue(35, 100)) {
                        tryTransformToCarrot(pl);
                    }

                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                } else {
                    if (Util.isTrue(1, 2)) {
                        this.moveToPlayer(pl);
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    @Override
    public void moveTo(int x, int y) {
        byte dir = (byte) (this.location.x - x < 0 ? 1 : -1);
        byte move = (byte) Util.nextInt(30, 45);
        PlayerService.gI().playerMove(this, this.location.x + (dir == 1 ? move : -move), y);
    }

    @Override
    public void reward(Player plKill) {
        try {
            if (this.zone != null && plKill != null) {
                // 1. Luôn rơi từ 1 - 5 Củ Cà Rốt (Item ID 462)
                int carrotCount = Util.nextInt(1, 5);
                for (int i = 0; i < carrotCount; i++) {
                    int x = this.location.x + Util.nextInt(-30, 30);
                    int y = this.zone.map.yPhysicInTop(x, this.location.y);
                    ItemMap itemCarrot = new ItemMap(this.zone, ConstItem.CU_CA_ROT, 1, x, y, plKill.id);
                    Service.gI().dropItemMap(this.zone, itemCarrot);
                }

                // 2. Cơ hội 20% rơi Cải Trang Thỏ Đại Ca (Item ID 463)
                if (Util.isTrue(20, 100)) {
                    int x = this.location.x + Util.nextInt(-20, 20);
                    int y = this.zone.map.yPhysicInTop(x, this.location.y);
                    ItemMap itemCt = new ItemMap(this.zone, ConstItem.CAI_TRANG_THO_DAI_CA, 1, x, y, plKill.id);

                    // Option chuẩn logic và công dụng đặc trưng của Cải Trang Thỏ Đại Ca:
                    itemCt.options.add(new Item.ItemOption(115, 0));                        // Biến cà rốt (kháng phép biến Cà Rốt và biến người xung quanh thành Cà Rốt)
                    itemCt.options.add(new Item.ItemOption(116, 0));                        // Kháng Thái Dương Hạ San
                    itemCt.options.add(new Item.ItemOption(50, Util.nextInt(10, 15)));      // +10% đến 15% Sức đánh
                    itemCt.options.add(new Item.ItemOption(77, Util.nextInt(10, 15)));      // +10% đến 15% HP
                    itemCt.options.add(new Item.ItemOption(103, Util.nextInt(10, 15)));     // +10% đến 15% KI
                    itemCt.options.add(new Item.ItemOption(108, Util.nextInt(5, 10)));      // +5% đến 10% Né đòn (nhanh nhẹn)
                    itemCt.options.add(new Item.ItemOption(14, Util.nextInt(2, 5)));        // +2% đến 5% Chí mạng

                    // Cơ hội nhận Cải Trang Vĩnh Viễn: 10% tỉ lệ vĩnh viễn (không có option 93 HSD)
                    // 90% còn lại là cải trang có Hạn Sử Dụng (từ 3 đến 7 ngày)
                    if (!Util.isTrue(10, 100)) {
                        itemCt.options.add(new Item.ItemOption(93, Util.nextInt(3, 7)));    // Hạn sử dụng 3 - 7 ngày
                    }

                    itemCt.options.add(new Item.ItemOption(30, 0));                         // Không thể giao dịch
                    Service.gI().dropItemMap(this.zone, itemCt);
                }

                // 3. Tích điểm sự kiện & thông báo
                int diem = 5;
                plKill.event.addEventPoint(diem);
                Service.gI().sendThongBao(plKill, "Bạn nhận được +" + diem + " Point sự kiện từ Thỏ Đại Ca!");

                TaskService.gI().checkDoneTaskKillBoss(plKill, this);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void active() {
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
        }
        this.attack();
        if (Util.canDoWithTime(st, 900000)) { // 15 phút
            this.changeStatus(BossStatus.LEAVE_MAP);
        }
    }

    @Override
    public void joinMap() {
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
        markRestAndSchedule();
        this.changeStatus(BossStatus.REST);
    }
}
