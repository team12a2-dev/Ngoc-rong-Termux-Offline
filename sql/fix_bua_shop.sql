-- Shop bùa Bà Hạt Mít: nguồn sự thật duy nhất cho 3 shop 1 giờ / 8 giờ / 1 tháng.
--
-- VÌ SAO GỘP LẠI MỘT FILE
-- Các migration trước chạy lại ở mỗi lần start và tranh nhau sửa cùng bảng
-- item_shop: một bản từng join bảng con chỉ bằng temp_id nên kéo dòng bán của
-- shop 8 giờ và 1 tháng vào tab của shop 1 giờ (sinh clone), một bản khác đẩy
-- bùa Thu Hút (219) và Đệ Tử (522) sang tab phủ rồi xoá tab phủ. item_shop
-- không có khoá ngoại trỏ về tab_shop nên dòng bán của hai bùa này còn nằm lại
-- trong bảng nhưng trỏ vào tab đã bị xoá, client không hiển thị được và các
-- migration sau cũng không tìm thấy để chuyển lại nên bùa mất hẳn khỏi shop.
-- Bản này thay toàn bộ: mỗi shop đúng 1 tab, đúng 10 môn, mỗi môn một dòng bán,
-- giá và thứ tự cố định, chạy lại nhiều lần không sinh thêm dòng.
--
-- GIÁ
--   1 giờ  : theo dữ liệu gốc, đã được xác nhận giữ nguyên.
--   8 giờ  : theo ảnh shop người dùng gửi.
--   1 tháng: theo ảnh shop người dùng gửi (213=500, 214=500, 215=250, 216=700,
--   217=700, 218=100, 219=250, 522=1500, 671=1500, 672=4500).
-- Bùa Trí Tuệ (213), Mạnh Mẽ (214), Đá Trầu (215) của shop 8 giờ không có trong
-- ảnh nên để cost NULL: giữ nguyên giá đang có trong DB.
--
-- THỨ TỰ HIỂN THỊ (sort_order tăng dần, client đọc thẳng không đảo):
--   Trí Tuệ, Mạnh Mẽ, Đá Trầu, Oai Hùng, Bất Tử, Đéo Đại, Thu Hút, Đệ Tử,
--   Trí Tuệ x3, Trí Tuệ x4
--
-- Cú pháp UPDATE/DELETE dùng JOIN (không dùng UPDATE ... FROM) vì server chạy
-- MariaDB. Idempotent: chạy lại nhiều lần cho cùng kết quả.

SET @shop_bua_1h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1H' LIMIT 1);
SET @shop_bua_8h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_8H' LIMIT 1);
SET @shop_bua_1m := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1M' LIMIT 1);

SET @tab_bua_1h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1h AND `name` <> 'Bùa<>Đặc biệt' ORDER BY `id` ASC LIMIT 1);
SET @tab_bua_8h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_8h AND `name` <> 'Bùa<>Đặc biệt' ORDER BY `id` ASC LIMIT 1);
SET @tab_bua_1m := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1m AND `name` <> 'Bùa<>Đặc biệt' ORDER BY `id` ASC LIMIT 1);

-- Bảng giá + thứ tự cho 3 shop. cost NULL nghĩa là không đụng tới giá.
DROP TEMPORARY TABLE IF EXISTS `tmp_bua_shop`;
CREATE TEMPORARY TABLE `tmp_bua_shop` (
  `tag_name` varchar(16) NOT NULL,
  `tab_id` int NULL,
  `temp_id` int NOT NULL,
  `cost` int NULL,
  `sort_order` int NOT NULL
) ENGINE = MEMORY;

