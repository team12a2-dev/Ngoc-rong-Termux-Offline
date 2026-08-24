package nro.models.data;

import java.io.ByteArrayInputStream;
import java.io.DataInputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import nro.models.data.LocalManager;
import nro.models.intrinsic.Intrinsic;
import nro.models.network.MySession;
import nro.models.player.Player;
import nro.models.player_system.Template.BgItem;
import nro.models.player_system.Template.FlagBag;
import nro.models.player_system.Template.HeadAvatar;
import nro.models.player_system.Template.ItemTemplate;
import nro.models.player_system.Template.SkillTemplate;
import nro.models.server.Manager;
import nro.models.services.Service;
import nro.models.skill.NClass;
import nro.models.utils.FileIO;
import nro.models.utils.Logger;
import org.json.simple.JSONArray;
import org.json.simple.JSONValue;

/**
 * Server dieu khien day icon xuong client.
 * Thu thap icon ID tu TOAN BO du lieu server (DB + file), khong chi icon trong map.
 */
public class DataDownloadService {

    private static DataDownloadService instance;

    private static final int MAX_PENDING_OUT = 40;
    private static final int RESUME_PENDING_OUT = 15;
    private static final int SLEEP_QUEUE_HIGH_MS = 35;
    private static final int SLEEP_NORMAL_MS = 6;

    private final ConcurrentHashMap<Integer, AtomicBoolean> iconPushActive = new ConcurrentHashMap<>();

    public static DataDownloadService gI() {
        if (instance == null) {
            instance = new DataDownloadService();
        }
        return instance;
    }

    public boolean isDownloadCommand(String text) {
        if (text == null) {
            return false;
        }
        String cmd = text.trim().toLowerCase();
        return cmd.equals("icon")
                || cmd.equals("icon all")
                || cmd.equals("icon stop")
                || cmd.equals("datahelp")
                || cmd.equals("exporthelp")
                || cmd.equals("reload data")
                || cmd.equals("reload item")
                || cmd.equals("reload part");
    }

    public void handleChatCommand(Player player, String text) {
        if (player == null || text == null) {
            return;
        }
        String cmd = text.trim().toLowerCase();
        switch (cmd) {
            case "icon":
                pushAllIconsFromServer(player, false);
                break;
            case "icon all":
                pushAllIconsFromServer(player, true);
                break;
            case "icon stop":
                stopIconPush(player);
                break;
            case "datahelp":
            case "exporthelp":
                sendHelp(player);
                break;
            case "reload part":
                Manager.loadPart();
                DataGame.updateData(player.getSession());
                Service.gI().sendThongBao(player, "Da reload part + update_data");
                break;
            case "reload data":
                DataGame.updateData(player.getSession());
                Service.gI().sendThongBao(player, "Da gui lai update_data cho client");
                break;
            case "reload item":
                Service.gI().sendThongBao(player, "Can restart server de reload item_template tu DB");
                break;
            default:
                sendHelp(player);
                break;
        }
    }

    /**
     * @param includeFullRange true = them ca khoang 0..imageCount tu update_data/image
     */
    public void pushAllIconsFromServer(Player player, boolean includeFullRange) {
        MySession session = player.getSession();
        if (session == null) {
            return;
        }

        int playerId = (int) player.id;
        AtomicBoolean active = iconPushActive.computeIfAbsent(playerId, k -> new AtomicBoolean(false));
        if (!active.compareAndSet(false, true)) {
            Service.gI().sendThongBao(player, "Dang gui icon. Chat 'icon stop' de dung.");
            return;
        }

        byte zoom = session.zoomLevel <= 0 ? 2 : session.zoomLevel;
        List<Integer> iconIds = collectAllServerIconIds(zoom, includeFullRange);

        if (iconIds.isEmpty()) {
            active.set(false);
            Service.gI().sendThongBao(player, "Khong tim thay icon nao tren server (x" + zoom + ")");
            return;
        }

        final int total = iconIds.size();
        final byte finalZoom = zoom;
        Service.gI().sendThongBao(player,
                "Gui TOAN BO " + total + " icon server (x" + zoom + ") - DB + file, khong phu thuoc map.");

        Thread pushThread = new Thread(
                () -> runIconPush(playerId, session, iconIds, finalZoom, total),
                "IconPush-" + playerId);
        pushThread.setDaemon(true);
        pushThread.start();
    }

