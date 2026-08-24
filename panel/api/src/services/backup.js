import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import mysql from 'mysql2/promise';
import { query, exec, getPool } from '../db.js';
import { getServer } from './serverRegistry.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, '../../../backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function createBackup(serverId, label = 'manual') {
  ensureBackupDir();
  const srv = await getServer(serverId);
  if (!srv) throw new Error('Server not found');

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-sv${serverId}-${ts}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const host = srv.game_db_host || 'localhost';
  const port = srv.game_db_port || 3306;
  const user = srv.game_db_user || 'root';
  const pass = srv.game_db_pass || '';
  const db = srv.game_db_name || 'ngocrong';

  try {
    const args = ['-h', host, '-P', String(port), '-u', user, db];
    if (pass) args.splice(0, 0, `--password=${pass}`);
    const { stdout } = await execFileAsync('mysqldump', args, { maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(filePath, stdout, 'utf8');
  } catch {
    await exportViaMysql2(srv, filePath);
  }

  const stat = fs.statSync(filePath);
  const result = await exec(
    `INSERT INTO panel_backups (server_id, file_name, file_path, size_bytes, label) VALUES (?, ?, ?, ?, ?)`,
    [serverId, fileName, filePath, stat.size, label]
  );
  return { id: result.insertId, fileName, filePath, size_bytes: stat.size };
}

async function exportViaMysql2(srv, filePath) {
  const conn = await mysql.createConnection({
    host: srv.game_db_host || 'localhost',
    port: srv.game_db_port || 3306,
    user: srv.game_db_user || 'root',
    password: srv.game_db_pass || '',
    database: srv.game_db_name,
  });
  const lines = [`-- NRO Panel backup ${new Date().toISOString()}`, 'SET FOREIGN_KEY_CHECKS=0;'];
  const [tables] = await conn.query('SHOW TABLES');
  const key = Object.keys(tables[0] || {})[0] || `Tables_in_${srv.game_db_name}`;
  for (const row of tables) {
    const table = row[key];
    const [create] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    lines.push(`${create[0]['Create Table']};`);
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    for (const r of rows) {
      const cols = Object.keys(r).map((c) => `\`${c}\``).join(',');
      const vals = Object.values(r).map((v) => conn.escape(v)).join(',');
      lines.push(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`);
    }
  }
  lines.push('SET FOREIGN_KEY_CHECKS=1;');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  await conn.end();
}

export async function listBackups(serverId) {
  try {
    return await query(
      'SELECT id, server_id, file_name, size_bytes, label, created_at FROM panel_backups WHERE server_id = ? ORDER BY id DESC LIMIT 50',
      [serverId]
    );
  } catch {
    return [];
  }
}

export async function getBackupFile(backupId) {
  const rows = await query('SELECT * FROM panel_backups WHERE id = ? LIMIT 1', [backupId]);
  if (!rows.length) return null;
  const b = rows[0];
  if (!fs.existsSync(b.file_path)) throw new Error('Backup file missing');
  return b;
}

export async function restoreBackup(backupId) {
  const b = await getBackupFile(backupId);
  const srv = await getServer(b.server_id);
  const sql = fs.readFileSync(b.file_path, 'utf8');
  const conn = await mysql.createConnection({
    host: srv.game_db_host || 'localhost',
    port: srv.game_db_port || 3306,
    user: srv.game_db_user || 'root',
    password: srv.game_db_pass || '',
    database: srv.game_db_name,
    multipleStatements: true,
  });
  await conn.query(sql);
  await conn.end();
  return b;
}
