package nro.models.server.panel;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import nro.models.clan.Clan;
import nro.models.clan.ClanMember;
import nro.models.data.LocalManager;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.server.Manager;
import nro.models.services.ClanService;
import nro.models.services.ItemTimeService;
import nro.models.services.Service;
import nro.models.utils.Logger;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

/** Hot-patchable clan ops for Panel (dissolve/reload on running server). */
public final class PanelClanBridge {

    private PanelClanBridge() {
    }

    public static boolean dissolveClan(int clanId, String broadcastMessage) {
        if (clanId < 0) {
            return false;
        }
        Clan target = null;
        for (Clan c : Manager.CLANS) {
            if (c.id == clanId) {
                target = c;
                break;
            }
        }
        if (target != null) {
            Manager.CLANS.remove(target);
        }
        for (Player pl : Client.gI().getPlayers()) {
            if (pl == null || pl.clan == null || pl.clan.id != clanId) {
                continue;
            }
            pl.clan = null;
            pl.clanMember = null;
            ItemTimeService.gI().removeTextDoanhTrai(pl);
            ClanService.gI().sendMyClan(pl);
            ClanService.gI().sendClanId(pl);
            Service.gI().sendFlagBag(pl);
            Service.gI().sendThongBao(pl, "Bang hội của bạn đã bị giải tán bởi hệ thống.");
        }
        if (!persistClanDissolve(clanId)) {
            return false;
        }
        if (broadcastMessage != null && !broadcastMessage.isBlank()) {
            PanelActions.broadcast(broadcastMessage);
        }
        Logger.success("Panel dissolved clan id=" + clanId + "\n");
        return true;
    }

    public static boolean reloadClans() {
        try {
            Manager.CLANS.clear();
            try (Connection con = LocalManager.getConnection()) {
                loadClansIntoManager(con);
                try (PreparedStatement ps = con.prepareStatement("select id from clan order by id desc limit 1")) {
                    ResultSet rs = ps.executeQuery();
                    if (rs.first()) {
                        Clan.NEXT_ID = rs.getInt("id") + 1;
                    }
                    rs.close();
                }
            }
            syncOnlinePlayersAfterClanReload();
            Logger.success("Panel reload clans: " + Manager.CLANS.size() + "\n");
            return true;
        } catch (Exception e) {
            Logger.logException(PanelClanBridge.class, e);
            return false;
        }
    }

    private static void loadClansIntoManager(Connection con) throws Exception {
        PreparedStatement ps = con.prepareStatement("select * from clan");
        ResultSet rs = ps.executeQuery();
        JSONArray dataArray = new JSONArray();
        JSONObject dataObject = new JSONObject();
        while (rs.next()) {
            Clan clan = new Clan();
            clan.id = rs.getInt("id");
            clan.name = rs.getString("name");
            clan.name2 = rs.getString("name_2");
            clan.slogan = rs.getString("slogan");
            clan.imgId = rs.getByte("img_id");
            clan.powerPoint = rs.getLong("power_point");
            clan.maxMember = rs.getByte("max_member");
            clan.capsuleClan = rs.getInt("clan_point");
            clan.level = rs.getByte("level");
            if (clan.level < 1) {
                clan.level = 1;
            }
            clan.createTime = (int) (rs.getTimestamp("create_time").getTime() / 1000);
            dataArray = (JSONArray) JSONValue.parse(rs.getString("members"));
            for (int i = 0; i < dataArray.size(); i++) {
                dataObject = (JSONObject) JSONValue.parse(String.valueOf(dataArray.get(i)));
                ClanMember cm = new ClanMember();
                cm.clan = clan;
                cm.id = Integer.parseInt(String.valueOf(dataObject.get("id")));
                cm.name = String.valueOf(dataObject.get("name"));
                cm.head = Short.parseShort(String.valueOf(dataObject.get("head")));
                cm.body = Short.parseShort(String.valueOf(dataObject.get("body")));
                cm.leg = Short.parseShort(String.valueOf(dataObject.get("leg")));
                cm.role = Byte.parseByte(String.valueOf(dataObject.get("role")));
                cm.donate = Integer.parseInt(String.valueOf(dataObject.get("donate")));
                cm.receiveDonate = Integer.parseInt(String.valueOf(dataObject.get("receive_donate")));
                cm.memberPoint = Integer.parseInt(String.valueOf(dataObject.get("member_point")));
                cm.clanPoint = Integer.parseInt(String.valueOf(dataObject.get("clan_point")));
                cm.joinTime = Integer.parseInt(String.valueOf(dataObject.get("join_time")));
                cm.timeAskPea = Long.parseLong(String.valueOf(dataObject.get("ask_pea_time")));
                try {
                    cm.powerPoint = Long.parseLong(String.valueOf(dataObject.get("power")));
                } catch (NumberFormatException ignored) {
                }
                clan.addClanMember(cm);
            }
            dataArray.clear();
            Manager.CLANS.add(clan);
        }
        rs.close();
        ps.close();
    }

    private static void syncOnlinePlayersAfterClanReload() {
        java.util.HashSet<Integer> activeIds = new java.util.HashSet<>();
        for (Clan c : Manager.CLANS) {
            activeIds.add(c.id);
        }
        for (Player pl : Client.gI().getPlayers()) {
            if (pl == null || pl.clan == null) {
                continue;
            }
            if (!activeIds.contains(pl.clan.id)) {
                pl.clan = null;
                pl.clanMember = null;
                ItemTimeService.gI().removeTextDoanhTrai(pl);
                ClanService.gI().sendMyClan(pl);
                ClanService.gI().sendClanId(pl);
                Service.gI().sendFlagBag(pl);
            } else {
                try {
                    Clan fresh = Manager.getClanById(pl.clan.id);
                    pl.clan = fresh;
                    pl.clanMember = fresh.getClanMember((int) pl.id);
                    if (pl.clanMember != null) {
                        pl.clanMember.clan = fresh;
                    }
                } catch (Exception ignored) {
                }
            }
        }
    }

    private static boolean persistClanDissolve(int clanId) {
        try (Connection con = LocalManager.getConnection()) {
            try (PreparedStatement ps = con.prepareStatement("UPDATE player SET clan_id = -1 WHERE clan_id = ?")) {
                ps.setInt(1, clanId);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = con.prepareStatement("DELETE FROM clan WHERE id = ?")) {
                ps.setInt(1, clanId);
                ps.executeUpdate();
            }
            return true;
        } catch (Exception e) {
            Logger.logException(PanelClanBridge.class, e);
            return false;
        }
    }
}
