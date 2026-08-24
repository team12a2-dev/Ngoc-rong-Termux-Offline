package nro.models.matches;

import nro.models.player.Player;

public class TOP {
    private String name;
    private byte gender;
    private short head;
    private short body;
    private short leg;
    private long power;
    private long ki;
    private long hp;
    private long sd;
    private byte nv;
    private byte subnv;
    private int sk;
    private int pvp;
    private int nhs;
    private int dicanh;
    private int divdst;
    private int juventus;
    private long lasttime;
    private long time;
    private int level;
    private int cash;
    private int thoivang;
    private int id_player;
    private String info1;
    private String info2;
    private long paramCompare;

    public void setId_player(int id_player) {
        this.id_player = id_player;
    }

    @java.lang.SuppressWarnings("all")
    TOP(final String name, final byte gender, final short head, final short body, final short leg, final long power, final long ki, final long hp, final long sd, final byte nv, final byte subnv, final int sk, final int pvp, final int nhs, final int dicanh, final int divdst, final int juventus, final long lasttime, final long time, final int level, final int cash, final int thoivang, final int id_player, final String info1, final String info2, final long paramCompare) {
        this.name = name;
        this.gender = gender;
        this.head = head;
        this.body = body;
        this.leg = leg;
        this.power = power;
        this.ki = ki;
        this.hp = hp;
        this.sd = sd;
        this.nv = nv;
        this.subnv = subnv;
        this.sk = sk;
        this.pvp = pvp;
        this.nhs = nhs;
        this.dicanh = dicanh;
        this.divdst = divdst;
        this.juventus = juventus;
        this.lasttime = lasttime;
        this.time = time;
        this.level = level;
        this.cash = cash;
        this.thoivang = thoivang;
        this.id_player = id_player;
        this.info1 = info1;
        this.info2 = info2;
        this.paramCompare = paramCompare;
    }


    @java.lang.SuppressWarnings("all")
    public static class TOPBuilder {
        @java.lang.SuppressWarnings("all")
        private String name;
        @java.lang.SuppressWarnings("all")
        private byte gender;
        @java.lang.SuppressWarnings("all")
        private short head;
        @java.lang.SuppressWarnings("all")
        private short body;
        @java.lang.SuppressWarnings("all")
        private short leg;
        @java.lang.SuppressWarnings("all")
        private long power;
        @java.lang.SuppressWarnings("all")
        private long ki;
        @java.lang.SuppressWarnings("all")
        private long hp;
        @java.lang.SuppressWarnings("all")
        private long sd;
        @java.lang.SuppressWarnings("all")
        private byte nv;
        @java.lang.SuppressWarnings("all")
        private byte subnv;
        @java.lang.SuppressWarnings("all")
        private int sk;
        @java.lang.SuppressWarnings("all")
        private int pvp;
        @java.lang.SuppressWarnings("all")
        private int nhs;
        @java.lang.SuppressWarnings("all")
        private int dicanh;
        @java.lang.SuppressWarnings("all")
        private int divdst;
        @java.lang.SuppressWarnings("all")
        private int juventus;
        @java.lang.SuppressWarnings("all")
        private long lasttime;
        @java.lang.SuppressWarnings("all")
        private long time;
        @java.lang.SuppressWarnings("all")
        private int level;
        @java.lang.SuppressWarnings("all")
        private int cash;
        @java.lang.SuppressWarnings("all")
        private int thoivang;
        @java.lang.SuppressWarnings("all")
        private int id_player;
        @java.lang.SuppressWarnings("all")
        private String info1;
        @java.lang.SuppressWarnings("all")
        private String info2;
        @java.lang.SuppressWarnings("all")
        private long paramCompare;

