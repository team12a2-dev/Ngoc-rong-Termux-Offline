# Kế hoạch phát triển cơ chế rơi đồ có lỗ sao theo cấp bản đồ

## 1. Mục tiêu

Xây dựng cơ chế rơi trang bị có lỗ sao trên toàn bộ bản đồ theo nguyên tắc: **map có quái yếu và cấp thấp rơi đồ 1–3 sao với xác suất tương đối dễ; map càng cao thì trang bị có chỉ số tốt hơn và có thể rơi nhiều sao hơn, nhưng tỷ lệ xuất hiện phải thấp hơn**. Cơ chế cần cấu hình được theo map, cấp quái, cấp nhân vật và loại trang bị, thay vì tiếp tục hard-code từng đoạn trong `Mob.java`.

## 2. Hiện trạng source cần lưu ý

Trong `MapService.isMapUpSKH(int mapId)`, nhóm map hiện được đánh dấu là `1, 2, 3`, `8, 9, 11` và `15, 16, 17`. Đây có thể xem là ba map đầu của ba hành tinh theo cách source đang quy ước; cần xác nhận lại tên map trong dữ liệu triển khai trước khi áp dụng chính thức. [1]

`Mob.java` hiện đã có hệ thống drop theo cấu hình map qua `MapDropConfigService`. Luồng này lấy rule theo `mapId`, kiểm tra mob, cấp nhân vật, khung giờ và `chance_percent`, sau đó tạo `ItemMap` và sao chép các option từ `options_json`. Đây là điểm mở rộng phù hợp nhất vì đã hỗ trợ reload cấu hình và không cần nhúng toàn bộ tỷ lệ vào code. [2]

Đoạn cũ có tiêu đề `Đồ Sao 3 Map Đầu` vẫn tồn tại tại `Mob.java:1311-1349`, nhưng đang comment. Đoạn này từng dự kiến roll 50% cơ hội tạo đồ, sau đó có 50% cơ hội gắn option 107; số sao được phân bổ 60% một sao, 30% hai sao, 10% ba sao. Đoạn này không nên chỉ bỏ comment để dùng lại, vì chỉ bao phủ một nhóm map, không phân tầng toàn server và không tận dụng cấu hình drop hiện có. [3]

## 3. Quy ước dữ liệu sao/lỗ

Cần thống nhất ý nghĩa trước khi triển khai. Theo các lớp combine hiện tại, option `107` đang được dùng như số lỗ/sức chứa sao pha lê, còn option `102` là số sao đã ép vào trang bị. Vì vậy, trong hệ thống drop mới, option `107` nên được gắn khi vật phẩm rơi ra để biểu thị **số lỗ ban đầu**, còn option `102` không nên gắn sẵn trừ khi thiết kế muốn vật phẩm đã có sao được ép. [4]

| Thành phần | Ý nghĩa đề xuất trong drop mới |
|---|---|
| `option 107` | Số lỗ sao của trang bị khi rơi |
| `option 102` | Số sao pha lê đã ép; mặc định không thêm khi drop |
| Stat chính | Lấy theo item template hoặc bảng stat hiện tại |
| `option 206/207` | Chỉ thêm cho nhóm đồ đặc biệt nếu server vẫn sử dụng |

## 4. Phân tầng map đề xuất

Không nên coi mọi map có cùng ID liên tiếp là cùng cấp nếu dữ liệu quái không đồng nhất. Mỗi map nên có một `drop_tier`, được xác định bằng cấu hình hoặc bảng riêng. Bảng dưới đây là cấu hình khởi điểm để triển khai và cân bằng lần đầu.

| Tầng | Đối tượng map | Mức quái tham chiếu | Nhóm trang bị | Khoảng lỗ sao có thể rơi |
|---|---|---|---|---:|
| 1 – Khởi đầu | Các map có quái yếu nhất, thường là map đầu của hành tinh | Cấp thấp, HP thấp | Đồ cơ bản | 1–3 |
| 2 – Tân thủ nâng cao | Map kế tiếp sau khu khởi đầu | HP thấp–trung bình | Đồ cơ bản nâng chỉ số | 1–4 |
| 3 – Trung cấp | Map có quái trung bình | HP trung bình | Đồ thường tốt hơn | 2–4 |
| 4 – Cao cấp | Map có quái mạnh | HP cao | Đồ cao cấp | 2–5 |
| 5 – Rất cao cấp | Map cuối khu vực thường hoặc map nguy hiểm | HP rất cao/boss phụ | Đồ cao cấp, hiếm | 3–6 |
| 6 – Endgame | Map đặc biệt, map tương lai, map phó bản nếu cho phép | Quái/boss cấp cao | Đồ hiếm/endgame | 4–7 |

