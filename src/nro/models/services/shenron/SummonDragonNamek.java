package nro.models.services.shenron;

import nro.models.services.shenron.SummonDragon;
import nro.models.network.Message;
import nro.models.consts.ConstNpc;
import nro.models.database.AmodsubVN;
import nro.models.database.PlayerDAO;
import nro.models.item.Item;
import nro.models.item.Item.ItemOption;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.List;
import java.util.UUID;
import nro.models.map.Zone;
import nro.models.player.Inventory;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.map.service.NpcService;
import nro.models.services.Service;
import nro.models.utils.Util;

/**
 *
 * @author By AmodsubVN
 *
 */
public class SummonDragonNamek {

    public static final byte DRAGON_PORUNGA = 1;
    private static SummonDragonNamek instance;

    public static final byte WISHED = 0;
    public static final byte TIME_UP = 1;
    private boolean isShenronAppear;
    public Player playerSummonShenron;
    private int playerSummonShenronId;
    private Zone mapShenronAppear;
    private int menuShenron;
    private byte select;
    private String wishToken;
    private final Thread update;
    private boolean active;
    public boolean isPlayerDisconnect;
    private long lastTimeShenronWait;
    private final int timeShenronWait = 300000;

    public static SummonDragonNamek gI() {
        if (instance == null) {
            instance = new SummonDragonNamek();
        }
        return instance;
    }

