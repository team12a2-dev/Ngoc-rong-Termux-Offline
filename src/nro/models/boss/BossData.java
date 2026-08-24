package nro.models.boss;

import nro.models.consts.AppearType;

public class BossData {
    public static final int DEFAULT_APPEAR = 0;
    public static final int APPEAR_WITH_ANOTHER = 1;
    public static final int ANOTHER_LEVEL = 2;
    private String name;
    private byte gender;
    private short[] outfit;
    private int dame;
    private int[] hp;
    private int[] mapJoin;
    private int[][] skillTemp;
    private String[] textS;
    private String[] textM;
    private String[] textE;
    private int secondsRest;
    private AppearType typeAppear;
    private int[] bossesAppearTogether;

    private BossData(String name, byte gender, short[] outfit, int dame, int[] hp, int[] mapJoin, int[][] skillTemp, String[] textS, String[] textM, String[] textE) {
        this.name = name;
        this.gender = gender;
        this.outfit = outfit;
        this.dame = dame;
        this.hp = hp;
        this.mapJoin = mapJoin;
        this.skillTemp = skillTemp;
        this.textS = textS;
        this.textM = textM;
        this.textE = textE;
        this.secondsRest = 0;
        this.typeAppear = AppearType.DEFAULT_APPEAR;
    }

    public BossData(String name, byte gender, short[] outfit, int dame, int[] hp, int[] mapJoin, int[][] skillTemp, String[] textS, String[] textM, String[] textE, int secondsRest) {
        this(name, gender, outfit, dame, hp, mapJoin, skillTemp, textS, textM, textE);
        this.secondsRest = secondsRest;
    }

    public BossData(String name, byte gender, short[] outfit, int dame, int[] hp, int[] mapJoin, int[][] skillTemp, String[] textS, String[] textM, String[] textE, int secondsRest, int[] bossesAppearTogether) {
        this(name, gender, outfit, dame, hp, mapJoin, skillTemp, textS, textM, textE, secondsRest);
        this.bossesAppearTogether = bossesAppearTogether;
    }

    public BossData(String name, byte gender, short[] outfit, int dame, int[] hp, int[] mapJoin, int[][] skillTemp, String[] textS, String[] textM, String[] textE, AppearType typeAppear) {
        this(name, gender, outfit, dame, hp, mapJoin, skillTemp, textS, textM, textE);
        this.typeAppear = typeAppear;
    }

    public BossData(String name, byte gender, short[] outfit, int dame, int[] hp, int[] mapJoin, int[][] skillTemp, String[] textS, String[] textM, String[] textE, int secondsRest, AppearType typeAppear) {
        this(name, gender, outfit, dame, hp, mapJoin, skillTemp, textS, textM, textE, secondsRest);
        this.typeAppear = typeAppear;
    }

    @java.lang.SuppressWarnings("all")
    public String getName() {
        return this.name;
    }

    @java.lang.SuppressWarnings("all")
    public byte getGender() {
        return this.gender;
    }

    @java.lang.SuppressWarnings("all")
    public short[] getOutfit() {
        return this.outfit;
    }

    @java.lang.SuppressWarnings("all")
    public int getDame() {
        return this.dame;
    }

    @java.lang.SuppressWarnings("all")
    public int[] getHp() {
        return this.hp;
    }

    @java.lang.SuppressWarnings("all")
    public int[] getMapJoin() {
        return this.mapJoin;
    }

    @java.lang.SuppressWarnings("all")
    public int[][] getSkillTemp() {
        return this.skillTemp;
    }

    @java.lang.SuppressWarnings("all")
    public String[] getTextS() {
        return this.textS;
    }

    @java.lang.SuppressWarnings("all")
    public String[] getTextM() {
        return this.textM;
    }

    @java.lang.SuppressWarnings("all")
    public String[] getTextE() {
        return this.textE;
    }

    @java.lang.SuppressWarnings("all")
    public int getSecondsRest() {
        return this.secondsRest;
    }

    @java.lang.SuppressWarnings("all")
    public AppearType getTypeAppear() {
        return this.typeAppear;
    }

    @java.lang.SuppressWarnings("all")
    public int[] getBossesAppearTogether() {
        return this.bossesAppearTogether;
    }

    @java.lang.SuppressWarnings("all")
    public void setName(final String name) {
        this.name = name;
    }

    @java.lang.SuppressWarnings("all")
    public void setGender(final byte gender) {
        this.gender = gender;
    }

    @java.lang.SuppressWarnings("all")
    public void setOutfit(final short[] outfit) {
        this.outfit = outfit;
    }

    @java.lang.SuppressWarnings("all")
    public void setDame(final int dame) {
        this.dame = dame;
    }

    @java.lang.SuppressWarnings("all")
    public void setHp(final int[] hp) {
        this.hp = hp;
    }

