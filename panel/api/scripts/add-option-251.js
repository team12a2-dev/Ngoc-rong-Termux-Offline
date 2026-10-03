import mysql from 'mysql2/promise';
import { loadGameConfig, getDbConfigFromGameConfig } from '../src/config/loadGameConfig.js';

async function main() {
  try {
    const gameConfig = loadGameConfig();
    const dbConfig = getDbConfigFromGameConfig(gameConfig);
    console.log(`Connecting to database ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    await conn.execute("INSERT INTO `item_option_template` (`id`, `name`) VALUES (251, '#% đánh quái rơi ra ngọc xanh') ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)");
    console.log('Successfully inserted/updated option 251 into database!');

    const [rows] = await conn.execute("SELECT id, name FROM item_option_template WHERE id >= 248 ORDER BY id ASC");
    console.log('Current option templates (id >= 248):');
    console.table(rows);

    await conn.end();
  } catch (err) {
    console.error('Error updating DB:', err);
    process.exit(1);
  }
}

main();
