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
- [Cấu hình database và JVM](#-cấu-hình-database-và-jvm)
- [Kết nối từ thiết bị khác](#-kết-nối-từ-thiết-bị-khác)
- [Trạng thái khởi động](#-trạng-thái-khởi-động)
- [Xử lý sự cố](#-xử-lý-sự-cố)
- [Cấu trúc repository](#-cấu-trúc-repository)
- [Kiểm thử và thông số](#-kiểm-thử-và-thông-số)
- [Lưu ý vận hành](#-lưu-ý-vận-hành)

## 🌌 Tổng quan

Repository này đóng gói server Java Ngọc Rồng Online từ mã nguồn `cc2.rar` và cơ sở dữ liệu SQL do người dùng cung cấp. Bản Termux Edition ưu tiên **game server Java + MariaDB cục bộ**, phù hợp với thiết bị Android có đủ dung lượng và RAM. Panel Node.js trong mã nguồn gốc không được bật mặc định để giảm mức tiêu thụ tài nguyên.

Hình ảnh phía trên là banner gameplay mẫu của dự án. Tất cả dữ liệu game, hình ảnh và mã nguồn cần được người triển khai tự xác minh quyền sử dụng trước khi công khai hoặc mở server cho người khác.

## ✨ Điểm nổi bật

| Thành phần | Trải nghiệm triển khai |
|---|---|
| **One-command installer** | Tải archive public, cài dependency, setup database, build Java và chạy server mà không cần nhập GitHub username/password. |
| **Java fallback** | Tự thử `openjdk-21`, `openjdk-17`, rồi `openjdk` để phù hợp với các mirror Termux khác nhau. |
| **MariaDB-native JDBC** | Dùng MariaDB Connector/J 3.5.10 và `jdbc:mariadb://`, tránh lỗi collation của MySQL Connector/J 5.1 cũ. |
| **Database an toàn hơn** | Database mặc định là `ngocrong`; SQL chỉ import một lần với marker checksum để tránh ghi đè dữ liệu người chơi khi restart. |
| **Startup observable** | Phân biệt `STARTING` và `READY`, lưu log trong `.runtime/`, chờ marker readiness thay vì chỉ kiểm tra PID. |
| **Android case-safe assets** | Chuẩn hóa asset map `data/map/tile_set_info`, tránh lỗi phân biệt chữ hoa/thường trên Linux/Android. |
| **Runtime-friendly** | JVM mặc định giới hạn hợp lý cho điện thoại; hỗ trợ `status`, `stop`, `restart`, `console` và `rebuild`. |

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
| 8 | Sẵn sàng phục vụ | Xuất hiện dòng `[NRO][READY]` và marker `.runtime/server.ready` |

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
                       ▼
                 [NRO][READY]
```

## 🛠️ Vận hành server

| Lệnh | Chức năng |
|---|---|
| `bash nro.sh` | Tự setup nếu chưa có, sau đó chạy server nền |
| `bash nro.sh setup` | Chạy lại dependency/database/import/build theo chủ đích |
| `bash nro.sh start` | Khởi động server và chờ trạng thái `READY` |
| `bash nro.sh status` | Hiển thị `STARTING`, `READY` hoặc `STOPPED` cùng PID/MariaDB |
| `bash nro.sh stop` | Dừng server game, không xóa database |
| `bash nro.sh restart` | Dừng và khởi động lại server |
| `bash nro.sh console` | Chạy foreground để xem log trực tiếp |
| `bash nro.sh rebuild` | Biên dịch lại mã Java |

Theo dõi log trực tiếp:

```bash
cd ~/ngocrong-termux && tail -f .runtime/server.log
```

Kiểm tra trạng thái readiness:

```bash
cd ~/ngocrong-termux && bash nro.sh status
ls -l ~/ngocrong-termux/.runtime/server.ready
```

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

JVM mặc định dùng cấu hình tiết kiệm RAM:

```text
Xms64m · Xmx1024m · G1GC · MaxMetaspaceSize=160m
```

Nếu điện thoại có nhiều RAM hơn, có thể truyền JVM options riêng:

```bash
NRO_JVM_OPTS='-server -Dfile.encoding=UTF-8 -Xms128m -Xmx1536m -XX:MaxMetaspaceSize=192m -Xss512k -XX:+UseG1GC' bash nro.sh restart
```

## 🌐 Kết nối từ thiết bị khác

Mặc định server bind về `127.0.0.1` để không mở cổng ra mạng ngoài. Để client trong cùng Wi-Fi kết nối, sửa `server.ip` và dòng `server.sv1` trong `Config.properties` thành địa chỉ LAN của điện thoại, ví dụ `192.168.1.25`, đồng thời cho phép cổng game `14445` trong mạng nội bộ.

Không nên mở cổng game trực tiếp ra Internet khi chưa có firewall, xác thực và biện pháp chống lạm dụng. Với mạng di động, NAT của nhà mạng thường ngăn kết nối trực tiếp; có thể cần VPN mesh hoặc một máy chủ trung gian.

## 🟢 Trạng thái khởi động

| Trạng thái | Ý nghĩa | Cách kiểm tra |
|---|---|---|
| `STARTING` | Java còn đang tải database, map, item, mob, NPC hoặc service | `bash nro.sh status` |
| `READY` | Server đã tải xong dữ liệu và sẵn sàng nhận kết nối | Có `.runtime/server.ready` |
| `STOPPED` | Process Java không còn tồn tại | `bash nro.sh restart` |
| `MariaDB: RUNNING` | Database local đang phục vụ connection | `tail -n 100 .runtime/mariadb.log` |

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

### SQL bị import lại

SQL chỉ được import khi chưa có marker `.runtime/sql-imported.sha256`. Cơ chế này tránh `DROP TABLE` và import lại mỗi lần restart. Không xóa `.runtime/` hoặc data directory nếu chưa chủ động sao lưu database.

## 🗂️ Cấu trúc repository

```text
Ngoc-rong-Termux-Offline/
├── assets/
│   └── ngocrong-world.jpg       # Banner gameplay README
├── data/                        # Map, item, mob, NPC và game assets
├── lib/                         # JAR runtime, gồm MariaDB Connector/J 3.5.10
├── panel/                       # Panel gốc, không bật mặc định trên Termux
├── sql/
│   └── ngocrong.sql             # Schema + dữ liệu game
├── src/                         # Java source
├── Config.properties.example    # Cấu hình mẫu không chứa mật khẩu
├── bootstrap.sh                 # Bootstrap archive public
├── nro.sh                       # Launcher setup/start/stop/status
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
