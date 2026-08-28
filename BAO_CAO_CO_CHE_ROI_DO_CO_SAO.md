# Báo cáo cơ chế rơi đồ có sao và đục lỗ

## Phạm vi

Báo cáo phân tích mã nguồn repository `team12a2-dev/Ngoc-rong-Termux-Offline`, tập trung vào option sao pha lê và các luồng rơi/ép/cường hóa trang bị.

## Kết luận nhanh

Trong source này, **đồ có sao khi rơi** không xuất phát từ một cơ chế chung duy nhất. Có hai nhóm chính:

| Nhóm | Cơ chế | Trạng thái trong source |
|---|---|---|
| Quái thường tại map Cold | Roll `1/100000`, sau đó gọi `randDoTL`, tạo đồ Thần Linh nhưng **không gắn option 107** | Đang hoạt động tại `Mob.java:1352-1363` |
| Boss cụ thể | Script reward tự tạo `ItemMap`, sau đó gắn `option 107` với số sao | Ví dụ Baby: 30% đồ Thần Linh; nhánh còn lại 70% đồ custom có 0/1/2 sao |
| Một số đoạn rơi đồ sao trong Mob | Có logic 1/2 hoặc tỷ lệ khác, nhưng toàn bộ đoạn đang comment | Không có hiệu lực khi chạy |

Vì vậy, nếu câu hỏi là “quái thường rơi đồ có sao không”, đoạn đang hoạt động trong `Mob.java` chỉ rơi đồ Thần Linh; đồ được tạo bởi `randDoTL` không thêm option 107. Đồ có sao rõ ràng nhất hiện nằm trong các script boss.

## 1. Ý nghĩa các option

| Option | Ý nghĩa thực tế trong source |
|---|---|
| `107` | Số lỗ/sức chứa sao pha lê của trang bị; khi rơi boss, source dùng nó để biểu diễn số sao/lỗ ban đầu |
| `102` | Số sao pha lê đã ép vào trang bị |
| `228` | Trạng thái lỗ thứ 8/9 sau khi cường hóa |
| `218` | Marker phụ được thêm trong quy trình cường hóa lỗ cao |

`CombineSystem.isTrangBiPhaLeHoa()` cho phép trang bị loại `template.type < 5` hoặc `type == 32` tham gia pha lê hóa. [1]

## 2. Rơi đồ từ quái thường

Trong `Mob.java:1352-1371`, chỉ khi bản đồ là map Cold, server xử lý đồ Thần Linh. Nếu người giết là pet, phần thưởng quy về chủ pet. Roll rơi đồ là:

```java
if (Util.isTrue(1, 100000)) {
    ItemMap it = ItemService.gI().randDoTL(this.zone, 1, x, yEnd, player.id);
    list.add(it);
}
```

Như vậy tỷ lệ là **1/100.000 mỗi lần quái chết**, tương đương 0,001%, với điều kiện map thuộc nhóm Cold. [2]

`randDoTL()` chọn một ID đồ Thần Linh theo các nhánh xác suất tuần tự trong `ItemService.java:830-849`. Do cách viết là nhiều lần roll nối tiếp, các tỷ lệ thực tế xấp xỉ như sau:

| Nhóm đồ | Xác suất thực tế xấp xỉ |
|---|---:|
| Nhẫn | 20,00% |
| Găng | 20,00% |
| Quần | 27,00% |
| Áo | 24,75% |
| Giày | 8,25% |

Các comment trong source ghi 10/15/20/30/25%, nhưng **không khớp với code** vì mỗi `else if` lại roll độc lập. Đây là điểm cần lưu ý khi chỉnh tỷ lệ. [3]

Hàm `randDoTL()` tạo stat chính theo ID, có `tiLe = Util.nextInt(100, 115)`, nghĩa là 100–115 inclusive. Nếu `tiLe > 100`, nó thêm option 206 với param `tiLe - 100`; có 30% cơ hội thêm option 86 hoặc 87, rồi thêm option 21 với param 15–17. Hàm này **không thêm option 107**, nên đồ Thần Linh từ nhánh Mob Cold không tự có sao/lỗ theo code hiện tại. [3]

