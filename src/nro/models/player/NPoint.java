package nro.models.player;

import nro.models.radar.Card;
import nro.models.radar.OptionCard;
import nro.models.consts.ConstPlayer;
import nro.models.consts.ConstRatio;
import nro.models.intrinsic.Intrinsic;
import nro.models.item.Item;
import nro.models.item.Item.ItemOption;
import nro.models.skill.Skill;
import nro.models.server.ServerExpRate;
import nro.models.services.EffectSkillService;
import nro.models.services.ItemService;
import nro.models.map.service.MapService;
import nro.models.services.PlayerService;
import nro.models.services.Service;
import nro.models.services.TaskService;
import nro.models.utils.Logger;
import nro.models.utils.SkillUtil;
import nro.models.utils.Util;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import nro.models.mob.Mob;
import nro.models.player_badges.BagesTemplate;
import static nro.models.player_badges.BagesTemplate.sendListItemOption;
import nro.models.utils.TimeUtil;

/**
 * @author By AmodsubVN
 */
public class NPoint {
    public static final byte MAX_LIMIT = 11;
    private Player player;
    long timeXinbatoBuff;

    public NPoint(Player player) {
        this.player = player;
        this.tlHp = new ArrayList<>();
        this.tlMp = new ArrayList<>();
        this.tlDef = new ArrayList<>();
        this.tlDame = new ArrayList<>();
        this.tlDameAttMob = new ArrayList<>();
        this.tlTNSM = new ArrayList<>();
        this.tlDameCrit = new ArrayList<>();
    }

    public boolean isCrit;
    public boolean isCrit100;
    public boolean isCritTele;
    private Intrinsic intrinsic;
    private int percentDameIntrinsic;
    public int dameAfter;
    /*-----------------------Chỉ số cơ bản------------------------------------*/
    public byte numAttack;
    public short stamina;
    public short maxStamina;
    public byte limitPower;
    public long power;
    public long tiemNang;
    public int hp;
    public int hpMax;
    public int hpg;
    public int mp;
    public int mpMax;
    public int mpg;
    public int dame;
    public int dameg;
    public int def;
    public int defg;
    public int crit;
    public int critg;
    public int critdragon;
    public byte speed = 8;
    public boolean teleport;
    public boolean khangTDHS;
    /**
     * Chỉ số cộng thêm
     */
    public int hpAdd;
    public int mpAdd;
    public int dameAdd;
    public int defAdd;
    public int critAdd;
    public int hpHoiAdd;
    public int mpHoiAdd;
    /**
     * //+#% sức đánh chí mạng
     */
    public List<Integer> tlDameCrit;
    public int tlSDCM;
    /**
     * Tỉ lệ hp, mp cộng thêm
     */
    public List<Integer> tlHp;
    public List<Integer> tlMp;
    /**
     * Tỉ lệ giáp cộng thêm
     */
    public List<Integer> tlDef;
    /**
     * Tỉ lệ sức đánh/ sức đánh khi đánh quái
     */
    public List<Integer> tlDame;
    public List<Integer> tlDameAttMob;
    /**
     * Lượng hp, mp hồi mỗi 30s, mp hồi cho ngưá»i khác
     */
    public int hpHoi;
    public int mpHoi;
    public int mpHoiCute;
    /**
     * Tỉ lệ hp, mp hồi cộng thêm
     */
    public short tlHpHoi;
    public short tlMpHoi;
    /**
     * Tỉ lệ hp, mp hồi bản thân và đồng đội cộng thêm
     */
    public short tlHpHoiBanThanVaDongDoi;
    public short tlMpHoiBanThanVaDongDoi;
    /**
     * Tỉ lệ hút hp, mp khi đánh, hp khi đánh quái
     */
    public short tlHutHp;
    public short tlHutMp;
    public short tlHutHpMob;
    /**
     * Tỉ lệ hút hp, mp xung quanh mỗi 5s
     */
    public short tlHutHpMpXQ;
    /**
     * Tỉ lệ phản sát thương
     */
    public short tlPST;
    /**
     * Tỉ lệ tiá»m năng sức mạnh
     */
    public List<Integer> tlTNSM;
    /**
     * Tỉ lệ vàng cộng thêm
     */
    public short tlGold;
    /**
     * Tỉ lệ né đòn
     */
    public short tlNeDon;
    public short tlNeDonXinbato;
    public short tlBom;
    public short tlGiap;
    public short tlxgcc;
    public short tlxgc;
    public short tlchinhxac;
    public short tlTNSMPet;
    public short xChuong;
    public short setltdb;
    public short setTinhAn;
    public short setNhatAn;
    public short setNguyetAn;
    /**
     * Tỉ lệ sức đánh đẹp cộng thêm cho bản thân vàngười xung
     * quanh
     */
    public int tlSexyDame;
    /**
     * Tỉ lệ option mới
     */
    public int tlCritXQ;
    public int tlSatThuongCuoi;
    public int tlCoHoiChongLanh;
    public int tlNgauGiamDameXQ;
    public int tlHoiHp10sDongMinh;
    public int tlCoolDame;
    /**
     * Tỉ lệ giảm sức đánh
     */
    public short tlSubSD;
    public int voHieuChuong;
    /*------------------------Effect skin-------------------------------------*/
    public Item trainArmor;
    public boolean wearingTrainArmor;
    public boolean wearingVoHinh;
    public boolean isKhongLanh;
    public boolean islinhthuydanhbac;
    public boolean isTinhAn;
    public boolean isNhatAn;
    public boolean isNguyetAn;
    public boolean isTanHinh;
    public boolean isHoaDa;
    public boolean isLamCham;
    public boolean isBienCarot;
    public boolean isBienSocola;
    public boolean isDoSPL;
    public boolean isThoBulma;
    public short tlHpGiamODo;
    public boolean isGogeta;
    public int tlSpeed;
    public int levelBT;
    public int tlNeDonBuffXinbato = 0;

    /*-------------------------------------------------------------------------*/
    /**
     * Tính toán má»i chỉ số sau khi có thay đổi
     */
    public void calPoint() {
        if (this.player.pet != null) {
            this.player.pet.nPoint.setPointWhenWearClothes();
        }
        this.setPointWhenWearClothes();
    }

    public int getRealTlNeDon() {
        int total = this.tlNeDon;
        if (tlNeDonBuffXinbato > 0) {
            total += tlNeDonBuffXinbato;
        }
        return Math.min(total, 90);
    }

