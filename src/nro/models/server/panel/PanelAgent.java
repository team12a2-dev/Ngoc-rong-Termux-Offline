package nro.models.server.panel;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import nro.models.server.Maintenance;
import nro.models.server.ServerManager;
import nro.models.utils.Logger;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

public final class PanelAgent {

    private static final PanelAgent INSTANCE = new PanelAgent();
    private HttpServer server;

    public static PanelAgent gI() {
        return INSTANCE;
    }

    public synchronized void start() {
        if (!PanelConfig.enabled || server != null) {
            return;
        }
        int basePort = PanelConfig.port;
        for (int attempt = 0; attempt < 10; attempt++) {
            int bindPort = basePort + attempt;
            try {
                server = HttpServer.create(new InetSocketAddress(PanelConfig.host, bindPort), 0);
                PanelConfig.port = bindPort;
                break;
            } catch (IOException e) {
                if (attempt == 9) {
                    Logger.error("Panel Agent: không bind được cổng " + basePort + "-" + (basePort + 9)
                            + " (" + PanelConfig.host + "). Có thể instance cũ vẫn chạy.\n");
                    Logger.logException(PanelAgent.class, e);
                    return;
                }
                Logger.warning("Panel Agent: cổng " + bindPort + " đang dùng, thử " + (bindPort + 1) + "...\n");
            }
        }
        server.createContext("/health", exchange -> handle(exchange, this::health));
        server.createContext("/metrics", exchange -> handle(exchange, this::metrics));
        server.createContext("/players", exchange -> handle(exchange, this::players));
        server.createContext("/runtime-config", exchange -> handle(exchange, this::runtimeConfig));
        server.createContext("/boss/list", exchange -> handle(exchange, this::bossList));
        server.createContext("/broadcast", exchange -> handle(exchange, this::broadcast));
        server.createContext("/clan/dissolve", exchange -> handle(exchange, this::dissolveClan));
        server.createContext("/maintenance", exchange -> handle(exchange, this::maintenance));
        server.createContext("/config/admin-mode", exchange -> handle(exchange, this::adminMode));
        server.createContext("/config/exp", exchange -> handle(exchange, this::expRate));
        server.createContext("/reload/items", exchange -> handle(exchange, this::reloadItems));
        server.createContext("/reload/shop", exchange -> handle(exchange, this::reloadShop));
        server.createContext("/reload/giftcode", exchange -> handle(exchange, this::reloadGiftcode));
        server.createContext("/reload/clan", exchange -> handle(exchange, this::reloadClan));
                server.createContext("/reload/boss-spawn", exchange -> handle(exchange, this::reloadBossSpawn));
        server.createContext("/reload/drop-config", exchange -> handle(exchange, this::reloadDropConfig));
        server.createContext("/reload/usable-items", exchange -> handle(exchange, this::reloadUsableItems));

        server.createContext("/boss/spawn", exchange -> handle(exchange, this::spawnBoss));
        server.createContext("/players/kick-all", exchange -> handle(exchange, this::kickAll));
        server.createContext("/events", exchange -> handle(exchange, this::events));
        server.createContext("/config/files", exchange -> handle(exchange, this::configFiles));
        server.setExecutor(Executors.newFixedThreadPool(4));
        server.start();
        Logger.success("Panel Agent started at http://" + PanelConfig.host + ":" + PanelConfig.port + "\n");
    }

    public synchronized void stop() {
        if (server != null) {
            server.stop(0);
            server = null;
        }
    }

    private void handle(HttpExchange exchange, Handler handler) throws IOException {
        addCors(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }
        if (!authorized(exchange)) {
            writeJson(exchange, 401, error("Unauthorized"));
            return;
        }
        try {
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();
            if (path.startsWith("/players/") && !path.equals("/players/kick-all")) {
                handlePlayerRoute(exchange, method, path);
                return;
            }
            if (path.startsWith("/config/files/") && path.length() > "/config/files/".length()) {
                handleConfigFileRoute(exchange, method, path);
                return;
            }
            handler.handle(exchange, method, path, readBody(exchange));
        } catch (Exception e) {
            Logger.logException(PanelAgent.class, e);
            writeJson(exchange, 500, error(e.getMessage()));
        }
    }

