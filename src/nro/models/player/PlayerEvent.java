package nro.models.player;

import nro.models.player.Player;

/**
 * @author By AmodsubVN
 */
public class PlayerEvent {
    private int eventPoint;
    private Player player;
    public int luotNhanNgocMienPhi = 1;
    public int luotNhanCapsuleBang = 1;

    public PlayerEvent(Player player) {
        this.player = player;
    }

    public void addEventPoint(int num) {
        eventPoint += num;
    }

    public void subEventPoint(int num) {
        eventPoint -= num;
    }

    public void update() {
    }

    @java.lang.SuppressWarnings("all")
    public void setEventPoint(final int eventPoint) {
        this.eventPoint = eventPoint;
    }

    @java.lang.SuppressWarnings("all")
    public void setPlayer(final Player player) {
        this.player = player;
    }

    @java.lang.SuppressWarnings("all")
    public void setLuotNhanNgocMienPhi(final int luotNhanNgocMienPhi) {
        this.luotNhanNgocMienPhi = luotNhanNgocMienPhi;
    }

    @java.lang.SuppressWarnings("all")
    public void setLuotNhanCapsuleBang(final int luotNhanCapsuleBang) {
        this.luotNhanCapsuleBang = luotNhanCapsuleBang;
    }

    @java.lang.SuppressWarnings("all")
    public int getEventPoint() {
        return this.eventPoint;
    }

    @java.lang.SuppressWarnings("all")
    public Player getPlayer() {
        return this.player;
    }

    @java.lang.SuppressWarnings("all")
    public int getLuotNhanNgocMienPhi() {
        return this.luotNhanNgocMienPhi;
    }

    @java.lang.SuppressWarnings("all")
    public int getLuotNhanCapsuleBang() {
        return this.luotNhanCapsuleBang;
    }
}