    private void setPointWhenWearClothes() {
        resetPoint();
        // Buff chỉ số Ngọc Rồng Sao Đen
        if (this.player.rewardBlackBall.timeOutOfDateReward[3] > System.currentTimeMillis()) {
            tlPST += RewardBlackBall.R4S_2; // 4 sao: Phản sát thương
        }
        if (this.player.rewardBlackBall.timeOutOfDateReward[4] > System.currentTimeMillis()) {
            tlHutHp += RewardBlackBall.R5S_1; // 5 sao: Hút HP
        }
        if (this.player.rewardBlackBall.timeOutOfDateReward[5] > System.currentTimeMillis()) {
            tlHutMp += RewardBlackBall.R6S_1; // 6 sao: Hút MP
        }
        if (this.player.rewardBlackBall.timeOutOfDateReward[6] > System.currentTimeMillis()) {
            tlNeDon += RewardBlackBall.R7S_1; // 7 sao: Né đòn
        }
        // Lấy tất cả option danh hiệu
        List<Item.ItemOption> options = BagesTemplate.sendListItemOption(player);
        for (Item.ItemOption opt : options) {
            if (opt.optionTemplate.id == 108) {
                tlNeDon += (tlNeDon * opt.param / 100L);
            }
        }
        Card card = player.Cards.stream().filter(r -> r != null && r.Used == 1).findFirst().orElse(null);
        if (card != null) {
            for (OptionCard io : card.Options) {
                if (io.active == card.Level || (card.Level == -1 && io.active == 0)) {
                    switch (io.id) {
                        case 0:
                            // Tấn công +#
                            this.dameAdd += io.param;
                            break;
                        case 2:
                            // HP, KI+#000
                            this.hpAdd += io.param * 1000;
                            this.mpAdd += io.param * 1000;
                            break;
                        case 3:
                            // vô hiệu chưởng
                            this.voHieuChuong += io.param;
                            break;
                        case 5:
                            // +#% sức đánh chí mạng
                            this.tlDameCrit.add(io.param);
                            this.tlSDCM += io.param;
                            break;
                        case 6:
                            // HP+#
                            this.hpAdd += io.param;
                            break;
                        case 7:
                            // KI+#
                            this.mpAdd += io.param;
                            break;
                        case 8:
                            // Hút #% HP, KI xung quanh mỗi 5 giây
                            this.tlHutHpMpXQ += io.param;
                            break;
                        case 14:
                            // Chí mạng+#%
                            this.critAdd += io.param;
                            break;
                        case 16:
                            // Speed
                        case 114:
                        case 148:
                            this.tlSpeed += io.param;
                            break;
                        case 18:
                            // Chinh xac
                            this.tlchinhxac += io.param;
                            break;
                        case 19:
                            // Tấn công+#% khi đánh quái
                            this.tlDameAttMob.add(io.param);
                            break;
                        case 22:
                            // HP+#K
                            this.hpAdd += io.param * 1000;
                            break;
                        case 23:
                            // MP+#K
                            this.mpAdd += io.param * 1000;
                            break;
                        case 27:
                            // +# HP/30s
                            this.hpHoiAdd += io.param;
                            break;
                        case 28:
                            // +# KI/30s
                            this.mpHoiAdd += io.param;
                            break;
                        case 33:
                            // dịch chuyển tức thá»i
                            this.teleport = true;
                            break;
                        case 34:
                            this.setTinhAn += 1;
                            break;
                        case 35:
                            this.setNguyetAn += 1;
                            break;
                        case 36:
                            this.setNhatAn += 1;
                            break;
                        case 47:
                            // Giáp+#
                            this.defAdd += io.param;
                            break;
                        case 48:
                            // HP/KI+#
                            this.hpAdd += io.param;
                            this.mpAdd += io.param;
                            break;
                        case 49:
                            // Tấn công+#%
                        case 50:
                            // Sức đánh+#%
                            this.tlDame.add(io.param);
                            break;
                        case 77:
                            // HP+#%
                            this.tlHp.add(io.param);
                            break;
                        case 80:
                            // HP+#%/30s
                            this.tlHpHoi += io.param;
                            break;
                        case 81:
                            // MP+#%/30s
                            this.tlMpHoi += io.param;
                            break;
                        case 88:
                            // Cộng #% exp khi đánh quái
                            this.tlTNSM.add(io.param);
                            break;
                        case 94:
                            // Giáp #%
                            this.tlGiap += io.param;
                            break;
                        case 95:
                            // Biến #% tấn công thành HP
                            this.tlHutHp += io.param;
                            break;
                        case 96:
                            // Biến #% tấn công thành MP
                            this.tlHutMp += io.param;
                            break;
                        case 97:
                            // Phản #% sát thương
                            this.tlPST += io.param;
                            break;
                        case 98:
                            // Xuyen giap chuong
                            this.tlxgc += io.param;
                            break;
                        case 99:
                            // Xuyen giap can chien
                            this.tlxgcc += io.param;
                            break;
                        case 100:
                            // +#% vàng từ quái
                            this.tlGold += io.param;
                            break;
                        case 101:
                            // +#% TN,SM
                            this.tlTNSM.add(io.param);
                            break;
                        case 103:
                            // KI +#%
                            this.tlMp.add(io.param);
                            break;
                        case 104:
                            // Biến #% tấn công quái thành HP
                            this.tlHutHpMob += io.param;
                            break;
                        case 105:
                            // Vô hình khi không đánh quái và boss
                            this.wearingVoHinh = true;
                            break;
                        case 106:
                            // Không ảnh hưởng bởi cái lạnh
                            this.isKhongLanh = true;
                            break;
                        case 111:
                        case 108:
                            // #% Né đòn
                            this.tlNeDon += io.param;
                            break;
                        case 109:
                            // Hôi, giảm #% HP
                            this.tlHpGiamODo += io.param;
                            break;
                        case 115:
                            // Biến Cà Rốt
                            this.isBienCarot = true;
                            break;
                        case 29:
                            // Biến Sôcôla mọi người xung quanh mỗi 30 giây
                            this.isBienSocola = true;
                            break;
                        case 116:
                            // Kháng thái dương hạ san
                            this.khangTDHS = true;
                            break;
                        case 226:
                        case 117:
                            // Äẹp +#% SÄ cho mình vàngưá»i xung quanh
                            if (io.param > this.tlSexyDame) {
                                this.tlSexyDame = io.param;
                            }
                            break;
                        case 147:
                            // +#% sức đánh
                            this.tlDame.add(io.param);
                            break;
                        case 156:
                            // Giảm 50% sức đánh, HP, KI và +#% SM, TN, vàng từ quái
                            this.tlSubSD += 50;
                            this.tlTNSM.add(io.param);
                            this.tlGold += io.param;
                            break;
                        case 162:
                            // Cute hồi #% KI/s bản thân và xung quanh
                            this.mpHoiCute += io.param;
                            break;
                        case 173:
                            // Phục hồi #% HP và KI cho đồng đội
                            this.tlHpHoiBanThanVaDongDoi += io.param;
                            this.tlMpHoiBanThanVaDongDoi += io.param;
                            break;
                        case 211:
                            this.setltdb += 1;
                            break;
                        case 153:
                            // % phát nổ sau khi chết
                            this.tlBom += io.param;
                            break;
                    }
                }
            }
        }
        // Bông tai cấp 2
        if (this.player.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2) {
            this.player.inventory.itemsBag.stream().filter(it -> it.isNotNullItem() && it.template.id == 921)
                    .findFirst().ifPresent(btc2 -> {
                        for (ItemOption io : btc2.itemOptions) {
                            addOption(io);
                            if (io.optionTemplate.id == 72) {
                                this.levelBT = io.param;
                            }
                        }
                    });
        }
        if (this.player.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3) {
            this.player.inventory.itemsBag.stream().filter(it -> it.isNotNullItem() && it.template.id == 1819)
                    .findFirst().ifPresent(btc3 -> {
                        for (ItemOption io : btc3.itemOptions) {
                            addOption(io);
                            if (io.optionTemplate.id == 72) {
                                this.levelBT = io.param;
                            }
                        }
                    });
        }
        this.player.setClothes.worldcup = 0;
        for (Item item : this.player.inventory.itemsBody) {
            if (item.isNotNullItem()) {
                switch (item.template.id) {
                    case 966:
                    case 982:
                    case 983:
                    case 883:
                    case 904:
                        player.setClothes.worldcup++;
                }
                if (item.template.id >= 592 && item.template.id <= 594) {
                    teleport = true;
                }
                for (ItemOption io : item.itemOptions) {
                    addOption(io);
                }
            }
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseUsableItem) {
            for (ItemOption option : this.player.itemTime.usableItemOptions) {
                if (option != null && option.optionTemplate != null) {
                    addOption(option);
                }
            }
        }
        setDameTrainArmor();
        setBasePoint();
        setOutfitFusion();
        setSpeed();
    }

