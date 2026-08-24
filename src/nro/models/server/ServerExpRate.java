package nro.models.server;

/**
 * Hệ số EXP toàn server — class riêng để tránh lỗi khi chỉ patch {@link Manager} vào JAR
 * (NPoint trong JAR cũ luôn đọc field {@code byte} tại đây).
 */
public final class ServerExpRate {

    public static byte RATE_EXP_SERVER = 1;

    private ServerExpRate() {
    }

    public static int get() {
        return RATE_EXP_SERVER & 0xFF;
    }

    public static void set(int rate) {
        if (rate <= 0) {
            return;
        }
        RATE_EXP_SERVER = (byte) Math.min(rate, 127);
    }
}
