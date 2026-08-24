package nro.models.boss.Boss_mini;

import java.util.ArrayList;
import java.util.List;
import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.consts.ConstTaskBadges;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;
import nro.models.services.PlayerService;
import nro.models.skill.Skill;
import nro.models.task.BadgesTaskService;
import nro.models.utils.Util;

public class AnTrom extends Boss {

    private static final int STEAL_RANGE = 45;
    private static final int CHASE_RANGE = 250;
    private static final long STEAL_COOLDOWN_MS = 700;
    private static final long FLEE_COOLDOWN_MS = 12_000;
    private static final long MIN_GOLD_TO_TARGET = 50_000;
    private static final long MAX_STOLEN_PER_SPAWN = 30_000_000L;
    private static final int MIN_PLAYERS_IN_ZONE = 1;
    private static final int MAX_PLAYERS_IN_ZONE = 12;

    private long goldAnTrom;
    private long lastTimeAnTrom;
    private long lastTimeFlee;
    private long sessionStart;
    private int sessionDurationMs;
    private int stealCount;

    public AnTrom() throws Exception {
        super(BossID.AN_TROM, new BossData(
                "Ăn Trộm",
                ConstPlayer.TRAI_DAT,
                new short[]{201, 202, 203, -1, -1, -1},
                1,
                new int[]{100},
                new int[]{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 79, 80, 81, 82, 83, 84, 92, 93, 94, 96, 97, 98, 99, 100, 102, 103, 104, 105, 106, 107, 108, 109, 110},
                new int[][]{
                    {Skill.THAI_DUONG_HA_SAN, 5, 8000}},
                new String[]{"|-1|Có ai mang vàng không ta?"},
                new String[]{"|-1|Haha, ví nào cũng là của ta!", "|-1|Chạy đi, ta chỉ lấy vàng thôi!"},
                new String[]{"|-1|Thôi, đủ rồi — ta đi đây!"},
                3600));
    }

    @Override
    public Zone getMapJoin() {
        int[] maps = this.data[this.currentLevel].getMapJoin();
        int mapId = maps[Util.nextInt(0, maps.length - 1)];
        return MapService.gI().getMapById(mapId).zones.get(0);
    }

    /** Ưu tiên mục tiêu giàu nhất trong khu, không đổi mục tiêu quá thường xuyên */
    @Override
    public Player getPlayerAttack() {
        if (this.zone == null) {
            return null;
        }
        if (this.playerTarger != null) {
            if (this.playerTarger.isDie()
                    || !this.zone.equals(this.playerTarger.zone)
                    || !this.playerTarger.isPl()
                    || this.playerTarger.inventory.gold < MIN_GOLD_TO_TARGET) {
                this.playerTarger = null;
            }
        }
        if (this.playerTarger == null || Util.canDoWithTime(this.lastTimeTargetPlayer, this.timeTargetPlayer)) {
            Player richest = findRichestVictim();
            if (richest != null) {
                this.playerTarger = richest;
            } else {
                this.playerTarger = this.zone.getRandomPlayerInMap();
            }
            this.lastTimeTargetPlayer = System.currentTimeMillis();
            this.timeTargetPlayer = Util.nextInt(2500, 4500);
        }
        return this.playerTarger;
    }

    private Player findRichestVictim() {
        Player best = null;
        long bestGold = MIN_GOLD_TO_TARGET - 1;
        for (Player pl : this.zone.getNotBosses()) {
            if (pl == null || !pl.isPl() || pl.isDie() || pl.isBoss) {
                continue;
            }
            if (pl.effectSkin != null && pl.effectSkin.isVoHinh) {
                continue;
            }
            long g = pl.inventory.gold;
            if (g > bestGold && Util.getDistance(this, pl) <= CHASE_RANGE) {
                bestGold = g;
                best = pl;
            }
        }
        return best;
    }

    private int calcStealAmount(Player pl) {
        long playerGold = pl.inventory.gold;
        if (playerGold < MIN_GOLD_TO_TARGET) {
            return 0;
        }
        int amount;
        if (playerGold >= 10_000_000) {
            amount = Util.nextInt(500_000, 1_500_000);
        } else if (playerGold >= 2_000_000) {
            amount = Util.nextInt(150_000, 800_000);
        } else if (playerGold >= 500_000) {
            amount = Util.nextInt(30_000, 120_000);
        } else if (playerGold >= 100_000) {
            amount = Util.nextInt(5_000, 25_000);
        } else {
            amount = Util.nextInt(1_000, 8_000);
        }
        if (amount > playerGold) {
            amount = (int) Math.min(playerGold, Integer.MAX_VALUE);
        }
        long remainCap = MAX_STOLEN_PER_SPAWN - goldAnTrom;
        if (remainCap <= 0) {
            return 0;
        }
        return (int) Math.min(amount, remainCap);
    }