    private SummonDragonNamek() {
        this.update = new Thread(() -> {
            while (active) {
                try {
                    if (isShenronAppear) {
                        if (isPlayerDisconnect) {
                            List<Player> players = mapShenronAppear.getPlayers();
                            for (Player plMap : players) {
                                if (plMap.isPl() && plMap.id == playerSummonShenronId) {
                                    playerSummonShenron = plMap;
                                    reSummonShenron();
                                    isPlayerDisconnect = false;
                                    break;
                                }
                            }

                        }
                        if (Util.canDoWithTime(lastTimeShenronWait, timeShenronWait)) {
                            shenronLeave(playerSummonShenron, TIME_UP);
                        }
                    }
                    Thread.sleep(1000);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
        this.active();
    }

    private void active() {
        if (!active) {
            active = true;
            this.update.start();
        }
    }

    public void summonNamec(Player pl) {
        if (pl.zone.map.mapId == 7) {
            playerSummonShenron = pl;
            playerSummonShenronId = (int) pl.id;
            mapShenronAppear = pl.zone;
            lastTimeShenronWait = System.currentTimeMillis();
            wishToken = UUID.randomUUID().toString();
            sendNotifyShenronNamekAppear();
            activeShenron(pl, true, DRAGON_PORUNGA);
            sendBlackGokuhesNamec(pl);
        } else {
            Service.gI().sendThongBao(pl, "Không thể thực hiện");
        }
    }

    private void reSummonShenron() {
        activeShenron(playerSummonShenron, true, DRAGON_PORUNGA);
        sendBlackGokuhesNamec(playerSummonShenron);
    }

    private void activeShenron(Player pl, boolean appear, byte type) {
        Message msg;
        try {
            msg = new Message(-83);
            msg.writer().writeByte(appear ? 0 : (byte) 1);
            if (appear) {
                msg.writer().writeShort(pl.zone.map.mapId);
                msg.writer().writeShort(pl.zone.map.bgId);
                msg.writer().writeByte(pl.zone.zoneId);
                msg.writer().writeInt((int) pl.id);
                msg.writer().writeUTF("null");
                msg.writer().writeShort(pl.location.x);
                msg.writer().writeShort(pl.location.y);
                msg.writer().writeByte(type);
                isShenronAppear = true;
            }
            Service.gI().sendMessAllPlayer(msg);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void sendNotifyShenronNamekAppear() {
        Message msg = null;
        try {
            msg = new Message(-25);
            msg.writer().writeUTF(playerSummonShenron.name + " vừa gọi rồng thần namek tại "
                    + playerSummonShenron.zone.map.mapName + " khu vực " + playerSummonShenron.zone.zoneId);
            Service.gI().sendMessAllPlayerIgnoreMe(playerSummonShenron, msg);
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (msg != null) {
                msg.cleanup();
            }
        }
    }

    public synchronized void confirmWish() {
        switch (this.menuShenron) {
           case ConstNpc.SHOW_SHENRON_NAMEK_CONFIRM:
    try {
        switch (select) {

            // ===== 100 NGỌC XANH =====
            case 0:
                if (playerSummonShenron.clan != null) {
                    playerSummonShenron.clan.members.forEach(m -> {
                        if (!claimWishReward(m.id, (byte) 0)) {
                            return;
                        }
                        Player p = Client.gI().getPlayer(m.id);
                        if (p != null) {
                            p.inventory.gem = (int) Math.min(Integer.MAX_VALUE,
                                    (long) p.inventory.gem + 300L);
                            Service.gI().sendMoney(p);
                        } else {
                            Player off = AmodsubVN.loadById(m.id);
                            if (off != null) {
                                off.inventory.gem = (int) Math.min(Integer.MAX_VALUE,
                                        (long) off.inventory.gem + 300L);
                                PlayerDAO.updatePlayer(off);
                            }
                        }
                    });
                } else if (claimWishReward(playerSummonShenron.id, (byte) 0)) {
                    playerSummonShenron.inventory.gem = (int) Math.min(Integer.MAX_VALUE,
                            (long) playerSummonShenron.inventory.gem + 300L);
                    Service.gI().sendMoney(playerSummonShenron);
                }
                break;

            // ===== 10 TRIỆU VÀNG =====
          // ===== NHẬN x12 ITEM 579 (OP 30 PARAM 1) =====
case 1:
    if (playerSummonShenron.clan != null) {
        playerSummonShenron.clan.members.forEach(m -> {
            if (!claimWishReward(m.id, (byte) 1)) {
                return;
            }
            Player p = Client.gI().getPlayer(m.id);
            if (p != null) {
                // Online
                p.inventory.gold = Math.min(Inventory.LIMIT_GOLD,
                        p.inventory.gold + 20_000_000L);
                
                Item item = ItemService.gI().createNewItem((short) 190);
                InventoryService.gI().addItemBag(p, item);

                Service.gI().sendMoney(p);
                InventoryService.gI().sendItemBags(p);
                Service.gI().sendThongBao(p, "Nhận 20 triệu vàng + vật phẩm!");
            } else {
                // Offline
                Player off = AmodsubVN.loadById(m.id);
                if (off != null) {
                    off.inventory.gold = Math.min(Inventory.LIMIT_GOLD,
                            off.inventory.gold + 20_000_000L);

                    Item item = ItemService.gI().createNewItem((short) 190);
                    InventoryService.gI().addItemBag(off, item);

                    PlayerDAO.updatePlayer(off);
                }
            }
        });
    } else if (claimWishReward(playerSummonShenron.id, (byte) 1)) {
        // Không có bang
        playerSummonShenron.inventory.gold = Math.min(Inventory.LIMIT_GOLD,
                playerSummonShenron.inventory.gold + 20_000_000L);

        Item item = ItemService.gI().createNewItem((short) 190);
        InventoryService.gI().addItemBag(playerSummonShenron, item);

        Service.gI().sendMoney(playerSummonShenron);
        InventoryService.gI().sendItemBags(playerSummonShenron);
        Service.gI().sendThongBao(playerSummonShenron, "Nhận 20 triệu vàng + vật phẩm!");
    }
    break;
}
    } catch (Exception e) {
        e.printStackTrace();
    }
    break;}
        shenronLeave(this.playerSummonShenron, WISHED);
    }

    private boolean claimWishReward(long playerId, byte rewardType) {
        if (wishToken == null || playerId <= 0) {
            return false;
        }
        String sql = "INSERT IGNORE INTO namek_wish_claims "
                + "(wish_token, player_id, reward_type, status) VALUES (?, ?, ?, 'delivered')";
        try (Connection con = nro.models.data.LocalManager.getConnection();
                PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, wishToken);
            ps.setLong(2, playerId);
            ps.setByte(3, rewardType);
            return ps.executeUpdate() == 1;
        } catch (Exception e) {
            Service.gI().sendThongBao(playerSummonShenron,
                    "Không thể xác nhận điều ước, vui lòng thử lại sau.");
            return false;
        }
    }

    public void showConfirmShenron(Player pl, int menu, byte select) {
        this.menuShenron = menu;
        this.select = select;
        String wish = null;
        switch (menu) {
           case ConstNpc.SHOW_SHENRON_NAMEK_CONFIRM:
    switch (select) {
        case 0:
            wish = "300 Ngọc";
            break;
        case 1:
            wish = "20Tr Vàng\n";
            break;
    }
    break;
        }
        NpcService.gI().createMenuRongThieng(pl, ConstNpc.SHENRON_NAMEK_CONFIRM, "Ngươi có chắc muốn ước?", wish, "Từ chối");
    }

    public void sendBlackGokuhesNamec(Player pl) {
    NpcService.gI().createMenuRongThieng(
        pl,
        ConstNpc.SHOW_SHENRON_NAMEK_CONFIRM,
        "Ta sẽ ban cho cả bang hội ngươi 1 điều ước, ngươi có 5 phút, hãy suy nghĩ thật kỹ trước khi quyết định",
        "300 Ngọc",
        "20Tr Vàng"
    );
}

    public void shenronLeave(Player pl, byte type) {
        if (type == WISHED) {
            //Điều ước Bùa mạnh mẽ cho tất cả trong 7 ngày của các con đã được thực hiện...tạm biệt
            NpcService.gI().createTutorial(pl, 0, "Điều ước của ngươi đã được thực hiện...tạm biệt");
        } else {
            NpcService.gI().createMenuRongThieng(pl, ConstNpc.IGNORE_MENU, "Ta buồn ngủ quá rồi\nHẹn gặp ngươi lần sau, ta đi đây, bái bai");
        }
        activeShenron(pl, false, SummonDragon.DRAGON_SHENRON);
        this.isShenronAppear = false;
        this.menuShenron = -1;
        this.select = -1;
        this.playerSummonShenron = null;
        this.playerSummonShenronId = -1;
        this.mapShenronAppear = null;
    }
}
