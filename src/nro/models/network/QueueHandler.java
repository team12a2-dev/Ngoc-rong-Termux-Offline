package nro.models.network;

import java.util.concurrent.BlockingDeque;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;
import nro.models.interfaces.IMessageHandler;
import nro.models.interfaces.ISession;

public class QueueHandler implements Runnable {
  private ISession session;
  private BlockingDeque<Message> messages;
  private IMessageHandler messageHandler;

  public QueueHandler(ISession session) {
    if (session == null) {
      throw new java.lang.NullPointerException("session is marked non-null but is null");
    }
    try {
      this.session = session;
      this.messages = new LinkedBlockingDeque<>();
    } catch (Exception ignored) {
    }
  }

  @Override
  public void run() {
    try {
      while (session != null && session.isConnected()) {
        Message message = messages.poll(1, TimeUnit.SECONDS);
        if (message == null) {
          continue;
        }
        this.messageHandler.onMessage(this.session, message);
        message.cleanup();
      }
    } catch (InterruptedException ignored) {
      Thread.currentThread().interrupt();
    } catch (Exception ignored) {
    }
  }

  public void addMessage(Message msg) {
    try {
      if (session.isConnected() && messages.size() < 500) {
        messages.add(msg);
      }
    } catch (Exception ignored) {
    }
  }

  public void close() {
    if (messages != null) {
      messages.clear();
    }
  }

  public void dispose() {
    this.session = null;
    this.messages = null;
  }

  @java.lang.SuppressWarnings("all")
  public void setMessageHandler(final IMessageHandler messageHandler) {
    this.messageHandler = messageHandler;
  }
}
