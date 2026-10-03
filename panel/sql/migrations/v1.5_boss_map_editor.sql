-- ===================================================================
-- Migration: v1.5_boss_map_editor.sql
-- Thêm bảng skill boss, mở rộng cấu hình boss và drop items chuẩn quái
-- ===================================================================

-- 1. Bổ sung các cột mở rộng cho bảng panel_boss_configs nếu chưa có
ALTER TABLE panel_boss_configs
  ADD COLUMN IF NOT EXISTS map_id INT NULL DEFAULT NULL AFTER boss_id,
  ADD COLUMN IF NOT EXISTS spawn_x INT NOT NULL DEFAULT 400 AFTER map_ids,
  ADD COLUMN IF NOT EXISTS spawn_y INT NOT NULL DEFAULT 300 AFTER spawn_x,
  ADD COLUMN IF NOT EXISTS patrol_min_x INT NOT NULL DEFAULT 200 AFTER spawn_y,
  ADD COLUMN IF NOT EXISTS patrol_max_x INT NOT NULL DEFAULT 600 AFTER patrol_min_x,
  ADD COLUMN IF NOT EXISTS move_speed INT NOT NULL DEFAULT 4 AFTER patrol_max_x,
  ADD COLUMN IF NOT EXISTS ai_behavior VARCHAR(32) NOT NULL DEFAULT 'PATROL' AFTER move_speed,
  ADD COLUMN IF NOT EXISTS spawn_condition_type VARCHAR(32) NOT NULL DEFAULT 'TIMER' AFTER max_active,
  ADD COLUMN IF NOT EXISTS spawn_condition_data JSON NULL AFTER spawn_condition_type,
  ADD COLUMN IF NOT EXISTS bosses_together JSON NULL AFTER spawn_condition_data,
  ADD COLUMN IF NOT EXISTS text_appear VARCHAR(255) DEFAULT NULL AFTER bosses_together,
  ADD COLUMN IF NOT EXISTS text_chat VARCHAR(255) DEFAULT NULL AFTER text_appear,
  ADD COLUMN IF NOT EXISTS text_die VARCHAR(255) DEFAULT NULL AFTER text_chat,
  ADD COLUMN IF NOT EXISTS boss_name VARCHAR(100) DEFAULT NULL AFTER text_die,
  ADD COLUMN IF NOT EXISTS disguise_id INT DEFAULT NULL AFTER boss_name,
  ADD COLUMN IF NOT EXISTS head SMALLINT DEFAULT -1 AFTER disguise_id,
  ADD COLUMN IF NOT EXISTS body SMALLINT DEFAULT -1 AFTER head,
  ADD COLUMN IF NOT EXISTS leg SMALLINT DEFAULT -1 AFTER body,
  ADD COLUMN IF NOT EXISTS flag_bag SMALLINT DEFAULT 0 AFTER leg,
  ADD COLUMN IF NOT EXISTS aura TINYINT DEFAULT 0 AFTER flag_bag,
  ADD COLUMN IF NOT EXISTS eff_front TINYINT DEFAULT 0 AFTER aura,
  ADD COLUMN IF NOT EXISTS hp_max BIGINT UNSIGNED DEFAULT 50000000 AFTER eff_front,
  ADD COLUMN IF NOT EXISTS dame INT UNSIGNED DEFAULT 25000 AFTER hp_max,
  ADD COLUMN IF NOT EXISTS gender TINYINT UNSIGNED DEFAULT 0 AFTER dame,
  ADD COLUMN IF NOT EXISTS world_notify TINYINT(1) NOT NULL DEFAULT 1 AFTER gender,
  ADD COLUMN IF NOT EXISTS world_notify_text VARCHAR(255) DEFAULT '' AFTER world_notify;

-- 2. Bảng quản lý Skill của Boss
CREATE TABLE IF NOT EXISTS panel_boss_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boss_config_id INT NOT NULL,
  skill_id INT NOT NULL,
  skill_level INT NOT NULL DEFAULT 1,
  cooldown_ms INT NOT NULL DEFAULT 3000,
  chance_percent DECIMAL(8,4) NOT NULL DEFAULT 50,
  range_distance INT NOT NULL DEFAULT 300,
  trigger_condition VARCHAR(64) DEFAULT 'NONE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_boss_skill_config (boss_config_id),
  CONSTRAINT fk_boss_skill_config FOREIGN KEY (boss_config_id) REFERENCES panel_boss_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Bổ sung các cột mở rộng cho panel_boss_drop_items (chuẩn hóa giống quái)
ALTER TABLE panel_boss_drop_items
  ADD COLUMN IF NOT EXISTS spread_count_min INT UNSIGNED NOT NULL DEFAULT 1 AFTER quantity_max,
  ADD COLUMN IF NOT EXISTS spread_count_max INT UNSIGNED NOT NULL DEFAULT 1 AFTER spread_count_min,
  ADD COLUMN IF NOT EXISTS spread_distance SMALLINT UNSIGNED NOT NULL DEFAULT 25 AFTER spread_count_max,
  ADD COLUMN IF NOT EXISTS player_level_min TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER spread_distance,
  ADD COLUMN IF NOT EXISTS player_level_max TINYINT UNSIGNED NOT NULL DEFAULT 19 AFTER player_level_min,
  ADD COLUMN IF NOT EXISTS time_start_min SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER player_level_max,
  ADD COLUMN IF NOT EXISTS time_end_min SMALLINT UNSIGNED NOT NULL DEFAULT 1440 AFTER time_start_min;