Đối với nhóm ba map đầu hiện được source đánh dấu là `1,2,3`, `8,9,11`, `15,16,17`, có thể gán mặc định lần lượt như sau: map thứ nhất vào Tầng 1, map thứ hai vào Tầng 2 và map thứ ba vào Tầng 3. Nếu dữ liệu tên map cho thấy thứ tự không đúng, việc gán phải dựa vào HP trung bình của mob thay vì số ID.

## 5. Bảng tỷ lệ đề xuất

Tỷ lệ dưới đây là **tỷ lệ trên mỗi lần quái chết**, không phải tỷ lệ trên mỗi vật phẩm đã rơi. Nên bắt đầu ở mức thận trọng để tránh làm lạm phát trang bị, sau đó điều chỉnh bằng số liệu thực tế.

| Tầng | Tỷ lệ rơi trang bị có lỗ sao | 1 sao | 2 sao | 3 sao | 4 sao | 5 sao | 6 sao | 7 sao |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0,20% | 50% | 35% | 15% | – | – | – | – |
| 2 | 0,12% | 35% | 35% | 25% | 5% | – | – | – |
| 3 | 0,07% | 20% | 35% | 30% | 12% | 3% | – | – |
| 4 | 0,035% | 10% | 25% | 32% | 22% | 9% | 2% | – |
| 5 | 0,015% | 5% | 15% | 25% | 30% | 17% | 7% | 1% |
| 6 | 0,005% | 2% | 8% | 18% | 30% | 25% | 14% | 3% |

Ví dụ, một quái ở Tầng 1 có xác suất 0,20% rơi trang bị có lỗ sao. Nếu roll thành công, vật phẩm có 50% nhận 1 lỗ, 35% nhận 2 lỗ và 15% nhận 3 lỗ. Xác suất tổng hợp để một lần quái chết rơi đúng đồ 3 sao ở Tầng 1 là `0,20% × 15% = 0,03%`.

Ở Tầng 6, tổng tỷ lệ thấp hơn nhưng phân bổ nghiêng về 4–6 sao. Cách này bảo đảm map cấp cao **khó rơi hơn về số lần**, nhưng khi rơi thì chất lượng trung bình cao hơn.

## 6. Điều chỉnh theo sức mạnh quái

Ngoài `drop_tier` của map, nên có hệ số theo mob để quái yếu và quái mạnh trong cùng map không cho phần thưởng ngang nhau.

| Điều kiện mob | Hệ số tỷ lệ đề xuất | Giới hạn |
|---|---:|---:|
| Mob thường yếu nhất trong tier | 0,75x | Không thấp hơn 0,50x |
| Mob thường chuẩn | 1,00x | – |
| Mob mạnh/elite | 1,25x | Không cao hơn 1,50x |
| Boss | Không dùng luồng mob thường; dùng reward riêng | Cấu hình riêng |

Công thức đề xuất là:

```text
finalDropChance = baseTierChance
                 × mobMultiplier
                 × playerPenalty
                 × eventMultiplier
```

`playerPenalty` nên giảm lợi thế khi nhân vật vượt quá xa cấp khu vực, ví dụ nhân vật cao hơn khu vực trên 10 cấp thì giảm còn 50%; không nên tăng tỷ lệ theo sức mạnh người chơi vì sẽ khiến người chơi mạnh farm map thấp hiệu quả hơn map cao.

## 7. Thiết kế dữ liệu cấu hình

Hệ thống hiện tại đã có `panel_map_drop_configs` và `panel_map_drop_items`, trong đó item drop hỗ trợ `temp_id`, `mob_temp_id`, giới hạn cấp nhân vật, tỷ lệ, số lượng và `options_json`. Có thể triển khai giai đoạn đầu bằng cách thêm các item drop theo map với `options_json` chứa option 107 cố định, nhưng cách này không thể tạo phân phối sao động nếu mỗi sao là một dòng độc lập mà không kiểm soát tổng tỷ lệ. [2]

