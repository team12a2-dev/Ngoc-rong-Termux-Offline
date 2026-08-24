package nro.models.minigame;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.services.Service;
import nro.models.utils.Util;

/**
 *
 * @author By AmodsubVN
 */
public class ConSoMayManGem implements Runnable {

    public static final long MIN_ROUND_REWARD = 50;
    public static final long MAX_ROUND_REWARD = 1000;
    public static final long DEFAULT_BET = 5;
    public static final long MIN_CUSTOM_TIER = 50;
    public static final long MAX_CUSTOM_TIER = 5000;
    private static final int BETTING_BUFFER_SECONDS = 2;
    public static final int DRAW_WAIT_SECONDS = 10;

    public long second = 50;
    public long currlast = System.currentTimeMillis();
    public long rewardAmount = MIN_ROUND_REWARD;
    public long cost = DEFAULT_BET;
    public long min = 0;
    public long max = 99;
    public long result = 0;
    public long result_next = Util.nextInt((int) min, (int) max);
    public String result_name;

    public List<ConSoMayManData> players = new ArrayList<>();
    public List<Long> dataKQ_CSMM = new ArrayList<>();

    private static ConSoMayManGem instance;
    private boolean inBettingPhase = true;
    private final Object lock = new Object();

    private ConSoMayManGem() {
        rollNewRoundReward();
    }

    public static ConSoMayManGem gI() {
        if (instance == null) {
            instance = new ConSoMayManGem();
        }
        return instance;
    }

    public void rollNewRoundReward() {
        rewardAmount = Util.nextInt((int) MIN_ROUND_REWARD, (int) MAX_ROUND_REWARD);
    }

    public boolean isCustomTier(Player player) {
        return player != null && player.csmmBetTierGem > 0;
    }

    public long getBetCost(Player player) {
        if (isCustomTier(player)) {
            return player.csmmBetTierGem;
        }
        return DEFAULT_BET;
    }

    /** Tổng thưởng khi thắng = giải vòng này + mức cược */
    public long calcTotalWin(long betCost) {
        return rewardAmount + betCost;
    }

    public long getWinAmountPreview(Player player) {
        return calcTotalWin(getBetCost(player));
    }

    public boolean setPlayerBetTier(Player player, long tier) {
        if (tier < MIN_CUSTOM_TIER || tier > MAX_CUSTOM_TIER) {
            Service.gI().sendThongBao(player, "Mức cược phải từ " + MIN_CUSTOM_TIER + " đến " + MAX_CUSTOM_TIER + " ngọc xanh");
            return false;
        }
        player.csmmBetTierGem = tier;
        long totalWin = calcTotalWin(tier);
        Service.gI().sendThongBao(player, "Chế độ tùy chọn: cược " + tier + " ngọc xanh, thắng nhận "
                + totalWin + " ngọc (= giải " + rewardAmount + " + cược " + tier + ").");
        return true;
    }

    public void useDefaultBetTier(Player player) {
        player.csmmBetTierGem = 0;
        long totalWin = calcTotalWin(DEFAULT_BET);
        Service.gI().sendThongBao(player, "Đã về mức cược mặc định " + DEFAULT_BET + " ngọc xanh. Thắng nhận "
                + totalWin + " ngọc (= giải " + rewardAmount + " + cược " + DEFAULT_BET + ").");
    }

    public boolean canBetNow() {
        synchronized (lock) {
            return inBettingPhase && second > BETTING_BUFFER_SECONDS;
        }
    }

    public boolean isInBettingPhase() {
        synchronized (lock) {
            return inBettingPhase;
        }
    }

    public int getDisplaySeconds() {
        synchronized (lock) {
            if (inBettingPhase) {
                return (int) second;
            }
            long elapsedMs = System.currentTimeMillis() - currlast;
            int remain = DRAW_WAIT_SECONDS - (int) (elapsedMs / 1000);
            return Math.max(0, remain);
        }
    }

    public String getTimerDisplayLine() {
        synchronized (lock) {
            if (inBettingPhase) {
                if (second <= BETTING_BUFFER_SECONDS) {
                    return "<" + second + "> giây (sắp khóa cược)";
                }
                return "<" + second + "> giây còn lại đặt cược";
            }
            int drawSec = DRAW_WAIT_SECONDS - (int) ((System.currentTimeMillis() - currlast) / 1000);
            return "Đang quay kết quả... " + Math.max(0, drawSec) + " giây";
        }
    }

