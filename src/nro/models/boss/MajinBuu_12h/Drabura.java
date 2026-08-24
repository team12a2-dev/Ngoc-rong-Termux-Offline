package nro.models.boss.MajinBuu_12h;


import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;
import static nro.models.consts.BossType.FINAL;
import nro.models.consts.ConstPlayer;
import nro.models.item.Item;
import java.util.ArrayList;
import java.util.List;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.EffectSkillService;
import nro.models.services.Service;
import nro.models.utils.Util;
import nro.models.server.ServerNotify;
import nro.models.services.ItemService;
import nro.models.services.SkillService;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.services_dungeon.MajinBuuService;
import nro.models.player.Pet;
import nro.models.skill.Skill;
import nro.models.utils.SkillUtil;

public class Drabura extends Boss {

    private long lastTimePetrify;

    private long lastTimeMove;

    private int timeMove;

    private long lastTimeAfk;

    private long lastTimeChatAfk;

    private int timeChat;

    public Drabura() throws Exception {
        super(FINAL, BossID.DRABURA, BossesData.DRABURA);
    }

    @Override
    public void joinMap() {
        if (zoneFinal != null) {
            this.zone = zoneFinal;
        }
        ChangeMapService.gI().changeMap(this, this.zone, -1, -1);
        MajinBuuService.gI().armBossForPlayerCombat(this);
        this.changeStatus(BossStatus.ACTIVE);
    }

    private byte resolveAttackerFlag(Player plAtt) {
        if (plAtt == null) {
            return 0;
        }
        if (plAtt.isPet && plAtt instanceof Pet pet && pet.master != null) {
            return pet.master.cFlag;
        }
        return plAtt.cFlag;
    }

    private boolean isHostileAttacker(Player plAtt) {
        if (plAtt == null) {
            return false;
        }
        if (MajinBuuService.gI().isHostileToMabu12hBoss(plAtt, this)) {
            return true;
        }
        byte attackerFlag = resolveAttackerFlag(plAtt);
        if (attackerFlag == 0 || this.cFlag == 0) {
            return false;
        }
        return attackerFlag != this.cFlag;
    }

    /** Cùng cờ = đồng minh (tên thường); khác cờ = địch → bật PK (tên đỏ). */
    private void syncCombatMode() {
        if (this.zone == null) {
            return;
        }
        boolean hasEnemy = false;
        for (Player pl : this.zone.getNotBosses()) {
            if (pl != null && pl.isPl() && !pl.isDie() && pl.cFlag != this.cFlag) {
                hasEnemy = true;
                break;
            }
        }
        if (hasEnemy) {
            if (this.typePk == ConstPlayer.NON_PK) {
                this.changeToTypePK();
            }
        } else if (this.typePk == ConstPlayer.PK_ALL
                && (this.zone == null || !MapService.gI().isMapMaBu(this.zone.map.mapId))) {
            this.changeToTypeNonPK();
        }
    }

    @Override
    public void active() {
        syncCombatMode();
        this.attack();
    }

    @Override
    public Player getPlayerAttack() {
        List<Player> plNotVoHinh = new ArrayList();
        for (Player pl : this.zone.getNotBosses()) {
            if (pl != null && (pl.effectSkin == null || !pl.effectSkin.isVoHinh) && pl.cFlag != this.cFlag) {
                plNotVoHinh.add(pl);
            }
        }
        if (!plNotVoHinh.isEmpty()) {
            return plNotVoHinh.get(Util.nextInt(0, plNotVoHinh.size() - 1));
        }

        return null;
    }

    private void petrifyPlayersInTheMap() {
        for (Player pl : this.zone.getNotBosses()) {
            if (pl == null || !pl.isPl() || pl.isDie() || pl.cFlag == this.cFlag) {
                continue;
            }
            if (Util.isTrue(1, 10)) {
                this.chat("phẹt");
                EffectSkillService.gI().setIsStone(pl, 22000);
            }
        }
    }

    @Override
    public void afk() {
        if (MajinBuuService.gI().isMabu12hDefeated()) {
            ChangeMapService.gI().exitMap(this);
            this.changeStatus(BossStatus.REST);
            return;
        }
        if (Util.canDoWithTime(lastTimeChatAfk, timeChat)) {
            this.chat("Đừng vội mừng, ta sẽ hồi sinh và thịt hết bọn mi");
            this.lastTimeChatAfk = System.currentTimeMillis();
            this.timeChat = Util.nextInt(10000, 15000);
        }
        if (Util.canDoWithTime(lastTimeAfk, 60000)) {
            Service.gI().hsChar(this, this.nPoint.hpMax, this.nPoint.mpMax);
            MajinBuuService.gI().armBossForPlayerCombat(this);
            this.changeStatus(BossStatus.CHAT_S);
        }
    }

