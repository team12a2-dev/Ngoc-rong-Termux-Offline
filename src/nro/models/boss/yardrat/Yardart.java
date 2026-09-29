package nro.models.boss.yardrat;

import nro.models.boss.Boss;
import nro.models.boss.BossData;
import nro.models.consts.BossType;

/**
 * Base type for Yardrat bosses. Combat, map joining and movement use the
 * regular Boss implementation; the Yardrat marker is used by combat rules.
 */
public abstract class Yardart extends Boss {

    protected Yardart(int id, BossData... data) throws Exception {
        super(BossType.YARDART, id, data);
    }
}
