package nro.models.matches.dai_hoi_vo_thuat;
import nro.models.consts.ConstSuperRank;
import java.util.List;
import nro.models.consts.ConstTaskBadges;
import nro.models.database.AmodsubVN;
import nro.models.database.SuperRankDAO;
import nro.models.managers.SuperRankManager;
import nro.models.matches.dai_hoi_vo_thuat.SuperRank;
import nro.models.matches.dai_hoi_vo_thuat.SuperRankBuilder;
import nro.models.map.Map;
import nro.models.map.Zone;
import nro.models.network.Message;
import nro.models.player.Player;
import nro.models.server.Client;
import nro.models.map.service.MapService;
import nro.models.services.Service;
import nro.models.task.BadgesTaskService;
import nro.models.utils.Logger;
import nro.models.utils.TimeUtil;
import nro.models.utils.Util;

public class SuperRankService {

    private static SuperRankService instance;

    public static SuperRankService gI() {
        if (instance == null) {
            instance = new SuperRankService();
        }
        return instance;
    }

    public void competing(Player player, long id) {
        if (player.zone.map.mapId != 113 || id == -1) {
            return;
        }
        int menuType = player.idMark.getMenuType();
        Player pl = loadPlayer(id);
        if (pl == null) {
            return;
        }
        if (SuperRankManager.gI().currentlyCompeting(player.id)) {
            Service.gI().sendThongBao(player, ConstSuperRank.TEXT_DANG_THI_DAU);
            return;
        } else if (SuperRankManager.gI().currentlyCompeting(pl.id)) {
            Service.gI().sendThongBao(player, ConstSuperRank.TEXT_DOI_THU_DANG_THI_DAU);
            return;
        } else if (SuperRankManager.gI().awaitingCompetition(player.id)) {
            Service.gI().sendThongBao(player, ConstSuperRank.TEXT_DANG_CHO);
            return;
        } else if (SuperRankManager.gI().awaitingCompetition(pl.id)) {
            Service.gI().sendThongBao(player, ConstSuperRank.TEXT_DOI_THU_CHO_THI_DAU);
            return;
        } else if (player.superRank.rank < pl.superRank.rank) {
            Service.gI().sendThongBao(player, ConstSuperRank.TEXT_DUOI_HANG);
            return;
        } else if (player.superRank.rank == pl.superRank.rank || pl.id == player.id) {
            Service.gI().sendThongBao(player, ConstSuperRank.TEXT_CHINH_MINH);
            return;
        } else if (pl.superRank.rank < 10 && player.superRank.rank - pl.superRank.rank > 2) {
            Service.gI().sendThongBao(player, ConstSuperRank.TEXT_KHONG_THE_THI_DAU_TREN_2_HANG);
            return;
        } else if (player.superRank.ticket <= 0 && player.inventory.getGem() < 1 ) {
            Service.gI().sendThongBao(player, "Bạn không đủ ngọc, còn thiếu 1 ngọc nữa");
            return;
        }
        SuperRankDAO.loadData(player);
        switch (menuType) {
            case 0 -> {
                Service.gI().sendThongBao(player, ConstSuperRank.TEXT_TOP_100);
            }
            case 1 -> {
                if (SuperRankManager.gI().SPRCheck(player.zone)) {
                    Service.gI().sendThongBao(player, ConstSuperRank.TEXT_CHO_IT_PHUT);
                    SuperRankManager.gI().addWSPR(player.id, pl.id);
                } else {
                    SuperRankManager.gI().addSPR(new SuperRank(player, id, player.zone));
                }
            }
            case 2 -> {
                SuperRankManager.gI().addSPR(new SuperRank(player, id, getZone(113)));
            }
        }
    }

    public void topList(Player player, int type) {
        long st = System.currentTimeMillis();
        player.idMark.setMenuType(type);
        Message msg = null;
        try {
            List<SuperRankBuilder> list = type == 0 ? SuperRankDAO.getPlayerListInRank(player.superRank.rank, 100) : SuperRankDAO.getPlayerListInRankRange(player.superRank.rank, 11);
            msg = new Message(-96);
            msg.writer().writeByte(0);
            msg.writer().writeUTF("Top 100 Cao Thủ");
            msg.writer().writeByte(list.size());
            for (int i = 0; i < list.size(); i++) {
                SuperRankBuilder sb = list.get(i);
                msg.writer().writeInt(sb.getRank());
                msg.writer().writeInt((int) sb.getId());
                msg.writer().writeShort(sb.getHead());
                if (214 < player.getSession().version) {
                    msg.writer().writeShort(-1);
                }
                msg.writer().writeShort(sb.getBody());
                msg.writer().writeShort(sb.getLeg());
                msg.writer().writeUTF(sb.getName());
                msg.writer().writeUTF(textStatus(sb));
                msg.writer().writeUTF(sb.getInfo());
            }
            player.sendMessage(msg);
            msg.cleanup();
            for (SuperRankBuilder sb : list) {
                sb.dispose();
            }
            list.clear();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (msg != null) {
                msg.cleanup();
            }
        }
    }


