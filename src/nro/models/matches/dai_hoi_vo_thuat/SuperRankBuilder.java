package nro.models.matches.dai_hoi_vo_thuat;

public class SuperRankBuilder {
    private long id;
    private int rank;
    private long lastPKTime;
    private long lastTimeReward;
    private int ticket;
    private int win;
    private int lose;
    private String info;
    private int head;
    private int body;
    private int leg;
    private String name;

    public void dispose() {
        name = null;
        info = null;
    }

    @java.lang.SuppressWarnings("all")
    public long getId() {
        return this.id;
    }

    @java.lang.SuppressWarnings("all")
    public int getRank() {
        return this.rank;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastPKTime() {
        return this.lastPKTime;
    }

    @java.lang.SuppressWarnings("all")
    public long getLastTimeReward() {
        return this.lastTimeReward;
    }

    @java.lang.SuppressWarnings("all")
    public int getTicket() {
        return this.ticket;
    }

    @java.lang.SuppressWarnings("all")
    public int getWin() {
        return this.win;
    }

    @java.lang.SuppressWarnings("all")
    public int getLose() {
        return this.lose;
    }

    @java.lang.SuppressWarnings("all")
    public String getInfo() {
        return this.info;
    }

    @java.lang.SuppressWarnings("all")
    public int getHead() {
        return this.head;
    }

    @java.lang.SuppressWarnings("all")
    public int getBody() {
        return this.body;
    }

    @java.lang.SuppressWarnings("all")
    public int getLeg() {
        return this.leg;
    }

    @java.lang.SuppressWarnings("all")
    public String getName() {
        return this.name;
    }

    @java.lang.SuppressWarnings("all")
    public void setId(final long id) {
        this.id = id;
    }

    @java.lang.SuppressWarnings("all")
    public void setRank(final int rank) {
        this.rank = rank;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastPKTime(final long lastPKTime) {
        this.lastPKTime = lastPKTime;
    }

    @java.lang.SuppressWarnings("all")
    public void setLastTimeReward(final long lastTimeReward) {
        this.lastTimeReward = lastTimeReward;
    }

    @java.lang.SuppressWarnings("all")
    public void setTicket(final int ticket) {
        this.ticket = ticket;
    }

    @java.lang.SuppressWarnings("all")
    public void setWin(final int win) {
        this.win = win;
    }

    @java.lang.SuppressWarnings("all")
    public void setLose(final int lose) {
        this.lose = lose;
    }

    @java.lang.SuppressWarnings("all")
    public void setInfo(final String info) {
        this.info = info;
    }

    @java.lang.SuppressWarnings("all")
    public void setHead(final int head) {
        this.head = head;
    }

    @java.lang.SuppressWarnings("all")
    public void setBody(final int body) {
        this.body = body;
    }

    @java.lang.SuppressWarnings("all")
    public void setLeg(final int leg) {
        this.leg = leg;
    }

    @java.lang.SuppressWarnings("all")
    public void setName(final String name) {
        this.name = name;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public boolean equals(final java.lang.Object o) {
        if (o == this) return true;
        if (!(o instanceof SuperRankBuilder)) return false;
        final SuperRankBuilder other = (SuperRankBuilder) o;
        if (!other.canEqual((java.lang.Object) this)) return false;
        if (this.getId() != other.getId()) return false;
        if (this.getRank() != other.getRank()) return false;
        if (this.getLastPKTime() != other.getLastPKTime()) return false;
        if (this.getLastTimeReward() != other.getLastTimeReward()) return false;
        if (this.getTicket() != other.getTicket()) return false;
        if (this.getWin() != other.getWin()) return false;
        if (this.getLose() != other.getLose()) return false;
        if (this.getHead() != other.getHead()) return false;
        if (this.getBody() != other.getBody()) return false;
        if (this.getLeg() != other.getLeg()) return false;
        final java.lang.Object this$info = this.getInfo();
        final java.lang.Object other$info = other.getInfo();
        if (this$info == null ? other$info != null : !this$info.equals(other$info)) return false;
        final java.lang.Object this$name = this.getName();
        final java.lang.Object other$name = other.getName();
        if (this$name == null ? other$name != null : !this$name.equals(other$name)) return false;
        return true;
    }

    @java.lang.SuppressWarnings("all")
    protected boolean canEqual(final java.lang.Object other) {
        return other instanceof SuperRankBuilder;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public int hashCode() {
        final int PRIME = 59;
        int result = 1;
        final long $id = this.getId();
        result = result * PRIME + (int) ($id >>> 32 ^ $id);
        result = result * PRIME + this.getRank();
        final long $lastPKTime = this.getLastPKTime();
        result = result * PRIME + (int) ($lastPKTime >>> 32 ^ $lastPKTime);
        final long $lastTimeReward = this.getLastTimeReward();
        result = result * PRIME + (int) ($lastTimeReward >>> 32 ^ $lastTimeReward);
        result = result * PRIME + this.getTicket();
        result = result * PRIME + this.getWin();
        result = result * PRIME + this.getLose();
        result = result * PRIME + this.getHead();
        result = result * PRIME + this.getBody();
        result = result * PRIME + this.getLeg();
        final java.lang.Object $info = this.getInfo();
        result = result * PRIME + ($info == null ? 43 : $info.hashCode());
        final java.lang.Object $name = this.getName();
        result = result * PRIME + ($name == null ? 43 : $name.hashCode());
        return result;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("all")
    public java.lang.String toString() {
        return "SuperRankBuilder(id=" + this.getId() + ", rank=" + this.getRank() + ", lastPKTime=" + this.getLastPKTime() + ", lastTimeReward=" + this.getLastTimeReward() + ", ticket=" + this.getTicket() + ", win=" + this.getWin() + ", lose=" + this.getLose() + ", info=" + this.getInfo() + ", head=" + this.getHead() + ", body=" + this.getBody() + ", leg=" + this.getLeg() + ", name=" + this.getName() + ")";
    }

    @java.lang.SuppressWarnings("all")
    public SuperRankBuilder() {
    }
}