        @java.lang.SuppressWarnings("all")
        TOPBuilder() {
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder name(final String name) {
            this.name = name;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder gender(final byte gender) {
            this.gender = gender;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder head(final short head) {
            this.head = head;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder body(final short body) {
            this.body = body;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder leg(final short leg) {
            this.leg = leg;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder power(final long power) {
            this.power = power;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder ki(final long ki) {
            this.ki = ki;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder hp(final long hp) {
            this.hp = hp;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder sd(final long sd) {
            this.sd = sd;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder nv(final byte nv) {
            this.nv = nv;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder subnv(final byte subnv) {
            this.subnv = subnv;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder sk(final int sk) {
            this.sk = sk;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder pvp(final int pvp) {
            this.pvp = pvp;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder nhs(final int nhs) {
            this.nhs = nhs;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder dicanh(final int dicanh) {
            this.dicanh = dicanh;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder divdst(final int divdst) {
            this.divdst = divdst;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder juventus(final int juventus) {
            this.juventus = juventus;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder lasttime(final long lasttime) {
            this.lasttime = lasttime;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder time(final long time) {
            this.time = time;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder level(final int level) {
            this.level = level;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder cash(final int cash) {
            this.cash = cash;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder thoivang(final int thoivang) {
            this.thoivang = thoivang;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder id_player(final int id_player) {
            this.id_player = id_player;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder info1(final String info1) {
            this.info1 = info1;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder info2(final String info2) {
            this.info2 = info2;
            return this;
        }

        /**
         * @return {@code this}.
         */
        @java.lang.SuppressWarnings("all")
        public TOP.TOPBuilder paramCompare(final long paramCompare) {
            this.paramCompare = paramCompare;
            return this;
        }

        @java.lang.SuppressWarnings("all")
        public TOP build() {
            return new TOP(this.name, this.gender, this.head, this.body, this.leg, this.power, this.ki, this.hp, this.sd, this.nv, this.subnv, this.sk, this.pvp, this.nhs, this.dicanh, this.divdst, this.juventus, this.lasttime, this.time, this.level, this.cash, this.thoivang, this.id_player, this.info1, this.info2, this.paramCompare);
        }

        @java.lang.Override
        @java.lang.SuppressWarnings("all")
        public java.lang.String toString() {
            return "TOP.TOPBuilder(name=" + this.name + ", gender=" + this.gender + ", head=" + this.head + ", body=" + this.body + ", leg=" + this.leg + ", power=" + this.power + ", ki=" + this.ki + ", hp=" + this.hp + ", sd=" + this.sd + ", nv=" + this.nv + ", subnv=" + this.subnv + ", sk=" + this.sk + ", pvp=" + this.pvp + ", nhs=" + this.nhs + ", dicanh=" + this.dicanh + ", divdst=" + this.divdst + ", juventus=" + this.juventus + ", lasttime=" + this.lasttime + ", time=" + this.time + ", level=" + this.level + ", cash=" + this.cash + ", thoivang=" + this.thoivang + ", id_player=" + this.id_player + ", info1=" + this.info1 + ", info2=" + this.info2 + ", paramCompare=" + this.paramCompare + ")";
        }
    }

    @java.lang.SuppressWarnings("all")
    public static TOP.TOPBuilder builder() {
        return new TOP.TOPBuilder();
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
    public short getHead() {
        return this.head;
    }

    @java.lang.SuppressWarnings("all")
    public short getBody() {
        return this.body;
    }

    @java.lang.SuppressWarnings("all")
    public short getLeg() {
        return this.leg;
    }

    @java.lang.SuppressWarnings("all")
    public long getPower() {
        return this.power;
    }

    @java.lang.SuppressWarnings("all")
    public long getKi() {
        return this.ki;
    }

    @java.lang.SuppressWarnings("all")
    public long getHp() {
        return this.hp;
    }

    @java.lang.SuppressWarnings("all")
    public long getSd() {
        return this.sd;
    }

    @java.lang.SuppressWarnings("all")
    public byte getNv() {
        return this.nv;
    }

    @java.lang.SuppressWarnings("all")
    public byte getSubnv() {
        return this.subnv;
    }

    @java.lang.SuppressWarnings("all")
    public int getSk() {
        return this.sk;
    }

    @java.lang.SuppressWarnings("all")
    public int getPvp() {
        return this.pvp;
    }

    @java.lang.SuppressWarnings("all")
    public int getNhs() {
        return this.nhs;
    }

    @java.lang.SuppressWarnings("all")
    public int getDicanh() {
        return this.dicanh;
    }

    @java.lang.SuppressWarnings("all")
    public int getDivdst() {
        return this.divdst;
    }

    @java.lang.SuppressWarnings("all")
    public int getJuventus() {
        return this.juventus;
    }

    @java.lang.SuppressWarnings("all")
    public long getLasttime() {
        return this.lasttime;
    }

    @java.lang.SuppressWarnings("all")
    public long getTime() {
        return this.time;
    }

    @java.lang.SuppressWarnings("all")
    public int getLevel() {
        return this.level;
    }

    @java.lang.SuppressWarnings("all")
    public int getCash() {
        return this.cash;
    }

    @java.lang.SuppressWarnings("all")
    public int getThoivang() {
        return this.thoivang;
    }

    @java.lang.SuppressWarnings("all")
    public int getId_player() {
        return this.id_player;
    }

    @java.lang.SuppressWarnings("all")
    public String getInfo1() {
        return this.info1;
    }

    @java.lang.SuppressWarnings("all")
    public String getInfo2() {
        return this.info2;
    }

    @java.lang.SuppressWarnings("all")
    public long getParamCompare() {
        return this.paramCompare;
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
    public void setHead(final short head) {
        this.head = head;
    }

    @java.lang.SuppressWarnings("all")
    public void setBody(final short body) {
        this.body = body;
    }

    @java.lang.SuppressWarnings("all")
    public void setLeg(final short leg) {
        this.leg = leg;
    }

    @java.lang.SuppressWarnings("all")
    public void setPower(final long power) {
        this.power = power;
    }

    @java.lang.SuppressWarnings("all")
    public void setKi(final long ki) {
        this.ki = ki;
    }

    @java.lang.SuppressWarnings("all")
    public void setHp(final long hp) {
        this.hp = hp;
    }

    @java.lang.SuppressWarnings("all")
    public void setSd(final long sd) {
        this.sd = sd;
    }

    @java.lang.SuppressWarnings("all")
    public void setNv(final byte nv) {
        this.nv = nv;
    }

    @java.lang.SuppressWarnings("all")
    public void setSubnv(final byte subnv) {
        this.subnv = subnv;
    }

    @java.lang.SuppressWarnings("all")
    public void setSk(final int sk) {
        this.sk = sk;
    }

    @java.lang.SuppressWarnings("all")
    public void setPvp(final int pvp) {
        this.pvp = pvp;
    }

    @java.lang.SuppressWarnings("all")
    public void setNhs(final int nhs) {
        this.nhs = nhs;
    }

    @java.lang.SuppressWarnings("all")
    public void setDicanh(final int dicanh) {
        this.dicanh = dicanh;
    }

    @java.lang.SuppressWarnings("all")
    public void setDivdst(final int divdst) {
        this.divdst = divdst;
    }

    @java.lang.SuppressWarnings("all")
    public void setJuventus(final int juventus) {
        this.juventus = juventus;
    }

    @java.lang.SuppressWarnings("all")
    public void setLasttime(final long lasttime) {
        this.lasttime = lasttime;
    }

    @java.lang.SuppressWarnings("all")
    public void setTime(final long time) {
        this.time = time;
    }

    @java.lang.SuppressWarnings("all")
    public void setLevel(final int level) {
        this.level = level;
    }

    @java.lang.SuppressWarnings("all")
    public void setCash(final int cash) {
        this.cash = cash;
    }

    @java.lang.SuppressWarnings("all")
    public void setThoivang(final int thoivang) {
        this.thoivang = thoivang;
    }

    @java.lang.SuppressWarnings("all")
    public void setInfo1(final String info1) {
        this.info1 = info1;
    }

    @java.lang.SuppressWarnings("all")
    public void setInfo2(final String info2) {
        this.info2 = info2;
    }

    @java.lang.SuppressWarnings("all")
    public void setParamCompare(final long paramCompare) {
        this.paramCompare = paramCompare;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof TOP)) return false;
        final TOP other = (TOP) o;
        if (!other.canEqual((java.lang.Object) this)) return false;
        if (this.getGender() != other.getGender()) return false;
        if (this.getHead() != other.getHead()) return false;
        if (this.getBody() != other.getBody()) return false;
        if (this.getLeg() != other.getLeg()) return false;
        if (this.getPower() != other.getPower()) return false;
        if (this.getKi() != other.getKi()) return false;
        if (this.getHp() != other.getHp()) return false;
        if (this.getSd() != other.getSd()) return false;
        if (this.getNv() != other.getNv()) return false;
        if (this.getSubnv() != other.getSubnv()) return false;
        if (this.getSk() != other.getSk()) return false;
        if (this.getPvp() != other.getPvp()) return false;
        if (this.getNhs() != other.getNhs()) return false;
        if (this.getDicanh() != other.getDicanh()) return false;
        if (this.getDivdst() != other.getDivdst()) return false;
        if (this.getJuventus() != other.getJuventus()) return false;
        if (this.getLasttime() != other.getLasttime()) return false;
        if (this.getTime() != other.getTime()) return false;
        if (this.getLevel() != other.getLevel()) return false;
        if (this.getCash() != other.getCash()) return false;
        if (this.getThoivang() != other.getThoivang()) return false;
        if (this.getId_player() != other.getId_player()) return false;
        if (this.getParamCompare() != other.getParamCompare()) return false;
        final java.lang.Object this$name = this.getName();
        final java.lang.Object other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) return false;
        final java.lang.Object this$info1 = this.getInfo1();
        final java.lang.Object other$info1 = other.getInfo1();
        if (this$info1 == null ? other$info1 != null : !this$info1.equals(other$info1)) return false;
        final java.lang.Object this$info2 = this.getInfo2();
        final java.lang.Object other$info2 = other.getInfo2();
        if (this$info2 == null ? other$info2 != null : !this$info2.equals(other$info2)) return false;
        return true;
    }

    @java.lang.SuppressWarnings("all")
    protected boolean canEqual(final java.lang.Object other) {
        return other instanceof TOP;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public int hashCode() {
        final int PRIME = 59;
        int result = 1;
        result = result * PRIME + this.getGender();
        result = result * PRIME + this.getHead();
        result = result * PRIME + this.getBody();
        result = result * PRIME + this.getLeg();
        final long $power = this.getPower();
        result = result * PRIME + (int) ($power >>> 32 ^ $power);
        final long $ki = this.getKi();
        result = result * PRIME + (int) ($ki >>> 32 ^ $ki);
        final long $hp = this.getHp();
        result = result * PRIME + (int) ($hp >>> 32 ^ $hp);
        final long $sd = this.getSd();
        result = result * PRIME + (int) ($sd >>> 32 ^ $sd);
        result = result * PRIME + this.getNv();
        result = result * PRIME + this.getSubnv();
        result = result * PRIME + this.getSk();
        result = result * PRIME + this.getPvp();
        result = result * PRIME + this.getNhs();
        result = result * PRIME + this.getDicanh();
        result = result * PRIME + this.getDivdst();
        result = result * PRIME + this.getJuventus();
        final long $lasttime = this.getLasttime();
        result = result * PRIME + (int) ($lasttime >>> 32 ^ $lasttime);
        final long $time = this.getTime();
        result = result * PRIME + (int) ($time >>> 32 ^ $time);
        result = result * PRIME + this.getLevel();
        result = result * PRIME + this.getCash();
        result = result * PRIME + this.getThoivang();
        result = result * PRIME + this.getId_player();
        final long $paramCompare = this.getParamCompare();
        result = result * PRIME + (int) ($paramCompare >>> 32 ^ $paramCompare);
        final java.lang.Object $name = this.getName();
        result = result * PRIME + ($name == null ? 43 : $name.hashCode());
        final java.lang.Object $info1 = this.getInfo1();
        result = result * PRIME + ($info1 == null ? 43 : $info1.hashCode());
        final java.lang.Object $info2 = this.getInfo2();
        result = result * PRIME + ($info2 == null ? 43 : $info2.hashCode());
        return result;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public java.lang.String toString() {
        return "TOP(name=" + this.getName() + ", gender=" + this.getGender() + ", head=" + this.getHead() + ", body=" + this.getBody() + ", leg=" + this.getLeg() + ", power=" + this.getPower() + ", ki=" + this.getKi() + ", hp=" + this.getHp() + ", sd=" + this.getSd() + ", nv=" + this.getNv() + ", subnv=" + this.getSubnv() + ", sk=" + this.getSk() + ", pvp=" + this.getPvp() + ", nhs=" + this.getNhs() + ", dicanh=" + this.getDicanh() + ", divdst=" + this.getDivdst() + ", juventus=" + this.getJuventus() + ", lasttime=" + this.getLasttime() + ", time=" + this.getTime() + ", level=" + this.getLevel() + ", cash=" + this.getCash() + ", thoivang=" + this.getThoivang() + ", id_player=" + this.getId_player() + ", info1=" + this.getInfo1() + ", info2=" + this.getInfo2() + ", paramCompare=" + this.getParamCompare() + ")";
    }
}
