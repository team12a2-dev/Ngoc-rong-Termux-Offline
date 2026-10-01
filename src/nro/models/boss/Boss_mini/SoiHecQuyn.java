package nro.models.boss.Boss_mini;

import nro.models.boss.Boss;
import nro.models.boss.BossesData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.ConstTaskBadges;
import java.util.ArrayList;
import java.util.List;
import nro.models.map.ItemMap;
import nro.models.map.Zone;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.services.SkillService;
import nro.models.task.BadgesTaskService;
import nro.models.utils.Logger;
import nro.models.utils.Util;

public class SoiHecQuyn extends Boss {

    private long lastTimeDrop;
    private long st;
    private int timeLeave;
    private boolean KiemTraNhatXuong = false;
    private long ThoiGianNhatXuong = 0;
    private long lastTimRestPawn;

    public SoiHecQuyn() throws Exception {
        super(BossID.SOI_HEC_QUYN1, BossesData.SOI_HEC_QUYN);
    }

    @Override
    public void joinMap() {
        if (zoneFinal != null) {
            joinMapByZone(zoneFinal);
            this.changeStatus(BossStatus.CHAT_S);
            this.wakeupAnotherBossWhenAppear();
            this.ThoiGianNhatXuong = 0;
            this.KiemTraNhatXuong = false;
            return;
        }

        if (this.zone == null) {
            if (this.parentBoss != null) {
                this.zone = parentBoss.zone;
            } else {
                this.zone = getRandomMiniSpawnZone();
            }
        }

        if (this.zone != null) {
            try {
                List<Zone> availableZones = new ArrayList<>();

                // Lọc các zone thỏa mãn điều kiện: số lượng người chơi <= 10 và không có boss
                for (Zone zone : this.zone.map.zones) {
                    if (zone.getNumOfPlayers() <= 10 && !BossManager.gI().checkBosses(zone, BossID.SOI_HEC_QUYN)) {
                        availableZones.add(zone);
                    }
                }

                if (!availableZones.isEmpty()) {
                    // Random chọn một zone hợp lệ
                    int randomIndex = Util.nextInt(availableZones.size());
                    this.zone = availableZones.get(randomIndex);
                    ChangeMapService.gI().changeMap(this, this.zone, Util.nextInt(100, 500), this.zone.map.yPhysicInTop(this.location.x,
                            this.location.y - 24));
                    this.changeStatus(BossStatus.CHAT_S);
                    st = System.currentTimeMillis();
                    timeLeave = Util.nextInt(100000, 300000);
                } else {
                    this.leaveMapNew();
                    return;
                }
            } catch (Exception e) {
                Logger.error(this.data[0].getName() + ": Lỗi đang tiến hành REST\n");
                this.changeStatus(BossStatus.REST);
            }
        } else {
            Logger.error(this.data[0].getName() + ": Lỗi map đang tiến hành RESPAWN\n");
            this.changeStatus(BossStatus.RESPAWN);
        }
    }

    @Override
    public void chatM() {
        if (this.data[this.currentLevel].getTextM().length == 0) {
            return;
        }
        if (!Util.canDoWithTime(this.lastTimeChatM, this.timeChatM)) {
            return;
        }
        String textChat = this.data[this.currentLevel].getTextM()[Util.nextInt(0, this.data[this.currentLevel].getTextM().length - 1)];
        int prefix = Integer.parseInt(textChat.substring(1, textChat.lastIndexOf("|")));
        textChat = textChat.substring(textChat.lastIndexOf("|") + 1);
        this.chat(prefix, textChat);
        this.lastTimeChatM = System.currentTimeMillis();
        this.timeChatM = Util.nextInt(3000, 20000);
    }

    @Override
    public void active() {
        this.attack();
    }

    @Override
    public void autoLeaveMap() {
        if (Util.canDoWithTime(st, timeLeave)) {
            this.leaveMapNew();
        }
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().exitMap(this);
        this.lastZone = null;
        markRestAndSchedule();
        this.changeStatus(BossStatus.REST);

    }

    public void NhatXuong() {
        KiemTraNhatXuong = true;
        ThoiGianNhatXuong = System.currentTimeMillis();

    }

    public boolean KiemTraNhatXuong() {
        return KiemTraNhatXuong;
    }

    @Override
    public void attack() {
        if (Util.canDoWithTime(this.lastTimeAttack, 600)) {
            this.lastTimeAttack = System.currentTimeMillis();
            try {
                Player pl = getPlayerAttack();
                if (pl == null || pl.location == null || pl.isDie()
                        || this.playerSkill == null || this.playerSkill.skills == null
                        || this.playerSkill.skills.isEmpty()) {
                    return;
                }
                this.playerSkill.skillSelect = this.playerSkill.skills.get(Util.nextInt(0, this.playerSkill.skills.size() - 1));
                int distance = Util.getDistance(this, pl);
                if (distance <= this.getRangeCanAttackWithSkillSelect()) {
                    if (distance > 50 && Util.isTrue(1, 5)) {
                        this.moveTo(pl.location.x + Util.getOne(-1, 1) * Util.nextInt(20, 80), pl.location.y);
                    }
                    SkillService.gI().useSkill(this, pl, null, -1, null);
                    checkPlayerDie(pl);
                } else {
                    this.moveToPlayer(pl);
                }
                if (ThoiGianNhatXuong > 0) {
                    if (Util.canDoWithTime(ThoiGianNhatXuong, 5000)) {
                        ThoiGianNhatXuong = 0;
                        KiemTraNhatXuong = false;
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (this.isDie()) {
            return 0;
        }
        int actualDamage = (int) Math.max(1L, Math.min(Integer.MAX_VALUE, damage));
        this.nPoint.subHP(actualDamage);
        if (this.isDie()) {
            this.setDie(plAtt);
            this.die(plAtt);
        }
        return actualDamage;
    }

    @Override
    public void reward(Player plKill) {
        if (plKill == null || this.zone == null || this.location == null) {
            return;
        }
        try {
            int[] itemDropIds = {1591, 1594};
            for (int itemId : itemDropIds) {
                int x = this.location.x + Util.nextInt(-20, 20);
                int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);

                ItemMap itemMap = new ItemMap(this.zone, itemId, 1, x, y, plKill.id);
                Service.gI().dropItemMap(this.zone, itemMap);
            }
            BadgesTaskService.updateCountBagesTask(plKill, ConstTaskBadges.KE_THAO_TUNG_SOI, 1);
            int diem = 5;
            plKill.event.addEventPoint(diem);
            Service.gI().sendThongBao(plKill, "+5 Point");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

}
