import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { getDbConfigFromGameConfig, loadGameConfig } from './config/loadGameConfig.js';

dotenv.config();

let pool;

function resolveDbConfig() {
  const fromEnv = {
    host: process.env.GAME_DB_HOST,
    port: process.env.GAME_DB_PORT,
    database: process.env.GAME_DB_NAME,
    user: process.env.GAME_DB_USER,
    password: process.env.GAME_DB_PASS,
  };
  if (fromEnv.host && fromEnv.database) {
    return {
      host: fromEnv.host,
      port: Number(fromEnv.port || 3306),
      database: fromEnv.database,
      user: fromEnv.user || 'root',
      password: fromEnv.password ?? '',
    };
  }
  return getDbConfigFromGameConfig(loadGameConfig());
}

export async function getPool() {
  if (!pool) {
    const cfg = resolveDbConfig();
    pool = mysql.createPool({
      ...cfg,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

export async function exec(sql, params = []) {
  const p = await getPool();
  const [result] = await p.execute(sql, params);
  return result;
}

export async function verifyGameDb() {
  const cfg = resolveDbConfig();
  const conn = await mysql.createConnection(cfg);
  const [rows] = await conn.query('SELECT DATABASE() AS db');
  await conn.end();
  return { ok: true, database: rows[0].db, config: cfg };
}
