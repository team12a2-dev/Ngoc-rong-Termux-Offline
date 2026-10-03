package nro.models.event;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.ArrayList;
import java.util.List;
import java.util.Stack;
import nro.models.item.Item;
import nro.models.map.service.ChangeMapService;
import nro.models.network.Message;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.player_system.Template;
import nro.models.services.ItemService;
import nro.models.services.NpcService;
import nro.models.services.Service;
import nro.models.shop.ItemShop;
import nro.models.shop.Shop;
import nro.models.shop.ShopService;
import nro.models.shop.TabShop;
import nro.models.utils.Logger;
import nro.models.utils.Util;

/**
 * NPC Sự Kiện Động - Khởi tạo từ cấu hình Web Panel & SQL.
 * Hỗ trợ: Cây Menu Đa Tầng (Recursive Nested Menus), Sub-menu quy đổi,
 * Hộp thoại xác nhận trao quà, Cải trang, Icon và Chat tự động.
 */
public class DynamicEventNpc extends Npc {

    private static final Gson GSON = new Gson();

    public final long eventId;
    public final String eventKey;
    public final String customNpcName;
    public final boolean hideName;
    public final String modelType;
    public final int head;
    public final int body;
    public final int leg;
    public final int dialogAvatarId;
    public final String greetingText;
    public final String subDialogText;
    public final List<String> autoChatPhrases = new ArrayList<>();
    public final int chatIntervalSec;
    public final List<EventMenuNode> rootMenuNodes = new ArrayList<>();

    private long lastAutoChatTime;

    public DynamicEventNpc(long eventId, String eventKey, int mapId, int status, int cx, int cy,
                           int tempId, int avatarId, int dialogAvatarId, String npcName, boolean hideName,
                           String modelType, int head, int body, int leg,
                           String greetingText, String subDialogText,
                           List<String> chatPhrases, int chatIntervalSec,
                           String menusJson) {
        super(mapId, status, cx, cy, tempId, avatarId > 0 ? avatarId : (head > 0 ? head : 349));
        this.eventId = eventId;
        this.eventKey = eventKey;
        int resolvedAvatar = dialogAvatarId;
        if (resolvedAvatar <= 0 || resolvedAvatar == 349) {
            int fromHead = DynamicEventManager.resolveAvatarFromHead(head);
            if (fromHead > 0) {
                resolvedAvatar = fromHead;
            } else if (avatarId > 0 && avatarId != 349) {
                resolvedAvatar = avatarId;
            } else {
                resolvedAvatar = (dialogAvatarId > 0) ? dialogAvatarId : 349;
            }
        }
        this.dialogAvatarId = resolvedAvatar;
        this.avartar = resolvedAvatar;
        this.customNpcName = npcName;
        this.hideName = hideName;
        this.modelType = modelType != null ? modelType : "costume";
        this.head = head;
        this.body = body;
        this.leg = leg;
        this.greetingText = greetingText != null && !greetingText.isBlank()
                ? greetingText : "Chào mừng đến với sự kiện " + (eventKey != null ? eventKey : "") + "!";
        this.subDialogText = subDialogText != null ? subDialogText : "";
        if (chatPhrases != null) {
            this.autoChatPhrases.addAll(chatPhrases);
        }
        this.chatIntervalSec = Math.max(5, chatIntervalSec);
        parseMenus(menusJson);
    }

    private void parseMenus(String json) {
        if (json == null || json.isBlank()) return;
        try {
            JsonElement el = GSON.fromJson(json, JsonElement.class);
            if (el != null && el.isJsonArray()) {
                JsonArray arr = el.getAsJsonArray();
                for (JsonElement item : arr) {
                    if (!item.isJsonObject()) continue;
                    EventMenuNode node = parseMenuNode(item.getAsJsonObject());
                    if (node != null) {
                        rootMenuNodes.add(node);
                    }
                }
            }
        } catch (Exception e) {
            Logger.warning("Lỗi parse menus của DynamicEventNpc: " + e.getMessage() + "\n");
        }
    }

