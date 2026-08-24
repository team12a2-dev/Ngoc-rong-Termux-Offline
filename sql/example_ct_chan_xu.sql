-- Vi du database cho CT Black Goku Rose (Chan Xu)
-- Chay tren MySQL/MariaDB cua server cc2

-- ============================================================
-- 1. ITEM TEMPLATE (type 5 = cai trang)
-- head/body/leg = part id khoi tao nhan vat khi mac
-- ============================================================
INSERT INTO item_template (
    id, type, gender, name, description, level,
    icon_id, part, is_up_to_up, power_require,
    gold, gem, head, body, leg
) VALUES (
    1731, 5, 3,
    'Cải trang Chan Xư',
    'Cải trang thành Chan Xư',
    0,
    14336, -1, 0, 0,
    0, 0,
    1624, 1628, 1629
) ON DUPLICATE KEY UPDATE
    type = VALUES(type),
    gender = VALUES(gender),
    name = VALUES(name),
    description = VALUES(description),
    icon_id = VALUES(icon_id),
    part = VALUES(part),
    head = VALUES(head),
    body = VALUES(body),
    leg = VALUES(leg);

-- ============================================================
-- 2. PART (id 1624) - type 0=head, 1=body, 2=leg
-- data: JSON array cac frame [icon_id, dx, dy]
-- ============================================================
INSERT INTO part (id, type, data) VALUES
(1624, 0, '[[14298,-1,-21],[14301,-1,-22],[2955,0,0]]'),
(1624, 1, '[[14304,0,-8],[14305,-2,-10],[14306,-3,-10],[14307,-1,-12],[14308,-1,-10],[14309,2,-10],[14310,1,-10],[14311,-20,-15],[14312,0,-11],[14313,-4,-22],[14314,-8,-18],[14315,-3,-14],[14316,0,-13],[14317,0,-12],[14318,-3,-10],[14319,-2,-10],[2955,0,0]]'),
(1624, 2, '[[14320,5,1],[14321,-1,-4],[14322,-1,-4],[14323,-2,-4],[14324,-1,-6],[14325,0,-6],[14326,-1,-5],[14327,-3,-3],[14328,1,-2],[14329,-3,-7],[14330,4,-7],[14331,-2,-1],[14332,-5,-7],[2954,0,0]]')
ON DUPLICATE KEY UPDATE data = VALUES(data);

-- Neu part dung chung id nhieu type, DB thuc te thuong co khoa (id,type)
-- Hoac mot row/type nhu tren tuy schema cua ban.

-- ============================================================
-- 3. HEAD_AVATAR - avatar hien thi tren UI
-- ============================================================
INSERT INTO head_avatar (head_id, avatar_id) VALUES (1624, 14335)
ON DUPLICATE KEY UPDATE avatar_id = VALUES(avatar_id);

-- ============================================================
-- 4. SAU KHI INSERT: reload server
-- ============================================================
-- Trong game (admin): chat "reload part"
-- Hoac restart server de load item_template + rebuild data/update_data/part
--
-- Tai icon tu server chinh ve client:
-- 1. Chay LaunchDragonBoy250.bat -> chon zoom (x1-x4)
-- 2. Dang nhap game, chat: icon
-- 3. File luu tai: data/icon/x{zoom}/{icon_id}.png
--    Vi du icon 14336 -> data/icon/x2/14336.png
