package nro.models.boss.Boss_mini;

import nro.models.boss.Boss;
import nro.models.boss.BossesData;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.consts.ConstRatio;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import nro.models.consts.ConstTaskBadges;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.services.EffectSkillService;
import nro.models.services.ItemTimeService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.map.service.ChangeMapService;
import nro.models.skill.Skill;
import nro.models.task.BadgesTaskService;
import nro.models.utils.Util;

public class Virut extends Boss {

    private final Map<Long, Long> globalEffectTimers = new ConcurrentHashMap<>();
    private long st;

    public Virut() throws Exception {
        super(BossID.Virut, new BossData(
                "Virut " + Util.nextInt(1, 49),
                ConstPlayer.TRAI_DAT,
                new short[]{651, 778, 779, -1, -1, -1},
                10,
                BossesData.MINI_BOSS_MAPS,
                new int[]{5, 7, 0, 14},
                new int[][]{{Skill.DRAGON, 7, 1000}},
                new String[]{
                    "|-1|Khè khè... ta ngửi thấy mùi sinh lực của các ngươi.",
                    "|-1|Đừng chạy! Virus của ta sẽ tìm được ngươi.",
                    "|-1|Một khu vực mới, một ổ dịch mới!"
                }, // Text chat 1
                new String[]{
                    "|-1|Ha ha! Càng chống cự, các ngươi càng yếu đi.",
                    "|-1|Ai sẽ là vật chủ tiếp theo đây?",
                    "|-1|Thuốc giải ư? Không có đâu, chỉ có tuyệt vọng thôi!"
                }, // Text chat 2
                new String[]{
                    "|-1|Khè... khè... lần này ta sẽ quay lại với ổ dịch lớn hơn!",
                    "|-1|Các ngươi tưởng đã diệt được ta sao?"
                },
                600));
    }

    @Override
    public synchronized void die(Player plKill) {
        if (this.bossStatus == BossStatus.DIE || this.bossStatus == BossStatus.CHAT_E
                || this.bossStatus == BossStatus.LEAVE_MAP) {
            return;
        }
        this.setDie(plKill);
        if (plKill != null) {
            this.reward(plKill);
        }
        this.changeStatus(BossStatus.DIE);
    }

    private void applyEffect(Player player) {
        long effectEndTime = System.currentTimeMillis() + 300000;
        globalEffectTimers.put(player.id, effectEndTime);
        ItemTimeService.gI().sendItemTime(player, 7143, 10);
        this.chat("Khè Khè, " + player.name + " Đã bị nhiễm ");
    }

    private void checkGlobalEffects() {
        long currentTime = System.currentTimeMillis();

        globalEffectTimers.forEach((playerId, effectEndTime) -> {
            if (currentTime >= effectEndTime) {
                Player player = Client.gI().getPlayer(playerId);
                if (player != null) {
                    if (!player.isDie()) {
                        // Kiểm tra xác suất 30% để player bị chết
                        if (Util.isTrue(80, 100)) {
                            player.injured(null, player.nPoint.hp, true, false);
                        }
                    }
                }
                globalEffectTimers.remove(playerId);
            }
        });
    }

    private void updateOdo() {
        try {
            if (Util.isTrue(30, 100)) {
                List<Player> playersMap = this.zone.getNotBosses();
                for (Player pl : playersMap) {
                    if (pl != null && pl.nPoint != null && !this.equals(pl) && !pl.isBoss && !pl.isDie()
                            && Util.getDistance(this, pl) <= 200) {
                        applyEffect(pl);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 800) && this.typePk == ConstPlayer.PK_ALL) {
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = this.getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    return;
                }

                this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));

                if (Util.getDistance(this, pl) <= 40) {
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                    if (!globalEffectTimers.containsKey(pl.id)
                            || System.currentTimeMillis() >= globalEffectTimers.get(pl.id)) {
                        this.updateOdo();
                    }
                } else {
                    this.moveToPlayer(pl);
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    @Override
    public void reward(Player plKill) {
        if (plKill == null || this.zone == null || this.location == null) {
            return;
        }
        int[] itemIds = {1591, 1594};
        for (int i = 0; i < itemIds.length; i++) {
            int itemId = itemIds[i];
            ItemMap itemDrop = new ItemMap(
                    this.zone,
                    itemId,
                    1,
                    this.location.x + Util.nextInt(-30, 30),
                    this.zone.map.yPhysicInTop(this.location.x, this.location.y - 24),
                    plKill.id
            );
            Service.gI().dropItemMap(this.zone, itemDrop);
        }

        int diem = 5;
        plKill.event.addEventPoint(diem);
        Service.gI().sendThongBao(plKill, "+5 Point sự kiện từ Virut");
    }

    @Override
    public void joinMap() {
        this.name = "Virut " + Util.nextInt(1, 49);
        this.nPoint.hpMax = 100;
        this.nPoint.hp = this.nPoint.hpMax;
        this.nPoint.dameg = 1;
        globalEffectTimers.clear();
        this.joinMap2();
        st = System.currentTimeMillis();
    }

    public void joinMap2() {
        if (this.zone == null) {
            if (this.parentBoss != null) {
                this.zone = parentBoss.zone;
            } else {
                this.zone = getRandomMiniSpawnZone();
            }
        }
        if (this.zone != null) {
            try {
                ChangeMapService.gI().changeMap(this, this.zone, -1, -1);

                this.changeStatus(BossStatus.CHAT_S);
            } catch (Exception e) {
                this.changeStatus(BossStatus.REST);
            }
        } else {
            this.changeStatus(BossStatus.RESPAWN);
        }
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        globalEffectTimers.clear();
        this.lastTimeRest = System.currentTimeMillis();
        this.changeStatus(BossStatus.REST);
    }
    
    @Override
    public void active() {
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
        }
        this.attack();
        this.checkGlobalEffects();
        if (Util.canDoWithTime(st, 900000)) {
            this.changeStatus(BossStatus.LEAVE_MAP);
        }
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            int actualDamage = 1;
            this.nPoint.subHP(actualDamage);

            if (this.nPoint.hp <= 0) {
                this.die(plAtt);
            }

            return actualDamage;
        } else {
            return 0;
        }
    }

}
