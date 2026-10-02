-- Shop bùa Bà Hạt Mít: bổ sung Bùa Trí Tuệ x3 (671) và x4 (672), đồng thời tách
-- bùa ra thêm tab thứ hai.
--
-- VÌ SAO PHẢI TÁCH TAB
-- Client chỉ vẽ được khoảng 6 dòng cho một tab shop; server gửi toàn bộ
-- (openShopType0 không giới hạn) nên phần dư bị cắt khỏi khung và không bấm
-- mua được. Tab "1 giờ" gốc có 10 item (213-219, 522, 671, 672) nên chỉ thấy
-- được 213-218; 219, 522 và bùa Trí Tuệ x3/x4 nằm ngoài khung. Chia 6 + 4 là
-- vừa khít màn nhỏ nhất đang chạy.
--
-- Đường mua không đổi: Shop.getItemShop quét toàn bộ tab (Shop.java:70-79),
-- nên item ở tab thứ hai vẫn mua được bình thường.
--
-- GIÁ: x4 luôn bằng 3x x3 ở hai tab cũ (45 = 3x15, 180 = 3x60) nên "1 tháng"
-- của x4 lấy 3x150 = 450.
--
-- Cú pháp UPDATE dùng JOIN (không dùng UPDATE ... FROM) vì server chạy MariaDB.
-- Idempotent: chạy lại nhiều lần cho cùng kết quả.

SET @shop_bua_1h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1H' LIMIT 1);
SET @shop_bua_8h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_8H' LIMIT 1);
SET @shop_bua_1m := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1M' LIMIT 1);

SET @tab_bua_1h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1h ORDER BY `id` ASC LIMIT 1);
SET @tab_bua_8h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_8h ORDER BY `id` ASC LIMIT 1);
SET @tab_bua_1m := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1m ORDER BY `id` ASC LIMIT 1);

