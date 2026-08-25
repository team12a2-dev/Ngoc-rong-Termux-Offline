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
  process.exit(1);
});
