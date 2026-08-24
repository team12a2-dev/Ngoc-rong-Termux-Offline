package nro.models.boss.luyen_tap_tu_dong;

import nro.models.boss.BossesData;
import nro.models.consts.ConstItem;
import nro.models.consts.ConstMap;
import nro.models.consts.ConstPlayer;
import nro.models.map.ItemMap;
import nro.models.network.Message;
import nro.models.player.Player;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Logger;
import nro.models.utils.Util;

import java.io.IOException;

import nro.models.boss.BossID;
import nro.models.consts.BossStatus;
import static nro.models.consts.BossType.PHOBAN;
import nro.models.map.service.ChangeMapService;
import nro.models.map.service.MapService;

public class TauPayPay extends TrainingBoss {

    public TauPayPay(Player player) throws Exception {
        super(PHOBAN, BossID.TAUPAYPAY, BossesData.TAUPAYPAY);
        this.playerAtt = player;
    }

    @Override
    public void joinMap() {
        if (playerAtt.zone != null) {
            this.zone = playerAtt.zone;
            ChangeMapService.gI().changeMapBySpaceShip(this, this.zone, 775);
            this.changeStatus(BossStatus.CHAT_S);
        }
    }

    @Override
    public void die(Player plKill) {
        if (plKill != null && !plKill.isBot) {
            reward(plKill);
        }
        super.die(plKill);
    }

    @Override
    public void reward(Player plKill) {
        if (plKill == null || this.zone == null || this.zone.map == null) {
            return;
        }
        if (this.zone.map.mapId != ConstMap.RUNG_KARIN) {
            return;
        }
        if (!TaskService.gI().isCurrentTaskTauPayPayQuest(plKill)) {
            return;
        }
        try {
            int x = this.location.x + Util.nextInt(-20, 20);
            int y = this.zone.map.yPhysicInTop(x, this.location.y - 24);
            ItemMap item = new ItemMap(this.zone, ConstItem.NGOC_RONG_6_SAO, 1, x, y, plKill.id);
            Service.gI().dropItemMap(this.zone, item);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

//    @Override
//    public void checkPlayerDie(Player pl) {
//        Service.gI().sendPVB(playerAtt, this, ConstPlayer.PK_PVP);
//        TaskService.gI().doneTask(pl, ConstTask.TASK_31_1);
//    }
//
//    @Override
//    public void die(Player plKill) {
//        this.changeStatus(BossStatus.LEAVE_MAP);
//        this.chatE();
//        this.lastTimeAFK = 0;
//        Service.gI().sendPlayerVS(playerAtt, null, (byte) 0);
//        boolean doneTask = TaskService.gI().doneTask(plKill, ConstTask.TASK_31_1);
//    }

    @Override
    public boolean chatS() {
        if (Util.canDoWithTime(lastTimeChatS, timeChatS)) {
            if (this.doneChatS) {
                return true;
            }
            String textChat = this.data[this.currentLevel].getTextS()[playerAtt.isThachDau ? 1 : 0];
            int prefix = Integer.parseInt(textChat.substring(1, textChat.lastIndexOf("|")));
            textChat = textChat.substring(textChat.lastIndexOf("|") + 1);
            if (!this.chat(prefix, textChat)) {
                return false;
            }
            this.moveToPlayer(playerAtt);
            this.lastTimeChatS = System.currentTimeMillis();
            this.timeChatS = 2000;
            doneChatS = true;
        }
        return false;
    }

    @Override
    public void leaveMap() {
        ChangeMapService.gI().spaceShipArrive(this, (byte) 2, ChangeMapService.DEFAULT_SPACE_SHIP);
        Message msg;
        try {
            msg = new Message(-6);
            msg.writer().writeInt((int) this.id);
            playerAtt.sendMessage(msg);
            msg.cleanup();
            this.zone = null;
        } catch (IOException e) {
            Logger.logException(MapService.class, e);
        }
    }

    @Override
    public void buffPea() {
    }

  
    @Override
    public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
        if (!this.isDie()) {
            if (!piercing && Util.isTrue(400, 1000)) {
                this.chat("Xí hụt");
                return 0;
            }

            if (!TaskService.gI().isCurrentTaskTauPayPayQuest(plAtt)) {
                return 0;
            }
            damage = this.nPoint.subDameInjureWithDeff(damage);
            this.nPoint.subHP(damage);

            if (this.nPoint.hp > 0 && this.nPoint.hp < this.nPoint.hpMax / 5) {
                if (Util.canDoWithTime(lastTimeChat, 2000)) {
                    String[] text = {"AAAAAAAAA", "ai da"};
                    this.chat(text[Util.nextInt(text.length)]);
                }
            }

            if (isDie()) {
                this.setDie(plAtt);
                die(plAtt);
            }

            return (int) damage;
        } else {
            return 0;
        }
    }

    @Override
    public void afk() {
        if (Util.canDoWithTime(lastTimeAFK, 5000)) {
            this.changeStatus(BossStatus.LEAVE_MAP);
        }
    }
}
