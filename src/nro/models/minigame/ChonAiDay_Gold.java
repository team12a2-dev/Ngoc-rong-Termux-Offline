package nro.models.minigame;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import org.json.simple.JSONArray;
import org.json.simple.JSONValue;
import nro.models.data.LocalManager;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.services.ChatGlobalService;
import nro.models.services.Service;
import nro.models.utils.Logger;
import nro.models.utils.Util;

/**
 * Minigame Chọn Ai Đây (Vàng)
 */
public class ChonAiDay_Gold implements Runnable {

    public static final long COST_NORMAL = 1_000_000L;
    public static final long COST_VIP = 10_000_000L;
    public static final int MAX_TICKETS = 10;
    public static final int TIME_CHONAIDAY = 300_000; // 5 phút

    public long goldNormar;
    public long goldVip;
    public long lastTimeEnd;

    public static class Entry {
        public long playerId;
        public String playerName;
        public int tickets;

        public Entry(long playerId, String playerName, int tickets) {
            this.playerId = playerId;
            this.playerName = playerName;
            this.tickets = tickets;
        }
    }

    private final List<Entry> playersNormal = new ArrayList<>();
    private final List<Entry> playersVIP = new ArrayList<>();
    private final Object lock = new Object();

    private static ChonAiDay_Gold instance;

    public static ChonAiDay_Gold gI() {
        if (instance == null) {
            synchronized (ChonAiDay_Gold.class) {
                if (instance == null) {
                    instance = new ChonAiDay_Gold();
                }
            }
        }
        return instance;
    }

    private ChonAiDay_Gold() {
        this.lastTimeEnd = System.currentTimeMillis() + TIME_CHONAIDAY;
    }

    public int getTicketsNormal(Player pl) {
        if (pl == null) return 0;
        synchronized (lock) {
            for (Entry e : playersNormal) {
                if (e.playerId == pl.id) {
                    return e.tickets;
                }
            }
        }
        return 0;
    }

    public int getTicketsVIP(Player pl) {
        if (pl == null) return 0;
        synchronized (lock) {
            for (Entry e : playersVIP) {
                if (e.playerId == pl.id) {
                    return e.tickets;
                }
            }
        }
        return 0;
    }

    public int getTotalTicketsNormal() {
        synchronized (lock) {
            int total = 0;
            for (Entry e : playersNormal) {
                total += e.tickets;
            }
            return total;
        }
    }

    public int getTotalTicketsVIP() {
        synchronized (lock) {
            int total = 0;
            for (Entry e : playersVIP) {
                total += e.tickets;
            }
            return total;
        }
    }

    public String getPercentNormal(Player pl) {
        if (pl == null) return "0";
        synchronized (lock) {
            int totalTickets = getTotalTicketsNormal();
            if (totalTickets == 0) return "0";
            int myTickets = getTicketsNormal(pl);
            if (myTickets == 0) return "0";
            double percent = ((double) myTickets / totalTickets) * 100.0;
            return String.format("%.1f", percent);
        }
    }

    public String getPercentVIP(Player pl) {
        if (pl == null) return "0";
        synchronized (lock) {
            int totalTickets = getTotalTicketsVIP();
            if (totalTickets == 0) return "0";
            int myTickets = getTicketsVIP(pl);
            if (myTickets == 0) return "0";
            double percent = ((double) myTickets / totalTickets) * 100.0;
            return String.format("%.1f", percent);
        }
    }

    public String getPercent(Player pl, int type) {
        return type == 0 ? getPercentNormal(pl) : getPercentVIP(pl);
    }

    public String getTimeLeftString() {
        long remainMs = lastTimeEnd - System.currentTimeMillis();
        if (remainMs <= 0) {
            return "Đang mở thưởng...";
        }
        long sec = remainMs / 1000;
        long minutes = sec / 60;
        long remainingSec = sec % 60;
        if (minutes > 0) {
            return minutes + " phút " + remainingSec + " giây";
        }
        return remainingSec + " giây";
    }

    public boolean addPlayerNormar(Player pl) {
        if (pl == null) return false;
        synchronized (lock) {
            Entry found = null;
            for (Entry e : playersNormal) {
                if (e.playerId == pl.id) {
                    found = e;
                    break;
                }
            }
            if (found != null) {
                if (found.tickets >= MAX_TICKETS) {
                    Service.gI().sendThongBao(pl, "Bạn đã đặt tối đa 10 lần cho giải này!");
                    return false;
                }
                found.tickets++;
            } else {
                playersNormal.add(new Entry(pl.id, pl.name, 1));
            }
            return true;
        }
    }

    public boolean addPlayerVIP(Player pl) {
        if (pl == null) return false;
        synchronized (lock) {
            Entry found = null;
            for (Entry e : playersVIP) {
                if (e.playerId == pl.id) {
                    found = e;
                    break;
                }
            }
            if (found != null) {
                if (found.tickets >= MAX_TICKETS) {
                    Service.gI().sendThongBao(pl, "Bạn đã đặt tối đa 10 lần cho giải này!");
                    return false;
                }
                found.tickets++;
            } else {
                playersVIP.add(new Entry(pl.id, pl.name, 1));
            }
            return true;
        }
    }

    @Override
    public void run() {
        while (true) {
            try {
                long now = System.currentTimeMillis();
                if (now >= lastTimeEnd) {
                    processReward();
                    resetRound();
                }
                Thread.sleep(1000);
            } catch (Exception e) {
                Logger.logException(ChonAiDay_Gold.class, e);
            }
        }
    }