    public String strNumberDetail(int id) {
        synchronized (lock) {
            List<ConSoMayManData> pl = players.stream().filter(d -> d.id == id).collect(Collectors.toList());
            if (pl.isEmpty()) {
                return "";
            }
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < pl.size(); i++) {
                ConSoMayManData d = pl.get(i);
                sb.append(d.point).append("(cược ").append(d.betCost)
                        .append(", thắng ").append(d.rewardAmount).append(")");
                if (i < pl.size() - 1) {
                    sb.append(", ");
                }
            }
            return sb.toString();
        }
    }

    @Override
    public void run() {
        while (true) {
            try {
                synchronized (lock) {
                    if (inBettingPhase) {
                        if (second > 0) {
                            second--;
                        } else {
                            inBettingPhase = false;
                            currlast = System.currentTimeMillis();
                        }
                    } else if ((System.currentTimeMillis() - currlast) >= DRAW_WAIT_SECONDS * 1000L) {
                        ResetGameInternal((int) result_next);
                        result_next = Util.nextInt((int) min, (int) max);
                        rollNewRoundReward();
                        second = 50;
                        currlast = System.currentTimeMillis();
                        inBettingPhase = true;
                    }
                }
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                break;
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public boolean newData(Player player, int point) {
        return placeBet(player, point, DEFAULT_BET);
    }

    public boolean newDataWithBet(Player player, int point, long betCost) {
        return placeBet(player, point, betCost);
    }

    public boolean isValidCustomBetAmount(long betCost) {
        return betCost >= DEFAULT_BET && betCost <= MAX_CUSTOM_TIER;
    }

    public boolean ramdom1SoLe(Player player) {
        return placeBet(player, pickRandomOdd(player), DEFAULT_BET);
    }

    public boolean ramdom1SoChan(Player player) {
        return placeBet(player, pickRandomEven(player), DEFAULT_BET);
    }

    private int pickRandomOdd(Player player) {
        Random random = new Random();
        do {
            int generatedPoint = random.nextInt(50) * 2 + 1;
            synchronized (lock) {
                if (players.stream().noneMatch(d -> d.id == player.id && d.point == generatedPoint)) {
                    return generatedPoint;
                }
                if (players.stream().filter(d -> d.id == player.id).count() >= 50) {
                    return -1;
                }
            }
        } while (true);
    }

    private int pickRandomEven(Player player) {
        Random random = new Random();
        do {
            int generatedPoint = random.nextInt(50) * 2;
            synchronized (lock) {
                if (players.stream().noneMatch(d -> d.id == player.id && d.point == generatedPoint)) {
                    return generatedPoint;
                }
                if (players.stream().filter(d -> d.id == player.id).count() >= 51) {
                    return -1;
                }
            }
        } while (true);
    }

    private boolean placeBet(Player player, int point, long betCost) {
        if (point < 0) {
            Service.gI().sendThongBao(player, "Bạn đã chọn tất cả các số khả dụng.");
            return false;
        }
        if (betCost < DEFAULT_BET || betCost > MAX_CUSTOM_TIER) {
            Service.gI().sendThongBao(player, "Mức cược phải từ " + DEFAULT_BET + " đến " + MAX_CUSTOM_TIER + " ngọc xanh");
            return false;
        }

        long winAmount;
        long roundPrize;
        synchronized (lock) {
            if (!inBettingPhase) {
                Service.gI().sendThongBao(player, "Vòng này đang quay kết quả. Vui lòng chờ vòng mới (còn "
                        + getDisplaySeconds() + " giây).");
                return false;
            }
            if (second <= BETTING_BUFFER_SECONDS) {
                Service.gI().sendThongBao(player, "Đã khóa cược (còn " + second + " giây, cần > "
                        + BETTING_BUFFER_SECONDS + " giây). Vui lòng chờ vòng mới.");
                return false;
            }

            roundPrize = rewardAmount;
            winAmount = roundPrize + betCost;
            boolean customTier = betCost > DEFAULT_BET;

            if (players.stream().filter(d -> d.id == player.id).count() >= 10) {
                Service.gI().sendThongBao(player, "Bạn đã chọn 10 số rồi không thể chọn thêm");
                return false;
            }

            if (players.stream().anyMatch(d -> d.id == player.id && d.point == point)) {
                Service.gI().sendThongBao(player, "Số này bạn đã chọn rồi vui lòng chọn số khác.");
                return false;
            }

            if (player.inventory.gem < betCost) {
                Service.gI().sendThongBao(player, "Bạn không đủ " + betCost + " ngọc xanh để thực hiện");
                return false;
            }

            ConSoMayManData data = new ConSoMayManData();
            data.id = (int) player.id;
            data.point = point;
            data.conSoMayManNgoc = 1;
            data.conSoMayManVang = 0;
            data.betCost = betCost;
            data.roundPrize = roundPrize;
            data.rewardAmount = winAmount;
            data.customTier = customTier;
            players.add(data);
            player.inventory.gem -= betCost;
            Service.gI().sendMoney(player);
        }

        Service.gI().sendThongBao(player, "Bạn đã chọn số " + point + " | Cược " + betCost + " ngọc xanh | Thắng nhận "
                + winAmount + " ngọc (= giải " + roundPrize + " + cược " + betCost + ").");
        Service.gI().showYourNumber(player, strNumber((int) player.id), null, null, 0);
        return true;
    }

    public String strNumber(int id) {
        synchronized (lock) {
            String number = "";
            List<ConSoMayManData> pl = players.stream().filter(d -> d.id == id).collect(Collectors.toList());
            for (int i = 0; i < pl.size(); i++) {
                ConSoMayManData d = pl.get(i);
                number += d.point + (i >= pl.size() - 1 ? "" : ",");
            }
            return number;
        }
    }

    private void payWinner(Player player, ConSoMayManData g) {
        if (player == null || g.conSoMayManNgoc != 1) {
            return;
        }
        player.inventory.gem += g.rewardAmount;
        Service.gI().sendMoney(player);
    }

    private String buildFinishMessage(int id, ConSoMayManData g) {
        if (g == null || g.point != result) {
            return "Con số trúng thưởng là " + result + " chúc bạn may mắn lần sau";
        }
        long winAmount = g.rewardAmount;
        Player currentPlayer = Client.gI().getPlayer(id);
        if (currentPlayer != null) {
            return "Chúc mừng " + currentPlayer.name + " đã thắng " + winAmount + " ngọc xanh với con số may mắn " + result;
        }
        return "Chúc mừng người chơi ID: " + g.id + " đã thắng " + winAmount + " ngọc xanh với con số may mắn " + result;
    }

    private void announceWorldWinner(ConSoMayManData g) {
        Player winner = Client.gI().getPlayer(g.id);
        String name = winner != null ? winner.name : ("Người chơi ID " + g.id);
        Service.gI().sendThongBaoAllPlayer("Chúc mừng " + name + " trúng Con số may mắn ngọc xanh số "
                + result + ", nhận " + g.rewardAmount + " ngọc xanh!");
    }

    private ConSoMayManData findWinningEntry(int id, List<ConSoMayManData> roundPlayers) {
        for (ConSoMayManData g : roundPlayers) {
            if (g.id == id && g.point == result) {
                return g;
            }
        }
        return null;
    }

    private void ResetGameInternal(int drawResult) {
        this.result = drawResult;
        dataKQ_CSMM.add(this.result);

        List<ConSoMayManData> roundPlayers = new ArrayList<>(players);

        for (ConSoMayManData g : roundPlayers) {
            if (g.point != result) {
                continue;
            }
            Player winner = Client.gI().getPlayer(g.id);
            payWinner(winner, g);
            announceWorldWinner(g);
        }

        for (ConSoMayManData g : roundPlayers) {
            Player player = Client.gI().getPlayer(g.id);
            if (player != null) {
                ConSoMayManData winEntry = findWinningEntry(g.id, roundPlayers);
                Service.gI().showYourNumber(player, "", drawResult + "", buildFinishMessage(g.id, winEntry), 1);
            }
        }

        players.clear();
    }

    public void ResetGame(int result) {
        synchronized (lock) {
            ResetGameInternal(result);
        }
    }
}
