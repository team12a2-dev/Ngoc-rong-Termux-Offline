package nro.models.server;

import java.util.concurrent.Executors;
import nro.models.services.Service;
import nro.models.utils.Logger;

/**
 *
 * @author By AmodsubVN
 *
 */
public class Maintenance extends Thread {

    private static Maintenance instance;
    private int timeInSeconds;
    public static boolean isRunning = false;
// bảo trì game false
    private Maintenance() {
    }

    public static Maintenance gI() {
        if (instance == null) {
            instance = new Maintenance();
        }
        return instance;
    }

    public void startCountdown() {
        if (!isRunning) {
            isRunning = true;
            this.timeInSeconds = 60;
            this.start();
        }
    }

    public void startSeconds(int seconds) {
        if (!isRunning) {
            isRunning = true;
            this.timeInSeconds = seconds;
            this.start();
        }
    }

    public void startImmediately() {
        if (!isRunning) {
            isRunning = true;
            Logger.log(Logger.YELLOW, "BẮT ĐẦU BẢO TRÌ NGAY\n");
            ServerManager.gI().close();
        }
    }

    /** Hủy countdown bảo trì đang chạy (gọi từ Panel Agent). */
    public void cancelMaintenance() {
        if (!isRunning) {
            return;
        }
        isRunning = false;
        timeInSeconds = 0;
        interrupt();
        instance = null;
        try {
            Service.gI().sendThongBaoAllPlayer("Đã hủy bảo trì. Server hoạt động bình thường.");
        } catch (Exception ignored) {
        }
        Logger.log(Logger.YELLOW, "HỦY BẢO TRÌ\n");
    }

    public static int getCountdownSeconds() {
        if (!isRunning || instance == null) {
            return 0;
        }
        return instance.timeInSeconds;
    }

    public static boolean isCountdownActive() {
        return isRunning && instance != null && instance.isAlive() && instance.timeInSeconds > 0;
    }

    @Override
    public void run() {
        Logger.log(Logger.YELLOW, "Bắt đầu đếm ngược " + timeInSeconds + "s bảo trì");

        while (timeInSeconds > 0 && isRunning) {
            try {
                sendRemainingTime();
                Thread.sleep(6000);
                if (!isRunning) {
                    return;
                }
                timeInSeconds--;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                isRunning = false;
                instance = null;
                Logger.log(Logger.YELLOW, "Countdown bảo trì bị hủy\n");
                return;
            }
        }

        if (!isRunning) {
            return;
        }

        Logger.log(Logger.YELLOW, "BẢO TRÌ BẮT ĐẦU\n");
        ServerManager.gI().close();
    }

    private void sendRemainingTime() {
        String msg = "BẢO TRÌ SAU " + timeInSeconds + " GIÂY.\nOUT GAME MAU LÊN.";
        Service.gI().sendThongBaoAllPlayer(msg);
        Logger.log(Logger.YELLOW, msg);
    }
}
