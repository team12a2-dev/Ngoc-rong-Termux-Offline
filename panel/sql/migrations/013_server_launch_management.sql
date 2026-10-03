-- Migration 013: Quản lý Khai Mở Server Mới & Đua Top (Vũ Trụ 15 Template)
-- Created for NRO Control Panel

CREATE TABLE IF NOT EXISTS panel_server_launches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL DEFAULT 1,
  server_name VARCHAR(120) NOT NULL DEFAULT 'VŨ TRỤ 15',
  title VARCHAR(255) NOT NULL DEFAULT 'KHAI MỞ VŨ TRỤ 15',
  description TEXT NULL,
  opens_at DATETIME NOT NULL DEFAULT '2026-08-28 10:00:00',
  top_race_ends_at DATETIME NOT NULL DEFAULT '2026-09-07 23:00:00',
  restrictions_end_at DATETIME NOT NULL DEFAULT '2026-10-31 23:59:59',
  status ENUM('draft', 'scheduled', 'active', 'top_ended', 'completed', 'paused') NOT NULL DEFAULT 'active',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  
  -- Quà NPC Khai Mở (Ván Bay MT vĩnh viễn tại NPC Chi Chi)
  npc_gift_enabled TINYINT(1) NOT NULL DEFAULT 1,
  npc_gift_config JSON NULL,
  
  -- Khuyến Mãi Nạp Đầu (Cờ Thùng Rác VV, Pan Vip 30d, Pet Xên Hoàn Hảo 25k SD 30d)
  first_recharge_enabled TINYINT(1) NOT NULL DEFAULT 1,
  first_recharge_config JSON NULL,
  
  -- Cấu hình 3 bảng Đua TOP (Nhiệm vụ, Sức mạnh, Điểm tích lũy)
  race_enabled TINYINT(1) NOT NULL DEFAULT 1,
  race_config JSON NULL,
  
  -- Cấu hình 10 Giới hạn / Quy tắc Server mới
  restrictions_enabled TINYINT(1) NOT NULL DEFAULT 1,
  restrictions_config JSON NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_launch_server (server_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_server_launch_top_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  launch_id INT NOT NULL,
  server_id INT NOT NULL,
  race_category ENUM('mission', 'power', 'recharge_points') NOT NULL,
  snapshot_data JSON NOT NULL,
  total_players INT NOT NULL DEFAULT 0,
  is_distributed TINYINT(1) NOT NULL DEFAULT 0,
  distributed_at DATETIME NULL,
  distributed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_snap_launch_cat (launch_id, race_category),
  CONSTRAINT fk_snap_launch FOREIGN KEY (launch_id) REFERENCES panel_server_launches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_server_launch_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  launch_id INT NOT NULL,
  server_id INT NOT NULL,
  player_id INT NOT NULL,
  account_id INT NOT NULL,
  claim_type ENUM('npc_gift', 'first_recharge', 'top_reward') NOT NULL,
  reward_detail JSON NOT NULL,
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_launch_player_claim (launch_id, player_id, claim_type),
  INDEX idx_claim_launch (launch_id, claim_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
