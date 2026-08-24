package nro.models.map.phoban;

import nro.models.utils.Functions;
import nro.models.boss.Boss;
import nro.models.boss.doanh_trai.NinjaAoTim;
import nro.models.boss.doanh_trai.RobotVeSi;
import nro.models.boss.doanh_trai.TrungUyThep;
import nro.models.boss.doanh_trai.TrungUyTrang;
import nro.models.boss.doanh_trai.TrungUyXanhLo;
import nro.models.clan.Clan;
import nro.models.map.Zone;
import nro.models.mob.Mob;
import nro.models.player.Player;
import nro.models.map.service.ChangeMapService;
import java.util.ArrayList;
import java.util.List;
import nro.models.map.ItemMap;
import nro.models.server.Maintenance;
import nro.models.map.service.ItemMapService;
import nro.models.services.ItemTimeService;
import nro.models.map.service.MapService;
import nro.models.services.Service;
import nro.models.utils.Util;

public class RedRibbonHQ implements Runnable {
  //bang há»™i Ä‘á»§ sá»‘ ngÆ°á»i má»›i Ä‘c má»Ÿ
  public static final int N_PLAYER_CLAN = 3;
  //sá»‘ ngÆ°á»i Ä‘á»©ng cÃ¹ng khu
  public static final int N_PLAYER_MAP = 1;
  public static final int AVAILABLE = 5;
  public static final int TIME_DOANH_TRAI = 1800000;
  public static final int TIME_PICK_DOANH_TRAI = 300000;
  public int id;
  public final List<Zone> zones;
  private Clan clan;
  private long lastTimeOpen;
  public boolean isOpened;
  public boolean isTimePicking;
  public long lastTimePick;
  public boolean winDT;
  public List<Boss> bosses = new ArrayList<>();

  public RedRibbonHQ(int id) {
    this.id = id;
    this.zones = new ArrayList<>();
  }

  public void addZone(Zone zone) {
    this.zones.add(zone);
  }

  public Zone getMapById(int mapId) {
    for (Zone zone : this.zones) {
      if (zone.map.mapId == mapId) {
        return zone;
      }
    }
    return null;
  }

  @Override
  public void run() {
    while (!Maintenance.isRunning && isOpened) {
      try {
        long startTime = System.currentTimeMillis();
        update();
        Functions.sleep(Math.max(150 - (System.currentTimeMillis() - startTime), 10));
      } catch (Exception e) {
        e.printStackTrace();
      }
    }
  }

  public void openDoanhTrai(Player player) {
    // âŒ KhÃ´ng cÃ³ bang
    if (player == null || player.clan == null) {
      return;
    }
    long now = System.currentTimeMillis();
    // âŒ ÄÃƒ ÄI DOANH TRáº I Rá»’I (cháº·n Ä‘á»•i PT)
    if (player.lastTimeDoanhTrai > 0 && Util.canDoWithTime(player.lastTimeDoanhTrai, TIME_DOANH_TRAI)) {
      Service.gI().sendThongBao(player, "Hôm nay bạn đã đi Doanh Trại rồi");
      return;
    }
    // âŒ Bang Ä‘Ã£ má»Ÿ / Ä‘ang tá»“n táº¡i DT
    if (player.clan.doanhTrai != null) {
      String name = "một thành viên";
      if (player.clan.playerOpenDoanhTrai != null) {
        name = player.clan.playerOpenDoanhTrai.name;
      }
      Service.gI().sendThongBao(player, "Doanh trại đã được mở bởi " + name);
      return;
    }
    // âŒ Bang vá»«a Ä‘i DT xong
    if (player.clan.haveGoneDoanhTrai) {
      Service.gI().sendThongBao(player, "Doanh trại đã kết thúc, hãy chờ lần sau");
      return;
    }
    // âœ… GHI NHáº¬N THá»œI ÄIá»‚M ÄI DT (CHá»ˆ GHI 1 Láº¦N)
    try {
      this.lastTimeOpen = System.currentTimeMillis();
      this.clan = player.clan;
      player.clan.doanhTrai = this;
      player.clan.playerOpenDoanhTrai = player;
      player.clan.lastTimeOpenDoanhTrai = this.lastTimeOpen;
      player.clan.haveGoneDoanhTrai = false;
      sendTextDoanhTrai();
      //Khá»Ÿi táº¡o quÃ¡i, boss
      this.isOpened = true;
      this.init();
    } catch (Exception e) {
      e.printStackTrace();
      player.clan.lastTimeOpenDoanhTrai = 0;
      player.clan.haveGoneDoanhTrai = false;
      this.dispose();
      return;
    }
    List<Player> plJoinDT = new ArrayList();
    //ÄÆ°a thÃ nh viÃªn vÃ o doanh tráº¡i
    for (Player pl : player.zone.getPlayers()) {
      if (pl != null && !pl.equals(player) && pl.clan != null && pl.clan.equals(player.clan) && pl.location.x >= 1285 && pl.location.x <= 1645) {
        plJoinDT.add(pl);
      }
    }
    for (Player pl : plJoinDT) {
      if (pl.isDie()) {
        continue;
      }
      // âœ… CHá»ˆ LÃšC NÃ€Y Má»šI TÃNH LÃ€ ÄÃƒ ÄI DOANH TRáº I
      pl.lastTimeDoanhTrai = System.currentTimeMillis();
      pl.lastTimeJoinDT = System.currentTimeMillis();
      ChangeMapService.gI().changeMapInYard(pl, 53, -1, 60);
    }
    player.lastTimeDoanhTrai = System.currentTimeMillis();
    player.lastTimeJoinDT = System.currentTimeMillis();
    ChangeMapService.gI().changeMapInYard(player, 53, -1, 60);
  }

