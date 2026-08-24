-- Khôi phục NPC Dr. Myuu (id 83) trên Rừng thông Xayda (18) và Phòng thí nghiệm Myuu (166)
UPDATE map_template
SET npcs = '[[6,180,408],[83,478,288]]'
WHERE id = 18;

UPDATE map_template
SET npcs = '[[83,504,312]]'
WHERE id = 166;
