package nro.models.boss.MajinBuu_12h;


import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.spawn.BossSpawnSchedule;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;
import nro.models.consts.AppearType;
import static nro.models.consts.BossType.FINAL;
import nro.models.item.Item;
import java.util.List;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.Util;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.services_dungeon.MajinBuuService;

public class Drabura2 extends Boss {

    private boolean callBoss = true;

    private long lastTimeJoin;

    public Drabura2() throws Exception {
        super(FINAL, BossID.DRABURA_2, BossesData.DRABURA_2);
    }

    @Override
    public void joinMap() {
        if (zoneFinal != null) {
            this.zone = zoneFinal;
        }
        this.lastTimeJoin = System.currentTimeMillis();
        this.callBoss = false;
        ChangeMapService.gI().changeMap(this, this.zone, Util.nextInt(300, 400), 336);
        MajinBuuService.gI().armBossForPlayerCombat(this);
        this.changeStatus(BossStatus.CHAT_S);
    }

    @Override
    public void reward(Player plKill) {
        int x = this.location.x;
        int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

        // 22% rơi Đồ Thần Linh (1 - 4 sao)
        if (Util.isTrue(22, 100)) {
            int[] dropItems = {241, 253, 265, 277, 233, 245, 257, 269, 237, 249, 261, 273, 281};
            int itemId = dropItems[Util.nextInt(dropItems.length)];
            ItemMap it = new ItemMap(zone, itemId, 1, x, y, plKill.id);
            it.options.add(new Item.ItemOption(107, Util.nextInt(1, 4)));
            switch (itemId) {
                case 241, 233, 237 -> it.options.add(new Item.ItemOption(47, Util.nextInt(400, 550)));
                case 253, 245, 249 -> {
                    it.options.add(new Item.ItemOption(6, Util.nextInt(22000, 27000)));
                    it.options.add(new Item.ItemOption(27, Util.nextInt(3000, 5000)));
                }
                case 265, 257, 261 -> it.options.add(new Item.ItemOption(0, Util.nextInt(2100, 2400)));
                case 277, 269, 273 -> {
                    it.options.add(new Item.ItemOption(7, Util.nextInt(22000, 26000)));
                    it.options.add(new Item.ItemOption(28, Util.nextInt(4000, 6000)));
                }
                case 281 -> it.options.add(new Item.ItemOption(14, Util.nextInt(11, 13)));
            }
            Service.gI().dropItemMap(zone, it);
        }

        // 40% rơi Ngọc Rồng 1 - 3 sao
        if (Util.isTrue(40, 100)) {
            int nrId = Util.nextInt(14, 16); // 14: 1 sao, 15: 2 sao, 16: 3 sao
            ItemMap it = new ItemMap(zone, nrId, 1, x + 10, y, plKill.id);
            Service.gI().dropItemMap(zone, it);
        }

        // 25% rơi Sao Pha Lê (3 - 5 sao)
        if (Util.isTrue(25, 100)) {
            int splId = Util.nextInt(443, 445);
            ItemMap it = new ItemMap(zone, splId, 1, x - 10, y, plKill.id);
            Service.gI().dropItemMap(zone, it);
        }

        // Vàng rơi tự do trên sàn đấu
        ItemMap gold = new ItemMap(zone, 190, Util.nextInt(200000, 500000), x + 20, y, -1);
        Service.gI().dropItemMap(zone, gold);

        plKill.fightMabu.changePoint((byte) 10, this.name);
        TaskService.gI().checkDoneTaskKillBoss(plKill, this);
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (!piercing && Util.isTrue(200, 1000)) {
                this.chat("Xí hụt");
                return 0;
            }

            if (plAtt.isPl() && Util.isTrue(1, 5)) {
                plAtt.fightMabu.changePercentPoint((byte) 1);
            }
            if (damage >= 20000000) {
                damage = 20000000;
            }

            if (damage >= this.nPoint.hp) {
                this.changeStatus(BossStatus.AFK);
                damage = 0;
            }

            this.nPoint.subHP(damage);

            if (isDie()) {
                this.setDie(plAtt);
                die(plAtt);
            }

            return (int) damage;
        } else {
            return 0;
        }
    }

    @Override
    public void rest() {
        int nextLevel = this.currentLevel + 1;
        if (nextLevel >= this.data.length) {
            nextLevel = 0;
        }
        if (BossSpawnSchedule.canSpawnFromRest(this, nextLevel)) {
            this.changeStatus(BossStatus.RESPAWN);
        }

        if (Util.canDoWithTime(lastTimeRest, 5000)) {
            if (!this.callBoss
                    && this.bossAppearTogether != null
                    && this.bossAppearTogether[this.currentLevel] != null) {
                for (Boss boss : this.bossAppearTogether[this.currentLevel]) {
                    if (boss != null) {
                        boss.changeStatus(BossStatus.RESPAWN);
                    }
                }
                this.callBoss = true;
            }
        }

    }

    @Override
    public void autoLeaveMap() {
        if (Util.canDoWithTime(this.lastTimeJoin, 250000)) {
            this.leaveMap();
        }
    }

    @Override
    public void afk() {
        this.changeToTypeNonPK();
        this.changeStatus(BossStatus.DIE);
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.lastTimeRest = System.currentTimeMillis();
        this.changeStatus(BossStatus.REST);
    }

}