  private void init() {
    long totalDamage = 0;
    long totalHp = 0;
    for (Player player : this.clan.membersInGame) {
      if (player != null && player.nPoint != null) {
        totalDamage += player.nPoint.dame;
        totalHp += player.nPoint.hpMax;
      }
    }
    // Há»“i sinh quÃ¡i
    for (Zone zone : this.zones) {
      for (Mob mob : zone.mobs) {
        long mobTempId = mob.tempId;
        mob.point.dame = (int) ((mobTempId != 0) ? Math.min(totalHp / mobTempId, 2147483647L) : 0);
        mob.point.maxHp = (int) ((mobTempId != 0) ? Math.min(totalDamage * mobTempId, 2147483647) : 0);
        mob.lvMob = 0;
        mob.hoiSinh();
        mob.hoiSinhMobPhoBan();
      }
      long dame = totalHp / 20;
      long hp = totalDamage * 50;
      if (zone.map.mapId == 59) {
        try {
          long bossDamage = Math.min(dame, 200000000L);
          long bossMaxHealth = Math.min(hp, 2147483647L);
          bosses.add(new TrungUyTrang(zone, (int) bossDamage, (int) bossMaxHealth));
        } catch (Exception e) {
        }
      }
      if (zone.map.mapId == 62) {
        try {
          long bossDamage = Math.min((long) (dame * 1.1), 200000000L);
          long bossMaxHealth = Math.min((long) (hp * 1.1), 2147483647);
          bosses.add(new TrungUyXanhLo(zone, (int) bossDamage, (int) bossMaxHealth));
        } catch (Exception e) {
        }
      }
      if (zone.map.mapId == 55) {
        try {
          long bossDamage = Math.min((long) (dame * 1.15), 200000000L);
          long bossMaxHealth = Math.min((long) (hp * 1.15), 2147483647L);
          bosses.add(new TrungUyThep(zone, (int) bossDamage, (int) bossMaxHealth));
        } catch (Exception e) {
        }
      }
      if (zone.map.mapId == 54) {
        try {
          long bossDamage = Math.min((long) (dame * 1.2), 200000000L);
          long bossMaxHealth = Math.min((long) (hp * 1.2), 2147483647);
          bosses.add(new NinjaAoTim(zone, clan, (int) bossDamage, (int) bossMaxHealth));
        } catch (Exception e) {
        }
      }
      if (zone.map.mapId == 57) {
        try {
          long bossDamage = Math.min((long) (dame * 1.3), 200000000L);
          long bossMaxHealth = Math.min((long) (hp * 1.3), 2147483647);
          for (int i = 0; i < 4; i++) {
            bosses.add(new RobotVeSi(zone, i, (int) bossDamage, (int) bossMaxHealth));
          }
        } catch (Exception e) {
        }
      }
    }
    new Thread(this, "Doanh Trại: " + this.clan.name).start();
  }

