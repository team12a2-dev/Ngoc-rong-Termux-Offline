-- Cổng Rừng thông Xayda (18) <-> Phòng thí nghiệm Myuu (166)
UPDATE map_template
SET waypoints = '[\"[\"Rừng nguyên sinh\",0,384,24,408,0,0,17,1524,312]\",\"[\"Vách núi đen\",1560,408,1584,432,0,0,20,60,288]\",\"[\"Phòng thí nghiệm Myuu\",452,264,504,316,0,0,166,480,312]\"]'
WHERE id = 18;

UPDATE map_template
SET waypoints = '[\"[\"Rừng thông Xayda\",0,264,72,336,0,0,18,478,288]\"]'
WHERE id = 166;
