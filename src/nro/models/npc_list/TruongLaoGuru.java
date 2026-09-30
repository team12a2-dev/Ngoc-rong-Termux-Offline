package nro.models.npc_list;

import nro.models.consts.ConstPlayer;
import nro.models.player.Player;

public class TruongLaoGuru extends LearnSkillNpc {

    public TruongLaoGuru(int mapId, int status, int cx, int cy, int tempId, int avartar) {
        super(mapId, status, cx, cy, tempId, avartar);
    }

    @Override
    protected byte getAllowedGender() {
        return ConstPlayer.NAMEC;
    }

    @Override
    public void openBaseMenu(Player player) {
        if (canOpenNpc(player)) {
            if (this.openMenuWhenNoTask(player)) {
                this.openLearnSkillBaseMenu(player);
            }
        }
    }

    @Override
    public void confirmMenu(Player player, int select) {
        if (canOpenNpc(player)) {
            this.handleLearnSkillMenu(player, select);
        }
    }

}
