package nro.models.server.panel;

import nro.models.server.PanelCommandService;
import nro.models.server.ServerManager;

/** Starts panel HTTP agent after game server is running (safe for existing JAR). */
public final class PanelBootstrap {

    private static volatile boolean started;

    private PanelBootstrap() {
    }

    static {
        Thread bootstrap = new Thread(() -> {
            try {
                while (!ServerManager.isRunning) {
                    Thread.sleep(300);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            startOnce();
        }, "Panel bootstrap");
        bootstrap.setDaemon(true);
        bootstrap.start();
    }

    public static void touch() {
        // Called from Manager.loadProperties to trigger static initializer.
    }

    private static synchronized void startOnce() {
        if (started) {
            return;
        }
        new Thread(PanelCommandService.gI(), "Panel command bridge").start();
        PanelAgent.gI().start();
        started = true;
    }
}
