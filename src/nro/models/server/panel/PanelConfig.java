package nro.models.server.panel;

import java.util.Properties;

public final class PanelConfig {

    public static boolean enabled = true;
    public static String host = "127.0.0.1";
    public static int port = 9090;
    public static String apiKey = "change-me-in-production";

    private PanelConfig() {
    }

    public static void load(Properties properties) {
        Object value;
        if ((value = properties.get("panel.agent.enabled")) != null) {
            enabled = Boolean.parseBoolean(String.valueOf(value));
        }
        if ((value = properties.get("panel.agent.host")) != null) {
            host = String.valueOf(value).trim();
        }
        int gamePort = 14445;
        if ((value = properties.get("server.port")) != null) {
            gamePort = Integer.parseInt(String.valueOf(value).trim());
        }
        if ((value = properties.get("panel.agent.port")) != null) {
            port = Integer.parseInt(String.valueOf(value).trim());
        } else {
            port = gamePort + 1;
        }
        if (port == gamePort) {
            port = gamePort + 1;
        }
        if ((value = properties.get("panel.agent.key")) != null) {
            apiKey = String.valueOf(value).trim();
        }
    }
}
