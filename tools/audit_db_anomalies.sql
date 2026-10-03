-- ========================================================================
-- BỘ TRUY VẤN KIỂM TOÁN CSDL: PHÁT HIỆN BẤT THƯỜNG & HACK/DUPE TRONG GAME
-- ========================================================================

-- 1. Kiểm tra tài khoản có số dư VND hoặc Vàng bất thường (âm hoặc tràn số)
SELECT id, username, vnd, tongnap 
FROM account 
WHERE vnd < 0 OR vnd > 100000000 OR tongnap < 0;

-- 2. Kiểm tra các nhân vật có Sức mạnh hoặc Tiềm năng bất thường
-- Lưu ý: Kiểm tra nếu sức mạnh < 0 (tràn số âm) hoặc vượt quá mốc cấu hình tối đa
SELECT id, name, power, tiem_nang, data_point 
FROM player 
WHERE power < 0 OR tiem_nang < 0;

-- 3. Kiểm tra các vật phẩm ký gửi có giá trị âm hoặc vượt mốc an toàn
SELECT id, player_id, item_id, gold, gem, quantity, isBuy
FROM shop_ky_gui
WHERE gold < 0 OR gem < 0 OR quantity <= 0 OR gold > 2000000000 OR gem > 1000000;

-- 4. Phát hiện các tài khoản có cùng địa chỉ IP tạo hàng loạt tài khoản
SELECT ip_address, COUNT(*) as total_accounts
FROM account
WHERE ip_address IS NOT NULL AND ip_address != ''
GROUP BY ip_address
HAVING COUNT(*) > 20
ORDER BY total_accounts DESC;

-- 5. Thống kê 20 nhân vật giàu nhất server (Vàng & Ngọc) để rà soát kinh tế
SELECT id, name, power,
       JSON_UNQUOTE(JSON_EXTRACT(data_inventory, '$[0]')) AS gold,
       JSON_UNQUOTE(JSON_EXTRACT(data_inventory, '$[1]')) AS gem,
       JSON_UNQUOTE(JSON_EXTRACT(data_inventory, '$[2]')) AS ruby
FROM player
ORDER BY CAST(JSON_UNQUOTE(JSON_EXTRACT(data_inventory, '$[0]')) AS UNSIGNED) DESC
LIMIT 20;

-- 6. Lọc các giao dịch chuyển nhượng lượng vàng lớn (> 100 triệu vàng)
SELECT id, player_id, target_id, gold_tran, time_tran
FROM history_transaction
WHERE gold_tran > 100000000
ORDER BY time_tran DESC
LIMIT 50;
