package nro.models.services_dungeon;

import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.consts.ConstNpc;
import nro.models.map.Zone;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.npc.Npc;
import nro.models.map.service.NpcService;
import nro.models.player.Pet;
import nro.models.player.Player;
import nro.models.server.Manager;
import nro.models.server.ServerManager;
import nro.models.server.ServerNotify;
import nro.models.services.Service;
import nro.models.utils.TimeUtil;
import nro.models.utils.Util;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class MajinBuuService implements Runnable {

    public static byte HOUR_OPEN_MAP_MABU = 12;
    public static final int AVAILABLE = 13;

    private static MajinBuuService instance;
    private volatile boolean mabuEventOpen;
    /** Mabư map 120 đã bị hạ trong khung 12h hiện tại — không cho Drabura/boss hồi sinh. */
    private volatile boolean mabu12hDefeated;
    private long lastClearWaitMs;

    public static MajinBuuService gI() {
        if (instance == null) {
            instance = new MajinBuuService();
        }
        return instance;
    }

    private MajinBuuService() {
        mabuEventOpen = TimeUtil.isMabuOpen();
    }

    @Override
    public void run() {
        while (ServerManager.isRunning) {
            try {
                tickEventWindow();
                Thread.sleep(1000L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception ignored) {
            }
        }
    }

    /** Theo dõi khung 12h: gỡ UI chờ, đuổi người chơi khi hết giờ, đánh thức boss REST. */
    private void tickEventWindow() {
        boolean open = TimeUtil.isMabuOpen();
        if (open != mabuEventOpen) {
            mabuEventOpen = open;
            clearMabuWaitForEventMaps();
            if (open) {
                mabu12hDefeated = false;
                resetFinishMapMaBu();
                wakeRestingEventBosses();
            }
        } else if (open && Util.canDoWithTime(lastClearWaitMs, 10_000L)) {
            clearMabuWaitForEventMaps();
            lastClearWaitMs = System.currentTimeMillis();
        }
    }

    /** Gỡ màn hình "Xin chờ" (-117) cho mọi người trên map Mabư 12h. */
    public void clearMabuWaitForEventMaps() {
        for (nro.models.map.Map map : Manager.MAPS) {
            if (!MapService.gI().isMapMaBu(map.mapId)) {
                continue;
            }
            for (Zone zone : map.zones) {
                Service.gI().clearMabuWait(zone);
                for (Player pl : zone.getPlayers()) {
                    if (pl != null && pl.isPl()) {
                        Service.gI().clearMabuWait(pl);
                    }
                }
            }
        }
    }

    public boolean isMabu12hDefeated() {
        return mabu12hDefeated;
    }

    /** Cờ phe boss map 12h: Goku=9 (phe Ôsin), còn lại=10 (phe Babiđây). */
    public byte resolveMabu12hBossFlag(Boss boss) {
        if (boss != null && boss.id == BossID.GOKU) {
            return 9;
        }
        return 10;
    }

    /** Boss map 12h: đặt cờ phe đúng + bật PK để client/skill target được boss. */
    public void armBossForPlayerCombat(Boss boss) {
        if (boss == null) {
            return;
        }
        byte flag = resolveMabu12hBossFlag(boss);
        if (boss.cFlag != flag) {
            Service.gI().changeFlag(boss, flag);
        }
        if (boss.typePk != ConstPlayer.PK_ALL) {
            boss.changeToTypePK();
        }
    }

    /** Player/đệ trên map Mabư 12h luôn được coi là địch của boss (tránh lỗi trùng cờ 10). */
    public boolean isHostileToMabu12hBoss(Player plAtt, Boss boss) {
        if (plAtt == null || boss == null) {
            return false;
        }
        Player owner = plAtt;
        if (plAtt.isPet && plAtt instanceof Pet pet && pet.master != null) {
            owner = pet.master;
        }
        if (!owner.isPl() || owner.zone == null) {
            return false;
        }
        int bossMapId = resolveBossMapId(boss);
        return bossMapId != -1
                && MapService.gI().isMapMaBu(owner.zone.map.mapId)
                && owner.zone.map.mapId == bossMapId;
    }

    private int resolveBossMapId(Boss boss) {
        if (boss.zone != null && boss.zone.map != null) {
            return boss.zone.map.mapId;
        }
        if (boss.zoneFinal != null && boss.zoneFinal.map != null) {
            return boss.zoneFinal.map.mapId;
        }
        return -1;
    }

    /** Giữ boss luôn PK + đúng cờ phe để client và server nhận đòn đánh. */
    public void ensureBossesCombatReady(Zone zone) {
        if (zone == null || !MapService.gI().isMapMaBu(zone.map.mapId)) {
            return;
        }
        for (Player p : zone.getBosses()) {
            if (p instanceof Boss boss && !boss.isDie()
                    && boss.bossStatus != BossStatus.REST
                    && boss.bossStatus != BossStatus.LEAVE_MAP) {
                byte flag = resolveMabu12hBossFlag(boss);
                if (boss.typePk != ConstPlayer.PK_ALL || boss.cFlag != flag) {
                    armBossForPlayerCombat(boss);
                }
            }
        }
    }

    public void ensurePlayerMabu12hFlag(Player player) {
        if (player == null || !player.isPl() || player.zone == null) {
            return;
        }
        if (MapService.gI().isMapMaBu(player.zone.map.mapId) && player.cFlag != 9) {
            Service.gI().changeFlag(player, 9);
        }
    }

    private void resetFinishMapMaBu() {
        for (nro.models.map.Map map : Manager.MAPS) {
            if (!MapService.gI().isMapMaBu(map.mapId)) {
                continue;
            }
            for (Zone zone : map.zones) {
                zone.finishMapMaBu = false;
            }
        }
    }

    /** Khi mở cửa 12h, boss map cố định đang REST được hồi sinh nếu đủ cooldown. */
    private void wakeRestingEventBosses() {
        if (mabu12hDefeated) {
            return;
        }
        for (Boss boss : BossManager.gI().getBosses()) {
            if (boss.zoneFinal == null || !MapService.gI().isMapMaBu(boss.zoneFinal.map.mapId)) {
                continue;
            }
            if (boss.bossStatus == BossStatus.REST
                    && Util.canDoWithTime(boss.getLastTimeRest(), boss.getSecondsRest() * 1000L)) {
                boss.changeStatus(BossStatus.RESPAWN);
            }
        }
    }

    /** Hạ Mabư map 120: rơi trứng, ẩn Drabura, đưa người chơi về nhà bằng tàu. */
    public void onMabu12hDefeated(Zone zone, Player killer) {
        mabu12hDefeated = true;
        for (nro.models.map.Map map : Manager.MAPS) {
            if (!MapService.gI().isMapMaBu(map.mapId)) {
                continue;
            }
            for (Zone z : map.zones) {
                z.finishMapMaBu = true;
            }
        }
        retireMabu12hBosses();
        announceAndSendPlayersHome(zone, killer);
    }

    /** Drabura và boss map 12h không xuất hiện lại sau khi Mabư chết. */
    private void retireMabu12hBosses() {
        for (Boss boss : BossManager.gI().getBosses()) {
            if (boss.zoneFinal == null || !MapService.gI().isMapMaBu(boss.zoneFinal.map.mapId)) {
                continue;
            }
            if (boss.bossStatus != BossStatus.REST && boss.bossStatus != BossStatus.DIE) {
                ChangeMapService.gI().exitMap(boss);
            }
            boss.changeStatus(BossStatus.REST);
            boss.setLastTimeRest(System.currentTimeMillis());
        }
    }

    private void announceAndSendPlayersHome(Zone zone, Player killer) {
        String killerName = killer != null ? killer.name : "Một chiến binh";
        ServerNotify.gI().notify(killerName + " đã tiêu diệt Mabư! Map 12h kết thúc.");
        for (nro.models.map.Map map : Manager.MAPS) {
            if (!MapService.gI().isMapMaBu(map.mapId)) {
                continue;
            }
            for (Zone z : map.zones) {
                Npc osin = getNpcOsin(z);
                if (osin != null) {
                    osin.npcChat(z, killerName + " đã tiêu diệt Mabư!\nMau về nhà ấp trứng Mabư thôi!");
                }
                List<Player> players = new ArrayList<>(z.getPlayers());
                for (Player pl : players) {
                    if (pl == null || !pl.isPl()) {
                        continue;
                    }
                    pl.fightMabu.clear();
                    pl.goHome = false;
                    Service.gI().sendThongBao(pl,
                            killerName + " đã tiêu diệt Mabư!\nTàu vũ trụ sẽ đưa bạn về nhà để ấp trứng.");
                    NpcService.gI().createMenuConMeo(pl, -1, 4390,
                            "Trận chiến đã kết thúc.\nTàu vũ trụ đưa bạn về nhà ấp trứng Mabư.", "OK");
                    Player target = pl;
                    Util.setTimeout(() -> {
                        if (target.zone != null && MapService.gI().isMapMaBu(target.zone.map.mapId)) {
                            ChangeMapService.gI().changeMapBySpaceShip(target, target.gender + 21, -1, 300);
                        }
                    }, 4000);
                }
            }
        }
    }

    public Npc getNpcOsin(Zone zone) {
        if (zone == null || zone.map == null) {
            return null;
        }
        for (Npc npc : zone.map.npcs) {
            if (npc.tempId == 44) {
                return npc;
            }
        }
        return null;
    }

    public Npc getNpcOsin(Player player) {
        for (Npc npc : player.zone.map.npcs) {
            if (npc.tempId == 44) {
                return npc;
            }
        }
        return null;
    }

    public Npc getNpcBabiday(Player player) {
        for (Npc npc : player.zone.map.npcs) {
            if (npc.tempId == 46) {
                return npc;
            }
        }
        return null;
    }

    public Npc getNpcBabiday(Zone zone) {
        for (Npc npc : zone.map.npcs) {
            if (npc.tempId == 46) {
                return npc;
            }
        }
        return null;
    }

    public void joinMapMabu(Player player) {
        if (player.isBoss) {
            return;
        }
        // Phe Ôsin (cờ 9) — khác Drabura/Babiđây (cờ 10) mới đánh được boss
        Service.gI().changeFlag(player, 9);
    }

    public void xuongTangDuoi(Player player) {
        if (player == null || !player.isPl() || player.zone == null) {
            return;
        }
        if (player.fightMabu.pointMabu >= player.fightMabu.POINT_MAX && player.zone.map.mapId != 120) {
            osinEscortToNextFloor(player, null);
            return;
        }
        NpcService.gI().createMenuConMeo(player, ConstNpc.MENU_XUONG_TANG_DUOI, player.cFlag == 9 ? 4390 : 4388, "Mau đi với ta xuống tầng tiếp theo", "OK");
    }

    /** Ôsin thông báo rồi đưa người chơi xuống tầng Mabư kế tiếp. */
    public void osinEscortToNextFloor(Player player, String defeatedBoss) {
        if (player == null || !player.isPl() || player.zone == null) {
            return;
        }
        if (player.fightMabu.pointMabu < player.fightMabu.POINT_MAX) {
            return;
        }
        short nextMapId = player.zone.map.mapIdNextMabu((short) player.zone.map.mapId);
        if (nextMapId <= 0) {
            return;
        }
        Npc osin = getNpcOsin(player);
        String bossLabel = defeatedBoss != null && !defeatedBoss.isEmpty() ? defeatedBoss : "boss tầng này";
        String say = player.name + " đã hạ gục " + bossLabel + "!\nMau đi cùng ta xuống tầng tiếp theo.";
        if (osin != null) {
            osin.npcChat(player.zone, player.name + " đã hạ gục " + bossLabel + "!");
            NpcService.gI().createTutorial(player, osin.tempId, osin.avartar, say);
        } else {
            Service.gI().sendThongBao(player, "Ôsin: " + say.replace("\n", " "));
        }
        int destX = osin != null ? osin.cx : -1;
        int destY = osin != null ? osin.cy : 336;
        short destMap = nextMapId;
        Util.setTimeout(() -> {
            if (plStillReady(player, destMap)) {
                ChangeMapService.gI().changeMap(player, destMap, -1, destX, destY);
            }
        }, 2500);
    }

    public void goToNextFloor(Player player) {
        osinEscortToNextFloor(player, null);
    }

    private static boolean plStillReady(Player player, short expectedNextMap) {
        if (player == null || player.zone == null || !player.isPl()) {
            return false;
        }
        return player.fightMabu.pointMabu >= player.fightMabu.POINT_MAX
                && player.zone.map.mapIdNextMabu((short) player.zone.map.mapId) == expectedNextMap;
    }

    public void goHome(Player player) {
        if (player.goHome && Util.canDoWithTime(player.lastUpdateGohomeTime, 3000)) {
            if (player.timeGohome == 30) {
                NpcService.gI().createMenuConMeo(player, -1, 4390, "Trận chiến đã kết thúc, chúng ta phải rời khỏi đây ngay", "OK");
            }
            if (player.timeGohome > 0) {
                Service.gI().sendThongBao(player, "Về nhà sau " + player.timeGohome + " giây nữa");
            }
            player.timeGohome -= 3;
            if (player.timeGohome <= 0) {
                ChangeMapService.gI().changeMapBySpaceShip(player, player.gender + 21, -1, 250);
                player.goHome = false;
            }
            player.lastUpdateGohomeTime = System.currentTimeMillis();
        }
    }

    public void update(Player player) {
        if (player.zone != null && player.isPl() && MapService.gI().isMapMaBu(player.zone.map.mapId)) {
            try {
                goHome(player);
                if (!TimeUtil.isMabuOpen()) {
                    Service.gI().clearMabuWait(player);
                    if (!player.goHome && !player.isAdmin()) {
                        player.goHome = true;
                        player.timeGohome = 30;
                    }
                    return;
                }
                Service.gI().clearMabuWait(player);
                ensurePlayerMabu12hFlag(player);
                ensureBossesCombatReady(player.zone);
            } catch (Exception ignored) {
            }
        }

    }
}