    private boolean shouldFlee() {
        if (goldAnTrom >= MAX_STOLEN_PER_SPAWN) {
            return true;
        }
        if (this.nPoint.hpMax > 0 && this.nPoint.hp <= this.nPoint.hpMax * 0.35) {
            return true;
        }
        int nearby = countNearbyPlayers(120);
        return nearby >= 4 || (nearby >= 2 && stealCount >= 3);
    }

    private int countNearbyPlayers(int range) {
        int count = 0;
        for (Player pl : this.zone.getNotBosses()) {
            if (pl != null && pl.isPl() && !pl.isDie() && Util.getDistance(this, pl) <= range) {
                count++;
            }
        }
        return count;
    }

    private void tryFlee() {
        if (!Util.canDoWithTime(lastTimeFlee, FLEE_COOLDOWN_MS) || this.zone == null) {
            return;
        }
        lastTimeFlee = System.currentTimeMillis();
        this.chat("|-1|Ăn xong rồi — tạm biệt!");
        Zone next = pickZoneWithPlayers(true);
        if (next != null && next != this.zone) {
            int maxX = Math.max(120, next.map.mapWidth - 100);
            int x = Util.nextInt(100, maxX);
            int y = next.map.yPhysicInTop(x, 0);
            ChangeMapService.gI().changeMap(this, next, x, y);
            this.playerTarger = null;
        } else if (goldAnTrom >= MAX_STOLEN_PER_SPAWN / 2) {
            this.changeStatus(BossStatus.LEAVE_MAP);
        }
    }

    private Zone pickZoneWithPlayers(boolean excludeCurrent) {
        if (this.zone == null || this.zone.map == null) {
            return null;
        }
        List<Zone> candidates = new ArrayList<>();
        for (Zone z : this.zone.map.zones) {
            if (excludeCurrent && z == this.zone) {
                continue;
            }
            int n = z.getNumOfPlayers();
            if (n >= MIN_PLAYERS_IN_ZONE
                    && n <= MAX_PLAYERS_IN_ZONE
                    && !BossManager.gI().checkBosses(z, BossID.AN_TROM)) {
                candidates.add(z);
            }
        }
        if (candidates.isEmpty()) {
            return null;
        }
        return candidates.get(Util.nextInt(0, candidates.size() - 1));
    }

