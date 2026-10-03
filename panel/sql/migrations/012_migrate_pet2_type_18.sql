-- =======================================================================
-- Migration 012: Chuyển đổi type Pet 2 sang type 18 và đồng bộ Part Head/Body/Leg
-- =======================================================================

-- 1. Cập nhật Type và Part cho toàn bộ Pet 2
UPDATE item_template SET `type` = 18, `head` = 882, `body` = 883, `leg` = 884 WHERE `id` = 892;
UPDATE item_template SET `type` = 18, `head` = 885, `body` = 886, `leg` = 887 WHERE `id` = 893;
UPDATE item_template SET `type` = 18, `head` = 891, `body` = 892, `leg` = 893 WHERE `id` = 908;
UPDATE item_template SET `type` = 18, `head` = 894, `body` = 895, `leg` = 896 WHERE `id` = 909;
UPDATE item_template SET `type` = 18, `head` = 897, `body` = 898, `leg` = 899 WHERE `id` = 910;
UPDATE item_template SET `type` = 18, `head` = 925, `body` = 926, `leg` = 927 WHERE `id` = 916;
UPDATE item_template SET `type` = 18, `head` = 928, `body` = 929, `leg` = 930 WHERE `id` = 917;
UPDATE item_template SET `type` = 18, `head` = 931, `body` = 932, `leg` = 933 WHERE `id` = 918;
UPDATE item_template SET `type` = 18, `head` = 934, `body` = 935, `leg` = 936 WHERE `id` = 919;
UPDATE item_template SET `type` = 18, `head` = 718, `body` = 719, `leg` = 720 WHERE `id` = 936;
UPDATE item_template SET `type` = 18, `head` = 966, `body` = 967, `leg` = 968 WHERE `id` = 942;
UPDATE item_template SET `type` = 18, `head` = 969, `body` = 970, `leg` = 971 WHERE `id` = 943;
UPDATE item_template SET `type` = 18, `head` = 972, `body` = 973, `leg` = 974 WHERE `id` = 944;
UPDATE item_template SET `type` = 18, `head` = 1050, `body` = 1051, `leg` = 1052 WHERE `id` = 967;
UPDATE item_template SET `type` = 18, `head` = 1074, `body` = 1075, `leg` = 1076 WHERE `id` = 1008;
UPDATE item_template SET `type` = 18, `head` = 1089, `body` = 1090, `leg` = 1091 WHERE `id` = 1039;
UPDATE item_template SET `type` = 18, `head` = 1092, `body` = 1093, `leg` = 1094 WHERE `id` = 1040;
UPDATE item_template SET `type` = 18, `head` = 1155, `body` = 1156, `leg` = 1157 WHERE `id` = 1107;
UPDATE item_template SET `type` = 18, `head` = 1158, `body` = 1159, `leg` = 1160 WHERE `id` = 1114;
UPDATE item_template SET `type` = 18, `head` = 1183, `body` = 1184, `leg` = 1185 WHERE `id` = 1188;
UPDATE item_template SET `type` = 18, `head` = 1201, `body` = 1202, `leg` = 1203 WHERE `id` = 1202;
UPDATE item_template SET `type` = 18, `head` = 1201, `body` = 1202, `leg` = 1203 WHERE `id` = 1203;
UPDATE item_template SET `type` = 18, `head` = 1077, `body` = 1078, `leg` = 1079 WHERE `id` = 1207;
UPDATE item_template SET `type` = 18, `head` = 1227, `body` = 1228, `leg` = 1229 WHERE `id` = 1224;
UPDATE item_template SET `type` = 18, `head` = 1233, `body` = 1234, `leg` = 1235 WHERE `id` = 1225;
UPDATE item_template SET `type` = 18, `head` = 1230, `body` = 1231, `leg` = 1232 WHERE `id` = 1226;
UPDATE item_template SET `type` = 18, `head` = 1245, `body` = 1246, `leg` = 1247 WHERE `id` = 1243;
UPDATE item_template SET `type` = 18, `head` = 1248, `body` = 1249, `leg` = 1250 WHERE `id` = 1244;
UPDATE item_template SET `type` = 18, `head` = 1267, `body` = 1268, `leg` = 1269 WHERE `id` = 1256;
UPDATE item_template SET `type` = 18, `head` = 1299, `body` = 1300, `leg` = 1301 WHERE `id` = 1318;
UPDATE item_template SET `type` = 18, `head` = 1302, `body` = 1303, `leg` = 1304 WHERE `id` = 1347;
UPDATE item_template SET `type` = 18, `head` = 1341, `body` = 1342, `leg` = 1343 WHERE `id` = 1414;
UPDATE item_template SET `type` = 18, `head` = 1347, `body` = 1348, `leg` = 1349 WHERE `id` = 1435;
UPDATE item_template SET `type` = 18, `head` = 1365, `body` = 1366, `leg` = 1367 WHERE `id` = 1452;
UPDATE item_template SET `type` = 18, `head` = 1368, `body` = 1369, `leg` = 1370 WHERE `id` = 1458;
UPDATE item_template SET `type` = 18, `head` = 1398, `body` = 1399, `leg` = 1400 WHERE `id` = 1482;
UPDATE item_template SET `type` = 18, `head` = 1401, `body` = 1402, `leg` = 1403 WHERE `id` = 1497;
UPDATE item_template SET `type` = 18, `head` = 1428, `body` = 1429, `leg` = 1430 WHERE `id` = 1550;
UPDATE item_template SET `type` = 18, `head` = 1425, `body` = 1426, `leg` = 1427 WHERE `id` = 1551;
UPDATE item_template SET `type` = 18, `head` = 1437, `body` = 1438, `leg` = 1439 WHERE `id` = 1564;
UPDATE item_template SET `type` = 18, `head` = 1443, `body` = 1444, `leg` = 1445 WHERE `id` = 1568;
UPDATE item_template SET `type` = 18, `head` = 1446, `body` = 1447, `leg` = 1448 WHERE `id` = 1573;
UPDATE item_template SET `type` = 18, `head` = 1473, `body` = 1474, `leg` = 1475 WHERE `id` = 1596;
UPDATE item_template SET `type` = 18, `head` = 1473, `body` = 1474, `leg` = 1475 WHERE `id` = 1597;
UPDATE item_template SET `type` = 18, `head` = 1488, `body` = 1494, `leg` = 1495 WHERE `id` = 1611;
UPDATE item_template SET `type` = 18, `head` = 1496, `body` = 1497, `leg` = 1498 WHERE `id` = 1620;
UPDATE item_template SET `type` = 18, `head` = 1496, `body` = 1497, `leg` = 1498 WHERE `id` = 1621;
UPDATE item_template SET `type` = 18, `head` = 1488, `body` = 1489, `leg` = 1490 WHERE `id` = 1622;
UPDATE item_template SET `type` = 18, `head` = 1505, `body` = 1506, `leg` = 1507 WHERE `id` = 1629;
UPDATE item_template SET `type` = 18, `head` = 1508, `body` = 1509, `leg` = 1510 WHERE `id` = 1630;
UPDATE item_template SET `type` = 18, `head` = 1513, `body` = 1516, `leg` = 1517 WHERE `id` = 1631;
UPDATE item_template SET `type` = 18, `head` = 1523, `body` = 1524, `leg` = 1525 WHERE `id` = 1633;
UPDATE item_template SET `type` = 18, `head` = 1526, `body` = 1529, `leg` = 1530 WHERE `id` = 1654;
UPDATE item_template SET `type` = 18, `head` = 1550, `body` = 1551, `leg` = 1552 WHERE `id` = 1668;
UPDATE item_template SET `type` = 18, `head` = 1558, `body` = 1559, `leg` = 1560 WHERE `id` = 1682;
UPDATE item_template SET `type` = 18, `head` = 1561, `body` = 1562, `leg` = 1563 WHERE `id` = 1683;
UPDATE item_template SET `type` = 18, `head` = 1572, `body` = 1573, `leg` = 1574 WHERE `id` = 1686;
UPDATE item_template SET `type` = 18, `head` = 1464, `body` = 1465, `leg` = 1466 WHERE `id` = 1750;
UPDATE item_template SET `type` = 18, `head` = 1662, `body` = 1663, `leg` = 1764 WHERE `id` = 1765;
UPDATE item_template SET `type` = 18, `head` = 1621, `body` = 1622, `leg` = 1623 WHERE `id` = 1729;
UPDATE item_template SET `type` = 18, `head` = 1616, `body` = 1617, `leg` = 1618 WHERE `id` = 1727;
UPDATE item_template SET `type` = 18, `head` = 1724, `body` = 1725, `leg` = 1726 WHERE `id` = 1789;
UPDATE item_template SET `type` = 18, `head` = 1665, `body` = 1666, `leg` = 1667 WHERE `id` = 1766;
UPDATE item_template SET `type` = 18, `head` = 1668, `body` = 1669, `leg` = 1670 WHERE `id` = 1767;
UPDATE item_template SET `type` = 18, `head` = 1671, `body` = 1672, `leg` = 1673 WHERE `id` = 1768;
UPDATE item_template SET `type` = 18, `head` = 1674, `body` = 1675, `leg` = 1676 WHERE `id` = 1769;
UPDATE item_template SET `type` = 18, `head` = 1677, `body` = 1678, `leg` = 1679 WHERE `id` = 1770;
UPDATE item_template SET `type` = 18, `head` = 1680, `body` = 1681, `leg` = 1682 WHERE `id` = 1771;
UPDATE item_template SET `type` = 18, `head` = 1829, `body` = 1830, `leg` = 1831 WHERE `id` = 1871;
UPDATE item_template SET `type` = 18, `head` = 1823, `body` = 1824, `leg` = 1825 WHERE `id` = 1872;
UPDATE item_template SET `type` = 18, `head` = 1826, `body` = 1827, `leg` = 1828 WHERE `id` = 1873;
UPDATE item_template SET `type` = 18, `head` = 1820, `body` = 1821, `leg` = 1822 WHERE `id` = 1874;

-- 2. Cập nhật các Pet khác có part hoặc tên Pet sang type 18
UPDATE item_template 
SET `type` = 18 
WHERE (`head` != -1 OR `body` != -1 OR `leg` != -1)
   OR `name` LIKE 'Pet %' 
   OR `name` LIKE 'Búp bê %' 
   OR `name` = 'Búp bê';

-- 3. Đảm bảo các Hộp quà / Túi mù / Rương / Capsule / Thức ăn giữ đúng type 27
UPDATE item_template 
SET `type` = 27 
WHERE `name` LIKE '%Hộp%' 
   OR `name` LIKE '%Túi%' 
   OR `name` LIKE '%Gói%' 
   OR `name` LIKE '%Rương%' 
   OR `name` LIKE '%Lì xì%' 
   OR `name` LIKE '%Capsule%' 
   OR `name` LIKE '%Bánh%' 
   OR `name` LIKE '%Kẹo%' 
   OR `name` LIKE '%Trái cây%'
   OR `id` IN (74, 191, 192, 193, 194, 195, 379, 380, 381, 382, 383, 384, 385);
