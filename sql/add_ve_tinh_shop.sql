-- Shop Uron: bán 4 vệ tinh và xếp vào đúng vị trí như bản gốc, đổi tên tab thành "Hàng Độc".
-- item_template 342-345 đã tồn tại và UseItem/ItemMap đã xử lý, nhưng item_shop chưa có dòng nào
-- nên NPC Uron không hiển thị. Idempotent: chạy lại nhiều lần vẫn cho kết quả như nhau.

SET @shop_uron := (SELECT `id` FROM `shop` WHERE `tag_name` = 'URON' LIMIT 1);
SET @tab_hang_doc := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_uron ORDER BY `id` DESC LIMIT 1);

-- 1. Đổi tên tab "Phụ kiện" -> "Hàng<>Độc" ("<>" là ký hiệu xuống dòng mà ShopDAO dùng).
UPDATE `tab_shop`
SET `name` = 'Hàng<>Độc'
WHERE `id` = @tab_hang_doc
  AND COALESCE(`name`, '') <> 'Hàng<>Độc';

-- 2. Tạo dòng bán nếu thiếu.
INSERT INTO `item_shop` (`tab_id`, `temp_id`, `is_new`, `is_sell`, `type_sell`, `cost`, `icon_spec`, `sort_order`)
SELECT @tab_hang_doc, t.`temp_id`, 0, 1, 1, 5, 1, 0
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

-- 3. Đánh số lại thứ tự của các vật phẩm sẵn có trong tab (giữ nguyên thứ tự đang hiển thị),
--    tạm dời vệ tinh ra khỏi danh sách tính toán.
UPDATE `item_shop` s
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY COALESCE(`sort_order`, 0) ASC, `id` ASC) AS `rn`
  FROM `item_shop`
  WHERE `tab_id` = @tab_hang_doc
    AND `temp_id` NOT IN (342, 343, 344, 345)
) r ON r.`id` = s.`id`
SET s.`sort_order` = r.`rn`
WHERE s.`tab_id` = @tab_hang_doc
  AND s.`temp_id` NOT IN (342, 343, 344, 345);

-- 4. Mốc chèn: ngay sau "Bình nước phép" (226) như ảnh; không thấy thì chèn lên đầu tab.
SET @after_binh_nuoc := COALESCE((
  SELECT `sort_order` FROM `item_shop`
  WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 226
  LIMIT 1
), 0);

-- 5. Dồn các vật phẩm nằm sau mốc xuống 4 chỗ để nhường chỗ cho vệ tinh.
UPDATE `item_shop`
SET `sort_order` = COALESCE(`sort_order`, 0) + 4
WHERE `tab_id` = @tab_hang_doc
  AND `temp_id` NOT IN (342, 343, 344, 345)
  AND COALESCE(`sort_order`, 0) > @after_binh_nuoc;

-- 6. Gán vị trí cho 4 vệ tinh: Trí Lực, Trí Tuệ, Phòng Thủ, Sinh Lực.
UPDATE `item_shop` SET `sort_order` = @after_binh_nuoc + 1 WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 342;
UPDATE `item_shop` SET `sort_order` = @after_binh_nuoc + 2 WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 343;
UPDATE `item_shop` SET `sort_order` = @after_binh_nuoc + 3 WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 344;
UPDATE `item_shop` SET `sort_order` = @after_binh_nuoc + 4 WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 345;

-- 7. Ván bay (Phi Long 347, Phi Long VIP 350) trong item_template để gender = 1 (Namec)
--    nên ShopService loại khỏi shop với nhân vật TD/Xayda và người chơi không thấy.
--    Dùng gender_override = 3 (chung mọi tộc) ở cấp dòng bán, không sửa item_template.
UPDATE `item_shop`
SET `gender_override` = 3
WHERE `tab_id` = @tab_hang_doc
  AND `temp_id` IN (347, 350)
  AND COALESCE(`gender_override`, -1) <> 3;

-- 8. Mô tả hiển thị dưới tên vật phẩm trong shop, đúng như bản gốc:
--    80 = HP+#%/30s, 81 = KI+#%/30s, 82 = không bị quái chủ động đánh, 83 = +20% sức mạnh/tiềm năng.
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

SELECT ts.`name` AS `tab`, t.`name` AS `item`, s.`cost`, s.`sort_order`
FROM `item_shop` s
JOIN `tab_shop` ts ON ts.`id` = s.`tab_id`
JOIN `item_template` t ON t.`id` = s.`temp_id`
WHERE s.`tab_id` = @tab_hang_doc AND s.`is_sell` = 1
ORDER BY s.`sort_order` ASC, s.`id` ASC;
