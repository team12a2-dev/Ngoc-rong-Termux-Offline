import mysql from 'mysql2/promise';
import { loadGameConfig, getDbConfigFromGameConfig } from '../src/config/loadGameConfig.js';

async function main() {
  try {
    const gameConfig = loadGameConfig();
    const dbConfig = getDbConfigFromGameConfig(gameConfig);
    console.log(`Connecting to database ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`);
    
    const conn = await mysql.createConnection(dbConfig);
    
    const options = [
      [260, 'Wow: Tăng #% Chí mạng cho người xung quanh'],
      [261, 'Sát thương cuối +#%'],
      [262, '#% cơ hội ra Chống Lạnh'],
      [263, 'Ngầu +#% giảm sát thương cho người xung quanh'],
      [264, 'Dành cho đệ tử 2'],
      [265, '$[2] Tăng vừa phải sát thương lên boss'],
      [266, '$[4] Tăng đáng kể sát thương lên boss'],
      [267, '$[5] Tăng mạnh sát thương lên boss và tăng đáng kể sức đánh chí mạng'],
      [268, 'Hạn sử dụng # giờ'],
      [269, 'Hồi HP +#%/10s cho bản thân và đồng minh'],
      [270, 'Cool: +#% sức đánh bản thân và đồng minh'],
      [271, 'Set Thần hủy diệt Champa']
    ];

    for (const [id, name] of options) {
      await conn.execute(
        "INSERT INTO `item_option_template` (`id`, `name`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)",
        [id, name]
      );
      console.log(`[OK] Inserted/Updated option ${id}: ${name}`);
    }

    const [rows] = await conn.execute("SELECT id, name FROM item_option_template WHERE id >= 250 ORDER BY id ASC");
    console.log('\n--- Bảng item_option_template hiện tại (id >= 250) ---');
    console.table(rows);

    await conn.end();
    console.log('\n=> Đã cập nhật thành công 12 option mới vào Database!');
  } catch (err) {
    console.error('Lỗi khi cập nhật Database:', err);
    process.exit(1);
  }
}

main();