    private EventMenuNode parseMenuNode(JsonObject obj) {
        if (obj == null) return null;
        String title = obj.has("title") ? obj.get("title").getAsString() : "Tương tác";
        JsonObject cond = obj.has("condition") && obj.get("condition").isJsonObject()
                ? obj.getAsJsonObject("condition") : null;
        JsonObject act = obj.has("action") && obj.get("action").isJsonObject()
                ? obj.getAsJsonObject("action") : null;

        EventMenuNode node = new EventMenuNode(title, cond, act);

        // Hỗ trợ mảng con children (Cây phân cấp đa tầng)
        if (obj.has("children") && obj.get("children").isJsonArray()) {
            JsonArray arr = obj.getAsJsonArray("children");
            for (JsonElement childEl : arr) {
                if (childEl.isJsonObject()) {
                    EventMenuNode childNode = parseMenuNode(childEl.getAsJsonObject());
                    if (childNode != null) {
                        node.children.add(childNode);
                    }
                }
            }
        }
        return node;
    }

    @Override
    public boolean canOpenNpc(Player player) {
        if (player == null || player.zone == null || player.zone.map == null) {
            return false;
        }
        if (player.zone.map.mapId != this.mapId) {
            Service.gI().sendThongBao(player, "NPC không có ở khu vực này!");
            Service.gI().hideWaitDialog(player);
            return false;
        }
        player.idMark.setNpcChose(this);
        return true;
    }

    @Override
    public void createOtherMenu(Player player, int indexMenu, String npcSay, String... menuSelect) {
        try {
            String say = (npcSay != null && !npcSay.isBlank()) ? npcSay : "Ta có thể giúp gì cho ngươi ?";
            String[] options = (menuSelect != null && menuSelect.length > 0) ? menuSelect : new String[]{"Đóng"};
            super.createOtherMenu(player, indexMenu, say, options);
        } catch (Exception e) {
            Logger.logException(DynamicEventNpc.class, e);
        }
    }

    @Override
    public void openBaseMenu(Player player) {
        if (!canOpenNpc(player)) {
            Service.gI().hideWaitDialog(player);
            return;
        }

        // Khởi tạo ngăn xếp điều hướng (Navigation Stack) cho người chơi
        PlayerMenuState state = new PlayerMenuState(this.rootMenuNodes);
        NpcFactory_EventContext.setPlayerMenuState(player.id, state);

        showCurrentMenuState(player, state);
    }

    private void showCurrentMenuState(Player player, PlayerMenuState state) {
        List<EventMenuNode> activeNodes = state.getCurrentLevelNodes();
        List<String> visibleButtons = new ArrayList<>();
        List<EventMenuNode> matchedNodes = new ArrayList<>();

        if (activeNodes != null) {
            for (EventMenuNode node : activeNodes) {
                if (node != null && checkCondition(player, node.condition)) {
                    visibleButtons.add(node.title != null ? node.title : "Tương tác");
                    matchedNodes.add(node);
                }
            }
        }

        state.setMatchedNodes(matchedNodes);

        if (state.getDepth() > 0) {
            visibleButtons.add("⬅ Quay lại");
            visibleButtons.add("Đóng");
        } else {
            if (visibleButtons.isEmpty()) {
                visibleButtons.add("Đóng");
            } else {
                visibleButtons.add("Từ chối");
            }
        }

        player.idMark.setIndexMenu(8888);
        String say = state.getCurrentDialogText(greetingText, subDialogText);
        createOtherMenu(player, 8888, say, visibleButtons.toArray(new String[0]));
    }

