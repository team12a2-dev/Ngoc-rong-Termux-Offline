package nro.models.boss.MajinBuu_12h;


import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.BossesData;
import nro.models.consts.AppearType;
import static nro.models.consts.BossType.FINAL;
import nro.models.consts.ConstItem;
import nro.models.consts.ConstPlayer;
import nro.models.item.Item;
import nro.models.player.FightMabu;
import nro.models.server.ServerNotify;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.utils.TimeUtil;
import nro.models.utils.Util;
import java.util.ArrayList;
import java.util.List;
import nro.models.services_dungeon.MajinBuuService;
import nro.models.services.EffectSkillService;
import nro.models.services.ItemTimeService;
import nro.models.services.SkillService;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.services.ItemService;
import nro.models.utils.SkillUtil;

public class Mabu extends Boss {

    private long lastTimePetrify;

    public Mabu() throws Exception {
        super(FINAL, BossID.MABU_12H, BossesData.MABU_12H);
    }

@Override
public void die(Player plKill) {
    Player killer = FightMabu.resolveOwner(plKill);
    if (killer != null && !killer.isBot) {
        reward(killer);
        ServerNotify.gI().notify(killer.name + ": Đã tiêu diệt được " + this.name + " mọi người đều ngưỡng mộ.");
    }
    MajinBuuService.gI().onMabu12hDefeated(this.zone, killer);
    this.changeStatus(BossStatus.LEAVE_MAP);
}

@Override
public void reward(Player plKill) {
    Player killer = FightMabu.resolveOwner(plKill);
    if (killer == null) {
        return;
    }

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
        ItemMap it = new ItemMap(zone, itemId, 1, x, y, killer.id);

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
        ItemMap it = new ItemMap(zone, itemId, 1, x + 10, y, killer.id);
        Service.gI().dropItemMap(zone, it);
    }

    ItemMap egg = new ItemMap(zone, ConstItem.QUA_TRUNG, 1, x + 20, y, killer.id);
    Service.gI().dropItemMap(zone, egg);
    Service.gI().sendThongBao(killer, "Mabư đã rơi quả trứng! Hãy nhặt và về nhà ấp trứng Mabư.");

    TaskService.gI().checkDoneTaskKillBoss(killer, this);
    }

    @Override
    public void joinMap() {
        if (zoneFinal != null) {
            this.zone = zoneFinal;
        }
        ChangeMapService.gI().changeMap(this, this.zone, Util.nextInt(300, 400), 336);
        // Khi Mabư 12h bắt đầu vào ACTIVE/CHAT_S, phải xóa màn hình "Xin chờ" cho người chơi đang ở map.
        // Tránh trường hợp UI bị giữ lại theo chu kỳ 12h (REST -> RESPAWN -> JOIN_MAP).
        Service.gI().clearMabuWait(this.zoneFinal);
        MajinBuuService.gI().armBossForPlayerCombat(this);
        this.changeStatus(BossStatus.CHAT_S);
        MajinBuuService.gI().getNpcBabiday(this.zone).npcChat(this.zone, "Mabư ! Hãy theo lệnh ta, giết hết bọn chúng đi");
    }

    private void petrifyPlayersInTheMap() {
        for (Player pl : this.zone.getNotBosses()) {
            if (Util.isTrue(1, 10)) {
                EffectSkillService.gI().setIsStone(pl, 22000);
            } else if (Util.isTrue(1, 5)) {
                this.chat("Úm ba la xì bùa");
                EffectSkillService.gI().setSocola(pl, System.currentTimeMillis(), 30000);
                Service.gI().Send_Caitrang(pl);
                ItemTimeService.gI().sendItemTime(pl, 4133, 30);
            }
        }
    }

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 100) && this.typePk == ConstPlayer.PK_ALL) {
            if (Util.canDoWithTime(lastTimePetrify, 30000)) {
                petrifyPlayersInTheMap();
                this.lastTimePetrify = System.currentTimeMillis();
            }
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    return;
                }
                this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
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
    public void autoLeaveMap() {
    }

    @Override
    public void rest() {
        if (this.zoneFinal != null) {
            Service.gI().clearMabuWait(this.zoneFinal);
        }
        if (MajinBuuService.gI().isMabu12hDefeated() || !TimeUtil.isMabuOpen()) {
            return;
        }
        if (Util.canDoWithTime(lastTimeRest, secondsRest * 1000L)) {
            this.changeStatus(BossStatus.RESPAWN);
        }
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (!piercing && Util.isTrue(20, 100)) {
                this.chat("Xí hụt");
                return 0;
            }

            if (plAtt.isPl() && Util.isTrue(1, 5)) {
                plAtt.fightMabu.changePercentPoint((byte) 1);
            }
            if (damage >= 50000000) {
                damage = 50000000 + Util.nextInt(-10000, 10000);
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
    public void leaveMap() {
        if (this.zoneFinal != null) {
            Service.gI().clearMabuWait(this.zoneFinal);
        }
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.lastTimeRest = System.currentTimeMillis();
        this.changeStatus(BossStatus.REST);
        if (!MajinBuuService.gI().isMabu12hDefeated()
                && this.bossAppearTogether != null
                && this.bossAppearTogether.length > this.currentLevel
                && this.bossAppearTogether[this.currentLevel] != null) {
            for (Boss boss : this.bossAppearTogether[this.currentLevel]) {
                boss.changeStatus(BossStatus.RESPAWN);
            }
        }
    }
}
