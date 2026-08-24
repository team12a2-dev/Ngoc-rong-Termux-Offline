package nro.models.map.phoban;

import nro.models.utils.Functions;
import nro.models.database.AmodsubVN;
import nro.models.database.PlayerDAO;
import java.util.List;
import nro.models.player.Player;
import nro.models.map.service.MapService;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.TimeUtil;
import nro.models.utils.Util;
import nro.models.map.Zone;
import nro.models.server.Client;
import nro.models.server.Maintenance;

public class BlackBallWar implements Runnable {
    public static final int TIME_CAN_PICK_BLACK_BALL_AFTER_DROP = 5000;
    public static final byte X3 = 3;
    public static final byte X5 = 5;
    public static final byte X7 = 7;
    public static final int COST_X3 = 30;
    public static final int COST_X5 = 40;
    public static final int COST_X7 = 50;
    public static final byte HOUR_OPEN = 20;
    public static final byte MIN_OPEN = 0;
    public static final byte SECOND_OPEN = 0;
    public static final byte HOUR_CAN_PICK_DB = 20;
    public static final byte MIN_CAN_PICK_DB = 30;
    public static final byte SECOND_CAN_PICK_DB = 0;
    public static final byte HOUR_CLOSE = 21;
    public static final byte MIN_CLOSE = 0;
    public static final byte SECOND_CLOSE = 0;
    public static final int AVAILABLE = 1;
    private static final int TIME_WIN = 300000;
//  private static final int TIME_WIN = 300;
    private final Zone zone;

    public BlackBallWar(Zone zone) {
        this.zone = zone;
        start();
    }

    private void start() {
        new Thread(this, "Zone " + zone.zoneId).start();
    }

    @Override
    public void run() {
        while (!Maintenance.isRunning) {
            try {
                long startTime = System.currentTimeMillis();
                update();
                Functions.sleep(Math.max(150 - (System.currentTimeMillis() - startTime), 10));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public synchronized void update() {
        if (!TimeUtil.isBlackBallWarOpen()) {
            zone.finishBlackBallWar = false;
        }
        List<Player> players = zone.getPlayers();
        for (int i = players.size() - 1; i >= 0; i--) {
            try {
                updatePlayer(players.get(i));
            } catch (Exception e) {
                System.err.println("Error updating player: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    public void updatePlayer(Player player) {
        if (player.zone == null || !MapService.gI().isMapBlackBallWar(player.zone.map.mapId)) {
            return;
        }
        if (!TimeUtil.isBlackBallWarOpen()) {
            kickOutOfMap(player);
            return;
        }
        if (player.idMark.isHoldBlackBall()) {
            if (Util.canDoWithTime(player.idMark.getLastTimeHoldBlackBall(), TIME_WIN)) {
                win(player);
            } else if (Util.canDoWithTime(player.idMark.getLastTimeNotifyTimeHoldBlackBall(), 10000)) {
                Service.gI().sendThongBao(player, "Cố giữ ngọc thêm " + TimeUtil.getSecondLeft(player.idMark.getLastTimeHoldBlackBall(), TIME_WIN / 1000) + " giây nữa sẽ thắng");
                player.idMark.setLastTimeNotifyTimeHoldBlackBall(System.currentTimeMillis());
            }
        }
    }

    private synchronized void win(Player player) {
        player.zone.finishBlackBallWar = true;
        int star = player.idMark.getTempIdBlackBallHold() - 371;
        player.rewardBlackBall.reward((byte) star);
        Service.gI().sendThongBao(player, "Chúc mừng bạn đã " + "dành được Ngọc rồng " + star + " sao đen cho bang");
        if (player.clan != null) {
            player.clan.members.forEach(m -> {
                Player p = Client.gI().getPlayer(m.id);
                if (p != null) {
                    p.rewardBlackBall.reward((byte) star);
                } else {
                    Player pFromDb = AmodsubVN.loadById(m.id);
                    if (pFromDb != null) {
                        pFromDb.rewardBlackBall.reward((byte) star);
                        PlayerDAO.updatePlayer(pFromDb);
                    }
                }
            });
        }
        kickAllPlayersOutOfMap(player.zone);
    }

    private void kickOutOfMap(Player player) {
        if (player.cFlag == 8) {
            Service.gI().changeFlag(player, Util.nextInt(1, 7));
        }
        Service.gI().sendThongBao(player, "Trò chơi tìm ngọc hôm nay đã kết thúc, hẹn gặp lại vào 20h ngày mai");
        ChangeMapService.gI().changeMapBySpaceShip(player, player.gender + 24, -1, 250);
    }

    private void kickAllPlayersOutOfMap(Zone zone) {
        List<Player> players = zone.getPlayers();
        for (int i = players.size() - 1; i >= 0; i--) {
            Player pl = players.get(i);
            kickOutOfMap(pl);
        }
    }

    @java.lang.SuppressWarnings("all")
    public Zone getZone() {
        return this.zone;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof BlackBallWar)) return false;
        final BlackBallWar other = (BlackBallWar) o;
        if (!other.canEqual((java.lang.Object) this)) return false;
        final java.lang.Object this$zone = this.getZone();
        final java.lang.Object other$zone = other.getZone();
        if (this$zone == null ? other$zone != null : !this$zone.equals(other$zone)) return false;
        return true;
    }

    @java.lang.SuppressWarnings("all")
    protected boolean canEqual(final java.lang.Object other) {
        return other instanceof BlackBallWar;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public int hashCode() {
        final int PRIME = 59;
        int result = 1;
        final java.lang.Object $zone = this.getZone();
        result = result * PRIME + ($zone == null ? 43 : $zone.hashCode());
        return result;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public java.lang.String toString() {
        return "BlackBallWar(zone=" + this.getZone() + ")";
    }
}
