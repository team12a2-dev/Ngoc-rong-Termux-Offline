# Ngọc Rồng Online – Termux launcher

Repository này đóng gói mã nguồn Java Ngọc Rồng Online từ gói `cc2.rar` và cơ sở dữ liệu `ngocrong10.06.sql` do người dùng cung cấp. Mục tiêu của bản triển khai là chạy **game server Java và MariaDB cục bộ trên Android/Termux** bằng một launcher duy nhất. Nguồn ban đầu được tải từ [gói mã nguồn Google Drive](https://drive.google.com/file/d/1-kbG0JBo67gPBiKaTMU-1QI1wM4u_8ow/view?usp=drivesdk) và [file SQL Google Drive](https://drive.google.com/file/d/10gjlN69CMH9sW7ful1cc5lx5PTncm_-I/view?usp=drivesdk).

> **Lệnh vận hành chính:** sau khi clone repository, chạy `bash nro.sh`. Lần đầu lệnh này tự cài dependency, khởi tạo MariaDB, tạo database `ngocrong`, import SQL, biên dịch Java và khởi động server. Những lần sau cùng lệnh đó chỉ khởi động server đã setup.

## Thành phần đã được chuẩn hóa

| Thành phần | Trạng thái | Mô tả |
|---|---:|---|
| Mã Java | Đã kiểm tra | 550 tệp nguồn, entry point `nro.models.server.ServerManager`, target Java 17 |
| Thư viện | Đã giữ lại | 13 JAR trong `lib/`, classpath được launcher ghép tự động |
| Dữ liệu game | Đã giữ lại | Khoảng 85.152 tệp trong `data/`, tổng dung lượng xấp xỉ 963 MB |
| SQL | Đã chuẩn hóa | `sql/ngocrong.sql`, 53 bảng và 9.097 lệnh insert được kiểm tra import |
| Database | Tự động | MariaDB cục bộ, mặc định database là `ngocrong` |
| Launcher | Đã viết mới | `nro.sh` hỗ trợ `setup`, `start`, `restart`, `stop`, `status`, `console`, `rebuild` |
| Cấu hình | An toàn hơn | `Config.properties` được tạo cục bộ từ `Config.properties.example` và bị Git bỏ qua |

Repository không đưa `build/`, `dist/`, `node_modules/`, log, backup hoặc cấu hình mật khẩu vào Git. Việc loại bỏ các artefact này làm giảm kích thước clone và tránh phát hành thông tin cục bộ. GitHub áp dụng giới hạn 100 MB cho một Git object và khuyến nghị repository không vượt quá 10 GB trên đĩa; vì vậy các file runtime/build không nên commit vào repository.[^1]

## Cài đặt trên Termux

Hãy dùng Termux từ nguồn đáng tin cậy, cấp quyền bộ nhớ nếu cần, rồi chạy đúng **một lệnh** sau. Vì repository đang public, lệnh này không yêu cầu GitHub username/password.

```bash
pkg update -y && pkg install -y curl tar && mkdir -p "$HOME/ngocrong-termux" && curl -fL --retry 3 "https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/archive/refs/heads/main.tar.gz" | tar -xz --strip-components=1 -C "$HOME/ngocrong-termux" && cd "$HOME/ngocrong-termux" && bash nro.sh
```

Lệnh trên tải archive public trực tiếp từ GitHub, giải nén vào `~/ngocrong-termux`, rồi gọi `bash nro.sh`. Lệnh `bash nro.sh` sẽ tự nhận diện đây là lần cài đầu. Khi khởi động, launcher chờ marker `.runtime/server.ready` được Java server tạo sau khi tải xong database, map, item, mob, NPC và các service; vì vậy dòng `Server đã READY` mới là mốc server sẵn sàng, không chỉ là mốc PID Java đã tồn tại. Launcher cài `git`, `mariadb` và tự thử các package Java theo thứ tự `openjdk-21`, `openjdk-17`, `openjdk`, khởi tạo data directory MariaDB trong `$PREFIX/var/lib/mysql`, khởi động database qua Unix socket, tạo database `ngocrong`, tạo user nội bộ ngẫu nhiên, import `sql/ngocrong.sql`, biên dịch Java 17 và chạy server nền. Java 21 vẫn tương thích vì mã nguồn được biên dịch với `javac --release 17`. Termux sử dụng mô hình quản lý gói kiểu `apt/pkg`; gói MariaDB là lựa chọn phù hợp với SQL dump MySQL/MariaDB này.[^2]

Sau lần cài đầu, nếu chỉ muốn khởi động lại server, dùng đúng một lệnh:

```bash
cd ~/ngocrong-termux && bash nro.sh
```

## Các lệnh vận hành

| Lệnh | Chức năng |
|---|---|
| `bash nro.sh` hoặc `bash nro.sh start` | Tự setup nếu chưa có, sau đó start server nền |
| `bash nro.sh setup` | Chạy lại toàn bộ quy trình cài đặt/import/build; chỉ dùng khi làm mới môi trường |
| `bash nro.sh status` | Xem trạng thái `STARTING`, `READY` của game server và MariaDB |
| `bash nro.sh stop` | Dừng server game, không xóa dữ liệu database |
| `bash nro.sh restart` | Dừng rồi khởi động lại server |
| `bash nro.sh rebuild` | Biên dịch lại Java từ `src/` |
| `bash nro.sh console` | Chạy Java ở foreground để xem log trực tiếp |

SQL chỉ được import khi chưa có marker `.runtime/sql-imported.sha256`. Cơ chế này bảo vệ dữ liệu người chơi khỏi bị `DROP TABLE` và import lại mỗi lần start. Muốn tạo database mới hoàn toàn, hãy dừng server, xóa database hoặc data directory theo đúng chủ đích, rồi chạy lại `setup`.

## Cấu hình database và bộ nhớ

Mặc định launcher tạo database `ngocrong`, user `ngocrong`, host `127.0.0.1`, port `3306`, còn mật khẩu ngẫu nhiên được lưu trong `.runtime/db-password` với quyền file hạn chế. Java server nhận các giá trị tương ứng trong `Config.properties`; file này không được commit. Có thể ghi đè trước lần chạy bằng biến môi trường:

```bash
export NRO_DB_NAME=ngocrong
export NRO_DB_USER=ngocrong
export NRO_DB_PASSWORD='mat-khau-tu-chon'
export NRO_DB_PORT=3306
export NRO_GAME_PORT=14445
bash nro.sh
```

Launcher mặc định dùng cấu hình JVM tiết kiệm RAM cho Android: `Xms64m`, `Xmx1024m` và G1GC. Nếu điện thoại có nhiều RAM hơn, có thể truyền tham số riêng:

```bash
NRO_JVM_OPTS='-server -Dfile.encoding=UTF-8 -Xms128m -Xmx1536m -XX:MaxMetaspaceSize=192m -Xss512k -XX:+UseG1GC' bash nro.sh restart
```

Không nên đặt `Xmx` cao hơn phần RAM thực tế còn trống trên điện thoại. Khi Android thu hồi tiến trình Termux, server có thể dừng; đây là giới hạn của việc host game trực tiếp trên thiết bị di động, không phải lỗi compile.

## Cấu hình để máy khác kết nối

Mặc định `server.ip=127.0.0.1` nhằm tránh mở server ra mạng ngoài. Để client trong cùng mạng Wi-Fi kết nối, sửa `server.ip` và dòng `server.sv1` trong `Config.properties` thành địa chỉ LAN của điện thoại, ví dụ `192.168.1.25`, đồng thời cho phép cổng game `14445` trên mạng nội bộ. Không nên mở cổng này trực tiếp ra Internet nếu chưa có firewall, xác thực và biện pháp chống lạm dụng.

Khi dùng mạng di động, địa chỉ IP thường bị NAT nên thiết bị khác không thể kết nối trực tiếp. Có thể cần VPN mesh hoặc một máy chủ trung gian; phần đó nằm ngoài launcher Termux hiện tại.

## Kiểm thử đã thực hiện

Bản triển khai đã được kiểm tra trong môi trường Linux tương đương runtime Java/MariaDB của Termux. Toàn bộ 550 file Java biên dịch thành công bằng `javac --release 17 -proc:none`. SQL import thành công với 53 bảng, trong đó các bảng kiểm tra có 3 account, 2.001 item template và 169 map template. Smoke test đã khởi động `ServerManager` ở chế độ nền và xác nhận PID server còn sống; lỗi đọc stdin khi chạy `nohup` đã được sửa bằng điều kiện `Scanner.hasNextLine()`.

Kết quả trên sandbox không thay thế kiểm thử trực tiếp trên từng thiết bị Android. Các khác biệt thường gặp gồm phiên bản Termux, dung lượng trống, kiến trúc CPU, quyền truy cập bộ nhớ và mức RAM còn trống.

## Xử lý sự cố

Nếu gặp lỗi không tìm thấy package Java, chạy `pkg search openjdk`. Nếu kho không liệt kê package nào, chạy `termux-change-repo`, chọn một mirror Main ổn định, rồi chạy `pkg update -y && bash nro.sh`. Launcher mới sẽ tự thử `openjdk-21`, `openjdk-17` và `openjdk`. Nếu MariaDB không khởi động, xem log bằng `tail -n 100 .runtime/mariadb.log`; kiểm tra port `3306` có bị dịch vụ khác chiếm hay không và đặt `NRO_DB_PORT` sang cổng khác.

Nếu server đang ở trạng thái `STARTING`, theo dõi tiến độ bằng `tail -f .runtime/server.log` hoặc chạy `bash nro.sh status`. Nếu quá 180 giây không có `READY`, xem 160 dòng cuối bằng `tail -n 160 .runtime/server.log`. Nếu server chạy nhưng client không kết nối, kiểm tra `server.port`, `server.ip`, `server.sv1`, địa chỉ LAN của điện thoại và firewall/router. Nếu server bị dừng ngay, dùng `bash nro.sh console` để xem stack trace đầy đủ thay vì chạy nền.

Nếu cần biên dịch lại sau khi cập nhật source từ Git, dùng:

```bash
git pull --ff-only
NRO_REBUILD=1 bash nro.sh rebuild
bash nro.sh restart
```

## Ghi chú về panel

Mã nguồn gốc có `panel/` gồm API Node.js và web frontend. Bản launcher một lệnh ưu tiên game server Java + MariaDB để giảm RAM và số lượng dịch vụ trên Android. Panel không được khởi động tự động trong `nro.sh`; có thể phát triển thêm một profile `--panel` sau khi xác nhận thiết bị có đủ RAM và người dùng muốn dùng giao diện quản trị. Các script `.bat` Windows từ gói gốc không được sử dụng trong Termux.

## Bản quyền và trách nhiệm vận hành

Mã nguồn, dữ liệu game, hình ảnh và nội dung SQL trong repository có thể thuộc các chủ sở hữu khác nhau. Người triển khai cần tự xác minh quyền sử dụng, quyền phát hành và điều khoản của client trước khi công khai repository hoặc mở server cho người khác. Không commit mật khẩu, token, private key hoặc dữ liệu người chơi thật.

## Tài liệu tham khảo

[^1]: [GitHub Docs – Repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits), nêu giới hạn 100 MB cho một Git object, giới hạn push 2 GB và khuyến nghị quản lý binary lớn bằng Git LFS.
[^2]: [Termux Wiki – Package Management](https://wiki.termux.com/wiki/Package_Management) và [Termux Wiki – MariaDB](https://wiki.termux.com/wiki/MariaDB), tham khảo mô hình package và MariaDB trên Termux.