    @Override
    public void die(Player plKill) {
        if (plKill != null) {
            reward(plKill);
            ServerNotify.gI().notify(plKill.name + ": Đã tiêu diệt được " + this.name + " mọi người đều ngưỡng mộ.");
        }
        this.lastTimeAfk = System.currentTimeMillis();
        this.changeStatus(BossStatus.AFK);
    }

    @Override
    public void attack() {
        if (this.typePk != ConstPlayer.PK_ALL) {
            return;
        }
        if (Util.canDoWithTime(this.lastTimeAttack, 100)) {
            if (Util.canDoWithTime(lastTimePetrify, 10000)) {
                petrifyPlayersInTheMap();
                this.lastTimePetrify = System.currentTimeMillis();
            }
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    if (Util.canDoWithTime(lastTimeMove, timeMove)) {
                        Player plRand = super.getPlayerAttack();
                        if (plRand != null) {
                            this.moveToPlayer(plRand);
                            this.lastTimeMove = System.currentTimeMillis();
                            this.timeMove = Util.nextInt(1000, 5000);
                        }
                    }
                    return;
                }
                this.playerSkill.skillSelect = this.playerSkill.skills.get(
                        Util.nextInt(0, this.playerSkill.skills.size() - 1));
                if (Util.getDistance(this, pl) <= this.getRangeCanAttackWithSkillSelect()) {
                    if (Util.isTrue(5, 20)) {
                        if (SkillUtil.isUseSkillChuong(this)) {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 200)), pl.location.y);
                        } else {
                            this.moveTo(pl.location.x + (Util.getOne(-1, 1) * Util.nextInt(10, 40)), pl.location.y);
                        }
                    }
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                } else {
                    if (Util.isTrue(1, 2)) {
                        this.moveToPlayer(pl);
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }
@Override
public void reward(Player plKill) {

    int x = this.location.x;
    int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

    // ================== 10% RƠI NHÓM 1 (BOSS) ==================
    if (Util.isTrue(20, 100)) {

        int[] dropItems = {
            241, 253, 265, 277,
            233, 245, 257, 269,
            237, 249, 261, 273,
            281
        };
        int itemId = dropItems[Util.nextInt(dropItems.length)];

        // Chỉ người hạ boss nhặt được
        ItemMap it = new ItemMap(zone, itemId, 1, x, y, plKill.id);

        // Option 107 random 0–2
        it.options.add(new Item.ItemOption(107, Util.nextInt(0, 3)));

        // Option theo nhóm item
        switch (itemId) {
            case 241:
            case 233:
            case 237:
                it.options.add(new Item.ItemOption(47, Util.nextInt(400, 550)));
                break;

            case 253:
            case 245:
            case 249:
                it.options.add(new Item.ItemOption(6, Util.nextInt(22000, 27000)));
                it.options.add(new Item.ItemOption(27, Util.nextInt(3000, 5000)));
                break;

            case 265:
            case 261:
            case 257:
                it.options.add(new Item.ItemOption(0, Util.nextInt(2100, 2400)));
                break;

            case 277:
            case 269:
            case 273:
                it.options.add(new Item.ItemOption(7, Util.nextInt(22000, 26000)));
                it.options.add(new Item.ItemOption(28, Util.nextInt(4000, 6000)));
                break;

            case 281:
                it.options.add(new Item.ItemOption(14, Util.nextInt(11, 13)));
                break;
        }

        Service.gI().dropItemMap(zone, it);
    }

    // ================== 10% RƠI ITEM 16 / 17 (x1) ==================
    if (Util.isTrue(20, 100)) {
        int itemId = Util.isTrue(50, 100) ? 16 : 17;
        ItemMap it = new ItemMap(zone, itemId, 1, x + 10, y, plKill.id);
        Service.gI().dropItemMap(zone, it);
    }

        plKill.fightMabu.changePoint((byte) 10, this.name);
        TaskService.gI().checkDoneTaskKillBoss(plKill, this);
    }

    // @Override
    // public void reward(Player plKill) {
    //     int diem = 5;
    //     plKill.event.addEventPoint(diem);
    //     Service.gI().sendThongBao(plKill, "+5 Point");
    //     int x = this.location.x; // đâyyyy
    //     int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);
    //     int drop = 190; // 100% rơi item ID 190
    //     int quantity = Util.nextInt(20000, 30000);
    //     // Tạo itemMap cho item ID 190
    //     if (Util.isTrue(1 , 100)) {
    //     ItemMap it = ItemService.gI().randDoTLBoss(this.zone, 1, x, y, plKill.id);
    //     if (it != null) {
    //     Service.gI().dropItemMap(zone, it);
    //     }
    //     }
    //     ItemMap itemMap = new ItemMap(this.zone, drop, quantity, x, y, plKill.id);
    //     Item item = ItemService.gI().createNewItem((short) drop);
    //     Service.gI().dropItemMap(zone, itemMap);
    //     // 30% xác suất để rơi đồ
    //     if (Util.isTrue(1, 100)) {
    //         int group = Util.nextInt(1, 100) <= 70 ? 0 : 1;  // 70% chọn Áo Quần Giày (group = 0), 30% chọn Găng Rada (group = 1)

    //         // Các vật phẩm rơi từ nhóm Áo Quần Giày và Găng Rada
    //         int[][] drops = {
    //             {230, 231, 232, 234, 235, 236, 238, 239, 240, 242, 243, 244, 246, 247, 248, 250, 251, 252, 266, 267, 268, 270, 271, 272, 274, 275, 276}, // Áo Quần Giày
    //             {254, 255, 256, 258, 259, 260, 262, 263, 264, 278, 279, 280} // Găng Rada
    //         };
    //         // Chọn vật phẩm ngẫu nhiên từ nhóm đã chọn
    //         int dropOptional = drops[group][Util.nextInt(0, drops[group].length - 1)];
    //         // Tạo vật phẩm và thêm chỉ số shop
    //         ItemMap optionalItemMap = new ItemMap(this.zone, dropOptional, 1, x, y, plKill.id);
    //         Item optionalItem = ItemService.gI().createNewItem((short) dropOptional);
    //         List<Item.ItemOption> optionalOps = ItemService.gI().getListOptionItemShop((short) dropOptional);
    //         optionalOps.forEach(option -> option.param = (int) (option.param * Util.nextInt(100, 115) / 100.0));
    //         optionalItemMap.options.addAll(optionalOps);
    //         // Thêm chỉ số sao pha lê (80% từ 1-3 sao, 17% từ 4-5 sao, 3% sao 6)
    //         int rand = Util.nextInt(1, 100);
    //         int value = 0;
    //         if (rand <= 80) {
    //             value = Util.nextInt(1, 3); // 80% xác suất: sao từ 1 đến 3
    //         } else if (rand <= 97) {
    //             value = Util.nextInt(4, 5); // 17% xác suất: sao từ 4 đến 5
    //         } else {
    //             value = 6; // 3% xác suất: sao 6
    //         }
    //         optionalItemMap.options.add(new Item.ItemOption(107, value));
    //         // Drop vật phẩm tùy chọn xuống bản đồ
    //         Service.gI().dropItemMap(zone, optionalItemMap);
    //     }
    //     // 80% xác suất rơi ngọc rồng
    //     if (Util.isTrue(20, 100)) {
    //         int[] dropItems = {15,16,17,18,19,20};
    //         int dropOptional = dropItems[Util.nextInt(0, dropItems.length - 1)];
    //         // Tạo và rơi vật phẩm ngọc rồng hoặc item cấp 2
    //         ItemMap optionalItemMap = new ItemMap(this.zone, dropOptional, Util.nextInt(1, 3), x, y, plKill.id);
    //         Item optionalItem = ItemService.gI().createNewItem((short) dropOptional);
    //         Service.gI().dropItemMap(zone, optionalItemMap);
    //     }
    //     plKill.fightMabu.changePoint((byte) 10);
    //     TaskService.gI().checkDoneTaskKillBoss(plKill, this);
    // }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (plAtt != null && (plAtt.isPl() || plAtt.isPet)) {
                syncCombatMode();
            }
            if (!piercing && Util.isTrue(10, 100)) {
                this.chat("Xí hụt");
                return 0;
            }
            if (plAtt != null && plAtt.playerSkill != null && plAtt.playerSkill.skillSelect != null) {
                switch (plAtt.playerSkill.skillSelect.template.id) {
                    case Skill.TU_SAT:
                        return 0;
                }
            }

            if (plAtt != null && plAtt.isPl() && Util.isTrue(1, 5)) {
                plAtt.fightMabu.changePercentPoint((byte) 1);
            }
            if (damage >= 20000000) {
                damage = 20000000;
            }

            this.nPoint.subHP(damage);

            if (isDie()) {
                this.setDie(plAtt);
                this.lastTimeAfk = System.currentTimeMillis();
                die(plAtt);
            }

            return (int) damage;
        } else {
            return 0;
        }
    }

}
