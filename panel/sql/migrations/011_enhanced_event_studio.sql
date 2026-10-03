-- ===================================================================
-- Migration: 011_enhanced_event_studio.sql
-- Nâng cấp hệ thống Event Studio: NPCs, Drops, Custom Bosses, Recipes
-- ===================================================================

-- 1. Bảng cấu hình NPC Sự Kiện / Bot NPC
CREATE TABLE IF NOT EXISTS panel_event_npcs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  map_id INT NOT NULL,
  cx INT NOT NULL DEFAULT 400,
  cy INT NOT NULL DEFAULT 400,
  npc_name VARCHAR(100) NULL,
  hide_name TINYINT(1) NOT NULL DEFAULT 0,
  model_type VARCHAR(20) NOT NULL DEFAULT 'costume', -- costume | icon | template
  temp_id INT NOT NULL DEFAULT -1,
  disguise_id INT NULL,
  head SMALLINT NOT NULL DEFAULT -1,
  body SMALLINT NOT NULL DEFAULT -1,
  leg SMALLINT NOT NULL DEFAULT -1,
  avatar_id INT NOT NULL DEFAULT 0,
  dialog_avatar_id INT NOT NULL DEFAULT 0,
  greeting_text TEXT NULL,
  sub_dialog_text TEXT NULL,
  auto_chat_phrases JSON NULL,
  chat_interval_sec INT NOT NULL DEFAULT 15,
  menus_json JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_npc_event (event_id, map_id),
  CONSTRAINT fk_event_npc_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Bảng cấu hình Rơi Vật Phẩm Sự Kiện (Event Drops)
CREATE TABLE IF NOT EXISTS panel_event_drops (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  temp_id INT NOT NULL,
  item_name VARCHAR(120) NULL,
  drop_source VARCHAR(20) NOT NULL DEFAULT 'mob', -- mob | boss | all
  chance_percent DECIMAL(8,4) NOT NULL DEFAULT 10.0000,
  quantity_min INT UNSIGNED NOT NULL DEFAULT 1,
  quantity_max INT UNSIGNED NOT NULL DEFAULT 1,
  map_ids JSON NULL,
  mob_ids JSON NULL,
  mob_level_min INT UNSIGNED NOT NULL DEFAULT 0,
  mob_level_max INT UNSIGNED NOT NULL DEFAULT 999,
  daily_cap_per_player INT UNSIGNED NULL,
  options_json JSON NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_drop_event (event_id, enabled),
  CONSTRAINT fk_event_drop_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Bảng cấu hình Boss Sự Kiện Tùy Chỉnh (Event Bosses)
CREATE TABLE IF NOT EXISTS panel_event_bosses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  boss_id INT NOT NULL,
  boss_name VARCHAR(100) NOT NULL,
  map_ids JSON NOT NULL,
  zone_policy VARCHAR(20) NOT NULL DEFAULT 'random',
  zone_min INT NOT NULL DEFAULT 0,
  zone_max INT NOT NULL DEFAULT 99,
  hp_max BIGINT UNSIGNED NOT NULL DEFAULT 50000000,
  dame INT UNSIGNED NOT NULL DEFAULT 20000,
  model_type VARCHAR(20) NOT NULL DEFAULT 'costume',
  disguise_id INT NULL,
  head SMALLINT NOT NULL DEFAULT -1,
  body SMALLINT NOT NULL DEFAULT -1,
  leg SMALLINT NOT NULL DEFAULT -1,
  avatar_id INT NOT NULL DEFAULT 0,
  respawn_min_sec INT NOT NULL DEFAULT 60,
  respawn_max_sec INT NOT NULL DEFAULT 300,
  max_active INT NOT NULL DEFAULT 1,
  skills_json JSON NULL,
  drops_json JSON NULL,
  world_notify TINYINT(1) NOT NULL DEFAULT 1,
  text_appear VARCHAR(255) NULL,
  text_die VARCHAR(255) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_boss_event (event_id, enabled),
  CONSTRAINT fk_event_boss_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bảng cấu hình Công Thức Quy Đổi Vật Phẩm (Event Recipes / Crafting)
CREATE TABLE IF NOT EXISTS panel_event_recipes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  inputs_json JSON NOT NULL,
  gold_cost BIGINT UNSIGNED NOT NULL DEFAULT 0,
  gem_cost INT UNSIGNED NOT NULL DEFAULT 0,
  ruby_cost INT UNSIGNED NOT NULL DEFAULT 0,
  event_point_cost INT UNSIGNED NOT NULL DEFAULT 0,
  outputs_json JSON NOT NULL,
  success_rate DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  max_per_player INT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_recipe_event (event_id, enabled),
  CONSTRAINT fk_event_recipe_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
