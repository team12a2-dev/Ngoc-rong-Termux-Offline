-- Remove only the exact regular-mob payloads added by the previous Yardrat fix.
-- Yardrat maps use the Java boss chain; preserve any other admin-customized mobs.
-- Safe to rerun from ./nro.sh setup/start/restart after the database backup.

START TRANSACTION;

UPDATE `map_template`
SET `mobs` = '[]'
WHERE `id` = 131
  AND COALESCE(TRIM(`mobs`), '') = '[[73,9,53000,180,456],[73,9,53000,420,456],[74,9,55000,660,456],[74,9,55000,900,456],[75,9,60000,1140,456],[75,9,60000,1320,456]]';

UPDATE `map_template`
SET `mobs` = '[]'
WHERE `id` = 132
  AND COALESCE(TRIM(`mobs`), '') = '[[73,9,53000,180,456],[74,9,55000,420,456],[74,9,55000,660,456],[75,9,60000,900,456],[75,9,60000,1140,456],[75,9,60000,1320,456]]';

UPDATE `map_template`
SET `mobs` = '[]'
WHERE `id` = 133
  AND COALESCE(TRIM(`mobs`), '') = '[[73,9,53000,180,456],[74,9,55000,420,456],[74,9,55000,660,456],[75,9,60000,900,456],[75,9,60000,1140,456],[75,9,60000,1320,456]]';

COMMIT;

SELECT `id`, `name`, `mobs`
FROM `map_template`
WHERE `id` IN (131, 132, 133)
ORDER BY `id`;