    @java.lang.SuppressWarnings("all")
    public void setMapJoin(final int[] mapJoin) {
        this.mapJoin = mapJoin;
    }

    @java.lang.SuppressWarnings("all")
    public void setSkillTemp(final int[][] skillTemp) {
        this.skillTemp = skillTemp;
    }

    @java.lang.SuppressWarnings("all")
    public void setTextS(final String[] textS) {
        this.textS = textS;
    }

    @java.lang.SuppressWarnings("all")
    public void setTextM(final String[] textM) {
        this.textM = textM;
    }

    @java.lang.SuppressWarnings("all")
    public void setTextE(final String[] textE) {
        this.textE = textE;
    }

    @java.lang.SuppressWarnings("all")
    public void setSecondsRest(final int secondsRest) {
        this.secondsRest = secondsRest;
    }

    @java.lang.SuppressWarnings("all")
    public void setTypeAppear(final AppearType typeAppear) {
        this.typeAppear = typeAppear;
    }

    @java.lang.SuppressWarnings("all")
    public void setBossesAppearTogether(final int[] bossesAppearTogether) {
        this.bossesAppearTogether = bossesAppearTogether;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof BossData)) return false;
        final BossData other = (BossData) o;
        if (!other.canEqual((java.lang.Object) this)) return false;
        if (this.getGender() != other.getGender()) return false;
        if (this.getDame() != other.getDame()) return false;
        if (this.getSecondsRest() != other.getSecondsRest()) return false;
        final java.lang.Object this$name = this.getName();
        final java.lang.Object other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) return false;
        if (!java.util.Arrays.equals(this.getOutfit(), other.getOutfit())) return false;
        if (!java.util.Arrays.equals(this.getHp(), other.getHp())) return false;
        if (!java.util.Arrays.equals(this.getMapJoin(), other.getMapJoin())) return false;
        if (!java.util.Arrays.deepEquals(this.getSkillTemp(), other.getSkillTemp())) return false;
        if (!java.util.Arrays.deepEquals(this.getTextS(), other.getTextS())) return false;
        if (!java.util.Arrays.deepEquals(this.getTextM(), other.getTextM())) return false;
        if (!java.util.Arrays.deepEquals(this.getTextE(), other.getTextE())) return false;
        final java.lang.Object this$typeAppear = this.getTypeAppear();
        final java.lang.Object other$typeAppear = other.getTypeAppear();
        if (this$typeAppear == null ? other$typeAppear != null : !this$typeAppear.equals(other$typeAppear)) return false;
        if (!java.util.Arrays.equals(this.getBossesAppearTogether(), other.getBossesAppearTogether())) return false;
        return true;
    }

    @java.lang.SuppressWarnings("all")
    protected boolean canEqual(final java.lang.Object other) {
        return other instanceof BossData;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public int hashCode() {
        final int PRIME = 59;
        int result = 1;
        result = result * PRIME + this.getGender();
        result = result * PRIME + this.getDame();
        result = result * PRIME + this.getSecondsRest();
        final java.lang.Object $name = this.getName();
        result = result * PRIME + ($name == null ? 43 : $name.hashCode());
        result = result * PRIME + java.util.Arrays.hashCode(this.getOutfit());
        result = result * PRIME + java.util.Arrays.hashCode(this.getHp());
        result = result * PRIME + java.util.Arrays.hashCode(this.getMapJoin());
        result = result * PRIME + java.util.Arrays.deepHashCode(this.getSkillTemp());
        result = result * PRIME + java.util.Arrays.deepHashCode(this.getTextS());
        result = result * PRIME + java.util.Arrays.deepHashCode(this.getTextM());
        result = result * PRIME + java.util.Arrays.deepHashCode(this.getTextE());
        final java.lang.Object $typeAppear = this.getTypeAppear();
        result = result * PRIME + ($typeAppear == null ? 43 : $typeAppear.hashCode());
        result = result * PRIME + java.util.Arrays.hashCode(this.getBossesAppearTogether());
        return result;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public java.lang.String toString() {
        return "BossData(name=" + this.getName() + ", gender=" + this.getGender() + ", outfit=" + java.util.Arrays.toString(this.getOutfit()) + ", dame=" + this.getDame() + ", hp=" + java.util.Arrays.toString(this.getHp()) + ", mapJoin=" + java.util.Arrays.toString(this.getMapJoin()) + ", skillTemp=" + java.util.Arrays.deepToString(this.getSkillTemp()) + ", textS=" + java.util.Arrays.deepToString(this.getTextS()) + ", textM=" + java.util.Arrays.deepToString(this.getTextM()) + ", textE=" + java.util.Arrays.deepToString(this.getTextE()) + ", secondsRest=" + this.getSecondsRest() + ", typeAppear=" + this.getTypeAppear() + ", bossesAppearTogether=" + java.util.Arrays.toString(this.getBossesAppearTogether()) + ")";
    }
}
