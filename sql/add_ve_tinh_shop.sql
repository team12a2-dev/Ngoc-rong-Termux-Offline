-- Shop Uron (tab "Hàng Độc"): bán vệ tinh + đủ 3 bản ván bay theo tộc, xếp đúng vị trí ảnh gốc.
-- Idempotent: chạy lại nhiều lần cho cùng kết quả.

SET @shop_uron := (SELECT `id` FROM `shop` WHERE `tag_name` = 'URON' LIMIT 1);
SET @tab_hang_doc := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_uron ORDER BY `id` DESC LIMIT 1);

-- 1. Đổi tên tab "Phụ kiện" -> "Hàng<>Độc" ("<>" là ký hiệu xuống dòng mà ShopDAO dùng).
UPDATE `tab_shop`
SET `name` = 'Hàng<>Độc'
WHERE `id` = @tab_hang_doc
  AND COALESCE(`name`, '') <> 'Hàng<>Độc';

-- 2. Tạo dòng bán 4 vệ tinh nếu thiếu.
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

-- 3. Bật bán đủ 3 bản ván bay theo tộc: 346 Cân đẩu vân (TD), 347 Phi Long (Namec), 348 Ván bay (Xayda)
--    và bản VIP 349/350/351. Seed chỉ bật bản Namec nên TD và Xayda không thấy mục "ván bay".
--    Không dùng gender_override: InventoryService.putItemBody và Player.getMount kiểm tra
--    item_template.gender, nên bản của tộc khác mua về cũng không trang bị / bay được.
--    347 và 350 đã có dòng đang bán (733, 736) nên chỉ bật dòng cũ is_sell = 0 cho 6 item này
--    khi item đó chưa có dòng bán nào; tránh tạo hai dòng bán cho cùng một item.
UPDATE `item_shop`
SET `is_sell` = 1, `is_new` = 0, `type_sell` = 1, `gender_override` = NULL
WHERE `tab_id` = @tab_hang_doc
  AND `temp_id` IN (346, 347, 348, 349, 350, 351)
  AND `is_sell` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `item_shop` b
    WHERE b.`tab_id` = @tab_hang_doc
      AND b.`temp_id` = `item_shop`.`temp_id`
      AND b.`is_sell` = 1
  );

-- 4. Đánh số lại thứ tự toàn bộ tab theo đúng thứ tự đang hiển thị.
UPDATE `item_shop` s
JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY COALESCE(`sort_order`, 0) ASC, `id` ASC) AS `rn`
  FROM `item_shop`
  WHERE `tab_id` = @tab_hang_doc
) r ON r.`id` = s.`id`
SET s.`sort_order` = r.`rn`
WHERE s.`tab_id` = @tab_hang_doc;

-- 5. Mốc chèn: ngay sau "Bình nước phép" (226) như ảnh; không thấy thì chèn lên đầu tab.
SET @after_binh_nuoc := COALESCE((
  SELECT `sort_order` FROM `item_shop`
  WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 226
  LIMIT 1
), 0);

-- 6. Dồn các vật phẩm nằm sau mốc xuống 4 chỗ để nhường chỗ cho vệ tinh.
UPDATE `item_shop`
SET `sort_order` = COALESCE(`sort_order`, 0) + 4
WHERE `tab_id` = @tab_hang_doc
  AND `temp_id` NOT IN (342, 343, 344, 345)
  AND COALESCE(`sort_order`, 0) > @after_binh_nuoc;

-- 7. Gán vị trí cho 4 vệ tinh: Trí Lực, Trí Tuệ, Phòng Thủ, Sinh Lực.
UPDATE `item_shop` SET `sort_order` = @after_binh_nuoc + 1 WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 342;
UPDATE `item_shop` SET `sort_order` = @after_binh_nuoc + 2 WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 343;
UPDATE `item_shop` SET `sort_order` = @after_binh_nuoc + 3 WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 344;
UPDATE `item_shop` SET `sort_order` = @after_binh_nuoc + 4 WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 345;

-- 8. Ba bản ván bay cùng loại chiếm chung một chỗ: mỗi tộc chỉ thấy đúng bản của mình,
--    nên đặt cùng sort_order là đủ và giữ đúng khoảng cách như ảnh gốc
--    (ván bay 50 ngọc ngay dưới vệ tinh, bản VIP nằm sau Ghế bay).
--    Nguồn vị trí là dòng đang bán (is_sell = 1) của 347 / 350.
SET @pos_van_bay := (
  SELECT `sort_order` FROM `item_shop`
  WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 347 AND `is_sell` = 1
  LIMIT 1
);
SET @pos_van_bay_vip := (
  SELECT `sort_order` FROM `item_shop`
  WHERE `tab_id` = @tab_hang_doc AND `temp_id` = 350 AND `is_sell` = 1
  LIMIT 1
);

UPDATE `item_shop`
SET `sort_order` = @pos_van_bay
WHERE `tab_id` = @tab_hang_doc
  AND `temp_id` IN (346, 347, 348)
  AND `is_sell` = 1
  AND @pos_van_bay IS NOT NULL;

UPDATE `item_shop`
SET `sort_order` = @pos_van_bay_vip
WHERE `tab_id` = @tab_hang_doc
  AND `temp_id` IN (349, 350, 351)
  AND `is_sell` = 1
  AND @pos_van_bay_vip IS NOT NULL;

-- 9. Mô tả hiển thị dưới tên vệ tinh trong shop, đúng như bản gốc:
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

SELECT s.`temp_id`, t.`name`, t.`gender`, s.`cost`, s.`sort_order`
FROM `item_shop` s
JOIN `item_template` t ON t.`id` = s.`temp_id`
WHERE s.`tab_id` = @tab_hang_doc
  AND s.`is_sell` = 1
  AND (t.`type` IN (22, 23, 24) OR s.`temp_id` = 226)
ORDER BY s.`sort_order` ASC, s.`id` ASC;
