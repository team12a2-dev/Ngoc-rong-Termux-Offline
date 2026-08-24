package nro.models.player;

import nro.models.consts.ConstNpc;
import nro.models.npc.Npc;
import nro.models.shop.Shop;
import nro.models.map.Zone;

/**
 * @author By AmodsubVN
 */
public class IDMark {
    private int idItemUpTop;
    private int typeChangeMap; //capsule, ngá»c rá»“ng Ä‘en...
    private int indexMenu; //menu npc
    private int typeInput; //input
    private byte typeLuckyRound; //type lucky round
    private long idPlayThachDau; //id ngÆ°á»i chÆ¡i Ä‘Æ°á»£c má»i thÃ¡ch Ä‘áº¥u
    private int goldThachDau; //vÃ ng thÃ¡ch Ä‘áº¥u
    private long killCharId = -9999;
    private long idEnemy; //id káº» thÃ¹ - tráº£ thÃ¹
    private Shop shopOpen; //shop ngÆ°á»i chÆ¡i Ä‘ang má»Ÿ
    private String tagNameShop; //tháº» tÃªn shop Ä‘ang má»Ÿ
    /**
     * loáº¡i tÃ u váº­n chuyá»ƒn dÃ¹ng ;0 - KhÃ´ng dÃ¹ng ;1 - TÃ u vÅ© trá»¥ ;2 - Dá»‹ch chuyá»ƒn
     * tá»©c thá»i ;3 - TÃ u tenis
     */
    private byte idSpaceShip;
    private int mbv;
    private String captcha;
    private long recaptcha;
    private long lastTimeBan;
    private boolean isBan;
    private int ott;
    //giao dá»‹ch
    private int playerTradeId = -1;
    private Player playerTrade;
    private long lastTimeTrade;
    private long lastTimeNotifyTimeHoldBlackBall;
    private long lastTimeHoldBlackBall;
    private int tempIdBlackBallHold = -1;
    private boolean holdBlackBall;
    private int tempIdNamecBallHold = -1;
    private boolean holdNamecBall;
    private boolean loadedAllDataPlayer; //load thÃ nh cÃ´ng dá»¯ liá»‡u ngÆ°á»i chÆ¡i tá»« database
    private long lastTimeChangeFlag;
    //xoc dia
    private int typeDatXD;
    private int slDatXD;
    private Npc npcXD;
    //Tai Xiu
    private int typeDatTX;
    private Npc npcTX;
    //Bau cua
    private int typeDatBC;
    private Npc npcBC;
    //tá»›i tÆ°Æ¡ng lai
    private boolean gotoFuture;
    private long lastTimeGoToFuture;
    //ChangeMap Khi gas
    private Zone zoneKhiGasHuyDiet;
    private int xMapKhiGasHuyDiet;
    private int yMapKhiGasHuyDiet;
    private boolean goToKGHD;
    private long lastTimeGoToKGHD;
    private long lastTimeChangeZone;
    private long lastTimeChatGlobal;
    private long lastTimeChatPrivate;
    private long lastTimePickItem;
    private boolean goToBDKB;
    private long lastTimeGoToBDKB;
    private long lastTimeAnXienTrapBDKB;
    private int shenronType = -1;
    private Npc npcChose; //npc má»Ÿ
    private byte loaiThe; //loáº¡i tháº» náº¡p
    private boolean acpTrade;
    private boolean isGemCSMM;
    private int damePST;
    private int moneyKeoBuaBao;
    private long timePlayKeoBuaBao;
    private byte keoBuaBaoPlayer;
    private byte keoBuaBaoServer;
    private long lastTimeRevenge;
    private int menuType;
    private int tangHoaType;
    private boolean transactionWP;
    private boolean transactionWVP;
    private long lastTimeCombine;
    public long tempId;

    public boolean isBaseMenu() {
        return this.indexMenu == ConstNpc.BASE_MENU;
    }

    public void dispose() {
        if (this.shopOpen != null) {
            this.shopOpen.dispose();
            this.shopOpen = null;
        }
        this.npcChose = null;
        this.tagNameShop = null;
        this.playerTrade = null;
        this.npcXD = null;
        this.npcTX = null;
        this.npcBC = null;
        this.zoneKhiGasHuyDiet = null;
    }

    @java.lang.SuppressWarnings("all")
    public IDMark() {
    }

    @java.lang.SuppressWarnings("all")
    public int getIdItemUpTop() {
        return this.idItemUpTop;
    }

    @java.lang.SuppressWarnings("all")
    public int getTypeChangeMap() {
        return this.typeChangeMap;
    }

    @java.lang.SuppressWarnings("all")
    public int getIndexMenu() {
        return this.indexMenu;
    }

    @java.lang.SuppressWarnings("all")
    public int getTypeInput() {
        return this.typeInput;
    }

    @java.lang.SuppressWarnings("all")
    public byte getTypeLuckyRound() {
        return this.typeLuckyRound;
    }

    @java.lang.SuppressWarnings("all")
    public long getIdPlayThachDau() {
        return this.idPlayThachDau;
    }

    @java.lang.SuppressWarnings("all")
    public int getGoldThachDau() {
        return this.goldThachDau;
    }

    @java.lang.SuppressWarnings("all")
    public long getKillCharId() {
        return this.killCharId;
    }

