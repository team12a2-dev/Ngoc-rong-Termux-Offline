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
import nro.models.npc.Npc;
import nro.models.server.Manager;

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
        if (!isPhoAnhHaiRuntimeEnabled()) {
            removeNpcTemplates(nro.models.consts.ConstNpc.PHO_ANH_HAI);
        }
        if (!isHungVuongRuntimeEnabled()) {
            removeHungVuongRuntimeEntities();
        }
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
        if (!isPhoAnhHaiRuntimeEnabled()) {
            result.put("phoAnhHaiNpcsRemoved", removeNpcTemplates(nro.models.consts.ConstNpc.PHO_ANH_HAI));
        }
        if (!isHungVuongRuntimeEnabled()) {
            result.put("hungVuongEntitiesRemoved", removeHungVuongRuntimeEntities());
        }
        return result;
    }

    /**
     * Legacy Hùng Vương/Nồi bánh NPCs were historically controlled by a static
     * flag. Once the SQL catalog contains either modern alias, SQL becomes the
     * source of truth for whether those interactions remain available.
     */
    public boolean isPhoAnhHaiRuntimeEnabled() {
        return DynamicEventManager.gI().isConfiguredAndActive("pho-anh-hai");
    }

    public boolean isHungVuongRuntimeEnabled() {
        return DynamicEventManager.gI().isConfiguredAndActive("hung-vuong-legacy");
    }

    private int removeNpcTemplates(int... templateIds) {
        int removed = 0;
        for (nro.models.map.Map map : new ArrayList<>(Manager.MAPS)) {
            for (Npc npc : new ArrayList<>(map.npcs)) {
                if (npc == null) continue;
                for (int templateId : templateIds) {
                    if (npc.tempId == templateId) {
                        map.npcs.remove(npc);
                        Manager.NPCS.remove(npc);
                        removed++;
                        break;
                    }
                }
            }
        }
        return removed;
    }

    private int removeHungVuongRuntimeEntities() {
        int removed = 0;
        for (Boss boss : new ArrayList<>(BossManager.gI().getBosses())) {
            if (boss != null && boss.id == BossID.THUY_TINH) {
                boss.dispose();
                BossManager.gI().removeBoss(boss);
                removed++;
            }
        }
        removed += removeNpcTemplates(nro.models.consts.ConstNpc.HUNG_VUONG, nro.models.consts.ConstNpc.NOI_BANH);
        return removed;
    }
}
