<div align="center">
  <img src="assets/ngocrong-world.jpg" alt="Ngọc Rồng Online - Termux Edition" width="100%" />
</div>

<br />

<div align="center">

# Ngọc Rồng Online — Termux Edition

### Game server Java chạy trực tiếp trên Android với Termux và MariaDB cục bộ

<p>
  <img src="https://img.shields.io/badge/Java-17%2B-ED8B00?logo=openjdk&logoColor=white" alt="Java 17+" />
  <img src="https://img.shields.io/badge/MariaDB-10%2B-003545?logo=mariadb&logoColor=white" alt="MariaDB" />
  <img src="https://img.shields.io/badge/Android-Termux-00AF9C?logo=android&logoColor=white" alt="Android Termux" />
  <img src="https://img.shields.io/badge/Install-One%20Command-2EA44F?logo=gnu-bash&logoColor=white" alt="One command install" />
  <img src="https://img.shields.io/github/commit-activity/m/team12a2-dev/Ngoc-rong-Termux-Offline?label=development&logo=github" alt="Development activity" />
</p>

<p>
  <a href="#-cài-đặt-một-lệnh">Cài đặt</a> ·
  <a href="#-vận-hành-server">Vận hành</a> ·
  <a href="#-trạng-thái-khởi-động">Trạng thái</a> ·
  <a href="#-xử-lý-sự-cố">Xử lý sự cố</a>
</p>

</div>

> **Mục tiêu:** biến mã nguồn Ngọc Rồng Online Java và cơ sở dữ liệu game thành một gói triển khai Termux dễ cài đặt, có log rõ ràng, tự khởi tạo MariaDB và chỉ báo thành công sau khi server thật sự đạt trạng thái `READY`.

<div align="center">