    @Override
    public int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (this.isDie()) {
            return 0;
        }
        damage = 1;
        this.nPoint.subHP(damage);
        if (isDie()) {
            this.setDie(plAtt);
            die(plAtt);
            return (int) damage;
        }
        if (!this.playerSkill.skills.isEmpty()) {
            this.playerSkill.skillSelect = this.playerSkill.skills.get(0);
            SkillService.gI().useSkill(this, plAtt, null, -1, null);
        }
        if (Util.isTrue(2, 5)) {
            tryFlee();
        }
        return (int) damage;
    }

    @Override
    public void attack() {
        if (!Util.canDoWithTime(this.lastTimeAttack, 80) || this.typePk != ConstPlayer.PK_ALL) {
            return;
        }
        this.lastTimeAttack = System.currentTimeMillis();
        try {
            if (shouldFlee()) {
                tryFlee();
                return;
            }

            Player pl = this.getPlayerAttack();
            if (pl == null || pl.isDie()) {
                return;
            }

            int dist = Util.getDistance(this, pl);

            if (dist <= STEAL_RANGE) {
                trySteal(pl);
            } else if (dist <= CHASE_RANGE) {
                this.moveToPlayer(pl);
            } else {
                this.playerTarger = null;
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private void trySteal(Player pl) {
        if (!Util.canDoWithTime(this.lastTimeAnTrom, STEAL_COOLDOWN_MS)) {
            return;
        }
        if (goldAnTrom >= MAX_STOLEN_PER_SPAWN) {
            tryFlee();
            return;
        }
        int gold = calcStealAmount(pl);
        if (gold <= 0) {
            this.playerTarger = null;
            return;
        }

        if (!this.playerSkill.skills.isEmpty() && Util.isTrue(1, 3)) {
            this.playerSkill.skillSelect = this.playerSkill.skills.get(0);
            SkillService.gI().useSkill(this, pl, null, -1, null);
        }

        pl.inventory.gold -= gold;
        goldAnTrom += gold;
        stealCount++;
        Service.gI().stealMoney(pl, -gold);
        this.chat("Haha! Trộm " + Util.numberToMoney(gold) + " vàng của " + pl.name + " (tổng: " + Util.numberToMoney(goldAnTrom) + ")");

        ItemMap itemMap = new ItemMap(this.zone, 190, gold,
                (this.location.x + pl.location.x) / 2, this.location.y, this.id);
        Service.gI().dropItemMap(this.zone, itemMap);
        Service.gI().sendToAntherMePickItem(this, itemMap.itemMapId);
        this.zone.removeItemMap(itemMap);
        this.lastTimeAnTrom = System.currentTimeMillis();

        if (Util.isTrue(1, 4)) {
            int escapeX = this.location.x + Util.getOne(-1, 1) * Util.nextInt(60, 120);
            this.moveTo(escapeX, this.location.y);
        }

        if (stealCount >= 2 && Util.isTrue(1, 2)) {
            tryFlee();
        }
    }

    @Override
    public void moveTo(int x, int y) {
        byte dir = (byte) (this.location.x - x < 0 ? 1 : -1);
        byte move = (byte) Util.nextInt(35, 55);
        PlayerService.gI().playerMove(this, this.location.x + (dir == 1 ? move : -move), y);
    }

    @Override
    public void reward(Player plKill) {
        if (plKill == null) {
            return;
        }

        BadgesTaskService.updateCountBagesTask(plKill, ConstTaskBadges.BI_MOC_SACH_TUI, 1);

        if (goldAnTrom > 0 && this.zone != null) {
            int dropGold = (int) Math.min(goldAnTrom, 5_000_000);
            int piles = Math.min(5, Math.max(1, dropGold / 500_000));
            int perPile = dropGold / piles;
            for (int i = 0; i < piles; i++) {
                int x = this.location.x + Util.nextInt(-40, 40);
                int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);
                ItemMap goldDrop = new ItemMap(this.zone, 190, perPile, x, y, -1);
                Service.gI().dropItemMap(this.zone, goldDrop);
            }
            Service.gI().sendThongBao(plKill, "Boss đánh rơi " + Util.numberToMoney(dropGold) + " vàng đã trộm!");
        }

        if (Util.isTrue(1, 2)) {
            for (int i = 0; i < 10; i++) {
                int x = this.location.x + Util.nextInt(-50, 50);
                int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);
                ItemMap item77 = new ItemMap(this.zone, 77, 1, x, y, -1);
                Service.gI().dropItemMap(this.zone, item77);
            }
            Service.gI().sendThongBao(plKill, "Boss rơi 10 Ngọc Xanh!");
        } else {
            int xGold = this.location.x + Util.nextInt(-20, 20);
            int yGold = this.zone.map.yPhysicInTop(xGold, this.location.y - 24);
            ItemMap itemGold = new ItemMap(this.zone, 1507, 1, xGold, yGold, plKill.id);
            Service.gI().dropItemMap(this.zone, itemGold);
            Service.gI().sendThongBaoOK(plKill, "Bạn nhận được cái nịt!");
        }

        plKill.luckyRoundPoint += 1;
        Service.gI().sendThongBao(plKill, "+1 lần Quay Tay");
    }

    @Override
    public void active() {
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
        }
        this.attack();
        if (Util.canDoWithTime(sessionStart, sessionDurationMs)) {
            this.changeStatus(BossStatus.LEAVE_MAP);
        }
    }

    @Override
    public void joinMap() {
        int hpRandom = Util.nextInt(150, 200);
        this.name = "Ăn Trộm";
        this.nPoint.hpMax = hpRandom;
        this.nPoint.hp = this.nPoint.hpMax;
        this.nPoint.dameg = hpRandom / 10;

        goldAnTrom = 0;
        stealCount = 0;
        lastTimeFlee = 0;
        sessionStart = System.currentTimeMillis();
        sessionDurationMs = Util.nextInt(180_000, 420_000);

        joinMapSmart();
    }

    private void joinMapSmart() {
        if (this.zone == null) {
            if (this.parentBoss != null) {
                this.zone = parentBoss.zone;
            } else if (this.lastZone == null) {
                this.zone = getMapJoin();
            } else {
                this.zone = this.lastZone;
            }
        }
        if (this.zone == null) {
            this.changeStatus(BossStatus.RESPAWN);
            return;
        }
        try {
            Zone target = pickZoneWithPlayers(false);
            if (target == null) {
                for (Zone z : this.zone.map.zones) {
                    if (!BossManager.gI().checkBosses(z, BossID.AN_TROM)) {
                        target = z;
                        break;
                    }
                }
            }
            if (target == null) {
                this.changeStatus(BossStatus.REST);
                return;
            }
            this.zone = target;
            int maxX = Math.max(120, target.map.mapWidth - 100);
            int x = Util.nextInt(100, maxX);
            int y = target.map.yPhysicInTop(x, 0);
            ChangeMapService.gI().changeMap(this, this.zone, x, y);
            this.changeStatus(BossStatus.CHAT_S);
        } catch (Exception e) {
            this.changeStatus(BossStatus.REST);
        }
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.playerTarger = null;
        markRestAndSchedule();
        this.changeStatus(BossStatus.REST);
    }
}
