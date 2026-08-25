CREATE TABLE IF NOT EXISTS panel_boss_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  boss_id INT NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  map_ids JSON NOT NULL,
  zone_policy VARCHAR(20) NOT NULL DEFAULT 'random',
  zone_min TINYINT UNSIGNED NOT NULL DEFAULT 2,
  zone_max TINYINT UNSIGNED NOT NULL DEFAULT 99,
  spawn_chance_percent DECIMAL(8,4) NOT NULL DEFAULT 100,
  respawn_min_sec INT UNSIGNED NOT NULL DEFAULT 60,
  respawn_max_sec INT UNSIGNED NOT NULL DEFAULT 600,
  max_active INT UNSIGNED NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_boss_config_server_boss (server_id, boss_id),
  INDEX idx_boss_config_server_enabled (server_id, enabled),
  CONSTRAINT fk_boss_config_server FOREIGN KEY (server_id) REFERENCES panel_servers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_boss_drop_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boss_config_id INT NOT NULL,
  temp_id INT NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  chance_percent DECIMAL(8,4) NOT NULL DEFAULT 100,
  quantity_min INT UNSIGNED NOT NULL DEFAULT 1,
  quantity_max INT UNSIGNED NOT NULL DEFAULT 1,
  options_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_boss_drop_config (boss_config_id, enabled),
  CONSTRAINT fk_boss_drop_config FOREIGN KEY (boss_config_id) REFERENCES panel_boss_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
