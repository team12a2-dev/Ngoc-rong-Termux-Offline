package nro.models.player;

import java.time.LocalDateTime;
import nro.models.utils.Functions;
import nro.models.npc.NonInteractiveNPC;
import nro.models.radar.Card;
import nro.models.radar.RadarCard;
import nro.models.services.RadarService;
import nro.models.services_dungeon.MajinBuuService;
import nro.models.skill.PlayerSkill;
import nro.models.services_func.UseItem;
import java.util.List;
import nro.models.clan.Clan;
import nro.models.intrinsic.IntrinsicPlayer;
import nro.models.item.Item;
import nro.models.item.ItemTime;
import nro.models.npc.MagicTree;
import nro.models.server.Manager;
import nro.models.player_system.Template.Part;
import nro.models.consts.ConstPlayer;
import nro.models.consts.ConstTask;
import nro.models.npc.MabuEgg;
import nro.models.mob.MobMe;
import nro.models.data.DataGame;
import nro.models.clan.ClanMember;
import nro.models.consts.ConstAchievement;
import nro.models.map.Zone;
import nro.models.interfaces.IPVP;
import nro.models.matches.TYPE_LOSE_PVP;
import nro.models.skill.Skill;
import nro.models.services.Service;
import nro.models.network.MySession;
import nro.models.task.TaskPlayer;
import nro.models.network.Message;
import nro.models.server.Client;
import nro.models.services.EffectSkillService;
import nro.models.services.FriendAndEnemyService;
import nro.models.map.service.MapService;
import nro.models.services.PetService;
import nro.models.services.PlayerService;
import nro.models.services.TaskService;
import nro.models.map.service.ChangeMapService;
import nro.models.combine.Combine;
import nro.models.consts.ConstDailyGift;
import nro.models.utils.Logger;
import nro.models.utils.Util;
import java.util.ArrayList;
import nro.models.services_dungeon.BlackBallWarService;
import nro.models.matches.giai_dau.The23rdMartialArtCongressManager;
import nro.models.map.ItemMap;
import nro.models.map.MaBuHold;
import nro.models.map.phoban.MajinBuu14H;
import nro.models.services_dungeon.SuperDivineWaterService;
import nro.models.matches.dai_hoi_vo_thuat.The23rdMartialArtCongress;
import nro.models.daily_Giftcode.DailyGiftData;
import nro.models.daily_Giftcode.DailyGiftService;
import nro.models.services.InventoryService;
import nro.models.services_dungeon.NgocRongNamecService;
import nro.models.server.Maintenance;
import nro.models.services.shenron.Shenron_Event;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import nro.models.minigame.ChonAiDay_Gem;
import nro.models.minigame.ChonAiDay_Gold;
import nro.models.npc.DuaHauEgg;
import nro.models.player_badges.Badges;
import nro.models.player_badges.BadgesData;
import nro.models.services.ItemTimeService;
import nro.models.task.BadgesTask;
import nro.models.task.BadgesTaskService;

/**
 * @author By AmodsubVN
 */
public class Player implements Runnable {
   public long lastTimeEatPea;
   public Map<Integer, Long> activeEffects = new HashMap<>();
   public MySession session;
   public long id;
   public String name;
   public byte gender;
   public boolean isNewMember;
   public short head;
   public short body;
   public short leg;
   public int deltaTime;
   public byte typePk;
   public byte cFlag;
   public boolean haveTennisSpaceShip;
   public Badges badges;
   public boolean isBot;
   public PlayerEvent event;
   public boolean isCopy;
   public int point_sukien;
   public int point_sukien1;
   public int point_sukien2;
   public int thachdauwhis = 0;
   public int DuaHau;
   public int point_vuahung;
   public int point_maydam;
   public long total_damage_maydam;
   public boolean powerReduced = false;
   public boolean isKilledByMob = false;
   public String originalName;
   public boolean beforeDispose;
   public int mbv = 0;
   public boolean baovetaikhoan;
   public long mbvtime;
   public int timeGohome;
   public long lastUpdateGohomeTime;
   public boolean goHome;
   public long lastPkCommesonTime;
   public boolean callBossPocolo;
   public Zone zoneSieuThanhThuy;
   public boolean winSTT;
   public long lastTimeWinSTT;
   public long lastTimeUpdateSTT;
   public MajinBuu14H maBu2H;
   public boolean isMabuHold;
   public MaBuHold maBuHold;
   public int precentMabuHold;
   public boolean isPhuHoMapMabu;
   public boolean danhanthoivang;
   public long lastRewardGoldBarTime;
   public long excessGoldRecovered;
   public boolean isMayDoSucManh = false;
   public int timesPerDayBDKB = 0;
   public long lastTimeJoinBDKB;
   public int luckyRoundPoint = 0;
   public boolean reward100 = false;
   public boolean reward200 = false;
   public boolean reward300 = false;
   public boolean reward500 = false;
   public boolean reward700 = false;
   public boolean reward1000 = false;
   public int point_2207;
   public boolean reward_100_2207 = false;
   public boolean reward_200_2207 = false;
   public boolean reward_300_2207 = false;
   public boolean reward_500_2207 = false;
   public boolean joinCDRD;
   public long lastTimeJoinCDRD;
   public boolean talkToThuongDe;
   public boolean talkToThanMeo;
   public long timeChangeMap144;
   public Date firstTimeLogin;
   public long lastTimeJoinDT;
   public int typeChibi;
   public long lastTimeChibi;
   public long lastTimeUpdateChibi;
   public String captcha = "";
   public boolean doesNotAttack;
   public long lastTimePlayerNotAttack;
   public int timeNotAttack = 1800000;
   public boolean isPet;
   public boolean isNewPet;
   public boolean isNewPet1;
   public boolean isBoss;
   public boolean isPlayer;
   public IPVP pvp;
   public byte maxTime = 30;
   public byte type = 0;
   public boolean isOffline = false;
   public String notify = null;
   public int mapIdBeforeLogout;
   public List<Zone> mapBlackBall;
   public List<Zone> mapMaBu;
   public List<Player> temporaryEnemies = new ArrayList<>();
   public List<String> textRuongGo = new ArrayList<>();
   public Zone zone;
   public Zone mapBeforeCapsule;
   public List<Zone> mapCapsule;
   public Pet pet;
   public NewPet newPet;
   public MobMe mobMe;
   public Location location;
   public SetClothes setClothes;
   public EffectSkill effectSkill;
   public MabuEgg mabuEgg;
   public DuaHauEgg DuaHauEgg;
   public TaskPlayer playerTask;
   public ItemTime itemTime;
   public Fusion fusion;
   public MagicTree magicTree;
   public IntrinsicPlayer playerIntrinsic;
   public Inventory inventory;
   public PlayerSkill playerSkill;
   public Combine combineNew;
   public IDMark idMark;
   public Charms charms;
   public EffectSkin effectSkin;
   public NPoint nPoint;
   public RewardBlackBall rewardBlackBall;
   public FightMabu fightMabu;
   public NewSkill newSkill;
   public Satellite satellite;
   public Achievement achievement;
   public GiftCode giftCode;
   public Traning traning;
   public Clan clan;
   public ClanMember clanMember;
   public List<Friend> friends;
   public List<Enemy> enemies;
   public boolean justRevived;
   public long lastTimeRevived;
   public long timeChangeZone;
   public long lastUseOptionTime;
   public short idNRNM = -1;
   public short idGo = -1;
   public long lastTimePickNRNM;
   public long lastTimeNoticeMaxPower;
   public List<Card> Cards = new ArrayList<>();
   public int levelWoodChest;
   public long goldChallenge;
   public long rubyChallenge;
   public long lastTimeRewardWoodChest;
   public List<Item> itemsWoodChest = new ArrayList<>();
   public int indexWoodChest;
   public long lastTimePKDHVT23;
   public boolean lostByDeath;
   public boolean isPKDHVT;
   public boolean isDoingTask;
   public int xSend;
   public int ySend;
   public boolean isFly;
   // shenron event
   public long lastTimeShenronAppeared;
   public boolean isShenronAppear;
   public Shenron_Event shenronEvent;
   // vo dai sinh tu
   public long lastTimePKVoDaiSinhTu;
   public boolean haveRewardVDST;
   public int thoiVangVoDaiSinhTu;
   public long timePKVDST;
   public int binhChonHatMit;
   public int binhChonPlayer;
   public Zone zoneBinhChon;
   public ItemEvent itemEvent;
   public int levelLuyenTap;
   public boolean isThachDau;
   public int tnsmLuyenTap;
   public boolean dangKyTapTuDong;
   public long lastTimeOffline;
   public int mapIdDangTapTuDong;
   public int lastMapOffline;
   public int lastZoneOffline;
   public int lastXOffline;
   public int lastMapBeforeUpVang = -1;
   public int lastZoneBeforeUpVang = -1;
   public int lastXBeforeUpVang = -1;
   public int lastYBeforeUpVang = -1;
   public String thongBaoTapTuDong;
   public boolean teleTapTuDong;
   public byte vip;
   public long timevip;
   public int timesPerDayCuuSat;
   public long lastTimeCuuSat;
   public boolean nhanVangNangVIP;
   public boolean nhanDeTuNangVIP;
   public boolean nhanSKHVIP;
   public Item itemLoa = null;
   public long totalDamageTaken;
   public boolean thongBaoChangeMap;
   public String textThongBaoChangeMap;
   public boolean thongBaoThua;
   public String textThongBaoThua;
   public SuperRank superRank;
   public int mamcay;
   public long timemamcay;
   public boolean canReward;
   public boolean changeMapVIP;
   public boolean haveReward;
   public int tayThong;
   public List<Item> itemsTradeWVP = new ArrayList<>();
   public long goldTradeWVP;
   public boolean tradeWVP;
   public long plIdWVP;
   private DropItem dropItem;
   public int eventPointType1;
   public int eventPointType2;
   public int eventPointType3;
   public int eventPointType4;
   public int eventPointType5;
   public int eventPointType6;
   public boolean checkDailyReward;
   public boolean checkTopReward1;
   public boolean checkTopReward2;
   public boolean checkTopReward3;
   private String lastChatMessage;
   public List<BadgesData> dataBadges = new ArrayList<>();
   public List<BadgesTask> dataTaskBadges = new ArrayList<>();
   public long lastTimeChangeBadges;
   public int autoTrainState = 0;
   public List<Integer> BoughtSkill = new ArrayList<>();
   public LearnSkill LearnSkill;
   public List<DailyGiftData> dailyGiftData = new ArrayList<>();
   public int gemNormar;
   public int gemVIP;
   public int goldNormar;
   public int goldVIP;
   public int id_CSMM_Gold;
   /** Mức cược CSMM thỏi vàng tùy chọn (0 = dùng giải vòng này) */
   public long csmmBetTierGold;
   /** Mức cược CSMM ngọc xanh tùy chọn (0 = dùng giải vòng này) */
   public long csmmBetTierGem;
   public String nameClan;
   public int levelBDKBDone;
   public long timeBDKBDone;
   public long lastTimeUpdateTopBDKB;
   public int levelKhiGasDone;
   public long timeKhiGasDone;
   public long lastTimeUpdateTopKhiGas;
   public int levelCDRDDone;
   public long timeCDRDDone;
   public long lastTimeUpdateTopCDRD;
   public long thoiGianBatDauTrong;
   public int soLuongDuaTrongHomNay;
   public int rewardEggs;
   private long duaHauStartTime;
   public Player menuPlayer;
   public boolean hasReducedPower = false;
   public long originalPower = -1;
   public boolean receivedKilis = false;
   public int kolQuestStage;
   public int kolVIPQuestStage;
   public long martialArtsTournamentWins;
   public long destronGas70CompletionCount;
   public long dailySuperHardQuestCompletionCount;
   public long bossBabyDefeatParticipationCount;
   public long monsterKillCountAutoTrain;
   public int vipPurchaseCount;
   public long lastClanCheckIn = 0;
   public long lastTimeRecheckClan;
   public long lastChallengeGauTuongCuopTime;
   public long lastChallengeGauTuopCuopTime;
   public LocalDateTime lastCheckIn;
   public long lastTimeDoanhTrai;