    private void addOption(ItemOption io) {
        switch (io.optionTemplate.id) {
            case 0:
                // Tấn công +#
                this.dameAdd += io.param;
                break;
            case 2:
                // HP, KI+#000
                this.hpAdd += io.param * 1000;
                this.mpAdd += io.param * 1000;
                break;
            case 3:
                // vô hiệu chưởng
                this.voHieuChuong += io.param;
                break;
            case 5:
                // +#% sức đánh chí mạng
                this.tlDameCrit.add(io.param);
                this.tlSDCM += io.param;
                break;
            case 6:
                // HP+#
                this.hpAdd += io.param;
                break;
            case 7:
                // KI+#
                this.mpAdd += io.param;
                break;
            case 8:
                // Hút #% HP, KI xung quanh mỗi 5 giây
                this.tlHutHpMpXQ += io.param;
                break;
            case 14:
                // Chí mạng+#%
                this.critAdd += io.param;
                break;
            case 16:
                // Speed
            case 114:
            case 148:
                this.tlSpeed += io.param;
                break;
            case 18:
                // Chinh xac
                this.tlchinhxac += io.param;
                break;
            case 19:
                // Tấn công+#% khi đánh quái
                this.tlDameAttMob.add(io.param);
                break;
            case 22:
                // HP+#K
                this.hpAdd += io.param * 1000;
                break;
            case 23:
                // MP+#K
                this.mpAdd += io.param * 1000;
                break;
            case 24:
                // Làm chậm
                this.isLamCham = true;
                break;
            case 25:
                // Tàng hình
                this.isTanHinh = true;
                break;
            case 26:
                // Hóa đá
                this.isHoaDa = true;
                break;
            case 29:
                // Biến Sôcôla mọi người xung quanh mỗi 30 giây
                this.isBienSocola = true;
                break;
            case 27:
                // +# HP/30s
                this.hpHoiAdd += io.param;
                break;
            case 28:
                // +# KI/30s
                this.mpHoiAdd += io.param;
                break;
            case 33:
                // dịch chuyển tức thá»i
                this.teleport = true;
                break;
            case 34:
                this.setTinhAn += 1;
                break;
            case 35:
                this.setNguyetAn += 1;
                break;
            case 36:
                this.setNhatAn += 1;
                break;
            case 47:
                // Giáp+#
                this.defAdd += io.param;
                break;
            case 48:
                // HP/KI+#
                this.hpAdd += io.param;
                this.mpAdd += io.param;
                break;
            case 49:
                // Tấn công+#%
            case 50:
                // Sức đánh+#%
                this.tlDame.add(io.param);
                break;
            case 77:
                // HP+#%
                this.tlHp.add(io.param);
                break;
            case 80:
                // HP+#%/30s
                this.tlHpHoi += io.param;
                break;
            case 81:
                // MP+#%/30s
                this.tlMpHoi += io.param;
                break;
            case 88:
                // Cộng #% exp khi đánh quái
                this.tlTNSM.add(io.param);
                break;
            case 94:
                // Giáp #%
                this.tlGiap += io.param;
                break;
            case 95:
                // Biến #% tấn công thành HP
                this.tlHutHp += io.param;
                break;
            case 96:
                // Biến #% tấn công thành MP
                this.tlHutMp += io.param;
                break;
            case 97:
                // Phản #% sát thương
                this.tlPST += io.param;
                break;
            case 98:
                // Xuyen giap chuong
                this.tlxgc += io.param;
                break;
            case 99:
                // Xuyen giap can chien
                this.tlxgcc += io.param;
                break;
            case 100:
                // +#% vàng từ quái
                this.tlGold += io.param;
                break;
            case 101:
                // +#% TN,SM
                this.tlTNSM.add(io.param);
                break;
            case 103:
                // KI +#%
                this.tlMp.add(io.param);
                break;
            case 104:
                // Biến #% tấn công quái thành HP
                this.tlHutHpMob += io.param;
                break;
            case 105:
                // Vô hình khi không đánh quái và boss
                this.wearingVoHinh = true;
                break;
            case 106:
                // Không ảnh hưởng bởi cái lạnh
                this.isKhongLanh = true;
                break;
            case 111:
            case 108:
                // #% Né đòn
                this.tlNeDon += io.param;
                break;
            case 109:
                // Hôi, giảm #% HP
                this.tlHpGiamODo += io.param;
                break;
            case 115:
                // Biến Cà Rốt
                this.isBienCarot = true;
                break;
            case 110:
                // Do spl
                this.isDoSPL = true;
                break;
            case 116:
                // Kháng thái dương hạ san
                this.khangTDHS = true;
                break;
            case 226:
            case 117:
                // Äẹp +#% SÄ cho mình vàngưá»i xung quanh
                if (io.param > this.tlSexyDame) {
                    this.tlSexyDame = io.param;
                }
                break;
            case 147:
                // +#% sức đánh
                this.tlDame.add(io.param);
                break;
            case 156:
                // Giảm 50% sức đánh, HP, KI và +#% SM, TN, vàng từ quái
                this.tlSubSD += 50;
                this.tlTNSM.add(io.param);
                this.tlGold += io.param;
                break;
            case 162:
                // Cute hồi #% KI/s bản thân và xung quanh
                this.mpHoiCute += io.param;
                break;
            case 159:
                // x chưởng
                this.xChuong = (short) io.param;
                break;
            case 160:
                // TNSM PET;
                this.tlTNSMPet += io.param;
                break;
            case 173:
                // Phục hồi #% HP và KI cho đồng đội
                this.tlHpHoiBanThanVaDongDoi += io.param;
                this.tlMpHoiBanThanVaDongDoi += io.param;
                break;
            case 211:
                this.setltdb += 1;
                break;
            case 153:
                // % phát nổ sau khi chết
                this.tlBom += io.param;
                break;
            case 260:
                // Wow: Tăng #% Chí mạng cho người xung quanh
                if (io.param > this.tlCritXQ) {
                    this.tlCritXQ = io.param;
                }
                break;
            case 261:
                // Sát thương cuối +#%
                this.tlSatThuongCuoi += io.param;
                break;
            case 262:
                // #% cơ hội ra Chống Lạnh
                this.tlCoHoiChongLanh += io.param;
                break;
            case 263:
                // Ngầu +#% giảm sát thương cho người xung quanh
                if (io.param > this.tlNgauGiamDameXQ) {
                    this.tlNgauGiamDameXQ = io.param;
                }
                break;
            case 269:
                // Hồi HP +#%/10s cho bản thân và đồng minh
                this.tlHoiHp10sDongMinh += io.param;
                break;
            case 270:
                // Cool: +#% sức đánh bản thân và đồng minh
                if (io.param > this.tlCoolDame) {
                    this.tlCoolDame = io.param;
                }
                this.tlDame.add(io.param);
                break;
        }
    }

    private void setSpeed() {
        if (player.isPl()) {
            speed = (byte) (8 + 8 * (tlSpeed / 100));
            if (this.player.effectSkill != null && this.player.effectSkill.isLamCham) {
                speed = 1;
            }
        }
    }

    private void setOutfitFusion() {
        if (this.player.inventory.itemsBody.size() < 6 || this.player.pet == null
                || this.player.pet.inventory.itemsBody.size() < 6) {
            return;
        }
        Item skin = this.player.inventory.itemsBody.get(5);
        Item pskin = this.player.pet.inventory.itemsBody.get(5);
        if (skin.isNotNullItem() && pskin.isNotNullItem()) {
            this.isGogeta = skin.template.id == 2133 && pskin.template.id == 2134
                    || skin.template.id == 2134 && pskin.template.id == 2133;
        } else {
            this.isGogeta = false;
        }
    }

