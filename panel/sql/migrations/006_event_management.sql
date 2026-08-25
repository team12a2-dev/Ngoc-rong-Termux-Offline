-- Persistent event management. Source of truth is SQL; runtime may cache only a read snapshot.
CREATE TABLE IF NOT EXISTS panel_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  event_key VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  event_type VARCHAR(40) NOT NULL DEFAULT 'custom',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  repeat_rule VARCHAR(160) NULL,
  min_level INT UNSIGNED NOT NULL DEFAULT 0,
  min_power BIGINT UNSIGNED NOT NULL DEFAULT 0,
  vip_min INT UNSIGNED NOT NULL DEFAULT 0,
  require_clan TINYINT(1) NOT NULL DEFAULT 0,
  min_clan_members INT UNSIGNED NOT NULL DEFAULT 0,
  max_participants INT UNSIGNED NULL,
  once_per_player TINYINT(1) NOT NULL DEFAULT 0,
  cooldown_sec INT UNSIGNED NOT NULL DEFAULT 0,
  config_json JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_server_key (server_id, event_key),
  INDEX idx_event_schedule (server_id, enabled, starts_at, ends_at),
  CONSTRAINT fk_event_server FOREIGN KEY (server_id) REFERENCES panel_servers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_event_objectives (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  objective_type VARCHAR(40) NOT NULL DEFAULT 'collect',
  title VARCHAR(180) NOT NULL,
  target_id INT NULL,
  target_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
  required_count BIGINT UNSIGNED NOT NULL DEFAULT 1,
  map_ids JSON NULL,
  zone_policy VARCHAR(20) NOT NULL DEFAULT 'any',
  recipe_json JSON NULL,
  config_json JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_objective_order (event_id, sort_order),
  CONSTRAINT fk_event_objective_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_event_rewards (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  reward_type VARCHAR(30) NOT NULL DEFAULT 'item',
  temp_id INT NULL,
  quantity_min BIGINT UNSIGNED NOT NULL DEFAULT 1,
  quantity_max BIGINT UNSIGNED NOT NULL DEFAULT 1,
  chance_percent DECIMAL(8,4) NOT NULL DEFAULT 100,
  duration_days INT UNSIGNED NULL,
  rank_min INT UNSIGNED NULL,
  rank_max INT UNSIGNED NULL,
  options_json JSON NULL,
  config_json JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_reward_order (event_id, sort_order),
  CONSTRAINT fk_event_reward_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_event_shops (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  currency_type VARCHAR(30) NOT NULL DEFAULT 'event_point',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  config_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_shop_event (event_id, enabled),
  CONSTRAINT fk_event_shop_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_event_shop_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT NOT NULL,
  temp_id INT NOT NULL,
  price BIGINT UNSIGNED NOT NULL DEFAULT 0,
  stock INT UNSIGNED NULL,
  limit_per_player INT UNSIGNED NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  config_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_shop_item (shop_id, enabled),
  CONSTRAINT fk_event_shop_item_shop FOREIGN KEY (shop_id) REFERENCES panel_event_shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_event_participants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  player_id INT NOT NULL,
  clan_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'joined',
  points BIGINT NOT NULL DEFAULT 0,
  progress_json JSON NULL,
  claims_json JSON NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_player (event_id, player_id),
  INDEX idx_event_participant_points (event_id, points),
  CONSTRAINT fk_event_participant_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_event_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NULL,
  action VARCHAR(60) NOT NULL,
  payload JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_log_event_time (event_id, created_at),
  CONSTRAINT fk_event_log_event FOREIGN KEY (event_id) REFERENCES panel_events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Grant event access to the built-in admin role without changing owner wildcard access.
UPDATE panel_roles
SET permissions = JSON_ARRAY_APPEND(
  JSON_ARRAY_APPEND(permissions, '$', 'event.view'), '$', 'event.manage'
)
WHERE id = 2
  AND JSON_SEARCH(permissions, 'one', 'event.view') IS NULL;