   public Player() {
      LearnSkill = new LearnSkill();
      lastUseOptionTime = System.currentTimeMillis();
      location = new Location();
      nPoint = new NPoint(this);
      inventory = new Inventory();
      playerSkill = new PlayerSkill(this);
      setClothes = new SetClothes(this);
      effectSkill = new EffectSkill(this);
      fusion = new Fusion(this);
      playerIntrinsic = new IntrinsicPlayer();
      rewardBlackBall = new RewardBlackBall(this);
      fightMabu = new FightMabu(this);
      idMark = new IDMark();
      this.idMark = new IDMark();
      combineNew = new Combine();
      playerTask = new TaskPlayer();
      friends = new ArrayList<>();
      enemies = new ArrayList<>();
      itemTime = new ItemTime(this);
      charms = new Charms(this);
      effectSkin = new EffectSkin(this);
      newSkill = new NewSkill(this);
      satellite = new Satellite();
      achievement = new Achievement(this);
      giftCode = new GiftCode();
      traning = new Traning();
      itemEvent = new ItemEvent(this);
      superRank = new SuperRank(this);
      dropItem = new DropItem(this);
      event = new PlayerEvent(this);
      badges = new Badges();
   }

   // --------------------------------------------------------------------------
   public boolean isDie() {
      if (this.nPoint != null && this.nPoint.hp <= 0) {
         return true;
      }
      return false;
   }

   public void sendMessage(Message msg) {
      if (this.session != null) {
         session.sendMessage(msg);
      }
   }

   public boolean isPl() {
      return isPlayer && !isBot && !isPet && !isBoss && !isNewPet && !isNewPet1 && !(this instanceof NonInteractiveNPC);
   }

   @Override
   public void run() {
      Functions.sleep(500);
      while (!Maintenance.isRunning && session != null && session.isConnected() && this.name != null) {
         long st = System.currentTimeMillis();
         update();
         Functions.sleep(Math.max(1000 - (System.currentTimeMillis() - st), 10));
      }
   }

   public void start() {
      new Thread(this, "Update player " + this.name).start();
   }

