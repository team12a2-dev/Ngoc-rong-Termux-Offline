package nro.models.consts;

public class ConstPlayer {

    public static final int[] HEADMONKEY = {192, 195, 196, 199, 197, 200, 198};

    /**
     * Part head/body/leg hiển thị khi bị Thỏ Đại Ca biến thành cà rốt.
     *
     * <p>Bộ part 406/407/408 trong bảng {@code part} là hình củ cà rốt: part thân 407 chứa
     * toàn bộ sprite củ cà rốt, còn part đầu/chân để rỗng. Không dùng bộ 403/404/405 vì đó
     * là ngoại hình của NPC69 Thỏ Đại Ca.
     */
    public static final short[] CARROT_PART = {406, 407, 408};

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