    @Override
    public void confirmMenu(Player player, int select) {
        try {
            int currentMenuIndex = player.idMark.getIndexMenu();

            // Xử lý Hộp thoại xác nhận Quy Đổi (index 8890)
            if (currentMenuIndex == 8890) {
                ExchangeRecipeItem pending = NpcFactory_EventContext.getPlayerPendingExchange(player.id);
                NpcFactory_EventContext.removePlayer(player.id);
                player.idMark.setIndexMenu(-1);
                player.idMark.setNpcChose(null);

                if (pending == null || select != 0) {
                    Service.gI().sendThongBao(player, "Đã hủy thao tác.");
                    return;
                }
                executeExchange(player, pending);
                return;
            }

            // Xử lý Menu điều hướng các tầng (index 8888)
            PlayerMenuState state = NpcFactory_EventContext.getPlayerMenuState(player.id);
            if (state == null) {
                player.idMark.setIndexMenu(-1);
                player.idMark.setNpcChose(null);
                return;
            }

            List<EventMenuNode> matched = state.getMatchedNodes();
            int matchedSize = matched != null ? matched.size() : 0;

            // Kiểm tra nút "Quay lại" hoặc "Đóng/Từ chối"
            if (state.getDepth() > 0) {
                if (select == matchedSize) { // Nút "⬅ Quay lại"
                    state.popLevel();
                    showCurrentMenuState(player, state);
                    return;
                } else if (select == matchedSize + 1) { // Nút "Đóng"
                    NpcFactory_EventContext.removePlayer(player.id);
                    player.idMark.setIndexMenu(-1);
                    player.idMark.setNpcChose(null);
                    Service.gI().hideWaitDialog(player);
                    return;
                }
            } else {
                if (select >= matchedSize) { // Nút "Từ chối" / "Đóng"
                    NpcFactory_EventContext.removePlayer(player.id);
                    player.idMark.setIndexMenu(-1);
                    player.idMark.setNpcChose(null);
                    Service.gI().hideWaitDialog(player);
                    return;
                }
            }

            if (select < 0 || select >= matchedSize) {
                NpcFactory_EventContext.removePlayer(player.id);
                player.idMark.setIndexMenu(-1);
                player.idMark.setNpcChose(null);
                Service.gI().hideWaitDialog(player);
                return;
            }

            EventMenuNode chosen = matched.get(select);

            // 1. Nếu Node có danh sách con (Sub-menu tầng tiếp theo)
            if (!chosen.children.isEmpty() || (chosen.action != null && "submenu".equalsIgnoreCase(chosen.action.has("type") ? chosen.action.get("type").getAsString() : ""))) {
                String subSay = chosen.action != null && chosen.action.has("message") && !chosen.action.get("message").getAsString().isBlank()
                        ? chosen.action.get("message").getAsString() : ("Danh mục: " + chosen.title);
                state.pushLevel(chosen.children, subSay);
                showCurrentMenuState(player, state);
                return;
            }

            // 2. Thực hiện hành động của Node nếu là lá (Leaf Node)
            // Xóa state điều hướng khi thực hiện hành động lá
            NpcFactory_EventContext.removePlayer(player.id);
            player.idMark.setIndexMenu(-1);
            player.idMark.setNpcChose(null);

            if (chosen.action == null) {
                Service.gI().sendThongBao(player, "Chức năng đang cập nhật!");
                return;
            }

            String type = chosen.action.has("type") ? chosen.action.get("type").getAsString() : "";
            switch (type) {
                case "exchange":
                case "open_recipe":
                case "open_shop_spec":
                    String mode = chosen.action.has("mode") ? chosen.action.get("mode").getAsString() : "dialog";
                    if ("shop_spec".equalsIgnoreCase(mode) || "open_shop_spec".equalsIgnoreCase(type)
                            || (chosen.action.has("items") && chosen.action.get("items").isJsonArray() && chosen.action.getAsJsonArray("items").size() > 1)) {
                        openSpecExchangeShop(player, chosen);
                    } else {
                        handleDirectExchangePrompt(player, chosen);
                    }
                    break;
                case "open_shop":
                    String shopMode = chosen.action.has("mode") ? chosen.action.get("mode").getAsString() : "shop";
                    if ("dialog".equalsIgnoreCase(shopMode)) {
                        handleDirectExchangePrompt(player, chosen);
                        break;
                    }
                    // 1. Nếu node có cấu hình items danh sách quy đổi => Mở shop đổi thưởng động
                    if (chosen.action.has("items") && chosen.action.get("items").isJsonArray() && chosen.action.getAsJsonArray("items").size() > 0) {
                        openSpecExchangeShop(player, chosen);
                        break;
                    }
                    if (chosen.action.has("exchange") && chosen.action.get("exchange").isJsonObject()) {
                        openSpecExchangeShop(player, chosen);
                        break;
                    }

                    // 2. Mở shop theo tagName
                    String tagName = chosen.action.has("tagName") && !chosen.action.get("tagName").getAsString().isBlank()
                            ? chosen.action.get("tagName").getAsString().trim() : "SANTA";
                    try {
                        ShopService.gI().opendShop(player, tagName, true);
                    } catch (Exception e) {
                        Logger.logException(DynamicEventNpc.class, e);
                        Service.gI().sendThongBao(player, "Cửa hàng sự kiện đang được cập nhật!");
                    }
                    break;
                case "teleport":
                    int targetMap = chosen.action.has("targetMap") ? chosen.action.get("targetMap").getAsInt() : 5;
                    int targetX = chosen.action.has("targetX") ? chosen.action.get("targetX").getAsInt() : 400;
                    int targetY = chosen.action.has("targetY") ? chosen.action.get("targetY").getAsInt() : 400;
                    ChangeMapService.gI().changeMapInYard(player, targetMap, -1, targetX);
                    break;
                case "dialog":
                    String msg = chosen.action.has("message") ? chosen.action.get("message").getAsString() : greetingText;
                    NpcService.gI().createTutorial(player, this.dialogAvatarId, msg);
                    break;
                case "claim_recharge":
                    Service.gI().sendThongBao(player, "Đã gửi yêu cầu nhận thưởng mốc nạp sự kiện!");
                    break;
                case "ranking":
                    String rankTitle = chosen.action.has("title") ? chosen.action.get("title").getAsString() : "TOP SỰ KIỆN";
                    showTopEvent(player, rankTitle);
                    break;
                default:
                    Service.gI().sendThongBao(player, "Thao tác thành công!");
                    break;
            }
        } catch (Exception ex) {
            Logger.logException(DynamicEventNpc.class, ex);
            player.idMark.setIndexMenu(-1);
            player.idMark.setNpcChose(null);
        }
    }

