package nro.models.boss.Android;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;
import nro.models.item.Item;

import java.time.LocalTime;
import java.util.List;
import java.util.Random;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

public class Pic extends Boss {

    public Pic() throws Exception {
        super(BossID.PIC, BossesData.PIC);
    }

@Override
public void reward(Player plKill) {
    TaskService.gI().checkDoneTaskKillBoss(plKill, this);

    if (plKill == null || this.zone == null) return;

    int x = this.location.x;
    int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

    int rand = Util.nextInt(100);
    int itemId;

    // 40% = 18 | 40% = 17 | 20% = 16
    if (rand < 40) {
        itemId = 18;
    } else if (rand < 80) {
        itemId = 17;
    } else {
        itemId = 16;
    }

    ItemMap it = new ItemMap(this.zone, itemId, 1, x, y, plKill.id);

    // nếu muốn thêm option giống style boss khác thì thêm ở đây
    // ví dụ:
    // it.options.add(new Item.ItemOption(30, Util.nextInt(5, 15)));

    Service.gI().dropItemMap(this.zone, it);
}
    @Override
    public void autoLeaveMap() {
        if (Util.canDoWithTime(st, 900000)) {
            this.leaveMapNew();
        }
        if (this.zone != null && this.zone.getNumOfPlayers() > 0) {
            st = System.currentTimeMillis();
        }
    }
@Override
public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {

    // Check khung giờ giới hạn
    LocalTime now = LocalTime.now();
    int hour = now.getHour();

    boolean isLimitTime =
            (hour >= 1 && hour < 2) ||   // 01:00 - 01:59
            (hour >= 14 && hour < 15);   // 14:00 - 14:59

    // Nếu trong giờ giới hạn và KHÔNG làm nhiệm vụ 20 -> không gây sát thương
    if (isLimitTime) {
        // Kiểm tra nhiệm vụ 20 (TASK_20_x)
        if (plAtt == null
                || plAtt.playerTask == null
                || plAtt.playerTask.taskMain == null
                || plAtt.playerTask.taskMain.id != 25) {

            // Có thể gửi thông báo 1 lần (tuỳ bạn)
            // Service.gI().sendThongBao(plAtt, "Chỉ người đang làm nhiệm vụ 20 mới đánh được boss trong khung giờ này");

            return 0;
        }
    }

    // Xử lý sát thương bình thường
    return super.injured(plAtt, damage, piercing, isMobAttack);
}
    @Override
    public void joinMap() {
        super.joinMap(); //To change body of generated methods, choose Tools | Templates.
        st = System.currentTimeMillis();
    }
    private long st;

    @Override
    public void doneChatS() {
        this.changeStatus(BossStatus.AFK);
    }

    @Override
    public void doneChatE() {
        if (this.parentBoss == null) {
            return;
        }
        this.parentBoss.changeStatus(BossStatus.ACTIVE);
    }

}