    private void handlePlayerRoute(HttpExchange exchange, String method, String path) throws IOException {
        if ("/players/create".equals(path) && "POST".equals(method)) {
            JSONObject body = parseJson(readBody(exchange));
            int accountId = intValue(body.get("accountId"), 0);
            String name = String.valueOf(body.getOrDefault("name", ""));
            int gender = intValue(body.get("gender"), 0);
            int hair = intValue(body.get("head"), 0);
            boolean created = PanelActions.createPlayer(accountId, name, gender, hair);
            writeJson(exchange, created ? 200 : 400, success(Map.of("created", created)));
            return;
        }
        String[] parts = path.split("/");
        if (parts.length < 3) {
            writeJson(exchange, 404, error("Not found"));
            return;
        }
        String name = decode(parts[2]);
        if (parts.length == 3 && "GET".equals(method)) {
            Map<String, Object> player = PanelActions.getOnlinePlayer(name);
            if (player == null) {
                writeJson(exchange, 404, error("Player not online"));
            } else {
                writeJson(exchange, 200, success(player));
            }
            return;
        }
        if (parts.length == 4 && "POST".equals(method)) {
            String action = parts[3];
            JSONObject body = parseJson(readBody(exchange));
            switch (action) {
                case "kick" -> {
                    writeJson(exchange, 200, success(Map.of("kicked", PanelActions.kickPlayer(name))));
                }
                case "buff-vnd" -> {
                    int amount = intValue(body.get("amount"), 0);
                    writeJson(exchange, 200, success(Map.of("ok", PanelActions.buffVnd(name, amount))));
                }
                case "currency" -> {
                    long gold = longValue(body.get("gold"), 0L);
                    int gem = intValue(body.get("gem"), 0);
                    writeJson(exchange, 200, success(PanelActions.addCurrency(name, gold, gem)));
                }

                case "buff-item" -> {
                    Object items = body.get("items");
                    int added = items instanceof JSONArray array ? PanelActions.buffItem(name, array) : 0;
                    writeJson(exchange, 200, success(Map.of("added", added)));
                }
                case "sync-db" -> {
                    writeJson(exchange, 200, success(Map.of("synced", PanelActions.syncFromDatabase(name))));
                }
                case "apply-items" -> {
                    String container = String.valueOf(body.getOrDefault("container", ""));
                    Object items = body.get("items");
                    boolean applied = items instanceof JSONArray array
                            ? PanelActions.applyItemsContainer(name, container, array)
                            : false;
                    writeJson(exchange, 200, success(Map.of(
                            "applied", applied,
                            "container", container
                    )));
                }
                default -> writeJson(exchange, 404, error("Unknown player action"));
            }
            return;
        }
        writeJson(exchange, 404, error("Not found"));
    }

