package nro.models.boss.Nappa;

import nro.models.boss.Boss;
import nro.models.consts.ConstItem;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

/**
 * Xử lý phần thưởng rơi khi tiêu diệt bộ ba Boss Nappa (Kuku, Mập Đầu Đinh, Rambo)
 */
public class NappaRewardHelper {

    /**
     * Trao phần thưởng khi hạ gục Boss:
     * 1. Hoàn thành nhiệm vụ diệt boss.
     * 2. Rơi Vàng: 20.000.000 - 50.000.000 vàng hoặc Thỏi vàng.
     * 3. Rơi Ngọc Rồng: Từ 4 sao đến 7 sao.
     * 4. Rơi Cải trang: Cải trang Kuku (288), Cải trang Mập Đầu Đinh (ngẫu nhiên Kuku hoặc Rambo), Cải trang Rambo (289). Có HSD 3-7 ngày, chỉ số ngon không lạm phát.
     */
    public static void dropReward(Boss boss, Player plKill, int defaultCostumeId) {
        if (boss == null || plKill == null || boss.zone == null) {
            return;
        }

        // 1. Kiểm tra hoàn thành nhiệm vụ
        TaskService.gI().checkDoneTaskKillBoss(plKill, boss);

        int baseX = boss.location.x;

        // 2. Rơi hàng dài Vàng: 20.000.000 - 50.000.000 vàng rải rác thành hàng dài
        int totalGold = Util.nextInt(20_000_000, 50_000_000);
        int numDrops = Util.nextInt(12, 16); // Rải từ 12 đến 16 cọc vàng tạo thành hàng dài
        int baseGoldPerDrop = totalGold / numDrops;
        int remainingGold = totalGold;
        int stepX = 22; // Khoảng cách giữa các cọc vàng
        int startX = baseX - ((numDrops - 1) * stepX) / 2;

        for (int i = 0; i < numDrops; i++) {
            int amount = (i == numDrops - 1) ? remainingGold : (baseGoldPerDrop + Util.nextInt(-100_000, 100_000));
            if (amount <= 0) {
                amount = 100_000;
            }
            remainingGold -= amount;

            int dropX = startX + i * stepX + Util.nextInt(-3, 3);
            int dropY = boss.zone.map.yPhysicInTop(dropX, boss.location.y - 24);
            ItemMap dropGold = new ItemMap(boss.zone, ConstItem.VANG_190, amount, dropX, dropY, plKill.id);
            Service.gI().dropItemMap(boss.zone, dropGold);
        }

        // Cơ hội rơi thêm Thỏi vàng (1 - 2 thỏi)
        if (Util.isTrue(50, 100)) {
            int thoiVangAmount = Util.nextInt(1, 2);
            int dropXThoiVang = baseX + Util.nextInt(-20, 20);
            int dropYThoiVang = boss.zone.map.yPhysicInTop(dropXThoiVang, boss.location.y - 24);
            ItemMap dropThoiVang = new ItemMap(boss.zone, ConstItem.THOI_VANG, thoiVangAmount, dropXThoiVang, dropYThoiVang, plKill.id);
            Service.gI().dropItemMap(boss.zone, dropThoiVang);
        }

        // 3. Rơi Ngọc Rồng: ngẫu nhiên từ 4 sao đến 7 sao
        int[] ngocRong = {
            ConstItem.NGOC_RONG_4_SAO,
            ConstItem.NGOC_RONG_5_SAO,
            ConstItem.NGOC_RONG_6_SAO,
            ConstItem.NGOC_RONG_7_SAO
        };
        int nrId = ngocRong[Util.nextInt(0, ngocRong.length - 1)];
        int dropXNR = baseX + Util.nextInt(-35, 35);
        int dropYNR = boss.zone.map.yPhysicInTop(dropXNR, boss.location.y - 24);
        ItemMap dropNR = new ItemMap(boss.zone, nrId, 1, dropXNR, dropYNR, plKill.id);
        Service.gI().dropItemMap(boss.zone, dropNR);

        // 4. Rơi Cải trang: Tỉ lệ 50% rơi cải trang có HSD và chỉ số ngon cân bằng
        if (Util.isTrue(50, 100)) {
            int costumeId = defaultCostumeId;
            // Nếu không truyền ID cụ thể (Mập Đầu Đinh), rơi ngẫu nhiên Kuku hoặc Rambo
            if (costumeId <= 0) {
                costumeId = Util.isTrue(50, 100) ? ConstItem.CAI_TRANG_KUKU : ConstItem.CAI_TRANG_RAMBO;
            }

            int dropXCostume = baseX + Util.nextInt(-20, 20);
            int dropYCostume = boss.zone.map.yPhysicInTop(dropXCostume, boss.location.y - 24);
            ItemMap dropCostume = new ItemMap(boss.zone, costumeId, 1, dropXCostume, dropYCostume, plKill.id);

            // Chỉ số cân đối phù hợp boss nhiệm vụ 19 (không lạm phát, có giá trị sử dụng cao):
            dropCostume.options.add(new Item.ItemOption(50, Util.nextInt(8, 12)));   // +8% đến 12% Sức đánh
            dropCostume.options.add(new Item.ItemOption(77, Util.nextInt(10, 15)));  // +10% đến 15% HP
            dropCostume.options.add(new Item.ItemOption(103, Util.nextInt(10, 15))); // +10% đến 15% KI
            dropCostume.options.add(new Item.ItemOption(14, Util.nextInt(1, 3)));    // +1% đến 3% Chí mạng
            dropCostume.options.add(new Item.ItemOption(93, Util.nextInt(3, 7)));    // Hạn sử dụng 3 - 7 ngày
            dropCostume.options.add(new Item.ItemOption(30, 0));                     // Không thể giao dịch

            Service.gI().dropItemMap(boss.zone, dropCostume);
        }
    }
}
