package nro.models.services;

import nro.models.consts.ConstNpc;
import nro.models.consts.ConstPlayer;
import nro.models.npc.Npc;
import nro.models.npc.NpcFactory;
import nro.models.player.Player;
import nro.models.server.Manager;
import nro.models.network.Message;
import nro.models.utils.Logger;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class NpcService {

    private static NpcService i;

    public static NpcService gI() {
        if (i == null) {
            i = new NpcService();
        }
        return i;
    }

    public String getNpcHomeSay(Player player) {
        if (player == null || player.playerTask == null || player.playerTask.taskMain == null) {
            return "Con cố gắng học thành tài, đừng lo lắng cho ta.";
        }
        int taskId = player.playerTask.taskMain.id;
        int index = player.playerTask.taskMain.index;
        String masterName = player.gender == ConstPlayer.TRAI_DAT ? "Quy Lão Kame"
                : (player.gender == ConstPlayer.NAMEC ? "Trưởng lão Guru" : "Vua Vegeta");
        String masterMap = player.gender == ConstPlayer.TRAI_DAT ? "Đảo Kamê"
                : (player.gender == ConstPlayer.NAMEC ? "Đảo Guru" : "Vách núi đen");

        switch (taskId) {
            case 0 -> {
                if (index == 0) {
                    return "Con hãy di chuyển làm quen xung quanh nhà trước nhé!";
                } else if (index == 1 || index == 2) {
                    return "Con hãy đến rương đồ để lấy rađa, sau đó thu hoạch hết đậu trên cây đậu thần đằng kia!";
                } else {
                    return "Con hãy ra ngoài làng đốn ngã 5 con mộc nhân cho ta!";
                }
            }
            case 1 -> {
                return "Con hãy ra ngoài làng đốn ngã 5 con mộc nhân để rèn luyện thể lực nhé!";
            }
            case 2 -> {
                return "Ta đói lắm rồi, con mau đi thu thập đùi gà";
            }
            case 3 -> {
                return "Vừa nãy ta có nghe thấy 1 tiếng động lớn, con hãy đến vách núi kiểm tra xem!";
            }
            case 4, 5, 6 -> {
                return "Con hãy dùng tàu vũ trụ sang các hành tinh khác để tiêu diệt các quái mẹ thể hiện sức mạnh!";
            }
            case 7 -> {
                return "Con hãy đến trạm tàu vũ trụ để giúp đỡ mọi người tiêu diệt quái bay giải cứu thường dân nhé!";
            }
            case 8 -> {
                return "Ngọc rồng 7 sao đang bị bọn quái vật cướp đi, con hãy mau đi tìm lại cho ta!";
            }
            case 9 -> {
                return "Con hãy lên đường đến " + masterMap + " tìm " + masterName + " để bái sư học đạo!";
            }
            case 12 -> {
                return "Con muốn gia nhập bang hội sao? Được rồi, hãy tìm những người bạn tốt cùng chí hướng nhé!";
            }
            case 22 -> {
                return "Dạo này ta nghe tin có vị khách lạ đến từ tương lai, con hãy cẩn thận đi kiểm tra xem!";
            }
            case 23, 24, 25, 26, 27, 28 -> {
                return "Bọn Rôbốt sát thủ và Xên bọ hung rất nguy hiểm, con hãy cùng đồng đội bảo vệ thế giới nhé!";
            }
            default -> {
                return "Con cố gắng theo " + masterName + " học thành tài, đừng lo lắng cho ta.";
            }
        }
    }

    public void createMenuRongThieng(Player player, int indexMenu, String npcSay, String... menuSelect) {
        createMenu(player, indexMenu, ConstNpc.RONG_THIENG, -1, npcSay, menuSelect);
    }

    public void createMenuConMeo(Player player, int indexMenu, int avatar, String npcSay, String... menuSelect) {
        createMenu(player, indexMenu, ConstNpc.CON_MEO, avatar, npcSay, menuSelect);
    }

    public void createMenuConMeo(Player player, int indexMenu, int avatar, String npcSay, String[] menuSelect, Object object) {
        NpcFactory.PLAYERID_OBJECT.put(player.id, object);
        createMenuConMeo(player, indexMenu, avatar, npcSay, menuSelect);
    }

    private void createMenu(Player player, int indexMenu, byte npcTempId, int avatar, String npcSay, String... menuSelect) {
        if (player == null || !player.isPl() || player.idMark == null) {
            return;
        }
        Message msg;
        try {
            player.idMark.setIndexMenu(indexMenu);
            msg = new Message(32);
            msg.writer().writeShort(npcTempId);
            msg.writer().writeUTF(npcSay);
            msg.writer().writeByte(menuSelect.length);
            for (String menu : menuSelect) {
                msg.writer().writeUTF(menu);
            }
            if (avatar != -1) {
                msg.writer().writeShort(avatar);
            }
            player.sendMessage(msg);
            msg.cleanup();
        } catch (Exception e) {
            Logger.logException(NpcService.class, e);
        }
    }

    public void createTutorial(Player player, int avatar, String npcSay) {
        Message msg;
        try {
            msg = new Message(38);
            msg.writer().writeShort(ConstNpc.CON_MEO);
            msg.writer().writeUTF(npcSay);
            if (avatar != -1) {
                msg.writer().writeShort(avatar);
            }
            player.sendMessage(msg);
            msg.cleanup();
        } catch (Exception e) {
        }
    }

    public void createTutorial(Player player, int tempId, int avatar, String npcSay) {
        Message msg;
        try {
            msg = new Message(38);
            msg.writer().writeShort(tempId);
            msg.writer().writeUTF(npcSay);
            if (avatar != -1) {
                msg.writer().writeShort(avatar);
            }
            player.sendMessage(msg);
            msg.cleanup();
        } catch (Exception e) {
        }
    }

    public int getAvatar(int npcId) {
        for (Npc npc : Manager.NPCS) {
            if (npc.tempId == npcId) {
                return npc.avartar;
            }
        }
        return 1139;
    }
    
    public void createBigMessage(Player player, int avatar, String npcSay, byte type, String select, String confirn) {
        Message msg;
        try {
            msg = new Message(-70);
            msg.writer().writeShort(avatar);
            msg.writer().writeUTF(npcSay);
            msg.writer().writeByte(type);
            if (type == 1) {
                msg.writer().writeUTF(confirn);// select
                msg.writer().writeUTF(select);// string Select
            }
            player.sendMessage(msg);
            msg.cleanup();
        } catch (Exception ex) {
        }
    }
}
