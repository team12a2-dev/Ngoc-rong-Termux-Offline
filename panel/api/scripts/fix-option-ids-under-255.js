import mysql from 'mysql2/promise';
import { loadGameConfig, getDbConfigFromGameConfig } from '../src/config/loadGameConfig.js';

async function main() {
  try {
    const gameConfig = loadGameConfig();
    const dbConfig = getDbConfigFromGameConfig(gameConfig);
    console.log(`Connecting to database ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    // Delete any overflow IDs >= 260
    await conn.execute("DELETE FROM `item_option_template` WHERE id >= 260");
    console.log('[OK] Cleaned up IDs >= 260');

    const options = [
      [167, 'Set Thần hủy diệt Champa'],
      [168, '$[2] Tăng vừa phải sát thương lên boss'],
      [169, '$[4] Tăng đáng kể sát thương lên boss'],
      [172, '$[5] Tăng mạnh sát thương lên boss và tăng đáng kể sức đánh chí mạng'],
      [185, 'Hạn sử dụng # giờ'],
      [218, 'Dành cho đệ tử 2'],
      [235, 'Wow: Tăng #% Chí mạng cho người xung quanh'],
      [249, 'Cool: +#% sức đánh bản thân và đồng minh'],
      [250, 'Hồi HP +#%/10s cho bản thân và đồng minh'],
      [252, 'Sát thương cuối +#%'],
      [253, '#% cơ hội ra Chống Lạnh'],
      [254, 'Ngầu +#% giảm sát thương cho người xung quanh']
    ];

    for (const [id, name] of options) {
      await conn.execute(
        "INSERT INTO `item_option_template` (`id`, `name`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)",
        [id, name]
      );
      console.log(`[OK] Inserted/Updated option ${id}: ${name}`);
    }

    const [rows] = await conn.execute("SELECT id, name FROM item_option_template WHERE id IN (167, 168, 169, 172, 185, 218, 235, 249, 250, 252, 253, 254) ORDER BY id ASC");
    console.log('\n--- Bảng 12 Option Mới trong Database (Tất cả ID <= 255) ---');
    console.table(rows);

    await conn.end();
    console.log('\n=> Đã cập nhật thành công toàn bộ Option vào khoảng an toàn Byte (0-255)!');
  } catch (err) {
    console.error('Lỗi khi cập nhật Database:', err);
    process.exit(1);
  }
}

main();
