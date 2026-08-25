# Chạy Ngọc Rồng qua mạng LAN trên Termux Android

## Mô hình

Điện thoại Android chạy Termux sẽ đóng vai trò game server và MariaDB cục bộ. Máy Android hoặc PC khác kết nối cùng mạng Wi‑Fi sẽ dùng địa chỉ IPv4 của điện thoại để vào game.

| Dịch vụ | Địa chỉ mặc định | Vai trò |
|---|---:|---|
| Game server | `IP_ANDROID:14445` | Client game kết nối vào đây. |
| Web panel | `http://IP_ANDROID:3001` | Quản trị boss, player, runtime và cấu hình. |
| MariaDB | `127.0.0.1:3306` | Chỉ dùng nội bộ trên điện thoại, không mở ra LAN. |

## Cài đặt lần đầu

Cài Termux từ nguồn đáng tin cậy và cấp quyền mạng cho ứng dụng. Trong Termux, clone repository rồi chạy:

```bash
pkg update -y
pkg install -y git
cd ~
git clone https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline.git
cd Ngoc-rong-Termux-Offline
chmod +x nro.sh termux-lan-start.sh
./nro.sh setup
```

Lệnh `setup` cài Java/JDK, MariaDB và Node.js nếu thiếu, khởi tạo database, build Java server và build web panel. Thông tin mật khẩu database và panel được lưu trong thư mục `.runtime`; không chia sẻ các file này.

## Khởi động LAN

Kết nối điện thoại server và thiết bị chơi vào **cùng một mạng Wi‑Fi**, sau đó chạy:

```bash
cd ~/Ngoc-rong-Termux-Offline
./termux-lan-start.sh
```

Hoặc dùng trực tiếp:

```bash
./nro.sh lan
```

Script sẽ tự tìm IPv4 của Android, cập nhật `Config.properties`, đặt `server.ip` cho client, bind socket game trên `0.0.0.0`, khởi động MariaDB/game server/panel và in ra endpoint LAN. Ví dụ:

```text
Game endpoint LAN  : 192.168.1.37:14445
Panel URL LAN      : http://192.168.1.37:3001
```

Nếu điện thoại có nhiều interface hoặc tự nhận sai địa chỉ, chỉ định IP Wi‑Fi:

```bash
NRO_LAN_IP=192.168.1.37 ./nro.sh lan
```

Không dùng `127.0.0.1` hoặc `localhost` trên client khác; đó là địa chỉ trỏ về chính thiết bị đang chạy client.

## Cấu hình client game

Trong client, server cần trỏ tới:

```text
IP_ANDROID:14445
```

Nếu client sử dụng danh sách server từ `server.sv1`, script LAN đã tự ghi giá trị dạng:

```properties
server.sv1=NRO LAN:192.168.1.37:14445:0,0,0
```

Khi router cấp IP mới cho điện thoại, chạy lại `./nro.sh lan` và khởi động lại server để cập nhật địa chỉ quảng bá.

## Mở web panel từ thiết bị khác

Trên Chrome Android/PC cùng Wi‑Fi, mở:

```text
http://IP_ANDROID:3001
```

Ví dụ `http://192.168.1.37:3001`. Mật khẩu admin được lưu tại:

```text
.runtime/panel-admin-password
```

Panel API vẫn kiểm tra JWT/RBAC; các thao tác nguy hiểm và cấu hình boss yêu cầu permission tương ứng.

## Kiểm tra lỗi kết nối

Trên Termux chạy:

```bash
./nro.sh status
ip -o -4 addr show scope global
ss -ltnp | grep -E '14445|3001'
```

Cần thấy game server bind trên `0.0.0.0:14445` và panel Node bind trên `0.0.0.0:3001`. Từ thiết bị client, kiểm tra ping tới IP Android; nếu Android không trả lời ping, vẫn có thể thử mở TCP bằng trình duyệt panel.

Nếu không kết nối được, kiểm tra năm điểm: hai thiết bị có thực sự cùng Wi‑Fi hay không; router có bật AP/client isolation hay không; VPN/hotspot có thay đổi subnet hay không; IP có bị đổi sau khi điện thoại ngủ hay không; và server log tại `.runtime/server.log` có báo bind hoặc database lỗi hay không.

Một số mạng khách sạn, trường học hoặc hotspot chặn thiết bị trong cùng mạng nhìn thấy nhau. Khi đó hãy dùng Wi‑Fi gia đình hoặc tắt AP isolation trên router. Không cần mở port trên Internet và không nên bind MariaDB ra LAN.

## Chạy nền trên Android

Để hạn chế Android dừng Termux, script tự gọi `termux-wake-lock` nếu lệnh có sẵn. Có thể khóa Termux khỏi màn hình Recent Apps và tắt tối ưu pin cho Termux trong cài đặt Android. Server vẫn cần điện thoại bật nguồn, kết nối Wi‑Fi ổn định và không bị hệ điều hành cưỡng chế dừng.

Dừng dịch vụ an toàn bằng:

```bash
./nro.sh stop
termux-wake-unlock 2>/dev/null || true
```

## Bảo mật

Chỉ dùng chế độ này trong mạng tin cậy. Không forward cổng `14445`, `3001` hoặc `3306` ra Internet. Đổi `panel.agent.key`, giữ kín mật khẩu panel/database và không commit `Config.properties`, `.runtime` hoặc file chứa secret lên GitHub.
