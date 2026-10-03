# HƯỚNG DẪN SỬ DỤNG TOOL ĐỔI ID & TẠO Ô (PART & FLAG_BAG)

## 1. Khởi động Tool
- **Cách 1 (Nhanh nhất - 1 Click):** Nhấp đúp vào file `Mo_Tool_Part.bat` ở thư mục gốc của server.
- **Cách 2:** Mở trình duyệt web truy cập địa chỉ:
  `http://localhost/tool_part`

---

## 2. Tính năng: Đổi ID Hàng Loạt (Hỗ trợ cả Flag_Bag & Part - KHÔNG CAN THIỆP DB)
> **Đặc điểm:** Hoạt động hoàn toàn trên trình duyệt, **tuyệt đối KHÔNG ghi đè hay can thiệp vào Database XAMPP**.

### Áp dụng cho Flag_Bag (Cờ đeo lưng):
1. Copy khối dữ liệu Flag_Bag từ phpMyAdmin/bảng text:
   ```text
   149	14987,14988,14990,14991,14992	Đeo lưng Kẹo Noel	-1	-1	14532
   150	14635,14636,14637,14638,14639,14640...	Bóng sinh nhật NRO	-1	-1	14646
   ...
   181	17089,17090,17091,17092	Cờ World Cup 2026	-1	-1	17093
   ```
2. Dán vào ô bên trái: Tool tự động nhận diện:
   - **ID đầu tiên:** `149`
   - **Loại:** `🎒 Flag_Bag` (33 dòng)
3. Nhập **ID MỚI muốn đổi thành** (Ví dụ: `182` hoặc `200`):
4. Tool sẽ trả lại kết quả đúng y như lúc đầu với các ID mới tăng dần ở khung bên phải:
   ```text
   182	14987,14988,14990,14991,14992	Đeo lưng Kẹo Noel	-1	-1	14532
   183	14635,14636,14637,14638,14639,14640...	Bóng sinh nhật NRO	-1	-1	14646
   ...
   ```
5. Bấm nút:
   - **📋 Sao Chép Kết Quả:** Copy toàn bộ để dán vào phpMyAdmin/Notepad.
   - **💾 Sao Chép SQL INSERT:** Sinh sẵn câu lệnh `INSERT INTO flag_bag ...` chuẩn 100%.

---

### Áp dụng cho Part (Đầu / Áo / Quần):
Cũng dán tương tự:
```text
1954	0	[[2955,0,0],[2955,0,0],[2955,0,0]]
1955	1	[[2955,0,0],[16661,-1,1],...]
1956	2	[[16667,7,7],[16662,1,7],...]
```
Nhập ID mới (Ví dụ: `1880`) ➔ Sinh ra kết quả bắt đầu từ `1880`, `1881`, `1882`...

---

## 3. Tính năng: Tạo Ô Tự Động (Tab 2)
- Có thể chọn tạo cho **🎒 Flag_Bag** hoặc **🥋 Part**.
- Nhập ID bắt đầu và số lượng ô cần tạo.
- Tự động sinh danh sách text và câu lệnh SQL.