Thiết kế nên bổ sung một bảng chuyên biệt hoặc mở rộng schema:

| Trường | Mục đích |
|---|---|
| `map_id` | Map áp dụng |
| `drop_tier` | Tầng chất lượng |
| `base_chance_percent` | Tỷ lệ rơi trang bị có lỗ sao |
| `min_star` / `max_star` | Khoảng sao cho phép |
| `star_weights_json` | Trọng số từng số sao |
| `item_pool_json` hoặc nhóm item | Danh sách template được phép rơi |
| `mob_multiplier_json` | Hệ số theo loại/cấp mob |
| `player_level_penalty` | Chống farm map thấp |
| `enabled` | Bật/tắt |

Nếu muốn tận dụng schema cũ tối đa, có thể thêm một loại drop mới trong `MapDropConfigService`, ví dụ `star_equipment_enabled`, rồi tạo hàm `rollStarEquipment(...)`. Hàm này sẽ roll một lần theo `base_chance_percent`, chọn item từ pool, chọn số sao theo `star_weights_json`, sau đó thêm `new Item.ItemOption(107, star)` vào `ItemMap`.

## 8. Kế hoạch sửa mã nguồn

### Giai đoạn A – Chuẩn hóa dữ liệu map

Lập danh sách toàn bộ map có quái, ghi nhận map ID, tên map, hành tinh, HP trung bình, cấp mob và loại map. Từ dữ liệu này, gán `drop_tier` thay vì suy luận đơn giản từ ID. Đặc biệt cần xác nhận ba nhóm `1/2/3`, `8/9/11`, `15/16/17` có đúng là các map đầu theo thiết kế server hay không. [1]

### Giai đoạn B – Tạo bộ cấu hình tỷ lệ

Thêm cấu hình mặc định theo sáu tầng ở trên. Mỗi map chỉ trỏ đến một profile; profile chứa tỷ lệ tổng và phân phối sao. Không tạo nhiều đoạn `if (mapId == ...)` trong `Mob.java`, vì sẽ khó cân bằng và dễ sai tỷ lệ.

### Giai đoạn C – Viết bộ roll vật phẩm

Trong `MapDropConfigService`, thêm hàm roll trang bị có lỗ sao. Hàm phải kiểm tra `enabled`, map rule, mob phù hợp, cấp nhân vật, thời gian và tỷ lệ tổng. Sau khi roll thành công, chọn item template từ pool, tạo `ItemMap`, sao chép stat cơ bản, chọn sao theo trọng số và thêm option 107.

Bộ roll phải dùng một mẫu số thống nhất, chẳng hạn basis point 10.000, để hỗ trợ tỷ lệ nhỏ như 0,005% mà không bị lỗi làm tròn. Hàm `Util.isTrue` hiện hỗ trợ tỷ lệ phần trăm nhưng cần gọi đúng mẫu số; không dùng các biểu thức mơ hồ như `Util.isTrue(50, 200)` nếu giao diện ghi 50%. [5]

### Giai đoạn D – Tích hợp vào Mob

Tích hợp lời gọi mới trong `getItemMobReward()` sau khi lấy `mapDropRule`. Cần quyết định rõ cơ chế cũ và mới có cộng dồn hay không. Khuyến nghị: nếu map đã có rule mới thì dùng rule mới và tắt đoạn drop hard-code tương ứng; tránh để một quái đồng thời roll cả drop cũ và drop mới.

Đoạn `Đồ Sao 3 Map Đầu` nên giữ lại trong lịch sử hoặc xóa sau khi chuyển dữ liệu, không nên bỏ comment và chạy song song với hệ thống mới. Đoạn đang hoạt động tại `Mob.java:1085` là logic drop khác liên quan đến SKH/map riêng tư, không phải cơ chế option 107, nên không được nhầm là drop đồ có lỗ sao. [3] [6]

### Giai đoạn E – Panel và reload

Bổ sung panel để quản trị profile theo map/tầng: bật tắt, tỷ lệ tổng, pool item, trọng số sao, giới hạn cấp nhân vật và hệ số mob. Nút reload phải cập nhật cache mà không cần restart server; đồng thời ghi log profile đã tải để dễ phát hiện map bị thiếu cấu hình.

