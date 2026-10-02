-- Dọn shop bùa 1 giờ (BUA_1H): đang có nhiều dòng trùng Bùa Trí Tuệ x3 (671)
-- và x4 (672) trong cùng một tab.
--
-- NGUYÊN NHÂN: bản migration gộp tab trước đó join bảng con chỉ bằng temp_id,
-- kéo dòng bán của shop 8 giờ và 1 tháng vào tab của shop 1 giờ. Các migration
-- chạy lại ở mỗi lần start nên các dòng trùng được gộp về tab phụ rồi kéo ngược
-- lại tab chính, cứ thế nhân bản.
--
-- PHẠM VI: chỉ shop BUA_1H. Shop 8 giờ và 1 tháng đã ổn định nên không đụng tới.
--
-- KẾT QUẢ CUỐI: tab của BUA_1H có đúng 10 môn, mỗi môn một dòng, giá chuẩn 1
-- giờ (671 = 15 ngọc, 672 = 45 ngọc), sort_order 1-10 đúng thứ tự hiển thị.
-- Idempotent: chạy lại nhiều lần cho cùng kết quả.
--
-- Cú pháp UPDATE/DELETE dùng JOIN (không dùng UPDATE ... FROM) vì server chạy
-- MariaDB.

SET @shop_bua_1h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1H' LIMIT 1);
SET @tab_bua_1h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1h AND `name` <> 'Bùa<>Đặc biệt' ORDER BY `id` ASC LIMIT 1);
SET @tab_nc_1h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1h AND `name` = 'Bùa<>Đặc biệt' LIMIT 1);

-- 1. Trả mọi dòng đang nằm trong tab phụ "Bùa<>Đặc biệt" về tab chính kèm giá và
--    sort_order chuẩn. Bùa 219 và 522 cũng bị đẩy sang tab phụ ở migration cũ,
--    bước này giữ chúng khỏi mất khi tab phụ bị xoá.
UPDATE `item_shop` s
SET s.`tab_id` = @tab_bua_1h,
    s.`cost` = CASE s.`temp_id` WHEN 671 THEN 15 WHEN 672 THEN 45 ELSE s.`cost` END,
    s.`sort_order` = CASE s.`temp_id`
        WHEN 213 THEN 1 WHEN 214 THEN 2 WHEN 215 THEN 3 WHEN 216 THEN 4
        WHEN 217 THEN 5 WHEN 218 THEN 6 WHEN 219 THEN 7 WHEN 522 THEN 8
        WHEN 671 THEN 9 WHEN 672 THEN 10 ELSE s.`sort_order` END
WHERE @tab_nc_1h IS NOT NULL
  AND s.`tab_id` = @tab_nc_1h;

-- 2. Ép lại giá chuẩn cho dòng 671/672 đang ở tab chính: bản migration cũ từng
--    để lại giá của 8 giờ / 1 tháng (60, 150, 180, 450) trong tab này.
UPDATE `item_shop`
SET `cost` = 15, `is_new` = 1, `is_sell` = 1, `type_sell` = 1, `sort_order` = 9
WHERE @tab_bua_1h IS NOT NULL
  AND `tab_id` = @tab_bua_1h
  AND `temp_id` = 671;

UPDATE `item_shop`
SET `cost` = 45, `is_new` = 1, `is_sell` = 1, `type_sell` = 1, `sort_order` = 10
WHERE @tab_bua_1h IS NOT NULL
  AND `tab_id` = @tab_bua_1h
  AND `temp_id` = 672;

-- 3. Xoá dòng trùng trong tab chính, giữ lại dòng có id nhỏ nhất cho mỗi môn.
DELETE d FROM `item_shop` d
JOIN `item_shop` k
  ON k.`tab_id` = d.`tab_id`
 AND k.`temp_id` = d.`temp_id`
 AND k.`is_sell` = 1
 AND k.`id` < d.`id`
WHERE @tab_bua_1h IS NOT NULL
  AND d.`tab_id` = @tab_bua_1h
  AND d.`is_sell` = 1
  AND d.`temp_id` IN (213, 214, 215, 216, 217, 218, 219, 522, 671, 672);

-- 4. Bảo đảm đủ 10 môn. Giá 213-522 lấy đúng dữ liệu gốc của tab 1 giờ.
INSERT INTO `item_shop` (`tab_id`, `temp_id`, `is_new`, `is_sell`, `type_sell`, `cost`, `icon_spec`, `sort_order`)
SELECT @tab_bua_1h, v.`temp_id`, 1, 1, 1, v.`cost`, 0, v.`sort_order`
FROM (
  SELECT 213 AS `temp_id`, 5 AS `cost`, 1 AS `sort_order`
  UNION ALL SELECT 214, 5, 2
  UNION ALL SELECT 215, 3, 3
  UNION ALL SELECT 216, 7, 4
  UNION ALL SELECT 217, 7, 5
  UNION ALL SELECT 218, 1, 6
  UNION ALL SELECT 219, 2, 7
  UNION ALL SELECT 522, 10, 8
  UNION ALL SELECT 671, 15, 9
  UNION ALL SELECT 672, 45, 10
) v
WHERE @tab_bua_1h IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `item_shop` s
    WHERE s.`tab_id` = @tab_bua_1h
      AND s.`temp_id` = v.`temp_id`
      AND s.`is_sell` = 1
  );

-- 5. Sắp lại thứ tự hiển thị của 10 môn trong tab chính.
UPDATE `item_shop` s
JOIN (
  SELECT 213 AS `temp_id`, 1 AS `sort_order`
  UNION ALL SELECT 214, 2
  UNION ALL SELECT 215, 3
  UNION ALL SELECT 216, 4
  UNION ALL SELECT 217, 5
  UNION ALL SELECT 218, 6
  UNION ALL SELECT 219, 7
  UNION ALL SELECT 522, 8
  UNION ALL SELECT 671, 9
  UNION ALL SELECT 672, 10
) v ON s.`temp_id` = v.`temp_id`
SET s.`sort_order` = v.`sort_order`
WHERE @tab_bua_1h IS NOT NULL
  AND s.`tab_id` = @tab_bua_1h
  AND s.`is_sell` = 1;

-- 6. Xoá tab phụ của shop 1 giờ sau khi đã chuyển hết item ra.
DELETE t FROM `tab_shop` t
WHERE t.`shop_id` = @shop_bua_1h
  AND t.`name` = 'Bùa<>Đặc biệt';

-- Kiểm tra: shop 1 giờ đúng 1 tab với 10 môn không trùng lặp; hai shop còn lại
-- chỉ để tham khảo, migration này không sửa chúng.
SELECT s.`tag_name` AS shop, t.`id` AS tab_id, t.`name` AS tab_name,
       COUNT(i.`id`) AS so_mon,
       GROUP_CONCAT(CONCAT(i.`temp_id`, ':', p.`name`, ' ', i.`cost`)
                    ORDER BY i.`sort_order` ASC, i.`id` ASC SEPARATOR ' | ') AS items
FROM `shop` s
JOIN `tab_shop` t ON t.`shop_id` = s.`id`
JOIN `item_shop` i ON i.`tab_id` = t.`id` AND i.`is_sell` = 1
JOIN `item_template` p ON p.`id` = i.`temp_id`
WHERE s.`tag_name` IN ('BUA_1H', 'BUA_8H', 'BUA_1M')
GROUP BY s.`tag_name`, t.`id`, t.`name`
ORDER BY s.`tag_name`, t.`id`;
