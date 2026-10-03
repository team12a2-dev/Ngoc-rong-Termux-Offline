package nro.models.item;

import java.util.ArrayList;
import java.util.List;
import nro.models.player.NPoint;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.utils.Util;
import nro.models.services.ItemTimeService;
import nro.models.map.service.MapService;
import nro.models.map.service.ChangeMapService;
import nro.models.consts.ConstItem;
import nro.models.services.InventoryService;

public class ItemTime {

    public static final byte DOANH_TRAI = 0;
    public static final byte BAN_DO_KHO_BAU = 1;
    public static final byte CON_DUONG_RAN_DOC = 2;
    public static final byte KHI_GAS_HUY_DIET = 3;
    public static final byte TIME_KEO_BUA_BAO = 4;
    public static final byte TEXT_NHAN_BUA_MIEN_PHI = 5;

    public static final int TIME_ITEM = 600000;
    public static final int TIME_OPEN_POWER = 8640000;
    public static final int TIME_MAY_DO = 1800000;
    public static final int TIME_MAY_DO2 = 1800000;
    public static final long TIME_CO_BON_LA = 30 * 60 * 1000L;
    public static final long TIME_KHAU_TRANG = 30 * 60 * 1000L;
    public static final int TIME_KILIS = 3600000;
    public static final int TIME_NUOC_MIA1 = 600_000;
    public static final int TIME_NUOC_MIA2 = 600_000;
    public static final int TIME_NUOC_MIA3 = 600_000;
    public static final long TIME_PHIEU_SAO_VANG = 1440L * 60 * 1000L;

    public static final int TIME_BUA_SANTA = 1800000;
    public static final int TIME_EAT_MEAL = 600000;
    public static final int TIME_CMS = 3600000;
    public static final int TIME_DK = 1800000;
    public static final int TIME_NCD = 1800000;

    private Player player;

    public boolean isUsePhieuSaoVang;
    public long remainingPhieuSaoVangTime;
    public long lastTimeUpdatePhieuSaoVang;
    public int iconPhieuSaoVang = 1959;

    public boolean isUseBoHuyet;
    public boolean isUseBoKhi;
    public boolean isUseGiapXen;
    public boolean isUseCuongNo;
    public boolean isUseAnDanh;
    public boolean isUseBoHuyet2;
    public boolean isUseBoKhi2;
    public boolean isUseGiapXen2;
    public boolean isUseCuongNo2;
    public boolean isUseAnDanh2;

    /** Option chỉ số của item type 29 đang có hiệu lực. */
    public boolean isUseUsableItem;
    public long lastTimeUseUsableItem;
    public long timeLengthUsableItem;
    public int usableItemIcon;
    public int usableItemTemplateId = -1;
    public final List<Item.ItemOption> usableItemOptions = new ArrayList<>();

    public long lastTimeBoHuyet;
    public long lastTimeBoKhi;
    public long lastTimeGiapXen;
    public long lastTimeCuongNo;
    public long lastTimeAnDanh;

    public long lastTimeBoHuyet2;
    public long lastTimeBoKhi2;
    public long lastTimeGiapXen2;
    public long lastTimeCuongNo2;
    public long lastTimeAnDanh2;

    public boolean isUseMayDo;
    public long lastTimeUseMayDo;
    public boolean isUseKhoBauX2;
    public long lastTimeUseKhoBauX2;
    public boolean isUseBuaSanta;
    public long lastTimeBuaSanta;

    public long lastTimeUseCoBonLa;
    public boolean isUseCoBonLa;

    public boolean isUseKilis;
    public long lastTimeUseKilis;

    public boolean isUseNuocMia1;
    public long lastTimeUseNuocMia1;
    public boolean isUseNuocMia2;
    public long lastTimeUseNuocMia2;
    public boolean isUseNuocMia3;
    public long lastTimeUseNuocMia3;

    public boolean isOpenPower;
    public long lastTimeOpenPower;

    public boolean isUseTDLT;
    public long lastTimeUseTDLT;
    public int timeTDLT;

    public boolean isUseRX;
    public long lastTimeUseRX;
    public int timeRX;

    public boolean isUseCMS;
    public long lastTimeUseCMS;

    public boolean isUseNCD;
    public long lastTimeUseNCD;

    public boolean isUseGTPT;
    public long lastTimeUseGTPT;

    public boolean isUseDK;
    public long lastTimeUseDK;

    public boolean isEatMeal;
    public long lastTimeEatMeal;
    public int iconMeal;

    public boolean isEatMeal2;
    public long lastTimeEatMeal2;
    public int iconMeal2;
    public long lastTimeKhauTrang;
    public boolean isUseKhauTrang;
    public long timeLengthKilis;
    public long totalCoBonLaTime;
    public long timeLengthCoBonLa;

    public ItemTime(Player player) {
        this.player = player;
    }

