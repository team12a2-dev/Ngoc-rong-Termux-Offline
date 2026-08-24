package nro.models.server.panel;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.Executors;
import nro.models.utils.Logger;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

/** Lightweight HTTP sidecar for clan ops (hot-patchable without rebuilding PanelAgent). */
public final class PanelClanSidecar {

    private static final int PORT = 9092;
    private static volatile boolean started;

    private PanelClanSidecar() {
    }

    public static void ensureStarted() {
        if (started) {
            return;
        }
        synchronized (PanelClanSidecar.class) {
            if (started) {
                return;
            }
            try {
                HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", PORT), 0);
                server.createContext("/health", PanelClanSidecar::health);
                server.createContext("/clan/dissolve", PanelClanSidecar::dissolve);
                server.createContext("/reload/clan", PanelClanSidecar::reload);
                server.setExecutor(Executors.newCachedThreadPool());
                server.start();
                started = true;
                Logger.success("Panel Clan Sidecar started at http://127.0.0.1:" + PORT + "\n");
            } catch (Exception e) {
                Logger.logException(PanelClanSidecar.class, e);
            }
        }
    }

    private static void health(HttpExchange ex) throws IOException {
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            writeJson(ex, 405, "{\"ok\":false,\"error\":\"Method not allowed\"}");
            return;
        }
        writeJson(ex, 200, "{\"ok\":true,\"data\":{\"status\":\"ok\",\"agent\":\"nro-panel-clan-sidecar\"}}");
    }

    private static void dissolve(HttpExchange ex) throws IOException {
        if (!authorized(ex)) {
            writeJson(ex, 401, "{\"ok\":false,\"error\":\"Unauthorized\"}");
            return;
        }
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            writeJson(ex, 405, "{\"ok\":false,\"error\":\"Method not allowed\"}");
            return;
        }
        JSONObject json = parseJson(readBody(ex));
        int clanId = intValue(json.get("clanId"), -1);
        String message = String.valueOf(json.getOrDefault("message", ""));
        boolean ok = PanelClanBridge.dissolveClan(clanId, message);
        if (!ok) {
            writeJson(ex, 404, "{\"ok\":false,\"error\":\"Khong giai tan duoc bang\"}");
            return;
        }
        writeJson(ex, 200, "{\"ok\":true,\"data\":{\"ok\":true}}");
    }

    private static void reload(HttpExchange ex) throws IOException {
        if (!authorized(ex)) {
            writeJson(ex, 401, "{\"ok\":false,\"error\":\"Unauthorized\"}");
            return;
        }
        if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
            writeJson(ex, 405, "{\"ok\":false,\"error\":\"Method not allowed\"}");
            return;
        }
        boolean ok = PanelClanBridge.reloadClans();
        writeJson(ex, 200, "{\"ok\":true,\"data\":{\"ok\":" + ok + "}}");
    }

    private static boolean authorized(HttpExchange ex) {
        String key = ex.getRequestHeaders().getFirst("X-Panel-Key");
        return key != null && key.equals(PanelConfig.apiKey);
    }

    private static String readBody(HttpExchange ex) throws IOException {
        try (InputStream in = ex.getRequestBody()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static JSONObject parseJson(String body) {
        if (body == null || body.isBlank()) {
            return new JSONObject();
        }
        Object parsed = JSONValue.parse(body);
        return parsed instanceof JSONObject ? (JSONObject) parsed : new JSONObject();
    }

    private static int intValue(Object value, int fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static void writeJson(HttpExchange ex, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = ex.getResponseBody()) {
            out.write(bytes);
        }
    }
}
