package nro.models.npc_list;

import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.map.service.NpcService;
import nro.models.shop_ky_gui.ConsignShopService;

public class KyGui extends Npc {

    public KyGui(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            createOtherMenu(player, 0,
                    "Cửa hàng chúng tôi chuyên mua bán hàng hiệu, hàng độc, cảm ơn bạn đã ghé thăm.",
                    "Hướng\ndẫn\nthêm", "Mua bán\nKý gửi", "Từ chối");
        }
    }

    @Override
    public void confirmMenu(Player pl, int select) {
        if (canOpenNpc(pl)) {
            switch (select) {
                case 0 ->
                    NpcService.gI().createTutorial(pl, tempId, avartar,
                            "Cửa hàng chuyên nhận ký gửi mua bán vật phẩm\bPhí đăng bán: 5.000.000 vàng và 5 ngọc\bNhận lại vàng trực tiếp khi bán thành công (chiết khấu 10%)\bMột người bán, vạn người mua, mại dô!");
                case 1 -> {
                    if (pl.getSession().actived) {
                        ConsignShopService.gI().openShopKyGui(pl);
                        return;
                    }
                    this.npcChat(pl, "Bạn chưa kích hoạt thành viên!!!");
                }
            }
        }
    }
}
