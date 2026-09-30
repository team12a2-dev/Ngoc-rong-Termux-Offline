package nro.models.services;

import nro.models.player_system.Template;
import nro.models.player.Player;
import nro.models.skill.Skill;
import nro.models.utils.Logger;
import nro.models.utils.SkillUtil;

/**
 * Logic học kỹ năng dùng chung cho các NPC thầy: Trường Lão Guru, Vua Vegeta
 * và Quy Lão Kame.
 */
public class LearnSkillService {

    private static LearnSkillService i;

    public static LearnSkillService gI() {
        if (i == null) {
            i = new LearnSkillService();
        }
        return i;
    }

    /** Cấp của sách kỹ năng lấy từ chữ số cuối tên item, -1 nếu item không hợp lệ. */
    public byte getLevel(int itemTemplateSkillId) {
        try {
            Template.ItemTemplate template = ItemService.gI().getTemplate(itemTemplateSkillId);
            if (template == null || template.name == null || template.name.isEmpty()) {
                return -1;
            }
            String[] subName = template.name.split("");
            return Byte.parseByte(subName[subName.length - 1]);
        } catch (Exception e) {
            return -1;
        }
    }

    /** Số ngọc cần để học cấp tốc, tăng theo số phút còn lại. */
    public int getGemCost(Player player) {
        int ngoc = 5;
        long time = player.LearnSkill.Time - System.currentTimeMillis();
        if (time > 0 && time / 600_000 >= 2) {
            ngoc += time / 600_000;
        }
        return ngoc;
    }

    /** Còn đang chờ học kỹ năng không. */
    public boolean isLearning(Player player) {
        return player != null && player.LearnSkill != null && player.LearnSkill.Time != -1;
    }

    /** Đã hết giờ học thì cấp kỹ năng ngay. Trả về true nếu vừa cấp xong. */
    public boolean checkFinish(Player player) {
        if (!isLearning(player) || player.LearnSkill.Time > System.currentTimeMillis()) {
            return false;
        }
        this.grant(player);
        return true;
    }

    /** Cấp kỹ năng đang học theo đúng cấp ghi trên sách rồi xoá trạng thái chờ. */
    public void grant(Player player) {
        int itemTemplateSkillId = player.LearnSkill.ItemTemplateSkillId;
        byte level = this.getLevel(itemTemplateSkillId);
        player.LearnSkill.Time = -1;
        player.LearnSkill.Potential = 0;
        if (level < 0) {
            Service.gI().sendThongBao(player, "Không tìm thấy sách kỹ năng đang học, hãy thử lại");
            return;
        }
        try {
            player.BoughtSkill.add(itemTemplateSkillId);
            Skill curSkill = SkillUtil.createSkill(SkillUtil.getTempSkillSkillByItemID(itemTemplateSkillId), level);
            SkillUtil.setSkill(player, curSkill);
            var msg = Service.gI().messageSubCommand((byte) 62);
            msg.writer().writeShort(curSkill.skillId);
            player.sendMessage(msg);
            msg.cleanup();
            PlayerService.gI().sendInfoHpMpMoney(player);
            Service.gI().sendThongBao(player, "Đã học xong " + curSkill.template.name + " cấp " + level);
        } catch (Exception e) {
            Logger.logException(LearnSkillService.class, e);
        }
    }

    /** Học cấp tốc bằng ngọc, bỏ qua thời gian chờ còn lại. */
    public void finishFast(Player player) {
        if (!isLearning(player)) {
            return;
        }
        int ngoc = this.getGemCost(player);
        if (player.inventory.gem < ngoc) {
            Service.gI().sendThongBao(player, "Bạn không có đủ ngọc");
            return;
        }
        player.inventory.subGem(ngoc);
        this.grant(player);
    }

    /** Huỷ học kỹ năng và hoàn lại 50% số tiềm năng đã trả. */
    public void cancel(Player player) {
        if (!isLearning(player)) {
            return;
        }
        long refund = player.LearnSkill.Potential / 2;
        player.LearnSkill.Time = -1;
        player.LearnSkill.Potential = 0;
        if (refund > 0) {
            player.nPoint.tiemNang += refund;
            Service.gI().point(player);
        }
        Service.gI().sendThongBao(player, "Đã huỷ học kỹ năng, hoàn lại " + refund + " tiềm năng");
    }

}
