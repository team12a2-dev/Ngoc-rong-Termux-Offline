package nro.models.shop_ky_gui;

import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import nro.models.data.LocalManager;
import org.json.simple.JSONValue;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class ConsignShopManager {

    private static ConsignShopManager instance;

    public static ConsignShopManager gI() {
        if (instance == null) {
            instance = new ConsignShopManager();
        }
        return instance;
    }

    public long lastTimeUpdate;

    public String[] tabName = {"Áo Quần", "Găng Tay", "Phụ Kiện", "Linh tinh", ""};

    public List<ConsignItem> listItem = new ArrayList<>();

    public synchronized void addItem(ConsignItem it) {
        if (it == null) return;
        this.listItem.add(it);
        try (Connection con = LocalManager.getConnection();
             java.sql.PreparedStatement ps = con.prepareStatement(
                     "INSERT INTO `shop_ky_gui`(`id`, `player_id`, `tab`, `item_id`, `gold`, `gem`, `quantity`, `itemOption`, `isUpTop`, `isBuy`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            ps.setInt(1, it.id);
            ps.setInt(2, it.player_sell);
            ps.setByte(3, it.tab);
            ps.setShort(4, it.itemId);
            ps.setInt(5, it.goldSell);
            ps.setInt(6, it.gemSell);
            ps.setInt(7, it.quantity);
            ps.setString(8, JSONValue.toJSONString(it.options).equals("null") ? "[]" : JSONValue.toJSONString(it.options));
            ps.setInt(9, it.isUpTop);
            ps.setByte(10, (byte) (it.isBuy ? 1 : 0));
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public synchronized void updateBuy(ConsignItem it) {
        if (it == null) return;
        try (Connection con = LocalManager.getConnection();
             java.sql.PreparedStatement ps = con.prepareStatement("UPDATE `shop_ky_gui` SET `isBuy` = ? WHERE `id` = ?")) {
            ps.setByte(1, (byte) (it.isBuy ? 1 : 0));
            ps.setInt(2, it.id);
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public synchronized void updateUpTop(ConsignItem it) {
        if (it == null) return;
        try (Connection con = LocalManager.getConnection();
             java.sql.PreparedStatement ps = con.prepareStatement("UPDATE `shop_ky_gui` SET `isUpTop` = ? WHERE `id` = ?")) {
            ps.setInt(1, it.isUpTop);
            ps.setInt(2, it.id);
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public synchronized boolean removeItem(ConsignItem it) {
        if (it == null) return false;
        boolean removed = this.listItem.remove(it);
        if (removed) {
            try (Connection con = LocalManager.getConnection();
                 java.sql.PreparedStatement ps = con.prepareStatement("DELETE FROM `shop_ky_gui` WHERE `id` = ?")) {
                ps.setInt(1, it.id);
                ps.executeUpdate();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return removed;
    }

    public synchronized void save() {
        try (Connection con = LocalManager.getConnection()) {
            con.setAutoCommit(false);
            try (java.sql.PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO `shop_ky_gui`(`id`, `player_id`, `tab`, `item_id`, `gold`, `gem`, `quantity`, `itemOption`, `isUpTop`, `isBuy`) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                    + "ON DUPLICATE KEY UPDATE `isBuy` = VALUES(`isBuy`), `isUpTop` = VALUES(`isUpTop`)")) {
                for (ConsignItem it : this.listItem) {
                    if (it != null) {
                        ps.setInt(1, it.id);
                        ps.setInt(2, it.player_sell);
                        ps.setByte(3, it.tab);
                        ps.setShort(4, it.itemId);
                        ps.setInt(5, it.goldSell);
                        ps.setInt(6, it.gemSell);
                        ps.setInt(7, it.quantity);
                        ps.setString(8, JSONValue.toJSONString(it.options).equals("null") ? "[]" : JSONValue.toJSONString(it.options));
                        ps.setInt(9, it.isUpTop);
                        ps.setByte(10, (byte) (it.isBuy ? 1 : 0));
                        ps.addBatch();
                    }
                }
                ps.executeBatch();
                con.commit();
            } catch (Exception ex) {
                con.rollback();
                ex.printStackTrace();
            } finally {
                con.setAutoCommit(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

