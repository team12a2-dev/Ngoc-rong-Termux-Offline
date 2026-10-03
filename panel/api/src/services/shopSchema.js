import { exec, query } from '../db.js';

let genderOverrideColumnReady = null;

export async function hasGenderOverrideColumn() {
  if (genderOverrideColumnReady === true) return true;
  if (genderOverrideColumnReady === false) return false;
  try {
    const rows = await query(
      `SELECT 1 AS ok FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'item_shop' AND COLUMN_NAME = 'gender_override'
       LIMIT 1`
    );
    genderOverrideColumnReady = rows.length > 0;
    return genderOverrideColumnReady;
  } catch {
    genderOverrideColumnReady = false;
    return false;
  }
}

/** Tự thêm cột gender_override nếu chưa migrate (panel/sql/migrations/004_*.sql). */
export async function ensureGenderOverrideColumn() {
  if (await hasGenderOverrideColumn()) return { ok: true, created: false };
  try {
    await exec(
      `ALTER TABLE item_shop
       ADD COLUMN gender_override tinyint(4) DEFAULT NULL
       COMMENT '0=TD,1=Namec,2=Xayda,>=3 Chung; NULL=template'
       AFTER icon_spec`
    );
    genderOverrideColumnReady = true;
    return { ok: true, created: true };
  } catch (e) {
    if (/Duplicate column/i.test(e.message)) {
      genderOverrideColumnReady = true;
      return { ok: true, created: false };
    }
    return { ok: false, error: e.message };
  }
}

let snapshotTableReady = null;

export async function ensureShopSnapshotTable() {
  if (snapshotTableReady === true) return true;
  try {
    await exec(`
      CREATE TABLE IF NOT EXISTS panel_shop_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        description VARCHAR(500) DEFAULT NULL,
        snapshot_data LONGTEXT NOT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    snapshotTableReady = true;
    return true;
  } catch (e) {
    console.error('Failed to ensure panel_shop_snapshots table:', e.message);
    snapshotTableReady = false;
    return false;
  }
}
