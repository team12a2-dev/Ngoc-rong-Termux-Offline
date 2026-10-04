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

## Project client game

Project client Unity đi kèm server nằm tại [`client/PRJ_2Tab_550K`](client/PRJ_2Tab_550K), dùng Unity `2022.3.62f2`. Mở thư mục này bằng Unity Hub để build client Android/Windows và cấu hình endpoint LAN theo địa chỉ mà `./nro.sh lan` in ra. Các thư mục cache Unity như `Library`, `Logs` và `UserSettings` không đưa lên GitHub; Unity sẽ tự tạo lại khi mở project.

## Cài đặt nhanh

Cài **Termux chính thức**, sau đó dán **một dòng duy nhất** sau đây. Không cần chạy `cd` trước vì thư mục cài đặt chưa tồn tại ở lần đầu:

```bash
pkg update -y && pkg install -y curl tar && mkdir -p "$HOME/.cache/ngocrong-termux" && INSTALLER="$(mktemp "$HOME/.cache/ngocrong-termux/installer.XXXXXX.sh")" && trap 'rm -f "$INSTALLER"' EXIT && curl --http1.1 -fsSL --retry 5 --retry-all-errors --retry-delay 3 --connect-timeout 30 --max-time 7200 -o "$INSTALLER" "https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/raw/refs/heads/main/install-termux.sh" && bash "$INSTALLER"
```

Installer tải **archive source mới nhất từ nhánh GitHub `main`**; không dùng Git, không chia file, không tạo khóa SSH và không xuất hiện `Receiving objects`. File tạm được ghi trong `$HOME/.cache/ngocrong-termux`, không phụ thuộc `/tmp`; installer kiểm tra quyền ghi và dung lượng trước khi tải. Installer bảo toàn `Config.properties`, `.env`, database, `.runtime`, `node_modules` và dữ liệu người chơi.

Project được cài vào `~/ngocrong-termux`. Repository có nhiều tài nguyên game nên vẫn cần Wi‑Fi/4G ổn định; sau khi tải đủ, installer tự giải nén và chạy `./nro.sh setup`. Khi cập nhật, không cần `cd` vào thư mục trước; chỉ chạy lại lệnh bootstrap ở trên.

Sau lần cài đầu, không cần chạy installer mỗi khi GitHub có commit mới. Các lệnh `start`, `restart`, `lan` và `check-update` sẽ kiểm tra commit `main` trên GitHub; nếu có bản mới, launcher tải archive cập nhật, giữ nguyên cấu hình/database, chạy migration cần thiết và build lại source. Supervisor nền dùng chu kỳ kiểm tra mặc định 5 phút; có thể đổi bằng `NRO_UPDATE_CHECK_INTERVAL_SEC=60`.

### Cập nhật source trên Termux

Bản cài mặc định là **archive**, không phải Git clone, nên `git pull` không phải cơ chế cập nhật chính. Dùng:

```bash
cd ~/ngocrong-termux
./nro.sh check-update   # kiểm tra và tải bản mới ngay
./nro.sh lan            # kiểm tra bản mới rồi khởi động LAN
```

Nếu `git pull` báo thư mục không phải Git repository thì có thể bỏ qua; `nro.sh` đã tự cập nhật trực tiếp từ GitHub.

