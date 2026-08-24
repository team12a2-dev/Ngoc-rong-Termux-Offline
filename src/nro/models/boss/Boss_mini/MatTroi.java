package nro.models.boss.Boss_mini;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstPlayer;
import nro.models.consts.ConstTaskBadges;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.map.service.ChangeMapService;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.services.ItemTimeService;
import nro.models.services.Service;
import nro.models.services.SkillService;
import nro.models.skill.Skill;
import nro.models.task.BadgesTaskService;
import nro.models.utils.Util;

/**
 * Boss Mặt Trời — kiêu ngạo, thiêu đốt, giao tiếp khi lại gần người chơi.
 */
public class MatTroi extends Boss {

    private static final int BURN_RANGE = 200;
    private static final int SCORCH_RANGE = 40;
    private static final int APPROACH_RANGE_MIN = 45;
    private static final int APPROACH_RANGE_MAX = 160;
    private static final long APPROACH_CHAT_COOLDOWN_MS = 10_000;

    private static final String[] APPROACH_LINES = {
            "%s, dừng lại! Ngươi đang bước vào vùng nắng gắt của ta.",
            "Hửm... %s tự ý tiến lại gần ta? Gan thật — hay là ngu?",
            "%s, ta cảnh báo lần cuối: lùi lại, trước khi ta cho ngươi nếm tia nắng.",
            "Ồ, %s... ngươi cảm thấy nóng chưa? Ta mới chiếu nhẹ thôi đấy.",
            "%s, đừng tưởng che ô là đủ — trước ta không có chỗ trốn.",
    };

    private static final String[] BURN_LINES = {
            "Hừm... %s, làn da ngươi đã đỏ lên rồi. Cảm nhận sức nóng của ta chưa?",
            "%s — ta vừa phủ một lớp nắng lên ngươi. Tan chảy đi!",
            "Nghe này %s: kem chống nắng vô dụng trước uy lực của ta!",
            "%s, ngươi đã bị thiêu bởi tia nắng của ta. Đau chứ?",
            "Cháy lên đi, %s! Ta là Mặt Trời — không ai thoát khỏi ánh ta!",
    };

    private static final String[] SCORCH_LINES = {
            "%s, quá gần rồi! Ngươi muốn bị nướng chín sao?",
            "Haha! %s — cảm nhận hơi nóng của ta đi!",
    };

    private final Map<Long, Long> globalEffectTimers = new ConcurrentHashMap<>();
    private final Map<Long, Long> lastApproachChatMs = new ConcurrentHashMap<>();
    private long st;

    public MatTroi() throws Exception {
        super(BossID.MAT_TROI, new BossData(
                "Mặt Trời " + Util.nextInt(1, 49),
                ConstPlayer.TRAI_DAT,
                new short[]{1501, 1502, 1503, -1, -1, -1},
                10,
                new int[]{100},
                new int[]{5, 7, 0, 14},
                new int[][]{{Skill.DRAGON, 7, 1000}},
                new String[]{
                    "|-1|Hm... Trái Đất lại có kẻ mời ta xuống? Ta là Mặt Trời — chủ nhân của ban ngày.",
                    "|-1|Đừng nhìn thẳng vào ta... trừ khi ngươi muốn bị thiêu đốt.",
                    "|-1|Xa ra! Đây là lãnh địa của ta. Ai lại gần sẽ hối hận.",
                },
                new String[]{
                    "|-1|Cháy lên đi! Ta là nguồn sáng duy nhất ngươi cần biết!",
                    "|-1|Trời nóng? Không — chỉ có ta đang nghiêm túc thôi.",
                    "|-1|Kem chống nắng? Ha ha, vô dụng trước uy lực của ta!",
                    "|-1|Đứng yên — để ta chiếu sáng cho ngươi... cho đến khi bỏng!",
                    "|-1|Các ngươi chỉ là bọ kiến dưới ánh nắng của ta thôi.",
                    "|-2|*lau mồ hôi* Trời nóng quá!",
                    "|-2|Ai mang nước cho tôi với...",
                    "|-2|Ôi, da tôi đỏ rồi!",
                },
                new String[]{
                    "|-1|Hoàng hôn đến... ta lặn về chân trời. Hẹn ngày mai, bọ nhỏ.",
                },
                600));
    }

    @Override
    public void die(Player plKill) {
        if (plKill != null) {
            this.chat(plKill.name + "... ngươi dám chặn ánh sáng của ta sao? Không thể...");
        } else {
            this.chat("Ta... bị che khuất... không thể nào...");
        }
        this.reward(plKill);
        this.changeStatus(BossStatus.DIE);
    }

    private void applyEffect(Player player) {
        long effectEndTime = System.currentTimeMillis() + 30000;
        globalEffectTimers.put(player.id, effectEndTime);
        ItemTimeService.gI().sendItemTime(player, 12953, 60);
        this.chat(String.format(BURN_LINES[Util.nextInt(0, BURN_LINES.length - 1)], player.name));
    }

    private void chatOnApproach(Player pl) {
        if (pl == null || pl.isDie() || this.zone == null) {
            return;
        }
        int dist = Util.getDistance(this, pl);
        if (dist < APPROACH_RANGE_MIN || dist > APPROACH_RANGE_MAX) {
            return;
        }
        long last = lastApproachChatMs.getOrDefault(pl.id, 0L);
        if (!Util.canDoWithTime(last, APPROACH_CHAT_COOLDOWN_MS)) {
            return;
        }
        String line = APPROACH_LINES[Util.nextInt(0, APPROACH_LINES.length - 1)];
        this.chat(String.format(line, pl.name));
        lastApproachChatMs.put(pl.id, System.currentTimeMillis());
    }