    public void update() {
        if (isEatMeal) {
            if (Util.canDoWithTime(lastTimeEatMeal, TIME_EAT_MEAL)) {
                isEatMeal = false;
                Service.gI().point(player);
            }
        }
        if (isEatMeal2) {
            if (Util.canDoWithTime(lastTimeEatMeal2, TIME_EAT_MEAL)) {
                isEatMeal2 = false;
                Service.gI().point(player);
            }
        }
        if (isUseBoHuyet) {
            if (Util.canDoWithTime(lastTimeBoHuyet, TIME_ITEM)) {
                isUseBoHuyet = false;
                Service.gI().point(player);
            }
        }

        if (isUseBoKhi) {
            if (Util.canDoWithTime(lastTimeBoKhi, TIME_ITEM)) {
                isUseBoKhi = false;
                Service.gI().point(player);
            }
        }

        if (isUseGiapXen) {
            if (Util.canDoWithTime(lastTimeGiapXen, TIME_ITEM)) {
                isUseGiapXen = false;
            }
        }
        if (isUseCuongNo) {
            if (Util.canDoWithTime(lastTimeCuongNo, TIME_ITEM)) {
                isUseCuongNo = false;
                Service.gI().point(player);
            }
        }
        if (isUseAnDanh) {
            if (Util.canDoWithTime(lastTimeAnDanh, TIME_ITEM)) {
                isUseAnDanh = false;
            }
        }

        if (isUseBoHuyet2) {
            if (Util.canDoWithTime(lastTimeBoHuyet2, TIME_ITEM)) {
                isUseBoHuyet2 = false;
                Service.gI().point(player);
            }
        }

        if (isUseBoKhi2) {
            if (Util.canDoWithTime(lastTimeBoKhi2, TIME_ITEM)) {
                isUseBoKhi2 = false;
                Service.gI().point(player);
            }
        }
        if (isUseGiapXen2) {
            if (Util.canDoWithTime(lastTimeGiapXen2, TIME_ITEM)) {
                isUseGiapXen2 = false;
            }
        }
        if (isUseCuongNo2) {
            if (Util.canDoWithTime(lastTimeCuongNo2, TIME_ITEM)) {
                isUseCuongNo2 = false;
                Service.gI().point(player);
            }
        }
        if (isUseAnDanh2) {
            if (Util.canDoWithTime(lastTimeAnDanh2, TIME_ITEM)) {
                isUseAnDanh2 = false;
            }
        }
        if (isUseUsableItem) {
            long remaining = (lastTimeUseUsableItem + timeLengthUsableItem) - System.currentTimeMillis();
            if (timeLengthUsableItem <= 0 || remaining <= 0) {
                int icon = usableItemIcon;
                isUseUsableItem = false;
                timeLengthUsableItem = 0;
                usableItemTemplateId = -1;
                usableItemOptions.clear();
                if (icon > 0) {
                    ItemTimeService.gI().removeItemTime(player, icon);
                }
                Service.gI().point(player);
            }
        }
        if (isUseCMS) {
            if (Util.canDoWithTime(lastTimeUseCMS, TIME_CMS)) {
                isUseCMS = false;
            }
        }
        if (isUseGTPT) {
            if (Util.canDoWithTime(lastTimeUseGTPT, TIME_ITEM)) {
                isUseGTPT = false;
            }
        }
        if (isUseDK) {
            if (Util.canDoWithTime(lastTimeUseDK, TIME_DK)) {
                isUseDK = false;
            }
        }
        if (isOpenPower) {
            if (Util.canDoWithTime(lastTimeOpenPower, TIME_OPEN_POWER)) {
                player.nPoint.limitPower++;
                if (player.nPoint.limitPower > NPoint.MAX_LIMIT) {
                    player.nPoint.limitPower = NPoint.MAX_LIMIT;
                }
                Service.gI().sendThongBao(player, "Giới hạn sức mạnh của bạn đã được tăng lên 1 bậc");
                isOpenPower = false;
            }
        }
        if (isUseMayDo) {
            if (Util.canDoWithTime(lastTimeUseMayDo, TIME_MAY_DO)) {
                isUseMayDo = false;
            }
        }
        if (isUseCoBonLa) {
            if (Util.canDoWithTime(lastTimeUseCoBonLa, TIME_CO_BON_LA)) {
                isUseCoBonLa = false;
            }
        }
        if (isUseKhauTrang) {
            if (Util.canDoWithTime(lastTimeKhauTrang, TIME_KHAU_TRANG)) {
                isUseKhauTrang = false;
            }
        }
        if (isUseKilis) {
            if (Util.canDoWithTime(lastTimeUseKilis, TIME_KILIS)) {
                isUseKilis = false;
            }
        }
        if (isUseNuocMia1) {
            if (Util.canDoWithTime(lastTimeUseNuocMia1, TIME_NUOC_MIA1)) {
                isUseNuocMia1 = false;
                Service.gI().point(player);
            }
        }
        if (isUseNuocMia2) {
            if (Util.canDoWithTime(lastTimeUseNuocMia1, TIME_NUOC_MIA2)) {
                isUseNuocMia2 = false;
                Service.gI().point(player);
            }
        }
        if (isUseNuocMia3) {
            if (Util.canDoWithTime(lastTimeUseNuocMia1, TIME_NUOC_MIA3)) {
                isUseNuocMia3 = false;
                Service.gI().point(player);
            }
        }
        if (isUseBuaSanta) {
            if (Util.canDoWithTime(lastTimeBuaSanta, TIME_BUA_SANTA)) {
                isUseBuaSanta = false;
            }
        }
        if (isUseKhoBauX2) {
            if (Util.canDoWithTime(lastTimeUseKhoBauX2, TIME_MAY_DO2)) {
                isUseKhoBauX2 = false;
            }
        }
        if (isUseTDLT) {
            if (Util.canDoWithTime(lastTimeUseTDLT, timeTDLT)) {
                this.isUseTDLT = false;
                ItemTimeService.gI().sendCanAutoPlay(this.player);
            }
        }
        if (isUseRX) {
            if (Util.canDoWithTime(lastTimeUseRX, timeRX)) {
                isUseRX = false;
            }
        }
        if (isUsePhieuSaoVang) {
            Item itemPhieu = InventoryService.gI().findItemBag(player, ConstItem.PHIEU_SAO_VANG_MAY_MAN);
            if (itemPhieu == null) {
                itemPhieu = InventoryService.gI().findItemBag(player, 1959);
            }
            if (itemPhieu == null) {
                isUsePhieuSaoVang = false;
                remainingPhieuSaoVangTime = 0;
                lastTimeUpdatePhieuSaoVang = 0;
                if (iconPhieuSaoVang > 0) {
                    ItemTimeService.gI().removeItemTime(player, iconPhieuSaoVang);
                }
                Service.gI().sendThongBao(player, "Hiệu lực Phiếu sao vàng may mắn đã kết thúc do không còn vật phẩm trong hành trang!");
                if (player != null && player.zone != null && player.zone.map != null && MapService.gI().isMapUpVang(player.zone.map.mapId)) {
                    ChangeMapService.gI().changeMapBySpaceShip(player, player.gender + 21, -1, 400);
                }
            } else {
                boolean inMapUpVang = (player != null && player.zone != null && player.zone.map != null
                        && MapService.gI().isMapUpVang(player.zone.map.mapId));
                if (inMapUpVang) {
                    long now = System.currentTimeMillis();
                    if (lastTimeUpdatePhieuSaoVang > 0) {
                        long elapsed = now - lastTimeUpdatePhieuSaoVang;
                        remainingPhieuSaoVangTime -= elapsed;
                    }
                    lastTimeUpdatePhieuSaoVang = now;

                    if (remainingPhieuSaoVangTime > 0) {
                        int remainingMinutes = (int) ((remainingPhieuSaoVangTime + 59999) / 60000);
                        Item.ItemOption opt = itemPhieu.getOptionById(1);
                        if (opt == null) {
                            opt = itemPhieu.getOptionById(9);
                        }
                        if (opt != null && opt.param != remainingMinutes) {
                            opt.param = Math.max(0, remainingMinutes);
                            InventoryService.gI().sendItemBags(player);
                        }
                    }

                    if (remainingPhieuSaoVangTime <= 0) {
                        remainingPhieuSaoVangTime = 0;
                        isUsePhieuSaoVang = false;
                        lastTimeUpdatePhieuSaoVang = 0;
                        if (iconPhieuSaoVang > 0) {
                            ItemTimeService.gI().removeItemTime(player, iconPhieuSaoVang);
                        }
                        InventoryService.gI().subQuantityItemsBag(player, itemPhieu, 1);
                        InventoryService.gI().sendItemBags(player);
                        Service.gI().sendThongBao(player, "Phiếu sao vàng may mắn đã hết hạn và biến mất!");
                        Service.gI().sendThongBao(player, "Hết thời gian hiệu lực Phiếu sao vàng may mắn, bạn đã được đưa về làng!");
                        ChangeMapService.gI().changeMapBySpaceShip(player, player.gender + 21, -1, 400);
                    }
                } else {
                    lastTimeUpdatePhieuSaoVang = 0;
                }
            }
        }
        if (player != null && player.zone != null && player.zone.map != null && MapService.gI().isMapUpVang(player.zone.map.mapId)) {
            if (!player.isAdmin() && (!isUsePhieuSaoVang || getPhieuSaoVangTimeLeft() <= 0)) {
                Service.gI().sendThongBao(player, "Hết thời gian hiệu lực Phiếu sao vàng may mắn, bạn đã được đưa về làng!");
                ChangeMapService.gI().changeMapBySpaceShip(player, player.gender + 21, -1, 400);
            }
        }
    }

    public long getPhieuSaoVangTimeLeft() {
        if (!isUsePhieuSaoVang) {
            return 0;
        }
        return Math.max(0, remainingPhieuSaoVangTime);
    }

    public void dispose() {
        this.usableItemOptions.clear();
        this.player = null;
    }
}
