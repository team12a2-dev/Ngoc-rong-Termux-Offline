package nro.models.task;

import nro.models.utils.Util;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class FastMainTask {

    public int usedCount;

    public long lastTime;

    public FastMainTask() {
        this.usedCount = 0;
        this.lastTime = 0;
    }

    /** Sang ngày mới thì làm lại số lần đã dùng. */
    public void renew() {
        if (Util.isAfterMidnight(this.lastTime)) {
            this.usedCount = 0;
            this.lastTime = System.currentTimeMillis();
        }
    }

    public void increase() {
        this.renew();
        this.usedCount++;
        this.lastTime = System.currentTimeMillis();
    }

}
