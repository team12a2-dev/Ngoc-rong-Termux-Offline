-- SQL-backed top-up promotion campaigns. Runtime workers may cache nothing authoritative.
CREATE TABLE IF NOT EXISTS panel_recharge_campaigns (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  campaign_key VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  sources_json JSON NOT NULL,
  config_json JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recharge_campaign_server_key (server_id, campaign_key),
  INDEX idx_recharge_campaign_active (server_id, enabled, starts_at, ends_at),
  CONSTRAINT fk_recharge_campaign_server FOREIGN KEY (server_id) REFERENCES panel_servers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_recharge_tiers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  threshold_amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
  gem_bonus BIGINT UNSIGNED NOT NULL DEFAULT 0,
  ruby_bonus BIGINT UNSIGNED NOT NULL DEFAULT 0,
  bonus_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  bonus_json JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_recharge_tier_campaign_amount (campaign_id, threshold_amount),
  CONSTRAINT fk_recharge_tier_campaign FOREIGN KEY (campaign_id) REFERENCES panel_recharge_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_recharge_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  source_table VARCHAR(40) NOT NULL,
  source_id BIGINT NOT NULL,
  transaction_key VARCHAR(180) NOT NULL,
  payer_key VARCHAR(255) NULL,
  player_id BIGINT NULL,
  account_id BIGINT NULL,
  amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  raw_json JSON NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recharge_campaign_transaction (campaign_id, transaction_key),
  INDEX idx_recharge_transaction_player (player_id, status, created_at),
  CONSTRAINT fk_recharge_transaction_campaign FOREIGN KEY (campaign_id) REFERENCES panel_recharge_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_recharge_claims (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  transaction_id BIGINT NOT NULL,
  tier_id BIGINT NULL,
  player_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  grant_json JSON NOT NULL,
  delivery_channel VARCHAR(30) NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recharge_claim (campaign_id, transaction_id, player_id),
  INDEX idx_recharge_claim_pending (status, locked_at, created_at),
  CONSTRAINT fk_recharge_claim_campaign FOREIGN KEY (campaign_id) REFERENCES panel_recharge_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_recharge_claim_transaction FOREIGN KEY (transaction_id) REFERENCES panel_recharge_transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_recharge_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NULL,
  action VARCHAR(60) NOT NULL,
  payload JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recharge_log_campaign_time (campaign_id, created_at),
  CONSTRAINT fk_recharge_log_campaign FOREIGN KEY (campaign_id) REFERENCES panel_recharge_campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE panel_roles
SET permissions = JSON_ARRAY_APPEND(
  JSON_ARRAY_APPEND(permissions, '$', 'recharge.view'), '$', 'recharge.manage'
)
WHERE id = 2
  AND JSON_SEARCH(permissions, 'one', 'recharge.view') IS NULL;