   public void update() {
      if (!this.beforeDispose) {
         try {
            if (this.zone != null || (!this.isPl() && this.zone == null)) {
               if (itemTime != null) {
                  itemTime.update();
               }
               if (magicTree != null) {
                  magicTree.update();
               }
               if (this.zone != null && hasEffect(this, 7143)) {
                  activeEffects.entrySet().removeIf(entry -> System.currentTimeMillis() >= entry.getValue());
                  this.spreadEffectToNearbyPlayers();
               }
               if (this.isPl() && this.zone != null && this.zone.map.mapId == this.gender + 21
                     && (TaskService.gI().getIdTask(this) == ConstTask.TASK_0_0
                           || TaskService.gI().getIdTask(this) == ConstTask.TASK_0_1)) {
                  this.playerTask.taskMain.index = 2;
                  TaskService.gI().sendTaskMain(this);
               }
            }
            if ((this.zone != null && !MapService.gI().isHome(this.zone.map.mapId))
                  || (!this.isPl() && this.zone == null)) {
               if (isPl() && idMark != null && idMark.isBan() && Util.canDoWithTime(idMark.getLastTimeBan(), 5000)) {
                  Client.gI().kickSession(session);
                  return;
               }
               if (nPoint != null) {
                  nPoint.update();
               }
               if (fusion != null) {
                  fusion.update();
               }
               if (effectSkill != null) {
                  effectSkill.update();
               }
               if (mobMe != null) {
                  mobMe.update();
               }
               if (effectSkin != null) {
                  effectSkin.update();
               }
               if (pet != null) {
                  pet.update();
               }
               if (event != null) {
                  event.update();
               }
               if (newPet != null) {
                  newPet.update();
               }
               if (satellite != null) {
                  satellite.update();
               }
               if (this.nPoint.timeXinbatoBuff + 10000 < System.currentTimeMillis()) {
                  this.nPoint.tlNeDonBuffXinbato = 0;
               }
               if (this.isPl() && !this.isBot && !this.isDie() && this.zone != null && this.zone.map != null
                     && this.effectSkill != null && !this.effectSkill.isChibi
                     && Util.canDoWithTime(lastTimeChibi, 30000)) {
                  if (Util.isTrue(10, 100) && !MapService.gI().isMapBlackBallWar(this.zone.map.mapId)) {
                     EffectSkillService.gI().setChibi(this, 600000);
                  }
                  lastTimeChibi = System.currentTimeMillis();
               }
               if (this.isPl() && !this.isBot && !this.isDie() && this.effectSkill != null && this.effectSkill.isChibi
                     && Util.canDoWithTime(lastTimeUpdateChibi, 1000)) {
                  if (this.typeChibi == 1) {
                     if (this.nPoint.mp < this.nPoint.mpMax) {
                        if (this.nPoint.mpMax - this.nPoint.mp < this.nPoint.mpMax / 10) {
                           this.nPoint.mp = this.nPoint.mpMax;
                        } else {
                           this.nPoint.mp += this.nPoint.mpMax / 10;
                        }
                     }
                     PlayerService.gI().sendInfoMp(this);
                  } else if (this.typeChibi == 3) {
                     if (this.nPoint.hp < this.nPoint.hpMax) {
                        if (this.nPoint.hpMax - this.nPoint.hp < this.nPoint.hpMax / 10) {
                           this.nPoint.hp = this.nPoint.hpMax;
                        } else {
                           this.nPoint.hp += this.nPoint.hpMax / 10;
                        }
                     }
                     PlayerService.gI().sendInfoHp(this);
                  }
                  lastTimeUpdateChibi = System.currentTimeMillis();
               }
               if (this.isPl() && this.achievement != null) {
                  this.achievement.done(ConstAchievement.HOAT_DONG_CHAM_CHI, 1000);
               }
               if (this.isPl()) {
                  Calendar calendar = Calendar.getInstance();
                  int hour = calendar.get(Calendar.HOUR_OF_DAY);
                  if (hour >= 22 && hour < 23) {
                     if (zone.map.mapId == 126) {
                     }
                  }
                  autoSendBadges();
                  BadgesTaskService.updateDoneTask(this);
                  sendTextTimeDaiLyGift();
               }
               if (this.isPl() && this.effectSkill != null && this.effectSkill.isMabuHold) {
                  this.nPoint.subHP(this.nPoint.hpMax / 100);
                  if (Util.isTrue(1, 10)) {
                     Service.gI().chat(this, "Cứu tôi với");
                  }
                  PlayerService.gI().sendInfoHp(this);
                  if (this.precentMabuHold > 15) {
                     EffectSkillService.gI().removeMabuHold(this);
                  }
                  if (this.nPoint.hp <= 0) {
                     EffectSkillService.gI().removeMabuHold(this);
                     setDie();
                  }
               }
               if (this.zone != null && this.effectSkin != null && this.effectSkin.xHPKI > 1
                     && !MapService.gI().isMapBlackBallWar(this.zone.map.mapId)) {
                  this.effectSkin.xHPKI = 1;
                  this.nPoint.calPoint();
                  Service.gI().point(this);
               }
               if (this.zone != null && this.effectSkin != null && this.effectSkin.xDame > 1
                     && !MapService.gI().isMapBlackBallWar(this.zone.map.mapId)) {
                  this.effectSkin.xDame = 1;
                  this.nPoint.calPoint();
                  Service.gI().point(this);
               }
               if (this.isPl() && this.zone != null) {
                  fixBlackBallWar();
               }
               if (this.zone != null && this.zone.map.mapId == (21 + this.gender)) {
                  if (this.mabuEgg != null) {
                     this.mabuEgg.sendMabuEgg();
                  }
               }
               if (this.zone != null && this.zone.map.mapId == (21 + this.gender)) {
                  if (this.DuaHauEgg != null) {
                     this.DuaHauEgg.sendDuaHauEgg();
                  }
               }
               if (this.isPhuHoMapMabu && this.zone != null && !MapService.gI().isMapMabu2H(this.zone.map.mapId)) {
                  this.isPhuHoMapMabu = false;
                  this.nPoint.calPoint();
                  Service.gI().point(this);
                  Service.gI().Send_Info_NV(this);
                  Service.gI().Send_Caitrang(this);
               }
               if (this.isPl() && this.clan != null && this.clan.ConDuongRanDoc != null && this.joinCDRD
                     && this.clan.ConDuongRanDoc.allMobsDead && this.talkToThanMeo && this.zone.map.mapId == 47
                     && Util.canDoWithTime(timeChangeMap144, 5000)) {
                  ChangeMapService.gI().changeMapYardrat(this, this.clan.ConDuongRanDoc.getMapById(144),
                        300 + Util.nextInt(-100, 100), 312);
                  this.timeChangeMap144 = System.currentTimeMillis();
               }
               if (this.isPl() && this.zone != null && !MapService.gI().isMapMaBu(this.zone.map.mapId)
                     && (this.cFlag == 9 || this.cFlag == 10)) {
                  Service.gI().changeFlag(this, 0);
               }
               if (this.isPl()) {
                  autoSendBadges();
                  BadgesTaskService.updateDoneTask(this);
               }
               if (this.isPl() && this.superRank != null) {
                  if (Util.isAfterMidnight(this.superRank.lastRewardTime)) {
                     this.superRank.reward();
                  }
               }
               if (this.isPl() && this.zone != null && MapService.gI().isMapMaBu(this.zone.map.mapId) && this.cFlag != 9
                     && this.cFlag != 10) {
                  Service.gI().changeFlag(this, 9);
               }
               if (dropItem != null) {
                  dropItem.update();
               }
               MajinBuuService.gI().update(this);
               SuperDivineWaterService.gI().update(this);
               if (!isBoss && this.idMark != null && this.idMark.isGotoFuture()
                     && Util.canDoWithTime(this.idMark.getLastTimeGoToFuture(), 60000)) {
                  ChangeMapService.gI().changeMapBySpaceShip(this, 102, -1, Util.nextInt(60, 200));
                  this.idMark.setGotoFuture(false);
               }
            }
         } catch (Exception e) {
            Logger.logException(Player.class, e, "Lỗi tại player: " + this.name);
         }
      }
   }

   public void autoSendBadges() {
      int activeBadges = -1;
      Iterator<BadgesData> iterator = dataBadges.iterator();
      while (iterator.hasNext()) {
         BadgesData data = iterator.next();
         if (System.currentTimeMillis() >= data.timeofUseBadges) {
            iterator.remove();
         } else if (data.isUse) {
            activeBadges = data.idBadGes;
         }
      }
      badges.idBadges = activeBadges;
      if (badges.idBadges != -1 && Util.canDoWithTime(badges.lastTimeSendBadges, 9000)) {
         Service.gI().sendBadgesPlayer(this, 12, badges.idBadges);
         badges.lastTimeSendBadges = System.currentTimeMillis();
         this.nPoint.update();
         Service.gI().point(this);
      }
   }

   private static final short[][] idOutfitFusion = { { 380, 381, 382 }, { 383, 384, 385 }, { 391, 392, 393 },
         { 870, 871, 872 }, { 873, 874, 875 }, { 867, 868, 869 }, { 1866, 1859, 1860 }, // td btc3
         { 1869, 1872, 1873 }, // nm btc3
         { 1856, 1859, 1860 } };
   public static final short[][] idOutfitGod = { { -1, 472, 473 }, { -1, 476, 477 }, { -1, 474, 475 } };
   public static final short[][][] idOutfitHalloween = { { { 545, 548, 549 }, { 547, 548, 549 }, { 546, 548, 549 } },
         { { 2082, 2085, 2086 }, { 2084, 2085, 2086 }, { 2083, 2085, 2086 } },
         { { 760, 761, 762 }, { 760, 761, 762 }, { 760, 761, 762 } },
         { { 654, 655, 656 }, { 654, 655, 656 }, { 654, 655, 656 } },
         { { 651, 652, 653 }, { 651, 652, 653 }, { 651, 652, 653 } } };
   public static final short[][] idOutfitMafuba = { { 1218, 1219, 1220 }, { 1218, 1219, 1220 }, { 1218, 1219, 1220 } };

