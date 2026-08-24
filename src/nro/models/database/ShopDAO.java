package nro.models.database;

import nro.models.item.Item;
import nro.models.shop.ItemShop;
import nro.models.shop.Shop;
import nro.models.shop.TabShop;
import nro.models.services.ItemService;
import nro.models.utils.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ShopDAO {

    public static List<Shop> getShops(Connection con) {
        List<Shop> list = new ArrayList<>();
        try {
            PreparedStatement ps = con.prepareStatement("SELECT * FROM shop ORDER BY npc_id ASC");
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Shop shop = new Shop();
                shop.id = rs.getInt("id");
                shop.npcId = rs.getByte("npc_id");
                shop.tagName = rs.getString("tag_name");
                shop.typeShop = rs.getByte("type_shop");
                loadShopTab(con, shop);
                list.add(shop);
            }
            rs.close();
            ps.close();
        } catch (Exception e) {
            Logger.logException(ShopDAO.class, e);
        }
        return list;
    }

    private static void loadShopTab(Connection con, Shop shop) {
        try {
            PreparedStatement ps = con.prepareStatement(
                    "SELECT * FROM tab_shop WHERE shop_id = ? ORDER BY id ASC");
            ps.setInt(1, shop.id);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                TabShop tab = new TabShop();
                tab.shop = shop;
                tab.id = rs.getInt("id");
                tab.name = rs.getString("name").replaceAll("<>", "\n");
                loadItemShop(con, tab);
                shop.tabShops.add(tab);
            }
            rs.close();
            ps.close();
        } catch (Exception e) {
            Logger.logException(ShopDAO.class, e);
        }
    }

    private static List<Integer> itemShopTabIds(int tabShopId) {
        List<Integer> ids = new ArrayList<>();
        ids.add(tabShopId);
        if (tabShopId >= 41 && tabShopId <= 43) {
            ids.add(tabShopId - 31);
        } else if (tabShopId >= 10 && tabShopId <= 12) {
            ids.add(tabShopId + 31);
        }
        return ids;
    }

    private static void loadItemShop(Connection con, TabShop tabShop) {
        try {
            List<Integer> tabIds = itemShopTabIds(tabShop.id);
            StringBuilder in = new StringBuilder();
            for (int i = 0; i < tabIds.size(); i++) {
                if (i > 0) {
                    in.append(',');
                }
                in.append('?');
            }
            PreparedStatement ps = con.prepareStatement(
                    "SELECT * FROM item_shop WHERE is_sell = 1 AND tab_id IN (" + in
                            + ") ORDER BY sort_order ASC, id ASC");
            for (int i = 0; i < tabIds.size(); i++) {
                ps.setInt(i + 1, tabIds.get(i));
            }
            ResultSet rs = ps.executeQuery();

            Map<Integer, ItemShop> unique = new LinkedHashMap<>();
            while (rs.next()) {
                int rowId = rs.getInt("id");
                if (unique.containsKey(rowId)) {
                    continue;
                }
                ItemShop itemShop = new ItemShop();
                itemShop.tabShop = tabShop;
                itemShop.id = rowId;
                itemShop.temp = ItemService.gI().getTemplate(rs.getShort("temp_id"));
                itemShop.isNew = rs.getBoolean("is_new");
                itemShop.cost = rs.getInt("cost");
                itemShop.iconSpec = rs.getInt("icon_spec");
                itemShop.typeSell = rs.getByte("type_sell");
                applyGenderOverride(rs, itemShop);

                loadItemShopOption(con, itemShop);

                if (itemShop.temp != null) {
                    unique.put(rowId, itemShop);
                }
            }

            tabShop.itemShops.addAll(unique.values());

            rs.close();
            ps.close();

        } catch (Exception e) {
            Logger.logException(ShopDAO.class, e);
        }
    }

    private static void applyGenderOverride(ResultSet rs, ItemShop itemShop) {
        try {
            int g = rs.getInt("gender_override");
            if (!rs.wasNull()) {
                itemShop.genderOverride = (byte) g;
            }
        } catch (SQLException ignored) {
            // Cột chưa migrate
        }
    }

    private static void loadItemShopOption(Connection con, ItemShop itemShop) {
        try {
            PreparedStatement ps = con.prepareStatement(
                    "SELECT * FROM item_shop_option WHERE item_shop_id = ?");
            ps.setInt(1, itemShop.id);
            ResultSet rs = ps.executeQuery();

            while (rs.next()) {
                itemShop.options.add(
                        new Item.ItemOption(
                                rs.getInt("option_id"),
                                rs.getInt("param")
                        )
                );
            }

            rs.close();
            ps.close();

        } catch (Exception e) {
            Logger.logException(ShopDAO.class, e);
        }
    }
}