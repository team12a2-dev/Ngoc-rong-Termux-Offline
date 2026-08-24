package nro.models.services_dungeon;

import nro.models.map.phoban.RedRibbonHQ;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;

import java.util.ArrayList;
import java.util.List;
import nro.models.utils.Util;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class RedRibbonHQService {

    private static RedRibbonHQService instance;

    public static RedRibbonHQService gI() {
        if (RedRibbonHQService.instance == null) {
            RedRibbonHQService.instance = new RedRibbonHQService();
        }
        return RedRibbonHQService.instance;
    }

    public List<RedRibbonHQ> doanhTrais;

    private RedRibbonHQService() {
        this.doanhTrais = new ArrayList<>();
        for (int i = 0; i < RedRibbonHQ.AVAILABLE; i++) {
            this.doanhTrais.add(new RedRibbonHQ(i));
        }
    }

    public void addMapDoanhTrai(int id, Zone zone) {
        this.doanhTrais.get(id).getZones().add(zone);
    }

  public void joinDoanhTrai(Player pl) {
    if (pl.clan == null) {
        Service.gI().sendThongBao(pl, "Bạn chưa có bang hội");
        return;
    }

    if (pl.clanMember.getNumDateFromJoinTimeToToday() < 0) {
        Service.gI().sendThongBao(pl, "Gia nhập bang sau 24h mới vào được");
        return;
    }

    // Doanh trại đã mở → cho vào luôn
if (pl.clan.doanhTrai != null && pl.clan.doanhTrai.isOpened) {

    if (MapService.gI().isMapDoanhTrai(pl.zone.map.mapId)) {
        return;
    }

    pl.lastTimeJoinDT = System.currentTimeMillis();

    // 🔥 UPDATE LẠI HP + DAME MOB & BOSS
    if (!pl.clan.doanhTrai.isTimePicking) {
        pl.clan.doanhTrai.updateHPDame();
    }

    ChangeMapService.gI().changeMapInYard(pl, 53, -1, 60);
    return;
}

    // Check giới hạn ngày
    if (pl.clan.haveGoneDoanhTrai && !Util.isAfterMidnight(pl.clan.lastTimeOpenDoanhTrai)) {
        Service.gI().sendThongBao(pl, "Bang đã đi doanh trại hôm nay");
        return;
    }

    // Tìm doanh trại trống
    RedRibbonHQ doanhTrai = null;
    for (RedRibbonHQ dt : this.doanhTrais) {
        if (dt.getClan() == null) {
            doanhTrai = dt;
            break;
        }
    }

    if (doanhTrai == null) {
        Service.gI().sendThongBao(pl, "Doanh trại đang quá tải, vui lòng quay lại sau 5 phút");
        return;
    }

    doanhTrai.openDoanhTrai(pl);
}
}