**[Bắt đầu cài đặt ngay](#-cài-đặt-một-lệnh)** · **[Xem repository](https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline)** · **[Đọc hướng dẫn đầy đủ](#-mục-lục)**

</div>

## 📚 Mục lục

- [Tổng quan](#-tổng-quan)
- [Điểm nổi bật](#-điểm-nổi-bật)
- [Cài đặt một lệnh](#-cài-đặt-một-lệnh)
- [Luồng khởi động](#-luồng-khởi-động)
- [Vận hành server](#-vận-hành-server)
- [Panel web quản trị](#-panel-web-quản-trị)
- [Cửa hàng/NPC Shop](#-cửa-hàngnpc-shop)
- [Drop theo Map](#-drop-theo-map)
- [Item bổ trợ](#item-bổ-trợ)
- [Cấu hình database và JVM](#-cấu-hình-database-và-jvm)
- [Kết nối từ thiết bị khác](#-kết-nối-từ-thiết-bị-khác)
- [Trạng thái khởi động](#-trạng-thái-khởi-động)
- [Xử lý sự cố](#-xử-lý-sự-cố)
- [Cấu trúc repository](#-cấu-trúc-repository)
- [Kiểm thử và thông số](#-kiểm-thử-và-thông-số)
- [Lưu ý vận hành](#-lưu-ý-vận-hành)

## 🌌 Tổng quan

Repository này đóng gói server Java Ngọc Rồng Online từ mã nguồn `cc2.rar`, cơ sở dữ liệu SQL và **panel web quản trị Node.js/React**. Bản Termux Edition vận hành game server Java + MariaDB cục bộ, đồng thời tự build và khởi động panel production trên cùng một cổng HTTP sau khi game server đạt `READY`.

Hình ảnh phía trên là banner gameplay mẫu của dự án. Tất cả dữ liệu game, hình ảnh và mã nguồn cần được người triển khai tự xác minh quyền sử dụng trước khi công khai hoặc mở server cho người khác.

## ✨ Điểm nổi bật

| Thành phần | Trải nghiệm triển khai |
|---|---|
| **One-command installer** | Tải archive public, cài dependency, setup database, build Java + React panel và chạy toàn bộ dịch vụ mà không cần nhập GitHub username/password. |
| **Java fallback** | Tự thử `openjdk-21`, `openjdk-17`, rồi `openjdk` để phù hợp với các mirror Termux khác nhau. |
| **MariaDB-native JDBC** | Dùng MariaDB Connector/J 3.5.10 và `jdbc:mariadb://`, tránh lỗi collation của MySQL Connector/J 5.1 cũ. |
| **Database an toàn hơn** | Database mặc định là `ngocrong`; SQL chỉ import một lần với marker checksum để tránh ghi đè dữ liệu người chơi khi restart. |
| **Startup observable** | Phân biệt `STARTING` và `READY`, lưu log trong `.runtime/`, chờ marker readiness thay vì chỉ kiểm tra PID. |
| **Android case-safe assets** | Chuẩn hóa asset map `data/map/tile_set_info`, tránh lỗi phân biệt chữ hoa/thường trên Linux/Android. |
| **Runtime-friendly** | JVM mặc định giới hạn hợp lý cho điện thoại; panel và game có PID/log riêng, hỗ trợ `status`, `stop`, `restart`, `console` và `rebuild`. |

## 🚀 Cài đặt một lệnh

> Repository hiện được phát hành public. Lệnh dưới đây không dùng `git clone`, không yêu cầu GitHub username/password và không cần thao tác setup thủ công từng bước.

Mở **Termux chính thức**, dán nguyên một dòng lệnh sau rồi nhấn Enter:

```bash
pkg update -y && pkg install -y curl tar && mkdir -p "$HOME/ngocrong-termux" && curl -fL --retry 3 "https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/archive/refs/heads/main.tar.gz" | tar -xz --strip-components=1 -C "$HOME/ngocrong-termux" && cd "$HOME/ngocrong-termux" && bash nro.sh
```

### Lần chạy đầu sẽ tự động làm gì?

| Bước | Tác vụ | Kết quả mong đợi |
|---:|---|---|
| 1 | Cập nhật package Termux | Kho package sẵn sàng |
| 2 | Cài Java và MariaDB | Có `java`, `javac`, `mariadb`, `mariadbd` |
| 3 | Khởi tạo MariaDB local | Data directory nằm trong `$PREFIX/var/lib/mysql` |
| 4 | Tạo database/user | Database `ngocrong` và user cục bộ được tạo |
| 5 | Import SQL | 53 bảng và dữ liệu game được nạp một lần |
| 6 | Build Java | Toàn bộ source được biên dịch với `--release 17` |
| 7 | Tải dữ liệu game | Database, map, item, mob, NPC và service được khởi tạo |
| 8 | Setup panel | `npm run db:sync` tạo schema panel, build React và lưu mật khẩu admin cục bộ |
| 9 | Sẵn sàng phục vụ | Xuất hiện dòng `[NRO][READY]` và panel phản hồi tại `http://127.0.0.1:3001` |

Sau lần cài đầu, những lần sau chỉ cần chạy:

```bash
cd ~/ngocrong-termux && bash nro.sh
```

## 🔄 Luồng khởi động

```text
┌─────────────────┐
│ Termux one-line │
│ curl + tar      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────┐
│ nro.sh          │────▶│ Java fallback        │
│ setup/start     │     │ openjdk-21/17/openjdk│
└────────┬────────┘     └──────────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────┐
│ MariaDB local   │────▶│ database: ngocrong   │
│ socket + user   │     │ SQL import once       │
└────────┬────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ ServerManager                                │
│ load database → map/assets → services        │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
             .runtime/server.ready
                       │
                       ├───────────────┐
                       ▼               ▼
                 [NRO][READY]   Panel API + React
                                      :3001
```

## 🛠️ Vận hành server

| Lệnh | Chức năng |
|---|---|
| `bash nro.sh` | Tự setup nếu chưa có, sau đó chạy server nền |
| `bash nro.sh setup` | Chạy lại dependency/database/import/build theo chủ đích |
| `bash nro.sh start` | Khởi động server và chờ trạng thái `READY` |
| `bash nro.sh lan` | Tự nhận IP Wi‑Fi Android, cập nhật địa chỉ client, bind game trên LAN và bật panel LAN |
| `bash termux-lan-start.sh` | Script chuyên dụng khởi động chế độ LAN trên Termux |
| `bash nro.sh background` | Chạy supervisor độc lập với cửa sổ Termux, tự phục hồi game/panel khi tiến trình dừng |
| `bash nro.sh background-status` | Xem trạng thái supervisor, game, MariaDB, panel và endpoint |
| `bash nro.sh background-log` | Theo dõi log supervisor realtime |
| `bash nro.sh background-stop` | Dừng an toàn service game/panel và giải phóng wake lock |
| `bash nro.sh status` | Hiển thị `STARTING`, `READY` hoặc `STOPPED` cùng PID/MariaDB |
| `bash nro.sh stop` | Dừng server game, không xóa database |
| `bash nro.sh restart` | Dừng và khởi động lại server |
| `bash nro.sh console` | Chạy foreground để xem log trực tiếp |
| `bash nro.sh rebuild` | Biên dịch lại mã Java |
| `bash nro.sh panel` | Setup và khởi động riêng panel web |
| `bash nro.sh backup` | Xuất database online khi server đang chạy, tạo file nén và checksum |
| `bash nro.sh backup-schedule` | Đăng ký hoặc cập nhật lịch backup định kỳ bằng Termux:API |
| `bash nro.sh backup-status` | Xem job backup, file backup gần nhất và log |
| `bash nro.sh backup-cancel` | Hủy lịch backup định kỳ |
| `cat .runtime/panel-admin-password` | Xem mật khẩu admin panel được sinh tự động |

Theo dõi log trực tiếp:

```bash
cd ~/ngocrong-termux && tail -f .runtime/server.log
```

Kiểm tra trạng thái readiness:

```bash
cd ~/ngocrong-termux && bash nro.sh status
ls -l ~/ngocrong-termux/.runtime/server.ready
```

## 🖥️ Panel web quản trị

Sau khi game server đạt `READY`, launcher tự setup và khởi động panel web production. Trong terminal sẽ xuất hiện nhóm **`Endpoint dịch vụ`**, gồm URL local, địa chỉ LAN, cổng game, cổng panel và đường dẫn log. Mở trình duyệt trên điện thoại tại [http://127.0.0.1:3001](http://127.0.0.1:3001). Nếu truy cập từ thiết bị khác trong cùng Wi-Fi, dùng dòng `Panel URL LAN` được launcher in ra, ví dụ `http://192.168.1.25:3001`.

Panel API và giao diện React dùng chung cổng `3001`; API nằm dưới `/api/v1`, còn WebSocket metrics dùng `/ws/metrics`. Lần setup đầu tự chạy `npm install`, `npm run db:sync` và `npm run build`. Tài khoản là `admin`; mật khẩu ngẫu nhiên được lưu tại `.runtime/panel-admin-password`. Xem mật khẩu bằng `cat .runtime/panel-admin-password` rồi đổi mật khẩu sau khi đăng nhập nếu giao diện hỗ trợ.

Log panel nằm tại `.runtime/panel.log`. Trạng thái panel và toàn bộ endpoint được kiểm tra bằng `bash nro.sh status`. Panel mặc định listen trên `0.0.0.0:3001` để có thể truy cập trong cùng mạng LAN; chỉ URL `127.0.0.1` là dùng cho chính điện thoại. Có thể đổi bind host hoặc cổng bằng `NRO_PANEL_BIND` và `NRO_PANEL_PORT`, ví dụ `NRO_PANEL_BIND=127.0.0.1 NRO_PANEL_PORT=3002 bash nro.sh restart`.

### Runtime & Diagnostics

Panel có thêm mục **Runtime & Logs** để quản lý vận hành mà không cần mở terminal. Trang này hiển thị trạng thái Java Panel Agent, cổng game, địa chỉ Agent, PID và uptime Node.js, RAM Termux, tình trạng file log, đồng thời cho phép xem realtime ba log `server.log`, `panel.log` và `mariadb.log`. Log tự làm mới mỗi 5 giây, có thể chọn 100–1.000 dòng và tải xuống thành file `.txt` để gửi khi cần hỗ trợ.

Các API nội bộ tương ứng là `GET /api/v1/runtime/diagnostics` và `GET /api/v1/runtime/logs?source=game|panel|mariadb`. Endpoint chỉ yêu cầu quyền panel đã đăng nhập và chỉ đọc ba file log cố định trong `.runtime`, không cho phép truyền đường dẫn tùy ý.

### 🎯 Drop theo Map

Mục **Game & Server → Drop theo Map** cho phép cấu hình vàng, sét kích hoạt và vật phẩm rơi theo từng `Map ID` bằng giao diện, không cần sửa Java hoặc chạy SQL thủ công. Lần chạy `npm run db:sync` sẽ tự tạo hai bảng `panel_map_drop_configs` và `panel_map_drop_items`; mỗi server có tối đa một rule cho mỗi map.

| Nhóm cấu hình | Mặc định đơn giản | Khi cần nâng cao |
|---|---|---|
| Rule map | Chọn Map ID, bật rule và lưu. | Không thay đổi. |
| Item custom | Tìm item trong catalog, bấm **Thêm**; item tự áp dụng cho mọi quái, level `0–19` và cả ngày với tỷ lệ mặc định `1%`, số lượng `1`. | Mở **Nâng cao** để lọc Mob, level, giờ và option `id:param`. |
| Vàng rơi | Giữ nguyên vàng gốc nếu không bật. | Bật override, nhập tỷ lệ và khoảng `min–max`, hoặc dùng preset an toàn/farm. |
| Sét kích hoạt | Giữ nguyên sét gốc nếu không bật. | Mở **Nâng cao** và đặt tỷ lệ riêng cho map. |
| Reload runtime | **Lưu & reload** ghi database và gọi Java Agent `/reload/drop-config`. | Không cần restart server. |

#### Quy trình cấu hình nhanh

```text
1. Mở Game & Server → Drop theo Map.
2. Chọn map có sẵn hoặc nhập Map ID từ 0 đến 9999 rồi bấm Mở.
3. Tìm item theo ID/tên và bấm Thêm.
4. Chỉnh tỷ lệ (%) và số lượng từ/đến ngay trong bảng item.
5. Nếu cần thay vàng mặc định, bật Vàng custom và nhập khoảng vàng.
6. Bấm Lưu & reload.
```

Item được thêm theo luồng nhanh sẽ dùng các điều kiện mặc định: `Mob ID = -1` cho mọi quái, player level `0–19`, thời gian cả ngày và không có option drop bổ sung. Vì vậy phần lớn trường hợp chỉ cần **6 thao tác trên**, không phải chọn Mob, level hoặc khung giờ.

#### Khi nào dùng Nâng cao?

Mở mục **Nâng cao: sét, Mob, level, khung giờ và option drop** khi cần một trong các yêu cầu sau: chỉ cho một Mob ID cụ thể rơi item; giới hạn theo level người chơi; đặt khung giờ ban ngày/ban đêm; thêm option cho item rơi; hoặc bật tỷ lệ sét riêng. `Mob ID -1` áp dụng cho mọi quái; `time_start_min`/`time_end_min` là số phút từ đầu ngày, `00:00–24:00` là cả ngày và giờ bắt đầu lớn hơn giờ kết thúc là khung qua nửa đêm.

Tỷ lệ dùng phần trăm thực: `0,01%` tương đương 1/10.000, `1%` tương đương 1/100 và `100%` luôn trúng. `goldMin`/`goldMax` là số vàng thực tế. Options item drop nhập dạng `id:param, id:param`, ví dụ `47:500, 30:0`. Điều kiện Mob, level và giờ được kết hợp bằng AND.

Rule custom được áp dụng tại hook `Mob.getItemMobReward` cho quái thường sau khi player hạ quái. Reward boss và drop đặc biệt hiện hữu vẫn chạy theo source; cấu hình mới chỉ bổ sung item hoặc thay phần vàng/sét mặc định trên map đã chọn. Mỗi lần lưu yêu cầu quyền `server.config`, được ghi vào Audit Logs và đồng bộ qua `MapDropConfigService`. Nếu Java Agent reload lỗi, dữ liệu database vẫn được lưu; hãy mở **Runtime & Logs**, kiểm tra Agent rồi bấm **Reload runtime**. Không nên đặt tỷ lệ quá cao cho nhiều item cùng lúc vì mỗi item roll độc lập có thể làm số lượng vật phẩm rơi tăng mạnh.

### Quản lý tài khoản và nhân vật

Trong **Người chơi → Quản lý Player**, quản trị viên có thể bấm **Tạo nhân vật** để tạo character mới cho một `Account ID`. Launcher gọi đúng starter initializer của Java server, tự sinh dữ liệu khởi đầu gồm map, chỉ số, kỹ năng và trang bị starter. Theo schema hiện tại, mỗi account chỉ có một nhân vật vì `player.account_id` là khóa duy nhất.

Ở tab **Túi / Vàng**, phần **Cộng nhanh vàng / ngọc** là thao tác cộng dồn, không ghi đè số dư hiện tại. Player online nhận cập nhật ngay qua Java Panel Agent và được gửi lại inventory packet; player offline được cập nhật trong `data_inventory` của database. Mỗi lần cộng tối đa `200.000.000.000` vàng và `2.000.000.000` ngọc, với giới hạn tổng phù hợp model game.

Trong tab **Hành động**, có thể xóa nhân vật vĩnh viễn khi nhân vật đã offline. Panel chủ động từ chối thao tác nếu Agent báo player online hoặc Agent không phản hồi, nhằm tránh xóa dữ liệu khi chưa xác nhận trạng thái. Tất cả thao tác tạo, xóa và cộng tiền tệ đều được ghi vào **Audit Logs**.

### Broadcast toàn server

Trong **Game & Server → Server Control**, card **Thông báo toàn server** cho phép chọn mẫu có sẵn hoặc nhập thông báo mới. Quản trị viên có thể chọn ba loại `Thông tin`, `Cảnh báo` hoặc `Sự kiện`; panel hiển thị preview, đếm tối đa 500 ký tự và yêu cầu xác nhận trước khi gửi. Java Agent trả về số người chơi online đã nhận thông báo, kết quả được hiển thị ngay trên giao diện và ghi vào **Audit Logs**.

Chức năng yêu cầu quyền `server.broadcast` và giới hạn tối thiểu 3 giây giữa hai lần gửi trên cùng server để tránh spam. API tương ứng là `POST /api/v1/servers/:id/broadcast` với payload `{ "message": "...", "type": "info|warning|event" }`.

### Quản lý Item Templates

Mục **Game & Server → Item Templates** quản lý trực tiếp bảng `item_template`: xem/tìm kiếm, tạo item mới với ID kế tiếp, sửa tên/mô tả/type/gender/icon/part/level/yêu cầu sức mạnh/giá và gọi Java Agent reload sau khi lưu. Panel hiển thị ảnh từ `icon_id` qua asset game `data/icon/x4` (tự fallback x3/x2/x1); các catalog Drop, Item bổ trợ, Giftcode, Shop và picker hành trang dùng chung cơ chế này. Bảng `item_option_template` được đọc để đối chiếu option hiện có; option mới chỉ là nhãn hiển thị, còn hiệu ứng thực tế phải được Java source xử lý.

> **Quan trọng:** source hiện tại tạo item bằng `Manager.ITEM_TEMPLATES.get(tempId)`, vì vậy ID item phải liên tục từ `0` đến `MAX(id)`. Panel không cho xóa item và sẽ từ chối tạo nếu database đang có ID bị khuyết. Đây là điều kiện để vật phẩm tạo từ shop, giftcode hoặc inventory không làm server lỗi index.

### Item bổ trợ

Mục **Game & Server → Item bổ trợ** cho phép đăng ký item `type = 29` và gán các dòng option chỉ số từ bảng `item_option_template`. Bổ huyết chỉ là một item mẫu trong source, không phải behavior cố định của panel. Mỗi mapping lưu thời lượng, trạng thái bật/tắt và danh sách `option_id:param`; không cần sửa switch ID trong Java hoặc chạy SQL thủ công.

| Thành phần | Logic runtime |
|---|---|
| Item template | Chỉ item có `type = 29` mới được đăng ký. ID item vẫn phải liên tục theo yêu cầu của `Manager.ITEM_TEMPLATES`. |
| Option chỉ số | Chọn option trong catalog, nhập `param`, ví dụ `47:5` là Giáp+5, `77:20` là HP+20%, `50:10` là Sức đánh+10%. |
| Thời lượng | Nhập bằng giây, mặc định `600` giây và tối đa `30 ngày`. Khi hết hạn, option tạm thời được gỡ và point được tính lại. |
| Runtime reload | Lưu mapping vào `panel_usable_items` và `panel_usable_item_options`, sau đó gọi Java Agent `/reload/usable-items` mà không cần restart server. |

#### Quy trình cấu hình

```text
1. Mở Game & Server → Item Templates và tạo item mới với type = 29.
2. Đặt tên, mô tả, icon và các trường template cần thiết; bảo đảm ID item liên tục.
3. Mở Game & Server → Item bổ trợ.
4. Chọn item type 29, đặt thời lượng và bấm + Thêm trong danh sách option chỉ số.
5. Nhập param cho từng option, kiểm tra phần preview rồi bấm Lưu option & reload.
6. Cấp item vào túi qua shop, giftcode hoặc công cụ quản trị rồi dùng item trong game.
```

Khi sử dụng thành công, server lấy đúng option đã cấu hình, áp dụng qua bộ tính chỉ số `NPoint`, gửi timer bằng icon của item, trừ một item trong stack và đồng bộ lại túi. Trạng thái cùng danh sách option được lưu trong `data_item_time`, nên buff còn hạn vẫn được khôi phục khi player đăng nhập lại. Nếu Agent tạm thời không phản hồi, dữ liệu panel vẫn được lưu để reload lại sau.

> **Giới hạn an toàn:** panel chỉ chấp nhận option template tồn tại trong DB game và Java chỉ áp dụng hiệu ứng mà `NPoint.addOption` đã hỗ trợ. Option mang tính vật liệu, cosmetic hoặc chức năng riêng không tự tạo ra logic mới; hãy chọn option chỉ số có gameplay effect trong catalog.

### 🛒 Cửa hàng/NPC Shop

Module **Cửa hàng/NPC Shop** được thiết kế theo luồng một màn hình: chọn shop → chọn tab → thêm hoặc chỉnh item → lưu và reload trong game. Các thao tác lặp đã được gom lại để giảm số lần mở form và số lần lưu thủ công:

| Thao tác nhanh | Cách sử dụng |
|---|---|
| Thêm nhiều item | Tìm item theo tên/ID, tick nhiều item trong catalog rồi bấm **Thêm X item mới**. Các item đã tồn tại trong tab được tự động bỏ qua để không tạo trùng. |
| Giá và loại tiền mặc định | Đặt **Giá mặc định** và **Loại tiền** một lần ở đầu tab; các item thêm tiếp theo dùng ngay cấu hình đó. |
| Lọc theo hệ | Chọn **Trái Đất, Namek, Xayda hoặc Chung** để chỉ xem item phù hợp, tránh phải dò thủ công. |
| Chỉnh nhiều item | Tick các item trong tab, bấm **Chỉnh nhanh**, rồi đặt giá chung, loại tiền, trạng thái bán hoặc nhãn `NEW`. Để trống trường nào nếu không muốn thay đổi trường đó. |
| Tìm trong tab | Dùng ô tìm riêng của tab để lọc theo tên hoặc `temp_id`; có thể chọn toàn bộ các dòng đang hiển thị. |
| Sắp xếp | Kéo biểu tượng `⋮⋮` hoặc dùng nút `↑`/`↓`; thứ tự được lưu ngay. Tắt ô tìm trong tab trước khi kéo để tránh sắp xếp nhầm danh sách đã lọc. |
| Lưu nhanh | Bấm **Lưu** ở từng item khi cần kiểm soát chi tiết, hoặc **Lưu tất cả** để ghi toàn bộ tab trong một lần. |
| Import/export thứ tự | Bấm **Xuất tên** để sao chép danh sách. Bấm **Nhập thứ tự** để dán định dạng `thứ tự|temp_id|tên|option_id:param;...`, xem trước thay đổi, tự thêm item thiếu và áp dụng option cùng thứ tự. |
| Chỉnh chi tiết | Chọn item để sửa `icon_spec`, nhãn `NEW`, hệ ghi đè, yêu cầu sức mạnh và option. |

Ví dụ quy trình điều chỉnh một tab shop:

```text
1. Chọn hệ cần xem và nhập tên/ID item.
2. Tick các item cần thêm → đặt Giá mặc định/Loại tiền → bấm “Thêm X item mới”.
3. Trong danh sách tab, tick nhóm item cần đổi → “Chỉnh nhanh” → nhập giá hoặc trạng thái bán → “Áp dụng”.
4. Kéo thả để sắp xếp hoặc dán danh sách vào “Nhập thứ tự” nếu cần thay đổi hàng chục dòng.
5. Kiểm tra preview, bấm “Lưu tất cả” nếu còn chỉnh chi tiết, rồi reload shop trong game.
```

Các thao tác thêm/sửa/xóa/reorder đều yêu cầu quyền `giftcode.manage`, được ghi vào Audit Logs và gọi live sync tới Game Agent. Sau khi lưu, hãy đóng cửa sổ shop trong game rồi mở lại NPC để client nhận thứ tự và dữ liệu mới. Bulk update chỉ gửi các item được chọn; thao tác không làm thay đổi option hoặc trường nào không được chỉ định.

Luồng lưu item là: ghi hàng vào MariaDB → panel đọc lại bản ghi để xác nhận persistence → Java Agent gọi `Manager.reloadItemTemplates()` → nạp lại `item_template` và `item_option_template` → rebuild danh sách mount → các lần `ItemService.createNewItem(tempId)` tiếp theo dùng template mới. Panel không bao giờ coi RAM là nơi lưu vật phẩm chính. Nếu database đã lưu nhưng Java Agent chưa reload, API trả trạng thái `databaseSaved: true, runtimeReloaded: false` và yêu cầu kiểm tra Agent; bản ghi trong database vẫn được giữ nguyên để reload lại sau. Item mới dùng được trong game nếu `type`, option ID, part/icon và logic tương ứng đã được source/client hỗ trợ; chỉ thêm một dòng database không tự tạo ra một hiệu ứng game hoàn toàn mới.

## 🗄️ Cấu hình database và JVM

Mặc định launcher tạo database **`ngocrong`**, host `127.0.0.1`, port `3306`, user `ngocrong` và mật khẩu ngẫu nhiên được lưu trong `.runtime/db-password`. File `Config.properties` được tạo cục bộ từ `Config.properties.example` và không được commit lên GitHub.

Có thể ghi đè cấu hình database/game port trước khi chạy:

```bash
export NRO_DB_NAME=ngocrong
export NRO_DB_USER=ngocrong
export NRO_DB_PASSWORD='mat-khau-tu-chon'
export NRO_DB_PORT=3306
export NRO_GAME_PORT=14445
bash nro.sh
```

MariaDB Connector/J 3.5.10 được dùng với driver `org.mariadb.jdbc.Driver` và URL `jdbc:mariadb://`. Launcher cũng tự nâng cấp cấu hình cũ dùng `com.mysql.jdbc.Driver` để tránh lỗi `buildCollationMapping`/`NullPointerException` khi MariaDB trả về metadata collation.

### 🧾 Thay đổi database bằng file SQL trên Android Termux

Có thể chạy một file SQL tùy chỉnh để thêm dữ liệu, cập nhật cấu hình game hoặc sửa bảng MariaDB. Hãy **dừng game server trước khi thay đổi dữ liệu** để tránh ghi đè hoặc đọc dữ liệu chưa đồng bộ. Các lệnh dưới đây giả sử repository nằm ở `~/ngocrong-termux`, database là `ngocrong` và MariaDB socket dùng đường dẫn mặc định của Termux.

Trước tiên, nếu file SQL nằm trong thư mục Download của Android, cấp quyền truy cập bộ nhớ một lần và kiểm tra file:

```bash
termux-setup-storage
ls -lh ~/storage/downloads/update.sql
```

Nên sao lưu database trước mỗi lần cập nhật. Lệnh sau tạo một bản dump có thời gian trong tên file:

```bash
cd ~/ngocrong-termux
bash nro.sh stop
mkdir -p .runtime/backups
mariadb-dump --protocol=socket \
  --socket="${PREFIX}/var/run/mysqld/mysqld.sock" \
  -uroot ngocrong > ".runtime/backups/ngocrong-$(date +%Y%m%d-%H%M%S).sql"
```

Để chạy file SQL và giữ nguyên database hiện tại, dùng tài khoản game được launcher tạo sẵn. Mật khẩu được đọc từ file cục bộ `.runtime/db-password`, không commit file này lên GitHub:

```bash
cd ~/ngocrong-termux
DB_PASS="$(cat .runtime/db-password)"
mariadb --protocol=socket \
  --socket="${PREFIX}/var/run/mysqld/mysqld.sock" \
  -ungocrong -p"$DB_PASS" ngocrong < ~/storage/downloads/update.sql
```

Nếu file SQL chỉ chứa một vài câu lệnh, có thể chạy trực tiếp bằng tùy chọn `-e`:

```bash
cd ~/ngocrong-termux
DB_PASS="$(cat .runtime/db-password)"
mariadb --protocol=socket \
  --socket="${PREFIX}/var/run/mysqld/mysqld.sock" \
  -ungocrong -p"$DB_PASS" ngocrong \
  -e "UPDATE ten_bang SET ten_cot='gia_tri_moi' WHERE id=1;"
```

Sau khi kiểm tra lệnh SQL không báo lỗi, khởi động lại server và chờ trạng thái `READY`:

```bash
cd ~/ngocrong-termux
bash nro.sh restart
bash nro.sh status
```

> **Cảnh báo:** Không xóa `.runtime/sql-imported.sha256` chỉ để chạy lại `sql/ngocrong.sql`. Launcher dùng marker này để tránh import lại toàn bộ dữ liệu mẫu và có thể làm mất dữ liệu người chơi. Nếu muốn thay thế toàn bộ database, hãy tạo backup trước, dừng server, dùng một database dump đã kiểm tra, rồi giữ marker để launcher không tự import lại SQL mẫu.

> **Lưu ý:** File SQL phải tương thích với schema hiện tại. Nếu thay đổi `item_template`, ID item phải liên tục từ `0` đến `MAX(id)`; sau khi cập nhật nên restart server để Java nạp lại dữ liệu runtime.

### 🔄 Backup database khi server đang chạy và tự động định kỳ

Repository đã tích hợp script `backup-database.sh` và các lệnh backup vào `nro.sh`. Backup dùng `mariadb-dump --single-transaction`, vì vậy có thể xuất database khi game server vẫn đang vận hành mà không cần dừng Java server. File được nén thành `.sql.gz`, lưu trong `.runtime/backups/` và mặc định giữ lại 7 ngày.

Cài package lệnh Termux:API và `gzip`. Ứng dụng **Termux:API** cũng phải được cài trên Android từ cùng nguồn với Termux:

```bash
pkg update -y
pkg install -y termux-api gzip
```

Xuất database ngay lập tức để kiểm tra:

```bash
cd ~/ngocrong-termux
bash nro.sh backup
```

Lệnh trên tạo file backup có dạng `.runtime/backups/ngocrong-YYYYMMDD-HHMMSS.sql.gz`, kèm file checksum `.sha256` và log tại `.runtime/backup.log`. Kiểm tra kết quả:

```bash
ls -lh .runtime/backups/
tail -n 50 .runtime/backup.log
```

Thiết lập tự động backup mỗi 24 giờ bằng job ID cố định. Chạy lệnh này một lần sau khi cài đặt; lệnh sẽ hủy job cùng ID trước để tránh lịch trùng:

```bash
cd ~/ngocrong-termux
bash nro.sh backup-schedule
```

Mặc định launcher dùng chu kỳ `86400000` mili giây (24 giờ), job ID `1001`, không yêu cầu mạng và được giữ lại sau khi Android khởi động lại. Có thể cấu hình rõ ràng bằng biến môi trường:

```bash
NRO_BACKUP_JOB_ID=1001 \
NRO_BACKUP_PERIOD_MS=86400000 \
bash ~/ngocrong-termux/nro.sh backup-schedule
```

Xem lịch, các file backup gần nhất và đường dẫn log:

```bash
cd ~/ngocrong-termux
bash nro.sh backup-status
```

Đổi thời gian lưu backup, ví dụ giữ 14 ngày:

```bash
printf 'NRO_BACKUP_KEEP_DAYS=14\n' > ~/ngocrong-termux/.runtime/backup.conf
bash ~/ngocrong-termux/nro.sh backup
```

Hủy tự động backup khi không còn sử dụng:

```bash
cd ~/ngocrong-termux
bash nro.sh backup-cancel
```

> **Lưu ý:** Android có thể trì hoãn job do cơ chế tiết kiệm pin. Hãy tắt tối ưu pin cho Termux và Termux:API nếu cần lịch chạy ổn định. Backup vẫn nằm trên bộ nhớ điện thoại; hãy định kỳ chép `.runtime/backups/` sang bộ nhớ ngoài hoặc máy chủ riêng. Không commit backup chứa dữ liệu người chơi lên repository công khai.

> **An toàn dữ liệu:** `--single-transaction` phù hợp nhất với bảng InnoDB và tạo snapshot nhất quán mà không dừng server. Hãy kiểm tra log sau mỗi lần backup; nếu MariaDB chưa chạy hoặc dump lỗi, script sẽ không đổi tên file tạm thành bản backup hoàn chỉnh.

JVM mặc định dùng cấu hình tiết kiệm RAM:

```text
Xms64m · Xmx1024m · G1GC · MaxMetaspaceSize=160m
```

Nếu điện thoại có nhiều RAM hơn, có thể truyền JVM options riêng:

```bash
NRO_JVM_OPTS='-server -Dfile.encoding=UTF-8 -Xms128m -Xmx1536m -XX:MaxMetaspaceSize=192m -Xss512k -XX:+UseG1GC' bash nro.sh restart
```

## 🌐 Kết nối từ thiết bị khác

Server đã có chế độ LAN dành cho Termux Android. Điện thoại chạy Termux đóng vai trò game server; thiết bị chơi phải kết nối cùng mạng Wi‑Fi. Lệnh LAN tự nhận IPv4 Wi‑Fi của Android, cập nhật địa chỉ quảng bá cho client, bind socket game trên `0.0.0.0` và khởi động panel web trên mọi interface LAN.

Để server **không phụ thuộc cửa sổ Termux**, hãy dùng supervisor độc lập thay vì chạy trực tiếp trong terminal:

```bash
./nro.sh background
```

Lệnh này tách supervisor bằng `nohup`/`setsid`, lưu PID tại `.runtime/supervisor.pid`, log tại `.runtime/supervisor.log`, bật wake lock và tự khởi động lại launcher nếu game hoặc panel dừng. Khi terminal đã báo `Supervisor started`, có thể đóng cửa sổ Termux hoặc vuốt phiên terminal. Dùng `./nro.sh background-stop` khi muốn dừng có chủ đích.

Muốn tự chạy sau khi Android reboot, cài ứng dụng **Termux:Boot**, mở ứng dụng một lần rồi chạy:

```bash
./install-termux-background.sh
```

Script tạo hook `~/.termux/boot/ngocrong-lan`, để Termux:Boot gọi supervisor sau mỗi lần khởi động điện thoại.

```bash
cd ~/ngocrong-termux
chmod +x nro.sh termux-lan-start.sh
./termux-lan-start.sh
```

Hoặc dùng:

```bash
./nro.sh lan
```

Sau khi khởi động, đọc nhóm `Endpoint dịch vụ` trong terminal:

```text
Game endpoint LAN  : 192.168.1.37:14445
Panel URL LAN      : http://192.168.1.37:3001
```

Client game dùng `192.168.1.37:14445`; trình duyệt trên điện thoại hoặc máy tính cùng Wi‑Fi dùng `http://192.168.1.37:3001`. Nếu Android có nhiều interface hoặc script chọn sai địa chỉ, chỉ định rõ:

```bash
NRO_LAN_IP=192.168.1.37 ./nro.sh lan
```

`server.ip` là địa chỉ **quảng bá cho client**, còn `server.listen.host=0.0.0.0` là địa chỉ bind socket. MariaDB vẫn chỉ bind `127.0.0.1:3306` và không mở ra LAN. Khi router cấp IP mới cho điện thoại, chạy lại `./nro.sh lan` rồi restart server.

Nếu không kết nối được, kiểm tra hai thiết bị có cùng Wi‑Fi, router có bật AP/client isolation hay không, Android có tắt Termux do tối ưu pin hay không và dùng `./nro.sh status` cùng `ss -ltnp | grep -E '14445|3001'`. Không cần mở cổng game ra Internet; mạng di động/NAT thường không cho thiết bị bên ngoài kết nối trực tiếp.

## 🟢 Trạng thái khởi động

| Trạng thái | Ý nghĩa | Cách kiểm tra |
|---|---|---|
| `STARTING` | Java còn đang tải database, map, item, mob, NPC hoặc service | `bash nro.sh status` |
| `READY` | Server đã tải xong dữ liệu và sẵn sàng nhận kết nối | Có `.runtime/server.ready` |
| `STOPPED` | Process Java không còn tồn tại | `bash nro.sh restart` |
| `MariaDB: RUNNING` | Database local đang phục vụ connection | `tail -n 100 .runtime/mariadb.log` |
| `Panel web: READY` | API health phản hồi và React build đang được phục vụ | Xem dòng `Panel URL local` hoặc `Panel URL LAN` |

> Chỉ xem server là hoạt động hoàn chỉnh khi có dòng `[NRO][READY]`. Việc process Java còn PID không đồng nghĩa dữ liệu game đã tải xong.

## 🧯 Xử lý sự cố

### Không tìm thấy OpenJDK

Nếu gặp `Unable to locate package openjdk-17`, launcher sẽ tự thử `openjdk-21` và `openjdk`. Nếu cả ba package đều không có, kiểm tra mirror:

```bash
pkg search openjdk
termux-change-repo
pkg update -y
```

Sau đó chạy lại one-command installer. Log chi tiết các lần thử nằm tại:

```bash
cat ~/ngocrong-termux/.runtime/java-install.log
```

### `/tmp/...: Permission denied`

Launcher không còn ghi log Java vào `/tmp`. Log cài Java được lưu tại `.runtime/java-install.log`, còn log game nằm tại `.runtime/server.log`.

### Lỗi JDBC collation

Nếu log có `com.mysql.jdbc.ConnectionImpl.buildCollationMapping` hoặc `TreeMap.put`, hãy cập nhật archive mới để nhận MariaDB Connector/J 3.5.10 và cấu hình `org.mariadb.jdbc.Driver`:

```bash
cd ~/ngocrong-termux && bash nro.sh stop
# chạy lại one-command installer ở phần Cài đặt một lệnh
```

### Thiếu asset map

Nếu gặp `FileNotFoundException: data/map/tile_set_info`, nguyên nhân thường là file bị đặt sai chữ hoa/thường như `tile_set_Info`. Archive mới đã chuẩn hóa tên đúng. Kiểm tra:

```bash
ls -l ~/ngocrong-termux/data/map/tile_set_info
```

### Server timeout khi chờ READY

Nếu quá 180 giây chưa có `READY`, xem log cuối:

```bash
cd ~/ngocrong-termux && tail -n 160 .runtime/server.log
```

Nếu server dừng ngay khi khởi động, chạy foreground để xem stack trace đầy đủ:

```bash
cd ~/ngocrong-termux && bash nro.sh console
```

### Panel không khởi động được

Game server không bị dừng nếu panel lỗi. Hãy xem `.runtime/panel.log`; nếu thiếu Node.js/npm, chạy `pkg install -y nodejs`, rồi chạy `bash nro.sh panel`. Nếu panel build lỗi do dependency, xóa riêng `panel/api/node_modules` và `panel/web/node_modules`, sau đó chạy lại `bash nro.sh panel`; không xóa `.runtime/` vì thư mục này chứa mật khẩu panel, trạng thái import và log.

### SQL bị import lại

SQL chỉ được import khi chưa có marker `.runtime/sql-imported.sha256`. Cơ chế này tránh `DROP TABLE` và import lại mỗi lần restart. Không xóa `.runtime/` hoặc data directory nếu chưa chủ động sao lưu database.

## 🗂️ Cấu trúc repository

```text
Ngoc-rong-Termux-Offline/
├── assets/
│   └── ngocrong-world.jpg       # Banner gameplay README
├── data/                        # Map, item, mob, NPC và game assets
├── lib/                         # JAR runtime, gồm MariaDB Connector/J 3.5.10
├── panel/                       # API Node.js + React web panel, tự build/start trên Termux
├── sql/
│   └── ngocrong.sql             # Schema + dữ liệu game
├── src/                         # Java source
├── Config.properties.example    # Cấu hình mẫu không chứa mật khẩu
├── bootstrap.sh                 # Bootstrap archive public
├── backup-database.sh           # Xuất database online, nén, checksum và retention
├── nro.sh                       # Launcher setup/start/lan/stop/backup/schedule
├── termux-lan-start.sh          # Khởi động server LAN trên Android bằng một lệnh
├── termux-server-service.sh     # Supervisor chạy độc lập và tự phục hồi
├── install-termux-background.sh # Cài hook Termux:Boot
├── TERMUX-LAN.md                # Hướng dẫn LAN, chạy nền và xử lý lỗi
└── README.md                    # Tài liệu triển khai này
```

## 📊 Kiểm thử và thông số

| Hạng mục | Kết quả |
|---|---:|
| Java source | 550 tệp, biên dịch với `javac --release 17 -proc:none` |
| Database schema | 53 bảng, 9.097 lệnh insert đã kiểm tra |
| MariaDB JDBC | Connector/J 3.5.10 mở connection thành công tới MariaDB 10.11 |
| Hikari/LocalManager | Lấy connection thành công với `jdbc:mariadb://` |
| Map asset | `data/map/tile_set_info` tồn tại, đúng case và có trong branch `main` |
| Readiness | `ServerManager` tạo `.runtime/server.ready` sau khi hoàn tất startup |
| Runtime | Dữ liệu game khoảng 963 MB; cần tối thiểu khoảng 2–3 GB trống để tải/giải nén/build |
| LAN Android | `./nro.sh lan` tự nhận IP Wi‑Fi, bind game `0.0.0.0:14445`, panel `0.0.0.0:3001` |
| Panel | API + React production dùng cổng 3001, PID/log riêng; tự khởi động sau game server |

Các kiểm thử trong sandbox không thay thế kiểm thử trực tiếp trên từng thiết bị Android. Kết quả thực tế còn phụ thuộc phiên bản Termux, mirror package, kiến trúc CPU, dung lượng trống, RAM và chính sách Android đối với tiến trình nền.

## ⚠️ Lưu ý vận hành

Mã nguồn, dữ liệu game, hình ảnh và nội dung SQL trong repository có thể thuộc các chủ sở hữu khác nhau. Người triển khai cần tự xác minh quyền sử dụng, quyền phát hành và điều khoản của client trước khi công khai repository hoặc mở server cho người khác.

Không commit mật khẩu, token, private key hoặc dữ liệu người chơi thật. Không nên đặt `Xmx` cao hơn RAM thực tế còn trống; Android có thể thu hồi tiến trình Termux khi chạy nền lâu.

## 🔗 Nguồn và tài liệu

- [Repository GitHub](https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline)
- [MariaDB Connector/J](https://mariadb.com/docs/connectors/mariadb-connector-j/about-mariadb-connector-j)
- [MariaDB Java Client trên Maven Central](https://central.sonatype.com/artifact/org.mariadb.jdbc/mariadb-java-client)
- [GitHub Repository Limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits)
- [Gói mã nguồn Google Drive](https://drive.google.com/file/d/1-kbG0JBo67gPBiKaTMU-1QI1wM4u_8ow/view?usp=drivesdk)
- [File SQL Google Drive](https://drive.google.com/file/d/10gjlN69CMH9sW7ful1cc5lx5PTncm_-I/view?usp=drivesdk)

---

<div align="center">

**Ngọc Rồng Online — Termux Edition**

Java server · MariaDB · Android · One-command setup · READY-state startup

</div>