    private void health(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(Map.of(
                "status", ServerManager.isRunning ? "ok" : "stopped",
                "agent", "nro-panel-agent",
                "version", "1.0.0"
        )));
    }

    private void metrics(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(PanelMetricsCollector.collect()));
    }

    private void players(HttpExchange exchange, String method, String path, String body) throws IOException {
        if (!"GET".equals(method)) {
            writeJson(exchange, 405, error("Method not allowed"));
            return;
        }
        writeJson(exchange, 200, success(PanelActions.listOnlinePlayers()));
    }

    private void runtimeConfig(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(PanelActions.runtimeConfig()));
    }

    private void bossList(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(PanelActions.listBosses()));
    }

    private void broadcast(HttpExchange exchange, String method, String path, String body) throws IOException {
        if (!"POST".equalsIgnoreCase(method)) {
            writeJson(exchange, 405, error("Method not allowed"));
            return;
        }
        JSONObject json = parseJson(body);
        String message = String.valueOf(json.getOrDefault("message", ""));
        String type = String.valueOf(json.getOrDefault("type", "info"));
        writeJson(exchange, 200, success(PanelActions.broadcast(message, type)));
    }

    private void dissolveClan(HttpExchange exchange, String method, String path, String body) throws IOException {
        if (!"POST".equalsIgnoreCase(method)) {
            writeJson(exchange, 405, error("Method not allowed"));
            return;
        }
        JSONObject json = parseJson(body);
        int clanId = intValue(json.get("clanId"), -1);
        String message = String.valueOf(json.getOrDefault("message", ""));
        boolean ok = PanelActions.dissolveClan(clanId, message);
        if (!ok) {
            writeJson(exchange, 404, error("Không giải tán được bang id=" + clanId));
            return;
        }
        writeJson(exchange, 200, success(Map.of("ok", true)));
    }

    private void maintenance(HttpExchange exchange, String method, String path, String body) throws IOException {
        JSONObject json = parseJson(body);
        int seconds = intValue(json.get("seconds"), 30);
        boolean immediate = boolValue(json.get("immediate"));
        boolean cancel = boolValue(json.get("cancel"));
        if (cancel) {
            boolean cancelled = PanelActions.cancelMaintenance();
            writeJson(exchange, 200, success(Map.of(
                    "ok", true,
                    "cancelled", cancelled,
                    "maintenanceCountdown", Maintenance.getCountdownSeconds(),
                    "maintenanceCountdownActive", Maintenance.isCountdownActive()
            )));
            return;
        }
        PanelActions.startMaintenance(seconds, immediate, false);
        writeJson(exchange, 200, success(Map.of(
                "ok", true,
                "maintenanceCountdown", Maintenance.getCountdownSeconds(),
                "maintenanceCountdownActive", Maintenance.isCountdownActive()
        )));
    }

    private void adminMode(HttpExchange exchange, String method, String path, String body) throws IOException {
        JSONObject json = parseJson(body);
        boolean enabled = boolValue(json.get("enabled"));
        PanelActions.setAdminMode(enabled);
        writeJson(exchange, 200, success(Map.of("enabled", enabled)));
    }

    private void expRate(HttpExchange exchange, String method, String path, String body) throws IOException {
        JSONObject json = parseJson(body);
        int rate = intValue(json.get("rate"), 0);
        writeJson(exchange, 200, success(Map.of("ok", PanelActions.setExpRate(rate), "rate", rate)));
    }

        private void reloadItems(HttpExchange exchange, String method, String path, String body) throws IOException {
        try {
            writeJson(exchange, 200, success(PanelActions.reloadItemTemplates()));
        } catch (Exception e) {
            writeJson(exchange, 500, error(e.getMessage()));
        }
    }

    private void reloadShop(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(Map.of("ok", PanelActions.reloadShop())));
    }

    private void reloadGiftcode(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(Map.of("ok", PanelActions.reloadGiftcode())));
    }

    private void reloadClan(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(Map.of("ok", PanelActions.reloadClans())));
    }

        private void reloadBossSpawn(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(Map.of("ok", PanelActions.reloadBossSpawn())));
    }

    private void reloadDropConfig(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(PanelActions.reloadDropConfig()));
    }

    private void reloadUsableItems(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(PanelActions.reloadUsableItems()));
    }



    private void spawnBoss(HttpExchange exchange, String method, String path, String body) throws IOException {
        JSONObject json = parseJson(body);
        int bossId = intValue(json.get("bossId"), 0);
        writeJson(exchange, 200, success(Map.of("ok", PanelActions.spawnBoss(bossId))));
    }

    private void kickAll(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(Map.of("kicked", PanelActions.kickAll())));
    }

    private void events(HttpExchange exchange, String method, String path, String body) throws IOException {
        writeJson(exchange, 200, success(PanelActions.getEvents()));
    }

    private void configFiles(HttpExchange exchange, String method, String path, String body) throws IOException {
        if ("GET".equals(method)) {
            writeJson(exchange, 200, success(PanelActions.listConfigFiles()));
            return;
        }
        writeJson(exchange, 405, error("Method not allowed"));
    }

    private void handleConfigFileRoute(HttpExchange exchange, String method, String path) throws IOException {
        String name = decode(path.substring("/config/files/".length()));
        try {
            if ("GET".equals(method)) {
                writeJson(exchange, 200, success(Map.of("name", name, "content", PanelActions.readConfigFile(name))));
                return;
            }
            if ("POST".equals(method) || "PUT".equals(method)) {
                JSONObject json = parseJson(readBody(exchange));
                String content = String.valueOf(json.getOrDefault("content", ""));
                PanelActions.writeConfigFile(name, content);
                writeJson(exchange, 200, success(Map.of("name", name, "saved", true)));
                return;
            }
            writeJson(exchange, 405, error("Method not allowed"));
        } catch (IOException e) {
            writeJson(exchange, 400, error(e.getMessage()));
        }
    }

    private boolean authorized(HttpExchange exchange) {
        String key = exchange.getRequestHeaders().getFirst("X-Panel-Key");
        return key != null && key.equals(PanelConfig.apiKey);
    }

    private static void addCors(HttpExchange exchange) {
        Headers headers = exchange.getResponseHeaders();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, X-Panel-Key");
        headers.set("Content-Type", "application/json; charset=utf-8");
    }

    private static String readBody(HttpExchange exchange) throws IOException {
        try (InputStream in = exchange.getRequestBody()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static JSONObject parseJson(String body) {
        if (body == null || body.isBlank()) {
            return new JSONObject();
        }
        Object parsed = JSONValue.parse(body);
        return parsed instanceof JSONObject json ? json : new JSONObject();
    }

    private static void writeJson(HttpExchange exchange, int status, JSONObject json) throws IOException {
        byte[] bytes = json.toJSONString().getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static JSONObject success(Object data) {
        JSONObject json = new JSONObject();
        json.put("ok", true);
        json.put("data", data);
        return json;
    }

    private static JSONObject error(String message) {
        JSONObject json = new JSONObject();
        json.put("ok", false);
        json.put("error", message);
        return json;
    }

    private static long longValue(Object value, long fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception e) {
            return fallback;
        }
    }

    private static int intValue(Object value, int fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return fallback;
        }
    }

    private static boolean boolValue(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    private static String decode(String value) {
        return java.net.URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @FunctionalInterface
    private interface Handler {
        void handle(HttpExchange exchange, String method, String path, String body) throws IOException;
    }
}