    private void chatOnScorch(Player pl) {
        if (pl == null || !Util.isTrue(2, 5)) {
            return;
        }
        String line = SCORCH_LINES[Util.nextInt(0, SCORCH_LINES.length - 1)];
        this.chat(String.format(line, pl.name));
    }

    private void checkGlobalEffects() {
        long currentTime = System.currentTimeMillis();

        globalEffectTimers.forEach((playerId, effectEndTime) -> {
            if (currentTime >= effectEndTime) {
                Player player = Client.gI().getPlayer(playerId);
                if (player != null) {
                    if (!player.isDie()) {
                        if (Util.isTrue(80, 100)) {
                            player.injured(null, player.nPoint.hp, true, false);
                        }
                    }
                }
                globalEffectTimers.remove(playerId);
            }
        });
    }

    private void updateBurnAura() {
        try {
            if (Util.isTrue(30, 100)) {
                List<Player> playersMap = this.zone.getNotBosses();
                for (Player pl : playersMap) {
                    if (pl != null && pl.nPoint != null && !this.equals(pl) && !pl.isBoss && !pl.isDie()
                            && Util.getDistance(this, pl) <= BURN_RANGE) {
                        applyEffect(pl);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void chatM() {
        if (this.typePk == ConstPlayer.NON_PK) {
            return;
        }
        if (this.data[this.currentLevel].getTextM().length == 0) {
            return;
        }
        if (!Util.canDoWithTime(this.lastTimeChatM, this.timeChatM)) {
            return;
        }
        String textChat = this.data[this.currentLevel].getTextM()[
                Util.nextInt(0, this.data[this.currentLevel].getTextM().length - 1)];
        int prefix = Integer.parseInt(textChat.substring(1, textChat.lastIndexOf("|")));
        textChat = textChat.substring(textChat.lastIndexOf("|") + 1);
        this.chat(prefix, textChat);
        this.lastTimeChatM = System.currentTimeMillis();
        this.timeChatM = Util.nextInt(5000, 18000);
    }

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 3000) && this.typePk == ConstPlayer.PK_ALL) {
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = this.getPlayerAttack();
                if (pl == null || pl.isDie()) {
                    return;
                }

                this.playerSkill.skillSelect = this.playerSkill.skills.get(
                        Util.nextInt(0, this.playerSkill.skills.size() - 1));

                int dist = Util.getDistance(this, pl);
                if (dist <= SCORCH_RANGE) {
                    chatOnScorch(pl);
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                    if (!globalEffectTimers.containsKey(pl.id)
                            || System.currentTimeMillis() >= globalEffectTimers.get(pl.id)) {
                        this.updateBurnAura();
                    }
                } else {
                    chatOnApproach(pl);
                    this.moveToPlayer(pl);
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    @Override
    public void reward(Player plKill) {
        BadgesTaskService.updateCountBagesTask(plKill, ConstTaskBadges.KOL, 1);
        int x = this.location.x;
        int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);
        if (Util.isTrue(50, 100)) {
            int[] costumes = {1562};
            int costumeId = costumes[Util.nextInt(costumes.length)];

            ItemMap itemMap = new ItemMap(this.zone, costumeId, 1, x, y, plKill.id);

            itemMap.options.add(new Item.ItemOption(50, Util.nextInt(7, 10)));
            itemMap.options.add(new Item.ItemOption(77, Util.nextInt(7, 10)));
            itemMap.options.add(new Item.ItemOption(103, Util.nextInt(7, 10)));
            itemMap.options.add(new Item.ItemOption(30, 0));
            itemMap.options.add(new Item.ItemOption(93, Util.nextInt(2, 5)));

            Service.gI().dropItemMap(this.zone, itemMap);
        }
    }

    @Override
    public void joinMap() {
        this.name = "Mặt Trời " + Util.nextInt(1, 49);
        this.nPoint.hpMax = 100;
        this.nPoint.hp = this.nPoint.hpMax;
        this.nPoint.dameg = 1;
        lastApproachChatMs.clear();
        this.joinMap2();
        st = System.currentTimeMillis();
    }

    public void joinMap2() {
        if (this.zone == null) {
            if (this.parentBoss != null) {
                this.zone = parentBoss.zone;
            } else if (this.lastZone == null) {
                this.zone = getMapJoin();
            } else {
                this.zone = this.lastZone;
            }
        }
        if (this.zone != null) {
            try {
                int zoneid = 0;
                this.zone = this.zone.map.zones.get(zoneid);
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
        this.chat("Ban ngày kết thúc. Ta lặn về chân trời — may mắn là các ngươi còn sống.");
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        lastApproachChatMs.clear();
        markRestAndSchedule();
        this.changeStatus(BossStatus.REST);
    }

    @Override
    public void active() {
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
        }
        this.attack();
        if (Util.canDoWithTime(st, 900000)) {
            this.changeStatus(BossStatus.LEAVE_MAP);
            this.checkGlobalEffects();
        }
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            int actualDamage = 1;
            this.nPoint.subHP(actualDamage);

            if (plAtt != null && Util.isTrue(1, 3)) {
                this.chat(plAtt.name + ", đánh ta cũng vô ích — ngươi vẫn phải chịu nắng thôi!");
            }

            if (this.nPoint.hp <= 0) {
                this.die(plAtt);
            }

            return actualDamage;
        } else {
            return 0;
        }
    }
}