Các đoạn “Đồ Sao Khác Vải Thô” và “Đồ Sao 3 Map Đầu” ở `Mob.java:1270-1349` có logic rơi đồ sao, nhưng đang bị comment toàn bộ. Do đó chúng không chạy nếu không bỏ comment và biên dịch lại. [2]

## 3. Rơi đồ có sao từ boss

Ví dụ `Baby.reward()` có hai nhánh:

| Nhánh | Tỷ lệ | Kết quả |
|---|---:|---|
| Gọi `randDoTLBoss()` | 30% | Rơi đồ Thần Linh |
| Tạo đồ custom | 70% | Chọn ngẫu nhiên một ID trong danh sách 13 item và gắn option 107 |

Ở nhánh custom, option 107 được phân bổ:

| Số sao/lỗ ban đầu | Điều kiện | Tỷ lệ |
|---|---|---:|
| 0 | `rd < 70` | 70% |
| 1 | `70 <= rd < 95` | 25% |
| 2 | `rd >= 95` | 5% |

Do nhánh custom chiếm 70% tổng reward, xác suất tổng hợp ở boss Baby là **49% nhận đồ custom 0 sao, 17,5% nhận đồ custom 1 sao và 3,5% nhận đồ custom 2 sao**; 30% còn lại là đồ Thần Linh từ `randDoTLBoss()`. Boss Cooler và Cumber dùng cùng mẫu 30%/70% và phân bổ 70/25/5. [4] [5]

`randDoTLBoss()` thực tế tạo stat tương tự `randDoTL()` và cũng không gắn option 107. Vì vậy nhánh 30% đồ Thần Linh của Baby không mặc nhiên là đồ có sao. [6]

Một số boss khác gắn option 107 trực tiếp với cách chọn khác, chẳng hạn `Baby/B.java` dùng `Util.nextInt(3, 4)`, tức số nguyên từ 3 đến 4 inclusive. Điều này cho thấy tỷ lệ và số sao ban đầu phụ thuộc từng script boss, không có một bảng drop toàn server duy nhất. [7]

## 4. Ép sao vào trang bị

`PhaLeHoaTrangBi.java` dùng `option 107` để đọc số sao/lỗ hiện tại. Giới hạn thông thường là `CombineService.MAX_STAR_ITEM = 8`. [8]

Điểm quan trọng là UI hiển thị tỷ lệ giả từ `getFakeRatio()`, còn roll thực tế dùng `getRatio()`:

| Sao hiện tại | Tỷ lệ hiển thị | Tỷ lệ roll thực tế |
|---:|---:|---:|
| 0 | 50% | 30% |
| 1 | 20% | 10% |
| 2 | 10% | 5% |
| 3 | 5% | 2% |
| 4 | 2% | 1% |
| 5 | 5% | 0,7% |
| 6 | 3% | 0,5% |
| 7 | 2% | 0,1% |
| 8 | 1% | 0,1% |

Roll thực tế nằm tại `Util.isTrue(baseRatio, 100)`. Với tỷ lệ nhỏ hơn 1, `Util.isTrue(float, ...)` nhân cả tỷ lệ và mẫu số lên 100; do đó 0,7% và 0,1% được xử lý theo độ chính xác phần trăm thập phân. [9] [10]

Mỗi lần thử sẽ trừ vàng/ngọc trước khi roll. Khi thành công, code tăng option 107 lên 1; nếu chưa có option 107 thì tạo mới. Khi thất bại, chỉ phát hiệu ứng/thông báo thất bại, không tăng sao. [8]

## 5. Ép sao pha lê vào lỗ

`EpSaoTrangBi.java` đọc:

```java
option 102 -> star       // số sao đã ép
option 107 -> starEmpty  // số lỗ/sức chứa
```

Điều kiện chính là `star < starEmpty`; nếu số sao đã ép bằng hoặc vượt số lỗ thì không thể ép thêm. Sau khi ép thành công, option 102 tăng 1. Với slot thứ 8 hoặc 9, option stat được thêm thành option riêng thay vì cộng dồn, nhằm giữ dữ liệu slot nâng cao tách biệt. [11]