INSERT INTO `tmp_bua_shop` (`tag_name`, `tab_id`, `temp_id`, `cost`, `sort_order`) VALUES
  ('BUA_1H', @tab_bua_1h, 213, 5, 1),
  ('BUA_1H', @tab_bua_1h, 214, 5, 2),
  ('BUA_1H', @tab_bua_1h, 215, 3, 3),
  ('BUA_1H', @tab_bua_1h, 216, 7, 4),
  ('BUA_1H', @tab_bua_1h, 217, 7, 5),
  ('BUA_1H', @tab_bua_1h, 218, 1, 6),
  ('BUA_1H', @tab_bua_1h, 219, 2, 7),
  ('BUA_1H', @tab_bua_1h, 522, 10, 8),
  ('BUA_1H', @tab_bua_1h, 671, 15, 9),
  ('BUA_1H', @tab_bua_1h, 672, 45, 10),
  ('BUA_8H', @tab_bua_8h, 213, NULL, 1),
  ('BUA_8H', @tab_bua_8h, 214, NULL, 2),
  ('BUA_8H', @tab_bua_8h, 215, NULL, 3),
  ('BUA_8H', @tab_bua_8h, 216, 28, 4),
  ('BUA_8H', @tab_bua_8h, 217, 28, 5),
  ('BUA_8H', @tab_bua_8h, 218, 4, 6),
  ('BUA_8H', @tab_bua_8h, 219, 10, 7),
  ('BUA_8H', @tab_bua_8h, 522, 60, 8),
  ('BUA_8H', @tab_bua_8h, 671, 60, 9),
  ('BUA_8H', @tab_bua_8h, 672, 180, 10),
  ('BUA_1M', @tab_bua_1m, 213, 500, 1),
  ('BUA_1M', @tab_bua_1m, 214, 500, 2),
  ('BUA_1M', @tab_bua_1m, 215, 250, 3),
  ('BUA_1M', @tab_bua_1m, 216, 700, 4),
  ('BUA_1M', @tab_bua_1m, 217, 700, 5),
  ('BUA_1M', @tab_bua_1m, 218, 100, 6),
  ('BUA_1M', @tab_bua_1m, 219, 250, 7),
  ('BUA_1M', @tab_bua_1m, 522, 1500, 8),
  ('BUA_1M', @tab_bua_1m, 671, 1500, 9),
  ('BUA_1M', @tab_bua_1m, 672, 4500, 10);

-- 1. Dọn dòng bán mồ côi của bùa: tab_id không còn tồn tại trong tab_shop thì
--    client không vẽ ra được. Bản migration cũ để lại loại này khi xoá tab phụ.
DELETE s FROM `item_shop` s
WHERE s.`temp_id` IN (213, 214, 215, 216, 217, 218, 219, 522, 671, 672)
  AND NOT EXISTS (SELECT 1 FROM `tab_shop` t WHERE t.`id` = s.`tab_id`);

-- 2. Trả dòng nằm trong tab phụ "Bùa<>Đặc biệt" (nếu còn) về tab chính kèm thứ tự.
UPDATE `item_shop` s
JOIN `tab_shop` t ON t.`id` = s.`tab_id`
JOIN `shop` sh ON sh.`id` = t.`shop_id`
JOIN `tmp_bua_shop` v ON v.`tag_name` = sh.`tag_name` AND v.`temp_id` = s.`temp_id`
SET s.`tab_id` = v.`tab_id`,
    s.`cost` = COALESCE(v.`cost`, s.`cost`),
    s.`sort_order` = v.`sort_order`
WHERE t.`name` = 'Bùa<>Đặc biệt'
  AND v.`tab_id` IS NOT NULL;

-- 3. Ép giá chuẩn cho dòng đang bán trong tab chính.
UPDATE `item_shop` s
JOIN `tmp_bua_shop` v ON v.`tab_id` = s.`tab_id` AND v.`temp_id` = s.`temp_id`
SET s.`cost` = v.`cost`
WHERE v.`tab_id` IS NOT NULL
  AND v.`cost` IS NOT NULL
  AND s.`is_sell` = 1;

-- 4. Bảo đảm đủ môn: thêm dòng bán cho món còn thiếu, ví dụ bùa Thu Hút và
--    Đệ Tử bị mất trước đây.
INSERT INTO `item_shop` (`tab_id`, `temp_id`, `is_new`, `is_sell`, `type_sell`, `cost`, `icon_spec`, `sort_order`)
SELECT v.`tab_id`, v.`temp_id`, 1, 1, 1, v.`cost`, 0, v.`sort_order`
FROM `tmp_bua_shop` v
WHERE v.`tab_id` IS NOT NULL
  AND v.`cost` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `item_shop` s
    WHERE s.`tab_id` = v.`tab_id`
      AND s.`temp_id` = v.`temp_id`
      AND s.`is_sell` = 1
  );

-- 5. Chuyển option của dòng trùng sang dòng sẽ được giữ lại, phải làm trước bước 6
--    vì item_shop_option bị xoá theo item_shop (ON DELETE CASCADE).
UPDATE `item_shop_option` o
JOIN `item_shop` d ON d.`id` = o.`item_shop_id`
JOIN `tmp_bua_shop` v ON v.`tab_id` = d.`tab_id` AND v.`temp_id` = d.`temp_id`
JOIN `item_shop` k ON k.`tab_id` = d.`tab_id` AND k.`temp_id` = d.`temp_id` AND k.`is_sell` = 1 AND k.`id` < d.`id`
SET o.`item_shop_id` = k.`id`
WHERE v.`tab_id` IS NOT NULL
  AND d.`is_sell` = 1;

