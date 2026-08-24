package nro.models.combine;

import nro.models.item.Item;
import java.util.ArrayList;
import java.util.List;

/**
 * @author By AmodsubVN
 */
public class Combine {
    public long lastTimeCombine;
    public List<Item> itemsCombine;
    public int typeCombine;
    public int goldCombine;
    public int gemCombine;
    public float ratioCombine;
    public int countDaNangCap;
    public short countDaBaoVe;

    public Combine() {
        this.itemsCombine = new ArrayList<>();
    }

    public void clearItemCombine() {
        this.itemsCombine.clear();
    }

    public void clearParamCombine() {
        this.goldCombine = 0;
        this.gemCombine = 0;
        this.ratioCombine = 0;
        this.countDaNangCap = 0;
        this.countDaBaoVe = 0;
    }

    public void dispose() {
        this.itemsCombine = null;
    }

    @java.lang.SuppressWarnings("all")
    public void setTypeCombine(final int typeCombine) {
        this.typeCombine = typeCombine;
    }
}
