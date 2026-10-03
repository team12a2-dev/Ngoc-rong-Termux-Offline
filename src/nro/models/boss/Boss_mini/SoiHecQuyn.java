package nro.models.boss.Boss_mini;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.Boss;
import nro.models.boss.BossesData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.ConstTaskBadges;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.services.SkillService;
import nro.models.task.BadgesTaskService;
import nro.models.utils.Logger;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;

import nro.models.server.Client;
import nro.models.map.service.MapService;

public class SoiHecQuyn extends Boss {

    private long lastTimeDrop;
    private long st;
    private int timeLeave;
    private boolean KiemTraNhatXuong = false;
    private long ThoiGianNhatXuong = 0;
    private long lastTimRestPawn;

    public SoiHecQuyn() throws Exception {
        super(BossID.SOI_HEC_QUYN1, BossesData.SOI_HEC_QUYN);
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
    public void joinMap() {
        if (zoneFinal != null) {
            joinMapByZone(zoneFinal);
            this.changeStatus(BossStatus.CHAT_S);
            this.wakeupAnotherBossWhenAppear();
            this.ThoiGianNhatXuong = 0;
            this.KiemTraNhatXuong = false;
            return;
        }

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
                    List<Zone> availableZones = new ArrayList<>();
                    for (Zone zone : this.zone.map.zones) {
                        if (zone.getNumOfPlayers() <= 10 && !BossManager.gI().hasBossInZone(zone)) {
                            availableZones.add(zone);
                        }
                    }
                    if (!availableZones.isEmpty()) {
                        target = availableZones.get(Util.nextInt(availableZones.size()));
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
                st = System.currentTimeMillis();
                timeLeave = Util.nextInt(100000, 300000);
            } catch (Exception e) {
                Logger.error(this.data[0].getName() + ": Lỗi đang tiến hành REST\n");
                this.changeStatus(BossStatus.REST);
            }
        } else {
            Logger.error(this.data[0].getName() + ": Lỗi map đang tiến hành RESPAWN\n");
            this.changeStatus(BossStatus.RESPAWN);
        }
    }

    @Override
    public void chatM() {
        if (this.data[this.currentLevel].getTextM().length == 0) {
            return;
        }
        if (!Util.canDoWithTime(this.lastTimeChatM, this.timeChatM)) {
            return;
        }
        String textChat = this.data[this.currentLevel].getTextM()[Util.nextInt(0,
                this.data[this.currentLevel].getTextM().length - 1)];
        int prefix = Integer.parseInt(textChat.substring(1, textChat.lastIndexOf("|")));
        textChat = textChat.substring(textChat.lastIndexOf("|") + 1);
        this.chat(prefix, textChat);
        this.lastTimeChatM = System.currentTimeMillis();
        this.timeChatM = Util.nextInt(3000, 20000);
    }

    @Override
    public void active() {
        this.attack();
    }

    @Override
    public void autoLeaveMap() {
        if (Util.canDoWithTime(st, timeLeave)) {
            this.leaveMapNew();
        }
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        markRestAndSchedule();
        this.changeStatus(BossStatus.REST);
    }

    public void NhatXuong() {
        KiemTraNhatXuong = true;
        ThoiGianNhatXuong = System.currentTimeMillis();
    }

    public boolean KiemTraNhatXuong() {
        return KiemTraNhatXuong;
    }

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 500)) {
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = getPlayerAttack();
                if (pl == null || pl.location == null) {
                    return;
                }
                if (this.playerSkill.skills != null && !this.playerSkill.skills.isEmpty()) {
                    this.playerSkill.skillSelect = this.playerSkill.skills
                            .get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
                }
                int dist = Util.getDistance(this, pl);
                if (dist <= this.getRangeCanAttackWithSkillSelect()) {
                    if (dist > 50) {
                        if (Util.isTrue(5, 20)) {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 100)), pl.location.y);
                        }
                    } else {
                        // Cận chiến <= 50: Vồ / cắn gây sát thương
                        if (Util.isTrue(30, 100)) {
                            this.chat("Gâu gâu! Grừuu!");
                        }
                    }
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                } else {
                    if (Util.isTrue(1, 2)) {
                        this.moveToPlayer(pl);
                    }
                }
                if (ThoiGianNhatXuong > 0) {
                    if (Util.canDoWithTime(ThoiGianNhatXuong, 5000)) {
                        ThoiGianNhatXuong = 0;
                        KiemTraNhatXuong = false;
                    }
                }
            } catch (Exception ex) {
            }
        }
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (this.isDie()) {
            return 0;
        }

        // Cho phép nhận sát thương tối đa theo hit để có thể bị tiêu diệt
        long actualDamage = Math.min(damage > 0 ? damage : 1, 500);
        this.nPoint.subHP(actualDamage);

        if (this.nPoint.hp <= 0) {
            this.die(plAtt);
        }
        return (int) actualDamage;
    }

    @Override
    public void reward(Player plKill) {
        try {
            if (this.zone != null && plKill != null) {
                int[] itemDropIds = { 1591, 1594 };
                for (int itemId : itemDropIds) {
                    int x = this.location.x + Util.nextInt(-20, 20);
                    int y = this.zone.map.yPhysicInTop(x, this.location.y);

                    ItemMap itemMap = new ItemMap(this.zone, itemId, 1, x, y, plKill.id);
                    Service.gI().dropItemMap(this.zone, itemMap);
                }
                BadgesTaskService.updateCountBagesTask(plKill, ConstTaskBadges.KE_THAO_TUNG_SOI, 1);
                int diem = 5;
                plKill.event.addEventPoint(diem);
                Service.gI().sendThongBao(plKill, "+5 Point");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
