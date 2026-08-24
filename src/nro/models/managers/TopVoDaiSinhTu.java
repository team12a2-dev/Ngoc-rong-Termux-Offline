package nro.models.managers;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import nro.models.consts.ConstPlayer;
import nro.models.data.LocalManager;
import nro.models.item.Item;
import nro.models.network.Message;
import nro.models.player.Player;
import nro.models.services.ItemService;
import nro.models.utils.Util;
import org.json.simple.JSONArray;
import org.json.simple.JSONValue;

/**
 * Bảng xếp hạng võ đài sinh tử (thời gian hoàn thành thấp nhất).
 */
public class TopVoDaiSinhTu {

    private static final TopVoDaiSinhTu INSTANCE = new TopVoDaiSinhTu();

    private final List<TopEntry> list = new ArrayList<>();

    public static TopVoDaiSinhTu getInstance() {
        return INSTANCE;
    }

    public void load() {
        list.clear();
        try (
                Connection con = LocalManager.getConnection();
                PreparedStatement ps = con.prepareStatement(
                        "SELECT id, name, head, gender, items_body, vodaisinhtu FROM player "
                                + "WHERE vodaisinhtu IS NOT NULL AND vodaisinhtu != '' AND vodaisinhtu != '[]'");
                ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                TopEntry entry = parseEntry(rs);
                if (entry != null) {
                    list.add(entry);
                }
            }
            list.sort(Comparator.comparingLong(e -> e.timeSeconds));
            if (list.size() > 100) {
                list.subList(100, list.size()).clear();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private TopEntry parseEntry(ResultSet rs) {
        try {
            String raw = rs.getString("vodaisinhtu");
            if (raw == null || raw.isBlank()) {
                return null;
            }
            JSONArray dataArray = (JSONArray) JSONValue.parse(raw);
            if (dataArray == null || dataArray.size() < 4) {
                return null;
            }
            long timeSeconds = Long.parseLong(dataArray.get(3).toString());
            if (timeSeconds <= 0) {
                return null;
            }
            TopEntry entry = new TopEntry();
            entry.id = rs.getInt("id");
            entry.name = rs.getString("name");
            entry.gender = rs.getByte("gender");
            entry.timeSeconds = timeSeconds;
            resolveOutfit(entry, rs.getShort("head"), rs.getString("items_body"));
            return entry;
        } catch (Exception e) {
            return null;
        }
    }

    private void resolveOutfit(TopEntry entry, short headDb, String itemsBody) {
        entry.head = headDb;
        entry.body = (short) (entry.gender == ConstPlayer.NAMEC ? 59 : 57);
        entry.leg = (short) (entry.gender == ConstPlayer.NAMEC ? 60 : 58);
        if (itemsBody == null || itemsBody.isBlank()) {
            return;
        }
        try {
            Player tmp = new Player();
            tmp.gender = entry.gender;
            tmp.head = headDb;
            Object parsed = JSONValue.parse(itemsBody);
            if (!(parsed instanceof JSONArray dataArray)) {
                return;
            }
            for (Object itemDataObject : dataArray) {
                Item item = createItemFromDataObject(itemDataObject);
                tmp.inventory.itemsBody.add(item);
            }
            entry.head = tmp.getHead();
            entry.body = tmp.getBody();
            entry.leg = tmp.getLeg();
        } catch (Exception ignored) {
        }
    }

    private Item createItemFromDataObject(Object itemData) {
        try {
            if (itemData instanceof String str) {
                Object parsed = JSONValue.parse(str);
                if (!(parsed instanceof JSONArray)) {
                    return ItemService.gI().createItemNull();
                }
                itemData = parsed;
            }
            if (!(itemData instanceof JSONArray dataItem)) {
                return ItemService.gI().createItemNull();
            }
            short tempId = Short.parseShort(String.valueOf(dataItem.get(0)));
            if (tempId == -1) {
                return ItemService.gI().createItemNull();
            }
            int quantity = Integer.parseInt(String.valueOf(dataItem.get(1)));
            Item item = ItemService.gI().createNewItem(tempId, quantity);
            Object optionObj = dataItem.get(2);
            if (optionObj instanceof JSONArray optionsArray) {
                for (Object optObj : optionsArray) {
                    if (optObj instanceof JSONArray opt && opt.size() >= 2) {
                        int optionId = Integer.parseInt(String.valueOf(opt.get(0)));
                        int param = Integer.parseInt(String.valueOf(opt.get(1)));
                        item.itemOptions.add(new Item.ItemOption(optionId, param));
                    }
                }
            }
            return item;
        } catch (Exception e) {
            return ItemService.gI().createItemNull();
        }
    }

    public void show(Player player) {
        load();
        Message msg = new Message(-96);
        try {
            msg.writer().writeByte(0);
            msg.writer().writeUTF("Top 100 Võ Đài Sinh Tử");
            msg.writer().writeByte(list.size());
            for (int i = 0; i < list.size(); i++) {
                TopEntry entry = list.get(i);
                msg.writer().writeInt(i + 1);
                msg.writer().writeInt(entry.id);
                msg.writer().writeShort(entry.head);
                if (player.getSession().version > 214) {
                    msg.writer().writeShort(-1);
                }
                msg.writer().writeShort(entry.body);
                msg.writer().writeShort(entry.leg);
                msg.writer().writeUTF(entry.name);
                String timeText = Util.convertMilliseconds(entry.timeSeconds * 1000L);
                msg.writer().writeUTF(timeText);
                msg.writer().writeUTF("Thời gian: " + timeText);
            }
            player.sendMessage(msg);
            msg.cleanup();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static class TopEntry {
        int id;
        String name;
        short head;
        short body;
        short leg;
        byte gender;
        long timeSeconds;
    }
}
