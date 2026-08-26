-- Explicit probability and permanent-reward controls for God Spin items.
-- ADD COLUMN IF NOT EXISTS keeps repeated Termux DB syncs safe.
ALTER TABLE panel_god_spin_items
  ADD COLUMN IF NOT EXISTS chance_percent DECIMAL(7,4) NULL AFTER weight;

ALTER TABLE panel_god_spin_items
  ADD COLUMN IF NOT EXISTS is_permanent TINYINT(1) NOT NULL DEFAULT 1 AFTER duration_days;

-- Existing weight values were already used as relative probabilities. Preserve
-- their behavior as the initial explicit percentage/weight fallback.
UPDATE panel_god_spin_items
SET chance_percent = weight
WHERE chance_percent IS NULL;

UPDATE panel_god_spin_items
SET is_permanent = CASE
  WHEN duration_days IS NOT NULL AND duration_days > 0 THEN 0
  WHEN options_json IS NOT NULL AND REPLACE(CAST(options_json AS CHAR), ' ', '') LIKE '%"id":93%' THEN 0
  ELSE 1
END;
