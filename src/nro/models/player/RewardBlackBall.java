package nro.models.player;

import nro.models.services.Service;
import nro.models.utils.TimeUtil;
import nro.models.utils.Util;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.item.Item;
/**
 *
 * @author By AmodsubVN
 * 
 */

public class RewardBlackBall {

    private static final int TIME_REWARD = 79200000;

    public static final int R1S_1 = 20;
    public static final int R1S_2 = 15;
    public static final int R2S_1 = 20;
    public static final int R2S_2 = 20;
    public static final int R3S_1 = 20;
    public static final int R3S_2 = 10;

    public static final int R4S_1 = 10;
    public static final int R4S_2 = 10;
    public static final int R5S_1 = 15;
    public static final int R5S_2 = 20;
    public static final int R5S_3 = 20;
    public static final int R6S_1 = 15;
    public static final int R6S_2 = 20;
    public static final int R7S_1 = 10;
    public static final int R7S_2 = 10;

    public static final int TIME_WAIT = 3600000;
    public static long time8h;
    private Player player;

    public long[] timeOutOfDateReward;
    public int[] quantilyBlackBall;
    public long[] lastTimeGetReward;

    public RewardBlackBall(Player player) {
        this.player = player;
        this.timeOutOfDateReward = new long[7];
        this.lastTimeGetReward = new long[7];
        this.quantilyBlackBall = new int[7];
        time8h = TimeUtil.getStartTimeBlackBallWar();
    }

    public void reward(byte star) {
        if (this.timeOutOfDateReward[star - 1] > time8h) {
            quantilyBlackBall[star - 1]++;
        }
        this.timeOutOfDateReward[star - 1] = System.currentTimeMillis() + TIME_REWARD;
        Service.gI().point(player);
    }

    public void getRewardSelect(byte select) {
        int index = 0;
        for (int i = 0; i < timeOutOfDateReward.length; i++) {
            if (timeOutOfDateReward[i] > System.currentTimeMillis()) {
                index++;
                if (index == select + 1) {
                    getReward(i + 1);
                    break;
                }
            }
        }
    }

 private void getReward(int star) {
    long now = System.currentTimeMillis();

    // Hết hiệu lực
    if (timeOutOfDateReward[star - 1] <= now) {
        Service.gI().sendThongBao(player, "Ngọc Rồng Đen đã hết hiệu lực");
        return;
    }

    // ===== SAO 4 ===== (x10 item id 77 / 1 giờ)
    if (star == 4) {
        if (!Util.canDoWithTime(lastTimeGetReward[3], TIME_WAIT)) {
            long left = (lastTimeGetReward[3] + TIME_WAIT - now) / 1000;
            if (left < 0) left = 0;
            Service.gI().sendThongBao(player,
                    "Cần chờ thêm " + left + " giây để nhận tiếp phần thưởng");
            return;
        }

        Item item = ItemService.gI().createNewItem((short) 77, 10);

        if (!InventoryService.gI().addItemBag(player, item)) {
            Service.gI().sendThongBao(player, "Hành trang đầy");
            return;
        }

        InventoryService.gI().sendItemBags(player);
        lastTimeGetReward[3] = now;
        Service.gI().point(player);

        Service.gI().sendThongBao(player,
                "Bạn nhận được x10 vật phẩm từ Ngọc Rồng Đen 4 sao");
        return;
    }

    // ===== SAO 7 ===== (x10 item id 595, op 2 = 256 / 1 giờ)
    if (star == 7) {
        if (!Util.canDoWithTime(lastTimeGetReward[6], TIME_WAIT)) {
            long left = (lastTimeGetReward[6] + TIME_WAIT - now) / 1000;
            if (left < 0) left = 0;
            Service.gI().sendThongBao(player,
                    "Cần chờ thêm " + left + " giây để nhận tiếp phần thưởng");
            return;
        }

        Item item = ItemService.gI().createNewItem((short) 595, 10);
        item.itemOptions.add(new Item.ItemOption(2, 256));

        if (!InventoryService.gI().addItemBag(player, item)) {
            Service.gI().sendThongBao(player, "Hành trang đầy");
            return;
        }

        InventoryService.gI().sendItemBags(player);
        lastTimeGetReward[6] = now;
        Service.gI().point(player);

        Service.gI().sendThongBao(player,
                "Bạn nhận được x10 vật phẩm đặc biệt từ Ngọc Rồng Đen 7 sao");
        return;
    }

    // ===== CÁC SAO KHÁC =====
    switch (star) {
        case 1:
        case 2:
        case 3:
        case 5:
        case 6:
            Service.gI().sendThongBao(player, "Chỉ số đã được cộng");
            Service.gI().point(player);
            break;
    }
}
    public void dispose() {
        this.player = null;
    }
}
