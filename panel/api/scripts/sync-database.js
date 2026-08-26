#!/usr/bin/env node
/**
 * Đồng bộ panel_* schema với database game đang chạy (đọc Config.properties).
 * Usage: npm run db:sync
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import {
  loadGameConfig,
  getDbConfigFromGameConfig,
  getAgentConfigFromGameConfig,
  ROOT,
} from '../src/config/loadGameConfig.js';
import { REQUIRED_GAME_TABLES, PANEL_TABLES } from '../src/config/gameDbSchema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, '../../sql/panel_schema.sql');
const MIGRATION_PATHS = [
  ['006 Event Management', path.resolve(__dirname, '../../sql/migrations/006_event_management.sql')],
  ['007 Recharge Promotions', path.resolve(__dirname, '../../sql/migrations/007_recharge_promotions.sql')],
  ['008 God Spin Management', path.resolve(__dirname, '../../sql/migrations/008_god_spin_management.sql')],
  ['009 Economy Integrity Fixes', path.resolve(__dirname, '../../sql/migrations/009_economy_integrity_fixes.sql')],
];

async function main() {
  const gameConfig = loadGameConfig();
  const dbConfig = getDbConfigFromGameConfig(gameConfig);
  const agentConfig = getAgentConfigFromGameConfig(gameConfig);

  console.log('=== NRO Panel DB Sync ===');
  console.log(`Config: ${path.join(ROOT, 'Config.properties')}`);
  console.log(`Database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });

  const [dbRows] = await conn.query('SELECT DATABASE() AS db');
  console.log(`Connected: ${dbRows[0].db}`);

  // Verify game tables
  const missing = [];
  for (const table of REQUIRED_GAME_TABLES) {
    const [rows] = await conn.query(
      'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
      [dbConfig.database, table]
    );
    if (rows[0].c === 0) missing.push(table);
  }
  if (missing.length) {
    console.warn('⚠ Missing game tables:', missing.join(', '));
    console.warn('  Import c.sql or fix database.name in Config.properties');
  } else {
    console.log('✓ All required game tables present');
  }

  // Apply panel schema
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await conn.query(sql);
  console.log('✓ Panel schema applied');

  // Feature migrations are persistent in SQL and applied in deterministic order.
  for (const [label, migrationPath] of MIGRATION_PATHS) {
    if (!fs.existsSync(migrationPath)) throw new Error(`Missing migration file: ${migrationPath}`);
    await conn.query(fs.readFileSync(migrationPath, 'utf8'));
    console.log(`✓ ${label} schema applied`);
  }

  // Older databases may already have panel_god_spin_configs from a build
  // that predated currency_mode. CREATE TABLE IF NOT EXISTS cannot upgrade it.
  const [godSpinCurrencyColumn] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'panel_god_spin_configs' AND column_name = 'currency_mode'`,
    [dbConfig.database]
  );
  if (Number(godSpinCurrencyColumn[0].c) === 0) {
    await conn.query(
      `ALTER TABLE panel_god_spin_configs
       ADD COLUMN currency_mode VARCHAR(20) NOT NULL DEFAULT 'both' AFTER timezone`
    );
    console.log('✓ Added panel_god_spin_configs.currency_mode');
  }

  // Backward-compatible migration for map-drop rules created by an older panel build.
  const [dropColumns] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND column_name = 'mob_temp_id'`,
    [dbConfig.database]
  );
  if (Number(dropColumns[0].c) === 0) {
    await conn.query('ALTER TABLE panel_map_drop_items ADD COLUMN mob_temp_id INT NOT NULL DEFAULT -1 AFTER temp_id');
    console.log('✓ Added panel_map_drop_items.mob_temp_id');
  }
  const [oldDropIndex] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND index_name = 'uq_drop_config_item'`,
    [dbConfig.database]
  );
  if (Number(oldDropIndex[0].c) > 0) {
    await conn.query('ALTER TABLE panel_map_drop_items DROP INDEX uq_drop_config_item');
    console.log('✓ Removed legacy drop item unique index');
  }
  const [newDropIndex] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND index_name = 'uq_drop_config_item_mob'`,
    [dbConfig.database]
  );
  if (Number(newDropIndex[0].c) === 0) {
    await conn.query('ALTER TABLE panel_map_drop_items ADD UNIQUE KEY uq_drop_config_item_mob (config_id, temp_id, mob_temp_id)');
    console.log('✓ Added Mob-aware drop item unique index');
  }

  const [levelMinColumn] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND column_name = 'player_level_min'`,
    [dbConfig.database]
  );
  if (Number(levelMinColumn[0].c) === 0) {
    await conn.query('ALTER TABLE panel_map_drop_items ADD COLUMN player_level_min TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER mob_temp_id');
    console.log('✓ Added panel_map_drop_items.player_level_min');
  }
  const [levelMaxColumn] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND column_name = 'player_level_max'`,
    [dbConfig.database]
  );
  if (Number(levelMaxColumn[0].c) === 0) {
    await conn.query('ALTER TABLE panel_map_drop_items ADD COLUMN player_level_max TINYINT UNSIGNED NOT NULL DEFAULT 19 AFTER player_level_min');
    console.log('✓ Added panel_map_drop_items.player_level_max');
  }
  const [oldMobIndex] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND index_name = 'uq_drop_config_item_mob'`,
    [dbConfig.database]
  );
  if (Number(oldMobIndex[0].c) > 0) {
    await conn.query('ALTER TABLE panel_map_drop_items DROP INDEX uq_drop_config_item_mob');
    console.log('✓ Removed Mob-only drop item unique index');
  }
  const [levelIndex] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND index_name = 'uq_drop_config_item_level'`,
    [dbConfig.database]
  );
  if (Number(levelIndex[0].c) === 0) {
    await conn.query('ALTER TABLE panel_map_drop_items ADD UNIQUE KEY uq_drop_config_item_level (config_id, temp_id, mob_temp_id, player_level_min, player_level_max)');
    console.log('✓ Added level-aware drop item unique index');
  }

  const [timeStartColumn] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND column_name = 'time_start_min'`,
    [dbConfig.database]
  );
  if (Number(timeStartColumn[0].c) === 0) {
    await conn.query('ALTER TABLE panel_map_drop_items ADD COLUMN time_start_min SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER player_level_max');
    console.log('✓ Added panel_map_drop_items.time_start_min');
  }
  const [timeEndColumn] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND column_name = 'time_end_min'`,
    [dbConfig.database]
  );
  if (Number(timeEndColumn[0].c) === 0) {
    await conn.query('ALTER TABLE panel_map_drop_items ADD COLUMN time_end_min SMALLINT UNSIGNED NOT NULL DEFAULT 1440 AFTER time_start_min');
    console.log('✓ Added panel_map_drop_items.time_end_min');
  }
  const [oldLevelIndex] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND index_name = 'uq_drop_config_item_level'`,
    [dbConfig.database]
  );
  if (Number(oldLevelIndex[0].c) > 0) {
    await conn.query('ALTER TABLE panel_map_drop_items DROP INDEX uq_drop_config_item_level');
    console.log('✓ Removed level-only drop item unique index');
  }
  const [timeIndex] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'panel_map_drop_items' AND index_name = 'uq_drop_config_item_time'`,
    [dbConfig.database]
  );
  if (Number(timeIndex[0].c) === 0) {
    await conn.query('ALTER TABLE panel_map_drop_items ADD UNIQUE KEY uq_drop_config_item_time (config_id, temp_id, mob_temp_id, player_level_min, player_level_max, time_start_min, time_end_min)');
    console.log('✓ Added time-aware drop item unique index');
  }

  // Backward-compatible migration for the first behavior-based usable-item build.
  const [usableDurationColumn] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'panel_usable_items' AND column_name = 'duration_seconds'`,
    [dbConfig.database]
  );
  if (Number(usableDurationColumn[0].c) === 0) {
    await conn.query('ALTER TABLE panel_usable_items ADD COLUMN duration_seconds INT UNSIGNED NOT NULL DEFAULT 600 AFTER template_id');
    console.log('✓ Added panel_usable_items.duration_seconds');
  }
  const [legacyBehaviorColumn] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'panel_usable_items' AND column_name = 'behavior_key'`,
    [dbConfig.database]
  );
  if (Number(legacyBehaviorColumn[0].c) > 0) {
    const [legacyUsableIndex] = await conn.query(
      `SELECT COUNT(*) AS c FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = 'panel_usable_items' AND index_name = 'idx_usable_item_enabled'`,
      [dbConfig.database]
    );
    if (Number(legacyUsableIndex[0].c) > 0) {
      await conn.query('ALTER TABLE panel_usable_items DROP INDEX idx_usable_item_enabled');
    }
    await conn.query('ALTER TABLE panel_usable_items DROP COLUMN behavior_key');
    await conn.query('ALTER TABLE panel_usable_items ADD INDEX idx_usable_item_enabled (enabled, template_id)');
    console.log('✓ Removed legacy panel_usable_items.behavior_key');
  }

  // Verify panel tables
  for (const table of PANEL_TABLES) {
    const [rows] = await conn.query(
      'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
      [dbConfig.database, table]
    );
    if (rows[0].c === 0) console.warn(`⚠ Panel table missing: ${table}`);
  }

  // Sync panel_servers from Config.properties
  const adminPassword = process.env.PANEL_ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(adminPassword, 10);
  await conn.query(
    `INSERT INTO panel_users (id, username, password_hash, role_id)
     VALUES (1, 'admin', ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [hash]
  );

  await conn.query(
    `INSERT INTO panel_servers (id, name, agent_url, agent_key, game_db_host, game_db_port, game_db_name, game_db_user, game_db_pass, game_port)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       agent_url = VALUES(agent_url),
       agent_key = VALUES(agent_key),
       game_db_host = VALUES(game_db_host),
       game_db_port = VALUES(game_db_port),
       game_db_name = VALUES(game_db_name),
       game_db_user = VALUES(game_db_user),
       game_db_pass = VALUES(game_db_pass),
       game_port = VALUES(game_port)`,
    [
      agentConfig.serverName,
      agentConfig.url,
      agentConfig.key,
      dbConfig.host,
      dbConfig.port,
      dbConfig.database,
      dbConfig.user,
      dbConfig.password,
      agentConfig.gamePort,
    ]
  );

    console.log('✓ panel_servers synced from Config.properties');

  // Make source-defined legacy events and the original Lucky Round pool visible
  // in the SQL-backed panel without overwriting any administrator changes.
  const legacyEvents = [
    ['lunar-new-year-legacy', 'Tết Nguyên Đán', 'lunar_new_year'],
    ['international-womens-day-legacy', 'Quốc tế Phụ nữ', 'international_womens_day'],
    ['christmas-legacy', 'Giáng Sinh', 'christmas'],
    ['halloween-legacy', 'Halloween', 'halloween'],
    ['hung-vuong-legacy', 'Hùng Vương', 'hung_vuong'],
    ['trung-thu-legacy', 'Trung Thu', 'trung_thu'],
    ['top-up-legacy', 'Nạp thẻ', 'top_up'],
    ['pho-anh-hai', 'Phở Anh Hai', 'pho_anh_hai'],
  ];
  for (const [eventKey, name, eventType] of legacyEvents) {
    await conn.execute(
      `INSERT IGNORE INTO panel_events
       (server_id, event_key, name, description, event_type, status, enabled, timezone)
       VALUES (1, ?, ?, ?, ?, 'draft', 0, 'Asia/Ho_Chi_Minh')`,
      [eventKey, name, `Sự kiện có sẵn trong mã nguồn: ${name}`, eventType]
    );
  }
  console.log(`✓ Event catalog synced from source/requested events: ${legacyEvents.length} entries`);

  const [spinConfigRows] = await conn.execute(
    `SELECT id FROM panel_god_spin_configs WHERE server_id = 1 AND spin_key = 'thuong-de-default' LIMIT 1`
  );
  let spinConfigId = spinConfigRows[0]?.id;
  if (!spinConfigId) {
    const [insertedSpin] = await conn.execute(
      `INSERT INTO panel_god_spin_configs
       (server_id, spin_key, name, description, status, enabled, currency_mode, cost_gem, cost_gold, cost_ticket, ticket_temp_id, daily_limit)
       VALUES (1, 'thuong-de-default', 'Vòng quay Thượng Đế mặc định', 'Pool phần thưởng mặc định trong mã nguồn LuckyRound.', 'draft', 0, 'both', 50, 2500000, 1, 821, 100)`,
    );
    spinConfigId = insertedSpin.insertId;
  }
  const spinItems = [
    [190, 80, 100000, 100000, []],
    [1507, 15, 1, 1, []],
    [532, 3, 1, 1, [{ id: 50, min: 1, max: 5 }, { id: 77, min: 1, max: 5 }, { id: 103, min: 1, max: 5 }, { id: 30, min: 1, max: 1 }, { id: 93, min: 1, max: 2 }]],
    [1680, 1, 1, 1, [{ id: 50, min: 1, max: 12 }, { id: 77, min: 1, max: 12 }, { id: 103, min: 1, max: 12 }, { id: 30, min: 1, max: 1 }, { id: 93, min: 1, max: 2 }]],
    [1631, 1, 1, 1, [{ id: 50, min: 1, max: 17 }, { id: 77, min: 1, max: 17 }, { id: 103, min: 1, max: 17 }, { id: 30, min: 1, max: 1 }, { id: 93, min: 1, max: 2 }]],
  ];
  for (const [tempId, weight, quantityMin, quantityMax, options] of spinItems) {
    await conn.execute(
      `INSERT IGNORE INTO panel_god_spin_items
       (config_id, temp_id, weight, quantity_min, quantity_max, options_json, enabled, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [spinConfigId, tempId, weight, quantityMin, quantityMax, JSON.stringify(options), spinItems.findIndex((item) => item[0] === tempId)]
    );
  }
  console.log(`✓ Lucky Round source pool synced: ${spinItems.length} items`);

  console.log('✓ Admin user: admin (password is stored by the Termux launcher)');
  console.log(`✓ Agent URL: ${agentConfig.url}`);



  // Write .env suggestion
  const envPath = path.resolve(__dirname, '../.env');
  const envLines = [
    `PORT=3001`,
    `JWT_SECRET=${process.env.JWT_SECRET || 'nro-panel-change-me'}`,
    `GAME_DB_HOST=${dbConfig.host}`,
    `GAME_DB_PORT=${dbConfig.port}`,
    `GAME_DB_NAME=${dbConfig.database}`,
    `GAME_DB_USER=${dbConfig.user}`,
    `GAME_DB_PASS=${dbConfig.password}`,
    `GAME_AGENT_URL=${agentConfig.url}`,
    `GAME_AGENT_KEY=${agentConfig.key}`,
    `DEFAULT_SERVER_ID=1`,
    `METRICS_INTERVAL_MS=2000`,
    `METRICS_HISTORY_ENABLED=true`,
  ];
  fs.writeFileSync(envPath, envLines.join('\n') + '\n');
  console.log(`✓ Updated ${envPath}`);

  await conn.end();
  console.log('=== Sync complete ===');
}

main().catch((e) => {
  console.error('Sync failed:', e.message);
  if (e.code) console.error(`  code: ${e.code}`);
  if (e.errno != null) console.error(`  errno: ${e.errno}`);
  if (e.sqlState) console.error(`  sqlState: ${e.sqlState}`);
  if (e.sqlMessage && e.sqlMessage !== e.message) console.error(`  sqlMessage: ${e.sqlMessage}`);
  if (e.sql) console.error(`  sql: ${String(e.sql).replace(/\s+/g, ' ').slice(0, 800)}`);
  process.exit(1);
});
