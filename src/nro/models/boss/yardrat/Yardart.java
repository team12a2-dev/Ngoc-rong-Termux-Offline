package nro.models.boss.yardrat;

import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import nro.models.consts.BossType;
import nro.models.item.Item;
import nro.models.map.ItemMap;
import nro.models.map.service.ChangeMapService;
import java.util.List;
import nro.models.player.Pet;
import nro.models.player.Player;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Util;

public abstract class Yardart extends Boss {

    public Yardart(int id, BossData... data) throws Exception {
        super(BossType.YARDART, id, true, false, data);
    }

    private int getYardartSlotIndex() {
        if (this.id >= BossID.DOI_TRUONG_5 && this.id <= BossID.TAP_SU_0) {
            return (int) (Math.abs(this.id - BossID.TAP_SU_0) % 6);
        }
        if (this.parentBoss == null) {
            return 5;
        }
        return Math.min(Math.max(0, this.lv), 4);
    }

    @Override
    public void joinMap() {
        if (this.zoneFinal != null) {
            this.zone = this.zoneFinal;
        } else if (this.parentBoss != null && this.parentBoss.zone != null) {
            this.zone = this.parentBoss.zone;
        } else if (this.zone == null) {
            this.zone = getMapJoin();
        }

        if (this.zone != null && this.zone.map != null) {
            int mapW = this.zone.map.mapWidth;
            int minX = 120;
            int maxX = mapW > 240 ? mapW - 120 : 1380;
            int totalSegments = 6;
            int segmentWidth = Math.max(50, (maxX - minX) / totalSegments);

            int slotIndex = getYardartSlotIndex();
            int startX = minX + slotIndex * segmentWidth;
            int x = startX + Util.nextInt(20, Math.max(25, segmentWidth - 20));
            int y = this.zone.map.yPhysicInTop(x, 100);

            ChangeMapService.gI().changeMap(this, this.zone, x, y);
            Service.gI().sendFlagBag(this);
            this.notifyJoinMap();
            this.changeStatus(BossStatus.CHAT_S);
            this.wakeupAnotherBossWhenAppear();
        }
    }

    @Override
    public Player getPlayerAttack() {
        if (this.zone == null) {
            return null;
        }
        if (this.playerTarger != null && (this.playerTarger.isDie() || !this.zone.equals(this.playerTarger.zone))) {
            this.playerTarger = null;
        }
        if (this.playerTarger != null && this.playerTarger.isPet && ((Pet) this.playerTarger).master != null && ((Pet) this.playerTarger).master.equals(this)) {
            this.playerTarger = null;
        }

        long now = System.currentTimeMillis();
        // Dọn dẹp bảng thù hận cũ (> 15 giây không gây sát thương hoặc đã rời map / chết)
        threatMap.entrySet().removeIf(e -> {
            Player pl = e.getValue().player;
            return pl == null || pl.isDie() || !this.zone.equals(pl.zone) || (now - e.getValue().lastAttackTime > 15_000L);
        });

        // Nếu target hiện tại đang ở trên cao (deltaY > 120) hoặc đi quá xa và không phải kẻ tấn công trong threatMap -> hủy target
        if (this.playerTarger != null && !threatMap.containsKey(this.playerTarger.id)) {
            int deltaY = Math.abs(this.playerTarger.location.y - this.location.y);
            int deltaX = Math.abs(this.playerTarger.location.x - this.location.x);
            if (deltaY > 120 || deltaX > 350) {
                this.playerTarger = null;
            }
        }

        if (this.playerTarger == null || Util.canDoWithTime(this.lastTimeTargetPlayer, this.timeTargetPlayer)) {
            Player bestTarget = null;
            long highestThreat = -1;

            // 1. Ưu tiên cao nhất: Kẻ thù trong threatMap (đã đánh Boss)
            for (ThreatEntry entry : threatMap.values()) {
                Player pl = entry.player;
                if (pl != null && !pl.isDie() && this.zone.equals(pl.zone)) {
                    if (entry.totalDamage > highestThreat) {
                        highestThreat = entry.totalDamage;
                        bestTarget = pl;
                    }
                }
            }

            // 2. Nếu không có kẻ đánh boss: Chỉ chủ động tìm người chơi ở gần mặt đất (không bay trên cao)
            if (bestTarget == null) {
                List<Player> players = this.zone.getNotBosses();
                int minDistance = Integer.MAX_VALUE;
                for (Player pl : players) {
                    if (pl != null && !pl.isDie() && !pl.isNewPet && this.zone.equals(pl.zone)) {
                        if (pl.isPet && ((Pet) pl).master != null && ((Pet) pl).master.equals(this)) {
                            continue;
                        }
                        if (pl.effectSkin != null && pl.effectSkin.isVoHinh) {
                            continue;
                        }
                        int deltaY = Math.abs(pl.location.y - this.location.y);
                        int deltaX = Math.abs(pl.location.x - this.location.x);
                        // Chỉ phát động tấn công người chơi ở tầm thấp/mặt đất (deltaY <= 100) và trong phạm vi gần (deltaX <= 280)
                        if (deltaY <= 100 && deltaX <= 280) {
                            int dist = Util.getDistance(this, pl);
                            if (dist < minDistance) {
                                minDistance = dist;
                                bestTarget = pl;
                            }
                        }
                    }
                }
            }

            this.playerTarger = bestTarget;
            this.lastTimeTargetPlayer = now;
            this.timeTargetPlayer = Util.nextInt(3000, 5000);
        }
        return this.playerTarger;
    }

    @Override
    public void moveTo(int x, int y) {
        if (this.zone != null && this.zone.map != null) {
            byte dir = (byte) (this.location.x - x < 0 ? 1 : -1);
            byte move = (byte) Util.nextInt(35, 55);
            int newX = this.location.x + (dir == 1 ? move : -move);
            int newY = this.zone.map.yPhysicInTop(newX, 100);
            PlayerService.gI().playerMove(this, newX, newY);
        } else {
            super.moveTo(x, y);
        }
    }

    @Override
    public void reward(Player plKill) {
        if (plKill != null && this.zone != null) {
            ItemMap item = new ItemMap(
                    this.zone,
                    590, // Bí kiếp Yardrat
                    1,
                    this.location.x + Util.nextInt(-30, 30),
                    this.zone.map.yPhysicInTop(this.location.x, this.location.y - 24),
                    plKill.id
            );
            item.options.add(new Item.ItemOption(31, Util.nextInt(1, 5)));
            Service.gI().dropItemMap(this.zone, item);
            TaskService.gI().checkDoneTaskKillBoss(plKill, this);
        }
    }
}
