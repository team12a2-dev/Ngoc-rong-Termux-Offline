-- NRO Control Panel schema (panel_* tables)
-- Run: mysql -u root -p ngocrong < panel/sql/panel_schema.sql

CREATE TABLE IF NOT EXISTS panel_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  twofa_secret VARCHAR(64) DEFAULT NULL,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES panel_roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_servers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  agent_url VARCHAR(255) NOT NULL DEFAULT 'http://127.0.0.1:9090',
  agent_key VARCHAR(255) NOT NULL,
  game_db_host VARCHAR(100) DEFAULT 'localhost',
  game_db_port INT DEFAULT 3306,
  game_db_name VARCHAR(100) DEFAULT 'ngocrong',
  game_db_user VARCHAR(100) DEFAULT 'root',
  game_db_pass VARCHAR(255) DEFAULT '',
  game_port INT DEFAULT 14445,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  server_id INT NULL,
  action VARCHAR(100) NOT NULL,
  target VARCHAR(255) DEFAULT NULL,
  request_body JSON NULL,
  response JSON NULL,
  ip VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_server_metrics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL,
  online_count INT DEFAULT 0,
  session_count INT DEFAULT 0,
  cpu_process FLOAT DEFAULT 0,
  cpu_system FLOAT DEFAULT 0,
  ram_jvm_gb FLOAT DEFAULT 0,
  ram_os_gb FLOAT DEFAULT 0,
  thread_count INT DEFAULT 0,
  exp_rate FLOAT DEFAULT 1,
  admin_mode TINYINT(1) DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metrics_server_time (server_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_config_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL,
  file_name VARCHAR(100) NOT NULL,
  content LONGTEXT NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_plugins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plugin_id VARCHAR(100) NOT NULL UNIQUE,
  manifest JSON NOT NULL,
  enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_broadcast_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_maintenance_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  name VARCHAR(100) DEFAULT 'Bảo trì',
  schedule_type VARCHAR(20) DEFAULT 'window',
  cron_expr VARCHAR(100) DEFAULT '',
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  daily_start_time VARCHAR(5) NULL,
  daily_end_time VARCHAR(5) NULL,
  repeat_days VARCHAR(30) NULL,
  seconds INT NOT NULL DEFAULT 60,
  enabled TINYINT(1) DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  notify_message TEXT NULL,
  last_run TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_alert_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  threshold FLOAT NOT NULL,
  channel VARCHAR(50) DEFAULT 'webhook',
  webhook_url VARCHAR(500) DEFAULT NULL,
  enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_alert_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  rule_id INT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_backups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  label VARCHAR(100) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_backup_server (server_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_map_drop_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  map_id INT NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  gold_enabled TINYINT(1) NOT NULL DEFAULT 0,
  gold_chance_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  gold_min INT UNSIGNED NOT NULL DEFAULT 0,
  gold_max INT UNSIGNED NOT NULL DEFAULT 0,
  activation_enabled TINYINT(1) NOT NULL DEFAULT 0,
  activation_chance_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_drop_server_map (server_id, map_id),
  INDEX idx_drop_server_enabled (server_id, enabled, map_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_map_drop_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_id INT NOT NULL,
  temp_id INT NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  chance_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  quantity_min INT UNSIGNED NOT NULL DEFAULT 1,
  quantity_max INT UNSIGNED NOT NULL DEFAULT 1,
  options_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_drop_config_item (config_id, temp_id),
  INDEX idx_drop_item_config (config_id, enabled),
  CONSTRAINT fk_drop_item_config FOREIGN KEY (config_id) REFERENCES panel_map_drop_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO panel_roles (id, name, permissions) VALUES
(1, 'owner', '["*"]'),
(2, 'admin', '["dashboard.view","player.view","player.kick","player.buff","account.view","account.ban","account.edit","server.maint","server.config","server.broadcast","boss.control","giftcode.manage","logs.view"]'),
(3, 'moderator', '["dashboard.view","player.view","player.kick","account.view","account.ban","server.broadcast","logs.view"]'),
(4, 'support', '["dashboard.view","player.view","player.kick","player.buff","account.view","server.broadcast"]'),
(5, 'viewer', '["dashboard.view","player.view","account.view"]');

-- Default admin: admin / admin123 (bcrypt)
INSERT IGNORE INTO panel_users (id, username, password_hash, role_id) VALUES
(1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 1);

INSERT IGNORE INTO panel_servers (id, name, agent_url, agent_key, game_db_name) VALUES
(1, 'Server 1', 'http://127.0.0.1:9090', 'change-me-in-production', 'ngocrong');

INSERT IGNORE INTO panel_broadcast_templates (name, message) VALUES
('Bảo trì', 'Server sẽ bảo trì sau ít phút. Vui lòng thoát game.'),
('X2 EXP', '🔥 EXP server x2 đang diễn ra!');
