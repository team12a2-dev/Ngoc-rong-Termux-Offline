<div align="center">

# Ngọc Rồng Online — Termux Edition

<img src="docs/images/readme-header.jpeg" alt="Ảnh đại diện Ngọc Rồng Online" width="676">

**Game server Java chạy trên Android bằng Termux và MariaDB cục bộ.**

[![Java 17+](https://img.shields.io/badge/Java-17%2B-orange?logo=openjdk)](https://openjdk.org/)
[![Android](https://img.shields.io/badge/Platform-Android-green?logo=android)](https://termux.dev/)
[![LAN Ready](https://img.shields.io/badge/Network-LAN-blue)](TERMUX-LAN.md)
[![GitHub](https://img.shields.io/badge/Source-GitHub-black?logo=github)](https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline)

</div>

> Dự án phù hợp để chạy server trong mạng LAN. Hãy tự kiểm tra quyền sử dụng mã nguồn, dữ liệu game và client trước khi phát hành.

## Mục lục

[**Cài đặt**](#cài-đặt-nhanh) · [**Lệnh**](#lệnh-quản-lý) · [**LAN**](#kết-nối-lan) · [**Chạy nền**](#chạy-độc-lập-khi-đóng-termux) · [**Panel**](#web-panel) · [**Boss**](#cơ-chế-boss) · [**Backup**](#backup-database) · [**Xử lý lỗi**](#xử-lý-lỗi-nhanh)

## Tính năng chính

| Thành phần | Chức năng |
|---|---|
| **Server** | Java 17+, MariaDB local, tự build và kiểm tra trạng thái `READY`. |
| **Boss** | Spawn theo tier, map/khu, thời gian, tỷ lệ và giới hạn động. Broly/Super Broly có cơ chế riêng. |
| **Web panel** | Quản lý boss, player, item, shop, drop map, runtime và audit log. |
| **LAN** | Thiết bị cùng Wi‑Fi kết nối game và mở web panel. |
| **Chạy nền** | Supervisor tách khỏi cửa sổ Termux, tự phục hồi khi server dừng. |
| **Backup** | Backup database thủ công hoặc định kỳ bằng Termux:API. |

## Cài đặt nhanh

Cài **Termux chính thức**, sau đó chạy installer. Installer tải vào file tạm, tự retry và kiểm tra archive trước khi giải nén:

```bash
pkg update -y && pkg install -y curl tar
INSTALLER="$(mktemp)"
curl --http1.1 -fL --retry 5 --retry-all-errors --retry-delay 3 \
  --connect-timeout 20 --max-time 120 -o "$INSTALLER" \
  "https://raw.githubusercontent.com/team12a2-dev/Ngoc-rong-Termux-Offline/main/install-termux.sh" \
  && bash "$INSTALLER"
STATUS=$?
rm -f "$INSTALLER"
exit "$STATUS"
```

Installer sẽ cài project vào `~/ngocrong-termux`. Repository khá lớn, vì vậy hãy giữ Wi‑Fi/4G ổn định và không đóng Termux trong lúc tải. Không pipe trực tiếp archive vào `tar`.

Lệnh setup sẽ cài Java, MariaDB và Node.js nếu thiếu; khởi tạo database; import SQL một lần; build Java và web panel.

Sau khi setup xong, chạy server:

```bash
cd ~/ngocrong-termux
./nro.sh lan
```

## Lệnh quản lý

### Server và LAN

| Lệnh | Chức năng |
|---|---|
| `./nro.sh setup` | Cài dependency, database và build project. |
| `./nro.sh start` | Chạy server theo cấu hình hiện tại. |
| `./nro.sh lan` | Chạy server cho mạng LAN và tự cập nhật IP client. |
| `./nro.sh status` | Xem trạng thái server và panel. |
| `./nro.sh stop` | Dừng game server và panel. |
| `./nro.sh restart` | Restart game server và panel. |
| `./nro.sh console` | Chạy foreground để xem log trực tiếp. |
| `./nro.sh rebuild` | Chỉ build lại Java. |

### Service chạy nền

| Lệnh | Chức năng |
|---|---|
| `./nro.sh background` | Chạy supervisor độc lập với cửa sổ Termux. |
| `./nro.sh background-status` | Xem supervisor, game, MariaDB, panel và endpoint. |
| `./nro.sh background-log` | Xem log supervisor realtime. |
| `./nro.sh background-restart` | Restart service nền. |
| `./nro.sh background-stop` | Dừng service nền an toàn. |

### Backup

| Lệnh | Chức năng |
|---|---|
| `./nro.sh backup` | Backup database ngay. |
| `./nro.sh backup-schedule` | Đặt lịch backup định kỳ. |
| `./nro.sh backup-status` | Xem lịch và file backup. |
| `./nro.sh backup-cancel` | Hủy lịch backup. |

Log nằm trong thư mục `.runtime/`:

```text
server.log       Game server
panel.log        Web panel
mariadb.log      MariaDB
supervisor.log   Service chạy nền
```

## Kết nối LAN

Điện thoại chạy Termux và thiết bị chơi phải cùng Wi‑Fi. Chạy:

```bash
./nro.sh lan
```

Script tự tìm IP Wi‑Fi, cập nhật `server.ip`, bind game trên `0.0.0.0` và in endpoint:

```text
Game endpoint LAN  : 192.168.1.37:14445
Panel URL LAN      : http://192.168.1.37:3001
```

Client game dùng `192.168.1.37:14445`; trình duyệt dùng `http://192.168.1.37:3001`.

Nếu có nhiều interface, chỉ định IP:

```bash
NRO_LAN_IP=192.168.1.37 ./nro.sh lan
```

`server.ip` là IP quảng bá cho client. `server.listen.host=0.0.0.0` là IP bind socket. MariaDB vẫn chỉ bind `127.0.0.1:3306`.

Không mở port game, panel hoặc MariaDB ra Internet. Một số Wi‑Fi có thể bật AP isolation khiến các thiết bị không nhìn thấy nhau.

Xem hướng dẫn LAN chi tiết tại [`TERMUX-LAN.md`](TERMUX-LAN.md).

## Chạy độc lập khi đóng Termux

Muốn đóng cửa sổ Termux nhưng server vẫn chạy:

```bash
./nro.sh background
```

Supervisor dùng PID và log riêng, giữ wake lock, đồng thời tự khởi động lại launcher khi game hoặc panel dừng:

```bash
./nro.sh background-status
./nro.sh background-log
```

Tự chạy sau khi Android reboot:

1. Cài **Termux:Boot** và mở ứng dụng một lần.
2. Chạy lệnh:

```bash
./install-termux-background.sh
```

Sau đó tắt tối ưu pin cho Termux và Termux:Boot. Không chọn **Force stop/Buộc dừng** vì Android có thể dừng toàn bộ tiến trình của ứng dụng.

## Web panel

Panel tự khởi động sau khi game server đạt `READY`:

```text
http://127.0.0.1:3001
http://IP_ANDROID:3001
```

Mật khẩu admin:

```bash
cat .runtime/panel-admin-password
```

| Module | Chức năng |
|---|---|
| **Boss Monitor** | Theo dõi trạng thái, HP, map/khu và spawn kiểm thử. |
| **Boss Management** | Chỉ định boss, map, khu random, tỷ lệ, respawn và item rơi. |
| **Drop theo Map** | Cấu hình vàng, sét và item rơi theo map. |
| **Players** | Xem player online, quản lý nhân vật và kick. |
| **Item/Shop** | Quản lý item template, shop, giftcode và item bổ trợ. |
| **Runtime & Logs** | Xem health, PID, uptime và log runtime. |

Thay đổi qua panel được lưu database, ghi audit log và reload runtime nếu Java Agent đang hoạt động.

## Cơ chế boss

Boss thường dùng scheduler chung với giới hạn theo population, tier, map density, fairness và cooldown.

Broly và Super Broly chỉ spawn trong khoảng **10:00–05:00 hôm sau** theo giờ Việt Nam. Một map có thể có nhiều boss ở các khu khác nhau; một khu chỉ có một boss.

Super Broly có hai nguồn spawn:

1. Kích hoạt khi Broly đạt ngưỡng HP và bị tiêu diệt.
2. Tự roll ngẫu nhiên theo chu kỳ, tỷ lệ và profile động trong cấu hình.

Khoảng min/max Super Broly nằm trong `boss_spawn.properties`; không cần sửa Java khi tinh chỉnh.

## Cấu hình nhanh

File runtime được tạo cục bộ từ template:

```text
Config.properties
boss_spawn.properties
```

Biến môi trường thường dùng:

```bash
NRO_GAME_PORT=14445
NRO_PANEL_PORT=3001
NRO_LAN_IP=192.168.1.37
NRO_GAME_LISTEN_HOST=0.0.0.0
NRO_PANEL_BIND=0.0.0.0
NRO_JVM_OPTS='-Xms128m -Xmx1536m'
```

Không commit `Config.properties`, `.runtime/`, mật khẩu, token hoặc dữ liệu người chơi.

## Backup database

Backup thủ công:

```bash
./nro.sh backup
```

Backup định kỳ:

```bash
pkg install -y termux-api gzip
./nro.sh backup-schedule
```

Android có thể trì hoãn job do tối ưu pin. Nên chép `.runtime/backups/` sang nơi khác và không đưa backup chứa dữ liệu người chơi lên repository public.

## Xử lý lỗi nhanh

| Lỗi | Cách xử lý |
|---|---|
| Không tìm thấy Java | Chạy `pkg search openjdk`, `termux-change-repo`, rồi `./nro.sh setup`. |
| Server chưa `READY` | Xem `tail -n 160 .runtime/server.log` hoặc chạy `./nro.sh console`. |
| Không kết nối LAN | Kiểm tra cùng Wi‑Fi, IP, AP isolation và `ss -ltnp \| grep -E '14445\|3001'`. |
| Panel không chạy | Xem `.runtime/panel.log`, cài Node.js rồi chạy `./nro.sh panel`. |
| Android dừng server | Tắt battery optimization, dùng `./nro.sh background`, cài Termux:Boot. |
| JDBC/collation lỗi | Chạy lại setup để dùng MariaDB Connector/J hiện tại. |
| SQL bị import lại | Không xóa `.runtime/sql-imported.sha256` nếu chưa backup. |

## Cấu trúc chính

```text
src/                         Java source
data/                        Map và game assets
sql/ngocrong.sql             Database schema + dữ liệu mẫu
lib/                         JAR runtime
panel/api/                   Node.js API
panel/web/                   React web panel
Config.properties.example    Cấu hình mẫu
boss_spawn.properties        Cấu hình spawn boss
nro.sh                       Launcher chính
termux-server-service.sh     Supervisor chạy nền
termux-lan-start.sh          Khởi động LAN
install-termux.sh             Installer Termux an toàn
install-termux-background.sh  Cài Termux:Boot
TERMUX-LAN.md                Hướng dẫn LAN chi tiết
```

## Kiểm thử

```bash
bash -n nro.sh termux-lan-start.sh termux-server-service.sh install-termux-background.sh
ant clean compile
cd panel/web && npm run build
cd ../api && node --check src/index.js && node --check src/routes/bossConfig.js
```

Kết quả trong sandbox không thay thế kiểm thử trên từng mẫu điện thoại Android. RAM, CPU, phiên bản Termux, mirror package, Wi‑Fi và chính sách tiết kiệm pin có thể ảnh hưởng kết quả.

## Tài liệu

- [Hướng dẫn LAN và chạy nền](TERMUX-LAN.md)
- [Hướng dẫn vận hành panel](panel/docs/NRO-CONTROL-PANEL.md)
- [Repository GitHub](https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline)
- [Termux:Boot](https://github.com/termux/termux-boot)
- [MariaDB Connector/J](https://mariadb.com/docs/connectors/mariadb-connector-j/about-mariadb-connector-j)
