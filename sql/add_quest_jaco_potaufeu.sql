-- Mở khoá NPC Jaco (Trạm tàu vũ trụ, map 24) bằng nhiệm vụ chính 22.
--
-- Trước đây Jaco (npc_template id 63) nằm sẵn trong map_template.npcs của map 24 và map 139,
-- không có điều kiện nào, nên nhân vật mới tạo đi từ Làng Aru -> Thung lũng tre là vào được
-- map 24 và bấm vào Jaco để bay thẳng sang Potaufeu, bỏ qua toàn bộ main quest.
--
-- Chọn nhiệm vụ 22 "Chú bé đến từ tương lai" vì đó là nhiệm vụ của Calích, khớp với
-- lời thoại của Jaco: "Gô Tên, Calích và Monaka đang gặp chuyện ở hành tình Potaufeu".
-- Hai bước mới nối vào CUỐI nhiệm vụ 22 (nhiệm vụ này vốn có 6 bước, ducvupro 83-88),
-- nên không phải đánh số lại bất kỳ nhiệm vụ nào phía sau.
--
-- Jaco ở map 139 (Hành tình Potaufeu) cố ý KHÔNG bị chặn: map 139 chỉ nối với map 140
-- (Hang động Potaufeu) và không có lối ra nào khác, chặn Jaco ở đó sẽ kẹt người chơi.
--
-- Idempotent: chạy lại nhiều lần cho cùng kết quả.

-- npc_id 63 = Jaco, map 24 = Trạm tàu vũ trụ, map 139 = Hành tình Potaufeu.
-- ducvupro 169/170 chưa dùng ở task_sub_template (giá trị cao nhất hiện tại là 168).
INSERT INTO `task_sub_template` (`task_main_id`, `NAME`, `max_count`, `notify`, `npc_id`, `map`, `ducvupro`)
SELECT t.`task_main_id`, t.`NAME`, t.`max_count`, t.`notify`, t.`npc_id`, t.`map`, t.`ducvupro`
FROM (
    SELECT 22 AS `task_main_id`,
           'Đến gặp Jaco ở Trạm tàu vũ trụ' AS `NAME`,
           1 AS `max_count`,
           'Hãy tìm Jaco ở Trạm tàu vũ trụ' AS `notify`,
           63 AS `npc_id`,
           24 AS `map`,
           169 AS `ducvupro`
    UNION ALL
    SELECT 22, 'Đến hành tình Potaufeu', 1, 'Hãy đến hành tình Potaufeu', -1, 139, 170
) t
WHERE NOT EXISTS (
    SELECT 1 FROM `task_sub_template` s
    WHERE s.`task_main_id` = t.`task_main_id` AND s.`ducvupro` = t.`ducvupro`
);

-- Nhiệm vụ 22 phải còn 8 bước và đúng thứ tự 83..88, 169, 170.
-- TaskService nối các bước theo thứ tự dòng trả về, không có ORDER BY.
SELECT s.`task_main_id`, s.`ducvupro`, s.`NAME`, s.`npc_id`, s.`map`
FROM `task_sub_template` s
WHERE s.`task_main_id` = 22
ORDER BY s.`ducvupro` ASC;
