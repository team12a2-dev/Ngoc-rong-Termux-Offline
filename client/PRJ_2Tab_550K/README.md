# Ngọc Rồng Online — Unity Client

Đây là project client Unity đi kèm mã nguồn game server trong repository.

- **Unity Editor:** `2022.3.62f2`
- **Project path:** `client/PRJ_2Tab_550K`
- **Assets:** tài nguyên hình ảnh, âm thanh, map và mã C# client trong thư mục `Assets/`
- **Packages:** manifest Unity trong `Packages/`

## Mở project

1. Cài Unity Hub và Unity `2022.3.62f2`.
2. Mở Unity Hub → **Add** → chọn thư mục `client/PRJ_2Tab_550K`.
3. Mở project và chờ Unity tái tạo thư mục `Library` cục bộ.
4. Chọn cấu hình build Android/Windows phù hợp trong **Build Settings**.

Thư mục `Library`, `Logs` và `UserSettings` không được đưa lên GitHub vì đây là cache/trạng thái máy phát triển; Unity sẽ tự tạo lại khi mở project.

Client đã được cấu hình mặc định tới `127.0.0.1:14445`, tương thích với `server.listen.host=0.0.0.0` và `server.port=14445` của server Java. Địa chỉ này chỉ đúng khi client và server chạy trên cùng thiết bị. Nếu chạy client trên thiết bị khác trong LAN, đổi `Management.IpServer` sang IP LAN của Termux rồi build lại client.
