package nro.models.npc_list;

import nro.models.consts.ConstNpc;
import nro.models.map.service.NpcService;
import nro.models.npc.Npc;
import nro.models.player.Player;
import nro.models.services.LearnSkillService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.shop.ShopService;
import nro.models.utils.SkillUtil;
import nro.models.utils.TimeUtil;

/**
 * Phần chung của các NPC thầy dạy kỹ năng: menu bò mộng kiểu "Học Kỹ năng",
 * học cấp tốc bằng ngọc và huỷ học hoàn 50% tiềm năng.
 */
public abstract class LearnSkillNpc extends Npc {

    public LearnSkillNpc(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    /** Quyền học kỹ năng của NPC này, ví dụ ConstPlayer.NAMEC. */
    protected abstract byte getAllowedGender();

    protected void openLearnSkillBaseMenu(Player player) {
        if (player.gender != this.getAllowedGender()) {
            NpcService.gI().createTutorial(player, tempId, avartar,
                    "Con hãy về hành tinh của mình mà thể hiện");
            return;
        }
        LearnSkillService.gI().checkFinish(player);
        this.createOtherMenu(player, ConstNpc.BASE_MENU,
                "Chào con, ta rất vui khi gặp được con\nCon muốn làm gì nào ?",
                "Nhiệm vụ", "Học\nKỹ năng");
    }

    /** Rẽ lựa chọn của menu học kỹ năng, trả về false nếu select không thuộc menu này. */
    protected boolean handleLearnSkillMenu(Player player, int select) {
        if (player.idMark.isBaseMenu()) {
            switch (select) {
                case 0 -> NpcService.gI().createTutorial(player, tempId, avartar,
                        player.playerTask.taskMain.subTasks.get(player.playerTask.taskMain.index).name);
                case 1 ->
                    this.openLearnSkillShop(player);
            }
            return true;
        }
        if (player.idMark.getIndexMenu() == ConstNpc.MENU_LEARN_SKILL) {
            switch (select) {
                case 0 ->
                    LearnSkillService.gI().finishFast(player);
                case 1 ->
                    this.createOtherMenu(player, ConstNpc.MENU_CANCEL_LEARN_SKILL,
                            "Con có muốn huỷ học kỹ năng này và nhận lại 50% số tiềm năng không ?", "Ok", "Đóng");
            }
            return true;
        }
        if (player.idMark.getIndexMenu() == ConstNpc.MENU_CANCEL_LEARN_SKILL) {
            if (select == 0) {
                LearnSkillService.gI().cancel(player);
            }
            return true;
        }
        return false;
    }

    /** Đang học thì xem trạng thái, không học gì thì mở shop sách kỹ năng. */
    private void openLearnSkillShop(Player player) {
        if (!LearnSkillService.gI().isLearning(player)) {
            ShopService.gI().opendShop(player, "QUY_LAO", false);
            return;
        }
        int itemTemplateSkillId = player.LearnSkill.ItemTemplateSkillId;
        byte level = LearnSkillService.gI().getLevel(itemTemplateSkillId);
        if (level < 0) {
            Service.gI().sendThongBao(player, "Không tìm thấy sách kỹ năng đang học, hãy thử lại");
            return;
        }
        long time = Math.max(0, player.LearnSkill.Time - System.currentTimeMillis());
        this.createOtherMenu(player, ConstNpc.MENU_LEARN_SKILL,
                "Con đang học kỹ năng\n"
                + SkillUtil.findSkillTemplate(SkillUtil.getTempSkillSkillByItemID(itemTemplateSkillId)).name
                + " cấp " + level + "\nThời gian còn lại " + TimeUtil.getTime(time),
                "Học Cấp tốc " + LearnSkillService.gI().getGemCost(player) + " ngọc", "Huỷ", "Bỏ qua");
    }

    /** Hỏi nhiệm vụ hiện tại trước khi mở menu, dùng chung cho openBaseMenu. */
    protected boolean openMenuWhenNoTask(Player player) {
        return !TaskService.gI().checkDoneTaskTalkNpc(player, this);
    }

}
