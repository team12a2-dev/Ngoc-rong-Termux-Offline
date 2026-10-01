package nro.models.services_dungeon;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.Boss;
import nro.models.map.phoban.MajinBuu14H;
import nro.models.map.Zone;
import nro.models.map.MaBuHold;
import nro.models.player.Player;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.services.Service;
import nro.models.utils.TimeUtil;

/**
 * Service for the 14h Mabu dungeon instances.
 */
public class MajinBuu14HService {

    private static MajinBuu14HService instance;

    public static MajinBuu14HService gI() {
        if (instance == null) {
            instance = new MajinBuu14HService();
        }
        return instance;
    }

    public final List<MajinBuu14H> maBu2Hs;

    private MajinBuu14HService() {
        this.maBu2Hs = new ArrayList<>();
        for (int i = 0; i < MajinBuu14H.AVAILABLE; i++) {
            this.maBu2Hs.add(new MajinBuu14H(i));
        }
    }

    public void addMapMaBu2H(int id, Zone zone) {
        if (zone == null || id < 0 || id >= this.maBu2Hs.size()) {
            return;
        }
        if (zone.map.mapId == 128) {
            for (int slot = 0; slot < 4; slot++) {
                zone.maBuHolds.add(new MaBuHold(slot, null));
            }
        }
        this.maBu2Hs.get(id).getZones().add(zone);
    }

    public void registerEventBoss(Zone zone, Boss boss) {
        if (zone == null || boss == null || !MapService.gI().isMapMabu2H(zone.map.mapId)) {
            return;
        }
        int instanceId = zone.zoneId;
        if (instanceId < 0 || instanceId >= this.maBu2Hs.size()) {
            return;
        }
        this.maBu2Hs.get(instanceId).registerBoss(boss);
    }

    /**
     * Enters an available map-127 zone only while the 14h event is open.
     * The five-player cap is intentionally enforced here rather than by the NPC menu alone.
     */
    public boolean joinMaBu2H(Player player) {
        if (player == null || !player.isPl()) {
            return false;
        }
        if (!TimeUtil.isMabu14HOpen()) {
            Service.gI().sendThongBao(player, "Sự kiện Mabư 14h hiện không mở. Thời gian tham gia: 14:00–15:00.");
            return false;
        }
        if (player.zone != null && MapService.gI().isMapMabu2H(player.zone.map.mapId)) {
            return true;
        }
        for (MajinBuu14H instance : this.maBu2Hs) {
            Zone entrance = instance.getMapById(127);
            if (entrance != null && entrance.getNumOfPlayers() < 5) {
                ChangeMapService.gI().changeMap(player, entrance, -1, 312);
                return true;
            }
        }
        Service.gI().sendThongBao(player, "Các khu vực Mabư 14h hiện đã đầy. Vui lòng thử lại sau.");
        return false;
    }
}