   public String percentGold(int type) {
      return ChonAiDay_Gold.gI().getPercent(this, type);
   }

   public String percentGem(int type) {
      return ChonAiDay_Gem.gI().getPercent(this, type);
   }

   public int getHat() {
      return -1;
   }

   public byte getAura() {
      if (this.inventory != null && !this.inventory.itemsBody.isEmpty() && this.inventory.itemsBody.size() > 5) {
         Item ct = this.inventory.itemsBody.get(5);
         if (ct.isNotNullItem()) {
            for (Item.ItemOption io : ct.itemOptions) {
               if (io.optionTemplate.id == 211) {
                  return (byte) io.param;
               }
            }
         }
      }
      if (!isPl() || this.Cards.isEmpty()) {
         return -1;
      }
      for (Card card : this.Cards) {
         if (card != null && card.Level > 1) {
            RadarCard radarTemplate = RadarService.gI().RADAR_TEMPLATE.stream().filter(r -> r.Id == card.Id).findFirst()
                  .orElse(null);
            if (radarTemplate != null && radarTemplate.Rank >= 4 && radarTemplate.AuraId > -1) {
               return (byte) radarTemplate.AuraId;
            }
         }
      }
      return -1;
   }

   public byte getEffFront() {
      if (this.inventory == null) {
         return -1;
      }
      if (this.inventory.itemsBody.isEmpty() || this.inventory.itemsBody.size() < 10) {
         return -1;
      }
      int levelAo = 0;
      Item.ItemOption optionLevelAo = null;
      int levelQuan = 0;
      Item.ItemOption optionLevelQuan = null;
      int levelGang = 0;
      Item.ItemOption optionLevelGang = null;
      int levelGiay = 0;
      Item.ItemOption optionLevelGiay = null;
      int levelNhan = 0;
      Item.ItemOption optionLevelNhan = null;
      Item itemAo = this.inventory.itemsBody.get(0);
      Item itemQuan = this.inventory.itemsBody.get(1);
      Item itemGang = this.inventory.itemsBody.get(2);
      Item itemGiay = this.inventory.itemsBody.get(3);
      Item itemNhan = this.inventory.itemsBody.get(4);
      for (Item.ItemOption io : itemAo.itemOptions) {
         if (io.optionTemplate.id == 72) {
            levelAo = io.param;
            optionLevelAo = io;
            break;
         }
      }
      for (Item.ItemOption io : itemQuan.itemOptions) {
         if (io.optionTemplate.id == 72) {
            levelQuan = io.param;
            optionLevelQuan = io;
            break;
         }
      }
      for (Item.ItemOption io : itemGang.itemOptions) {
         if (io.optionTemplate.id == 72) {
            levelGang = io.param;
            optionLevelGang = io;
            break;
         }
      }
      for (Item.ItemOption io : itemGiay.itemOptions) {
         if (io.optionTemplate.id == 72) {
            levelGiay = io.param;
            optionLevelGiay = io;
            break;
         }
      }
      for (Item.ItemOption io : itemNhan.itemOptions) {
         if (io.optionTemplate.id == 72) {
            levelNhan = io.param;
            optionLevelNhan = io;
            break;
         }
      }
      if (optionLevelAo != null && optionLevelQuan != null && optionLevelGang != null && optionLevelGiay != null
            && optionLevelNhan != null && levelAo >= 8 && levelQuan >= 8 && levelGang >= 8 && levelGiay >= 8
            && levelNhan >= 8) {
         return 8;
      } else if (optionLevelAo != null && optionLevelQuan != null && optionLevelGang != null && optionLevelGiay != null
            && optionLevelNhan != null && levelAo >= 7 && levelQuan >= 7 && levelGang >= 7 && levelGiay >= 7
            && levelNhan >= 7) {
         return 7;
      } else if (optionLevelAo != null && optionLevelQuan != null && optionLevelGang != null && optionLevelGiay != null
            && optionLevelNhan != null && levelAo >= 6 && levelQuan >= 6 && levelGang >= 6 && levelGiay >= 6
            && levelNhan >= 6) {
         return 6;
      } else if (optionLevelAo != null && optionLevelQuan != null && optionLevelGang != null && optionLevelGiay != null
            && optionLevelNhan != null && levelAo >= 5 && levelQuan >= 5 && levelGang >= 5 && levelGiay >= 5
            && levelNhan >= 5) {
         return 5;
      } else if (optionLevelAo != null && optionLevelQuan != null && optionLevelGang != null && optionLevelGiay != null
            && optionLevelNhan != null && levelAo >= 4 && levelQuan >= 4 && levelGang >= 4 && levelGiay >= 4
            && levelNhan >= 4) {
         return 4;
      } else {
         return -1;
      }
   }

   public String getTitle() {
      if (this.dataBadges != null) {
         for (nro.models.player_badges.BadgesData bd : this.dataBadges) {
            if (bd != null && bd.isUse) {
               for (nro.models.player_badges.BagesTemplate bt : nro.models.server.Manager.BAGES_TEMPLATES) {
                  if (bt != null && bt.idEffect == bd.idBadGes && bt.NAME != null && !bt.NAME.isEmpty()) {
                     return bt.NAME;
                  }
               }
            }
         }
      }
      return "";
   }