    private void processReward() {
        synchronized (lock) {
            // 1. Xử lý giải Thường (80% thưởng)
            if (!playersNormal.isEmpty()) {
                if (playersNormal.size() == 1) {
                    // Chỉ 1 người tham gia -> Hoàn lại 100% tiền
                    Entry e = playersNormal.get(0);
                    long refund = e.tickets * COST_NORMAL;
                    giveGold(e.playerId, refund, "Bạn là người duy nhất tham gia Chọn ai đây giải Thường nên được hoàn lại " + Util.numberToMoney(refund) + " vàng.");
                } else {
                    int totalTickets = getTotalTicketsNormal();
                    int winningTicket = Util.nextInt(1, totalTickets);
                    int currentCount = 0;
                    Entry winner = null;
                    for (Entry e : playersNormal) {
                        currentCount += e.tickets;
                        if (winningTicket <= currentCount) {
                            winner = e;
                            break;
                        }
                    }
                    if (winner != null) {
                        long reward = (goldNormar * 80L) / 100L;
                        giveGold(winner.playerId, reward, "Chúc mừng bạn đã chiến thắng Chọn ai đây giải Thường và nhận được " + Util.numberToMoney(reward) + " vàng!");
                        Player plWin = Client.gI().getPlayer(winner.playerId);
                        if (plWin != null) {
                            ChatGlobalService.gI().chat(plWin, plWin.name + " đã chiến thắng Chọn ai đây giải Thường nhận được " + Util.numberToMoney(reward) + " vàng");
                        } else {
                            Service.gI().sendThongBaoAllPlayer(winner.playerName + " đã chiến thắng Chọn ai đây giải Thường nhận được " + Util.numberToMoney(reward) + " vàng");
                        }
                    }
                }
            }

            // 2. Xử lý giải VIP (90% thưởng)
            if (!playersVIP.isEmpty()) {
                if (playersVIP.size() == 1) {
                    // Chỉ 1 người tham gia -> Hoàn lại 100% tiền
                    Entry e = playersVIP.get(0);
                    long refund = e.tickets * COST_VIP;
                    giveGold(e.playerId, refund, "Bạn là người duy nhất tham gia Chọn ai đây giải VIP nên được hoàn lại " + Util.numberToMoney(refund) + " vàng.");
                } else {
                    int totalTickets = getTotalTicketsVIP();
                    int winningTicket = Util.nextInt(1, totalTickets);
                    int currentCount = 0;
                    Entry winner = null;
                    for (Entry e : playersVIP) {
                        currentCount += e.tickets;
                        if (winningTicket <= currentCount) {
                            winner = e;
                            break;
                        }
                    }
                    if (winner != null) {
                        long reward = (goldVip * 90L) / 100L;
                        giveGold(winner.playerId, reward, "Chúc mừng bạn đã chiến thắng Chọn ai đây giải VIP và nhận được " + Util.numberToMoney(reward) + " vàng!");
                        Player plWin = Client.gI().getPlayer(winner.playerId);
                        if (plWin != null) {
                            ChatGlobalService.gI().chat(plWin, plWin.name + " đã chiến thắng Chọn ai đây giải VIP nhận được " + Util.numberToMoney(reward) + " vàng");
                        } else {
                            Service.gI().sendThongBaoAllPlayer(winner.playerName + " đã chiến thắng Chọn ai đây giải VIP nhận được " + Util.numberToMoney(reward) + " vàng");
                        }
                    }
                }
            }
        }
    }

    private void giveGold(long playerId, long amount, String noticeMsg) {
        Player player = Client.gI().getPlayer(playerId);
        if (player != null && player.inventory != null) {
            player.inventory.gold += amount;
            if (player.inventory.gold > 200_000_000_000L) {
                player.inventory.gold = 200_000_000_000L;
            }
            Service.gI().sendMoney(player);
            if (noticeMsg != null) {
                Service.gI().sendThongBao(player, noticeMsg);
            }
        } else {
            // Người chơi offline -> Lưu trực tiếp vào Database
            try (Connection con = LocalManager.gI().getConnection();
                 PreparedStatement ps = con.prepareStatement("SELECT data_inventory FROM player WHERE id = ?")) {
                ps.setLong(1, playerId);
                ResultSet rs = ps.executeQuery();
                if (rs.next()) {
                    JSONArray arr = (JSONArray) JSONValue.parse(rs.getString("data_inventory"));
                    if (arr != null && !arr.isEmpty()) {
                        long currentGold = Long.parseLong(arr.get(0).toString());
                        long newGold = Math.min(currentGold + amount, 200_000_000_000L);
                        arr.set(0, newGold);
                        try (PreparedStatement psUpdate = con.prepareStatement("UPDATE player SET data_inventory = ? WHERE id = ?")) {
                            psUpdate.setString(1, arr.toJSONString());
                            psUpdate.setLong(2, playerId);
                            psUpdate.executeUpdate();
                        }
                    }
                }
            } catch (Exception e) {
                Logger.logException(ChonAiDay_Gold.class, e);
            }
        }
    }

    private void resetRound() {
        synchronized (lock) {
            // Reset player in-memory stats
            for (Entry e : playersNormal) {
                Player p = Client.gI().getPlayer(e.playerId);
                if (p != null) {
                    p.goldNormar = 0;
                }
            }
            for (Entry e : playersVIP) {
                Player p = Client.gI().getPlayer(e.playerId);
                if (p != null) {
                    p.goldVIP = 0;
                }
            }
            playersNormal.clear();
            playersVIP.clear();
            goldNormar = 0;
            goldVip = 0;
            lastTimeEnd = System.currentTimeMillis() + TIME_CHONAIDAY;
        }
    }
}