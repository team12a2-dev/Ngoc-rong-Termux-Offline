package nro.models.boss.dynamic;

import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.AppearType;
import nro.models.services.BossPanelConfigService;
import nro.models.utils.Logger;

/**
 * DynamicBoss: Thực thể Boss tùy biến được tạo trực tiếp từ Item Cải Trang hoặc cấu hình Web Panel.
 * Tự động đồng bộ ngoại hình (Head, Body, Leg, Aura, FlagBag), chỉ số (HP, Dame), kỹ năng, và bảng rớt đồ.
 */
public class DynamicBoss extends Boss {

    private final int dynamicBossId;

    public DynamicBoss(int bossId, BossData bossData) throws Exception {
        super(bossId, bossData);
        this.dynamicBossId = bossId;
    }

    public static DynamicBoss create(int bossId, Object rule) {
        if (rule == null) {
            return null;
        }
        return null;
    }



    public int getDynamicBossId() {
        return this.dynamicBossId;
    }
}
