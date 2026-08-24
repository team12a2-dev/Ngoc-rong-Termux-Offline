package nro.models.boss.trai_dat;


import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;
import nro.models.item.Item;
import java.util.List;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.Util;

public class BOJACK extends Boss {

    private long st;

    public BOJACK() throws Exception {
        super(BossID.BOJACK, false, true, BossesData.BOJACK, BossesData.SUPER_BOJACK);
    }

   
   @Override
public void reward(Player plKill) {

    short itemId = 77;

    for (int i = 0; i < 10; i++) {

        int x = this.location.x + Util.nextInt(-60, 60);
        int y = this.zone.map.yPhysicInTop(this.location.x, this.location.y - 24);

        ItemMap item = new ItemMap(
                this.zone,
                itemId,
                1,
                x,
                y,
                -1 // ai cũng nhặt được
        );

        Service.gI().dropItemMap(this.zone, item);
    }

   
}

    @Override
    public void joinMap() {
        super.joinMap();
        st = System.currentTimeMillis();
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
    public void doneChatS() {
        if (this.currentLevel == 1) {
            return;
        }
        this.changeStatus(BossStatus.AFK);
    }
}
