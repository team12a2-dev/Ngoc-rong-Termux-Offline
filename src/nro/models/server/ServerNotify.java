package nro.models.server;

import nro.models.player.Player;
import nro.models.network.Message;
import nro.models.services.Service;
import nro.models.utils.Util;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class ServerNotify extends Thread {

    private long lastTimeAutoBroadcast;
    private int autoBroadcastIndex = 0;

    private static final String[] AUTO_BROADCASTS = new String[]{
        "Chào mừng bạn đã đến với Ngọc Rồng Online!",
        "Mẹo: Tham gia phó bản Doanh trại, Kho báu và Map 12h mỗi ngày để nhận nhiều phần thưởng giá trị.",
        "Mẹo: Hãy kích hoạt đệ tử và hoàn thành nhiệm vụ để nâng cao sức mạnh nhanh chóng.",
        "Mẹo: Nâng cấp trang bị tại NPC Bà Hạt Mít để gia tăng sức mạnh vượt trội."
    };

    private final Queue<String> notifies;

    private static ServerNotify i;

    private ServerNotify() {
        this.notifies = new ConcurrentLinkedQueue<>();
        this.start();
    }

    public static ServerNotify gI() {
        if (i == null) {
            i = new ServerNotify();
        }
        return i;
    }

    @Override
    public void run() {
        while (!Maintenance.isRunning) {
            try {
                while (!notifies.isEmpty()) {
                    String msg = notifies.poll();
                    if (msg != null && !msg.isEmpty()) {
                        ThongBao(msg);
                        // Nghỉ ngắn để client kịp hiển thị dòng chữ chạy trước khi nhận dòng tiếp theo
                        if (!notifies.isEmpty()) {
                            try {
                                Thread.sleep(1500);
                            } catch (InterruptedException ignored) {
                            }
                        }
                    }
                }
                if (Util.canDoWithTime(this.lastTimeAutoBroadcast, 300000)) { // 5 phút gửi 1 lần
                    if (AUTO_BROADCASTS.length > 0) {
                        ThongBao(AUTO_BROADCASTS[autoBroadcastIndex % AUTO_BROADCASTS.length]);
                        autoBroadcastIndex++;
                    }
                    this.lastTimeAutoBroadcast = System.currentTimeMillis();
                }
            } catch (Exception ignored) {

            }
            try {
                Thread.sleep(1000);
            } catch (InterruptedException ignored) {
            }
        }
    }

    private void ThongBao(String text) {
        Message msg;
        try {
            msg = new Message(93);
            msg.writer().writeUTF(text);
            Service.gI().sendMessAllPlayer(msg);
            msg.cleanup();
        } catch (Exception e) {
        }
    }

    public void notify(String text) {
        if (text != null && !text.isEmpty()) {
            this.notifies.add(text);
        }
    }

    public void sendNotifyTab(Player player) {
        Message msg;
        try {
            msg = new Message(50);
            msg.writer().writeByte(10);
            for (int idx = 0; idx < Manager.NOTIFY.size(); idx++) {
                String raw = Manager.NOTIFY.get(idx);
                if (raw == null) continue;
                String[] arr = raw.split("<>");
                msg.writer().writeShort(idx);
                msg.writer().writeUTF(arr.length > 0 ? arr[0] : "");
                msg.writer().writeUTF(arr.length > 1 ? arr[1] : "");
            }
            player.sendMessage(msg);
            msg.cleanup();
        } catch (Exception ignored) {
        }
    }
}