  public void update() {
    // 1ï¸âƒ£ Náº¿u Ä‘ang má»Ÿ vÃ  CHÆ¯A vÃ o giai Ä‘oáº¡n nháº·t
    if (isOpened && !isTimePicking) {
      // Háº¿t thá»i gian Ä‘Ã¡nh
      if (Util.canDoWithTime(lastTimeOpen, TIME_DOANH_TRAI)) {
        // \ud83d\udd12 ÄÃ“NG DOANH TRáº I TRÆ¯á»šC
        isOpened = false;
        isTimePicking = false;
        winDT = false;
        finish();
        dispose();
        return;
      }
      // Check boss + quÃ¡i cháº¿t
      boolean allDead = true;
      for (Zone zone : zones) {
        for (Mob mob : zone.mobs) {
          if (!mob.isDie()) {
            allDead = false;
            break;
          }
        }
        if (allDead) {
          for (Player boss : zone.getBosses()) {
            if (!boss.isDie()) {
              allDead = false;
              break;
            }
          }
        }
        if (!allDead) {
          break;
        }
      }
      // Boss cháº¿t â†’ chá» NPC
      if (allDead && !winDT) {
        winDT = true;
        for (Zone zone : zones) {
          for (Player pl : zone.getPlayers()) {
            Service.gI().sendThongBao(pl, "Mau đi tìm Độc Nhãn");
          }
        }
      }
      return;
    }
    // 2ï¸âƒ£ Äang trong 5 phÃºt nháº·t ngá»c
    if (isOpened && isTimePicking) {
      if (Util.canDoWithTime(lastTimePick, TIME_PICK_DOANH_TRAI)) {
        // \ud83d\udd12 ÄÃ“NG DOANH TRáº I TRÆ¯á»šC
        isOpened = false;
        isTimePicking = false;
        winDT = false;
        finish();
        dispose();
      }
    }
  }

  public ItemMap NR(Zone zone) {
    int x = Util.nextInt(100, zone.map.mapWidth - 100);
    int y = zone.map.yPhysicInTop(x, 100);
    int nr = Util.isTrue(1, 500) ? Util.nextInt(14, 18) : Util.nextInt(18, 20);
    ItemMap it = new ItemMap(zone, nr, 1, x, y, -1);
    return it;
  }

  public void randomNR() {
    for (Zone zone : zones) {
      Service.gI().dropItemMap(zone, NR(zone));
      Service.gI().dropItemMap(zone, NR(zone));
      Service.gI().dropItemMap(zone, NR(zone));
      if (Util.isTrue(1, 2)) {
        Service.gI().dropItemMap(zone, NR(zone));
      }
      if (Util.isTrue(1, 3)) {
        Service.gI().dropItemMap(zone, NR(zone));
      }
      if (Util.isTrue(1, 4)) {
        Service.gI().dropItemMap(zone, NR(zone));
      }
      if (Util.isTrue(1, 5)) {
        Service.gI().dropItemMap(zone, NR(zone));
      }
    }
  }

  public void finish() {
    for (Zone zone : zones) {
      for (int i = zone.getPlayers().size() - 1; i >= 0; i--) {
        if (i < zone.getPlayers().size()) {
          Player pl = zone.getPlayers().get(i);
          kickOutOfDT(pl);
        }
      }
    }
  }

  private void kickOutOfDT(Player player) {
    if (MapService.gI().isMapDoanhTrai(player.zone.map.mapId)) {
      Service.gI().sendThongBao(player, "Đã hết thời gian, bạn sẽ được đưa về nhà");
      ChangeMapService.gI().changeMapBySpaceShip(player, 21 + player.gender, -1, -1);
    }
  }

  private void sendTextDoanhTrai() {
    for (Player pl : this.clan.membersInGame) {
      ItemTimeService.gI().sendTextDoanhTrai(pl);
    }
  }

  public void sendTextTimePickDoanhTrai() {
    for (Player pl : this.clan.membersInGame) {
      ItemTimeService.gI().sendTextTimePickDoanhTrai(pl);
    }
  }

  private void removeTextDoanhTrai() {
    for (Player pl : this.clan.membersInGame) {
      ItemTimeService.gI().removeTextDoanhTrai(pl);
    }
  }

