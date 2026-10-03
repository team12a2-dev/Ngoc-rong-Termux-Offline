package nro.models.server;

import java.io.File;
import java.nio.file.Files;
import java.util.List;
import nro.models.utils.Logger;

/**
 * Tự động bảo trì server định kỳ theo cấu hình maintenanceConfig.txt
 */
public class AutoMaintenance extends Thread {

    public static final String FILE_PATH = "maintenanceConfig.txt";

    public static int hours = 21;
    public static int mins = 0;
    public static boolean enabled = false;
    public static boolean AutoMaintenance = false;

    private static AutoMaintenance instance;
    private static int lastRunDay = -1;

    public static synchronized AutoMaintenance gI() {
        if (instance == null) {
            instance = new AutoMaintenance();
            instance.setName("AutoMaintenance");
            instance.setDaemon(true);
        }
        return instance;
    }

    public static synchronized void loadConfig() {
        try {
            File file = new File(FILE_PATH);
            if (file.exists()) {
                List<String> lines = Files.readAllLines(file.toPath());
                if (lines.size() >= 3) {
                    hours = Integer.parseInt(lines.get(0).trim());
                    mins = Integer.parseInt(lines.get(1).trim());
                    enabled = "1".equals(lines.get(2).trim()) || "true".equalsIgnoreCase(lines.get(2).trim());
                    AutoMaintenance = enabled;
                    Logger.log(Logger.PURPLE, "Đã nạp " + FILE_PATH + " | " + hours + "h" + mins + " | enabled=" + enabled);
                    return;
                }
            }
        } catch (Exception e) {
            Logger.error("Lỗi đọc " + FILE_PATH + ": " + e.getMessage());
        }
    }

    public static void reload() {
        loadConfig();
    }

    @Override
    public void run() {
        loadConfig();
        Logger.log(Logger.PURPLE, "AutoMaintenance thread đã khởi chạy.");

        while (true) {
            try {
                Thread.sleep(10_000); // Kiểm tra mỗi 10 giây
                if ((enabled || AutoMaintenance) && !Maintenance.isRunning) {
                    java.time.ZonedDateTime now = java.time.ZonedDateTime.now();
                    int currentDay = now.getDayOfYear();
                    if (now.getHour() == hours && now.getMinute() == mins && lastRunDay != currentDay) {
                        lastRunDay = currentDay;
                        Logger.log(Logger.YELLOW, "Đến giờ bảo trì tự động (" + hours + "h" + mins + ")! Bắt đầu đếm ngược 60 giây...");
                        Maintenance.gI().startSeconds(60);
                    }
                }
            } catch (InterruptedException e) {
                break;
            } catch (Exception e) {
                Logger.logException(AutoMaintenance.class, e);
            }
        }
    }
}