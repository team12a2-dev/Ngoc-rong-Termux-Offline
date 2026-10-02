-- Gộp shop bùa Bà Hạt Mít về đúng 1 tab, đồng thời sửa lỗi gộp nhầm bản 8 giờ
-- và 1 tháng vào tab 1 giờ do bản migration trước gây ra.
--
-- LỖI ĐÃ GÂY RA: bản trước join bảng con chỉ bằng temp_id, trong khi bảng con có
-- 3 dòng cho mỗi temp_id (mỗi shop một dòng). Một dòng item_shop khớp cả 3
-- dòng nên bị ghi đè tab_id nhiều lần và dồn hết vào shop 1 giờ. Bản này join
-- bằng (temp_id, cost): mỗi cặp là duy nhất nên mỗi dòng chỉ khớp đúng một
-- bản ghi, đồng thời dùng cost để đưa các dòng đã bị dồn trở về đúng shop.
--
-- CHIỀU HIỂN THỊ: client hiển thị đúng thứ tự server gửi (sort_order ASC, id
-- ASC), không đảo. Bằng chứng: các dòng Trí Tuệ x4 (sort_order 1) hiện trên các
-- dòng Trí Tuệ x3 (sort_order 2), và trong mỗi nhóm theo id tăng dần.
-- Nên sort_order được cấp đúng theo thứ tự mong muốn.
--
-- Thứ tự mong muốn (trên xuống):
--   Trí Tuệ, Mạnh Mẽ, Đá Trầu, Oai Hùng, Bất Tử, Đéo Đại, Thu Hút, Đệ Tử,
--   Trí Tuệ x3, Trí Tuệ x4
--
-- Cú pháp UPDATE dùng JOIN (không dùng UPDATE ... FROM) vì server chạy MariaDB.
-- Idempotent: chạy lại nhiều lần cho cùng kết quả.

SET @shop_bua_1h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1H' LIMIT 1);
SET @shop_bua_8h := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_8H' LIMIT 1);
SET @shop_bua_1m := (SELECT `id` FROM `shop` WHERE `tag_name` = 'BUA_1M' LIMIT 1);

SET @tab_bua_1h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1h ORDER BY `id` ASC LIMIT 1);
SET @tab_bua_8h := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_8h ORDER BY `id` ASC LIMIT 1);
SET @tab_bua_1m := (SELECT `id` FROM `tab_shop` WHERE `shop_id` = @shop_bua_1m ORDER BY `id` ASC LIMIT 1);

-- 1. Trả mỗi bản Trí Tuệ x3/x4 về đúng shop của nó. Khoá là (temp_id, cost):
--    671 đi kèm 15 / 60 / 150 ngọc cho 1 giờ / 8 giờ / 1 tháng, tương ứng 672 là
--    45 / 180 / 450. Sáu cặp này không trùng nhau nên không thể ghi nhầm.
UPDATE `item_shop` s
JOIN (
  SELECT 671 AS `temp_id`, 15 AS `cost`, @tab_bua_1h AS `dst_tab`, 9 AS `sort_order`
  UNION ALL SELECT 671, 60, @tab_bua_8h, 9
  UNION ALL SELECT 671, 150, @tab_bua_1m, 9
  UNION ALL SELECT 672, 45, @tab_bua_1h, 10
  UNION ALL SELECT 672, 180, @tab_bua_8h, 10
  UNION ALL SELECT 672, 450, @tab_bua_1m, 10
) v ON s.`temp_id` = v.`temp_id` AND s.`cost` = v.`cost`
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

-- 2. Sắp lại 8 món cơ bản theo thứ tự mong muốn, sort_order 1-8.
--    Ứng dụng chạy tuần tự từ shop 1 giờ sang 8 giờ rồi 1 tháng, nên mỗi lần chỉ
--    chạm đúng một shop: khoá join gồm cả temp_id và tab_shop đích.
UPDATE `item_shop` s
JOIN (
  SELECT @tab_bua_1h AS `dst_tab`, 213 AS `temp_id`, 1 AS `sort_order`
  UNION ALL SELECT @tab_bua_1h, 214, 2
  UNION ALL SELECT @tab_bua_1h, 215, 3
  UNION ALL SELECT @tab_bua_1h, 216, 4
  UNION ALL SELECT @tab_bua_1h, 217, 5
  UNION ALL SELECT @tab_bua_1h, 218, 6
  UNION ALL SELECT @tab_bua_1h, 219, 7
  UNION ALL SELECT @tab_bua_1h, 522, 8
  UNION ALL SELECT @tab_bua_8h, 213, 1
  UNION ALL SELECT @tab_bua_8h, 214, 2
  UNION ALL SELECT @tab_bua_8h, 215, 3
  UNION ALL SELECT @tab_bua_8h, 216, 4
  UNION ALL SELECT @tab_bua_8h, 217, 5
  UNION ALL SELECT @tab_bua_8h, 218, 6
  UNION ALL SELECT @tab_bua_8h, 219, 7
  UNION ALL SELECT @tab_bua_8h, 522, 8
  UNION ALL SELECT @tab_bua_1m, 213, 1
  UNION ALL SELECT @tab_bua_1m, 214, 2
  UNION ALL SELECT @tab_bua_1m, 215, 3
  UNION ALL SELECT @tab_bua_1m, 216, 4
  UNION ALL SELECT @tab_bua_1m, 217, 5
  UNION ALL SELECT @tab_bua_1m, 218, 6
  UNION ALL SELECT @tab_bua_1m, 219, 7
  UNION ALL SELECT @tab_bua_1m, 522, 8
) v ON s.`temp_id` = v.`temp_id` AND s.`tab_id` = v.`dst_tab`
SET s.`sort_order` = v.`sort_order`
WHERE s.`is_sell` = 1;

-- 3. Xoá tab "Bùa Đặc biệt" sau khi đã chuyển hết item ra (item_shop không có
--    khoá ngoại trỏ về tab_shop nên phải chuyển trước rồi mới xoá).
DELETE t FROM `tab_shop` t
JOIN `shop` s ON s.`id` = t.`shop_id`
WHERE s.`tag_name` IN ('BUA_1H', 'BUA_8H', 'BUA_1M')
  AND t.`name` = 'Bùa<>Đặc biệt';

-- Kiểm tra: mỗi shop đúng 1 tab, tab đó có đủ 10 môn đúng thứ tự hiển thị.
SELECT s.`tag_name` AS shop, t.`name` AS tab_name, COUNT(i.`id`) AS so_mon,
       GROUP_CONCAT(CONCAT(p.`name`, ' ', i.`cost`)
                    ORDER BY i.`sort_order` ASC, i.`id` ASC SEPARATOR ' | ') AS thu_tu_hien_thi
FROM `shop` s
JOIN `tab_shop` t ON t.`shop_id` = s.`id`
JOIN `item_shop` i ON i.`tab_id` = t.`id` AND i.`is_sell` = 1
JOIN `item_template` p ON p.`id` = i.`temp_id`
WHERE s.`tag_name` IN ('BUA_1H', 'BUA_8H', 'BUA_1M')
GROUP BY s.`tag_name`, t.`id`, t.`name`
ORDER BY s.`tag_name`;