  public void updateHPDame() {
    long totalDame = 0;
    long totalHp = 0;
    for (Player pl : this.clan.membersInGame) {
      if (pl != null && pl.nPoint != null) {
        totalDame += pl.nPoint.dame;
        totalHp += pl.nPoint.hpMax;
      }
    }
    //update hp dame quÃ¡i
    for (Zone zone : this.zones) {
      for (Mob mob : zone.mobs) {
        if (mob.isDie()) {
          continue;
        }
        mob.point.dame = (int) (totalHp / mob.tempId < 2147483647 ? totalHp / mob.tempId : 2147483647);
        mob.point.maxHp = (int) (totalDame / 3 * mob.tempId < 2147483647 ? totalDame * mob.tempId : 2147483647);
        mob.point.hp = mob.point.maxHp;
        mob.setTiemNang();
      }
    }
    long dame = totalHp / 20;
    long hp = totalDame * 50;
    for (Boss boss : bosses) {
      if (boss == null || boss.isDie() || boss.zone == null || boss.zone.map == null) {
        continue;
      }
      if (boss.zone.map.mapId == 59) {
        try {
          long bossDamage = (dame);
          long bossMaxHealth = (hp);
          bossDamage = Math.min(bossDamage, 200000000L);
          bossMaxHealth = Math.min(bossMaxHealth, 2000000000L);
          boss.nPoint.hpMax = (int) bossMaxHealth;
          boss.nPoint.dame = (int) bossDamage;
          boss.nPoint.hp = boss.nPoint.hpMax;
        } catch (Exception exception) {
        }
      }
      if (boss.zone.map.mapId == 62) {
        try {
          long bossDamage = (long) (dame * 1.1);
          long bossMaxHealth = (long) (hp * 1.1);
          bossDamage = Math.min(bossDamage, 200000000L);
          bossMaxHealth = Math.min(bossMaxHealth, 2000000000L);
          boss.nPoint.hpMax = (int) bossMaxHealth;
          boss.nPoint.dame = (int) bossDamage;
          boss.nPoint.hp = boss.nPoint.hpMax;
        } catch (Exception exception) {
        }
      }
      if (boss.zone.map.mapId == 55) {
        try {
          long bossDamage = (long) (dame * 1.15);
          long bossMaxHealth = (long) (hp * 1.15);
          bossDamage = Math.min(bossDamage, 200000000L);
          bossMaxHealth = Math.min(bossMaxHealth, 2000000000L);
          boss.nPoint.hpMax = (int) bossMaxHealth;
          boss.nPoint.dame = (int) bossDamage;
          boss.nPoint.hp = boss.nPoint.hpMax;
        } catch (Exception exception) {
        }
      }
      if (boss.zone.map.mapId == 54) {
        try {
          long bossDamage = (long) (dame * 1.2);
          long bossMaxHealth = (long) (hp * 1.2);
          bossDamage = Math.min(bossDamage, 200000000L);
          bossMaxHealth = Math.min(bossMaxHealth, 2000000000L);
          if (boss.id >= -14 && boss.id <= -9) {
            bossDamage /= 10;
            bossMaxHealth /= 10;
          }
          boss.nPoint.hpMax = (int) bossMaxHealth;
          boss.nPoint.dame = (int) bossDamage;
          boss.nPoint.hp = boss.nPoint.hpMax;
        } catch (Exception exception) {
        }
      }
      if (boss.zone.map.mapId == 57) {
        try {
          long bossDamage = (long) (dame * 1.3);
          long bossMaxHealth = (long) (hp * 1.3);
          bossDamage = Math.min(bossDamage, 200000000L);
          bossMaxHealth = Math.min(bossMaxHealth, 2000000000L);
          boss.nPoint.hpMax = (int) bossMaxHealth;
          boss.nPoint.dame = (int) bossDamage;
          boss.nPoint.hp = boss.nPoint.hpMax;
        } catch (Exception exception) {
        }
      }
    }
  }

  private void dispose() {
    removeTextDoanhTrai();
    for (Boss boss : bosses) {
      if (boss != null && boss.zone != null) {
        boss.leaveMap();
      }
    }
    for (Zone zone : zones) {
      for (int i = zone.items.size() - 1; i >= 0; i--) {
        ItemMapService.gI().removeItemMap(zone.items.get(i));
      }
    }
    bosses.clear();
    winDT = false;
    isOpened = false;
    isTimePicking = false;
    if (clan != null) {
      clan.haveGoneDoanhTrai = true;
      clan.doanhTrai = null;
    }
    clan = null;
  }

  @java.lang.SuppressWarnings("all")
  public int getId() {
    return this.id;
  }

  @java.lang.SuppressWarnings("all")
  public List<Zone> getZones() {
    return this.zones;
  }

  @java.lang.SuppressWarnings("all")
  public Clan getClan() {
    return this.clan;
  }

  @java.lang.SuppressWarnings("all")
  public long getLastTimeOpen() {
    return this.lastTimeOpen;
  }

  @java.lang.SuppressWarnings("all")
  public boolean isOpened() {
    return this.isOpened;
  }

  @java.lang.SuppressWarnings("all")
  public boolean isTimePicking() {
    return this.isTimePicking;
  }

  @java.lang.SuppressWarnings("all")
  public long getLastTimePick() {
    return this.lastTimePick;
  }

