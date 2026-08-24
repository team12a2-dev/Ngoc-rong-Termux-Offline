-- Schedule type options (once / daily / weekly / cron)
-- mysql -u root -p ngocrong < panel/sql/migrations/003_maintenance_schedule_types.sql

ALTER TABLE panel_maintenance_schedules
  ADD COLUMN schedule_type VARCHAR(20) DEFAULT 'window' AFTER name,
  ADD COLUMN daily_start_time VARCHAR(5) NULL AFTER ends_at,
  ADD COLUMN daily_end_time VARCHAR(5) NULL AFTER daily_start_time,
  ADD COLUMN repeat_days VARCHAR(30) NULL AFTER daily_end_time;
