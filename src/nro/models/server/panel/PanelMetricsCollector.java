package nro.models.server.panel;

import com.sun.management.OperatingSystemMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.util.LinkedHashMap;
import java.util.Map;
import nro.models.Bot.BotManager;
import nro.models.network.SessionManager;
import nro.models.server.Client;
import nro.models.server.Maintenance;
import nro.models.server.Manager;
import nro.models.server.PanelCommandService;
import nro.models.server.ServerManager;

public final class PanelMetricsCollector {

    private static volatile double lastCpuProcess = 0;
    private static volatile double lastCpuSystem = 0;

    private PanelMetricsCollector() {
    }

    public static Map<String, Object> collect() {
        Map<String, Object> metrics = new LinkedHashMap<>();
        OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        MemoryUsage heap = memoryBean.getHeapMemoryUsage();

        long heapUsed = heap.getUsed();
        long heapMax = heap.getMax() > 0 ? heap.getMax() : heap.getCommitted();
        long totalRAM = osBean.getTotalPhysicalMemorySize();
        long freeRAM = osBean.getFreePhysicalMemorySize();
        long usedRAM = totalRAM - freeRAM;

        double cpuProcess = osBean.getProcessCpuLoad();
        double cpuSystem = osBean.getSystemCpuLoad();
        if (cpuProcess >= 0) {
            lastCpuProcess = cpuProcess * 100;
        }
        if (cpuSystem >= 0) {
            lastCpuSystem = cpuSystem * 100;
        }

        metrics.put("serverName", ServerManager.NAME);
        metrics.put("timeStart", ServerManager.timeStart);
        metrics.put("onlineCount", Client.gI().getPlayers().size());
        metrics.put("sessionCount", SessionManager.gI().getNumSession());
        metrics.put("threadCount", Thread.activeCount());
        metrics.put("botCount", BotManager.gI().bot.size());
        metrics.put("expRate", Manager.getExpRate());
        metrics.put("adminMode", PanelCommandService.isAdminModeOnly());
        metrics.put("maintenance", Maintenance.isRunning);
        metrics.put("maintenanceCountdown", Maintenance.getCountdownSeconds());
        metrics.put("maintenanceCountdownActive", Maintenance.isCountdownActive());
        metrics.put("maxPlayer", Manager.MAX_PLAYER);
        metrics.put("maxPerIp", Manager.MAX_PER_IP);
        metrics.put("ramJvmGb", round3(heapUsed / 1024.0 / 1024 / 1024));
        metrics.put("heapMaxGb", round3(heapMax / 1024.0 / 1024 / 1024));
        metrics.put("heapUsagePct", heapMax > 0 ? round1(heapUsed * 100.0 / heapMax) : 0);
        metrics.put("ramOsUsedGb", round3(usedRAM / 1024.0 / 1024 / 1024));
        metrics.put("ramOsTotalGb", round3(totalRAM / 1024.0 / 1024 / 1024));
        metrics.put("cpuProcess", round1(lastCpuProcess));
        metrics.put("cpuSystem", round1(lastCpuSystem));
        metrics.put("cpuCores", osBean.getAvailableProcessors());
        metrics.put("timestamp", System.currentTimeMillis());
        return metrics;
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static double round3(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }
}
