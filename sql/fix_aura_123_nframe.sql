-- Sửa n_frame aura 123: sprite thực tế có 4 frame dọc, không phải 8
UPDATE `img_by_name` SET `n_frame` = 4 WHERE `NAME` IN ('aura_123_0', 'aura_123_1');
