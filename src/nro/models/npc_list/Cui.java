package nro.models.npc_list;

import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.consts.BossStatus;
import nro.models.consts.ConstNpc;
import nro.models.consts.ConstTask;
import nro.models.map.Zone;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.map.service.MapService;
import nro.models.map.service.NpcService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.Util;
import java.util.ArrayList;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class Cui extends Npc {

    private final int COST_FIND_BOSS = 5_000_000;

    public Cui(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    private void teleportToBoss(Player player, int bossId) {
        Boss boss = BossManager.gI().getBosses().stream()
                .filter(b -> b != null && b.id == bossId && !b.isDie() && b.zone != null && !MapService.gI().isMapPhoBan(b.zone.map.mapId))
                .findFirst().orElse(null);

        if (boss != null && boss.zone != null) {
            if (player.inventory.gold >= COST_FIND_BOSS) {
                player.inventory.gold -= COST_FIND_BOSS;
                Service.gI().sendMoney(player);
                ChangeMapService.gI().changeMapBySpaceShip(player, boss.zone, boss.location.x);
            } else {
                Service.gI().sendThongBao(player, "Không đủ vàng, còn thiếu "
                        + Util.numberToMoney(COST_FIND_BOSS - player.inventory.gold) + " vàng");
            }
        } else {
            Boss restingBoss = BossManager.gI().getBosses().stream()
                    .filter(b -> b != null && b.id == bossId)
                    .findFirst().orElse(null);
            if (restingBoss != null) {
                long delay = restingBoss.getNextRestDelayMs() > 0 ? restingBoss.getNextRestDelayMs() : (restingBoss.getSecondsRest() * 1000L);
                long timeLeftMs = (restingBoss.getLastTimeRest() + delay) - System.currentTimeMillis();
                long totalSec = Math.max(0, timeLeftMs / 1000);
                long min = totalSec / 60;
                long sec = totalSec % 60;
                String bossName = restingBoss.data[0].getName();
                if (totalSec > 0) {
                    Service.gI().sendThongBao(player, bossName + " đã bị tiêu diệt và đang hồi phục thể lực, dự kiến xuất hiện sau "
                            + (min > 0 ? (min + " phút ") : "") + sec + " giây nữa!");
                } else {
                    Service.gI().sendThongBao(player, bossName + " sắp sửa xuất hiện tại khu vực, hãy thử lại sau giây lát!");
                }
            } else {
                Service.gI().sendThongBao(player, "Hiện chưa thể xác định vị trí của mục tiêu, vui lòng thử lại sau!");
            }
        }
    }

    @Override
    public void openBaseMenu(Player pl) {
        if (canOpenNpc(pl)) {
            if (!TaskService.gI().checkDoneTaskTalkNpc(pl, this)) {
                if (pl.playerTask.taskMain.id == 7) {
                    NpcService.gI().createTutorial(pl, this.avartar, "Hãy lên đường cứu đứa bé nhà tôi\nChắc bây giờ nó đang sợ hãi lắm rồi");
                } else {
                    switch (this.mapId) {
                        case 19 -> {
                            int taskId = TaskService.gI().getIdTask(pl);
                            switch (taskId) {
                                case ConstTask.TASK_19_0 ->
                                    this.createOtherMenu(pl, ConstNpc.MENU_FIND_KUKU,
                                            "Đội quân của Fide đang ở Thung lũng Nappa, ta sẽ đưa ngươi đến đó",
                                            "Đến chỗ\nKuku", "Đến Cold", "Đến\nNappa", "Từ chối");
                                case ConstTask.TASK_19_1 ->
                                    this.createOtherMenu(pl, ConstNpc.MENU_FIND_MAP_DAU_DINH,
                                            "Đội quân của Fide đang ở Thung lũng Nappa, ta sẽ đưa ngươi đến đó",
                                            "Đến chỗ\nMập đầu đinh", "Đến Cold", "Đến\nNappa", "Từ chối");
                                case ConstTask.TASK_19_2 ->
                                    this.createOtherMenu(pl, ConstNpc.MENU_FIND_RAMBO,
                                            "Đội quân của Fide đang ở Thung lũng Nappa, ta sẽ đưa ngươi đến đó",
                                            "Đến chỗ\nRambo", "Đến Cold", "Đến\nNappa", "Từ chối");
                                default ->
                                    this.createOtherMenu(pl, ConstNpc.BASE_MENU,
                                            "Đội quân của Fide đang ở Thung lũng Nappa, ta sẽ đưa ngươi đến đó",
                                            "Đến Cold", "Đến\nNappa", "Từ chối");
                            }
                        }
                        case 68 ->
                            this.createOtherMenu(pl, ConstNpc.BASE_MENU,
                                    "Ngươi muốn về Thành Phố Vegeta", "Đồng ý", "Từ chối");
                        default -> {
                            ArrayList<String> menu = new ArrayList<>();
                            menu.add("Đến\nTrái Đất");
                            menu.add("Đến\nNamếc");
                            menu.add("Siêu thị");
                            if (pl.clan != null) {
                                menu.add("Nhiệm vụ Bang\n[" + pl.playerTask.clanTask.leftTask + "/" + ConstTask.MAX_CLAN_TASK + "]");
                            }
                            this.createOtherMenu(pl, ConstNpc.BASE_MENU,
                                    "Tàu vũ trụ Xayda sử dụng công nghệ mới nhất, "
                                    + "có thể đưa ngươi đi bất kỳ đâu, chỉ cần trả tiền là được.",
                                    menu.toArray(String[]::new));
                        }
                    }
                }
            }
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            if (this.mapId == 26) {
                if (player.idMark.isBaseMenu()) {
                    switch (select) {
                        case 0 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 24, -1, -1);
                        case 1 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 25, -1, -1);
                        case 2 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 84, -1, -1);
                        case 3 -> {
                            if (player.clan != null) {
                                if (player.playerTask.clanTask.template != null) {
                                    if (player.playerTask.clanTask.isDone()) {
                                        createOtherMenu(player, ConstNpc.MENU_CLAN_TASK, "Nhiệm vụ đã hoàn thành, hãy nhận " + ((player.playerTask.clanTask.level + 1) * 10) + " capsule bang", "Nhận\nthưởng", "Đóng");
                                    } else {
                                        createOtherMenu(player, ConstNpc.MENU_CLAN_TASK, "Nhiệm vụ hiện tại: " + player.playerTask.clanTask.getName() + ". Đã hạ được " + player.playerTask.clanTask.count, "OK", "Hủy bỏ\nNhiệm vụ\nnày");
                                    }
                                } else {
                                    TaskService.gI().changeClanTask(this, player, (byte) Util.nextInt(5));
                                }
                            }
                        }
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_CLAN_TASK) {
                    if (player.playerTask.clanTask.template != null) {
                        switch (select) {
                            case 0 -> {
                                if (player.playerTask.clanTask.isDone()) {
                                    TaskService.gI().payClanTask(player);
                                }
                            }
                            case 1 -> {
                                if (!player.playerTask.clanTask.isDone()) {
                                    createOtherMenu(player, ConstNpc.MENU_CLAN_TASK_REMOVE, "Bạn có chắc muốn hủy nhiệm vụ này?\nNếu hủy nhiệm vụ bạn sẽ mất 1 lượt nhiệm vụ trong ngày.", "Đồng ý", "Từ chối");
                                }
                            }
                        }
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_CLAN_TASK_REMOVE) {
                    if (player.playerTask.clanTask.template != null) {
                        if (select == 0 && !player.playerTask.clanTask.isDone()) {
                            TaskService.gI().removeClanTask(player);
                        }
                    }
                }
            }
            if (this.mapId == 19) {
                if (player.idMark.isBaseMenu()) {
                    switch (select) {
                        case 0 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 109, -1, 295);
                        case 1 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 68, -1, 90);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_FIND_KUKU) {
                    switch (select) {
                        case 0 ->
                            this.createOtherMenu(player, ConstNpc.MENU_CONFIRM_FIND_KUKU,
                                    "Ngươi có muốn tìm đến chỗ Kuku với giá " + Util.numberToMoney(COST_FIND_BOSS) + " vàng không?",
                                    "Đồng ý", "Từ chối");
                        case 1 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 109, -1, 295);
                        case 2 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 68, -1, 90);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_CONFIRM_FIND_KUKU) {
                    if (select == 0) {
                        teleportToBoss(player, BossID.KUKU);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_FIND_MAP_DAU_DINH) {
                    switch (select) {
                        case 0 ->
                            this.createOtherMenu(player, ConstNpc.MENU_CONFIRM_FIND_MAP_DAU_DINH,
                                    "Ngươi có muốn tìm đến chỗ Mập đầu đinh với giá " + Util.numberToMoney(COST_FIND_BOSS) + " vàng không?",
                                    "Đồng ý", "Từ chối");
                        case 1 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 109, -1, 295);
                        case 2 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 68, -1, 90);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_CONFIRM_FIND_MAP_DAU_DINH) {
                    if (select == 0) {
                        teleportToBoss(player, BossID.MAP_DAU_DINH);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_FIND_RAMBO) {
                    switch (select) {
                        case 0 ->
                            this.createOtherMenu(player, ConstNpc.MENU_CONFIRM_FIND_RAMBO,
                                    "Ngươi có muốn tìm đến chỗ Rambo với giá " + Util.numberToMoney(COST_FIND_BOSS) + " vàng không?",
                                    "Đồng ý", "Từ chối");
                        case 1 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 109, -1, 295);
                        case 2 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 68, -1, 90);
                    }
                } else if (player.idMark.getIndexMenu() == ConstNpc.MENU_CONFIRM_FIND_RAMBO) {
                    if (select == 0) {
                        teleportToBoss(player, BossID.RAMBO);
                    }
                }
            }
            if (this.mapId == 68) {
                if (player.idMark.isBaseMenu()) {
                    switch (select) {
                        case 0 ->
                            ChangeMapService.gI().changeMapBySpaceShip(player, 19, -1, 1100);
                    }
                }
            }
        }
    }
}
