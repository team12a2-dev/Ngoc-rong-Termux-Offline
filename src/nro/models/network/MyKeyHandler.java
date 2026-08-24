package nro.models.network;

import nro.models.data.DataGame;
import nro.models.interfaces.ISession;

public class MyKeyHandler extends KeyHandler {

    @Override
    public void sendKey(ISession session) {
        super.sendKey(session);
        MySession ms = (MySession) session;
        DataGame.sendDataImageVersion(ms);
        DataGame.sendVersionRes(ms);
    }

}