## 6. Cường hóa lỗ thứ 8/9

`CuongHoaLoSaoPhaLe.java` yêu cầu ba vật phẩm: một trang bị hợp lệ, Hematite ID 1423 và Dùi Đục ID 1438. Trang bị phải có ít nhất 7 sao/lỗ theo option 107. Chi phí là **500.000.000 vàng**. [12]

Source hiển thị tỷ lệ 50%, nhưng logic hiện tại có điểm bất thường:

```java
boolean success = Util.isTrue(50, 200); // 25%, không phải 50%
```

Vì `Util.isTrue(50, 200)` chọn một số trong [0,199] và kiểm tra nhỏ hơn 50, tỷ lệ thực tế là **25%**, trong khi giao diện ghi 50%. Hơn nữa, với `star == 8`, biến `success` được tạo nhưng không được dùng để quyết định; code mở/gắn option 228 lên 8 ngay. Với `star == 9` và `option 228 == 8`, roll 25% mới được dùng để nâng `option 228` lên 9. [12] [10]

| Trạng thái | Kết quả theo code |
|---|---|
| Trang bị có 7 sao, chưa có marker 228 | Có thể đi vào nhánh cường hóa; nếu `star < 8` thì bị từ chối bởi điều kiện sau |
| Trang bị có 8 sao, chưa có 228 | Gắn option 228 = 8; hiện tại không kiểm tra biến `success`, nên thực tế luôn thành công |
| Trang bị có 9 sao, `228 == 8` | Roll `Util.isTrue(50,200)` = 25%; thành công thì 228 = 9 |
| Trang bị có 9 sao, chưa có 228 nhưng `102 == 7` | Gắn 228 = 8 theo nhánh đặc biệt |
| `228 >= 9` | Không cường hóa thêm |

## 7. Các vấn đề nên sửa nếu muốn cơ chế nhất quán

Thứ nhất, cần quyết định option 107 có nghĩa là “số sao/lỗ tối đa” hay “sao đang có”. Source hiện dùng nó cho cả hai ngữ cảnh: boss gắn 107 như số sao ban đầu, còn `EpSaoTrangBi` dùng 107 làm sức chứa lỗ và 102 làm số sao đã ép. Nên đổi tên biến và chú thích để tránh nhầm.

Thứ hai, nếu muốn tỷ lệ cường hóa là 50%, phải đổi `Util.isTrue(50, 200)` thành `Util.isTrue(50, 100)` hoặc một biểu thức tương đương. Nếu muốn 25%, cần sửa text UI từ 50% thành 25%.

Thứ ba, nếu muốn lỗ thứ 8 cũng có xác suất, phải đặt điều kiện `if (success)` bao quanh phần gắn option 228. Hiện tại roll được tạo nhưng bị bỏ qua ở nhánh `star == 8`.

Thứ tư, cần sửa các comment tỷ lệ trong `randDoTL()` hoặc viết lại thành một roll duy nhất theo trọng số, vì tỷ lệ trong comment không phải tỷ lệ thực tế của chuỗi `else if` hiện tại.

## References

[1]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/combine/CombineSystem.java "CombineSystem.java"
[2]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/mob/Mob.java "Mob.java"
[3]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/services/ItemService.java "ItemService.java"
[4]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/boss/Baby/Baby.java "Baby.java"
[5]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/boss/Cold/Cooler.java "Cooler.java"
[6]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/services/ItemService.java "ItemService.java - randDoTLBoss"
[7]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/boss/Baby/B.java "B.java"
[8]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/combine/PhaLeHoaTrangBi.java "PhaLeHoaTrangBi.java"
[9]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/utils/Util.java "Util.java"
[10]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/combine/CombineSystem.java "CombineSystem.java - limits and costs"
[11]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/combine/EpSaoTrangBi.java "EpSaoTrangBi.java"
[12]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/combine/CuongHoaLoSaoPhaLe.java "CuongHoaLoSaoPhaLe.java"
