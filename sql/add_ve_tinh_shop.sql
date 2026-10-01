-- Bán 4 vệ tinh (Trí Lực / Trí Tuệ / Phòng Thủ / Sinh Lực) trong tab "Hàng Độc" của shop Uron.
-- item_template 342-345 đã tồn tại và UseItem/ItemMap đã xử lý, nhưng item_shop chưa có dòng nào
-- nên NPC Uron không hiển thị. Idempotent: chạy lại nhiều lần vẫn không nhân bản.

SET @shop_uron := (SELECT `id` FROM `shop` WHERE `tag_name` = 'URON' LIMIT 1);
-- Chuẩn hoá tên tab: bỏ <>, bỏ khoảng trắng, hạ chữ thường, đưa "đ"/"Đ" về "d" để match cả
-- 'Hàng<>Độc' lẫn 'Hang Doc' do admin đặt tay trong panel.
SET @tab_hang_doc := (
  SELECT `id` FROM `tab_shop`
  WHERE `shop_id` = @shop_uron
    AND REPLACE(REPLACE(REPLACE(REPLACE(LOWER(`name`), '<>', ''), ' ', ''), 'đ', 'd'), 'Đ', 'd')
        LIKE '%hangdoc%'
  ORDER BY `id` LIMIT 1
);
-- Dự phòng: lấy tab cuối cùng của shop Uron (tab hàng độc hiện tại).
SET @tab_hang_doc := IFNULL(
  @tab_hang_doc,
  (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_uron ORDER BY `id` DESC LIMIT 1)
);

INSERT INTO `item_shop` (`tab_id`, `temp_id`, `is_new`, `is_sell`, `type_sell`, `cost`, `icon_spec`, `sort_order`)
-- sort_order = -1 để vệ tinh nằm ở đầu tab "Phụ kiện" thay vì bị cuốn xuống cuối danh sách
-- (ShopDAO sắp xếp theo sort_order ASC, item_shop.id ASC).
SELECT @tab_hang_doc, t.`temp_id`, 0, 1, 1, 5, 1, -1
FROM (
  SELECT 342 AS `temp_id`
  UNION ALL SELECT 343
  UNION ALL SELECT 344
  UNION ALL SELECT 345
) t
WHERE @tab_hang_doc IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `item_shop` s WHERE s.`tab_id` = @tab_hang_doc AND s.`temp_id` = t.`temp_id`
  );

-- Mô tả hiển thị dưới tên vật phẩm trong shop, đúng như bản gốc:
-- 80 = HP+#%/30s, 81 = KI+#%/30s, 82 = không bị quái chủ động đánh, 83 = +20% sức mạnh/tiềm năng.
INSERT INTO `item_shop_option` (`item_shop_id`, `option_id`, `param`)
SELECT s.`id`, o.`option_id`, o.`param`
FROM `item_shop` s
JOIN (
  SELECT 342 AS `temp_id`, 81 AS `option_id`, 5 AS `param`
  UNION ALL SELECT 343, 83, 0
  UNION ALL SELECT 344, 82, 0
  UNION ALL SELECT 345, 80, 5
) o ON o.`temp_id` = s.`temp_id`
WHERE s.`tab_id` = @tab_hang_doc
  AND NOT EXISTS (
    SELECT 1 FROM `item_shop_option` x
    WHERE x.`item_shop_id` = s.`id` AND x.`option_id` = o.`option_id`
  );

-- Dòng đã tạo từ lần chạy trước vẫn được đưa lên đầu tab.
UPDATE `item_shop`
SET `sort_order` = -1
WHERE `tab_id` = @tab_hang_doc
  AND `temp_id` IN (342, 343, 344, 345)
  AND COALESCE(`sort_order`, 0) <> -1;

SELECT s.`id`, s.`tab_id`, t.`name`, s.`cost`, s.`type_sell`, s.`sort_order`
FROM `item_shop` s
JOIN `tab_shop` ts ON ts.`id` = s.`tab_id`
JOIN `shop` sh ON sh.`id` = ts.`shop_id`
JOIN `item_template` t ON t.`id` = s.`temp_id`
WHERE sh.`tag_name` = 'URON' AND s.`temp_id` IN (342, 343, 344, 345)
ORDER BY s.`id`;