    /**
     * Thu thap icon ID tu moi nguon du lieu server.
     */
    public List<Integer> collectAllServerIconIds(byte zoom, boolean includeFullRange) {
        TreeSet<Integer> ids = new TreeSet<>();

        collectFromFilesystem(zoom, ids);
        collectFromItemTemplates(ids);
        collectFromSkills(ids);
        collectFromHeadAvatars(ids);
        collectFromFlagBags(ids);
        collectFromIntrinsics(ids);
        collectFromBgItems(ids);
        collectFromPartDatabase(ids);

        if (includeFullRange) {
            collectFromImageDataRange(ids);
        }

        return new ArrayList<>(ids);
    }

    private void collectFromFilesystem(byte zoom, TreeSet<Integer> ids) {
        File iconDir = new File("data/icon/x" + zoom);
        if (!iconDir.isDirectory()) {
            return;
        }
        File[] files = iconDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".png"));
        if (files == null) {
            return;
        }
        for (File file : files) {
            try {
                String name = file.getName();
                ids.add(Integer.parseInt(name.substring(0, name.length() - 4)));
            } catch (NumberFormatException ignored) {
            }
        }
    }

    private void collectFromItemTemplates(TreeSet<Integer> ids) {
        for (ItemTemplate item : Manager.ITEM_TEMPLATES) {
            if (item.iconID > 0) {
                ids.add((int) item.iconID);
            }
        }
    }

    private void collectFromSkills(TreeSet<Integer> ids) {
        for (NClass nClass : Manager.NCLASS) {
            for (SkillTemplate skill : nClass.skillTemplatess) {
                if (skill.iconId > 0) {
                    ids.add(skill.iconId);
                }
            }
        }
    }

    private void collectFromHeadAvatars(TreeSet<Integer> ids) {
        for (HeadAvatar ha : Manager.HEAD_AVATARS) {
            if (ha.avatarId > 0) {
                ids.add(ha.avatarId);
            }
        }
    }

    private void collectFromFlagBags(TreeSet<Integer> ids) {
        for (FlagBag flag : Manager.FLAGS_BAGS) {
            if (flag.iconId > 0) {
                ids.add((int) flag.iconId);
            }
            if (flag.iconEffect != null) {
                for (short effId : flag.iconEffect) {
                    if (effId > 0) {
                        ids.add((int) effId);
                    }
                }
            }
        }
    }

    private void collectFromIntrinsics(TreeSet<Integer> ids) {
        for (Intrinsic intrinsic : Manager.INTRINSICS) {
            if (intrinsic.icon > 0) {
                ids.add((int) intrinsic.icon);
            }
        }
    }

    private void collectFromBgItems(TreeSet<Integer> ids) {
        for (BgItem bg : Manager.BG_ITEMS) {
            if (bg.idImage > 0) {
                ids.add((int) bg.idImage);
            }
        }
    }

    private void collectFromPartDatabase(TreeSet<Integer> ids) {
        try (Connection con = LocalManager.getConnection();
                PreparedStatement ps = con.prepareStatement("SELECT data FROM part");
                ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String raw = rs.getString("data");
                if (raw == null || raw.isEmpty()) {
                    continue;
                }
                JSONArray dataArray = (JSONArray) JSONValue.parse(raw.replaceAll("\\\"", ""));
                if (dataArray == null) {
                    continue;
                }
                for (Object frameObj : dataArray) {
                    JSONArray frame = (JSONArray) JSONValue.parse(String.valueOf(frameObj));
                    if (frame != null && !frame.isEmpty()) {
                        try {
                            ids.add(Integer.parseInt(String.valueOf(frame.get(0))));
                        } catch (NumberFormatException ignored) {
                        }
                    }
                }
            }
        } catch (Exception e) {
            Logger.logException(DataDownloadService.class, e);
        }
    }

    private void collectFromImageDataRange(TreeSet<Integer> ids) {
        try {
            byte[] imageData = FileIO.readFile("data/update_data/image");
            if (imageData == null || imageData.length < 2) {
                return;
            }
            DataInputStream dis = new DataInputStream(new ByteArrayInputStream(imageData));
            int count = dis.readShort() & 0xFFFF;
            dis.close();
            for (int i = 0; i < count; i++) {
                ids.add(i);
            }
        } catch (Exception e) {
            Logger.logException(DataDownloadService.class, e);
        }
    }

    private void runIconPush(int playerId, MySession session, List<Integer> iconIds, byte zoom, int total) {
        AtomicBoolean active = iconPushActive.get(playerId);
        int sent = 0;
        int skipped = 0;
        int lastReport = 0;
        long lastReportTime = System.currentTimeMillis();

        try {
            for (int id : iconIds) {
                if (active == null || !active.get()) {
                    break;
                }
                if (session == null || !session.isConnected()) {
                    break;
                }

                waitForSendQueue(session);

                byte[] icon = readIconBytes(zoom, id);
                if (icon == null || icon.length == 0) {
                    skipped++;
                    continue;
                }

                if (!DataGame.sendIconBytes(session, id, icon)) {
                    skipped++;
                    continue;
                }

                sent++;
                throttleAfterSend(session);

                long now = System.currentTimeMillis();
                if (sent - lastReport >= 500 || now - lastReportTime >= 15000L) {
                    lastReport = sent;
                    lastReportTime = now;
                    Player p = session.player;
                    if (p != null) {
                        Service.gI().sendThongBao(p,
                                "Icon server: " + sent + "/" + total + " (bo qua " + skipped + ", queue="
                                        + session.getNumMessages() + ")");
                    }
                }
            }

            Player p = session.player;
            if (p != null && active.get()) {
                Service.gI().sendThongBao(p,
                        "Hoan tat TOAN BO icon server: " + sent + "/" + total
                        + (skipped > 0 ? " (khong co file: " + skipped + ")" : "")
                        + " | x" + zoom);
            }
        } catch (Exception e) {
            Logger.logException(DataDownloadService.class, e);
            Player p = session != null ? session.player : null;
            if (p != null) {
                Service.gI().sendThongBao(p, "Loi gui icon: " + e.getMessage());
            }
        } finally {
            if (active != null) {
                active.set(false);
            }
        }
    }

    private void waitForSendQueue(MySession session) throws InterruptedException {
        int pending = session.getNumMessages();
        while (pending > MAX_PENDING_OUT) {
            Thread.sleep(SLEEP_QUEUE_HIGH_MS);
            if (!session.isConnected()) {
                return;
            }
            pending = session.getNumMessages();
        }
    }

    private void throttleAfterSend(MySession session) throws InterruptedException {
        int pending = session.getNumMessages();
        if (pending > RESUME_PENDING_OUT) {
            Thread.sleep(SLEEP_QUEUE_HIGH_MS);
        } else {
            Thread.sleep(SLEEP_NORMAL_MS);
        }
    }

    private void stopIconPush(Player player) {
        int playerId = (int) player.id;
        AtomicBoolean active = iconPushActive.get(playerId);
        if (active != null && active.compareAndSet(true, false)) {
            Service.gI().sendThongBao(player, "Da dung gui icon.");
        } else {
            Service.gI().sendThongBao(player, "Khong co tien trinh gui icon nao dang chay.");
        }
    }

    private byte[] readIconBytes(byte zoom, int id) {
        try {
            Path path = Paths.get("data/icon/x" + zoom + "/" + id + ".png");
            if (!Files.exists(path)) {
                return null;
            }
            return Files.readAllBytes(path);
        } catch (Exception e) {
            return null;
        }
    }

    private void sendHelp(Player player) {
        Service.gI().sendThongBao(player,
                "Tai icon TOAN BO server (khong chi map):\n"
                + "icon - DB item/part/skill + file co san\n"
                + "icon all - them ca khoang update_data/image\n"
                + "icon stop - dung gui\n"
                + "reload part / reload data");
    }
}
