-- Aura 123: đăng ký sprite + thẻ radar (item/radar id 2000)
-- PNG đã có tại data/img_by_name/x{1,2,3,4}/aura_123_0.png và aura_123_1.png

INSERT INTO `img_by_name` (`id`, `NAME`, `n_frame`) VALUES
(148, 'aura_123_0', 4),
(149, 'aura_123_1', 4)
ON DUPLICATE KEY UPDATE `n_frame` = VALUES(`n_frame`);

INSERT INTO `radar` (`id`, `iconId`, `rank`, `max`, `type`, `mob_id`, `body`, `name`, `info`, `options`, `require`, `require_level`, `aura_id`) VALUES
(2000, 14249, 5, 20, 1, -1, '[{\"head\":1733, \"body\":1734, \"leg\":1735, \"bag\":-1}]', 'Thẻ Aura 123', 'Thẻ radar kích hoạt hào quang aura 123 khi đạt cấp 2', '[{\"id\": 77, \"param\": 5, \"activeCard\": 0}, \n{\"id\": 77, \"param\": 10, \"activeCard\": 1}, \n{\"id\": 77, \"param\": 15, \"activeCard\": 2}]', -1, 0, 123)
ON DUPLICATE KEY UPDATE `aura_id` = 123, `name` = VALUES(`name`), `info` = VALUES(`info`);

INSERT INTO `item_template` (`id`, `TYPE`, `gender`, `NAME`, `description`, `level`, `icon_id`, `part`, `is_up_to_up`, `power_require`, `gold`, `gem`, `head`, `body`, `leg`) VALUES
(2000, 33, 3, 'Mảnh Aura 123', 'Thẻ radar kích hoạt hào quang aura 123 khi sưu tầm đủ và đạt cấp 2', 0, 14249, 0, 1, 0, 0, 0, -1, -1, -1)
ON DUPLICATE KEY UPDATE `NAME` = VALUES(`NAME`), `description` = VALUES(`description`);
