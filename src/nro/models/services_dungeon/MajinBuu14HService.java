package nro.models.services_dungeon;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.Boss;
import nro.models.consts.ConstItem;
import nro.models.item.Item;
import nro.models.map.phoban.MajinBuu14H;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.map.MaBuHold;
import nro.models.player.Player;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.TimeUtil;
import nro.models.utils.Util;

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

    /** Tỷ lệ rơi đồ Thần Linh khi một boss 14h bị hạ. */
    private static final int TL_DROP_CHANCE = 5;
    /** Trong số đồ Thần Linh rơi, tỷ lệ có lỗ sao pha lê (option 107). */
    private static final int TL_STAR_CHANCE = 3;
    private static final int TL_STAR_MAX_HOLES = 3;

    /**
     * Phần thưởng chung cho toàn bộ boss 14h: đồ Thần Linh (randDoTLBoss đã gắn
     * ký gửi ngọc/vàng theo tỷ lệ riêng) và quả trứng Bư. Chỉ người hạ boss nhặt được.
     */
    public void rewardEventBoss(Boss boss, Player plKill) {
        if (boss == null || plKill == null || boss.zone == null) {
            return;
        }
        int x = boss.location.x;
        int y = boss.zone.map.yPhysicInTop(x, boss.location.y - 24);

        if (Util.isTrue(TL_DROP_CHANCE, 100)) {
            ItemMap it = ItemService.gI().randDoTLBoss(boss.zone, 1, x, y, plKill.id);
            if (it != null) {
                if (Util.isTrue(TL_STAR_CHANCE, 100)) {
                    it.options.add(new Item.ItemOption(107, Util.nextInt(1, TL_STAR_MAX_HOLES)));
                }
                Service.gI().dropItemMap(boss.zone, it);
            }
        }

        ItemMap egg = new ItemMap(boss.zone, ConstItem.QUA_TRUNG, 1, x + 20, y, plKill.id);
        Service.gI().dropItemMap(boss.zone, egg);
    }
}