    public Player loadPlayer(long id) {
        Player pl = AmodsubVN.loadById(id);
        if (pl != null) {
            pl.setClothes.setup();
            if (pl.pet != null) {
                pl.pet.setClothes.setup();
            }
            pl.nPoint.calPoint();
        }
        return pl;
    }

    public Player getPlayer(long id) {
        return Client.gI().getPlayer(id);
    }

    public String textInfo(Player pl) {
        pl.setClothes.setup();
        if (pl.pet != null) {
            pl.pet.setClothes.setup();
        }
        pl.nPoint.calPoint();
        String text = "HP " + Util.formatNumber(pl.nPoint.hpMax) + "\n";
        text += "Sức đánh " + Util.formatNumber(pl.nPoint.dame) + "\n";
        text += "Giáp " + Util.formatNumber(pl.nPoint.def) + "\n";
        text += pl.superRank.win + ":" + pl.superRank.lose;
        return text;
    }

    public String textInfoNew(Player pl) {
        if (pl == null || pl.nPoint == null) {
            return "Không xác định!";
        }
        pl.setClothes.setup();
        if (pl.pet != null) {
            pl.pet.setClothes.setup();
        }
        pl.nPoint.calPoint();
        StringBuilder text = new StringBuilder("HP: " + Util.formatNumber(pl.nPoint.hpMax) + "\n");
        text.append("Sức đánh: ").append(Util.formatNumber(pl.nPoint.dame)).append("\n");
        text.append("Giáp: ").append(Util.formatNumber(pl.nPoint.def)).append("\n");
        if (pl.superRank.history.isEmpty()) {
            text.append("Thắng/Thua: ").append(pl.superRank.win).append("/").append(pl.superRank.lose);
        } else {
            text.append(pl.superRank.win).append(":").append(pl.superRank.lose);
        }
        for (int i = 0; i < pl.superRank.history.size(); i++) {
            String history = pl.superRank.history.get(i);
            long lastTime = pl.superRank.lastTime.get(i);
            text.append("\n").append(history).append(" ").append(TimeUtil.getTimeLeft(lastTime));
        }
        return text.toString();
    }

    public String textStatus(SuperRankBuilder srb) {
        if (SuperRankManager.gI().awaitingCompetition(srb.getId())) {
            return ConstSuperRank.TEXT_DANG_CHO;
        } else if (SuperRankManager.gI().currentlyCompeting(srb.getId())) {
            return SuperRankManager.gI().getCompeting(srb.getId());
        }
        return textReward(srb.getRank());
    }

    public String textReward(int rank) {
        String text = "";
        if (rank == 1) {
            text = "+100 ngọc & 50Tr vàng/ngày";
        } else if (rank >= 2 && rank <= 3) {
            text = "+50 ngọc & 30Tr vàng/ngày";
        } else if (rank >= 4 && rank <= 10) {
            text = "+30 ngọc & 20Tr vàng/ngày";
        } else if (rank >= 11 && rank <= 50) {
            text = "+15 ngọc & 10Tr vàng/ngày";
        } else if (rank >= 51 && rank <= 100) {
            text = "+10 ngọc & 5Tr vàng/ngày";
        } else if (rank >= 101 && rank <= 500) {
            text = "+5 ngọc & 2Tr vàng/ngày";
        } else if (rank >= 501 && rank <= 1000) {
            text = "+2 ngọc & 1Tr vàng/ngày";
        }
        return text;
    }

    public int reward(int rank) {
        int rw = -1;
        if (rank == 1) {
            rw = 100;
        } else if (rank >= 2 && rank <= 3) {
            rw = 50;
        } else if (rank >= 4 && rank <= 10) {
            rw = 30;
        } else if (rank >= 11 && rank <= 50) {
            rw = 15;
        } else if (rank >= 51 && rank <= 100) {
            rw = 10;
        } else if (rank >= 101 && rank <= 500) {
            rw = 5;
        } else if (rank >= 501 && rank <= 1000) {
            rw = 2;
        }
        return rw;
    }

    public long rewardGold(int rank) {
        long rw = 0;
        if (rank == 1) {
            rw = 50_000_000L;
        } else if (rank >= 2 && rank <= 3) {
            rw = 30_000_000L;
        } else if (rank >= 4 && rank <= 10) {
            rw = 20_000_000L;
        } else if (rank >= 11 && rank <= 50) {
            rw = 10_000_000L;
        } else if (rank >= 51 && rank <= 100) {
            rw = 5_000_000L;
        } else if (rank >= 101 && rank <= 500) {
            rw = 2_000_000L;
        } else if (rank >= 501 && rank <= 1000) {
            rw = 1_000_000L;
        }
        return rw;
    }

    public Zone getZone(int mapId) {
        Map map = MapService.gI().getMapById(mapId);
        try {
            if (map != null) {
                int zoneId = 0;
                while (zoneId < map.zones.size()) {
                    Zone zonez = map.zones.get(zoneId);
                    if (!SuperRankManager.gI().SPRCheck(zonez)) {
                        return zonez;
                    }
                    zoneId++;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

}
