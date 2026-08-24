package nro.models.player;

import nro.models.services_dungeon.MajinBuuService;
import nro.models.map.service.MapService;
import nro.models.services.Service;
import nro.models.utils.Util;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class FightMabu {

    public final byte POINT_MAX = 10;

    public int pointMabu = 0;
    public int pointPercent = 0;
    private Player player;

    public FightMabu(Player player) {
        this.player = player;
    }

    /** Điểm map 12h luôn cộng cho chủ nhân (không phải đệ tử). */
    public static Player resolveOwner(Player actor) {
        if (actor == null) {
            return null;
        }
        if (actor.isPet && actor instanceof Pet pet && pet.master != null && !pet.master.isDie()) {
            return pet.master;
        }
        return actor.isPl() ? actor : null;
    }

    public void changePoint(byte pointAdd) {
        changePoint(pointAdd, null);
    }

    public void changePoint(byte pointAdd, String defeatedBoss) {
        Player owner = resolveOwner(this.player);
        if (owner == null || owner.zone == null || owner.fightMabu == null) {
            return;
        }
        if (!MapService.gI().isMapMaBu(owner.zone.map.mapId)) {
            return;
        }
        FightMabu fm = owner.fightMabu;
        fm.pointMabu += pointAdd;
        fm.pointPercent = 0;
        Service.gI().SendPowerInfo(owner);
        if (fm.pointMabu >= fm.POINT_MAX && owner.zone.map.mapId != 120) {
            MajinBuuService.gI().osinEscortToNextFloor(owner, defeatedBoss);
        }
    }

    public void changePercentPoint(byte pointAdd) {
        Player owner = resolveOwner(this.player);
        if (owner == null || owner.zone == null || owner.fightMabu == null) {
            return;
        }
        if (!MapService.gI().isMapMaBu(owner.zone.map.mapId)) {
            return;
        }
        FightMabu fm = owner.fightMabu;
        fm.pointPercent += pointAdd;
        if (fm.pointPercent > 100) {
            fm.pointPercent /= Util.nextInt(2, 5);
        }
        Service.gI().SendPercentPowerInfo(owner);
    }

    public void clear() {
        this.pointMabu = 0;
    }
}