  @java.lang.SuppressWarnings("all")
  public boolean isWinDT() {
    return this.winDT;
  }

  @java.lang.SuppressWarnings("all")
  public List<Boss> getBosses() {
    return this.bosses;
  }

  @java.lang.SuppressWarnings("all")
  public void setId(final int id) {
    this.id = id;
  }

  @java.lang.SuppressWarnings("all")
  public void setClan(final Clan clan) {
    this.clan = clan;
  }

  @java.lang.SuppressWarnings("all")
  public void setLastTimeOpen(final long lastTimeOpen) {
    this.lastTimeOpen = lastTimeOpen;
  }

  @java.lang.SuppressWarnings("all")
  public void setOpened(final boolean isOpened) {
    this.isOpened = isOpened;
  }

  @java.lang.SuppressWarnings("all")
  public void setTimePicking(final boolean isTimePicking) {
    this.isTimePicking = isTimePicking;
  }

  @java.lang.SuppressWarnings("all")
  public void setLastTimePick(final long lastTimePick) {
    this.lastTimePick = lastTimePick;
  }

  @java.lang.SuppressWarnings("all")
  public void setWinDT(final boolean winDT) {
    this.winDT = winDT;
  }

  @java.lang.SuppressWarnings("all")
  public void setBosses(final List<Boss> bosses) {
    this.bosses = bosses;
  }

  @java.lang.Override
  @java.lang.SuppressWarnings("all")
  public boolean equals(final java.lang.Object o) {
    if (o == this) return true;
    if (!(o instanceof RedRibbonHQ)) return false;
    final RedRibbonHQ other = (RedRibbonHQ) o;
    if (!other.canEqual((java.lang.Object) this)) return false;
    if (this.getId() != other.getId()) return false;
    if (this.getLastTimeOpen() != other.getLastTimeOpen()) return false;
    if (this.isOpened() != other.isOpened()) return false;
    if (this.isTimePicking() != other.isTimePicking()) return false;
    if (this.getLastTimePick() != other.getLastTimePick()) return false;
    if (this.isWinDT() != other.isWinDT()) return false;
    final java.lang.Object this$zones = this.getZones();
    final java.lang.Object other$zones = other.getZones();
    if (this$zones == null ? other$zones != null : !this$zones.equals(other$zones)) return false;
    final java.lang.Object this$clan = this.getClan();
    final java.lang.Object other$clan = other.getClan();
    if (this$clan == null ? other$clan != null : !this$clan.equals(other$clan)) return false;
    final java.lang.Object this$bosses = this.getBosses();
    final java.lang.Object other$bosses = other.getBosses();
    if (this$bosses == null ? other$bosses != null : !this$bosses.equals(other$bosses)) return false;
    return true;
  }

  @java.lang.SuppressWarnings("all")
  protected boolean canEqual(final java.lang.Object other) {
    return other instanceof RedRibbonHQ;
  }

  @java.lang.Override
  @java.lang.SuppressWarnings("all")
  public int hashCode() {
    final int PRIME = 59;
    int result = 1;
    result = result * PRIME + this.getId();
    final long $lastTimeOpen = this.getLastTimeOpen();
    result = result * PRIME + (int) ($lastTimeOpen >>> 32 ^ $lastTimeOpen);
    result = result * PRIME + (this.isOpened() ? 79 : 97);
    result = result * PRIME + (this.isTimePicking() ? 79 : 97);
    final long $lastTimePick = this.getLastTimePick();
    result = result * PRIME + (int) ($lastTimePick >>> 32 ^ $lastTimePick);
    result = result * PRIME + (this.isWinDT() ? 79 : 97);
    final java.lang.Object $zones = this.getZones();
    result = result * PRIME + ($zones == null ? 43 : $zones.hashCode());
    final java.lang.Object $clan = this.getClan();
    result = result * PRIME + ($clan == null ? 43 : $clan.hashCode());
    final java.lang.Object $bosses = this.getBosses();
    result = result * PRIME + ($bosses == null ? 43 : $bosses.hashCode());
    return result;
  }

  @java.lang.Override
  @java.lang.SuppressWarnings("all")
  public java.lang.String toString() {
    return "RedRibbonHQ(id=" + this.getId() + ", zones=" + this.getZones() + ", clan=" + this.getClan() + ", lastTimeOpen=" + this.getLastTimeOpen() + ", isOpened=" + this.isOpened() + ", isTimePicking=" + this.isTimePicking() + ", lastTimePick=" + this.getLastTimePick() + ", winDT=" + this.isWinDT() + ", bosses=" + this.getBosses() + ")";
  }
}