   public short getHead() {
      if (this.isPl() && this.pet != null && this.fusion != null && (this.fusion.typeFusion == ConstPlayer.HOP_THE_GOGETA
            || this.fusion.typeFusion == ConstPlayer.LUONG_LONG_NHAT_THE
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
         Item item = inventory.itemsBody.get(5);
         Item petItem = pet.inventory.itemsBody.get(5);
         boolean hasItem1 = item.isNotNullItem() && (item.template.id == 1693 || item.template.id == 1553);
         boolean hasItem2 = petItem.isNotNullItem() && (petItem.template.id == 1693 || petItem.template.id == 1553);
         boolean sameItem = item.isNotNullItem() && petItem.isNotNullItem() && item.template.id == petItem.template.id;
         if (hasItem1 && hasItem2 && !sameItem) {
            return 1578;
         }
      }
      if (effectSkill != null && effectSkill.isBinh) {
         return idOutfitMafuba[effectSkill.typeBinh][0];
      }
      if (effectSkill != null && effectSkill.isStone) {
         return 454;
      }
      if (effectSkill != null && effectSkill.isHalloween) {
         return idOutfitHalloween[effectSkill.idOutfitHalloween][this.gender][0];
      }
      if (effectSkill != null && effectSkill.isMonkey) {
         return (short) ConstPlayer.HEADMONKEY[effectSkill.levelMonkey - 1];
      } else if (effectSkill != null && effectSkill.isSocola) {
         return (short) (effectSkill.typeSocola == 1 ? 406 : 412);
      } else if (fusion != null && fusion.typeFusion != ConstPlayer.NON_FUSION) {
         if (nPoint != null && nPoint.isGogeta) {
            return 2100;
         } else if (fusion.typeFusion == ConstPlayer.LUONG_LONG_NHAT_THE) {
            return idOutfitFusion[this.gender == ConstPlayer.NAMEC ? 2 : 0][0];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA) {
            // if (this.pet.typePet == 1) {
            // return idOutfitFusion[3 + this.gender][0];
            // }
            return idOutfitFusion[this.gender == ConstPlayer.NAMEC ? 2 : 1][0];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2) {
            if (nPoint != null && nPoint.levelBT == 3) {
               return idOutfitFusion[3 + this.gender][0];
            }
            return idOutfitFusion[3 + this.gender][0];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3) {
            if (nPoint != null && nPoint.levelBT == 4) {
               return idOutfitFusion[6 + this.gender][0];
            }
            return idOutfitFusion[6 + this.gender][0];
         }
      } else if (inventory != null && inventory.itemsBody.get(5).isNotNullItem()) {
         int headId = inventory.itemsBody.get(5).template.head;
         if (headId != -1) {
            return (short) headId;
         }
      }
      return this.head;
   }

   public short getBody() {
      if (this.isPl() && this.pet != null && this.fusion != null && (this.fusion.typeFusion == ConstPlayer.HOP_THE_GOGETA
            || this.fusion.typeFusion == ConstPlayer.LUONG_LONG_NHAT_THE
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
         Item item = inventory.itemsBody.get(5);
         Item petItem = pet.inventory.itemsBody.get(5);
         boolean hasItem1 = item.isNotNullItem() && (item.template.id == 1693 || item.template.id == 1553);
         boolean hasItem2 = petItem.isNotNullItem() && (petItem.template.id == 1693 || petItem.template.id == 1553);
         boolean sameItem = item.isNotNullItem() && petItem.isNotNullItem() && item.template.id == petItem.template.id;
         if (hasItem1 && hasItem2 && !sameItem) {
            return 1581;
         }
      }
      if (effectSkill != null && effectSkill.isBinh) {
         return idOutfitMafuba[effectSkill.typeBinh][1];
      }
      if (effectSkill != null && effectSkill.isStone) {
         return 455;
      }
      if (effectSkill != null && effectSkill.isHalloween) {
         return idOutfitHalloween[effectSkill.idOutfitHalloween][this.gender][1];
      }
      if (effectSkill != null && effectSkill.isMonkey) {
         return 193;
      } else if (effectSkill != null && effectSkill.isSocola) {
         return (short) (effectSkill.typeSocola == 1 ? 407 : 413);
      } else if (isPhuHoMapMabu && fusion != null && fusion.typeFusion == ConstPlayer.NON_FUSION) {
         return idOutfitGod[this.gender][1];
      } else if (fusion != null && fusion.typeFusion != ConstPlayer.NON_FUSION) {
         if (nPoint != null && nPoint.isGogeta) {
            return 2101;
         } else if (fusion.typeFusion == ConstPlayer.LUONG_LONG_NHAT_THE) {
            return idOutfitFusion[this.gender == ConstPlayer.NAMEC ? 2 : 0][1];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA) {
            // if (this.pet.typePet == 1) {
            // return idOutfitFusion[3 + this.gender][1];
            // }
            return idOutfitFusion[this.gender == ConstPlayer.NAMEC ? 2 : 1][1];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2) {
            if (nPoint != null && nPoint.levelBT == 3) {
               return idOutfitFusion[3 + this.gender][1];
            }
            return idOutfitFusion[3 + this.gender][1];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3) {
            if (nPoint != null && nPoint.levelBT == 4) {
               return idOutfitFusion[6 + this.gender][1];
            }
            return idOutfitFusion[6 + this.gender][1];
         }
      } else if (inventory != null && inventory.itemsBody.get(5).isNotNullItem()) {
         int body = inventory.itemsBody.get(5).template.body;
         if (body != -1) {
            return (short) body;
         }
      }
      if (inventory != null && inventory.itemsBody.get(0).isNotNullItem()) {
         return inventory.itemsBody.get(0).template.part;
      }
      return (short) (gender == ConstPlayer.NAMEC ? 59 : 57);
   }

   public short getLeg() {
      if (this.isPl() && this.pet != null && this.fusion != null && (this.fusion.typeFusion == ConstPlayer.HOP_THE_GOGETA
            || this.fusion.typeFusion == ConstPlayer.LUONG_LONG_NHAT_THE
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2
            || this.fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3)) {
         Item item = inventory.itemsBody.get(5);
         Item petItem = pet.inventory.itemsBody.get(5);
         boolean hasItem1 = item.isNotNullItem() && (item.template.id == 1693 || item.template.id == 1553);
         boolean hasItem2 = petItem.isNotNullItem() && (petItem.template.id == 1693 || petItem.template.id == 1553);
         boolean sameItem = item.isNotNullItem() && petItem.isNotNullItem() && item.template.id == petItem.template.id;
         if (hasItem1 && hasItem2 && !sameItem) {
            return 1582;
         }
      }
      if (effectSkill != null && effectSkill.isBinh) {
         return idOutfitMafuba[effectSkill.typeBinh][2];
      }
      if (effectSkill != null && effectSkill.isStone) {
         return 456;
      }
      if (effectSkill != null && effectSkill.isHalloween) {
         return idOutfitHalloween[effectSkill.idOutfitHalloween][this.gender][2];
      }
       if (effectSkill != null && effectSkill.isMonkey) {
          return 194;
       } else if (effectSkill != null && effectSkill.isSocola) {
          return (short) (effectSkill.typeSocola == 1 ? 408 : 414);
       } else if (isPhuHoMapMabu && fusion != null && fusion.typeFusion == ConstPlayer.NON_FUSION) {
         return idOutfitGod[this.gender][2];
      } else if (fusion != null && fusion.typeFusion != ConstPlayer.NON_FUSION) {
         if (nPoint != null && nPoint.isGogeta) {
            return 2102;
         } else if (fusion.typeFusion == ConstPlayer.LUONG_LONG_NHAT_THE) {
            return idOutfitFusion[this.gender == ConstPlayer.NAMEC ? 2 : 0][2];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA) {
            // if (this.pet.typePet == 1) {
            // return idOutfitFusion[3 + this.gender][2];
            // }
            return idOutfitFusion[this.gender == ConstPlayer.NAMEC ? 2 : 1][2];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA2) {
            if (nPoint != null && nPoint.levelBT == 3) {
               return idOutfitFusion[3 + this.gender][2];
            }
            return idOutfitFusion[3 + this.gender][2];
         } else if (fusion.typeFusion == ConstPlayer.HOP_THE_PORATA3) {
            if (nPoint != null && nPoint.levelBT == 4) {
               return idOutfitFusion[6 + this.gender][2];
            }
            return idOutfitFusion[6 + this.gender][2];
         }
      } else if (inventory != null && inventory.itemsBody.get(5).isNotNullItem()) {
         int leg = inventory.itemsBody.get(5).template.leg;
         if (leg != -1) {
            return (short) leg;
         }
      }
      if (inventory != null && inventory.itemsBody.get(1).isNotNullItem()) {
         return inventory.itemsBody.get(1).template.part;
      }
      return (short) (gender == 1 ? 60 : 58);
   }

   public short getFlagBag() {
      if (this.idMark.isHoldBlackBall()) {
         return 31;
      } else if (this.idNRNM >= 353 && this.idNRNM <= 359) {
         return 30;
      }
      if (TaskService.gI().getIdTask(this) == ConstTask.TASK_3_2) {
         return 28;
      }
      if (this.inventory.itemsBody.size() >= 11) {
         if (this.inventory.itemsBody.get(8).isNotNullItem()) {
            return this.inventory.itemsBody.get(8).template.part;
         }
      }
      if (this.isPet && this.inventory.itemsBody.size() >= 8) {
         if (this.inventory.itemsBody.get(7).isNotNullItem()) {
            return this.inventory.itemsBody.get(7).template.part;
         }
      }
      if (this.clan != null) {
         return (short) this.clan.imgId;
      }
      return -1;
   }

   public short getMount() {
      if (this.inventory.itemsBody.isEmpty() || this.inventory.itemsBody.size() < 10) {
         return -1;
      }
      Item item = this.inventory.itemsBody.get(7);
      if (!item.isNotNullItem()) {
         return -1;
      }
      if (item.template.type == 24 || item.template.type == 23) {
         if (item.template.gender == 3 || item.template.gender == this.gender) {
            return item.template.id;
         } else {
            return -1;
         }
      } else {
         if (item.template.id < 500) {
            return item.template.id;
         } else {
            Short value = (Short) DataGame.MAP_MOUNT_NUM.get(item.template.id);
            return value != null ? value : -1;
         }
      }
   }

   public synchronized int injured(Player plAtt, long damage, boolean piercing, boolean isMobAttack) {
      System.out
            .println("[DEBUG] Player.injured: target=" + this.name + ", plAtt=" + (plAtt != null ? plAtt.name : "null")
                  + ", damage=" + damage + ", currentHp=" + this.nPoint.hp + ", isMobAttack=" + isMobAttack);
      if (!this.isDie()) {
         if (plAtt != null && !plAtt.equals(this)) {
            setTemporaryEnemies(plAtt);
         }
         if (plAtt != null && plAtt.playerSkill != null && plAtt.playerSkill.skillSelect != null
               && plAtt.playerSkill.skillSelect.template != null && !plAtt.isBoss
               && MapService.gI().isMapMaBu(this.zone.map.mapId)) {
            switch (plAtt.playerSkill.skillSelect.template.id) {
               case Skill.KAMEJOKO, Skill.MASENKO, Skill.ANTOMIC, Skill.DRAGON, Skill.DEMON, Skill.GALICK,
                     Skill.LIEN_HOAN, Skill.KAIOKEN ->
                  damage = damage > this.nPoint.hpMax / 20 ? this.nPoint.hpMax / 20 : damage;
            }
         }
         if (plAtt != null && plAtt.isBoss) {
            this.effectSkin.isVoHinh = false;
            this.effectSkin.lastTimeVoHinh = System.currentTimeMillis();
         }
         if (plAtt != null && plAtt.effectSkill != null && plAtt.effectSkill.isBinh
               && !Util.canDoWithTime(plAtt.effectSkill.lastTimeUpBinh, 3000)) {
            return 0;
         }
         if (plAtt != null && plAtt.isPl() && this.maBuHold != null && this.zone != null
               && this.zone.map.mapId == 128) {
            this.precentMabuHold++;
            damage = 1;
         }
         if (plAtt != null && plAtt.idNRNM != -1 && (this.isBoss || this.isNewPet)) {
            return 1;
         }
         if (plAtt != null && (plAtt.idNRNM != -1 || this.idNRNM != -1) && plAtt.clan != null && this.clan != null
               && plAtt.clan == this.clan) {
            Service.gI().chatJustForMe(plAtt, this, "Ê cùng bang mà");
            return 0;
         }
         if (!Util.canDoWithTime(this.lastTimeRevived, 1500)) {
            return 0;
         }
         if (plAtt != null && plAtt.playerSkill != null && plAtt.playerSkill.skillSelect != null
               && plAtt.playerSkill.skillSelect.template != null) {
            switch (plAtt.playerSkill.skillSelect.template.id) {
               case Skill.KAMEJOKO, Skill.MASENKO, Skill.ANTOMIC -> {
                  if (this.nPoint.voHieuChuong > 0) {
                     if (this.idMark != null && this.nPoint.tlPST > 0) {
                        this.idMark.setDamePST((int) Math.min(damage, 2_147_483_647L));
                     }
                     PlayerService.gI().hoiPhuc(this, 0, (int) (damage * this.nPoint.voHieuChuong / 100));
                     return 0;
                  }
               }
            }
         }
         int tlGiap = this.nPoint.tlGiap;
         int tlNeDon = this.nPoint.tlNeDon;
         int tlNeDonXinbato = this.nPoint.tlNeDonXinbato;
         if (plAtt != null && !isMobAttack && plAtt.playerSkill != null && plAtt.playerSkill.skillSelect != null
               && plAtt.playerSkill.skillSelect.template != null) {
            switch (plAtt.playerSkill.skillSelect.template.id) {
               case Skill.KAMEJOKO, Skill.MASENKO, Skill.ANTOMIC, Skill.DRAGON, Skill.DEMON, Skill.GALICK,
                     Skill.LIEN_HOAN, Skill.KAIOKEN, Skill.QUA_CAU_KENH_KHI, Skill.MAKANKOSAPPO,
                     Skill.DICH_CHUYEN_TUC_THOI ->
                  tlNeDon -= plAtt.nPoint.tlchinhxac;
               default -> tlNeDon = 0;
            }
            switch (plAtt.playerSkill.skillSelect.template.id) {
               case Skill.KAMEJOKO, Skill.MASENKO, Skill.ANTOMIC -> {
                  if (tlGiap - plAtt.nPoint.tlxgc >= 0) {
                     tlGiap -= plAtt.nPoint.tlxgc;
                  } else {
                     tlGiap = 0;
                  }
               }
               case Skill.DRAGON, Skill.DEMON, Skill.GALICK, Skill.LIEN_HOAN, Skill.KAIOKEN -> {
                  if (tlGiap - plAtt.nPoint.tlxgcc >= 0) {
                     tlGiap -= plAtt.nPoint.tlxgcc;
                  } else {
                     tlGiap = 0;
                  }
               }
            }
         }
         if (piercing) {
            tlGiap = 0;
         }
         if (tlNeDon > 90) {
            tlNeDon = 90;
         }
         if (tlNeDonXinbato > 90) {
            tlNeDonXinbato = 90;
         }
         if (tlGiap > 86) {
            tlGiap = 86;
         }
         if (Util.isTrue(tlNeDon, 100)) {
            return 0;
         }
         boolean hasXinbato = this.effectSkill != null && this.effectSkill.isXinbato;
         if (hasXinbato) {
            if (tlNeDonXinbato > 90) {
               tlNeDonXinbato = 90;
            }
            if (Util.isTrue(tlNeDonXinbato, 100)) {
               return 0; // né thành công với Xinbato
            }
         }
         damage -= ((damage / 100) * tlGiap);
         if (this.effectSkill != null && this.effectSkill.isGiamDameBuff) {
            damage -= ((damage / 100) * this.effectSkill.tileGiamDameBuff);
         }
         if (!piercing) {
            damage = this.nPoint.subDameInjureWithDeff(damage);
         }
         boolean isUseGX = false;
         if (!piercing && plAtt != null && plAtt.playerSkill != null && plAtt.playerSkill.skillSelect != null
               && plAtt.playerSkill.skillSelect.template != null) {
            switch (plAtt.playerSkill.skillSelect.template.id) {
               case Skill.KAMEJOKO, Skill.MASENKO, Skill.ANTOMIC, Skill.DRAGON, Skill.DEMON, Skill.GALICK,
                     Skill.LIEN_HOAN, Skill.KAIOKEN, Skill.QUA_CAU_KENH_KHI, Skill.MAKANKOSAPPO,
                     Skill.DICH_CHUYEN_TUC_THOI ->
                  isUseGX = true;
            }
         }
         if ((isUseGX || isMobAttack) && this.itemTime != null) {
            if (this.itemTime.isUseGiapXen && !this.itemTime.isUseGiapXen2) {
               damage /= 2;
            }
            if (this.itemTime.isUseGiapXen2) {
               damage = damage / 100 * 40;
            }
         }
         if (this.satellite != null && this.satellite.isDefend) {
            damage -= damage / 5;
         }
         if (!piercing && effectSkill.isShielding) {
            if (!isMobAttack && this.idMark != null) {
               this.idMark.setDamePST((int) Math.min(damage, 2147483647L));
            }
            int shieldLv = this.effectSkill.levelShield > 0 ? this.effectSkill.levelShield : 1;
            long maxShieldCap = (long) (this.nPoint.hpMax * (1.5 + shieldLv * 0.5))
                  + ((long) this.nPoint.def * 10L * shieldLv)
                  + (long) (this.nPoint.hpMax * this.nPoint.tlGiap / 100);

            if (!isMobAttack && damage > maxShieldCap) {
               EffectSkillService.gI().breakShield(this);
               damage = damage - maxShieldCap;
               if (damage < 1) {
                  damage = 1;
               }
            } else {
               damage = 1;
               if (MapService.gI().isMapPhoBan(this.zone.map.mapId)) {
                  damage = 10;
               }
            }
            if (!isBoss) {
               PlayerService.gI().sendInfoHpMpMoney(this);
            }
         }
         damage = Math.min(damage, 2147483647);
         if (isMobAttack && this.charms.tdBatTu > System.currentTimeMillis() && damage >= this.nPoint.hp) {
            damage = this.nPoint.hp - 1;
         }
         if (this.zone.map.mapId == 129) {
            if (damage >= this.nPoint.hp) {
               this.lostByDeath = true;
               The23rdMartialArtCongress mc = The23rdMartialArtCongressManager.gI().getMC(zone);
               if (mc != null) {
                  mc.die();
               }
               return 0;
            }
         }
         if (this.zone.map.mapId == 51) {
            this.totalDamageTaken += damage;
         }
         this.nPoint.subHP(damage);
         if ((plAtt != null || isMobAttack) && isDie() && !isBoss && !isNewPet && !isNewPet1) {
            if (plAtt != null && this.isPl()) {
               // TaskService.gI().checkDoneTaskPK(plAtt);
               if (this.idMark != null && this.idMark.isHoldBlackBall()) {
               }
            }
            // TaskService.gI().checkDoneTaskNRSD(plAtt);
            if (Util.isTrue(this.nPoint.tlBom, 100)) {
               setBom(plAtt);
            } else {
               setDie(plAtt);
            }
         }
         return (int) damage;
      } else {
         return 0;
      }
   }

   public void setTemporaryEnemies(Player pl) {
      if (!temporaryEnemies.contains(pl)) {
         temporaryEnemies.add(pl);
      }
   }

   protected void setBom(Player plAtt) {
      setDie(plAtt);
   }

   public void setDie() {
      this.setDie(null);
   }

   protected void setDie(Player plAtt) {
      boolean isPK = (plAtt != null
            && (plAtt.isPl() || (plAtt.isPet && ((Pet) plAtt).master != null && ((Pet) plAtt).master.isPl())))
            || this.pvp != null
            || (plAtt != null && plAtt.isBoss);
      this.isKilledByMob = !isPK && this.isPl();

      // ===== RƠI CỤC VÀNG LỚN KHI CHẾT (KHÔNG ÁP DỤNG KHI PK) =====
      if (!isPK && this.isPl() && this.inventory != null && this.zone != null && this.zone.map.mapId != 51
            && this.zone.map.mapId != 140) {
         long currentGold = this.inventory.gold;
         long minGoldToDrop = 100000L; // Dưới 100k vàng sẽ không rơi
         if (currentGold >= minGoldToDrop) {
            long minDrop;
            long maxDrop;
            if (currentGold >= 100000000L) { // Đại gia (từ 100 Tr đến 2 Tỷ vàng)
               minDrop = 1000000L; // Rơi ngẫu nhiên trong khoảng 1.000.000 đến 5.000.000 vàng
               maxDrop = 5000000L;
            } else if (currentGold >= 10000000L) { // Khá giả (10 Tr đến 100 Tr vàng)
               minDrop = 200000L;
               maxDrop = Math.min(2500000L, (long) (currentGold * 0.04));
            } else if (currentGold >= 1000000L) { // Trung cấp (1 Tr đến 10 Tr vàng)
               minDrop = 30000L;
               maxDrop = Math.min(500000L, (long) (currentGold * 0.05));
            } else { // Tân thủ (100k đến 1 Tr vàng)
               minDrop = 10000L;
               maxDrop = Math.min(50000L, (long) (currentGold * 0.05));
            }

            if (minDrop > maxDrop) {
               minDrop = maxDrop / 2;
            }
            if (minDrop < 10000L) {
               minDrop = 10000L;
            }
            if (maxDrop > 5000000L) {
               maxDrop = 5000000L;
            }

            long goldDrop = Util.nextInt((int) minDrop, (int) maxDrop);
            goldDrop = (goldDrop / 1000L) * 1000L; // Làm tròn theo hàng nghìn

            if (currentGold >= goldDrop && goldDrop > 0) {
               this.inventory.gold -= goldDrop;
               Service.gI().sendMoney(this);

               int dropX = this.location.x;
               int dropY = this.zone.map.yPhysicInTop(this.location.x, this.location.y);

               ItemMap itemMap = new ItemMap(this.zone, 190, (int) goldDrop, dropX, dropY, -1);
               Service.gI().dropItemMap(this.zone, itemMap);
               Service.gI().sendThongBao(this,
                     "Bạn bị quái hạ gục và làm rơi " + Util.formatNumber(goldDrop) + " vàng!");
            }
         }
      }
      if (this.effectSkin.xHPKI > 1) {
         this.effectSkin.xHPKI = 1;
         Service.gI().point(this);
      }
      if (this.effectSkin.xDame > 1) {
         this.effectSkin.xDame = 1;
         Service.gI().point(this);
      }
      this.playerSkill.prepareQCKK = false;
      this.playerSkill.prepareLaze = false;
      this.playerSkill.prepareTuSat = false;
      this.effectSkill.removeSkillEffectWhenDie();
      nPoint.setHp(0);
      nPoint.setMp(0);
      if (this.mobMe != null) {
         this.mobMe.mobMeDie();
         this.mobMe.dispose();
         this.mobMe = null;
      }
      Service.gI().charDie(this);
      if (!this.isPet && !this.isBot && !this.isNewPet && !this.isNewPet1 && !this.isBoss && plAtt != null
            && !plAtt.isPet && !plAtt.isNewPet && !plAtt.isNewPet1 && !plAtt.isBoss) {
         if (!plAtt.itemTime.isUseAnDanh) {
            FriendAndEnemyService.gI().addEnemy(this, plAtt);
         }
      }
      this.typePk = 0;
      if (this.pvp != null && this.zone.map.mapId != 140) {
         this.pvp.lose(this, TYPE_LOSE_PVP.DEAD);
      }
      BlackBallWarService.gI().dropBlackBall(this);
      NgocRongNamecService.gI().dropNamekBall(this);
   }

   public void reducePowerOnReturnHome() {
      if (!this.isKilledByMob || !this.isPl() || this.nPoint == null) {
         this.isKilledByMob = false;
         return;
      }
      this.isKilledByMob = false;

      long currentPower = this.nPoint.power;
      if (currentPower < 1500000L) {
         return; // Bảo vệ tân thủ (< 1.5 triệu sức mạnh không bị trừ)
      }

      long powerLost = (long) (currentPower * 0.05); // Giảm 5% sức mạnh hiện tại (không giới hạn trần)

      if (currentPower - powerLost < 1500000L) {
         powerLost = currentPower - 1500000L;
      }

      if (powerLost > 0) {
         this.nPoint.power -= powerLost;
         if (this.clanMember != null) {
            this.clanMember.powerPoint = this.nPoint.power;
         }
          Service.gI().point(this);
          Service.gI().player(this);
          Service.gI().Send_Caitrang(this);
          Service.gI().sendThongBao(this,
                "Bị quái hạ gục và quay về nhà, bạn bị giảm " + Util.formatNumber(powerLost) + " sức mạnh (-5%)!");
      }
   }

   public void setClanMember() {
      if (this.clanMember != null) {
         this.clanMember.powerPoint = this.nPoint.power;
         this.clanMember.head = this.getHead();
         this.clanMember.body = this.getBody();
         this.clanMember.leg = this.getLeg();
      }
   }

   public boolean isAdmin() {
      return this.session != null && this.session.isAdmin;
   }

   public void setJustRevivaled() {
      this.justRevived = true;
      this.lastTimeRevived = System.currentTimeMillis();
   }

   public boolean isActive() {
      return (this.isPl() && this.session != null && this.session.actived)
            || (this.isPet && ((Pet) this).master.session != null && ((Pet) this).master.session.actived);
   }

   public void sendNewPet() {
      if (isPl() && inventory != null) {
         Item it = null;
         if (inventory.itemsBody.size() > 7 && inventory.itemsBody.get(7) != null && inventory.itemsBody.get(7).isNotNullItem()) {
            it = inventory.itemsBody.get(7);
         } else if (inventory.itemsBody.size() > 9 && inventory.itemsBody.get(9) != null && inventory.itemsBody.get(9).isNotNullItem()) {
            it = inventory.itemsBody.get(9);
         }
         if (it != null && it.isNotNullItem() && newPet == null) {
            UseItem.gI().showPet(this, it);
            Service.gI().point(this);
         }
      }
   }

   private void fixBlackBallWar() {
      int x = this.location.x;
      int y = this.location.y;
      switch (this.zone.map.mapId) {
         case 85, 86, 87, 88, 89, 90, 91 -> {
            if (this.isPl()) {
               if (x < 24 || x > this.zone.map.mapWidth - 24 || y < 0 || y > this.zone.map.mapHeight - 24) {
                  if (MapService.gI().getWaypointPlayerIn(this) == null) {
                     Service.gI().resetPoint(this, x, this.zone.map.yPhysicInTop(this.location.x, 100));
                     this.nPoint.hp -= this.nPoint.hpMax / 10;
                     PlayerService.gI().sendInfoHp(this);
                     return;
                  }
               }
               int yTop = this.zone.map.yPhysicInTop(this.location.x, this.location.y);
               if (yTop >= this.zone.map.mapHeight - 24) {
                  Service.gI().resetPoint(this, x, this.zone.map.yPhysicInTop(this.location.x, 100));
                  this.nPoint.hp -= this.nPoint.hpMax / 10;
                  PlayerService.gI().sendInfoHp(this);
               }
            }
         }
      }
   }

   public void move(int _toX, int _toY) {
      if (_toX != this.location.x) {
         this.location.x = _toX;
      }
      if (_toY != this.location.y) {
         this.location.y = _toY;
      }
      MapService.gI().sendPlayerMove(this);
   }

   public long getDuaHauStartTime() {
      return duaHauStartTime;
   }

   public void setDuaHauStartTime(long duaHauStartTime) {
      this.duaHauStartTime = duaHauStartTime;
   }

   public void dispose() {
      if (itemsTradeWVP != null) {
         if (!itemsTradeWVP.isEmpty()) {
            for (Item item : itemsTradeWVP) {
               InventoryService.gI().addItemBag(this, item);
            }
         }
         itemsTradeWVP.clear();
         itemsTradeWVP = null;
      }
      if (pet != null) {
         pet.dispose();
         pet = null;
      }
      if (newPet != null) {
         newPet.dispose();
         newPet = null;
      }
      if (mapBlackBall != null) {
         mapBlackBall.clear();
         mapBlackBall = null;
      }
      zone = null;
      mapBeforeCapsule = null;
      if (mapMaBu != null) {
         mapMaBu.clear();
         mapMaBu = null;
      }
      mapBeforeCapsule = null;
      if (mapCapsule != null) {
         mapCapsule.clear();
         mapCapsule = null;
      }
      if (mobMe != null) {
         mobMe.dispose();
         mobMe = null;
      }
      location = null;
      if (setClothes != null) {
         setClothes.dispose();
         setClothes = null;
      }
      if (effectSkill != null) {
         effectSkill.dispose();
         effectSkill = null;
      }
      if (mabuEgg != null) {
         mabuEgg.dispose();
         mabuEgg = null;
      }
      if (DuaHauEgg != null) {
         DuaHauEgg.dispose();
         DuaHauEgg = null;
      }
      if (playerTask != null) {
         playerTask.dispose();
         playerTask = null;
      }
      if (itemTime != null) {
         itemTime.dispose();
         itemTime = null;
      }
      if (fusion != null) {
         fusion.dispose();
         fusion = null;
      }
      if (magicTree != null) {
         magicTree.dispose();
         magicTree = null;
      }
      if (playerIntrinsic != null) {
         playerIntrinsic.dispose();
         playerIntrinsic = null;
      }
      if (inventory != null) {
         inventory.dispose();
         inventory = null;
      }
      if (playerSkill != null) {
         playerSkill.dispose();
         playerSkill = null;
      }
      if (combineNew != null) {
         combineNew.dispose();
         combineNew = null;
      }
      if (idMark != null) {
         idMark.dispose();
         idMark = null;
      }
      if (charms != null) {
         charms.dispose();
         charms = null;
      }
      if (effectSkin != null) {
         effectSkin.dispose();
         effectSkin = null;
      }
      if (nPoint != null) {
         nPoint.dispose();
         nPoint = null;
      }
      if (rewardBlackBall != null) {
         rewardBlackBall.dispose();
         rewardBlackBall = null;
      }
      if (pvp != null) {
         pvp.dispose();
         pvp = null;
      }
      if (superRank != null) {
         superRank.dispose();
         superRank = null;
      }
      if (dropItem != null) {
         dropItem.dispose();
         dropItem = null;
      }
      if (satellite != null) {
         satellite = null;
      }
      if (achievement != null) {
         achievement.dispose();
         achievement = null;
      }
      if (giftCode != null) {
         giftCode.dispose();
         giftCode = null;
      }
      if (traning != null) {
         traning = null;
      }
      if (mapCapsule != null) {
         mapCapsule.clear();
         mapCapsule = null;
      }
      if (Cards != null) {
         Cards.clear();
         Cards = null;
      }
      if (itemsWoodChest != null) {
         itemsWoodChest.clear();
         itemsWoodChest = null;
      }
      if (friends != null) {
         friends.clear();
         friends = null;
      }
      if (enemies != null) {
         enemies.clear();
         enemies = null;
      }
      if (temporaryEnemies != null) {
         temporaryEnemies.clear();
         temporaryEnemies = null;
      }
      itemsWoodChest = null;
      Cards = null;
      itemEvent = null;
      maBu2H = null;
      maBuHold = null;
      zoneSieuThanhThuy = null;
      thongBaoTapTuDong = null;
      notify = null;
      clan = null;
      clanMember = null;
      friends = null;
      enemies = null;
      session = null;
      newSkill = null;
      name = null;
      textThongBaoChangeMap = null;
      textThongBaoThua = null;
   }

   public String getLastChatMessage() {
      return lastChatMessage; // Trả vá» tin nhắn cuối cùng
   }

   public void setLastChatMessage(String message) {
      this.lastChatMessage = message; // Cập nhật tin nhắn cuối cùng
   }

   public boolean hasEffect(Player player, int effectId) {
      Long effectEndTime = player.activeEffects.get(effectId);
      return effectEndTime != null && System.currentTimeMillis() < effectEndTime;
   }

   public void spreadEffectToNearbyPlayers() {
      if (hasEffect(this, 7143)) {
         try {
            List<Player> playersMap = this.zone.getNotBosses();
            for (Player targetPlayer : playersMap) {
               if (targetPlayer != null && !targetPlayer.isDie() && targetPlayer != this
                     && !hasEffect(targetPlayer, 7143) && Util.getDistance(this, targetPlayer) <= 200) {
                  long effectDuration = 10000; // Hiệu ứng kéo dài 10 giây
                  long effectEndTime = System.currentTimeMillis() + effectDuration;
                  targetPlayer.activeEffects.put(7143, effectEndTime);
                  ItemTimeService.gI().sendItemTime(targetPlayer, 7143, (int) (effectDuration / 1000));
                  Service.gI().chat(targetPlayer, "Bạn đã bị lây hiệu ứng từ " + this.name + "!");
                  System.out.println("[DEBUG] Hiệu ứng lan sang: " + targetPlayer.name);
               }
            }
         } catch (Exception e) {
            e.printStackTrace();
         }
      } else {
         System.out.println("[DEBUG] Không có hiệu ứng 7143, không lan ra cho người chơi khác.");
      }
   }

   public long lastTimeSendTextTime;

   public void sendTextTimeDaiLyGift() {
      if (Util.canDoWithTime(lastTimeSendTextTime, 300000)) {
         if (DailyGiftService.checkDailyGift(this, ConstDailyGift.NHAN_BUA_MIEN_PHI)) {
            ItemTimeService.gI().sendTextTime(this, itemTime.TEXT_NHAN_BUA_MIEN_PHI,
                  "Nhận ngẫu nhiên bùa 1h mỗi ngày tại Bà Hạt Mít ở vách núi", 30);
         }
         lastTimeSendTextTime = System.currentTimeMillis();
      }
   }

   public Player(String name) {
      this.name = name;
      this.originalName = name;
   }

   public void setName(String newName) {
      this.name = newName;
   }

   public void resetName() {
      if (originalName == null) {
         return;
      }
      this.name = this.originalName;
   }

   public boolean isMabuPet(Player player) {
      return player.pet != null && player.pet.typePet == 1;
   }

   @java.lang.SuppressWarnings("all")
   public void setSession(final MySession session) {
      this.session = session;
   }

   @java.lang.SuppressWarnings("all")
   public MySession getSession() {
      return this.session;
   }
}
