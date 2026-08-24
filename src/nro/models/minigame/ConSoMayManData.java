
package nro.models.minigame;

/**
 *
 * @author By AmodsubVN
 */
public class ConSoMayManData {
    public int id;
    public int point;
    public int conSoMayManVang;
    public int conSoMayManNgoc;
    /** Tổng thưởng khi thắng (= giải vòng lúc đặt + mức cược) */
    public long rewardAmount;
    /** Mức ngọc/thỏi đã trừ khi đặt số này */
    public long betCost;
    /** Giải vòng tại thời điểm đặt cược (snapshot) */
    public long roundPrize;
    /** true = cược tùy chọn, false = cược mặc định */
    public boolean customTier;
}
