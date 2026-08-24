package nro.models.server.panel;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import nro.models.clan.Clan;
import nro.models.clan.ClanMember;
import nro.models.consts.ConstPlayer;
import nro.models.data.DataGame;
import nro.models.services.ClanService;
import nro.models.services.ItemTimeService;
import nro.models.services.TaskService;
import nro.models.skill.Skill;
import nro.models.utils.SkillUtil;
import nro.models.boss.Boss;
import nro.models.boss.BossID;
import nro.models.boss.Boss_Manager.BossManager;
import nro.models.boss.spawn.BossSpawnSchedule;
import nro.models.consts.BossStatus;
import nro.models.database.AmodsubVN;
import nro.models.database.PlayerDAO;

import nro.models.data.LocalManager;
import nro.models.map.service.ChangeMapService;
import nro.models.services.PlayerService;
import nro.models.database.ShopDAO;
import nro.models.item.Item;
import nro.models.managers.GiftCodeManager;
import nro.models.player.Inventory;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.server.Maintenance;
import nro.models.server.Manager;
import nro.models.server.PanelCommandService;
import nro.models.server.ServerManager;
import nro.models.services.InventoryService;
import nro.models.services.ItemService;
import nro.models.services.Service;
import nro.models.utils.Logger;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

public final class PanelActions {

    private static final Path ADMIN_MODE_FILE = Path.of("panel_admin_mode_status.txt");
    private static final Path EXP_STATUS_FILE = Path.of("panel_exp_status.txt");

    private PanelActions() {
    }

