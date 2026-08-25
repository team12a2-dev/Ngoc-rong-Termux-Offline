-- SQL-backed configuration for the Thượng Đế lucky round.
CREATE TABLE IF NOT EXISTS panel_god_spin_configs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  spin_key VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  cost_gem INT UNSIGNED NOT NULL DEFAULT 50,
  cost_gold BIGINT UNSIGNED NOT NULL DEFAULT 2500000,
  cost_ticket INT UNSIGNED NOT NULL DEFAULT 0,
  ticket_temp_id INT NULL,
  daily_limit INT UNSIGNED NOT NULL DEFAULT 100,
  preview_json JSON NULL,
  config_json JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_god_spin_server_key (server_id, spin_key),
  INDEX idx_god_spin_active (server_id, enabled, starts_at, ends_at),
  CONSTRAINT fk_god_spin_server FOREIGN KEY (server_id) REFERENCES panel_servers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_god_spin_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  config_id BIGINT NOT NULL,
  temp_id INT NOT NULL,
  weight INT UNSIGNED NOT NULL DEFAULT 1,
  quantity_min BIGINT UNSIGNED NOT NULL DEFAULT 1,
  quantity_max BIGINT UNSIGNED NOT NULL DEFAULT 1,
  options_json JSON NULL,
  duration_days INT UNSIGNED NULL,
  vip_only TINYINT(1) NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  max_wins INT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_god_spin_config_item (config_id, temp_id),
  INDEX idx_god_spin_item_order (config_id, enabled, sort_order),
  CONSTRAINT fk_god_spin_item_config FOREIGN KEY (config_id) REFERENCES panel_god_spin_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_god_spin_player_stats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  config_id BIGINT NOT NULL,
  player_id BIGINT NOT NULL,
  daily_date DATE NOT NULL,
  daily_spins INT UNSIGNED NOT NULL DEFAULT 0,
  total_spins BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_god_spin_player (config_id, player_id),
  INDEX idx_god_spin_player_day (player_id, daily_date),
  CONSTRAINT fk_god_spin_stats_config FOREIGN KEY (config_id) REFERENCES panel_god_spin_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_god_spin_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  config_id BIGINT NULL,
  player_id BIGINT NULL,
  item_id BIGINT NULL,
  temp_id INT NULL,
  spin_count INT UNSIGNED NOT NULL DEFAULT 1,
  payload JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_god_spin_log_config_time (config_id, created_at),
  INDEX idx_god_spin_log_player_time (player_id, created_at),
  CONSTRAINT fk_god_spin_log_config FOREIGN KEY (config_id) REFERENCES panel_god_spin_configs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE panel_roles
SET permissions = JSON_ARRAY_APPEND(
  JSON_ARRAY_APPEND(permissions, '$', 'godspin.view'), '$', 'godspin.manage'
)
WHERE id = 2
  AND JSON_SEARCH(permissions, 'one', 'godspin.view') IS NULL;