    private static int getIntSafe(JsonObject obj, String key, int defaultVal) {
        if (obj == null || !obj.has(key)) return defaultVal;
        try {
            JsonElement el = obj.get(key);
            if (el.isJsonNull()) return defaultVal;
            if (el.isJsonPrimitive()) {
                String str = el.getAsString().trim();
                if (str.isEmpty()) return defaultVal;
                return (int) Double.parseDouble(str);
            }
            return el.getAsInt();
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private static long getLongSafe(JsonObject obj, String key, long defaultVal) {
        if (obj == null || !obj.has(key)) return defaultVal;
        try {
            JsonElement el = obj.get(key);
            if (el.isJsonNull()) return defaultVal;
            if (el.isJsonPrimitive()) {
                String str = el.getAsString().trim();
                if (str.isEmpty()) return defaultVal;
                return (long) Double.parseDouble(str);
            }
            return el.getAsLong();
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private void handleDirectExchangePrompt(Player player, EventMenuNode node) {
        ExchangeRecipeItem recipe = extractRecipeFromNode(node);
        if (recipe == null) {
            Service.gI().sendThongBao(player, "Không tìm thấy công thức quy đổi!");
            return;
        }

        player.idMark.setIndexMenu(8890);
        NpcFactory_EventContext.setPlayerPendingExchange(player.id, recipe);
        String say = "Bạn có chắc muốn đổi\n" + recipe.reqCount + " " + recipe.reqName + " lấy " + recipe.targetName + " ?";
        createOtherMenu(player, 8890, say, "Đồng ý", "Từ chối");
    }

    private ExchangeRecipeItem extractRecipeFromNode(EventMenuNode node) {
        if (node.action == null) return null;
        JsonObject act = node.action;

        // 1. Cấu hình exchange trực tiếp trong node
        if (act.has("exchange") && act.get("exchange").isJsonObject()) {
            JsonObject ex = act.getAsJsonObject("exchange");
            int targetTempId = getIntSafe(ex, "targetTempId", 0);
            int targetCount = Math.max(1, getIntSafe(ex, "targetCount", 1));
            String targetName = ex.has("targetName") ? ex.get("targetName").getAsString() : "";
            int reqTempId = getIntSafe(ex, "reqTempId", 73);
            int reqCount = Math.max(1, getIntSafe(ex, "reqCount", 99));
            String reqName = ex.has("reqName") ? ex.get("reqName").getAsString() : "";
            int durationDays = getIntSafe(ex, "durationDays", 0);

            Template.ItemTemplate targetTemp = ItemService.gI().getTemplate((short) targetTempId);
            Template.ItemTemplate reqTemp = ItemService.gI().getTemplate((short) reqTempId);
            if (targetName.isBlank() && targetTemp != null) targetName = targetTemp.name;
            if (reqName.isBlank() && reqTemp != null) reqName = reqTemp.name;

            return new ExchangeRecipeItem(targetTempId, targetCount, targetName, reqTempId, reqCount, reqName, durationDays, node.title);
        }

        // 2. Cấu hình items mảng trong action
        if (act.has("items") && act.get("items").isJsonArray()) {
            JsonArray arr = act.getAsJsonArray("items");
            if (arr.size() > 0 && arr.get(0).isJsonObject()) {
                JsonObject itObj = arr.get(0).getAsJsonObject();
                int targetTempId = getIntSafe(itObj, "targetTempId", 0);
                int targetCount = Math.max(1, getIntSafe(itObj, "targetCount", 1));
                String targetName = itObj.has("targetName") ? itObj.get("targetName").getAsString() : "";
                int reqTempId = getIntSafe(itObj, "reqTempId", 73);
                int reqCount = Math.max(1, getIntSafe(itObj, "reqCount", 99));
                String reqName = itObj.has("reqName") ? itObj.get("reqName").getAsString() : "";
                int durationDays = getIntSafe(itObj, "durationDays", 0);

                Template.ItemTemplate targetTemp = ItemService.gI().getTemplate((short) targetTempId);
                Template.ItemTemplate reqTemp = ItemService.gI().getTemplate((short) reqTempId);
                if (targetName.isBlank() && targetTemp != null) targetName = targetTemp.name;
                if (reqName.isBlank() && reqTemp != null) reqName = reqTemp.name;

                return new ExchangeRecipeItem(targetTempId, targetCount, targetName, reqTempId, reqCount, reqName, durationDays, node.title);
            }
        }

        return null;
    }

    private void executeExchange(Player player, ExchangeRecipeItem recipe) {
        if (player == null || player.inventory == null || player.inventory.itemsBag == null) return;

        // 1. Kiểm tra số lượng nguyên liệu trong hành trang
        int currentCount = 0;
        for (Item it : player.inventory.itemsBag) {
            if (it != null && it.isNotNullItem() && it.template != null && it.template.id == recipe.reqTempId) {
                currentCount += it.quantity;
            }
        }

        if (currentCount < recipe.reqCount) {
            Service.gI().sendThongBao(player, "Bạn không đủ nguyên liệu!\nCần " + recipe.reqCount + " " + recipe.reqName + " (Hiện có: " + currentCount + ")");
            return;
        }

        // 2. Trừ nguyên liệu thực tế từ túi hành trang
        int remainToSub = recipe.reqCount;
        for (Item it : player.inventory.itemsBag) {
            if (it != null && it.isNotNullItem() && it.template != null && it.template.id == recipe.reqTempId) {
                if (it.quantity >= remainToSub) {
                    nro.models.services.InventoryService.gI().subQuantityItemsBag(player, it, remainToSub);
                    break;
                } else {
                    remainToSub -= it.quantity;
                    nro.models.services.InventoryService.gI().subQuantityItemsBag(player, it, it.quantity);
                }
            }
        }

        // 3. Tạo vật phẩm nhận
        Item reward = ItemService.gI().createNewItem((short) recipe.targetTempId, Math.max(1, recipe.targetCount));
        if (recipe.durationDays > 0) {
            reward.itemOptions.add(new Item.ItemOption(93, recipe.durationDays));
        }
        if (reward.template != null && reward.template.type == 5) { // Cải trang
            reward.itemOptions.add(new Item.ItemOption(77, 10));
            reward.itemOptions.add(new Item.ItemOption(103, 10));
            reward.itemOptions.add(new Item.ItemOption(50, 10));
        }

        nro.models.services.InventoryService.gI().addItemBag(player, reward);
        nro.models.services.InventoryService.gI().sendItemBags(player);
        Service.gI().sendThongBao(player, "Đổi thành công " + recipe.targetName + "!");
    }

    public void openSpecExchangeShop(Player player, EventMenuNode node) {
        try {
            Shop shop = new Shop();
            shop.id = -9999;
            shop.npcId = (byte) this.tempId;
            shop.tagName = "EVENT_EXCHANGE_" + this.eventId;
            shop.typeShop = 3; // SPEC_SHOP (Shop Đổi Thưởng)

            TabShop tab = new TabShop();
            tab.shop = shop;
            tab.id = 1;
            tab.name = "Đổi\nthưởng";

            List<ExchangeRecipeItem> recipes = new ArrayList<>();
            if (node.action != null && node.action.has("items") && node.action.get("items").isJsonArray()) {
                JsonArray itemsArr = node.action.getAsJsonArray("items");
                for (JsonElement el : itemsArr) {
                    if (!el.isJsonObject()) continue;
                    JsonObject itObj = el.getAsJsonObject();
                    int targetTempId = itObj.has("targetTempId") ? itObj.get("targetTempId").getAsInt() : 0;
                    int targetCount = itObj.has("targetCount") ? itObj.get("targetCount").getAsInt() : 1;
                    String targetName = itObj.has("targetName") ? itObj.get("targetName").getAsString() : "";
                    int reqTempId = itObj.has("reqTempId") ? itObj.get("reqTempId").getAsInt() : 73;
                    int reqCount = itObj.has("reqCount") ? itObj.get("reqCount").getAsInt() : 99;
                    String reqName = itObj.has("reqName") ? itObj.get("reqName").getAsString() : "";
                    int durationDays = itObj.has("durationDays") ? itObj.get("durationDays").getAsInt() : 0;

                    Template.ItemTemplate targetTemp = ItemService.gI().getTemplate((short) targetTempId);
                    Template.ItemTemplate reqTemp = ItemService.gI().getTemplate((short) reqTempId);
                    if (targetTemp == null) continue;
                    if (targetName.isBlank()) targetName = targetTemp.name;
                    if (reqName.isBlank() && reqTemp != null) reqName = reqTemp.name;

                    recipes.add(new ExchangeRecipeItem(targetTempId, targetCount, targetName, reqTempId, reqCount, reqName, durationDays, targetName));
                }
            }

            if (recipes.isEmpty()) {
                ExchangeRecipeItem singleRec = extractRecipeFromNode(node);
                if (singleRec != null) {
                    recipes.add(singleRec);
                }
            }

            for (ExchangeRecipeItem r : recipes) {
                Template.ItemTemplate targetTemp = ItemService.gI().getTemplate((short) r.targetTempId);
                Template.ItemTemplate reqTemp = ItemService.gI().getTemplate((short) r.reqTempId);
                if (targetTemp == null) continue;

                ItemShop is = new ItemShop();
                is.tabShop = tab;
                is.id = targetTemp.id;
                is.temp = targetTemp;
                is.isNew = true;
                is.typeSell = 3; // SPEC_SHOP
                is.cost = r.reqCount;
                is.iconSpec = reqTemp != null ? reqTemp.iconID : 4010;

                if (r.durationDays > 0) {
                    is.options.add(new Item.ItemOption(93, r.durationDays));
                }
                if (targetTemp.type == 5) {
                    is.options.add(new Item.ItemOption(77, 10));
                    is.options.add(new Item.ItemOption(103, 10));
                    is.options.add(new Item.ItemOption(50, 10));
                }
                tab.itemShops.add(is);
            }

            if (tab.itemShops.isEmpty()) {
                Service.gI().sendThongBao(player, "Chưa có vật phẩm quy đổi nào!");
                return;
            }

            shop.tabShops.add(tab);
            ShopService.gI().openShopType3(player, shop);
        } catch (Exception e) {
            Logger.logException(DynamicEventNpc.class, e);
            Service.gI().sendThongBao(player, "Không thể mở bảng đổi thưởng!");
        }
    }

    public void showTopEvent(Player player, String topTitle) {
        Message msg = new Message(-96);
        try {
            msg.writer().writeByte(0);
            msg.writer().writeUTF(topTitle != null && !topTitle.isBlank() ? topTitle : "TOP SỰ KIỆN");
            List<TopPlayerEvent> topList = loadTopEventPlayers();
            msg.writer().writeByte(Math.min(100, topList.size()));
            for (int i = 0; i < Math.min(100, topList.size()); i++) {
                TopPlayerEvent tp = topList.get(i);
                msg.writer().writeInt(i + 1); // rank
                msg.writer().writeInt(tp.id);
                msg.writer().writeShort(tp.head > 0 ? tp.head : 349);
                if (player.getSession().version > 214) {
                    msg.writer().writeShort(-1);
                }
                msg.writer().writeShort(tp.body > 0 ? tp.body : -1);
                msg.writer().writeShort(tp.leg > 0 ? tp.leg : -1);
                msg.writer().writeUTF(tp.name);
                msg.writer().writeUTF("Điểm: " + Util.formatNumber(tp.point));
                msg.writer().writeUTF("Hạng #" + (i + 1));
            }
            player.sendMessage(msg);
            msg.cleanup();
        } catch (Exception e) {
            Logger.logException(DynamicEventNpc.class, e);
            Service.gI().sendThongBao(player, "Bảng xếp hạng đang được cập nhật!");
        }
    }

    private List<TopPlayerEvent> loadTopEventPlayers() {
        List<TopPlayerEvent> list = new ArrayList<>();
        String sql = "SELECT id, name, head, IFNULL(point_sukien, 0) as point FROM player WHERE point_sukien > 0 ORDER BY point_sukien DESC LIMIT 100";
        try (java.sql.Connection con = nro.models.data.LocalManager.getConnection();
             java.sql.PreparedStatement ps = con.prepareStatement(sql);
             java.sql.ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new TopPlayerEvent(
                        rs.getInt("id"),
                        rs.getString("name"),
                        rs.getShort("head"),
                        (short) -1,
                        (short) -1,
                        rs.getLong("point")
                ));
            }
        } catch (Exception e) {
            Logger.warning("Lỗi load Top sự kiện: " + e.getMessage() + "\n");
        }
        return list;
    }

    public static record TopPlayerEvent(int id, String name, short head, short body, short leg, long point) {}

    public static record ExchangeRecipeItem(int targetTempId, int targetCount, String targetName, int reqTempId, int reqCount, String reqName, int durationDays, String buttonTitle) {}

    private boolean checkCondition(Player player, JsonObject cond) {
        if (cond == null) return true;
        try {
            long minPower = getLongSafe(cond, "minPower", 0);
            if (minPower > 0 && player.nPoint.power < minPower) {
                return false;
            }
            int minLevel = getIntSafe(cond, "minLevel", 0);
            if (minLevel > 1) {
                // kiểm tra cấp độ nếu áp dụng
            }
            if (cond.has("requireClan") && cond.get("requireClan").getAsBoolean() && player.clan == null) {
                return false;
            }
        } catch (Exception e) {
            return true;
        }
        return true;
    }

    public void tickOverheadChat() {
        if (autoChatPhrases.isEmpty()) return;
        if (Util.canDoWithTime(lastAutoChatTime, (long) chatIntervalSec * 1000L)) {
            lastAutoChatTime = System.currentTimeMillis();
            String phrase = autoChatPhrases.get(Util.nextInt(autoChatPhrases.size()));
            try {
                this.npcChat(phrase);
            } catch (Exception ignored) {
            }
        }
    }

    public static class EventMenuNode {
        public String title;
        public JsonObject condition;
        public JsonObject action;
        public List<EventMenuNode> children = new ArrayList<>();

        public EventMenuNode(String title, JsonObject condition, JsonObject action) {
            this.title = title;
            this.condition = condition;
            this.action = action;
        }
    }

    public static class PlayerMenuState {
        private final Stack<List<EventMenuNode>> levelStack = new Stack<>();
        private final Stack<String> dialogStack = new Stack<>();
        private List<EventMenuNode> matchedNodes = new ArrayList<>();

        public PlayerMenuState(List<EventMenuNode> rootNodes) {
            levelStack.push(rootNodes);
        }

        public List<EventMenuNode> getCurrentLevelNodes() {
            return levelStack.isEmpty() ? new ArrayList<>() : levelStack.peek();
        }

        public void pushLevel(List<EventMenuNode> childNodes, String dialogSay) {
            levelStack.push(childNodes);
            dialogStack.push(dialogSay);
        }

        public void popLevel() {
            if (levelStack.size() > 1) {
                levelStack.pop();
            }
            if (!dialogStack.isEmpty()) {
                dialogStack.pop();
            }
        }

        public int getDepth() {
            return levelStack.size() - 1;
        }

        public String getCurrentDialogText(String rootGreeting, String rootSub) {
            if (!dialogStack.isEmpty()) {
                return dialogStack.peek();
            }
            if (rootSub != null && !rootSub.isBlank()) {
                return rootGreeting + "\n" + rootSub;
            }
            return rootGreeting;
        }

        public void setMatchedNodes(List<EventMenuNode> nodes) {
            this.matchedNodes = nodes;
        }

        public List<EventMenuNode> getMatchedNodes() {
            return this.matchedNodes;
        }
    }

    public static class NpcFactory_EventContext {
        private static final java.util.Map<Long, PlayerMenuState> PLAYER_STATES = new java.util.concurrent.ConcurrentHashMap<>();
        private static final java.util.Map<Long, ExchangeRecipeItem> PENDING_EXCHANGE = new java.util.concurrent.ConcurrentHashMap<>();

        public static void setPlayerMenuState(long playerId, PlayerMenuState state) {
            PLAYER_STATES.put(playerId, state);
        }

        public static PlayerMenuState getPlayerMenuState(long playerId) {
            return PLAYER_STATES.get(playerId);
        }

        public static void setPlayerPendingExchange(long playerId, ExchangeRecipeItem item) {
            PENDING_EXCHANGE.put(playerId, item);
        }

        public static ExchangeRecipeItem getPlayerPendingExchange(long playerId) {
            return PENDING_EXCHANGE.get(playerId);
        }

        public static void removePlayer(long playerId) {
            PLAYER_STATES.remove(playerId);
            PENDING_EXCHANGE.remove(playerId);
        }
    }
}

