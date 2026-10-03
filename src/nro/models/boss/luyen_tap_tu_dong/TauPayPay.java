package nro.models.boss.luyen_tap_tu_dong;

import nro.models.boss.Boss_Manager.OtherBossManager;
import nro.models.boss.BossesData;
import nro.models.consts.ConstItem;
import nro.models.consts.ConstMap;
import nro.models.consts.ConstPlayer;
import nro.models.map.ItemMap;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import static nro.models.consts.BossType.PHOBAN;
import nro.models.consts.ConstRatio;
import nro.models.map.service.ChangeMapService;
import nro.models.services.SkillService;
import nro.models.utils.SkillUtil;

public class TauPayPay extends TrainingBoss {

    private static final byte STATE_INTRO = 0;
    private static final byte STATE_FIGHTING = 1;
    private static final byte STATE_PLAYER_DEAD = 2;
    private static final byte STATE_REVIVE_COOLDOWN = 3;

    private byte combatState = STATE_INTRO;
    private long spawnTime;
    private byte chatIntroStep;
    private long reviveCooldownStartTime;

    public TauPayPay(Player player) throws Exception {
        super(PHOBAN, BossID.TAUPAYPAY, BossesData.TAUPAYPAY);
        this.playerAtt = player;
    }

    @Override
    public void update() {
        // Nếu người chơi rời Rừng Karin, chuyển khu hoặc thoát game: thu hồi boss ngay lập tức
        if (playerAtt == null || playerAtt.zone == null
                || playerAtt.zone.map == null
                || playerAtt.zone.map.mapId != ConstMap.RUNG_KARIN
                || !playerAtt.isPl()
                || (this.zone != null && this.zone.zoneId != playerAtt.zone.zoneId)) {
            this.leaveMap();
            return;
        }

        // Quản lý trạng thái chiến đấu / chờ người chơi chết & hồi sinh
        if (combatState == STATE_FIGHTING) {
            if (playerAtt.isDie()) {
                combatState = STATE_PLAYER_DEAD;
                this.changeToTypeNonPK();
                Service.gI().sendPlayerVS(playerAtt, null, (byte) 0);
                this.chat("Hahaha! Ngươi còn quá non nớt, hãy hồi sinh rồi đấu tiếp với ta!");
            }
        } else if (combatState == STATE_PLAYER_DEAD) {
            if (!playerAtt.isDie()) {
                // Người chơi vừa hồi sinh dậy tại chỗ: chờ 5 giây cho người chơi chuẩn bị
                combatState = STATE_REVIVE_COOLDOWN;
                reviveCooldownStartTime = System.currentTimeMillis();
                this.changeToTypeNonPK();
                this.chat("Tốt lắm! Ta cho ngươi 5 giây chuẩn bị trước khi ta ra tay tiếp!");
            }
        } else if (combatState == STATE_REVIVE_COOLDOWN) {
            if (playerAtt.isDie()) {
                combatState = STATE_PLAYER_DEAD;
            } else if (Util.canDoWithTime(reviveCooldownStartTime, 5000)) {
                // Hết 5 giây hồi sinh: phát động tấn công trở lại với lượng máu hiện tại (không hồi HP)
                combatState = STATE_FIGHTING;
                this.chat("Hết giờ chuẩn bị! Xem chiêu đây!");
                this.changeToTypePK();
                Service.gI().sendPVB(playerAtt, this, ConstPlayer.PK_PVP);
            }
        }

        super.update();
    }

    @Override
    public void joinMap() {
        if (playerAtt != null && playerAtt.zone != null) {
            this.zone = playerAtt.zone;

            // Mặc định tọa độ đáp cố định tại X: 544, Y: 336 (chân Tháp Karin)
            int targetX = 544;
            int groundY = 336;

            this.spawnTime = System.currentTimeMillis();
            this.chatIntroStep = 0;
            this.combatState = STATE_INTRO;

            // idSpaceShip = DEFAULT_SPACE_SHIP và y = 5 kích hoạt hiệu ứng phi thuyền chở Tàu Pảy Pảy đáp xuống đất
            this.idMark.setIdSpaceShip(ChangeMapService.DEFAULT_SPACE_SHIP);
            ChangeMapService.gI().changeMap(this, this.zone, targetX, 5);

            // Cập nhật vị trí logic trên server về đúng mặt đất Y: 336
            this.location.y = groundY;
            this.idMark.setIdSpaceShip(ChangeMapService.NON_SPACE_SHIP);

            // 5 giây đầu: đứng yên, Non-PK (tên trắng), chưa tấn công
            this.changeToTypeNonPK();
            this.changeStatus(BossStatus.CHAT_S);

            System.out.println("[TASK 9.3] TauPayPay joinMap: Map " + this.zone.map.mapId
                    + ", Zone " + this.zone.zoneId + ", X = " + targetX + ", Y = " + groundY
                    + ", Player: " + playerAtt.name);
        }
    }

