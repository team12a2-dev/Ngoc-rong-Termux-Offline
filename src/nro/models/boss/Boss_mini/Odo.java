package nro.models.boss.Boss_mini;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.BossesData;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.consts.ConstTaskBadges;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import static nro.models.player.EffectSkin.textOdo;
import nro.models.services.EffectSkillService;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.skill.Skill;
import nro.models.task.BadgesTaskService;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;

import nro.models.server.Client;

public class Odo extends Boss {

    private long lastTimeOdo;
    private long lastTimeHpRegen;
    private long st;

    public Odo() throws Exception {
        super(BossID.O_DO1, BossesData.O_DO);
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

        // Mini boss Ô Đô nhận sát thương giới hạn mỗi đòn để người chơi phối hợp tiêu diệt
        long actualDmg = Math.min(damage, 100);
        if (actualDmg <= 0) {
            actualDmg = 1;
        }
        this.nPoint.subHP(actualDmg);

        if (this.isDie()) {
            this.setDie(plAtt);
            die(plAtt);
        }
        return (int) actualDmg;
    }

    private void updateOdo() {
        try {
            int param = 10;
            int randomTime = Util.nextInt(3000, 5000);
            if (Util.canDoWithTime(lastTimeOdo, randomTime)) {
                if (this.zone != null && this.zone.map != null && !MapService.gI().isMapSafeOrHome(this.zone.map.mapId)) {
                    List<Player> playersMap = this.zone.getNotBosses();
                    for (int i = playersMap.size() - 1; i >= 0; i--) {
                        Player pl = playersMap.get(i);
                        if (pl != null && pl.nPoint != null && !this.equals(pl) && !pl.isBoss && !pl.isDie()
                                && pl.zone != null && pl.zone.map != null && !MapService.gI().isMapSafeOrHome(pl.zone.map.mapId)
                                && Util.getDistance(this, pl) <= 200) {
                            int subHp = (int) ((long) pl.nPoint.hpMax * param / 100);
                            if (subHp >= pl.nPoint.hp) {
                                subHp = Math.max(1, pl.nPoint.hp - 1);
                            }
                            this.chat("Bùm Bùm! Mùi hôi thối lan tỏa!");
                            Service.gI().chat(pl, textOdo[Util.nextInt(0, textOdo.length - 1)]);
                            PlayerService.gI().sendInfoHpMpMoney(pl);
                            pl.injured(null, subHp, true, false);
                        }
                    }
                }
                this.lastTimeOdo = System.currentTimeMillis();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void regenHp() {
        try {
            if (Util.canDoWithTime(lastTimeHpRegen, 30000)) {
                int regenPercentage = Util.nextInt(10, 20);
                int regenAmount = (this.nPoint.hpMax * regenPercentage / 100);
                PlayerService.gI().hoiPhuc(this, regenAmount, 0);
                this.chat("Mùi Của Các Ngươi Thơm Quá!! HAHA");
                this.lastTimeHpRegen = System.currentTimeMillis();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 500) && this.typePk == ConstPlayer.PK_ALL) {
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = this.getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    return;
                }
                if (this.playerSkill.skills != null && !this.playerSkill.skills.isEmpty()) {
                    this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
                }

                if (Util.getDistance(this, pl) <= 100) {
                    if (Util.isTrue(5, 20)) {
                        if (SkillUtil.isUseSkillChuong(this)) {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 200)),
                                    Util.nextInt(10) % 2 == 0 ? pl.location.y : pl.location.y - Util.nextInt(0, 70));
                        } else {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(10, 40)),
                                    Util.nextInt(10) % 2 == 0 ? pl.location.y : pl.location.y - Util.nextInt(0, 50));
                        }
                    }
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                    this.updateOdo();
                } else {
                    if (Util.isTrue(1, 2)) {
                        this.moveToPlayer(pl);
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
        this.regenHp();
    }

    @Override
    public void moveTo(int x, int y) {
        byte dir = (byte) (this.location.x - x < 0 ? 1 : -1);
        byte move = (byte) Util.nextInt(30, 40);
        PlayerService.gI().playerMove(this, this.location.x + (dir == 1 ? move : -move), y);
    }

    @Override
    public void reward(Player plKill) {
        try {
            if (this.zone != null && plKill != null) {
                int x = this.location.x + Util.nextInt(-20, 20);
                int y = this.zone.map.yPhysicInTop(x, this.location.y);

                ItemMap item = new ItemMap(this.zone, 19, 1, x, y, plKill.id);
                Service.gI().dropItemMap(this.zone, item);

                BadgesTaskService.updateCountBagesTask(plKill, ConstTaskBadges.O_DO, 1);
                Service.gI().sendThongBao(plKill, "+5 Point");

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
        if (Util.canDoWithTime(st, 900000)) {
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
