package nro.models.task;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class TaskPlayer {

    public TaskMain taskMain;

    public SideTask sideTask;

    public ClanTask clanTask;

    public FastMainTask fastMainTask;

    public TaskPlayer() {
        this.sideTask = new SideTask();
        this.clanTask = new ClanTask();
        this.fastMainTask = new FastMainTask();
    }

    public void dispose() {
        this.taskMain = null;
        this.sideTask = null;
        this.clanTask = null;
        this.fastMainTask = null;
    }

}
