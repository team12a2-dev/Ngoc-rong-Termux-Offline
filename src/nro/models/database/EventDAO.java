package nro.models.database;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import nro.models.data.LocalManager;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import nro.models.utils.Logger;

public class EventDAO {
    private static long remainingTimeToIncreasePotentialAndPower = 0;
    private static long remainingTimeToIncreaseHP = 0;
    private static long remainingTimeToIncreaseMP = 0;
    private static long remainingTimeToIncreaseDame = 0;

    public static void loadInternationalWomensDayEvent() {
        try (Connection con = LocalManager.getConnection()) {
            PreparedStatement ps = con.prepareStatement("SELECT `data` FROM `event` WHERE `name` = \'international_womens_day\'");
            ResultSet rs = ps.executeQuery();
            if (rs.first()) {
                Gson gson = new Gson();
                JsonObject jsonObject = gson.fromJson(String.valueOf(rs.getString("data")), JsonObject.class);
                remainingTimeToIncreaseDame = jsonObject.getAsJsonPrimitive("damePrecent").getAsLong();
                remainingTimeToIncreaseHP = jsonObject.getAsJsonPrimitive("hpPrecent").getAsLong();
                remainingTimeToIncreaseMP = jsonObject.getAsJsonPrimitive("mpPrecent").getAsLong();
                remainingTimeToIncreasePotentialAndPower = jsonObject.getAsJsonPrimitive("papPrecent").getAsLong();
            }
        } catch (Exception ex) {
        }
    }

    public static void save() {
        try {
            JsonObject jsonObject = new JsonObject();
            jsonObject.addProperty("damePrecent", remainingTimeToIncreaseDame);
            jsonObject.addProperty("hpPrecent", remainingTimeToIncreaseHP);
            jsonObject.addProperty("mpPrecent", remainingTimeToIncreaseMP);
            jsonObject.addProperty("papPrecent", remainingTimeToIncreasePotentialAndPower);
            String jsonData = jsonObject.toString();
            LocalManager.executeUpdate("UPDATE `event` SET `data` = ? WHERE `name` = \'international_womens_day\'", jsonData);
        } catch (Exception e) {
            Logger.error("Lỗi save Event Data\n");
        }
    }

    @java.lang.SuppressWarnings("all")
    public static void setRemainingTimeToIncreasePotentialAndPower(final long remainingTimeToIncreasePotentialAndPower) {
        EventDAO.remainingTimeToIncreasePotentialAndPower = remainingTimeToIncreasePotentialAndPower;
    }

    @java.lang.SuppressWarnings("all")
    public static long getRemainingTimeToIncreasePotentialAndPower() {
        return EventDAO.remainingTimeToIncreasePotentialAndPower;
    }

    @java.lang.SuppressWarnings("all")
    public static void setRemainingTimeToIncreaseHP(final long remainingTimeToIncreaseHP) {
        EventDAO.remainingTimeToIncreaseHP = remainingTimeToIncreaseHP;
    }

    @java.lang.SuppressWarnings("all")
    public static long getRemainingTimeToIncreaseHP() {
        return EventDAO.remainingTimeToIncreaseHP;
    }

    @java.lang.SuppressWarnings("all")
    public static void setRemainingTimeToIncreaseMP(final long remainingTimeToIncreaseMP) {
        EventDAO.remainingTimeToIncreaseMP = remainingTimeToIncreaseMP;
    }

    @java.lang.SuppressWarnings("all")
    public static long getRemainingTimeToIncreaseMP() {
        return EventDAO.remainingTimeToIncreaseMP;
    }

    @java.lang.SuppressWarnings("all")
    public static void setRemainingTimeToIncreaseDame(final long remainingTimeToIncreaseDame) {
        EventDAO.remainingTimeToIncreaseDame = remainingTimeToIncreaseDame;
    }

    @java.lang.SuppressWarnings("all")
    public static long getRemainingTimeToIncreaseDame() {
        return EventDAO.remainingTimeToIncreaseDame;
    }
}
