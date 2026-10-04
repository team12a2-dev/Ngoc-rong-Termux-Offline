import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

// 1. Load mysql2 from panel/api or global
let mysql;
try {
  const mysqlPath = path.resolve(ROOT, 'panel/api/node_modules/mysql2/promise.js');
  if (fs.existsSync(mysqlPath)) {
    const mod = await import(`file://${mysqlPath.replace(/\\/g, '/')}`);
    mysql = mod.default || mod;
  } else {
    const mod = await import('mysql2/promise');
    mysql = mod.default || mod;
  }
} catch (e) {
  console.error('[DB_CHECK][ERROR] Chưa tìm thấy thư viện mysql2:', e.message);
  process.exit(2);
}

// 2. Parse Config.properties
function loadDbConfig() {
  const configPath = path.resolve(ROOT, 'Config.properties');
  const defaults = {
    host: '127.0.0.1',
    port: 3306,
    database: 'ngocrong',
    user: 'root',
    password: ''
  };

  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();

    if (key === 'database.host') defaults.host = val;
    if (key === 'database.port') defaults.port = parseInt(val, 10) || 3306;
    if (key === 'database.name') defaults.database = val;
    if (key === 'database.user') defaults.user = val;
    if (key === 'database.pass') defaults.password = val;
  }
  return defaults;
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');
  const forceImport = args.includes('--force');

  const config = loadDbConfig();
  console.log(`[DB_CHECK] Kết nối: ${config.user}@${config.host}:${config.port} (database: ${config.database})`);

  let conn;
  try {
    conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: true
    });
  } catch (err) {
    if (config.user !== 'root' && (err.code === 'ER_ACCESS_DENIED_ERROR' || err.message.includes('Access denied'))) {
      console.log(`[DB_CHECK] Thu ket noi bang user 'root' (mat khau trong)...`);
      try {
        conn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: 'root',
          password: '',
          multipleStatements: true
        });
        console.log(`[DB_CHECK][OK] Ket noi root thanh cong! Tu dong cap nhat Config.properties...`);
        config.user = 'root';
        config.password = '';
        const cfgFile = path.resolve(ROOT, 'Config.properties');
        if (fs.existsSync(cfgFile)) {
          let text = fs.readFileSync(cfgFile, 'utf8');
          text = text.replace(/^database\.user\s*=.*$/m, 'database.user=root');
          text = text.replace(/^database\.pass\s*=.*$/m, 'database.pass=');
          fs.writeFileSync(cfgFile, text, 'utf8');
        }
      } catch (rootErr) {
        console.error(`[DB_CHECK][FAILED] Khong the ket noi MySQL (${config.host}:${config.port}): ${err.message}`);
        process.exit(1);
      }
    } else {
      console.error(`[DB_CHECK][FAILED] Khong the ket noi MySQL (${config.host}:${config.port}): ${err.message}`);
      process.exit(1);
    }
  }

  try {
    // 1. Tạo Database nếu chưa có
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    await conn.query(`USE \`${config.database}\``);

    // 2. Kiểm tra các bảng
    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(r => Object.values(r)[0].toLowerCase());
    const tableCount = tableNames.length;

    const requiredTables = ['account', 'player', 'item_template', 'shop', 'item_shop'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));

    const isHealthy = tableCount > 0 && missingTables.length === 0;

    if (isHealthy && !forceImport) {
      console.log(`[DB_CHECK][SKIP] Database '${config.database}' đã có dữ liệu (${tableCount} bảng); không import dump và dữ liệu live được giữ nguyên.`);
      console.log(`[DB_CHECK][SKIP] Nguồn dump duy nhất là ${path.resolve(ROOT, 'ngocrong.sql')}. Muốn thay DB hiện tại, dùng lệnh replace có backup.`);
      await conn.end();
      process.exit(0);
    }

    if (checkOnly) {
      console.log(`[DB_CHECK][WARN] Database '${config.database}' chưa hoàn chỉnh (${tableCount} bảng, thiếu: ${missingTables.join(', ') || 'dữ liệu'}).`);
      await conn.end();
      process.exit(3); // Exit 3: Needs import
    }

    // 3. Tiến hành import dữ liệu
    console.log(`[DB_CHECK] Bắt đầu khởi tạo dữ liệu cho database '${config.database}'...`);
    const sqlPath = path.resolve(ROOT, 'ngocrong.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('[DB_CHECK][ERROR] Không tìm thấy nguồn SQL chuẩn duy nhất: ngocrong.sql ở thư mục gốc.');
      await conn.end();
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const sqlHash = createHash('sha256').update(sqlContent, 'utf8').digest('hex');
    console.log(`[DB_CHECK] Nguồn SQL duy nhất: ${path.basename(sqlPath)} (${(Buffer.byteLength(sqlContent, 'utf8') / 1024 / 1024).toFixed(2)} MB; SHA-256 ${sqlHash})`);

    // Giữ nguyên comment trong từng block vì chúng có thể đứng trước DROP TABLE.
    const rawStatements = sqlContent
      .replace(/\r\n/g, '\n')
      .split(/;\s*[\r\n]+/);

    let executed = 0;
    let batch = '';
    const total = rawStatements.length;

    console.log(`[DB_CHECK] Đang nạp dữ liệu (${total} câu lệnh SQL)...`);

    for (let i = 0; i < total; i++) {
      const stmt = rawStatements[i].trim();
      if (!stmt) continue;

      batch += stmt + ';\n';
      executed++;

      // Gửi theo lô khoảng 50 câu lệnh hoặc 200KB
      if (batch.length > 200000 || executed % 50 === 0) {
        try {
          await conn.query(batch);
        } catch (stmtErr) {
          throw new Error(`Import lỗi tại lô kết thúc ở block ${i + 1}/${total}: ${stmtErr.message}`);
        }
        batch = '';
        process.stdout.write(`\r[DB_CHECK] Tiến trình import: ${Math.min(100, Math.round((i / total) * 100))}% (${executed} lệnh)`);
      }
    }

    if (batch.trim()) {
      try {
        await conn.query(batch);
      } catch (stmtErr) {
        throw new Error(`Import lỗi ở lô cuối: ${stmtErr.message}`);
      }
    }

    process.stdout.write(`\r[DB_CHECK] Tiến trình import: 100% (${executed} lệnh)\n`);
    console.log('[DB_CHECK] Hoàn tất import SQL.');

    // Re-check
    const [afterTables] = await conn.query('SHOW TABLES');
    const afterTableNames = afterTables.map(r => Object.values(r)[0].toLowerCase());
    const missingAfter = requiredTables.filter(t => !afterTableNames.includes(t));
    if (missingAfter.length) {
      throw new Error(`Import thiếu bảng bắt buộc: ${missingAfter.join(', ')}`);
    }
    const [accountRows] = await conn.query('SELECT COUNT(*) AS count FROM account');
    const [playerRows] = await conn.query('SELECT COUNT(*) AS count FROM player');
    const accountCount = Number(accountRows[0]?.count ?? 0);
    const playerCount = Number(playerRows[0]?.count ?? 0);
    if (accountCount === 0 || playerCount === 0) {
      throw new Error(`Import xong nhưng dữ liệu cốt lõi rỗng: account=${accountCount}, player=${playerCount}`);
    }
    console.log(`[DB_CHECK][OK] Database '${config.database}': ${afterTables.length} bảng; account=${accountCount}, player=${playerCount}.`);

    const markerDir = path.resolve(ROOT, '.runtime');
    fs.mkdirSync(markerDir, { recursive: true });
    const markerPath = path.resolve(markerDir, 'sql-imported.sha256');
    fs.writeFileSync(markerPath, `${sqlHash}  ngocrong.sql\n`);
    console.log(`[DB_CHECK][OK] Đã ghi marker dump đã nạp: ${markerPath}`);

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error(`[DB_CHECK][ERROR] Xử lý database thất bại: ${err.message}`);
    if (conn) await conn.end();
    process.exit(1);
  }
}

main();
