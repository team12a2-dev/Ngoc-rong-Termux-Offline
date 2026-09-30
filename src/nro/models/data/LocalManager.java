package nro.models.data;

import nro.models.utils.Logger;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.Properties;
import java.sql.ResultSet;
import java.sql.PreparedStatement;
import java.io.FileInputStream;
import java.sql.SQLException;
import java.sql.Connection;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariConfig;
import nro.models.data.ResultSetImpl;
import java.io.IOException;
import nro.models.data.LocalResultSet;

public class LocalManager {

    private static String DRIVER;
    private static String URL;
    private static String DB_HOST;
    private static String DB_PORT;
    private static String DB_NAME;
    private static String DB_USER;
    private static String DB_PASSWORD;
    private static int MIN_CONN;
    private static int MAX_CONN;
    private static long MAX_LIFE_TIME;
    private static final String LOCAL_DB_HOST = "127.0.0.1";
    public static boolean LOG_QUERY;
    private static HikariConfig config;
    private static HikariDataSource ds;
    private static LocalManager i;

    static {
        loadProperties();
        config = createConfig("User Management", DB_NAME);
        ds = new HikariDataSource(config);
    }

    public static LocalManager gI() {
        if (i == null) {
            i = new LocalManager();
        }
        return i;
    }

    public static Connection getConnection() throws SQLException {
        return LocalManager.ds.getConnection();
    }

    public void release(Connection con) {
    }

    public static void close() {
        LocalManager.ds.close();
    }

    private static void loadProperties() {
        Properties properties = new Properties();
        try {
            properties.load(new FileInputStream("Config.properties"));
            Object value;
            if ((value = properties.get("database.driver")) != null) {
                DRIVER = String.valueOf(value);
            }
            if (DRIVER == null || DRIVER.equals("com.mysql.jdbc.Driver") || DRIVER.equals("com.mysql.cj.jdbc.Driver")) {
                DRIVER = "org.mariadb.jdbc.Driver";
            }
            if ((value = properties.get("database.host")) != null) {
                DB_HOST = resolveDbHost(String.valueOf(value));
            }
            if ((value = properties.get("database.port")) != null) {
                DB_PORT = String.valueOf(value);
            }
            if ((value = properties.get("database.name")) != null) {
                DB_NAME = String.valueOf(value);
            }
            if ((value = properties.get("database.user")) != null) {
                DB_USER = String.valueOf(value);
            }
            if ((value = properties.get("database.pass")) != null) {
                DB_PASSWORD = String.valueOf(value);
            }
            if ((value = properties.get("database.min")) != null) {
                MIN_CONN = Integer.parseInt(String.valueOf(value));
            }
            if ((value = properties.get("database.max")) != null) {
                MAX_CONN = Integer.parseInt(String.valueOf(value));
            }
            if ((value = properties.get("database.lifetime")) != null) {
                MAX_LIFE_TIME = Integer.parseInt(String.valueOf(value));
            }
            if ((value = properties.get("database.log")) != null) {
                LOG_QUERY = Boolean.parseBoolean(String.valueOf(value));
            }
            Logger.log(Logger.RED, "Successfully loaded file properties!\n");
        } catch (final IOException | NumberFormatException ex) {
            Logger.log(Logger.RED, "Không thể load file properties!\n");
        } finally {
            properties.clear();
        }
    }

    /**
     * MariaDB do launcher quản lý chỉ bind 127.0.0.1 và chỉ cấp quyền cho
     * 'user'@'localhost' + 'user'@'127.0.0.1'. Nếu database.host trỏ về địa
     * chỉ của chính máy này (IP Wi-Fi, IP 4G) thì MariaDB từ chối với
     * "Host ... is not allowed to connect". Khi đó ép về loopback.
     * Host MariaDB ở máy khác vẫn được giữ nguyên.
     */
    private static String resolveDbHost(String host) {
        if (host == null || host.trim().isEmpty()) {
            return LOCAL_DB_HOST;
        }
        String trimmed = host.trim();
        if (trimmed.equalsIgnoreCase("localhost") || "::1".equals(trimmed) || trimmed.startsWith("127.")) {
            return trimmed;
        }
        if (!isIpLiteral(trimmed)) {
            return trimmed;
        }
        try {
            InetAddress target = InetAddress.getByName(trimmed);
            if (target.isLoopbackAddress()) {
                return trimmed;
            }
            for (NetworkInterface nic : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                for (InetAddress local : Collections.list(nic.getInetAddresses())) {
                    if (local.equals(target)) {
                        Logger.log(Logger.YELLOW, "database.host=" + trimmed
                                + " là IP của chính máy này nhưng MariaDB chỉ nghe " + LOCAL_DB_HOST
                                + "; chuyển sang " + LOCAL_DB_HOST + "\n");
                        return LOCAL_DB_HOST;
                    }
                }
            }
        } catch (Exception ex) {
            return trimmed;
        }
        return trimmed;
    }

