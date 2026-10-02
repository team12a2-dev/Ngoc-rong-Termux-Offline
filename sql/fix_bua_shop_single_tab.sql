-- Gộp shop bùa Bà Hạt Mít về đúng 1 tab, hoàn tác tách 2 tab của
-- sql/fix_bua_tri_tue_shop.sql.
--
-- Tách tab là không cần thiết: client có nút cuộn (mũi tên ▼ ở góc phải khung
-- shop) nên hiện được danh sách dài hơn 6 dòng.
--
-- Thứ tự mong muốn (trên xuống):
--   Trí Tuệ, Mạnh Mẽ, Đá Trầu, Oai Hùng, Bất Tử, Đéo Đại, Thu Hút, Đệ Tử,
--   Trí Tuệ x3, Trí Tuệ x4
--
-- CHIỀU HIỂN THỊ: client vẽ ngược thứ tự server gửi. Tab "Bùa 1 giờ" trước đó
-- để mọi dòng sort_order = 0 nên server gửi theo id tăng dần (218, 217,
-- ..., 213) còn màn hình hiện 213, 214, ..., 218. Vì vậy sort_order được cấp
-- theo thứ tự ngược với thứ tự hiển thị.
--
-- Cú pháp UPDATE dùng JOIN (không dùng UPDATE ... FROM) vì server chạy MariaDB.
-- Idempotent: chạy lại nhiều lần cho cùng kết quả.

SET @shop_bua_1h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1H' LIMIT 1);
SET @shop_bua_8h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_8H' LIMIT 1);
SET @shop_bua_1m := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1M' LIMIT 1);

SET @tab_bua_1h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1h ORDER BY `id` ASC LIMIT 1);
SET @tab_bua_8h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_8h ORDER BY `id` ASC LIMIT 1);
SET @tab_bua_1m := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1m ORDER BY `id` ASC LIMIT 1);

-- 1. Kéo 4 món cuối (và mọi món đang nằm ở tab thứ hai) về tab gốc của CÙNG
--    shop, kèm sort_order theo thứ tự đảo.
UPDATE `item_shop` s
JOIN (
  SELECT @tab_bua_1h AS `dst_tab`, 671 AS `temp_id`, 2 AS `sort_order`
  UNION ALL SELECT @tab_bua_1h, 672, 1
  UNION ALL SELECT @tab_bua_8h, 671, 2
  UNION ALL SELECT @tab_bua_8h, 672, 1
  UNION ALL SELECT @tab_bua_1m, 671, 2
  UNION ALL SELECT @tab_bua_1m, 672, 1
) v ON s.`temp_id` = v.`temp_id`
SET s.`tab_id` = v.`dst_tab`, s.`sort_order` = v.`sort_order`
WHERE s.`is_sell` = 1
  AND s.`tab_id` IN (
    @tab_bua_1h,
    (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1h AND `name` = 'Bùa<>Đặc biệt' LIMIT 1),
    @tab_bua_8h,
    (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_8h AND `name` = 'Bùa<>Đặc biệt' LIMIT 1),
    @tab_bua_1m,
    (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1m AND `name` = 'Bùa<>Đặc biệt' LIMIT 1)
  );

-- 2. Đặt lại 6 bùa cơ bản + Thu Hút + Đệ Tử theo cùng dải sort_order.
UPDATE `item_shop` s
JOIN (
  SELECT @tab_bua_1h AS `dst_tab`, 213 AS `temp_id`, 10 AS `sort_order`
  UNION ALL SELECT @tab_bua_1h, 214, 9
  UNION ALL SELECT @tab_bua_1h, 215, 8
  UNION ALL SELECT @tab_bua_1h, 216, 7
  UNION ALL SELECT @tab_bua_1h, 217, 6
  UNION ALL SELECT @tab_bua_1h, 218, 5
  UNION ALL SELECT @tab_bua_1h, 219, 4
  UNION ALL SELECT @tab_bua_1h, 522, 3
  UNION ALL SELECT @tab_bua_8h, 213, 10
  UNION ALL SELECT @tab_bua_8h, 214, 9
  UNION ALL SELECT @tab_bua_8h, 215, 8
  UNION ALL SELECT @tab_bua_8h, 216, 7
  UNION ALL SELECT @tab_bua_8h, 217, 6
  UNION ALL SELECT @tab_bua_8h, 218, 5
  UNION ALL SELECT @tab_bua_8h, 219, 4
  UNION ALL SELECT @tab_bua_8h, 522, 3
  UNION ALL SELECT @tab_bua_1m, 213, 10
  UNION ALL SELECT @tab_bua_1m, 214, 9
  UNION ALL SELECT @tab_bua_1m, 215, 8
  UNION ALL SELECT @tab_bua_1m, 216, 7
  UNION ALL SELECT @tab_bua_1m, 217, 6
  UNION ALL SELECT @tab_bua_1m, 218, 5
  UNION ALL SELECT @tab_bua_1m, 219, 4
  UNION ALL SELECT @tab_bua_1m, 522, 3
) v ON s.`temp_id` = v.`temp_id` AND s.`tab_id` = v.`dst_tab`
SET s.`sort_order` = v.`sort_order`
WHERE s.`is_sell` = 1;

-- 3. Xoá tab "Bùa Đặc biệt" sau khi đã chuyển hết item ra (item_shop không có
--    khoá ngoại trỏ về tab_shop nên phải chuyển trước rồi mới xoá).
DELETE t FROM `tab_shop` t
JOIN `shop` s ON s.`id` = t.`shop_id`
WHERE s.`tag_name` IN ('BUA_1H', 'BUA_8H', 'BUA_1M')
  AND t.`name` = 'Bùa<>Đặc biệt';

-- Kiểm tra: mỗi shop còn đúng 1 tab, tab đó có đủ 10 môn đúng thứ tự hiển thị.
SELECT s.`tag_name` AS shop, t.`name` AS tab_name,
       GROUP_CONCAT(CONCAT(p.`name`, ' ', i.`cost`)
                    ORDER BY i.`sort_order` DESC, i.`id` ASC SEPARATOR ' | ') AS thu_tu_hien_thi
FROM `shop` s
JOIN `tab_shop` t ON t.`shop_id` = s.`id`
JOIN `item_shop` i ON i.`tab_id` = t.`id` AND i.`is_sell` = 1
JOIN `item_template` p ON p.`id` = i.`temp_id`
WHERE s.`tag_name` IN ('BUA_1H', 'BUA_8H', 'BUA_1M')
GROUP BY s.`tag_name`, t.`id`, t.`name`
ORDER BY s.`tag_name`;