    private void setDameTrainArmor() {
        if (!this.player.isPet && !this.player.isBot && !this.player.isBoss) {
            if (this.player.inventory.itemsBody.size() < 7) {
                return;
            }
            try {
                Item gtl = this.player.inventory.itemsBody.get(6);
                if (gtl.isNotNullItem()) {
                    this.wearingTrainArmor = true;
                    this.player.inventory.trainArmor = gtl;
                    this.tlSubSD += ItemService.gI().getPercentTrainArmor(gtl);
                } else {
                    if (this.player.inventory.trainArmor == null) {
                        gtl = this.player.inventory.itemsBag.stream()
                                .filter(item -> item.isNotNullItem() && item.template.type == 32
                                        && item.itemOptions != null
                                        && item.itemOptions.stream()
                                                .filter(io -> io.optionTemplate.id == 9 && io.param > 0).findFirst()
                                                .orElse(null) != null)
                                .findFirst().orElse(null);
                        if (gtl == null) {
                            return;
                        }
                        this.player.inventory.trainArmor = gtl;
                    }
                    this.wearingTrainArmor = false;
                    for (Item.ItemOption io : this.player.inventory.trainArmor.itemOptions) {
                        if (io.optionTemplate.id == 9 && io.param > 0) {
                            this.tlDame.add(ItemService.gI().getPercentTrainArmor(this.player.inventory.trainArmor));
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                Logger.error("Lỗi get giáp tập luyện " + this.player.name + "\n" + e + "\n");
            }
        }
    }

    public void setBasePoint() {
        setHpMax();
        setHp();
        setMpMax();
        setMp();
        setDame();
        setDef();
        setCrit();
        setHpHoi();
        setMpHoi();
        setLtdb();
        setThoBulma();
        setTinhNhatNguyetAn();
    }

    private void setLtdb() {
        this.islinhthuydanhbac = this.setltdb >= 5;
    }

    private void setThoBulma() {
        this.isThoBulma = (this.player.inventory != null && this.player.inventory.itemsBody != null
                && this.player.inventory.itemsBody.size() >= 5 && this.player.inventory.itemsBody.get(5).isNotNullItem()
                && this.player.inventory.itemsBody.get(5).template.id == 584);
    }

    private void setTinhNhatNguyetAn() {
        this.isTinhAn = this.setTinhAn >= 5;
        this.isNhatAn = this.setNhatAn >= 5;
        this.isNguyetAn = this.setNguyetAn >= 5;
    }

    private void setHpHoi() {
        this.hpHoi = this.hpMax / 100;
        this.hpHoi += this.hpHoiAdd;
        if (this.tlHpHoi > 100) {
            this.tlHpHoi = 100;
        } else if (this.tlHpHoi < 0) {
            this.tlHpHoi = 0;
        }
        this.hpHoi += ((long) this.hpMax * this.tlHpHoi / 100);
        if (this.tlHpHoiBanThanVaDongDoi > 100) {
            this.tlHpHoiBanThanVaDongDoi = 100;
        } else if (this.tlHpHoiBanThanVaDongDoi < 0) {
            this.tlHpHoiBanThanVaDongDoi = 0;
        }
        this.hpHoi += ((long) this.hpMax * this.tlHpHoiBanThanVaDongDoi / 100);
    }

    private void setMpHoi() {
        this.mpHoi = this.mpMax / 100;
        this.mpHoi += this.mpHoiAdd;
        if (this.tlMpHoi > 100) {
            this.tlMpHoi = 100;
        } else if (this.tlMpHoi < 0) {
            this.tlMpHoi = 0;
        }
        this.mpHoi += ((long) this.mpMax * this.tlMpHoi / 100);
        if (this.tlMpHoiBanThanVaDongDoi > 100) {
            this.tlMpHoiBanThanVaDongDoi = 100;
        } else if (this.tlMpHoiBanThanVaDongDoi < 0) {
            this.tlMpHoiBanThanVaDongDoi = 0;
        }
        this.mpHoi += (((long) this.mpMax * this.tlMpHoiBanThanVaDongDoi) / 100);
    }

    private void setHpMax() {
        long hpMax = this.hpg + this.hpAdd;
        if (this.tlHp != null) {
            for (Integer tl : new ArrayList<>(this.tlHp)) {
                if (tl != null) {
                    hpMax += (hpMax * tl / 100L);
                }
            }
        }
        // Xử lý set nappa
        if (this.player.setClothes.nappa == 5) {
            hpMax += (hpMax * 80L / 100L);
        }
        if (this.player.setClothes.cadicM >= 2) {
            hpMax += (hpMax * 20L / 100L);
        }
        // Xử lý set worldcup
        if (this.player.setClothes.worldcup == 2) {
            hpMax += (hpMax * 10 / 100L);
        }
        // Xử lý rồng xương
        if (player.itemTime != null && player.itemTime.isUseRX) {
            hpMax += (hpMax * 10L / 100L);
        }
        // Xử lý set nhật ấn
        if (this.isNhatAn) {
            hpMax += (hpMax * 15L / 100L);
        }
        // Xử lý ngá»c rồng đen 2 sao
        if (this.player.rewardBlackBall.timeOutOfDateReward[1] > System.currentTimeMillis()) {
            hpMax += (hpMax * RewardBlackBall.R2S_1 / 100L);
        }
        // Xử lý khỉ
        if (this.player.effectSkill.isMonkey) {
            if (!this.player.isPet || (this.player.isPet && ((Pet) this.player).status != Pet.FUSION)) {
                int percent = SkillUtil.getPercentHpMonkey(player.effectSkill.levelMonkey);
                hpMax += (hpMax * percent / 100L);
            }
        }
        // Xử lý pet mabư
        if (this.player.isPet && ((Pet) this.player).typePet == 1
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            hpMax += (hpMax * 10 / 100L);
        }
        // Xử lý pet Uub
        if (this.player.isPet && ((Pet) this.player).typePet == 2
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            hpMax += (hpMax * 20 / 100L);
        }
        // Xử lý pet vageta
        if (this.player.isPet && ((Pet) this.player).typePet == 3
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            hpMax += (hpMax * 20 / 100L);
        }
        // Xử lý pet jiren
        if (this.player.isPet && ((Pet) this.player).typePet == 4
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            hpMax += (hpMax * 20 / 100L);
        }
        // Xử lý phù
        if (this.player.zone != null && MapService.gI().isMapBlackBallWar(this.player.zone.map.mapId)) {
            hpMax *= this.player.effectSkin.xHPKI;
        }
        // Xử lý thức ăn 2
        if (this.player.itemTime != null && this.player.itemTime.isEatMeal2 && this.player.itemTime.iconMeal2 == 8062) {
            hpMax += (hpMax * 5 / 100L);
        }
        // Xử lý gogeta
        if (this.isGogeta) {
            hpMax += (hpMax * 10 / 100L);
        }
        // Phù map mabu
        if (this.player.isPhuHoMapMabu) {
            hpMax += 1000000;
        }
        // Xử lý +hp đệ
        if (this.player.fusion.typeFusion != ConstPlayer.NON_FUSION) {
            hpMax += this.player.pet.nPoint.hpMax;
        }
        // Xử lý bổ huyết
        if (this.player.itemTime != null && this.player.itemTime.isUseBoHuyet && !this.player.itemTime.isUseBoHuyet2) {
            hpMax *= 2;
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseNuocMia3) {
            hpMax += hpMax / 10; // Tăng 10%
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseNuocMia2) {
            hpMax += hpMax / 10; // Tăng 10%
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseNuocMia1) {
            hpMax += hpMax / 10; // Tăng 10%
        }
        // Xử lý item sieu cap
        if (this.player.itemTime != null && this.player.itemTime.isUseBoHuyet2) {
            hpMax *= 2.2;
        }
        // Xử lý huýt sáo
        if (!this.player.isPet || (this.player.isPet && ((Pet) this.player).status != Pet.FUSION)) {
            if (this.player.effectSkill.tiLeHPHuytSao != 0) {
                hpMax += (hpMax * this.player.effectSkill.tiLeHPHuytSao / 100L);
            }
        }
        // Xử lý chibi
        if (this.player.effectSkill != null && this.player.effectSkill.isChibi && this.player.typeChibi == 3) {
            hpMax *= 2;
        }
        // Xử lý map lạnh
        if (this.player.zone != null && MapService.gI().isMapCold(this.player.zone.map) && !this.isKhongLanh) {
            hpMax /= 2;
        }
        // Lấy tất cả option danh hiệu
        List<Item.ItemOption> options = BagesTemplate.sendListItemOption(player);
        for (Item.ItemOption opt : options) {
            if (opt.optionTemplate.id == 77) {
                hpMax += (hpMax * opt.param / 100L);
            }
        }
        if (hpMax > 2147483647) {
            hpMax = 2147483647;
        }
        this.hpMax = (int) hpMax;
    }

    private void setHp() {
        this.hp = Math.min(this.hp, this.hpMax);
    }

    private void setMpMax() {
        // Tính toán giới hạn mpMax
        long mpMax = this.mpg + this.mpAdd;
        if (this.tlMp != null) {
            for (Integer tl : new ArrayList<>(this.tlMp)) {
                if (tl != null) {
                    mpMax += (mpMax * tl / 100L);
                }
            }
        }
        if (this.isNguyetAn) {
            mpMax += (mpMax * 15L / 100L);
        }
        if (this.player.rewardBlackBall.timeOutOfDateReward[2] > System.currentTimeMillis()) {
            mpMax += (mpMax * RewardBlackBall.R3S_1 / 100L);
        }
        // Xử lý set worldcup
        if (this.player.setClothes.worldcup == 2) {
            mpMax += (this.mpMax * 10 / 100L);
            // xử lý pet mabu
            if (this.player.isPet && ((Pet) this.player).typePet == 1
                    && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                            || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                            || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
                mpMax += (this.mpMax * 10 / 100L);
            }
        }
        // Xử lý pet Uub
        if (this.player.isPet && ((Pet) this.player).typePet == 2
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            mpMax += (this.mpMax * 20 / 100L);
        }
        // xử lý pet beer
        if (this.player.isPet && ((Pet) this.player).typePet == 3
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            mpMax += (this.mpMax * 20 / 100L);
        }
        // Xử lý pet jiren
        if (this.player.isPet && ((Pet) this.player).typePet == 4
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            mpMax += (this.mpMax * 20 / 100L);
        }
        // Xử lý phù
        if (this.player.zone != null && MapService.gI().isMapBlackBallWar(this.player.zone.map.mapId)) {
            mpMax *= this.player.effectSkin.xHPKI;
        }
        // Xử lý gogeta
        if (this.isGogeta) {
            mpMax += (mpMax * 10 / 100L);
        }
        // Phù map mabu
        if (this.player.isPhuHoMapMabu) {
            mpMax += 1000000;
        }
        // Xử lý rồng xương
        if (player.itemTime != null && player.itemTime.isUseRX) {
            mpMax += (mpMax * 10L / 100L);
        }
        // Xử lý hợp thể
        if (this.player.fusion.typeFusion != 0) {
            mpMax += this.player.pet.nPoint.mpMax;
        }
        // Xử lý bổ khí
        if (this.player.itemTime != null && this.player.itemTime.isUseBoKhi && !this.player.itemTime.isUseBoKhi2) {
            mpMax *= 2;
        }
        // Xử lý item sieu cap
        if (this.player.itemTime != null && this.player.itemTime.isUseBoKhi2) {
            mpMax *= 2.2;
        }
        // Lấy tất cả option danh hiệu
        List<Item.ItemOption> options = BagesTemplate.sendListItemOption(player);
        for (Item.ItemOption opt : options) {
            if (opt.optionTemplate.id == 103) {
                mpMax += (mpMax * opt.param / 100L);
            }
        }
        if (mpMax > 2147483647) {
            mpMax = 2147483647;
        }
        this.mpMax = (int) mpMax;
    }

    private void setMp() {
        this.mp = Math.min(this.mp, this.mpMax);
    }

    public int getHP() {
        return Math.min(this.hp, this.hpMax);
    }

    public void setHP(long hp) {
        if (hp > 0) {
            this.hp = (int) (hp <= this.hpMax ? hp : this.hpMax);
        } else {
            player.setDie();
        }
    }

    public int getMP() {
        return Math.min(this.mp, this.mpMax);
    }

    public void setMP(long mp) {
        if (mp > 0) {
            this.mp = (int) (mp <= this.mpMax ? mp : this.mpMax);
        } else {
            this.mp = 0;
        }
    }

    private void setDame() {
        long dame = this.dameg + this.dameAdd;
        if (this.tlDame != null) {
            for (Integer tl : new ArrayList<>(this.tlDame)) {
                if (tl != null) {
                    dame += (dame * tl / 100L);
                }
            }
        }
        // Xử lý pet pic
        if (this.player.isPet && ((Pet) this.player).typePet == 3
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            dame += (dame * 20 / 100L);
        }
        // Xử lý pet mabư
        if (this.player.isPet && ((Pet) this.player).typePet == 1
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            dame += (dame * 10 / 100L);
        }
        // Xử lý pet Uub
        if (this.player.isPet && ((Pet) this.player).typePet == 2
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            dame += (dame * 20 / 100L);
        }
        // Xử lý pet beer
        if (this.player.isPet && ((Pet) this.player).typePet == 3
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            dame += (dame * 20 / 100L);
        }
        // Xử lý pet jiren
        if (this.player.isPet && ((Pet) this.player).typePet == 4
                && (((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
                        || ((Pet) this.player).master.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
            dame += (dame * 20 / 100L);
        }
        // Xử lý set tinh ấn
        if (this.isTinhAn) {
            dame += (dame * 15L / 100L);
        }
        // Xử lý thức ăn
        if (!this.player.isPet && this.player.itemTime != null && this.player.itemTime.isEatMeal
                || this.player.isPet && this.player.itemTime != null && ((Pet) this.player).master.itemTime.isEatMeal) {
            dame += (dame * 10 / 100L);
        }
        // Xử lý thức ăn 2
        if (this.player.itemTime != null && this.player.itemTime.isEatMeal2 && this.player.itemTime.iconMeal2 == 8060) {
            dame += (dame * 5 / 100L);
        }
        if (this.player.setClothes != null && this.player.setClothes.nail >= 2) {
            this.tlDameCrit.add(10);
            this.tlSDCM += 10;
        }
        if (this.player.setClothes != null && this.player.setClothes.setBossHunter >= 5) {
            this.tlDameCrit.add(25);
            this.tlSDCM += 25;
        }
        // Xử lý thức ăn 2
        if (this.player.itemTime != null && this.player.itemTime.isEatMeal2 && this.player.itemTime.iconMeal2 == 8061) {
            this.tlDameCrit.add(5);
            this.tlSDCM += 5;
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseNuocMia3) {
            this.tlDameCrit.add(10);
            this.tlSDCM += 10;
        }
        // Xử lý cuồng nộ
        if (this.player.itemTime != null && this.player.itemTime.isUseCuongNo && !this.player.itemTime.isUseCuongNo2) {
            dame *= 2;
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseNuocMia3) {
            dame += dame / 10; // tăng 10%
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseCuongNo2) {
            dame *= 2.2;
        }
        // Xử lý ngá»c rồng đen 1 sao
        if (this.player.rewardBlackBall.timeOutOfDateReward[0] > System.currentTimeMillis()) {
            dame += (dame * RewardBlackBall.R1S_2 / 100L);
        }
        // Xử lý set worldcup
        if (this.player.setClothes.worldcup == 2) {
            dame += (dame * 10 / 100L);
        }
        // Xử lý gogeta
        if (this.isGogeta) {
            dame += (dame * 10 / 100L);
        }
        // Phù map mabu
        if (this.player.isPhuHoMapMabu) {
            dame += 10000;
        }
        // Xử lý rồng xương
        if (player.itemTime != null && player.itemTime.isUseRX) {
            dame += (dame * 10L / 100L);
        }
        // Xử lý phù
        if (this.player.zone != null && MapService.gI().isMapBlackBallWar(this.player.zone.map.mapId)) {
            dame *= this.player.effectSkin.xDame;
        }
        // Xử lý hợp thể
        if (this.player.fusion.typeFusion != 0) {
            dame += this.player.pet.nPoint.dame;
        }
        // Lấy tất cả option danh hiệu
        List<Item.ItemOption> options = BagesTemplate.sendListItemOption(player);
        for (Item.ItemOption opt : options) {
            if (opt.optionTemplate.id == 50) {
                dame += (dame * opt.param / 100L);
            }
        }
        // Xử lý khỉ
        if (this.player.effectSkill.isMonkey) {
            if (!this.player.isPet || (this.player.isPet && ((Pet) this.player).status != Pet.FUSION)) {
                int percent = SkillUtil.getPercentDameMonkey(player.effectSkill.levelMonkey);
                dame += (dame * percent / 100L);
            }
        }
        int totalPercent = 0;
        for (Item.ItemOption opt : options) {
            if (opt.optionTemplate.id == 117) {
                tlSexyDame += opt.param;
            }
        }
        dame += (dame * tlSexyDame / 100L);
        // Sức đánh đẹp
        // dame += (dame * tlSexyDame / 100L);
        // Xử lý giảm dame
        dame -= (dame * tlSubSD / 100L);
        // Xử lý chibi chiến binh (tăng 20% sức đánh)
        if (this.player.effectSkill != null && this.player.effectSkill.isChibi && this.player.typeChibi == 0) {
            dame += (dame * 20 / 100L);
        }
        // Xử lý map cold & Option Chống Lạnh
        if (this.player.zone != null && MapService.gI().isMapCold(this.player.zone.map)) {
            if (!this.isKhongLanh) {
                if (this.player.effectSkill != null && this.player.effectSkill.isChongLanhBuff) {
                    this.isKhongLanh = true;
                } else if (this.tlCoHoiChongLanh > 0 && Util.isTrue(this.tlCoHoiChongLanh, 100)) {
                    this.isKhongLanh = true;
                    if (this.player.effectSkill != null) {
                        EffectSkillService.gI().setChongLanhBuff(this.player, 15000);
                    }
                } else {
                    dame /= 2;
                }
            }
        }
        if (dame > 2147483647) {
            dame = 2147483647;
        }
        this.dame = (int) dame;
    }

    public void setDame(long dame) {
        if (dame > 0) {
            this.dame = (int) (dame <= this.dame ? dame : this.dame);
        } else {
            this.dame = 0;
        }
    }

    private void setDef() {
        this.def = this.defg * 4;
        this.def += this.defAdd;
        if (this.player.itemTime != null && this.player.itemTime.isUseNuocMia3) {
            this.def += this.def * 10 / 100;
        }
    }

    private void setCrit() {
        this.crit = this.critg;
        this.crit += this.critAdd;
        this.crit += this.critdragon;
        // biến khỉ
        if (this.player.effectSkill.isMonkey) {
            this.crit = 110;
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseNuocMia2) {
            this.crit += 10;
        }
        if (this.player.setClothes != null && this.player.setClothes.thanVuTruKaio >= 2) {
            this.crit += 10;
        }
        if (this.player.effectSkill != null && this.player.effectSkill.isCritBuff) {
            this.crit += this.player.effectSkill.tileCritBuff;
        }
    }

    private void resetPoint() {
        this.voHieuChuong = 0;
        this.hpAdd = 0;
        this.mpAdd = 0;
        this.dameAdd = 0;
        this.defAdd = 0;
        this.critAdd = 0;
        this.tlHp.clear();
        this.tlMp.clear();
        this.tlDef.clear();
        this.tlDame.clear();
        this.tlDameCrit.clear();
        this.tlDameAttMob.clear();
        this.tlSDCM = 0;
        this.tlHpHoiBanThanVaDongDoi = 0;
        this.tlMpHoiBanThanVaDongDoi = 0;
        this.hpHoi = 0;
        this.mpHoi = 0;
        this.mpHoiCute = 0;
        this.tlHpHoi = 0;
        this.tlMpHoi = 0;
        this.tlHutHp = 0;
        this.tlHutMp = 0;
        this.tlHutHpMob = 0;
        this.tlHutHpMpXQ = 0;
        this.tlPST = 0;
        this.tlTNSM.clear();
        this.tlDameAttMob.clear();
        this.tlGold = 0;
        this.tlNeDon = 0;
        this.tlNeDonXinbato = 0;
        this.tlBom = 0;
        this.tlGiap = 0;
        this.tlxgcc = 0;
        this.tlxgc = 0;
        this.tlchinhxac = 0;
        this.tlTNSMPet = 0;
        this.xChuong = 0;
        this.setltdb = 0;
        this.setTinhAn = 0;
        this.setNhatAn = 0;
        this.setNguyetAn = 0;
        this.tlSexyDame = 0;
        this.tlSubSD = 0;
        this.tlHpGiamODo = 0;
        this.tlSpeed = 0;
        this.tlCritXQ = 0;
        this.tlSatThuongCuoi = 0;
        this.tlCoHoiChongLanh = 0;
        this.tlNgauGiamDameXQ = 0;
        this.tlHoiHp10sDongMinh = 0;
        this.tlCoolDame = 0;
        this.teleport = false;
        this.wearingVoHinh = false;
        this.isKhongLanh = false;
        this.khangTDHS = false;
        this.isTanHinh = false;
        this.isHoaDa = false;
        this.isLamCham = false;
        this.isBienCarot = false;
        this.isBienSocola = false;
        this.isDoSPL = false;
        this.isThoBulma = false;
    }

    public void addHp(long hp) {
        if (hp > 0) {
            long potentialHp = (long) this.hp + hp;
            if (potentialHp > this.hpMax) {
                this.hp = this.hpMax;
            } else {
                this.hp = (int) Math.min(potentialHp, 2147483647);
            }
        }
    }

    public void addMp(long mp) {
        long potentialMp = this.mp + mp;
        if (potentialMp > this.mpMax) {
            this.mp = this.mpMax;
        } else if (potentialMp < 0) {
            this.mp = 0;
        } else {
            this.mp = (int) potentialMp;
        }
    }

    public void setHp(long hp) {
        if (hp < 0) {
            this.hp = 0;
        } else {
            this.hp = (int) Math.min(hp, 2147483647);
        }
    }

    public void setMp(long mp) {
        if (mp < 0) {
            this.mp = 0;
        } else {
            this.mp = (int) Math.min(mp, 2147483647);
        }
    }

    private void setIsCrit() {
        if (intrinsic != null && intrinsic.id == 25 && this.getCurrPercentHP() <= intrinsic.param1) {
            isCrit = true;
        } else if (isCrit100) {
            isCrit100 = false;
            isCrit = true;
        } else {
            isCrit = Util.isTrue(this.crit, ConstRatio.PER100);
        }
    }

    public int getDameAttack(boolean isAttackMob) {
        setIsCrit();
        long dameAttack = this.dame;
        System.out.println("[DEBUG] getDameAttack start: player=" + (this.player != null ? this.player.name : "null")
                + ", isAttackMob=" + isAttackMob + ", this.dame=" + this.dame + ", dameAttack=" + dameAttack);
        intrinsic = (this.player.playerIntrinsic != null) ? this.player.playerIntrinsic.intrinsic : null;
        percentDameIntrinsic = 0;
        int percentDameSkill = 0;
        byte percentXDame = 0;
        Skill skillSelect = player.playerSkill != null ? player.playerSkill.skillSelect : null;
        if (skillSelect != null && skillSelect.template != null) {
            if (skillSelect.template.id != Skill.DICH_CHUYEN_TUC_THOI && isCritTele) {
                isCrit = true;
                isCritTele = false;
            }
            switch (skillSelect.template.id) {
                case Skill.DRAGON:
                    if (intrinsic != null && intrinsic.id == 1) {
                        percentDameIntrinsic = intrinsic.param1;
                    }
                    percentDameSkill = skillSelect.damage;
                    break;
                case Skill.KAMEJOKO:
                    if (intrinsic != null && intrinsic.id == 2) {
                        percentDameIntrinsic = intrinsic.param1;
                    }
                    percentDameSkill = skillSelect.damage;
                    if (this.player.setClothes.songoku == 5) {
                        percentXDame = 100;
                    }
                    break;
                case Skill.GALICK:
                    if (intrinsic != null && intrinsic.id == 16) {
                        percentDameIntrinsic = intrinsic.param1;
                    }
                    percentDameSkill = skillSelect.damage;
                    if (this.player.setClothes.kakarot == 5) {
                        percentXDame = 100;
                    }
                    break;
                case Skill.ANTOMIC:
                    if (intrinsic != null && intrinsic.id == 17) {
                        percentDameIntrinsic = intrinsic.param1;
                    }
                    percentDameSkill = skillSelect.damage;
                    break;
                case Skill.TU_SAT:
                    percentDameSkill = skillSelect.damage;
                    if (this.player.setClothes.cadicM == 4) {
                        percentXDame = 20;
                    } else if (this.player.setClothes.cadicM == 5) {
                        percentXDame = 50;
                    }
                    break;
                case Skill.DEMON:
                    if (intrinsic != null && intrinsic.id == 8) {
                        percentDameIntrinsic = intrinsic.param1;
                    }
                    percentDameSkill = skillSelect.damage;
                    break;
                case Skill.MASENKO:
                    if (intrinsic != null && intrinsic.id == 9) {
                        percentXDame += intrinsic.param1;
                    }
                    if (this.player.setClothes != null && this.player.setClothes.nail >= 5) {
                        percentXDame += 80;
                    }
                    percentDameSkill = skillSelect.damage;
                    break;
                case Skill.LIEN_HOAN:
                    if (intrinsic != null && intrinsic.id == 13) {
                        percentDameIntrinsic = intrinsic.param1;
                    }
                    percentDameSkill = skillSelect.damage;
                    if (this.player.setClothes.ocTieu == 5) {
                        percentXDame = 100;
                    }
                    break;
                case Skill.KAIOKEN:
                    percentDameSkill = skillSelect.damage;
                    if (this.player.setClothes != null && this.player.setClothes.thanVuTruKaio == 5) {
                        percentXDame = 30;
                    }
                    break;
                case Skill.DICH_CHUYEN_TUC_THOI:
                    isCrit = true;
                    isCritTele = true;
                    dameAttack = Util.nextInt((int) (int) Math.min(2147483647L, (dameAttack - (dameAttack / 100 * 5))),
                            (int) (int) Math.min(2147483647L, (dameAttack + (dameAttack / 100 * 5))));
                    break;
                case Skill.MAKANKOSAPPO:
                    percentDameSkill = skillSelect.damage;
                    int dameSkill = (int) Math.min(2147483647L, (long) this.mpMax * percentDameSkill / 100);
                    if (this.player.setClothes.picolo == 5) {
                        dameSkill *= 3 / 2;
                    }
                    return dameSkill;
                case Skill.QUA_CAU_KENH_KHI:
                    isCrit = false;
                    isCritTele = false;
                    long hpmob = 0;
                    long hppl = 0;
                    for (Mob mob : this.player.zone.mobs) {
                        if (!mob.isDie() && Util.getDistance(this.player, mob) <= SkillUtil
                                .getRangeQCKK(this.player.playerSkill.skillSelect.point)) {
                            hpmob += mob.point.hp;
                        }
                    }
                    for (Player pl : this.player.zone.getHumanoids()) {
                        if (!pl.isDie() && this.player.id != pl.id && Util.getDistance(this.player, pl) <= SkillUtil
                                .getRangeQCKK(this.player.playerSkill.skillSelect.point)) {
                            hppl += pl.nPoint.hp;
                        }
                    }
                    long dameqckk = (hpmob * 1 / 200) + (hppl * 1 / 200) + this.dame * 1;
                    if (this.player.setClothes.kirin == 5) {
                        dameqckk *= 2;
                    }
                    dameqckk = dameqckk + (Util.nextInt(-5, 5) * dameqckk / 200);
                    if (dameqckk > 2147483647) {
                        dameqckk = 2147483647;
                    }
                    return (int) dameqckk;
                case Skill.DE_TRUNG:
                    if (player.setClothes.pikkoroDaimao == 5) {
                        dameAttack *= 4;
                    }
                    if (dameAttack > 2147483647) {
                        dameAttack = 2147483647;
                    }
                    return (int) dameAttack;
            }
        }
        if (intrinsic != null && intrinsic.id == 18 && this.player.effectSkill.isMonkey) {
            percentDameIntrinsic = intrinsic.param1;
        }
        if (percentDameSkill != 0) {
            dameAttack = dameAttack * percentDameSkill / 100;
        }
        dameAttack += (dameAttack * percentDameIntrinsic / 100);
        dameAttack += (dameAttack * dameAfter / 100);
        if (this.player.effectSkill != null && this.player.effectSkill.isDameBuff && tlSexyDame == 0) {
            int tiLeDame = this.player.effectSkill.tileDameBuff;
            dameAttack += (dameAttack * tiLeDame / 100L);
        }
        if (isAttackMob) {
            for (Integer tl : this.tlDameAttMob) {
                dameAttack += (dameAttack * tl / 100);
            }
            if (this.player.isPet && ((Pet) this.player).master.charms.tdDeTu > System.currentTimeMillis()) {
                dameAttack *= 2;
            }
        }
        dameAfter = 0;
        if (isCrit) {
            dameAttack *= 2;
            dameAttack += (dameAttack * tlSDCM / 100);
        }
        dameAttack += ((long) dameAttack * percentXDame / 100);
        long tempDameAttack = (long) (dameAttack / 100L * 5L);
        if (tempDameAttack <= 0) {
            tempDameAttack = 1;
        }
        dameAttack += (long) (Util.getOne(-1, 1) * Util.nextInt((int) tempDameAttack) + 1);
        if (player.effectSkin != null && player.effectSkin.isXChuong && player.playerSkill != null
                && player.playerSkill.skillSelect != null && player.playerSkill.skillSelect.template != null
                && (player.playerSkill.skillSelect.template.id == Skill.KAMEJOKO
                        || player.playerSkill.skillSelect.template.id == Skill.ANTOMIC
                        || player.playerSkill.skillSelect.template.id == Skill.MASENKO)) {
            dameAttack *= xChuong;
            player.effectSkin.isXDame = true;
            player.effectSkin.isXChuong = false;
            player.effectSkin.lastTimeXChuong = System.currentTimeMillis();
        }
        if (this.tlSatThuongCuoi > 0) {
            dameAttack += (dameAttack * this.tlSatThuongCuoi / 100L);
        }
        if (dameAttack > 2147483647) {
            dameAttack = 2147483647;
        }
        System.out.println("[DEBUG] getDameAttack end: player=" + (this.player != null ? this.player.name : "null")
                + ", final dameAttack=" + dameAttack);
        return (int) dameAttack;
    }

    public int getCurrPercentHP() {
        if (this.hpMax == 0) {
            return 100;
        }
        return (int) ((long) this.hp * 100 / this.hpMax);
    }

    public int getCurrPercentMP() {
        return (int) ((long) this.mp * 100 / this.mpMax);
    }

    public void setFullHpMp() {
        this.hp = this.hpMax;
        this.mp = this.mpMax;
    }

    public void subHP(long sub) {
        this.hp -= sub;
        if (this.hp <= 0) {
            this.hp = 0;
            this.setHp(0);
        }
    }

    public void subMP(long sub) {
        this.mp -= sub;
        if (this.mp <= 0) {
            this.mp = 0;
        }
        if (this.mp > 2147483647) {
            this.mp = 2147483647;
        }
    }

    public long calSucManhTiemNang(long tiemNang) {
        if (this.tlTNSM != null) {
            for (Integer tl : this.tlTNSM) {
                if (tl != null) {
                    tiemNang += ((long) tiemNang * tl / 100);
                }
            }
        }
        long tn = tiemNang;
        if (this.player.charms.tdTriTue > System.currentTimeMillis()) {
            tiemNang += tn;
        }
        if (this.player.charms.tdTriTue3 > System.currentTimeMillis() 
                && !nro.models.services.ServerLaunchConfigService.gI().isBlockTnsmCharmsX3X4()) {
            tiemNang += tn * 2;
        }
        if (this.player.charms.tdTriTue4 > System.currentTimeMillis()
                && !nro.models.services.ServerLaunchConfigService.gI().isBlockTnsmCharmsX3X4()) {
            tiemNang += tn * 3;
        }
        if (this.player.timevip > System.currentTimeMillis()) {
            tiemNang += tn * 3;
        }
        if (this.player.effectSkill.isChibi && this.player.typeChibi == 2) {
            tiemNang += tn * 2;
        }
        if (this.player.getSession() != null && this.player.getSession().vip > 0
                || this.player.isPet && ((Pet) this.player).master.getSession() != null
                        && ((Pet) this.player).master.getSession().vip > 0) {
            tiemNang += tn * 3;
        }
        if (this.player.itemTime != null && this.player.itemTime.isUseDK) {
            tiemNang += tn * 2;
        }
        // x2 TNSM từ item 1045 (Bản đồ kho báu)
        if (this.player.zone != null && this.player.zone.map != null && MapService.gI().isMapBanDoKhoBau(this.player.zone.map.mapId)) {
            if (this.player.itemTime != null && this.player.itemTime.isUseKhoBauX2) {
                tiemNang += tn;
            }
        }
        if (this.player.satellite != null && this.player.satellite.isIntelligent) {
            tiemNang += tn / 5;
        }
        if (this.intrinsic != null && this.intrinsic.id == 24) {
            tiemNang += ((long) tiemNang * this.intrinsic.param1 / 100);
        }
        if (this.power >= 60000000000L) {
            tiemNang -= ((long) tiemNang * 80 / 100);
        }
        if (this.player.isPet) {
            if (((Pet) this.player).master.itemTime.isUseBuaSanta) {
                tiemNang += tn * 2;
            }
            if (((Pet) this.player).master.nPoint != null && ((Pet) this.player).master.nPoint.tlTNSMPet > 0) {
                tiemNang += tn / 100 * (((Pet) this.player).master.nPoint.tlTNSMPet + 100);
            }
        }
        if (this.player.zone != null && this.player.zone.map != null && MapService.gI().isMapNguHanhSon(this.player.zone.map.mapId)) {
            tiemNang *= 1.5;
        }
        if (MapService.gI().AllMap(this.player.zone.map.mapId)) {
        }
        // tiemNang *= 10; //x x3 tiềm năng toàn server
        if (this.player.cFlag != 0) {
            if (this.player.cFlag == 8) {
                tiemNang += ((long) tiemNang * 10 / 100);
            } else {
                tiemNang += ((long) tiemNang * 5 / 100);
            }
        }
        tiemNang *= ServerExpRate.get();
        tiemNang = calSubTNSM(tiemNang);
        if (tiemNang <= 0) {
            tiemNang = 1;
        }
        return tiemNang;
    }

    public long calSubTNSM(long tiemNang) {
        if (power >= 80000000000L) {
            tiemNang /= 90;
        } else if (power >= 40000000000L) {
            tiemNang /= 16;
        } else if (power >= 30000000000L) {
            tiemNang /= 8;
        } else if (power >= 20000000000L) {
            tiemNang /= 4;
        } else if (power >= 5000000000L) {
            tiemNang /= 2;
        }
        return tiemNang;
    }

    public short getTileHutHp(boolean isMob) {
        if (isMob) {
            return (short) (this.tlHutHp + this.tlHutHpMob);
        } else {
            return this.tlHutHp;
        }
    }

    public short getTiLeHutMp() {
        return this.tlHutMp;
    }

    public int subDameInjureWithDeff(long dame) {
        long def = this.def;
        dame -= def;
        if (dame < 0) {
            dame = 1;
        }
        return (int) dame;
    }

    /*------------------------------------------------------------------------*/
    public boolean canOpenPower() {
        return this.power >= getPowerLimit();
    }

    public long getPowerLimit() {
        switch (limitPower) {
            case 0:
                return 17999999999L;
            case 1:
                return 19999999999L;
            case 2:
                return 24999999999L;
            case 3:
                return 29999999999L;
            case 4:
                return 39999999999L;
            case 5:
                return 50010000000L;
            case 6:
                return 60010000000L;
            case 7:
                return 70010000000L;
            case 8:
                return 80010000000L;
            case 9:
                return 90010000000L;
            case 10:
                return 100010000000L;
            case 11:
                return 110010000000L;
            default:
                return 110010000000L;
        }
    }

    public long getPowerNextLimit() {
        switch (limitPower + 1) {
            case 0:
                return 17999999999L;
            case 1:
                return 19999999999L;
            case 2:
                return 24999999999L;
            case 3:
                return 29999999999L;
            case 4:
                return 39999999999L;
            case 5:
                return 50010000000L;
            case 6:
                return 60010000000L;
            case 7:
                return 70010000000L;
            case 8:
                return 80010000000L;
            case 9:
                return 90010000000L;
            case 10:
                return 100010000000L;
            case 11:
                return 110010000000L;
            default:
                return 110010000000L;
        }
    }

    public int getHpMpLimit() {
        switch (limitPower) {
            case 0:
                return 220000;
            case 1:
                return 240000;
            case 2:
                return 300000;
            case 3:
                return 350000;
            case 4:
                return 400000;
            case 5:
                return 450000;
            case 6:
                return 500000;
            case 7:
                return 525000;
            case 8:
                return 550000;
            case 9:
                return 575000;
            case 10:
                return 600000;
            case 11:
                return 625000;
            default:
                return 625000;
        }
    }

    public int getDameLimit() {
        switch (limitPower) {
            case 0:
                return 11000;
            case 1:
                return 12000;
            case 2:
                return 15000;
            case 3:
                return 18000;
            case 4:
                return 20000;
            case 5:
                return 22000;
            case 6:
                return 24000;
            case 7:
                return 24500;
            case 8:
                return 25000;
            case 9:
                return 25500;
            case 10:
                return 26000;
            case 11:
                return 26500;
            default:
                return 26500;
        }
    }

    public short getDefLimit() {
        switch (limitPower) {
            case 0:
                return 550;
            case 1:
                return 600;
            case 2:
                return 700;
            case 3:
                return 800;
            case 4:
                return 1000;
            case 5:
                return 1200;
            case 6:
                return 1400;
            case 7:
                return 1500;
            case 8:
                return 1600;
            case 9:
                return 1700;
            case 10:
                return 1800;
            case 11:
                return 1900;
            default:
                return 1900;
        }
    }

    public byte getCritLimit() {
        switch (limitPower) {
            case 0:
                return 5;
            case 1:
                return 6;
            case 2:
                return 7;
            case 3:
                return 8;
            case 4:
                return 9;
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            default:
                return 10;
        }
    }

    public void powerUp(long power) {
        this.power += power;
        TaskService.gI().checkDoneTaskPower(player, this.power);
    }

    public void tiemNangUp(long tiemNang) {
        this.tiemNang += tiemNang;
    }

    public void increasePoint(byte type, short point) {
        if (point <= 0 || point > 1000) {
            return;
        }
        long tiemNangUse;
        if (type == 0) {
            int pointHp = point * 20;
            tiemNangUse = point * (2 * (this.hpg + 1000) + pointHp - 20) / 2;
            if ((this.hpg + pointHp) <= getHpMpLimit()) {
                if (doUseTiemNang(tiemNangUse)) {
                    hpg += pointHp;
                }
            } else {
                Service.gI().sendThongBaoOK(player, "Vui lòng mở giới hạn sức mạnh");
                return;
            }
        }
        if (type == 1) {
            int pointMp = point * 20;
            tiemNangUse = point * (2 * (this.mpg + 1000) + pointMp - 20) / 2;
            if ((this.mpg + pointMp) <= getHpMpLimit()) {
                if (doUseTiemNang(tiemNangUse)) {
                    mpg += pointMp;
                }
            } else {
                Service.gI().sendThongBaoOK(player, "Vui lòng mở giới hạn sức mạnh");
                return;
            }
        }
        if (type == 2) {
            TaskService.gI().checkDoneTaskNangCS(player);
            tiemNangUse = point * (2 * this.dameg + point - 1) / 2 * 100;
            if ((this.dameg + point) <= getDameLimit()) {
                if (doUseTiemNang(tiemNangUse)) {
                    dameg += point;
                }
                TaskService.gI().checkDoneTaskNangCS(player);
            } else {
                Service.gI().sendThongBaoOK(player, "Vui lòng mở giới hạn sức mạnh");
                return;
            }
        }
        if (type == 3) {
            tiemNangUse = 2 * (this.defg + 5) / 2 * 100000;
            if ((this.defg + point) <= getDefLimit()) {
                if (doUseTiemNang(tiemNangUse)) {
                    defg += point;
                }
            } else {
                Service.gI().sendThongBaoOK(player, "Vui lòng mở giới hạn sức mạnh");
                return;
            }
        }
        if (type == 4) {
            tiemNangUse = 50000000L;
            for (int i = 0; i < this.critg; i++) {
                tiemNangUse *= 5L;
            }
            if ((this.critg + point) <= getCritLimit()) {
                if (doUseTiemNang(tiemNangUse)) {
                    critg += point;
                }
            } else {
                Service.gI().sendThongBaoOK(player, "Vui lòng mở giới hạn sức mạnh");
                return;
            }
        }
        Service.gI().point(player);
    }

    private boolean doUseTiemNang(long tiemNang) {
        if (this.tiemNang < tiemNang) {
            Service.gI().sendThongBaoOK(player, "Bạn không đủ tiềm năng");
            return false;
        }
        if (this.tiemNang >= tiemNang && this.tiemNang - tiemNang >= 0) {
            this.tiemNang -= tiemNang;
            TaskService.gI().checkDoneTaskUseTiemNang(player);
            return true;
        }
        return false;
    }

    public long getFullTN() {
        long tnhp = 0;
        long tnki = 0;
        long tnsd = 0;
        long tng = 0;
        long tncm = 0;
        if (hpg > 0) {
            tnhp = (((hpg / 20L) * (50L + (50L + (hpg / 20L) - 1L)) / 2L) * 20L);
        }
        if (mpg > 0) {
            tnki = (((mpg / 20L) * (50L + (50L + (mpg / 20L) - 1L)) / 2L) * 20L);
        }
        if (dameg > 0) {
            tnsd = ((dameg * (dameg - 1L) * 100L) / 2L);
        }
        if (defg > 0) {
            tng = ((defg * (500000L + (500000L + (defg - 1L) * 100000L))) / 2L);
        }
        if (critg > 0) {
            tncm = ((50L * (((long) Math.pow(5L, critg) - 1L)) / (5L - 1L) * 1000000L));
        }
        return tnhp + tnki + tnsd + tng + tncm;
    }

    // --------------------------------------------------------------------------
    private long lastTimeHoiPhuc;
    private long lastTimeHoiStamina;

    public void update() {
        if (player != null && player.effectSkill != null) {
            if (player.effectSkill.isCharging && player.effectSkill.countCharging < 10) {
                int tiLeHoiPhuc = SkillUtil.getPercentCharge(player.playerSkill.skillSelect.point);
                if (player.effectSkill.isCharging && !player.isDie() && !player.effectSkill.isHaveEffectSkill()
                        && (hp < hpMax || mp < mpMax)) {
                    long hpRecovered = hpMax / 100 * tiLeHoiPhuc;
                    long mpRecovered = mpMax / 100 * tiLeHoiPhuc;
                    if (hp + hpRecovered > 2147483647) {
                        hpRecovered = 2147483647 - hp;
                    }
                    if (mp + mpRecovered > 2147483647) {
                        mpRecovered = 2147483647 - mp;
                    }
                    PlayerService.gI().hoiPhuc(player, hpRecovered, mpRecovered);
                    if (player.effectSkill.countCharging % 3 == 0) {
                        Service.gI().chat(player, "Phục hồi năng lượng " + getCurrPercentHP() + "%");
                    }
                } else {
                    EffectSkillService.gI().stopCharge(player);
                }
                if (++player.effectSkill.countCharging >= 10) {
                    EffectSkillService.gI().stopCharge(player);
                }
            }
            if (Util.canDoWithTime(lastTimeHoiPhuc, 30000)) {
                PlayerService.gI().hoiPhuc(this.player, hpHoi, mpHoi);
                this.lastTimeHoiPhuc = System.currentTimeMillis();
            }
            if (Util.canDoWithTime(lastTimeHoiStamina, 60000) && this.stamina < this.maxStamina) {
                this.stamina++;
                this.lastTimeHoiStamina = System.currentTimeMillis();
                if (!this.player.isBoss && !this.player.isPet) {
                    PlayerService.gI().sendCurrentStamina(this.player);
                }
            }
        }
    }

    public void dispose() {
        this.intrinsic = null;
        this.player = null;
        this.tlHp = null;
        this.tlMp = null;
        this.tlDef = null;
        this.tlDame = null;
        this.tlDameAttMob = null;
        this.tlTNSM = null;
    }

    public long calPercent(long param, int percent) {
        return param * percent / 100;
    }

    @java.lang.SuppressWarnings("all")
    public void setPlayer(final Player player) {
        this.player = player;
    }
}