-- 1. Tạo tab thứ hai "Bùa Đặc biệt" cho cả 3 shop bùa nếu chưa có.
INSERT INTO `tab_shop` (`shop_id`, `name`)
SELECT v.`shop_id`, 'Bùa<>Đặc biệt'
FROM (
  SELECT @shop_bua_1h AS `shop_id`
  UNION ALL SELECT @shop_bua_8h
  UNION ALL SELECT @shop_bua_1m
) v
WHERE v.`shop_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `tab_shop` t WHERE t.`shop_id` = v.`shop_id` AND t.`name` = 'Bùa<>Đặc biệt'
  );

SET @tab_nc_1h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1h AND `name` = 'Bùa<>Đặc biệt' LIMIT 1);
SET @tab_nc_8h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_8h AND `name` = 'Bùa<>Đặc biệt' LIMIT 1);
SET @tab_nc_1m := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1m AND `name` = 'Bùa<>Đặc biệt' LIMIT 1);

-- 2. Tạo dòng bán 671/672 trong tab "Đặc biệt" khi shop đó chưa bán món nào
--    trong hai món này. Chỉ nhìn tab đích và tab gốc của CÙNG một shop: nếu quét
--    cả ba shop thì 671 đã có ở shop 8H sẽ khiến shop 1H không được thêm.
INSERT INTO `item_shop` (`tab_id`, `temp_id`, `is_new`, `is_sell`, `type_sell`, `cost`, `icon_spec`, `sort_order`)
SELECT v.`dst_tab`, v.`temp_id`, 1, 1, 1, v.`cost`, 0, v.`sort_order`
FROM (
  SELECT @tab_nc_1h AS `dst_tab`, @tab_bua_1h AS `src_tab`, 671 AS `temp_id`, 15 AS `cost`, 3 AS `sort_order`
  UNION ALL SELECT @tab_nc_1h, @tab_bua_1h, 672, 45, 4
  UNION ALL SELECT @tab_nc_8h, @tab_bua_8h, 671, 60, 3
  UNION ALL SELECT @tab_nc_8h, @tab_bua_8h, 672, 180, 4
  UNION ALL SELECT @tab_nc_1m, @tab_bua_1m, 671, 150, 3
  UNION ALL SELECT @tab_nc_1m, @tab_bua_1m, 672, 450, 4
) v
WHERE v.`dst_tab` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `item_shop` s
    WHERE s.`temp_id` = v.`temp_id`
      AND s.`is_sell` = 1
      AND s.`tab_id` IN (v.`dst_tab`, v.`src_tab`)
  );

-- 3. Dòng 671/672 đã tồn tại ở tab gốc (DB được sửa tay trước đây) thì chuyển
--    sang tab "Đặc biệt" và ép lại giá chuẩn, để mỗi shop chỉ có một dòng bán
--    cho mỗi món.
UPDATE `item_shop` s
JOIN (
  SELECT @tab_nc_1h AS `dst_tab`, @tab_bua_1h AS `src_tab`, 671 AS `temp_id`, 15 AS `cost`, 3 AS `sort_order`
  UNION ALL SELECT @tab_nc_1h, @tab_bua_1h, 672, 45, 4
  UNION ALL SELECT @tab_nc_8h, @tab_bua_8h, 671, 60, 3
  UNION ALL SELECT @tab_nc_8h, @tab_bua_8h, 672, 180, 4
  UNION ALL SELECT @tab_nc_1m, @tab_bua_1m, 671, 150, 3
  UNION ALL SELECT @tab_nc_1m, @tab_bua_1m, 672, 450, 4
) v
  ON s.`temp_id` = v.`temp_id` AND s.`tab_id` = v.`src_tab`
SET s.`tab_id` = v.`dst_tab`, s.`cost` = v.`cost`, s.`is_sell` = 1,
    s.`is_new` = 1, s.`type_sell` = 1, s.`sort_order` = v.`sort_order`
WHERE s.`is_sell` = 1;

-- 4. Thu gọn 2 món cuối (Thu Hút, Đệ Tử) sang tab "Đặc biệt" để tab gốc còn
--    6 dòng (213-218), vừa số dòng client vẽ được. Bước này đổi bố cục shop:
--    muốn hoàn nguyên thì UPDATE item_shop SET tab_id = 14/15/16 tương ứng.
UPDATE `item_shop` s
JOIN (
  SELECT @tab_nc_1h AS `dst_tab`, @tab_bua_1h AS `src_tab`, 219 AS `temp_id`, 1 AS `sort_order`
  UNION ALL SELECT @tab_nc_1h, @tab_bua_1h, 522, 2
  UNION ALL SELECT @tab_nc_8h, @tab_bua_8h, 219, 1
  UNION ALL SELECT @tab_nc_8h, @tab_bua_8h, 522, 2
  UNION ALL SELECT @tab_nc_1m, @tab_bua_1m, 219, 1
  UNION ALL SELECT @tab_nc_1m, @tab_bua_1m, 522, 2
) v
  ON s.`temp_id` = v.`temp_id` AND s.`tab_id` = v.`src_tab`
SET s.`tab_id` = v.`dst_tab`, s.`sort_order` = v.`sort_order`
WHERE s.`is_sell` = 1;

-- Kiểm tra: mỗi shop bùa có 2 tab, không tab nào quá 6 dòng, và 671/672 xuất
-- hiện đúng một lần trong mỗi shop.
SELECT s.`tag_name` AS shop, t.`id` AS tab_id, t.`name` AS tab_name,
       COUNT(i.`id`) AS so_dong,
       GROUP_CONCAT(CONCAT(i.`temp_id`, ':', p.`name`, ' ', i.`cost`)
                    ORDER BY i.`sort_order` ASC, i.`id` ASC SEPARATOR ' | ') AS items
FROM `shop` s
JOIN `tab_shop` t ON t.`shop_id` = s.`id`
LEFT JOIN `item_shop` i ON i.`tab_id` = t.`id` AND i.`is_sell` = 1
LEFT JOIN `item_template` p ON p.`id` = i.`temp_id`
WHERE s.`tag_name` IN ('BUA_1H', 'BUA_8H', 'BUA_1M')
GROUP BY s.`tag_name`, t.`id`, t.`name`
ORDER BY s.`tag_name`, t.`id`;