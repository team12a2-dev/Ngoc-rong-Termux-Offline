package nro.models.event;

import nro.models.event_list.TopUp;
import nro.models.event_list.TrungThu;
import nro.models.event_list.HungVuong;
import nro.models.event_list.Christmas;
import nro.models.event_list.Halloween;
import nro.models.event_list.LunarNewYear;
import nro.models.event_list.Default;
import nro.models.event_list.InternationalWomensDay;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.BossManager;

public class EventManager {

    private static EventManager instance;

    public static boolean LUNNAR_NEW_YEAR = true;

    public static boolean INTERNATIONAL_WOMANS_DAY = true;

    public static boolean CHRISTMAS = true;

    public static boolean HALLOWEEN = true;

    public static boolean HUNG_VUONG = true;

    public static boolean TRUNG_THU = true;

    public static boolean TOP_UP = true;

    public static EventManager gI() {
        if (instance == null) {
            instance = new EventManager();
        }
        return instance;
    }

    public void init() {
        DynamicEventManager.gI().init();
        new Default().init();
        if (LUNNAR_NEW_YEAR) {
           // new LunarNewYear().init();
        }
        if (INTERNATIONAL_WOMANS_DAY) {
           // new InternationalWomensDay().init();
        }
        if (HALLOWEEN) {
          //  new Halloween().init();
        }
        if (CHRISTMAS) {
          //  new Christmas().init();
        }
        if (HUNG_VUONG && isHungVuongRuntimeEnabled()) {
            new HungVuong().init();
        }
        if (TRUNG_THU) {
           // new TrungThu().init();
        }
        if (TOP_UP) {
            new TopUp().init();
        }
    }

    public java.util.Map<String, Object> reloadDynamicEvents() {
        Map<String, Object> result = new LinkedHashMap<>(DynamicEventManager.gI().reload());
        if (!isHungVuongRuntimeEnabled()) {
            int removed = 0;
            for (Boss boss : new ArrayList<>(BossManager.gI().getBosses())) {
                if (boss != null && boss.id == BossID.THUY_TINH) {
                    boss.dispose();
                    BossManager.gI().removeBoss(boss);
                    removed++;
                }
            }
            result.put("hungVuongBossRemoved", removed);
        }
        return result;
    }

    /**
     * Legacy Hùng Vương/Nồi bánh NPCs were historically controlled by a static
     * flag. Once the SQL catalog contains either modern alias, SQL becomes the
     * source of truth for whether those interactions remain available.
     */
    public boolean isHungVuongRuntimeEnabled() {
        return DynamicEventManager.gI().isConfiguredAndActive("pho-anh-hai", "hung-vuong-legacy");
    }
}