    private static boolean isIpLiteral(String host) {
        if (host.indexOf(':') >= 0) {
            return true;
        }
        for (int i = 0; i < host.length(); i++) {
            char c = host.charAt(i);
            if (c != '.' && (c < '0' || c > '9')) {
                return false;
            }
        }
        return true;
    }

    public static LocalResultSet executeQuery(final String query) throws Exception {
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement(query); ResultSet rs = ps.executeQuery()) {
            if (LOG_QUERY) {
                Logger.log(Logger.GREEN, "Thực thi thành công câu lệnh: " + ps.toString() + "\n");
            }
            return new ResultSetImpl(rs) {};
        } catch (Exception ex) {
            Logger.log(Logger.RED, "Có lỗi xảy ra khi thực thi câu lệnh: " + query + "\n");
            throw ex;
        }
    }

    public static LocalResultSet executeQuery(final String query, final Object... objs) throws Exception {
        try (final Connection con = getConnection(); final PreparedStatement ps = con.prepareStatement(query)) {
            for (int i = 0; i < objs.length; ++i) {
                ps.setObject(i + 1, objs[i]);
            }
            if (LOG_QUERY) {
                Logger.log(Logger.GREEN, "Thực thi thành công câu lệnh: " + ps.toString() + "\n");
            }
            return new ResultSetImpl(ps.executeQuery());
        } catch (final Exception ex) {
            Logger.log(Logger.RED, "Có lỗi xảy ra khi thực thi câu lệnh: " + query + "\n");
            throw ex;
        }
    }

    public static int executeUpdate(final String query) throws Exception {
        int rowUpdated = -1;
        try (final Connection con = getConnection(); final PreparedStatement ps = con.prepareStatement(query)) {
            if (LOG_QUERY) {
                Logger.log(Logger.GREEN, "Thực thi thành công câu lệnh: " + ps.toString() + "\n");
            }
            rowUpdated = ps.executeUpdate();
        } catch (final Exception e) {
            Logger.log(Logger.RED, "Có lỗi xảy ra khi thực thi câu lệnh: " + query + "\n");
            throw e;
        }
        return rowUpdated;
    }

    public static int executeUpdate(String query, final Object... objs) throws Exception {
        if (query.indexOf("insert") == 0 && query.lastIndexOf("()") == query.length() - 2) {
            final StringBuilder sb = new StringBuilder();
            sb.append("(");
            for (int i = 0; i < objs.length; ++i) {
                sb.append("?");
                if (i < objs.length - 1) {
                    sb.append(",");
                } else {
                    sb.append(")");
                }
            }
            query = query.replace("()", sb.toString());
        }
        try (final Connection con = getConnection(); final PreparedStatement ps = con.prepareStatement(query)) {
            for (int j = 0; j < objs.length; ++j) {
                ps.setObject(j + 1, objs[j]);
            }
            if (LOG_QUERY) {
                Logger.log(Logger.GREEN, "Thực thi thành công câu lệnh: " + ps.toString() + "\n");
            }
            return ps.executeUpdate();
        } catch (final Exception ex) {
            Logger.log(Logger.RED, "Có lỗi xảy ra khi thực thi câu lệnh: " + query + "\n");
            throw ex;
        }
    }

    private static HikariConfig createConfig(String poolName, String databaseName) {
    HikariConfig config = new HikariConfig();
    config.setDriverClassName(DRIVER);

    config.setJdbcUrl(String.format(
        "jdbc:mariadb://%s:%s/%s?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&useSsl=false&serverTimezone=UTC&cachePrepStmts=true&prepStmtCacheSize=250&prepStmtCacheSqlLimit=2048",
        DB_HOST, DB_PORT, databaseName
    ));

    config.setUsername(DB_USER);
    config.setPassword(DB_PASSWORD);

    config.setMinimumIdle(MIN_CONN);
    config.setMaximumPoolSize(MAX_CONN);

    config.setMaxLifetime(MAX_LIFE_TIME);
    config.setConnectionTimeout(30000);
    // HikariCP bỏ qua idleTimeout nếu nó >= maxLifetime, nên phải luôn nhỏ hơn.
    config.setIdleTimeout(Math.max(30000L, Math.min(600000L, MAX_LIFE_TIME / 2)));
    config.setValidationTimeout(5000);

    config.setConnectionTestQuery("SELECT 1");

    config.setLeakDetectionThreshold(60000);

    config.setPoolName(poolName);

    return config;
}
}