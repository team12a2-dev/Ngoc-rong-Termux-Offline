-- Maintenance window columns (starts_at / ends_at)
-- Run once: mysql -u root -p ngocrong < panel/sql/migrations/002_maintenance_window.sql

ALTER TABLE panel_maintenance_schedules
  ADD COLUMN name VARCHAR(100) DEFAULT 'Bảo trì' AFTER server_id,
  ADD COLUMN starts_at DATETIME NULL AFTER cron_expr,
  ADD COLUMN ends_at DATETIME NULL AFTER starts_at,
  ADD COLUMN status VARCHAR(20) DEFAULT 'pending' AFTER enabled,
  ADD COLUMN started_at TIMESTAMP NULL AFTER status,
  ADD COLUMN ended_at TIMESTAMP NULL AFTER started_at,
  ADD COLUMN notify_message TEXT NULL AFTER ended_at;