    @Override
    public boolean chatS() {
        if (combatState != STATE_INTRO) {
            return true;
        }
        long elapsed = System.currentTimeMillis() - spawnTime;
        if (chatIntroStep == 0 && elapsed >= 500) {
            this.chat("Ta là Tàu Pảy Pảy - Đệ nhất sát thủ thế giới!");
            chatIntroStep = 1;
        } else if (chatIntroStep == 1 && elapsed >= 2500) {
            this.chat("Ngươi muốn tranh đoạt Ngọc Rồng 6 sao của ta sao? Hãy nộp mạng!");
            chatIntroStep = 2;
        } else if (chatIntroStep == 2 && elapsed >= 5000) {
            this.chat("Xem chiêu đây! Đừng hòng sống sót rời khỏi Rừng Karin!");
            chatIntroStep = 3;
            combatState = STATE_FIGHTING;
            this.changeToTypePK();
            Service.gI().sendPVB(playerAtt, this, ConstPlayer.PK_PVP);
            return true;
        }
        return combatState == STATE_FIGHTING;
    }

    @Override
    public void active() {
        if (combatState != STATE_FIGHTING || playerAtt == null || playerAtt.isDie()) {
            return; // Chưa phải lúc chiến đấu hoặc người chơi đang chết/chuẩn bị
        }
        if (this.typePk == ConstPlayer.NON_PK) {
            this.changeToTypePK();
            Service.gI().sendPVB(playerAtt, this, ConstPlayer.PK_PVP);
        }
        this.attack();
    }

    @Override
    public void attack() {
        if (combatState != STATE_FIGHTING || playerAtt == null || playerAtt.isDie()) {
            return; // Đứng yên tuyệt đối khi chưa phát động tấn công
        }
        try {
            if (playerAtt.zone != null && this.zone != null
                    && this.zone.map.mapId == playerAtt.zone.map.mapId
                    && this.zone.zoneId == playerAtt.zone.zoneId) {
                if (this.isDie()) {
                    return;
                }
                hutMau();
                tanHinh();
                bayLungTung();
                buffPea();
                if (this.playerSkill.skills != null && !this.playerSkill.skills.isEmpty()) {
                    this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
                }
                if (playerAtt.location != null && Util.getDistance(this, playerAtt) <= this.getRangeCanAttackWithSkillSelect()) {
                    if (Util.isTrue(15, ConstRatio.PER100) && SkillUtil.isUseSkillChuong(this)) {
                        goToXY(playerAtt.location.x + (Util.getOne(-1, 1) * Util.nextInt(20, 80)),
                                Util.nextInt(10) % 2 == 0 ? playerAtt.location.y : playerAtt.location.y - Util.nextInt(0, 50), false);
                    }
                    SkillService.gI().useSkill(this, playerAtt, null, -1, null);
                    checkPlayerDie(playerAtt);
                } else if (playerAtt.location != null) {
                    goToPlayer(playerAtt, false);
                }
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    @Override
    public void checkPlayerDie(Player pl) {
        if (pl != null && pl.isDie()) {
            combatState = STATE_PLAYER_DEAD;
            this.changeToTypeNonPK();
            Service.gI().sendPlayerVS(playerAtt, null, (byte) 0);
            this.chat("Hahaha! Ngươi còn quá non nớt, hãy hồi sinh rồi đấu tiếp với ta!");
        }
    }

    @Override
    public void die(Player plKill) {
        this.chat("Khá khen cho ngươi... Ta sẽ trở lại!");
        if (plKill != null && !plKill.isBot) {
            reward(plKill);
        }
        // Kiểm tra hoàn thành nhiệm vụ tiêu diệt boss nếu có
        TaskService.gI().checkDoneTaskKillBoss(plKill, this);

        // Phi thuyền đáp xuống đón Tàu Pảy Pảy bay đi
        ChangeMapService.gI().spaceShipArrive(this, (byte) 2, ChangeMapService.DEFAULT_SPACE_SHIP);
        this.leaveMap();
    }

    @Override
    public void reward(Player plKill) {
        if (plKill == null || this.zone == null || this.zone.map == null) {
            return;
        }
        if (this.zone.map.mapId != ConstMap.RUNG_KARIN) {
            return;
        }
        if (!TaskService.gI().isCurrentTaskTauPayPayQuest(plKill)) {
            return;
        }
        try {
            int x = this.location.x + Util.nextInt(-20, 20);
            int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);
            if (y <= 0) {
                y = 336;
            }
            ItemMap item = new ItemMap(this.zone, ConstItem.NGOC_RONG_6_SAO, 1, x, y, plKill.id);
            Service.gI().dropItemMap(this.zone, item);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        this.lastTimeRest = System.currentTimeMillis();
        this.changeStatus(BossStatus.REST);
        OtherBossManager.gI().removeBoss(this);
        this.dispose();
    }

    @Override
    public void buffPea() {
        // Tuyệt đối không hồi máu (HP boss giữ nguyên 100%)
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            // Chỉ nhận sát thương khi đang trong trạng thái chiến đấu (STATE_FIGHTING)
            if (combatState != STATE_FIGHTING) {
                return 0;
            }

            if (!piercing && Util.isTrue(400, 1000)) {
                this.chat("Xí hụt");
                return 0;
            }

            if (!TaskService.gI().isCurrentTaskTauPayPayQuest(plAtt)) {
                return 0;
            }
            damage = this.nPoint.subDameInjureWithDeff(damage);
            this.nPoint.subHP(damage);

            if (this.nPoint.hp > 0 && this.nPoint.hp < this.nPoint.hpMax / 5) {
                if (Util.canDoWithTime(lastTimeChat, 2000)) {
                    String[] text = {"AAAAAAAAA", "ai da"};
                    this.chat(text[Util.nextInt(text.length)]);
                }
            }

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
    public void afk() {
        // Không tự ý rời map khi afk
    }
}
