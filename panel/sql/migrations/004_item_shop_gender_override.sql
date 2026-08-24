-- Ghi đè tộc hiển thị / mua theo từng dòng item_shop (null = dùng item_template.gender)
ALTER TABLE `item_shop`
  ADD COLUMN `gender_override` tinyint(4) DEFAULT NULL
  COMMENT '0=Trái Đất,1=Namec,2=Xayda,>=3 Chung; NULL=theo template'
  AFTER `icon_spec`;
