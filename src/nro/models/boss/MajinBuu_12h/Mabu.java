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

        // 35% rơi Đồ Thần Linh VIP (2 - 5 sao, chỉ số cao)
        if (Util.isTrue(35, 100)) {
            int[] dropItems = {241, 253, 265, 277, 233, 245, 257, 269, 237, 249, 261, 273, 281};
            int itemId = dropItems[Util.nextInt(dropItems.length)];
            ItemMap it = new ItemMap(zone, itemId, 1, x, y, killer.id);
            it.options.add(new Item.ItemOption(107, Util.nextInt(2, 5)));
            switch (itemId) {
                case 241, 233, 237 -> it.options.add(new Item.ItemOption(47, Util.nextInt(450, 600)));
                case 253, 245, 249 -> {
                    it.options.add(new Item.ItemOption(6, Util.nextInt(24000, 30000)));
                    it.options.add(new Item.ItemOption(27, Util.nextInt(4000, 6000)));
                }
                case 265, 257, 261 -> it.options.add(new Item.ItemOption(0, Util.nextInt(2200, 2600)));
                case 277, 269, 273 -> {
                    it.options.add(new Item.ItemOption(7, Util.nextInt(24000, 30000)));
                    it.options.add(new Item.ItemOption(28, Util.nextInt(5000, 7000)));
                }
                case 281 -> it.options.add(new Item.ItemOption(14, Util.nextInt(12, 15)));
            }
            Service.gI().dropItemMap(zone, it);
        }

        // 60% rơi Ngọc Rồng 1 - 2 sao
        if (Util.isTrue(60, 100)) {
            int nrId = Util.nextInt(14, 15); // 14: 1 sao, 15: 2 sao
            ItemMap it = new ItemMap(zone, nrId, 1, x + 10, y, killer.id);
            Service.gI().dropItemMap(zone, it);
        }

        // 100% Rơi Quả Trứng Mabư cho người kết liễu
        ItemMap egg = new ItemMap(zone, ConstItem.QUA_TRUNG, 1, x + 20, y, killer.id);
        Service.gI().dropItemMap(zone, egg);
        Service.gI().sendThongBao(killer, "Mabư đã rơi quả trứng! Hãy nhặt và về nhà ấp trứng Mabư.");

        // Mưa vàng rơi tự do trên sàn đấu
        for (int i = -40; i <= 40; i += 20) {
            ItemMap gold = new ItemMap(zone, 190, Util.nextInt(100000, 250000), x + i, y, -1);
            Service.gI().dropItemMap(zone, gold);
        }

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