## 9. Cơ chế chống lạm phát và chống farm map thấp

Cần giới hạn số lượng trang bị có lỗ sao trên mỗi lần quái chết, mặc định tối đa một item. Không cho drop từ mob triệu hồi hoặc mob sự kiện nếu không nằm trong pool. Khi người chơi cao cấp farm map thấp, áp dụng `player_penalty`; khi map có nhiều người chơi hoặc mật độ quái cao, theo dõi sản lượng thực tế theo giờ.

Nên có các ngưỡng giám sát: số item có lỗ sao tạo ra mỗi giờ, tỷ lệ 3 sao trở lên, số item theo từng map và số item bị nhặt bởi một tài khoản. Nếu một map vượt sản lượng mục tiêu, giảm `base_chance_percent` thay vì sửa trực tiếp code.

## 10. Kế hoạch kiểm thử

| Nhóm kiểm thử | Nội dung cần xác nhận |
|---|---|
| Kiểm thử đơn vị | Roll đúng tỷ lệ, trọng số sao tổng bằng 100%, option 107 được gắn đúng |
| Kiểm thử map | Mỗi map nhận đúng profile và đúng tầng |
| Kiểm thử mob | Mob ngoài pool không rơi; mob elite áp dụng đúng multiplier |
| Kiểm thử cấp nhân vật | Người chơi vượt cấp nhận penalty đúng, không bị âm hoặc vượt 100% |
| Kiểm thử tương thích | Item rơi có option 107 được ép sao/ép đá bình thường |
| Kiểm thử hồi quy | Không nhân đôi drop do chạy đồng thời logic cũ và mới |
| Kiểm thử thống kê | Chạy tối thiểu 100.000–1.000.000 roll mô phỏng để so sánh sai số với cấu hình |
| Kiểm thử tải | Reload cấu hình không khóa luồng giết quái và không làm mất cache cũ khi database lỗi |

## 11. Lộ trình triển khai khuyến nghị

Trước hết triển khai thử cho ba nhóm map đầu, nhưng dùng profile mới: map đầu mỗi hành tinh thuộc Tầng 1, map thứ hai thuộc Tầng 2, map thứ ba thuộc Tầng 3. Chạy theo dõi trong 24–72 giờ, ghi sản lượng và tỷ lệ sao thực tế, sau đó mới mở rộng cho Tầng 4–6.

Trong giai đoạn thử nghiệm, nên đặt tỷ lệ thấp hơn bảng đề xuất khoảng 20% nếu server có mật độ quái cao. Sau khi có số liệu thực tế, cân chỉnh theo mục tiêu sản lượng, chẳng hạn số đồ có lỗ sao mỗi giờ và thời gian trung bình để người chơi nhận được món 3 sao đầu tiên.

## 12. Kết luận

Cách triển khai phù hợp nhất là **xây dựng một hệ thống `StarEquipmentDrop` theo profile**, đặt trên nền `MapDropConfigService` hiện có. Map thấp cho phép 1–3 sao với tỷ lệ tổng cao hơn; map cao giảm tỷ lệ xuất hiện nhưng tăng trọng số 4–7 sao. Ba nhóm map đang được source đánh dấu là `1,2,3`, `8,9,11`, `15,16,17` nên là phạm vi thử nghiệm đầu tiên, nhưng cần xác nhận tên map và sức mạnh mob trước khi chốt cấp.

Không nên bật lại nguyên đoạn code comment cũ, vì nó chỉ phục vụ một thiết kế đơn giản cho 3 map đầu, không có profile toàn server, không phân biệt cấp mob và không có cơ chế chống farm map thấp.

## References

[1]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/map/service/MapService.java "MapService.java – isMapUpSKH"
[2]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/services/MapDropConfigService.java "MapDropConfigService.java"
[3]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/mob/Mob.java "Mob.java – luồng phần thưởng quái"
[4]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/combine/EpSaoTrangBi.java "EpSaoTrangBi.java"
[5]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/utils/Util.java "Util.java – isTrue và nextInt"
[6]: https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/blob/main/src/nro/models/services/ItemService.java "ItemService.java – randDoSao"
