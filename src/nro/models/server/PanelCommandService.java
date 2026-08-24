package nro.models.server;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import nro.models.server.panel.PanelClanBridge;
import nro.models.server.panel.PanelActions;
import nro.models.utils.Logger;

public class PanelCommandService implements Runnable {

    private static final PanelCommandService INSTANCE = new PanelCommandService();
    private static final Path COMMAND_FILE = Path.of("panel_cmd.txt");
    private static final Path ADMIN_MODE_FILE = Path.of("panel_admin_mode_status.txt");
    private static final Path EXP_STATUS_FILE = Path.of("panel_exp_status.txt");
    private static volatile boolean adminModeOnly = readFlag(ADMIN_MODE_FILE);

    public static PanelCommandService gI() {
        return INSTANCE;
    }

    public static boolean isAdminModeOnly() {
        return adminModeOnly || readFlag(ADMIN_MODE_FILE);
    }

    public static void setAdminMode(boolean enabled) {
        adminModeOnly = enabled;
    }

    public static void loadStartupState() {
        adminModeOnly = readFlag(ADMIN_MODE_FILE);
        int expRate = readPositiveInt(EXP_STATUS_FILE, 0);
        if (expRate > 0) {
            Manager.setExpRate(expRate);
        }
    }

    private static boolean readFlag(Path file) {
        try {
            return Files.exists(file) && Files.readString(file, StandardCharsets.UTF_8).trim().equals("1");
        } catch (IOException ignored) {
            return false;
        }
    }

    private static int readPositiveInt(Path file, int fallback) {
        try {
            if (!Files.exists(file)) {
                return fallback;
            }
            int value = Integer.parseInt(Files.readString(file, StandardCharsets.UTF_8).trim());
            return value > 0 ? value : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    @Override
    public void run() {
        loadStartupState();
        while (ServerManager.isRunning) {
            try {
                pollCommands();
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                Logger.logException(PanelCommandService.class, e);
            }
        }
    }

    private void pollCommands() throws IOException {
        if (!Files.exists(COMMAND_FILE)) {
            return;
        }
        List<String> lines = Files.readAllLines(COMMAND_FILE, StandardCharsets.UTF_8);
        Files.newBufferedWriter(COMMAND_FILE, StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING).close();
        for (String line : lines) {
            process(line == null ? "" : line.trim());
        }
    }

    private void process(String command) {
        if (command.isEmpty()) {
            return;
        }
        String[] parts = command.split("\\|", 3);
        String action = parts[0];
        switch (action) {
            case "BUFF_VND" -> {
                if (parts.length >= 3) {
                    PanelActions.buffVnd(parts[1], parseInt(parts[2], 0));
                }
            }
            case "BUFF_ITEM" -> {
                if (parts.length >= 3) {
                    PanelActions.buffItemFromJsonString(parts[1], parts[2]);
                }
            }
            case "KICK_PLAYER" -> {
                if (parts.length >= 2) {
                    PanelActions.kickPlayer(parts[1]);
                }
            }
            case "ADMIN_MODE" -> {
                if (parts.length >= 2) {
                    PanelActions.setAdminMode("1".equals(parts[1]));
                }
            }
            case "MAINTENANCE_NOW" -> PanelActions.startMaintenance(30, false, false);
            case "SET_EXP" -> {
                if (parts.length >= 2) {
                    PanelActions.setExpRate(parseInt(parts[1], 0));
                }
            }
            case "SET_DROP" -> Logger.warning("Panel SET_DROP ignored: source game has no global drop rate.\n");
            case "SPAWN_BOSS" -> {
                String[] spawnParts = command.split("\\|");
                if (spawnParts.length >= 2) {
                    PanelActions.spawnBoss(parseInt(spawnParts[1], 0));
                }
            }
            case "DISSOLVE_CLAN" -> {
                if (parts.length >= 2) {
                    String msg = parts.length >= 3 ? parts[2] : "";
                    PanelClanBridge.dissolveClan(parseInt(parts[1], 0), msg);
                }
            }
            case "RELOAD_CLAN" -> PanelClanBridge.reloadClans();
            default -> Logger.warning("Panel command unknown: " + command + "\n");
        }
    }

    private int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value.trim());
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
