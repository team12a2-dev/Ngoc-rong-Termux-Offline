package nro.models.services;

import nro.models.player.Player;
import nro.models.network.Message;
import nro.models.utils.Logger;
import nro.models.utils.TimeUtil;
import nro.models.utils.Util;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import nro.models.server.Maintenance;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class ChatGlobalService implements Runnable {

    private static final int COUNT_CHAT = 100;
    private static final int COUNT_WAIT = 100;
    private static final int GEM_COST = 5;
    private static final int COOLDOWN_SECONDS = 30;
    private static ChatGlobalService i;

    private final List<ChatGlobal> listChatting;
    private final List<ChatGlobal> waitingChat;

    private ChatGlobalService() {
        this.listChatting = new ArrayList<>();
        this.waitingChat = new LinkedList<>();
        this.start();
    }

    private void start() {
        new Thread(this, "**Chat global").start();
    }

    public static ChatGlobalService gI() {
        if (i == null) {
            i = new ChatGlobalService();
        }
        return i;
    }

    public void chat1(Player player, String text) {
        if (player == null || text == null) return;
        player.idMark.setLastTimeChatGlobal(System.currentTimeMillis());
        waitingChat.add(new ChatGlobal(player, text.length() > 100 ? text.substring(0, 100) : text));
    }

    public void ThongBaoRoiDo(Player player, String text) {
        if (player == null || text == null) return;
        waitingChat.add(new ChatGlobal(player, text.length() > 100 ? text.substring(0, 100) : text));
    }

    public void ThongBaoDapDo(Player player, String text) {
        if (player == null || text == null) return;
        waitingChat.add(new ChatGlobal(player, text.length() > 100 ? text.substring(0, 100) : text));
    }

    public void chatVip(Player player, String text) {
        if (player == null || text == null) return;
        waitingChat.add(new ChatGlobal(player, text.length() > 100 ? text.substring(0, 100) : text));
    }

    public void chat(Player player, String text) {
        if (player == null || text == null) return;
        if (waitingChat.size() >= COUNT_WAIT) {
            Service.gI().sendThongBao(player, "Kênh thế giới hiện đang quá tải, không thể chat lúc này");
            return;
        }
        for (ChatGlobal chat : listChatting) {
            if (chat != null && text.equals(chat.text)) {
                return;
            }
        }
        if (player.isAdmin() || player.inventory.gem >= GEM_COST) {
            if (player.isAdmin() || Util.canDoWithTime(player.idMark.getLastTimeChatGlobal(), COOLDOWN_SECONDS * 1000)) {
                if (player.isAdmin() || player.nPoint.power >= 20_000_000) {
                    if (!player.isAdmin()) {
                        player.inventory.subGem(GEM_COST);
                        Service.gI().sendMoney(player);
                    }
                    player.idMark.setLastTimeChatGlobal(System.currentTimeMillis());
                    waitingChat.add(new ChatGlobal(player, text.length() > 100 ? text.substring(0, 100) : text));
                } else {
                    Service.gI().sendThongBao(player, "Yêu cầu ít nhất 20 triệu sức mạnh để chat thế giới");
                }
            } else {
                Service.gI().sendThongBao(player, "Không thể chat thế giới lúc này, vui lòng đợi "
                        + TimeUtil.getTimeLeft(player.idMark.getLastTimeChatGlobal(), COOLDOWN_SECONDS));
            }
        } else {
            Service.gI().sendThongBao(player, "Cần ít nhất " + GEM_COST + " ngọc để chat thế giới");
        }
    }

    @Override
    public void run() {
        while (!Maintenance.isRunning) {
            try {
                if (!listChatting.isEmpty()) {
                    ChatGlobal chat = listChatting.get(0);
                    if (Util.canDoWithTime(chat.timeSendToPlayer, 1000)) {
                        listChatting.remove(0).dispose();
                    }
                }

                if (!waitingChat.isEmpty()) {
                    ChatGlobal chat = waitingChat.get(0);
                    if (listChatting.size() < COUNT_CHAT) {
                        waitingChat.remove(0);
                        chat.timeSendToPlayer = System.currentTimeMillis();
                        listChatting.add(chat);
                        chatGlobal(chat);
                    }
                }
                Thread.sleep(1000);
            } catch (Exception e) {
                Logger.logException(ChatGlobalService.class, e);
            }
        }
    }

    private void chatGlobal(ChatGlobal chat) {
        Message msg;
        try {
            msg = new Message(92);
            msg.writer().writeUTF(chat.playerName);
            msg.writer().writeUTF("|5|" + chat.text);
            msg.writer().writeInt((int) chat.playerId);
            msg.writer().writeShort(chat.head);
            msg.writer().writeShort(-1);
            msg.writer().writeShort(chat.body);
            msg.writer().writeShort(chat.bag);
            msg.writer().writeShort(chat.leg);
            msg.writer().writeByte(0);
            Service.gI().sendMessAllPlayer(msg);
            msg.cleanup();
        } catch (Exception ignored) {
        }
    }

    private class ChatGlobal {

        public String playerName;
        public int playerId;
        public short head;
        public short body;
        public short leg;
        public short bag;
        public String text;
        public long timeSendToPlayer;

        public ChatGlobal(Player player, String text) {
            if (!player.isAdmin()) {
                this.playerName = player.name;
            } else if (player.name.equals("Ngọc Rồng Online")) {
                this.playerName = player.name + " - Founder";
            } else {
                this.playerName = player.name + " - Quản Trị Viên";
            }
            this.playerId = (int) player.id;
            this.head = player.getHead();
            this.body = player.getBody();
            this.leg = player.getLeg();
            this.bag = player.getFlagBag();
            this.text = text;
        }

        private void dispose() {
            this.playerName = null;
            this.text = null;
        }
    }
}
