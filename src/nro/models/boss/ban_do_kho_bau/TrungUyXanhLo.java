package nro.models.boss.ban_do_kho_bau;


import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.boss.Boss_Manager.TreasureUnderSeaManager;
import static nro.models.consts.BossType.PHOBANBDKB;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.skill.Skill;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.Util;

public class TrungUyXanhLo extends Boss {

    private static final int[][] FULL_DEMON = new int[][]{{Skill.DEMON, 1}, {Skill.DEMON, 2}, {Skill.DEMON, 3}, {Skill.DEMON, 4}, {Skill.DEMON, 5}, {Skill.DEMON, 6}, {Skill.DEMON, 7}};

    public TrungUyXanhLo(Zone zone, int level, int dame, int hp) throws Exception {
        super(PHOBANBDKB, BossID.TRUNG_UY_XANH_LO, new BossData(
                "Trung úy Xanh Lơ",
                ConstPlayer.TRAI_DAT,
                new short[]{135, 136, 137, -1, -1, -1},
                (dame),
                new int[]{hp},
                new int[]{103},
                (int[][]) Util.addArray(FULL_DEMON),
                new String[]{},
                new String[]{"|-1|Các ngươi tới số rồi mới gặp phải ta",
                    "|-1|He he he",
                    "|-1|Xem các ngươi mạnh đến đâu"},
                new String[]{},
                60
        ));
        this.zone = zone;
    }

    @Override
    public void reward(Player plKill) {
        int diem = 5;
        plKill.event.addEventPoint(diem);
        Service.gI().sendThongBao(plKill, "+5 Point");
        if (Util.isTrue(100, 100)) {
            int yEnd = this.zone.map.yPhysicInTop(this.location.x, this.location.y - 24);
            if (yEnd <= 0) {
                yEnd = this.location.y;
            }
            ItemMap it = new ItemMap(this.zone, 705, 1, this.location.x, yEnd, plKill.id);
            Service.gI().dropItemMap(this.zone, it);

            int dungeonLevel = 1;
            if (plKill.clan != null && plKill.clan.BanDoKhoBau != null) {
                dungeonLevel = Math.max(1, plKill.clan.BanDoKhoBau.level);
            }
            int totalGold = Util.nextInt(25000 + dungeonLevel * 8000, 60000 + dungeonLevel * 18000);
            int piles = Math.min(8, 4 + dungeonLevel / 25);
            int remainingGold = totalGold;
            for (int i = 0; i < piles; i++) {
                int pilesLeft = piles - i;
                int pileGold = (remainingGold + pilesLeft - 1) / pilesLeft;
                remainingGold -= pileGold;
                int pileX = this.location.x + (i - piles / 2) * 25;
                int pileY = this.zone.map.yPhysicInTop(pileX, yEnd - 24);
                if (pileY <= 0) {
                    pileY = yEnd;
                }
                ItemMap goldItem = new ItemMap(this.zone, 190, pileGold, pileX, pileY, plKill.id);
                Service.gI().dropItemMap(this.zone, goldItem);
            }
        }
    }

    @Override
    public void joinMap() {
        ChangeMapService.gI().changeMap(this, this.zone, 198, 456);
        this.changeStatus(BossStatus.CHAT_S);
    }

    @Override
    public void doneChatS() {
        this.changeStatus(BossStatus.AFK);
        Service.gI().setPos(this, 198, 456);
    }

    @Override
    public void afk() {
        Player pl = getPlayerAttack();
        if (pl == null || pl.isDie()) {
            return;
        }
        if (Util.getDistance(this, pl) <= 200) {
            this.changeStatus(BossStatus.ACTIVE);
        }
    }

    @Override
    public void die(Player plKill) {
        if (plKill != null) {
            reward(plKill);
        }
        this.changeStatus(BossStatus.DIE);
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.lastTimeRest = System.currentTimeMillis();
        this.changeStatus(BossStatus.REST);
        TreasureUnderSeaManager.gI().removeBoss(this);
        this.dispose();
    }
}
