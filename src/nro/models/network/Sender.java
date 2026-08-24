package nro.models.network;

import java.net.Socket;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.concurrent.BlockingDeque;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;
import nro.models.interfaces.IMessageSendCollect;
import nro.models.interfaces.ISession;

public final class Sender implements Runnable {

    private ISession session;
    private BlockingDeque<Message> messages;
    private DataOutputStream dos;
    private IMessageSendCollect sendCollect;

    public Sender(ISession session, Socket socket) {
        if (session == null) {
            throw new NullPointerException("session is marked non-null but is null");
        }
        if (socket == null) {
            throw new NullPointerException("socket is marked non-null but is null");
        }
        try {
            this.session = session;
            this.messages = new LinkedBlockingDeque<Message>();
            this.setSocket(socket);
        } catch (Exception exception) {
        }
    }

    public Sender setSocket(Socket socket) {
        if (socket == null) {
            throw new NullPointerException("socket is marked non-null but is null");
        }
        try {
            this.dos = new DataOutputStream(socket.getOutputStream());
        } catch (IOException iOException) {
        }
        return this;
    }

    @Override
    public void run() {
        try {
            while (this.session != null && this.session.isConnected()) {
                Message message = this.messages.poll(1L, TimeUnit.SECONDS);
                if (message == null) {
                    continue;
                }
                this.doSendMessage(message);
                message.cleanup();
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        } catch (Exception exception) {
        }
    }

    public synchronized void doSendMessage(Message message) throws Exception {
        this.sendCollect.doSendMessage(this.session, this.dos, message);
    }

    public void sendMessage(Message msg) {
        try {
            if (this.session.isConnected()) {
                this.messages.add(msg);
            }
        } catch (Exception exception) {
        }
    }

    public void setSend(IMessageSendCollect sendCollect) {
        this.sendCollect = sendCollect;
    }

    public int getNumMessages() {
        return this.messages.size();
    }

public void close() {
    try {
        if (this.messages != null) {
            this.messages.clear();
        }
        if (this.dos != null) {
            this.dos.close();
        }
    } catch (Exception e) {
    }
}

 public void dispose() {
    this.session = null;
    // KHÃ”NG set messages = null á»Ÿ Ä‘Ã¢y
    this.sendCollect = null;
    this.dos = null;
}
}