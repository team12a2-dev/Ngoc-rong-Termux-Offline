package nro.models.npc_list;

import nro.models.clan.Clan;
import nro.models.clan.ClanMember;
import nro.models.consts.ConstMob;
import nro.models.consts.ConstNpc;
import nro.models.map.Zone;
import nro.models.mob.Mob;
import nro.models.mob_bigboss.GauTuongCuop;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.services.ClanService;
import nro.models.services.Service;
import nro.models.map.service.ChangeMapService;
import nro.models.utils.Util;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author By AmodsubVN
 *
 */
public class GiuMaDauBo extends Npc {

    public GiuMaDauBo(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            List<String> menu = new ArrayList<>();
            menu.add("Trở về\nĐảo Kame");
            menu.add("Trở về\nLàng");

            if (player.clan != null) {
                menu.add("Điểm danh\n+1 Capsule");
                if (player.clan.isLeader(player)) {
                    menu.add("Khiêu chiến\nBoss Bang");
                }
            }
            menu.add("Hướng dẫn\nBông tai");
            menu.add("Đóng");

            this.createOtherMenu(player, ConstNpc.BASE_MENU,
                    "Chào chiến binh! Ta là Giu Ma Đầu Bò cai quản Lãnh Địa Bang Hội.\nNgươi cần ta giúp gì?",
                    menu.toArray(new String[0]));
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (!canOpenNpc(player)) {
            return;
        }

        switch (player.idMark.getIndexMenu()) {
            case ConstNpc.BASE_MENU -> handleBaseMenu(player, select);
            case 1 -> { // Menu hướng dẫn Porata
                // Đóng menu
            }
        }
    }

    private void handleBaseMenu(Player player, int select) {
        // Xây dựng danh sách tùy chọn tương ứng
        List<Integer> actions = new ArrayList<>();
        actions.add(0); // 0: Về Đảo Kame
        actions.add(1); // 1: Về Làng

        if (player.clan != null) {
            actions.add(2); // 2: Điểm danh
            if (player.clan.isLeader(player)) {
                actions.add(3); // 3: Boss Bang
            }
        }
        actions.add(4); // 4: Hướng dẫn Bông tai
        actions.add(5); // 5: Đóng

        if (select < 0 || select >= actions.size()) {
            return;
        }

        int action = actions.get(select);

        switch (action) {
            case 0 -> { // Về Đảo Kame
                ChangeMapService.gI().changeMapBySpaceShip(player, 5, -1, -1);
            }
            case 1 -> { // Về Làng quê hương theo hành tinh (0: Làng Aru, 7: Làng Mori, 14: Làng Kakarot)
                int homeVillageMapId = player.gender * 7;
                ChangeMapService.gI().changeMapBySpaceShip(player, homeVillageMapId, -1, -1);
            }
            case 2 -> handleClanCheckIn(player);
            case 3 -> handleSpawnBossClan(player);
            case 4 -> showPorataGuide(player);
            default -> {
            }
        }
    }

    private void handleClanCheckIn(Player player) {
        if (player.clan == null) {
            Service.gI().sendThongBao(player, "Bạn cần gia nhập bang hội để điểm danh.");
            return;
        }
        if (player.event != null && player.event.luotNhanCapsuleBang == 0) {
            Service.gI().sendThongBao(player, "Bạn đã nhận Capsule Bang hôm nay rồi.");
            return;
        }

        player.lastClanCheckIn = System.currentTimeMillis();
        player.clan.capsuleClan += 1;

        for (ClanMember cm : player.clan.getMembers()) {
            if (cm.id == player.id) {
                cm.memberPoint += 1;
                cm.clanPoint += 1;
                break;
            }
        }
        if (player.event != null) {
            player.event.luotNhanCapsuleBang = 0;
        }
        player.clan.update();
        Service.gI().sendThongBao(player, "Điểm danh thành công! Đã đóng góp +1 Capsule vào Quỹ bang (Hiện có " + player.clan.capsuleClan + " Capsule).");

        for (ClanMember cm : player.clan.getMembers()) {
            Player pl = Client.gI().getPlayer(cm.id);
            if (pl != null) {
                ClanService.gI().sendMyClan(pl);
            }
        }
    }

    private void handleSpawnBossClan(Player player) {
        Zone zone = player.zone;
        if (zone == null) {
            return;
        }

        if (player.clan == null) {
            Service.gI().sendThongBao(player, "Bạn không có trong bang hội!");
            return;
        }
        Clan clan = player.clan;
        if (!clan.isLeader(player)) {
            Service.gI().sendThongBao(player, "Chỉ bang chủ mới có quyền gọi Gấu Tướng Cướp!");
            return;
        }

        long membersInZone = clan.membersInGame.stream()
                .filter(p -> p.zone != null && p.zone.equals(zone))
                .count();

        if (membersInZone < 2) {
            Service.gI().sendThongBao(player, "Cần ít nhất 2 thành viên bang hội trong khu vực!");
            return;
        }

        // Tạo Gấu Tướng Cướp
        try {
            Mob mobBase = new Mob();
            mobBase.tempId = ConstMob.GAU_TUONG_CUOP;
            mobBase.level = 1;
            mobBase.location = new nro.models.player.Location();
            mobBase.location.x = player.location.x + Util.nextInt(-30, 30);
            mobBase.location.y = player.location.y;
            mobBase.zone = zone;
            mobBase.point.setHpFull(2_000_000_000);
            mobBase.point.sethp(mobBase.point.getHpFull());
            mobBase.pDame = (byte) 50;
            mobBase.pTiemNang = 0;
            mobBase.setTiemNang();
            GauTuongCuop gauTuong = new GauTuongCuop(mobBase);
            zone.mobs.add(gauTuong);
            for (Player p : zone.getPlayers()) {
                Service.gI().loadMob(p, gauTuong);
            }
            Service.gI().sendThongBao(player, "Gấu Tướng Cướp đã xuất hiện!");
        } catch (Exception e) {
            Service.gI().sendThongBao(player, "Không thể triệu hồi Boss lúc này!");
        }
    }

    private void showPorataGuide(Player player) {
        this.createOtherMenu(player, 1,
                "• Nếu ngươi có Bông Tai Porata:\n"
                + "  - Có thể úp được Mảnh Vỡ Bông Tai Cấp 2\n"
                + "  - Có thể úp được Mảnh Hồn Bông Tai\n"
                + "  - Đôi khi còn rơi cả Đá Xanh Lam\n\n"
                + "• Nếu ngươi có Bông Tai Porata Cấp 2:\n"
                + "  - Có thể úp thêm Mảnh Vỡ Bông Tai Cấp 3\n\n"
                + "• Nếu ngươi có Cải trang Bulma Sexy:\n"
                + "  - Tỉ lệ úp sẽ là x1.5\n"
                + "Hãy chuẩn bị kỹ trước khi tham gia thử thách!",
                "Đã hiểu");
    }
}