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

[**Cài đặt**](#cài-đặt-nhanh) · [**Cập nhật nhanh**](#cập-nhật-nhanh-1-dòng-gõ-tay-được) · [**Cập nhật**](#tự-đồng-bộ-source-từ-github) · [**Lệnh**](#lệnh-quản-lý) · [**LAN**](#kết-nối-lan) · [**Chạy nền**](#chạy-độc-lập-khi-đóng-termux) · [**Panel**](#web-panel) · [**Boss**](#cơ-chế-boss) · [**Backup**](#backup-database) · [**Xử lý lỗi**](#xử-lý-lỗi-nhanh)

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

Cài **Termux chính thức**, sau đó dán **một dòng duy nhất** sau đây. Không cần chạy `cd` trước vì thư mục cài đặt chưa tồn tại ở lần đầu:

```bash
pkg update -y && pkg install -y curl tar && mkdir -p "$HOME/.cache/ngocrong-termux" && INSTALLER="$(mktemp "$HOME/.cache/ngocrong-termux/installer.XXXXXX.sh")" && trap 'rm -f "$INSTALLER"' EXIT && curl --http1.1 -fsSL --retry 5 --retry-all-errors --retry-delay 3 --connect-timeout 30 --max-time 7200 -o "$INSTALLER" "https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/raw/refs/heads/main/install-termux.sh" && bash "$INSTALLER"
```

Installer tải **archive source mới nhất từ nhánh GitHub `main`**; không dùng Git, không chia file, không tạo khóa SSH và không xuất hiện `Receiving objects`. File tạm được ghi trong `$HOME/.cache/ngocrong-termux`, không phụ thuộc `/tmp`; installer kiểm tra quyền ghi và dung lượng trước khi tải. Installer bảo toàn `Config.properties`, `.env`, database, `.runtime`, `node_modules` và dữ liệu người chơi.

Project được cài vào `~/ngocrong-termux`. Repository có nhiều tài nguyên game nên vẫn cần Wi‑Fi/4G ổn định; sau khi tải đủ, installer tự giải nén và chạy `./nro.sh setup`. Khi cập nhật, không cần `cd` vào thư mục trước; chỉ chạy lại lệnh bootstrap ở trên.

### Cập nhật nhanh (1 dòng, gõ tay được)

Cài xong rồi mà máy báo không có bản sửa mới, hoặc `check-update` không phản hồi: dán đúng dòng ngắn này vào Termux, không cần `cd`, không cần gõ dài.

```bash
pkg install -y curl tar && bash <(curl -fsSL https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/raw/refs/heads/main/install-termux.sh)
```

Dòng này tải archive `main` mới nhất, ghi đè lên bản cũ nhưng giữ nguyên `Config.properties`, `panel/api/.env`, database và `.runtime`, rồi build lại. Máy Termux cũ không chạy được `<(...)` thì dùng: `curl -fsSL https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/raw/refs/heads/main/install-termux.sh | bash`

Sau khi chạy xong, kiểm tra đã lên bản mới chưa:

```bash
grep -c NRO_FORCE_UPDATE_CHECK=1 ~/ngocrong-termux/nro.sh
```

Kết quả phải là `3`. Nếu vẫn là `0` hoặc `1` thì xem `~/.ngocrong-termux-install.log`, thường do mạng chặn GitHub.

Sau lần cài đầu, không cần chạy installer mỗi khi GitHub có commit mới. Xem [Tự đồng bộ source từ GitHub](#tự-đồng-bộ-source-từ-github) để biết chi tiết.

Lệnh setup sẽ cài Java, MariaDB và Node.js nếu thiếu; khởi tạo database; import SQL một lần; build Java và web panel. Mỗi lần tạo tiến trình game mới, Java được build sạch trước khi chạy; thời gian build được lưu tại `.runtime/build-info` và hiển thị bằng `./nro.sh status`. Khi source có thay đổi, panel chỉ cài lại dependency nếu thiếu hoặc lockfile thay đổi, rồi build React và restart Node để chức năng mới xuất hiện.

Sau khi setup xong, chạy server:

```bash
cd ~/ngocrong-termux
./nro.sh lan
```

## Tự đồng bộ source từ GitHub

Mỗi lần chạy `start`, `lan`, `restart`, `background` hoặc `check-update`, launcher làm đúng ba việc:

1. Hỏi SHA của commit HEAD trên nhánh `main`: ưu tiên `api.github.com/repos/.../commits/main`, nếu endpoint này không trả lời (mạng Termux bị chặn, rate-limit) thì thử feed dự phòng `github.com/.../commits/main.atom`.
2. So SHA đó với marker ở `.runtime/source-commit`. Khác nhau thì tải archive `main.tar.gz`, giữ nguyên `Config.properties`, `.env`, database và `.runtime`, rồi chạy migration, build lại Java/panel và khởi chạy bằng source mới.
3. Ghi SHA mới vào `.runtime/source-commit`. Bằng chứng cũng nằm trong `.runtime/build-info` và khi chạy `./nro.sh status`.

Kiểm tra tay không cần khởi chạy server:

```bash
cd ~/ngocrong-termux
./nro.sh check-update
```

Kết quả in ra:

| Dòng hiển thị | Ý nghĩa |
|---|---|
| `Phát hiện source mới ... → <sha>` | Đã tải bản cập nhật, build lại và chạy tiếp. |
| `Source đã đồng bộ với GitHub commit <sha>` | Máy đã có bản mới nhất, không tải gì. |
| `[NRO][WARN] Không kiểm tra được commit GitHub` | Cả API lẫn feed đều không trả lời; xem `.runtime/source-update.log`, thử lại sau vài phút hoặc đổi mạng. |
| `Bỏ qua kiểm tra GitHub: lần gần nhất cách Ns...` | Chu kỳ kiểm tra chưa hết nên không gọi GitHub; chạy lại với `NRO_FORCE_UPDATE_CHECK=1` để kiểm tra ngay. |

Nếu máy vẫn chạy `nro.sh` bản cũ (chưa tự ép kiểm tra), ép một lần bằng biến môi trường:

```bash
NRO_FORCE_UPDATE_CHECK=1 NRO_UPDATE_CHECK_INTERVAL_SEC=0 ./nro.sh lan
```

Tắt hẳn cơ chế này bằng `NRO_AUTO_UPDATE=0`; đổi nguồn kiểm tra bằng `NRO_SOURCE_COMMIT_URL`, `NRO_SOURCE_FEED_URL` và `NRO_SOURCE_ARCHIVE_URL`.

## Lệnh quản lý

### Server và LAN

| Lệnh | Chức năng |
|---|---|
| `./nro.sh setup` | Cài dependency, database và build project. |
| `./nro.sh start` | Chạy server theo cấu hình hiện tại. |
| `./nro.sh lan` | Chạy server cho mạng LAN và tự cập nhật IP client. |
| `./nro.sh check-update` | Chỉ kiểm tra và tải source mới từ GitHub `main`, không khởi chạy server. |
| `./nro.sh status` | Xem trạng thái server và panel. |
| `./nro.sh stop` | Dừng game server và panel. |
| `./nro.sh restart` | Restart game server và panel. |
| `./nro.sh console` | Chạy foreground để xem log trực tiếp. |
| `./nro.sh rebuild` | Build lại Java thủ công; các lệnh start/restart/lan/background cũng tự build trước khi chạy. |

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

Boss thường dùng scheduler chung với trần số lượng cố định theo tier, map density, fairness và cooldown. Trần được điều khiển bởi các khóa `spawn.normal.max.concurrent`, `spawn.elite.max.concurrent`, `spawn.world.max.concurrent` và `spawn.broly.max.concurrent`; số người chơi online không làm boss ngừng spawn hoặc tự hạ trần.

Broly và Super Broly chạy **24/7** theo mặc định, kể cả chiều tối và rạng sáng. Muốn giới hạn theo khung giờ thì đặt `spawn.broly.hours.weekday/weekend` và `spawn.superbroly.hours.weekday/weekend` (định dạng `9-12,14-17,19-23`, hoặc `all`). Một map có thể có nhiều boss ở các khu khác nhau; một khu chỉ có một boss.

Broly có nhóm lịch riêng, không dùng chung bộ đếm của tier NORMAL và **không co giãn theo số người chơi online**. Server vắng vẫn chạy cùng logic 24/7:

- `spawn.broly.max.concurrent` — trần số Broly hoạt động cố định, không phụ thuộc player (mặc định 75).
- `spawn.broly.initial.stagger.min.sec/max.sec` — dải stagger riêng lúc mở server; Broly đầu tiên xuất hiện trong khoảng 1–10 giây mặc định.
- `spawn.broly.min.gap.sec` — khoảng cách cố định tối thiểu giữa các lần spawn toàn server (mặc định 8s), không kéo dài khi có nhiều Broly đang chờ.
- `spawn.broly.rest.sec` — cooldown mỗi Broly sau khi rời map (mặc định 180s).
- `spawn.broly.max.per.map` — giới hạn theo map; mỗi khu vẫn chỉ có một boss thuộc nhóm Broly.

Mini boss **Thỏ Đại Ca** được tạo một instance roaming trên các map trong `MINI_BOSS_MAPS`, dùng sprite cải trang Thỏ Đại Ca (403/404/405). Khi người chơi chạm boss, họ bị biến cà rốt trong 5 phút và sức đánh giảm 15%; các cải trang Thỏ Đại Ca/Thỏ Bunma (item 463/464/584) miễn nhiễm. Đây là boss roaming, tách biệt với Thỏ Đầu Bạc ở Võ Đài Sinh Tử.

Các khóa population cũ (`spawn.population.*`, `spawn.broly.min.concurrent`, `spawn.broly.max.adaptive.gap.sec`) không còn được dùng; hãy điều chỉnh trần bằng các khóa `*.max.concurrent` tương ứng.

Super Broly có hai nguồn spawn:

1. Kích hoạt khi Broly đạt ngưỡng HP và bị tiêu diệt (không bị roll tự nhiên chặn).
2. Tự roll ngẫu nhiên theo chu kỳ `spawn.superbroly.natural.roll.*` với xác suất `spawn.superbroly.natural.chance.percent`, khi vẫn dưới giới hạn đồng thời.

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

Biến liên quan tới tự cập nhật source:

```bash
NRO_AUTO_UPDATE=0                                  # tắt tự kiểm tra GitHub
NRO_SOURCE_COMMIT_URL=https://api.github.com/repos/team12a2-dev/Ngoc-rong-Termux-Offline/commits/main
NRO_SOURCE_FEED_URL=https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/commits/main.atom
NRO_SOURCE_ARCHIVE_URL=https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/archive/refs/heads/main.tar.gz
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
| `cd ~/ngocrong-termux` báo không tồn tại | Đây là lần cài mới; không chạy `cd` trước, hãy dùng lệnh bootstrap trong mục Cài đặt nhanh. |
| Không thấy bản sửa mới trên GitHub | Chạy `./nro.sh check-update`. Nếu in cảnh báo "Không kiểm tra được commit GitHub" (api.github.com và feed `main.atom` đều không trả lời vì mạng chặn hoặc rate-limit) thì xem `cat .runtime/source-update.log`; commit đang dùng nằm ở `.runtime/source-commit` và hiển thị bằng `./nro.sh status`. |
| `check-update` không in gì cả | `nro.sh` trên máy còn là bản cũ nên bỏ qua kiểm tra. Chạy lệnh 1 dòng ở mục [Cập nhật nhanh](#cập-nhật-nhanh-1-dòng-gõ-tay-được); database, `Config.properties` và `.runtime` được giữ nguyên. |
| `curl: (23) client returned ERROR on write` | Không ghi installer vào `/tmp`; dùng lại lệnh bootstrap mới để ghi vào `$HOME/.cache/ngocrong-termux`, đồng thời kiểm tra dung lượng bộ nhớ. |
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
install-termux.sh             Installer/update source trực tiếp từ nhánh main
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
- [Nhánh main cập nhật](https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/tree/main)
- [MariaDB Connector/J](https://mariadb.com/docs/connectors/mariadb-connector-j/about-mariadb-connector-j)
