import { getPool, query } from '../src/db.js';

async function main() {
  try {
    const pool = await getPool();
    console.log('Connecting to database...');

    const sql = `
      REPLACE INTO item_template 
      (id, type, gender, name, description, level, icon_id, part, is_up_to_up, power_require, gold, gem, head, body, leg) 
      VALUES
      (1829, 5, 3, 'Cải trang N', 'Vật phẩm sự kiện', 1, 17329, -1, 0, 0, 0, 0, 2012, 2010, 2011),
      (1830, 5, 3, 'Cải trang N', 'Vật phẩm sự kiện', 1, 17200, -1, 0, 0, 0, 0, 2009, 2007, 2008),
      (1831, 5, 3, 'Cải trang N', 'Vật phẩm sự kiện', 1, 17263, -1, 0, 0, 0, 0, 2006, 2004, 2005),
      (1832, 5, 3, 'Cải trang N', 'Vật phẩm sự kiện', 1, 17297, -1, 0, 0, 0, 0, 2003, 2001, 2002),
      (1833, 5, 3, 'Cải trang N', 'Vật phẩm sự kiện', 1, 17265, -1, 0, 0, 0, 0, 2000, 2001, 2002),
      (1834, 5, 3, 'Cải trang Pan Trung Thu', 'Vật phẩm sự kiện', 1, 17191, -1, 0, 0, 0, 0, 1995, 1996, 1997);
    `;

    const [result] = await pool.query(sql);
    console.log('--- INSERT / REPLACE RESULT ---');
    console.log('Status: PASSED');
    console.log('Affected rows:', result.affectedRows);

    const rows = await query('SELECT id, type, gender, name, description, level, icon_id, part, head, body, leg FROM item_template WHERE id BETWEEN 1829 AND 1834 ORDER BY id ASC');
    console.log('\n--- VERIFICATION FROM DATABASE ---');
    console.table(rows);

    process.exit(0);
  } catch (err) {
    console.error('Database execution error:', err);
    process.exit(1);
  }
}

main();
