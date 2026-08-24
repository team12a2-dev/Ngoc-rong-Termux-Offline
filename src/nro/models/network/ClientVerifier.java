package nro.models.network;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Arrays;

public class ClientVerifier {

    /** Bật khi client custom đã gửi token HMAC; client NRO thường không có → để false. */
    public static boolean ENABLED = false;

    private static final byte[] SECRET_KEY = "NRO_SECRET_KEY_2024_CHANGE_ME".getBytes();
    private static final long TOKEN_VALID_MS = 120_000L;

    public static boolean verify(byte[] tokenBytes) {
        if (!ENABLED) {
            return true;
        }
        if (tokenBytes == null || tokenBytes.length != 40) {
            return false;
        }

        long timestamp = 0;
        for (int i = 0; i < 8; i++) {
            timestamp = (timestamp << 8) | (tokenBytes[i] & 0xFF);
        }

        long now = System.currentTimeMillis();
        if (Math.abs(now - timestamp) > TOKEN_VALID_MS) {
            return false;
        }

        byte[] expectedHmac = computeHmac(timestamp);
        if (expectedHmac == null)
            return false;

        byte[] receivedHmac = Arrays.copyOfRange(tokenBytes, 8, 40);
        return Arrays.equals(expectedHmac, receivedHmac);
    }

    public static byte[] computeHmac(long timestamp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET_KEY, "HmacSHA256"));

            byte[] tsBytes = new byte[8];
            long tmp = timestamp;
            for (int i = 7; i >= 0; i--) {
                tsBytes[i] = (byte) (tmp & 0xFF);
                tmp >>= 8;
            }

            return mac.doFinal(tsBytes);
        } catch (Exception e) {
            return null;
        }
    }
}