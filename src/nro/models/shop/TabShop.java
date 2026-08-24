package nro.models.shop;

import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author By AmodsubVN
 * 
 */

public class TabShop {

    /** item_template.gender: 0=Trái Đất, 1=Namec, 2=Xayda, >=3=dùng chung mọi tộc */
    public static final byte GENDER_ALL = 3;

    public Shop shop;

    public int id;

    public String name;

    public int index;

    public List<ItemShop> itemShops;

    public static boolean isItemForRace(byte itemGender, byte playerGender) {
        return itemGender == playerGender || itemGender >= GENDER_ALL;
    }

    public static boolean isItemForPlayer(ItemShop itemShop, byte playerGender) {
        return itemShop != null && itemShop.temp != null
                && isItemForRace(itemShop.getGenderForRace(), playerGender);
    }

    public TabShop() {
        this.itemShops = new ArrayList<>();
    }

    public TabShop(TabShop tabShop, byte playerGender) {
        this.itemShops = new ArrayList<>();
        this.shop = tabShop.shop;
        this.id = tabShop.id;
        this.name = tabShop.name;

        for (ItemShop itemShop : tabShop.itemShops) {
            if (isItemForPlayer(itemShop, playerGender)) {
                this.itemShops.add(new ItemShop(itemShop));
            }
        }
    }

    /** Chỉ dùng khi mở shop allGender; player shop phải dùng {@link #TabShop(TabShop, byte)} */
    @Deprecated
    public TabShop(TabShop tabShop) {
        this.itemShops = new ArrayList<>();
        this.shop = tabShop.shop;
        this.id = tabShop.id;
        this.name = tabShop.name;
        for (ItemShop itemShop : tabShop.itemShops) {
            this.itemShops.add(new ItemShop(itemShop));
        }
    }

    public void dispose() {
        this.shop = null;
        this.name = null;
        if (this.itemShops != null) {
            for (ItemShop is : this.itemShops) {
                is.dispose();
            }
            this.itemShops.clear();
        }
        this.itemShops = null;
    }}