Lệnh setup sẽ cài Java, MariaDB và Node.js nếu thiếu; khởi tạo database; import SQL mặc định `ngocrong.sql` ở thư mục gốc một lần vào database mới; build Java và web panel. Nếu database hiện tại đã có dữ liệu game, launcher bỏ qua import để giữ dữ liệu người chơi/shop — thay SQL mặc định không tự ghi đè database đang chạy. Mỗi lần tạo tiến trình game mới, Java được build sạch trước khi chạy; thời gian build được lưu tại `.runtime/build-info` và hiển thị bằng `./nro.sh status`. Khi source có thay đổi, panel chỉ cài lại dependency nếu thiếu hoặc lockfile thay đổi, rồi build React và restart Node để chức năng mới xuất hiện.

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
| `./nro.sh replace-database` | Thay toàn bộ database bằng `ngocrong.sql`; dừng game, bắt buộc backup/xác minh, yêu cầu nhập `REPLACE <tên_database>` và tự phục hồi backup nếu import lỗi. |
| `./nro.sh sync-database` | Giống `replace-database` nhưng **không cần nhập xác nhận** — dùng khi bạn muốn chuyển server sang luồng dữ liệu database mới ngay (ví dụ DB đang chạy dump cũ: 3 account thay vì 14 account trong SQL chuẩn). Backup + xác minh + tự phục hồi vẫn được giữ nguyên. |
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
./nro.sh panel-password
# Hoặc: cat .runtime/panel-admin-password
```

Nếu panel báo `Invalid credentials`, đăng nhập bằng username `admin` và mật khẩu do lệnh trên hiển thị. Để đặt lại mật khẩu, chạy:

```bash
PANEL_ADMIN_PASSWORD='mat_khau_moi_tu_6_ky_tu' ./nro.sh panel
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

Muốn áp dụng toàn bộ snapshot SQL lên database đang có, trước tiên cập nhật launcher rồi chạy lệnh thay:

```bash
./nro.sh check-update
./nro.sh status
./nro.sh replace-database
```

`check-update` tải đồng bộ lại toàn bộ source ngay cả khi marker commit nói đã mới; lệnh cũng kiểm tra hash dump và vẫn chạy khi `NRO_AUTO_UPDATE=0`. `status` hiển thị thư mục/source commit và SHA-256 thực tế so với manifest chuẩn. Tiếp tục `replace-database` chỉ khi hai hash khớp. Lệnh sẽ dừng server, tạo và xác minh backup đúng database trong `.runtime/backups/`, yêu cầu nhập chính xác `REPLACE <tên_database>` rồi mới thay toàn bộ database. Sau import, launcher kiểm tra số bảng cùng account/player/item/shop; nếu lệch hoặc lỗi, nó thử phục hồi backup. File backup mới nhất được ghi tại `.runtime/last-database-backup.path`.

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
| `curl: (23) client returned ERROR on write` | Không ghi installer vào `/tmp`; dùng lại lệnh bootstrap mới để ghi vào `$HOME/.cache/ngocrong-termux`, đồng thời kiểm tra dung lượng bộ nhớ. |
| Server chưa `READY` | Xem `tail -n 160 .runtime/server.log` hoặc chạy `./nro.sh console`. |
| Không kết nối LAN | Kiểm tra cùng Wi‑Fi, IP, AP isolation và `ss -ltnp \| grep -E '14445\|3001'`. |
| Panel không chạy | Xem `.runtime/panel.log`, cài Node.js rồi chạy `./nro.sh panel`. |
| Android dừng server | Tắt battery optimization, dùng `./nro.sh background`, cài Termux:Boot. |
| JDBC/collation lỗi | Chạy lại setup để dùng MariaDB Connector/J hiện tại. |
| SQL mới có trong source nhưng DB vẫn là dữ liệu cũ | Launcher so sánh hash dump đã nạp (`.runtime/sql-imported.sha256`) với `ngocrong.sql` chuẩn và cảnh báo "Database dump: CŨ — đang dùng luồng SQL cũ" khi lệch (thường thấy ở panel: vài account thay vì đủ bộ trong SQL). Chạy `./nro.sh sync-database` để áp dụng ngay, hoặc đặt `NRO_AUTO_SYNC_SQL=1` để mỗi lần `./nro.sh start` tự đồng bộ. Cả hai cách đều backup bắt buộc, xác minh checksum và tự phục hồi nếu import lỗi. |
| SQL bị import lại | Không xóa `.runtime/sql-imported.sha256` nếu chưa backup. |

## Cấu trúc chính

```text
src/                         Java source
data/                        Map và game assets
ngocrong.sql                 SQL mặc định: schema và dữ liệu khởi tạo game
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
