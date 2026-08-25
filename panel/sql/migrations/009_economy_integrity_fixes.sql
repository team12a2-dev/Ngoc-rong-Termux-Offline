-- Persistent idempotency ledger for one-time giftcode claims.
CREATE TABLE IF NOT EXISTS giftcode_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  giftcode_id INT NOT NULL,
  player_id INT NOT NULL,
  code_snapshot VARCHAR(255) NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_giftcode_player (giftcode_id, player_id),
  INDEX idx_giftcode_claim_player (player_id, claimed_at),
  INDEX idx_giftcode_claim_code (giftcode_id, claimed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One persistent token is created for each Namek wish instance. A player can
-- receive at most one selected reward for that wish, even after reconnect/retry.
CREATE TABLE IF NOT EXISTS namek_wish_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wish_token CHAR(36) NOT NULL,
  player_id INT NOT NULL,
  reward_type TINYINT UNSIGNED NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'delivered',
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_namek_wish_player_reward (wish_token, player_id, reward_type),
  INDEX idx_namek_wish_token (wish_token, claimed_at),
  INDEX idx_namek_wish_player (player_id, claimed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