    @java.lang.SuppressWarnings("all")
    public long getIdEnemy() {
        return this.idEnemy;
    }

    @java.lang.SuppressWarnings("all")
    public Shop getShopOpen() {
        return this.shopOpen;
    }

    @java.lang.SuppressWarnings("all")
    public String getTagNameShop() {
        return this.tagNameShop;
    }

    /**
     * loáº¡i tÃ u váº­n chuyá»ƒn dÃ¹ng ;0 - KhÃ´ng dÃ¹ng ;1 - TÃ u vÅ© trá»¥ ;2 - Dá»‹ch chuyá»ƒn
     * tá»©c thá»i ;3 - TÃ u tenis
     */
    @java.lang.SuppressWarnings("all")
    public byte getIdSpaceShip() {
        return this.idSpaceShip;
    }

    @java.lang.SuppressWarnings("all")
    public int getMbv() {
        return this.mbv;
    }

    @java.lang.SuppressWarnings("all")
    public String getCaptcha() {
        return this.captcha;
    }

    @java.lang.SuppressWarnings("all")
    public long getRecaptcha() {
        return this.recaptcha;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeBan() {
        return this.lastTimeBan;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isBan() {
        return this.isBan;
    }

    @java.lang.SuppressWarnings("all")
    public int getOtt() {
        return this.ott;
    }

    @java.lang.SuppressWarnings("all")
    public int getPlayerTradeId() {
        return this.playerTradeId;
    }

    @java.lang.SuppressWarnings("all")
    public Player getPlayerTrade() {
        return this.playerTrade;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeTrade() {
        return this.lastTimeTrade;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeNotifyTimeHoldBlackBall() {
        return this.lastTimeNotifyTimeHoldBlackBall;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeHoldBlackBall() {
        return this.lastTimeHoldBlackBall;
    }

    @java.lang.SuppressWarnings("all")
    public int getTempIdBlackBallHold() {
        return this.tempIdBlackBallHold;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isHoldBlackBall() {
        return this.holdBlackBall;
    }

    @java.lang.SuppressWarnings("all")
    public int getTempIdNamecBallHold() {
        return this.tempIdNamecBallHold;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isHoldNamecBall() {
        return this.holdNamecBall;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isLoadedAllDataPlayer() {
        return this.loadedAllDataPlayer;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeChangeFlag() {
        return this.lastTimeChangeFlag;
    }

    @java.lang.SuppressWarnings("all")
    public int getTypeDatXD() {
        return this.typeDatXD;
    }

    @java.lang.SuppressWarnings("all")
    public int getSlDatXD() {
        return this.slDatXD;
    }

    @java.lang.SuppressWarnings("all")
    public Npc getNpcXD() {
        return this.npcXD;
    }

    @java.lang.SuppressWarnings("all")
    public int getTypeDatTX() {
        return this.typeDatTX;
    }

    @java.lang.SuppressWarnings("all")
    public Npc getNpcTX() {
        return this.npcTX;
    }

    @java.lang.SuppressWarnings("all")
    public int getTypeDatBC() {
        return this.typeDatBC;
    }

    @java.lang.SuppressWarnings("all")
    public Npc getNpcBC() {
        return this.npcBC;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isGotoFuture() {
        return this.gotoFuture;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeGoToFuture() {
        return this.lastTimeGoToFuture;
    }

    @java.lang.SuppressWarnings("all")
    public Zone getZoneKhiGasHuyDiet() {
        return this.zoneKhiGasHuyDiet;
    }

    @java.lang.SuppressWarnings("all")
    public int getXMapKhiGasHuyDiet() {
        return this.xMapKhiGasHuyDiet;
    }

    @java.lang.SuppressWarnings("all")
    public int getYMapKhiGasHuyDiet() {
        return this.yMapKhiGasHuyDiet;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isGoToKGHD() {
        return this.goToKGHD;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeGoToKGHD() {
        return this.lastTimeGoToKGHD;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeChangeZone() {
        return this.lastTimeChangeZone;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeChatGlobal() {
        return this.lastTimeChatGlobal;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeChatPrivate() {
        return this.lastTimeChatPrivate;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimePickItem() {
        return this.lastTimePickItem;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isGoToBDKB() {
        return this.goToBDKB;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeGoToBDKB() {
        return this.lastTimeGoToBDKB;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeAnXienTrapBDKB() {
        return this.lastTimeAnXienTrapBDKB;
    }

    @java.lang.SuppressWarnings("all")
    public int getShenronType() {
        return this.shenronType;
    }

    @java.lang.SuppressWarnings("all")
    public Npc getNpcChose() {
        return this.npcChose;
    }

    @java.lang.SuppressWarnings("all")
    public byte getLoaiThe() {
        return this.loaiThe;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isAcpTrade() {
        return this.acpTrade;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isGemCSMM() {
        return this.isGemCSMM;
    }

    @java.lang.SuppressWarnings("all")
    public int getDamePST() {
        return this.damePST;
    }

    @java.lang.SuppressWarnings("all")
    public int getMoneyKeoBuaBao() {
        return this.moneyKeoBuaBao;
    }

    @java.lang.SuppressWarnings("all")
    public long getTimePlayKeoBuaBao() {
        return this.timePlayKeoBuaBao;
    }

    @java.lang.SuppressWarnings("all")
    public byte getKeoBuaBaoPlayer() {
        return this.keoBuaBaoPlayer;
    }

    @java.lang.SuppressWarnings("all")
    public byte getKeoBuaBaoServer() {
        return this.keoBuaBaoServer;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeRevenge() {
        return this.lastTimeRevenge;
    }

    @java.lang.SuppressWarnings("all")
    public int getMenuType() {
        return this.menuType;
    }

    @java.lang.SuppressWarnings("all")
    public int getTangHoaType() {
        return this.tangHoaType;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isTransactionWP() {
        return this.transactionWP;
    }

    @java.lang.SuppressWarnings("all")
    public boolean isTransactionWVP() {
        return this.transactionWVP;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeCombine() {
        return this.lastTimeCombine;
    }

    @java.lang.SuppressWarnings("all")
    public long getTempId() {
        return this.tempId;
    }

    @java.lang.SuppressWarnings("all")
    public void setIdItemUpTop(final int idItemUpTop) {
        this.idItemUpTop = idItemUpTop;
    }

    @java.lang.SuppressWarnings("all")
    public void setTypeChangeMap(final int typeChangeMap) {
        this.typeChangeMap = typeChangeMap;
    }

    @java.lang.SuppressWarnings("all")
    public void setIndexMenu(final int indexMenu) {
        this.indexMenu = indexMenu;
    }

    @java.lang.SuppressWarnings("all")
    public void setTypeInput(final int typeInput) {
        this.typeInput = typeInput;
    }

    @java.lang.SuppressWarnings("all")
    public void setTypeLuckyRound(final byte typeLuckyRound) {
        this.typeLuckyRound = typeLuckyRound;
    }

    @java.lang.SuppressWarnings("all")
    public void setIdPlayThachDau(final long idPlayThachDau) {
        this.idPlayThachDau = idPlayThachDau;
    }

    @java.lang.SuppressWarnings("all")
    public void setGoldThachDau(final int goldThachDau) {
        this.goldThachDau = goldThachDau;
    }

    @java.lang.SuppressWarnings("all")
    public void setKillCharId(final long killCharId) {
        this.killCharId = killCharId;
    }

    @java.lang.SuppressWarnings("all")
    public void setIdEnemy(final long idEnemy) {
        this.idEnemy = idEnemy;
    }

    @java.lang.SuppressWarnings("all")
    public void setShopOpen(final Shop shopOpen) {
        this.shopOpen = shopOpen;
    }

    @java.lang.SuppressWarnings("all")
    public void setTagNameShop(final String tagNameShop) {
        this.tagNameShop = tagNameShop;
    }

    /**
     * loáº¡i tÃ u váº­n chuyá»ƒn dÃ¹ng ;0 - KhÃ´ng dÃ¹ng ;1 - TÃ u vÅ© trá»¥ ;2 - Dá»‹ch chuyá»ƒn
     * tá»©c thá»i ;3 - TÃ u tenis
     */
    @java.lang.SuppressWarnings("all")
    public void setIdSpaceShip(final byte idSpaceShip) {
        this.idSpaceShip = idSpaceShip;
    }

    @java.lang.SuppressWarnings("all")
    public void setMbv(final int mbv) {
        this.mbv = mbv;
    }

    @java.lang.SuppressWarnings("all")
    public void setCaptcha(final String captcha) {
        this.captcha = captcha;
    }

    @java.lang.SuppressWarnings("all")
    public void setRecaptcha(final long recaptcha) {
        this.recaptcha = recaptcha;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeBan(final long lastTimeBan) {
        this.lastTimeBan = lastTimeBan;
    }

    @java.lang.SuppressWarnings("all")
    public void setBan(final boolean isBan) {
        this.isBan = isBan;
    }

    @java.lang.SuppressWarnings("all")
    public void setOtt(final int ott) {
        this.ott = ott;
    }

    @java.lang.SuppressWarnings("all")
    public void setPlayerTradeId(final int playerTradeId) {
        this.playerTradeId = playerTradeId;
    }

    @java.lang.SuppressWarnings("all")
    public void setPlayerTrade(final Player playerTrade) {
        this.playerTrade = playerTrade;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeTrade(final long lastTimeTrade) {
        this.lastTimeTrade = lastTimeTrade;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeNotifyTimeHoldBlackBall(final long lastTimeNotifyTimeHoldBlackBall) {
        this.lastTimeNotifyTimeHoldBlackBall = lastTimeNotifyTimeHoldBlackBall;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeHoldBlackBall(final long lastTimeHoldBlackBall) {
        this.lastTimeHoldBlackBall = lastTimeHoldBlackBall;
    }

    @java.lang.SuppressWarnings("all")
    public void setTempIdBlackBallHold(final int tempIdBlackBallHold) {
        this.tempIdBlackBallHold = tempIdBlackBallHold;
    }

    @java.lang.SuppressWarnings("all")
    public void setHoldBlackBall(final boolean holdBlackBall) {
        this.holdBlackBall = holdBlackBall;
    }

    @java.lang.SuppressWarnings("all")
    public void setTempIdNamecBallHold(final int tempIdNamecBallHold) {
        this.tempIdNamecBallHold = tempIdNamecBallHold;
    }

    @java.lang.SuppressWarnings("all")
    public void setHoldNamecBall(final boolean holdNamecBall) {
        this.holdNamecBall = holdNamecBall;
    }

    @java.lang.SuppressWarnings("all")
    public void setLoadedAllDataPlayer(final boolean loadedAllDataPlayer) {
        this.loadedAllDataPlayer = loadedAllDataPlayer;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeChangeFlag(final long lastTimeChangeFlag) {
        this.lastTimeChangeFlag = lastTimeChangeFlag;
    }

    @java.lang.SuppressWarnings("all")
    public void setTypeDatXD(final int typeDatXD) {
        this.typeDatXD = typeDatXD;
    }

    @java.lang.SuppressWarnings("all")
    public void setSlDatXD(final int slDatXD) {
        this.slDatXD = slDatXD;
    }

    @java.lang.SuppressWarnings("all")
    public void setNpcXD(final Npc npcXD) {
        this.npcXD = npcXD;
    }

    @java.lang.SuppressWarnings("all")
    public void setTypeDatTX(final int typeDatTX) {
        this.typeDatTX = typeDatTX;
    }

    @java.lang.SuppressWarnings("all")
    public void setNpcTX(final Npc npcTX) {
        this.npcTX = npcTX;
    }

    @java.lang.SuppressWarnings("all")
    public void setTypeDatBC(final int typeDatBC) {
        this.typeDatBC = typeDatBC;
    }

    @java.lang.SuppressWarnings("all")
    public void setNpcBC(final Npc npcBC) {
        this.npcBC = npcBC;
    }

    @java.lang.SuppressWarnings("all")
    public void setGotoFuture(final boolean gotoFuture) {
        this.gotoFuture = gotoFuture;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeGoToFuture(final long lastTimeGoToFuture) {
        this.lastTimeGoToFuture = lastTimeGoToFuture;
    }

    @java.lang.SuppressWarnings("all")
    public void setZoneKhiGasHuyDiet(final Zone zoneKhiGasHuyDiet) {
        this.zoneKhiGasHuyDiet = zoneKhiGasHuyDiet;
    }

    @java.lang.SuppressWarnings("all")
    public void setXMapKhiGasHuyDiet(final int xMapKhiGasHuyDiet) {
        this.xMapKhiGasHuyDiet = xMapKhiGasHuyDiet;
    }

    @java.lang.SuppressWarnings("all")
    public void setYMapKhiGasHuyDiet(final int yMapKhiGasHuyDiet) {
        this.yMapKhiGasHuyDiet = yMapKhiGasHuyDiet;
    }

    @java.lang.SuppressWarnings("all")
    public void setGoToKGHD(final boolean goToKGHD) {
        this.goToKGHD = goToKGHD;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeGoToKGHD(final long lastTimeGoToKGHD) {
        this.lastTimeGoToKGHD = lastTimeGoToKGHD;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeChangeZone(final long lastTimeChangeZone) {
        this.lastTimeChangeZone = lastTimeChangeZone;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeChatGlobal(final long lastTimeChatGlobal) {
        this.lastTimeChatGlobal = lastTimeChatGlobal;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeChatPrivate(final long lastTimeChatPrivate) {
        this.lastTimeChatPrivate = lastTimeChatPrivate;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimePickItem(final long lastTimePickItem) {
        this.lastTimePickItem = lastTimePickItem;
    }

    @java.lang.SuppressWarnings("all")
    public void setGoToBDKB(final boolean goToBDKB) {
        this.goToBDKB = goToBDKB;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeGoToBDKB(final long lastTimeGoToBDKB) {
        this.lastTimeGoToBDKB = lastTimeGoToBDKB;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeAnXienTrapBDKB(final long lastTimeAnXienTrapBDKB) {
        this.lastTimeAnXienTrapBDKB = lastTimeAnXienTrapBDKB;
    }

    @java.lang.SuppressWarnings("all")
    public void setShenronType(final int shenronType) {
        this.shenronType = shenronType;
    }

    @java.lang.SuppressWarnings("all")
    public void setNpcChose(final Npc npcChose) {
        this.npcChose = npcChose;
    }

    @java.lang.SuppressWarnings("all")
    public void setLoaiThe(final byte loaiThe) {
        this.loaiThe = loaiThe;
    }

    @java.lang.SuppressWarnings("all")
    public void setAcpTrade(final boolean acpTrade) {
        this.acpTrade = acpTrade;
    }

    @java.lang.SuppressWarnings("all")
    public void setGemCSMM(final boolean isGemCSMM) {
        this.isGemCSMM = isGemCSMM;
    }

    @java.lang.SuppressWarnings("all")
    public void setDamePST(final int damePST) {
        this.damePST = damePST;
    }

    @java.lang.SuppressWarnings("all")
    public void setMoneyKeoBuaBao(final int moneyKeoBuaBao) {
        this.moneyKeoBuaBao = moneyKeoBuaBao;
    }

    @java.lang.SuppressWarnings("all")
    public void setTimePlayKeoBuaBao(final long timePlayKeoBuaBao) {
        this.timePlayKeoBuaBao = timePlayKeoBuaBao;
    }

    @java.lang.SuppressWarnings("all")
    public void setKeoBuaBaoPlayer(final byte keoBuaBaoPlayer) {
        this.keoBuaBaoPlayer = keoBuaBaoPlayer;
    }

    @java.lang.SuppressWarnings("all")
    public void setKeoBuaBaoServer(final byte keoBuaBaoServer) {
        this.keoBuaBaoServer = keoBuaBaoServer;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeRevenge(final long lastTimeRevenge) {
        this.lastTimeRevenge = lastTimeRevenge;
    }

    @java.lang.SuppressWarnings("all")
    public void setMenuType(final int menuType) {
        this.menuType = menuType;
    }

    @java.lang.SuppressWarnings("all")
    public void setTangHoaType(final int tangHoaType) {
        this.tangHoaType = tangHoaType;
    }

    @java.lang.SuppressWarnings("all")
    public void setTransactionWP(final boolean transactionWP) {
        this.transactionWP = transactionWP;
    }

    @java.lang.SuppressWarnings("all")
    public void setTransactionWVP(final boolean transactionWVP) {
        this.transactionWVP = transactionWVP;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeCombine(final long lastTimeCombine) {
        this.lastTimeCombine = lastTimeCombine;
    }

    @java.lang.SuppressWarnings("all")
    public void setTempId(final long tempId) {
        this.tempId = tempId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof IDMark)) return false;
        final IDMark other = (IDMark) o;
        if (!other.canEqual((java.lang.Object) this)) return false;
        if (this.getIdItemUpTop() != other.getIdItemUpTop()) return false;
        if (this.getTypeChangeMap() != other.getTypeChangeMap()) return false;
        if (this.getIndexMenu() != other.getIndexMenu()) return false;
        if (this.getTypeInput() != other.getTypeInput()) return false;
        if (this.getTypeLuckyRound() != other.getTypeLuckyRound()) return false;
        if (this.getIdPlayThachDau() != other.getIdPlayThachDau()) return false;
        if (this.getGoldThachDau() != other.getGoldThachDau()) return false;
        if (this.getKillCharId() != other.getKillCharId()) return false;
        if (this.getIdEnemy() != other.getIdEnemy()) return false;
        if (this.getIdSpaceShip() != other.getIdSpaceShip()) return false;
        if (this.getMbv() != other.getMbv()) return false;
        if (this.getRecaptcha() != other.getRecaptcha()) return false;
        if (this.getLastTimeBan() != other.getLastTimeBan()) return false;
        if (this.isBan() != other.isBan()) return false;
        if (this.getOtt() != other.getOtt()) return false;
        if (this.getPlayerTradeId() != other.getPlayerTradeId()) return false;
        if (this.getLastTimeTrade() != other.getLastTimeTrade()) return false;
        if (this.getLastTimeNotifyTimeHoldBlackBall() != other.getLastTimeNotifyTimeHoldBlackBall()) return false;
        if (this.getLastTimeHoldBlackBall() != other.getLastTimeHoldBlackBall()) return false;
        if (this.getTempIdBlackBallHold() != other.getTempIdBlackBallHold()) return false;
        if (this.isHoldBlackBall() != other.isHoldBlackBall()) return false;
        if (this.getTempIdNamecBallHold() != other.getTempIdNamecBallHold()) return false;
        if (this.isHoldNamecBall() != other.isHoldNamecBall()) return false;
        if (this.isLoadedAllDataPlayer() != other.isLoadedAllDataPlayer()) return false;
        if (this.getLastTimeChangeFlag() != other.getLastTimeChangeFlag()) return false;
        if (this.getTypeDatXD() != other.getTypeDatXD()) return false;
        if (this.getSlDatXD() != other.getSlDatXD()) return false;
        if (this.getTypeDatTX() != other.getTypeDatTX()) return false;
        if (this.getTypeDatBC() != other.getTypeDatBC()) return false;
        if (this.isGotoFuture() != other.isGotoFuture()) return false;
        if (this.getLastTimeGoToFuture() != other.getLastTimeGoToFuture()) return false;
        if (this.getXMapKhiGasHuyDiet() != other.getXMapKhiGasHuyDiet()) return false;
        if (this.getYMapKhiGasHuyDiet() != other.getYMapKhiGasHuyDiet()) return false;
        if (this.isGoToKGHD() != other.isGoToKGHD()) return false;
        if (this.getLastTimeGoToKGHD() != other.getLastTimeGoToKGHD()) return false;
        if (this.getLastTimeChangeZone() != other.getLastTimeChangeZone()) return false;
        if (this.getLastTimeChatGlobal() != other.getLastTimeChatGlobal()) return false;
        if (this.getLastTimeChatPrivate() != other.getLastTimeChatPrivate()) return false;
        if (this.getLastTimePickItem() != other.getLastTimePickItem()) return false;
        if (this.isGoToBDKB() != other.isGoToBDKB()) return false;
        if (this.getLastTimeGoToBDKB() != other.getLastTimeGoToBDKB()) return false;
        if (this.getLastTimeAnXienTrapBDKB() != other.getLastTimeAnXienTrapBDKB()) return false;
        if (this.getShenronType() != other.getShenronType()) return false;
        if (this.getLoaiThe() != other.getLoaiThe()) return false;
        if (this.isAcpTrade() != other.isAcpTrade()) return false;
        if (this.isGemCSMM() != other.isGemCSMM()) return false;
        if (this.getDamePST() != other.getDamePST()) return false;
        if (this.getMoneyKeoBuaBao() != other.getMoneyKeoBuaBao()) return false;
        if (this.getTimePlayKeoBuaBao() != other.getTimePlayKeoBuaBao()) return false;
        if (this.getKeoBuaBaoPlayer() != other.getKeoBuaBaoPlayer()) return false;
        if (this.getKeoBuaBaoServer() != other.getKeoBuaBaoServer()) return false;
        if (this.getLastTimeRevenge() != other.getLastTimeRevenge()) return false;
        if (this.getMenuType() != other.getMenuType()) return false;
        if (this.getTangHoaType() != other.getTangHoaType()) return false;
        if (this.isTransactionWP() != other.isTransactionWP()) return false;
        if (this.isTransactionWVP() != other.isTransactionWVP()) return false;
        if (this.getLastTimeCombine() != other.getLastTimeCombine()) return false;
        if (this.getTempId() != other.getTempId()) return false;
        final java.lang.Object this$shopOpen = this.getShopOpen();
        final java.lang.Object other$shopOpen = other.getShopOpen();
        if (this$shopOpen == null ? other$shopOpen != null : !this$shopOpen.equals(other$shopOpen)) return false;
        final java.lang.Object this$tagNameShop = this.getTagNameShop();
        final java.lang.Object other$tagNameShop = other.getTagNameShop();
        if (this$tagNameShop == null ? other$tagNameShop != null : !this$tagNameShop.equals(other$tagNameShop)) return false;
        final java.lang.Object this$captcha = this.getCaptcha();
        final java.lang.Object other$captcha = other.getCaptcha();
        if (this$captcha == null ? other$captcha != null : !this$captcha.equals(other$captcha)) return false;
        final java.lang.Object this$playerTrade = this.getPlayerTrade();
        final java.lang.Object other$playerTrade = other.getPlayerTrade();
        if (this$playerTrade == null ? other$playerTrade != null : !this$playerTrade.equals(other$playerTrade)) return false;
        final java.lang.Object this$npcXD = this.getNpcXD();
        final java.lang.Object other$npcXD = other.getNpcXD();
        if (this$npcXD == null ? other$npcXD != null : !this$npcXD.equals(other$npcXD)) return false;
        final java.lang.Object this$npcTX = this.getNpcTX();
        final java.lang.Object other$npcTX = other.getNpcTX();
        if (this$npcTX == null ? other$npcTX != null : !this$npcTX.equals(other$npcTX)) return false;
        final java.lang.Object this$npcBC = this.getNpcBC();
        final java.lang.Object other$npcBC = other.getNpcBC();
        if (this$npcBC == null ? other$npcBC != null : !this$npcBC.equals(other$npcBC)) return false;
        final java.lang.Object this$zoneKhiGasHuyDiet = this.getZoneKhiGasHuyDiet();
        final java.lang.Object other$zoneKhiGasHuyDiet = other.getZoneKhiGasHuyDiet();
        if (this$zoneKhiGasHuyDiet == null ? other$zoneKhiGasHuyDiet != null : !this$zoneKhiGasHuyDiet.equals(other$zoneKhiGasHuyDiet)) return false;
        final java.lang.Object this$npcChose = this.getNpcChose();
        final java.lang.Object other$npcChose = other.getNpcChose();
        if (this$npcChose == null ? other$npcChose != null : !this$npcChose.equals(other$npcChose)) return false;
        return true;
    }

    @java.lang.SuppressWarnings("all")
    protected boolean canEqual(final java.lang.Object other) {
        return other instanceof IDMark;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public int hashCode() {
        final int PRIME = 59;
        int result = 1;
        result = result * PRIME + this.getIdItemUpTop();
        result = result * PRIME + this.getTypeChangeMap();
        result = result * PRIME + this.getIndexMenu();
        result = result * PRIME + this.getTypeInput();
        result = result * PRIME + this.getTypeLuckyRound();
        final long $idPlayThachDau = this.getIdPlayThachDau();
        result = result * PRIME + (int) ($idPlayThachDau >>> 32 ^ $idPlayThachDau);
        result = result * PRIME + this.getGoldThachDau();
        final long $killCharId = this.getKillCharId();
        result = result * PRIME + (int) ($killCharId >>> 32 ^ $killCharId);
        final long $idEnemy = this.getIdEnemy();
        result = result * PRIME + (int) ($idEnemy >>> 32 ^ $idEnemy);
        result = result * PRIME + this.getIdSpaceShip();
        result = result * PRIME + this.getMbv();
        final long $recaptcha = this.getRecaptcha();
        result = result * PRIME + (int) ($recaptcha >>> 32 ^ $recaptcha);
        final long $lastTimeBan = this.getLastTimeBan();
        result = result * PRIME + (int) ($lastTimeBan >>> 32 ^ $lastTimeBan);
        result = result * PRIME + (this.isBan() ? 79 : 97);
        result = result * PRIME + this.getOtt();
        result = result * PRIME + this.getPlayerTradeId();
        final long $lastTimeTrade = this.getLastTimeTrade();
        result = result * PRIME + (int) ($lastTimeTrade >>> 32 ^ $lastTimeTrade);
        final long $lastTimeNotifyTimeHoldBlackBall = this.getLastTimeNotifyTimeHoldBlackBall();
        result = result * PRIME + (int) ($lastTimeNotifyTimeHoldBlackBall >>> 32 ^ $lastTimeNotifyTimeHoldBlackBall);
        final long $lastTimeHoldBlackBall = this.getLastTimeHoldBlackBall();
        result = result * PRIME + (int) ($lastTimeHoldBlackBall >>> 32 ^ $lastTimeHoldBlackBall);
        result = result * PRIME + this.getTempIdBlackBallHold();
        result = result * PRIME + (this.isHoldBlackBall() ? 79 : 97);
        result = result * PRIME + this.getTempIdNamecBallHold();
        result = result * PRIME + (this.isHoldNamecBall() ? 79 : 97);
        result = result * PRIME + (this.isLoadedAllDataPlayer() ? 79 : 97);
        final long $lastTimeChangeFlag = this.getLastTimeChangeFlag();
        result = result * PRIME + (int) ($lastTimeChangeFlag >>> 32 ^ $lastTimeChangeFlag);
        result = result * PRIME + this.getTypeDatXD();
        result = result * PRIME + this.getSlDatXD();
        result = result * PRIME + this.getTypeDatTX();
        result = result * PRIME + this.getTypeDatBC();
        result = result * PRIME + (this.isGotoFuture() ? 79 : 97);
        final long $lastTimeGoToFuture = this.getLastTimeGoToFuture();
        result = result * PRIME + (int) ($lastTimeGoToFuture >>> 32 ^ $lastTimeGoToFuture);
        result = result * PRIME + this.getXMapKhiGasHuyDiet();
        result = result * PRIME + this.getYMapKhiGasHuyDiet();
        result = result * PRIME + (this.isGoToKGHD() ? 79 : 97);
        final long $lastTimeGoToKGHD = this.getLastTimeGoToKGHD();
        result = result * PRIME + (int) ($lastTimeGoToKGHD >>> 32 ^ $lastTimeGoToKGHD);
        final long $lastTimeChangeZone = this.getLastTimeChangeZone();
        result = result * PRIME + (int) ($lastTimeChangeZone >>> 32 ^ $lastTimeChangeZone);
        final long $lastTimeChatGlobal = this.getLastTimeChatGlobal();
        result = result * PRIME + (int) ($lastTimeChatGlobal >>> 32 ^ $lastTimeChatGlobal);
        final long $lastTimeChatPrivate = this.getLastTimeChatPrivate();
        result = result * PRIME + (int) ($lastTimeChatPrivate >>> 32 ^ $lastTimeChatPrivate);
        final long $lastTimePickItem = this.getLastTimePickItem();
        result = result * PRIME + (int) ($lastTimePickItem >>> 32 ^ $lastTimePickItem);
        result = result * PRIME + (this.isGoToBDKB() ? 79 : 97);
        final long $lastTimeGoToBDKB = this.getLastTimeGoToBDKB();
        result = result * PRIME + (int) ($lastTimeGoToBDKB >>> 32 ^ $lastTimeGoToBDKB);
        final long $lastTimeAnXienTrapBDKB = this.getLastTimeAnXienTrapBDKB();
        result = result * PRIME + (int) ($lastTimeAnXienTrapBDKB >>> 32 ^ $lastTimeAnXienTrapBDKB);
        result = result * PRIME + this.getShenronType();
        result = result * PRIME + this.getLoaiThe();
        result = result * PRIME + (this.isAcpTrade() ? 79 : 97);
        result = result * PRIME + (this.isGemCSMM() ? 79 : 97);
        result = result * PRIME + this.getDamePST();
        result = result * PRIME + this.getMoneyKeoBuaBao();
        final long $timePlayKeoBuaBao = this.getTimePlayKeoBuaBao();
        result = result * PRIME + (int) ($timePlayKeoBuaBao >>> 32 ^ $timePlayKeoBuaBao);
        result = result * PRIME + this.getKeoBuaBaoPlayer();
        result = result * PRIME + this.getKeoBuaBaoServer();
        final long $lastTimeRevenge = this.getLastTimeRevenge();
        result = result * PRIME + (int) ($lastTimeRevenge >>> 32 ^ $lastTimeRevenge);
        result = result * PRIME + this.getMenuType();
        result = result * PRIME + this.getTangHoaType();
        result = result * PRIME + (this.isTransactionWP() ? 79 : 97);
        result = result * PRIME + (this.isTransactionWVP() ? 79 : 97);
        final long $lastTimeCombine = this.getLastTimeCombine();
        result = result * PRIME + (int) ($lastTimeCombine >>> 32 ^ $lastTimeCombine);
        final long $tempId = this.getTempId();
        result = result * PRIME + (int) ($tempId >>> 32 ^ $tempId);
        final java.lang.Object $shopOpen = this.getShopOpen();
        result = result * PRIME + ($shopOpen == null ? 43 : $shopOpen.hashCode());
        final java.lang.Object $tagNameShop = this.getTagNameShop();
        result = result * PRIME + ($tagNameShop == null ? 43 : $tagNameShop.hashCode());
        final java.lang.Object $captcha = this.getCaptcha();
        result = result * PRIME + ($captcha == null ? 43 : $captcha.hashCode());
        final java.lang.Object $playerTrade = this.getPlayerTrade();
        result = result * PRIME + ($playerTrade == null ? 43 : $playerTrade.hashCode());
        final java.lang.Object $npcXD = this.getNpcXD();
        result = result * PRIME + ($npcXD == null ? 43 : $npcXD.hashCode());
        final java.lang.Object $npcTX = this.getNpcTX();
        result = result * PRIME + ($npcTX == null ? 43 : $npcTX.hashCode());
        final java.lang.Object $npcBC = this.getNpcBC();
        result = result * PRIME + ($npcBC == null ? 43 : $npcBC.hashCode());
        final java.lang.Object $zoneKhiGasHuyDiet = this.getZoneKhiGasHuyDiet();
        result = result * PRIME + ($zoneKhiGasHuyDiet == null ? 43 : $zoneKhiGasHuyDiet.hashCode());
        final java.lang.Object $npcChose = this.getNpcChose();
        result = result * PRIME + ($npcChose == null ? 43 : $npcChose.hashCode());
        return result;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public java.lang.String toString() {
        return "IDMark(idItemUpTop=" + this.getIdItemUpTop() + ", typeChangeMap=" + this.getTypeChangeMap() + ", indexMenu=" + this.getIndexMenu() + ", typeInput=" + this.getTypeInput() + ", typeLuckyRound=" + this.getTypeLuckyRound() + ", idPlayThachDau=" + this.getIdPlayThachDau() + ", goldThachDau=" + this.getGoldThachDau() + ", killCharId=" + this.getKillCharId() + ", idEnemy=" + this.getIdEnemy() + ", shopOpen=" + this.getShopOpen() + ", tagNameShop=" + this.getTagNameShop() + ", idSpaceShip=" + this.getIdSpaceShip() + ", mbv=" + this.getMbv() + ", captcha=" + this.getCaptcha() + ", recaptcha=" + this.getRecaptcha() + ", lastTimeBan=" + this.getLastTimeBan() + ", isBan=" + this.isBan() + ", ott=" + this.getOtt() + ", playerTradeId=" + this.getPlayerTradeId() + ", playerTrade=" + this.getPlayerTrade() + ", lastTimeTrade=" + this.getLastTimeTrade() + ", lastTimeNotifyTimeHoldBlackBall=" + this.getLastTimeNotifyTimeHoldBlackBall() + ", lastTimeHoldBlackBall=" + this.getLastTimeHoldBlackBall() + ", tempIdBlackBallHold=" + this.getTempIdBlackBallHold() + ", holdBlackBall=" + this.isHoldBlackBall() + ", tempIdNamecBallHold=" + this.getTempIdNamecBallHold() + ", holdNamecBall=" + this.isHoldNamecBall() + ", loadedAllDataPlayer=" + this.isLoadedAllDataPlayer() + ", lastTimeChangeFlag=" + this.getLastTimeChangeFlag() + ", typeDatXD=" + this.getTypeDatXD() + ", slDatXD=" + this.getSlDatXD() + ", npcXD=" + this.getNpcXD() + ", typeDatTX=" + this.getTypeDatTX() + ", npcTX=" + this.getNpcTX() + ", typeDatBC=" + this.getTypeDatBC() + ", npcBC=" + this.getNpcBC() + ", gotoFuture=" + this.isGotoFuture() + ", lastTimeGoToFuture=" + this.getLastTimeGoToFuture() + ", zoneKhiGasHuyDiet=" + this.getZoneKhiGasHuyDiet() + ", xMapKhiGasHuyDiet=" + this.getXMapKhiGasHuyDiet() + ", yMapKhiGasHuyDiet=" + this.getYMapKhiGasHuyDiet() + ", goToKGHD=" + this.isGoToKGHD() + ", lastTimeGoToKGHD=" + this.getLastTimeGoToKGHD() + ", lastTimeChangeZone=" + this.getLastTimeChangeZone() + ", lastTimeChatGlobal=" + this.getLastTimeChatGlobal() + ", lastTimeChatPrivate=" + this.getLastTimeChatPrivate() + ", lastTimePickItem=" + this.getLastTimePickItem() + ", goToBDKB=" + this.isGoToBDKB() + ", lastTimeGoToBDKB=" + this.getLastTimeGoToBDKB() + ", lastTimeAnXienTrapBDKB=" + this.getLastTimeAnXienTrapBDKB() + ", shenronType=" + this.getShenronType() + ", npcChose=" + this.getNpcChose() + ", loaiThe=" + this.getLoaiThe() + ", acpTrade=" + this.isAcpTrade() + ", isGemCSMM=" + this.isGemCSMM() + ", damePST=" + this.getDamePST() + ", moneyKeoBuaBao=" + this.getMoneyKeoBuaBao() + ", timePlayKeoBuaBao=" + this.getTimePlayKeoBuaBao() + ", keoBuaBaoPlayer=" + this.getKeoBuaBaoPlayer() + ", keoBuaBaoServer=" + this.getKeoBuaBaoServer() + ", lastTimeRevenge=" + this.getLastTimeRevenge() + ", menuType=" + this.getMenuType() + ", tangHoaType=" + this.getTangHoaType() + ", transactionWP=" + this.isTransactionWP() + ", transactionWVP=" + this.isTransactionWVP() + ", lastTimeCombine=" + this.getLastTimeCombine() + ", tempId=" + this.getTempId() + ")";
    }
}