-- 6. Xoá dòng trùng trong tab chính, giữ dòng có id nhỏ nhất cho mỗi môn.
DELETE d FROM `item_shop` d
JOIN `tmp_bua_shop` v ON v.`tab_id` = d.`tab_id` AND v.`temp_id` = d.`temp_id`
JOIN `item_shop` k ON k.`tab_id` = d.`tab_id` AND k.`temp_id` = d.`temp_id` AND k.`is_sell` = 1 AND k.`id` < d.`id`
WHERE v.`tab_id` IS NOT NULL
  AND d.`is_sell` = 1;

-- 6b. Gom option trùng về một bản cho mỗi dòng bán sau bước 5, tránh client
--     hiện cùng một nhãn nhiều lần.
DELETE o FROM `item_shop_option` o
JOIN `item_shop` s ON s.`id` = o.`item_shop_id`
JOIN `tmp_bua_shop` v ON v.`tab_id` = s.`tab_id` AND v.`temp_id` = s.`temp_id`
JOIN `item_shop_option` k
  ON k.`item_shop_id` = o.`item_shop_id`
 AND k.`option_id` = o.`option_id`
 AND k.`id` < o.`id`
WHERE v.`tab_id` IS NOT NULL
  AND s.`is_sell` = 1;

-- 7. Sắp lại thứ tự hiển thị của 10 môn trong tab chính.
UPDATE `item_shop` s
JOIN `tmp_bua_shop` v ON v.`tab_id` = s.`tab_id` AND v.`temp_id` = s.`temp_id`
SET s.`sort_order` = v.`sort_order`
WHERE v.`tab_id` IS NOT NULL
  AND s.`is_sell` = 1;

-- 8. Xoá tab phụ sau khi đã chuyển hết item ra.
DELETE t FROM `tab_shop` t
JOIN `shop` s ON s.`id` = t.`shop_id`
WHERE s.`tag_name` IN ('BUA_1H', 'BUA_8H', 'BUA_1M')
  AND t.`name` = 'Bùa<>Đặc biệt';

-- 9. Gán nhãn "Chưa có" (option 66) cho mọi dòng bán bùa còn thiếu. Client đọc
--    option này để vẽ dòng thời gian còn lại dưới tên bùa; thiếu option thì dòng
--    đó trống trơn trong khi các bùa khác vẫn hiện "Chưa có". Các option 63/64/65
--    ("Còn lại # ngày/giờ/phút") do ShopService.resolveShopBua gắn lúc mở shop
--    theo thời gian đang chạy nên dữ liệu lưu không được giữ.
DELETE o FROM `item_shop_option` o
JOIN `item_shop` s ON s.`id` = o.`item_shop_id`
JOIN `tmp_bua_shop` v ON v.`tab_id` = s.`tab_id` AND v.`temp_id` = s.`temp_id`
WHERE v.`tab_id` IS NOT NULL
  AND s.`is_sell` = 1
  AND o.`option_id` IN (63, 64, 65);

INSERT INTO `item_shop_option` (`item_shop_id`, `option_id`, `param`)
SELECT s.`id`, 66, 0
FROM `item_shop` s
JOIN `tmp_bua_shop` v ON v.`tab_id` = s.`tab_id` AND v.`temp_id` = s.`temp_id`
WHERE v.`tab_id` IS NOT NULL
  AND s.`is_sell` = 1
  AND NOT EXISTS (
    SELECT 1 FROM `item_shop_option` o
    WHERE o.`item_shop_id` = s.`id`
      AND o.`option_id` = 66
  );

-- Kiểm tra: mỗi shop đúng 1 tab, đủ 10 môn không trùng lặp, giá và thứ tự đúng,
-- mọi môn đều có option 66 để client hiện "Chưa có".
SELECT s.`tag_name` AS shop, t.`id` AS tab_id, t.`name` AS tab_name,
       COUNT(i.`id`) AS so_mon,
       GROUP_CONCAT(DISTINCT o.`option_id` ORDER BY o.`option_id`) AS options,
       GROUP_CONCAT(CONCAT(i.`temp_id`, ':', p.`name`, ' ', i.`cost`)
                    ORDER BY i.`sort_order` ASC, i.`id` ASC SEPARATOR ' | ') AS items
FROM `shop` s
JOIN `tab_shop` t ON t.`shop_id` = s.`id`
JOIN `item_shop` i ON i.`tab_id` = t.`id` AND i.`is_sell` = 1
JOIN `item_template` p ON p.`id` = i.`temp_id`
LEFT JOIN `item_shop_option` o ON o.`item_shop_id` = i.`id`
WHERE s.`tag_name` IN ('BUA_1H', 'BUA_8H', 'BUA_1M')
GROUP BY s.`tag_name`, t.`id`, t.`name`
ORDER BY s.`tag_name`, t.`id`;
