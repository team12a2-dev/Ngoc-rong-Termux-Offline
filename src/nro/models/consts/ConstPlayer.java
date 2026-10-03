package nro.models.consts;

public class ConstPlayer {

    public static final int[] HEADMONKEY = {192, 195, 196, 199, 197, 200, 198};

    /**
     * Part head/body/leg hiển thị khi bị Thỏ Đại Ca biến thành cà rốt.
     *
     * <p>Bộ sprite trong tài nguyên không có part nào là hình củ cà rốt (bảng {@code part} chỉ có
     * NPC69 Thỏ Đại Ca → 403/404/405 và NPC75 Thỏ Đỏ → 1098/1099/1100), nên lúc này dùng lại
     * đúng bộ part của Thỏ Đại Ca để trạng thái biến hình nhìn thấy được. Muốn đổi sang hình
     * củ cà rốt thật thì cần bổ sung part mới rồi đổi ba số ở đây.
     */
    public static final short[] CARROT_PART = {403, 404, 405};

    public static final byte TRAI_DAT = 0;
    public static final byte NAMEC = 1;
    public static final byte XAYDA = 2;

    //type pk
    public static final byte NON_PK = 0;
    public static final byte PK_PVP = 3;
    public static final byte PK_PVP_2 = 4;
    public static final byte PK_ALL = 5;

    //type fushion
    public static final byte NON_FUSION = 0;
    public static final byte LUONG_LONG_NHAT_THE = 4;
    public static final byte HOP_THE_PORATA = 6;
    public static byte HOP_THE_PORATA2 = 8;
    public static byte HOP_THE_PORATA3 = 9;
    public static final byte HOP_THE_GOGETA = 10;
}
