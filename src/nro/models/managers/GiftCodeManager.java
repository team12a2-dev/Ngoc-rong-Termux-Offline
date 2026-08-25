package nro.models.managers;

import nro.models.data.LocalManager;
import nro.models.player_system.GiftCode;
import nro.models.player.Player;
import nro.models.map.service.NpcService;
import nro.models.services.Service;
import nro.models.services.InventoryService;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

import nro.models.item.Item.ItemOption;

public class GiftCodeManager {

    public final ArrayList<GiftCode> listGiftCode = new ArrayList<>();

    private static GiftCodeManager instance;

    public static GiftCodeManager gI() {
        if (instance == null) {
            instance = new GiftCodeManager();
        }
        return instance;
    }

    public void loadGiftCodeFromDB() {
    listGiftCode.clear();

    String sql = "SELECT * FROM giftcode";

    Connection con = null;
    PreparedStatement ps = null;
    ResultSet rs = null;

    try {
        con = LocalManager.getConnection();
        if (con == null || con.isClosed()) {
            System.out.println(" Connection null hoặc đã đóng!");
            return;
        }

        ps = con.prepareStatement(sql);
        rs = ps.executeQuery();

        while (rs.next()) {
            GiftCode gc = new GiftCode();

            gc.id = rs.getInt("id");
            gc.code = rs.getString("code");
            gc.countLeft = rs.getInt("count_left");
            gc.datecreate = rs.getTimestamp("datecreate");
            gc.dateexpired = rs.getTimestamp("expired");

            gc.detail = new HashMap<>();
            gc.option = new HashMap<>();

            String detailJson = rs.getString("detail");

            if (detailJson != null && !detailJson.isEmpty()) {
                JSONArray jar = (JSONArray) JSONValue.parse(detailJson);

                if (jar != null) {
                    for (Object obj : jar) {
                        JSONObject json = (JSONObject) obj;

                        int itemId = Integer.parseInt(json.get("id").toString());
                        int quantity = Integer.parseInt(json.get("quantity").toString());

                        ArrayList<ItemOption> optionList = new ArrayList<>();
                        JSONArray options = (JSONArray) json.get("options");

                        if (options != null) {
                            for (Object optObj : options) {
                                JSONObject opt = (JSONObject) optObj;

                                int optId = Integer.parseInt(opt.get("id").toString());
                                int param = Integer.parseInt(opt.get("param").toString());

                                ItemOption io = new ItemOption(optId, param);

                                if (io.optionTemplate != null) {
                                    optionList.add(io);
                                }
                            }
                        }

                        gc.detail.put(itemId, quantity);
                        gc.option.put(itemId, optionList);
                    }
                }
            }

            listGiftCode.add(gc);
        }

        System.out.println("Reload GiftCode: " + listGiftCode.size());

    } catch (Exception e) {
        e.printStackTrace();
    } finally {
        try { if (rs != null) rs.close(); } catch (Exception ignored) {}
        try { if (ps != null) ps.close(); } catch (Exception ignored) {}
        try { if (con != null) con.close(); } catch (Exception ignored) {}
    }
}

    public GiftCode checkUseGiftCode(Player player, String code) {
        if (player == null || code == null || code.isBlank()) {
            return null;
        }
        for (GiftCode giftCode : listGiftCode) {
            if (!giftCode.code.equals(code)) {
                continue;
            }
            if (giftCode.timeCode()) {
                Service.gI().sendThongBaoOK(player, "Giftcode đã hết hạn");
                return null;
            }
            // Compatibility check for claims saved in the legacy player JSON.
            // The SQL unique key remains the authoritative concurrency guard.
            if (giftCode.isUsedGiftCode(player)) {
                Service.gI().sendThongBaoOK(player, "Bạn đã sử dụng giftcode này");
                return null;
            }
            if (InventoryService.gI().getCountEmptyBag(player) < giftCode.detail.size()) {
                Service.gI().sendThongBaoOK(player,
                        "Cần tối thiểu " + giftCode.detail.size() + " ô hành trang trống");
                return null;
            }
            if (claimGiftCodeAtomically(player, giftCode)) {
                player.giftCode.add(code);
                giftCode.countLeft = Math.max(0, giftCode.countLeft - 1);
                return giftCode;
            }
            Service.gI().sendThongBaoOK(player, "Giftcode đã hết hoặc bạn đã sử dụng code này");
            return null;
        }
        return null;
    }

    private boolean claimGiftCodeAtomically(Player player, GiftCode giftCode) {
        String insert = "INSERT INTO giftcode_claims (giftcode_id, player_id, code_snapshot) VALUES (?, ?, ?)";
        String decrement = "UPDATE giftcode SET count_left = count_left - 1 "
                + "WHERE id = ? AND count_left > 0 AND (expired IS NULL OR expired > NOW())";
        try (Connection con = LocalManager.getConnection()) {
            con.setAutoCommit(false);
            try (PreparedStatement claim = con.prepareStatement(insert)) {
                claim.setInt(1, giftCode.id);
                claim.setLong(2, player.id);
                claim.setString(3, giftCode.code);
                if (claim.executeUpdate() != 1) {
                    con.rollback();
                    return false;
                }
            }
            try (PreparedStatement update = con.prepareStatement(decrement)) {
                update.setInt(1, giftCode.id);
                if (update.executeUpdate() != 1) {
                    con.rollback();
                    return false;
                }
            }
            con.commit();
            return true;
        } catch (Exception e) {
            Service.gI().sendThongBaoOK(player, "Không thể xác nhận giftcode, vui lòng thử lại");
            return false;
        }
    }


    public void updateGiftCode(GiftCode giftcode) {
        try {
            LocalManager.executeUpdate(
                    "update giftcode set count_left = ? where id = ?",
                    giftcode.countLeft, giftcode.id);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    public void checkInfomationGiftCode(Player p) {
        if (listGiftCode.isEmpty()) {
            NpcService.gI().createTutorial(p, 5073, "Không có giftcode");
            return;
        }

        StringBuilder sb = new StringBuilder();
        for (GiftCode giftCode : listGiftCode) {
            sb.append("Code: ").append(giftCode.code)
                    .append(" | SL: ").append(giftCode.countLeft)
                    .append("\n");
        }

        NpcService.gI().createTutorial(p, 5073, sb.toString());
    }
}