    public static Map<String, Object> runtimeConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("expRate", Manager.getExpRate());
        config.put("adminMode", PanelCommandService.isAdminModeOnly());
        config.put("maxPlayer", Manager.MAX_PLAYER);
        config.put("maxPerIp", Manager.MAX_PER_IP);
        config.put("waitLogin", Manager.SECOND_WAIT_LOGIN);
        config.put("gamePort", ServerManager.PORT);
        config.put("maintenance", Maintenance.isRunning);
        config.put("maintenanceCountdown", Maintenance.getCountdownSeconds());
        config.put("maintenanceCountdownActive", Maintenance.isCountdownActive());
        return config;
    }

    public static List<Map<String, Object>> listOnlinePlayers() {
        List<Map<String, Object>> result = new ArrayList<>();
        synchronized (Client.gI().getPlayers()) {
            for (Player player : Client.gI().getPlayers()) {
                if (player != null && player.name != null) {
                    result.add(playerSummary(player));
                }
            }
        }
        return result;
    }

    public static Map<String, Object> getOnlinePlayer(String name) {
        Player player = Client.gI().getPlayer(name);
        if (player == null) {
            return null;
        }
        return playerDetail(player);
    }

    public static boolean kickPlayer(String name) {
        Player target = Client.gI().getPlayer(name);
        if (target != null && target.getSession() != null) {
            Client.gI().kickSession(target.getSession());
            return true;
        }
        return false;
    }

    public static int kickAll() {
        int count = 0;
        List<Player> snapshot;
        synchronized (Client.gI().getPlayers()) {
            snapshot = new ArrayList<>(Client.gI().getPlayers());
        }
        for (Player player : snapshot) {
            if (player != null && player.getSession() != null) {
                Client.gI().kickSession(player.getSession());
                count++;
            }
        }
        return count;
    }

    public static boolean createPlayer(int accountId, String name, int gender, int hair) {
        if (accountId <= 0 || name == null || name.isBlank() || gender < 0 || gender > 2) {
            return false;
        }
        return PlayerDAO.createNewPlayer(accountId, name.toLowerCase(), (byte) gender, hair);
    }

    public static Map<String, Object> addCurrency(String name, long goldDelta, int gemDelta) {
        Player target = Client.gI().getPlayer(name);
        if (target == null || target.inventory == null || (goldDelta <= 0 && gemDelta <= 0)) {
            return Map.of("updated", false, "reason", "Player offline or invalid amount");
        }
        long oldGold = Math.max(0L, target.inventory.gold);
        int oldGem = Math.max(0, target.inventory.gem);
        long safeGoldDelta = Math.max(0L, goldDelta);
        int safeGemDelta = Math.max(0, gemDelta);
        long newGold = safeGoldDelta > Inventory.LIMIT_GOLD - oldGold
                ? Inventory.LIMIT_GOLD : oldGold + safeGoldDelta;
        int newGem = (int) Math.min(2_000_000_000L, (long) oldGem + safeGemDelta);
        target.inventory.gold = newGold;
        target.inventory.gem = newGem;
        InventoryService.gI().sendItemBags(target);
        PlayerDAO.updatePlayer(target);
        notifyPlayerSystem(target,
                "Panel vừa cộng tiền tệ cho nhân vật. Vàng: +" + String.format("%,d", safeGoldDelta)
                        + ", ngọc: +" + formatNumber(safeGemDelta));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("updated", true);
        result.put("gold", newGold);
        result.put("gem", newGem);
        result.put("goldDelta", safeGoldDelta);
        result.put("gemDelta", safeGemDelta);
        return result;
    }

    public static boolean buffVnd(String name, int amount) {

        Player target = Client.gI().getPlayer(name);
        if (target == null || amount <= 0 || target.getSession() == null) {
            return false;
        }
        try {
            LocalManager.executeUpdate(
                    "UPDATE account SET vnd = vnd + ?, tongnap = tongnap + ? WHERE id = ?",
                    amount,
                    amount,
                    target.getSession().userId
            );
        } catch (Exception e) {
            Logger.logException(PanelActions.class, e);
            return false;
        }
        target.getSession().vnd += amount;
        Service.gI().sendMoney(target);
        notifyPlayerSystem(target,
                "Chúc mừng! Tài khoản của bạn vừa được nạp thêm "
                        + formatNumber(amount) + " VND.\n"
                        + "Số dư đã được cập nhật. Cảm ơn bạn đã đồng hành cùng server!");
        return true;
    }

    public static int buffItem(String name, JSONArray items) {
        Player target = Client.gI().getPlayer(name);
        if (target == null || items == null) {
            return 0;
        }
        List<Item> added = new ArrayList<>();
        for (Object obj : items) {
            if (!(obj instanceof JSONObject itemData)) {
                continue;
            }
            int tempId = parseInt(String.valueOf(itemData.get("temp_id")), -1);
            int quantity = parseInt(String.valueOf(itemData.get("quantity")), 1);
            if (tempId < 0 || quantity <= 0) {
                continue;
            }
            Item item = ItemService.gI().createNewItem((short) tempId, quantity);
            item.itemOptions.clear();
            Object opts = itemData.get("options");
            if (opts instanceof JSONArray optionArray) {
                for (Object optObj : optionArray) {
                    if (optObj instanceof JSONObject opt) {
                        int id = parseInt(String.valueOf(opt.get("id")), -1);
                        int param = parseInt(String.valueOf(opt.get("param")), 0);
                        if (id >= 0) {
                            item.itemOptions.add(new Item.ItemOption(id, param));
                        }
                    }
                }
            }
            if (InventoryService.gI().addItemBag(target, item)) {
                added.add(item);
            }
        }
        if (!added.isEmpty()) {
            InventoryService.gI().sendItemBags(target);
            notifyPlayerSystem(target,
                    "Phần thưởng hệ thống: " + added.size() + " vật phẩm đã được gửi vào hành trang.\n"
                            + "Vui lòng kiểm tra túi đồ của bạn.");
        }
        return added.size();
    }

    public static void setAdminMode(boolean enabled) {
        PanelCommandService.setAdminMode(enabled);
        try {
            Files.writeString(ADMIN_MODE_FILE, enabled ? "1" : "0", StandardCharsets.UTF_8);
        } catch (IOException ignored) {
        }
        Service.gI().sendThongBaoAllPlayer(enabled
                ? "Server đã bật chế độ admin, tài khoản thường không thể đăng nhập."
                : "Server đã tắt chế độ admin.");
    }

    public static boolean setExpRate(int rate) {
        if (rate <= 0) {
            return false;
        }
        Manager.setExpRate(rate);
        try {
            Files.writeString(EXP_STATUS_FILE, String.valueOf(rate), StandardCharsets.UTF_8);
        } catch (IOException ignored) {
        }
        Service.gI().sendThongBaoAllPlayer("EXP server hiện tại: x" + rate);
        return true;
    }

    public static void broadcast(String message) {
        if (message != null && !message.isBlank()) {
            Service.gI().sendThongBaoAllPlayer(message.trim());
        }
    }

    /** Giải tán bang — RAM + DB + thông báo thành viên online (thực thi trực tiếp trên server đang chạy). */
    public static boolean dissolveClan(int clanId, String broadcastMessage) {
        return PanelClanBridge.dissolveClan(clanId, broadcastMessage);
    }

    public static boolean reloadClans() {
        return PanelClanBridge.reloadClans();
    }

    public static boolean cancelMaintenance() {
        boolean wasActive = Maintenance.isCountdownActive();
        Maintenance.gI().cancelMaintenance();
        return wasActive;
    }

    public static void startMaintenance(int seconds, boolean immediate, boolean cancel) {
        if (cancel) {
            cancelMaintenance();
            return;
        }
        if (immediate) {
            Maintenance.gI().startImmediately();
            return;
        }
        Maintenance.gI().startSeconds(Math.max(seconds, 5));
    }

    public static boolean reloadShop() {
        try (Connection con = LocalManager.getConnection()) {
            Manager.SHOPS = ShopDAO.getShops(con);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public static boolean reloadGiftcode() {
        try {
            GiftCodeManager mgr = GiftCodeManager.gI();
            try {
                mgr.getClass().getMethod("loadGiftCodeFromDB").invoke(mgr);
            } catch (NoSuchMethodException ignored) {
                // JAR/game build cũ chưa có loadGiftCodeFromDB
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public static boolean reloadBossSpawn() {
        try {
            Class<?> cls = Class.forName("nro.models.boss.spawn.BossSpawnConfig");
            cls.getMethod("reload").invoke(null);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public static List<Map<String, Object>> listBosses() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Boss boss : BossManager.gI().getBosses()) {
            if (boss == null || boss.isDie() || boss.getParentBoss() != null) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", boss.id);
            String displayName = boss.data != null && boss.data.length > 0
                    ? boss.data[0].getName() : boss.name;
            row.put("name", displayName);
            row.put("status", boss.bossStatus != null ? boss.bossStatus.name() : "UNKNOWN");
            row.put("hp", boss.nPoint != null ? boss.nPoint.hp : 0);
            row.put("hpMax", boss.nPoint != null ? boss.nPoint.hpMax : 0);
            if (boss.zone != null && boss.zone.map != null) {
                row.put("mapId", boss.zone.map.mapId);
                row.put("zoneId", boss.zone.zoneId);
                row.put("mapName", boss.zone.map.mapName);
            }
            if (isTdstBoss((int) boss.id)) {
                row.put("group", "TDST");
            }
            if (boss.bossStatus == BossStatus.REST && BossSpawnSchedule.appliesTo(boss)) {
                int sec = BossSpawnSchedule.secondsUntilSpawn(boss);
                row.put("spawnCountdownSec", sec);
                String block = BossSpawnSchedule.getRestBlockReason(boss);
                if (block != null) {
                    row.put("spawnBlockReason", block);
                }
                row.put("spawnTier", BossSpawnSchedule.resolveTier(boss).name());
            }
            result.add(row);
        }
        return result;
    }

    private static boolean isTdstBoss(int bossId) {
        return bossId == BossID.TIEU_DOI_TRUONG || bossId == BossID.TIEU_DOI_TRUONG_NM;
    }

    public static boolean spawnBoss(int bossId) {
        if (bossId >= 0) {
            return false;
        }
        Boss oldBoss = BossManager.gI().getBossById(bossId);
        if (oldBoss != null) {
            BossManager.gI().removeBoss(oldBoss);
        }
        BossManager.gI().createBoss(bossId);
        return true;
    }

    public static Map<String, Object> getEvents() {
        Map<String, Object> events = new LinkedHashMap<>();
        events.put("LUNNAR_NEW_YEAR", nro.models.event.EventManager.LUNNAR_NEW_YEAR);
        events.put("INTERNATIONAL_WOMANS_DAY", nro.models.event.EventManager.INTERNATIONAL_WOMANS_DAY);
        events.put("CHRISTMAS", nro.models.event.EventManager.CHRISTMAS);
        events.put("HALLOWEEN", nro.models.event.EventManager.HALLOWEEN);
        events.put("HUNG_VUONG", nro.models.event.EventManager.HUNG_VUONG);
        events.put("TRUNG_THU", nro.models.event.EventManager.TRUNG_THU);
        events.put("TOP_UP", nro.models.event.EventManager.TOP_UP);
        return events;
    }

    private static final java.util.Set<String> ALLOWED_CONFIG_FILES = java.util.Set.of(
            "Config.properties", "boss_spawn.properties", "maintenanceConfig.txt"
    );

    public static List<String> listConfigFiles() {
        return new ArrayList<>(ALLOWED_CONFIG_FILES);
    }

    public static String readConfigFile(String name) throws IOException {
        if (!ALLOWED_CONFIG_FILES.contains(name)) {
            throw new IOException("File not allowed");
        }
        java.nio.file.Path path = java.nio.file.Path.of(name);
        if (!java.nio.file.Files.exists(path)) {
            return "";
        }
        return java.nio.file.Files.readString(path, StandardCharsets.UTF_8);
    }

    public static void writeConfigFile(String name, String content) throws IOException {
        if (!ALLOWED_CONFIG_FILES.contains(name)) {
            throw new IOException("File not allowed");
        }
        java.nio.file.Path path = java.nio.file.Path.of(name);
        java.nio.file.Files.writeString(path, content == null ? "" : content, StandardCharsets.UTF_8);
        if ("boss_spawn.properties".equals(name)) {
            reloadBossSpawn();
        }
    }

    public static int buffItemFromJsonString(String name, String json) {
        Object parsed = JSONValue.parse(json);
        if (!(parsed instanceof JSONArray items)) {
            return 0;
        }
        return buffItem(name, items);
    }

    /** Push panel item payload directly to an online player (body/bag/box). */
    public static boolean applyItemsContainer(String name, String container, JSONArray itemsArray) {
        Player target = Client.gI().getPlayer(name);
        if (target == null || target.inventory == null || itemsArray == null) {
            return false;
        }
        List<Item> list = resolveItemContainer(target, container);
        if (list == null) {
            return false;
        }
        try {
            list.clear();
            for (Object obj : itemsArray) {
                if (obj instanceof JSONObject itemData) {
                    list.add(parsePanelItem(itemData));
                } else {
                    list.add(ItemService.gI().createItemNull());
                }
            }
            ensureBodySlotCount(list, container);
            target.nPoint.calPoint();
            sendContainerPackets(target, container);
            Service.gI().Send_Caitrang(target);
            return true;
        } catch (Exception e) {
            Logger.logException(PanelActions.class, e);
            return false;
        }
    }

    /** Apply latest DB row to an online player (panel edits). */
    public static boolean syncFromDatabase(String name) {
        Player target = Client.gI().getPlayer(name);
        if (target == null || target.nPoint == null || target.inventory == null) {
            return false;
        }
        Player db = AmodsubVN.loadById(target.id);
        if (db == null || db.nPoint == null || db.inventory == null) {
            if (db != null) {
                db.dispose();
            }
            return false;
        }
        try {
            target.inventory.gold = db.inventory.gold;
            target.inventory.gem = db.inventory.gem;
            target.inventory.ruby = db.inventory.ruby;
            target.inventory.coupon = db.inventory.coupon;
            target.inventory.event = db.inventory.event;

            target.nPoint.limitPower = db.nPoint.limitPower;
            target.nPoint.power = db.nPoint.power;
            target.nPoint.tiemNang = db.nPoint.tiemNang;
            target.nPoint.stamina = db.nPoint.stamina;
            target.nPoint.maxStamina = db.nPoint.maxStamina;
            target.nPoint.hpg = db.nPoint.hpg;
            target.nPoint.mpg = db.nPoint.mpg;
            target.nPoint.dameg = db.nPoint.dameg;
            target.nPoint.defg = db.nPoint.defg;
            target.nPoint.critg = db.nPoint.critg;
            target.nPoint.critdragon = db.nPoint.critdragon;
            target.nPoint.hp = db.nPoint.hp;
            target.nPoint.mp = db.nPoint.mp;

            try (Connection con = LocalManager.gI().getConnection();
                    PreparedStatement ps = con.prepareStatement(
                            "SELECT event_point, rank, point_sukien, point_sukien1, point_sukien2, point_maydam, thachdauwhis "
                                    + "FROM player WHERE id = ? LIMIT 1")) {
                ps.setLong(1, target.id);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        target.event.setEventPoint(rs.getInt("event_point"));
                        target.point_sukien = rs.getInt("point_sukien");
                        target.point_sukien1 = rs.getInt("point_sukien1");
                        target.point_sukien2 = rs.getInt("point_sukien2");
                        target.point_maydam = rs.getInt("point_maydam");
                        target.thachdauwhis = rs.getInt("thachdauwhis");
                    }
                }
            }

            if (target.getSession() != null) {
                try (Connection con = LocalManager.gI().getConnection();
                        PreparedStatement ps = con.prepareStatement(
                                "SELECT vnd, vip FROM account WHERE id = ? LIMIT 1")) {
                    ps.setInt(1, target.getSession().userId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            target.getSession().vnd = rs.getInt("vnd");
                            target.getSession().vip = rs.getInt("vip");
                        }
                    }
                }
            }

            if (db.zone != null && db.zone.map != null) {
                int mapId = db.zone.map.mapId;
                int x = db.location != null ? db.location.x : -1;
                if (target.zone == null || target.zone.map == null || target.zone.map.mapId != mapId) {
                    ChangeMapService.gI().changeMapInYard(target, mapId, -1, x);
                } else if (db.location != null) {
                    target.location.x = db.location.x;
                    target.location.y = db.location.y;
                }
            }

            syncItemList(target.inventory.itemsBody, db.inventory.itemsBody);
            syncItemList(target.inventory.itemsBag, db.inventory.itemsBag);
            syncItemList(target.inventory.itemsBox, db.inventory.itemsBox);
            syncTaskFromDb(target, db);
            syncSkillsFromDb(target, db);

            target.nPoint.calPoint();
            Service.gI().sendMoney(target);
            Service.gI().point(target);
            PlayerService.gI().sendInfoHpMpMoney(target);
            InventoryService.gI().sendItemBody(target);
            InventoryService.gI().sendItemBags(target);
            InventoryService.gI().sendItemBox(target);
            notifyPlayerSystem(target,
                    "Thông tin nhân vật của bạn đã được hệ thống đồng bộ thành công.\n"
                            + "Vui lòng kiểm tra lại chỉ số, túi đồ và trang bị.");
            return true;
        } catch (Exception e) {
            Logger.logException(PanelActions.class, e);
            return false;
        } finally {
            db.dispose();
        }
    }

    private static Map<String, Object> playerSummary(Player player) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", player.id);
        row.put("name", player.name);
        row.put("power", player.nPoint != null ? player.nPoint.power : 0);
        row.put("admin", player.isAdmin());
        if (player.zone != null && player.zone.map != null) {
            row.put("mapId", player.zone.map.mapId);
            row.put("zoneId", player.zone.zoneId);
        }
        if (player.getSession() != null) {
            row.put("vnd", player.getSession().vnd);
            row.put("ip", player.getSession().getIP());
        }
        return row;
    }

    private static Map<String, Object> playerDetail(Player player) {
        Map<String, Object> row = playerSummary(player);
        if (player.location != null) {
            row.put("x", player.location.x);
            row.put("y", player.location.y);
        }
        if (player.getSession() != null) {
            row.put("userId", player.getSession().userId);
            row.put("username", player.getSession().uu);
        }
        return row;
    }

    private static void notifyPlayerSystem(Player player, String message) {
        String serverName = ServerManager.NAME_SERVER != null && !ServerManager.NAME_SERVER.isBlank()
                ? ServerManager.NAME_SERVER.trim()
                : "Hệ thống";
        Service.gI().sendThongBaoFromAdmin(player, "[" + serverName + "]\n" + message);
    }

    private static void syncTaskFromDb(Player target, Player db) {
        if (target.playerTask == null || db.playerTask == null || db.playerTask.taskMain == null) {
            return;
        }
        var src = db.playerTask.taskMain;
        target.playerTask.taskMain = TaskService.gI().getTaskMainById(target, src.id);
        target.playerTask.taskMain.index = src.index;
        target.playerTask.taskMain.lastTime = src.lastTime;
        if (src.index >= 0
                && src.index < target.playerTask.taskMain.subTasks.size()
                && src.index < src.subTasks.size()) {
            target.playerTask.taskMain.subTasks.get(src.index).count = src.subTasks.get(src.index).count;
        }
        TaskService.gI().sendTaskMain(target);
    }

    private static void syncSkillsFromDb(Player target, Player db) {
        if (target.playerSkill == null || db.playerSkill == null) {
            return;
        }
        target.playerSkill.skills.clear();
        for (Skill skill : db.playerSkill.skills) {
            if (skill == null || skill.template == null) {
                target.playerSkill.skills.add(SkillUtil.createSkillLevel0(-1));
                continue;
            }
            Skill copy = skill.point != 0
                    ? SkillUtil.createSkill(skill.template.id, skill.point)
                    : SkillUtil.createSkillLevel0(skill.template.id);
            copy.lastTimeUseThisSkill = skill.lastTimeUseThisSkill;
            copy.currLevel = skill.currLevel;
            target.playerSkill.skills.add(copy);
        }
        System.arraycopy(
                db.playerSkill.skillShortCut, 0,
                target.playerSkill.skillShortCut, 0,
                Math.min(target.playerSkill.skillShortCut.length, db.playerSkill.skillShortCut.length));
        target.playerSkill.skillSelect = null;
        for (int shortcutId : target.playerSkill.skillShortCut) {
            Skill selected = target.playerSkill.getSkillbyId(shortcutId);
            if (selected != null && selected.damage > 0) {
                target.playerSkill.skillSelect = selected;
                break;
            }
        }
        if (target.playerSkill.skillSelect == null) {
            int defaultId = target.gender == ConstPlayer.TRAI_DAT ? Skill.DRAGON
                    : (target.gender == ConstPlayer.NAMEC ? Skill.DEMON : Skill.GALICK);
            target.playerSkill.skillSelect = target.playerSkill.getSkillbyId(defaultId);
        }
        target.playerSkill.sendSkillShortCut();
        if (target.getSession() != null) {
            DataGame.updateSkill(target.getSession());
        }
    }

    private static void syncItemList(java.util.List<Item> target, java.util.List<Item> source) {
        if (target == null) {
            return;
        }
        target.clear();
        if (source == null) {
            return;
        }
        for (Item item : source) {
            if (item != null && item.isNotNullItem()) {
                target.add(item.cloneItem());
            } else {
                target.add(ItemService.gI().createItemNull());
            }
        }
    }

    private static List<Item> resolveItemContainer(Player player, String container) {
        return switch (container) {
            case "body" -> player.inventory.itemsBody;
            case "bag" -> player.inventory.itemsBag;
            case "box" -> player.inventory.itemsBox;
            default -> null;
        };
    }

    private static Item parsePanelItem(JSONObject data) {
        int templateId = parseInt(String.valueOf(data.get("templateId")), -1);
        boolean empty = templateId < 0 || boolValue(data.get("empty"));
        if (empty) {
            return ItemService.gI().createItemNull();
        }
        int quantity = parseInt(String.valueOf(data.get("quantity")), 1);
        Item item = ItemService.gI().createNewItem((short) templateId, Math.max(quantity, 1));
        item.itemOptions.clear();
        Object opts = data.get("options");
        if (opts instanceof JSONArray optionArray) {
            for (Object optObj : optionArray) {
                if (optObj instanceof JSONObject opt) {
                    int id = parseInt(String.valueOf(opt.get("id")), -1);
                    int param = parseInt(String.valueOf(opt.get("param")), 0);
                    if (id >= 0) {
                        item.itemOptions.add(new Item.ItemOption(id, param));
                    }
                }
            }
        }
        Object ct = data.get("createTime");
        if (ct != null) {
            try {
                item.createTime = Long.parseLong(String.valueOf(ct));
            } catch (Exception ignored) {
            }
        }
        if (ItemService.gI().isOutOfDateTime(item)) {
            return ItemService.gI().createItemNull();
        }
        return item;
    }

    private static void ensureBodySlotCount(List<Item> list, String container) {
        if (!"body".equals(container)) {
            return;
        }
        while (list.size() < 11) {
            list.add(ItemService.gI().createItemNull());
        }
    }

    private static void sendContainerPackets(Player target, String container) {
        switch (container) {
            case "body" -> InventoryService.gI().sendItemBody(target);
            case "bag" -> InventoryService.gI().sendItemBags(target);
            case "box" -> InventoryService.gI().sendItemBox(target);
            default -> {
            }
        }
        Service.gI().point(target);
        PlayerService.gI().sendInfoHpMpMoney(target);
    }

    private static boolean boolValue(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    private static String formatNumber(int value) {
        return String.format("%,d", value).replace(',', '.');
    }

    private static int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value.trim());
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
