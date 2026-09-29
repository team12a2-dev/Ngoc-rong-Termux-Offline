-- Restore regular enemies on the three Yardart maps.
-- Existing templates are reused: 73 Kawazu, 74 Kinkarn, 75 Arbee.
-- Each spawn tuple is [mobTemplateId, level, hp, x, y].
-- Safe to rerun: only rows whose mobs field is still [] are changed.
-- ./nro.sh setup/start/restart applies this after the automatic database backup.

START TRANSACTION;

UPDATE `map_template`
SET `mobs` = '[[73,9,53000,180,456],[73,9,53000,420,456],[74,9,55000,660,456],[74,9,55000,900,456],[75,9,60000,1140,456],[75,9,60000,1320,456]]'
WHERE `id` = 131 AND COALESCE(TRIM(`mobs`), '') = '[]';

UPDATE `map_template`
SET `mobs` = '[[73,9,53000,180,456],[74,9,55000,420,456],[74,9,55000,660,456],[75,9,60000,900,456],[75,9,60000,1140,456],[75,9,60000,1320,456]]'
WHERE `id` = 132 AND COALESCE(TRIM(`mobs`), '') = '[]';

UPDATE `map_template`
SET `mobs` = '[[73,9,53000,180,456],[74,9,55000,420,456],[74,9,55000,660,456],[75,9,60000,900,456],[75,9,60000,1140,456],[75,9,60000,1320,456]]'
WHERE `id` = 133 AND COALESCE(TRIM(`mobs`), '') = '[]';

COMMIT;

SELECT `id`, `name`, `mobs`
FROM `map_template`
WHERE `id` IN (131, 132, 133)
ORDER BY `id`;
