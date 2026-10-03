import { query } from './db.js';

async function main() {
  console.log('--- Configuring Badges in DB ---');
  
  // 1. Insert into data_badges
  const badgesData = [
    { id: 19, idEffect: 504, idItem: 1968, name: 'Mùa đông không lạnh', options: JSON.stringify([{ param: 10, id: 50 }, { param: 10, id: 77 }, { param: 10, id: 103 }, { param: 30, id: 93 }]) },
    { id: 20, idEffect: 506, idItem: 1970, name: 'Chiến binh sao đen', options: JSON.stringify([{ param: 15, id: 50 }, { param: 15, id: 77 }, { param: 15, id: 103 }, { param: 30, id: 93 }]) },
    { id: 21, idEffect: 511, idItem: 1971, name: 'Danh hiệu Đón Xuân', options: JSON.stringify([{ param: 12, id: 50 }, { param: 12, id: 77 }, { param: 12, id: 103 }, { param: 30, id: 93 }]) },
  ];

  for (const b of badgesData) {
    const existing = await query('SELECT id FROM data_badges WHERE id = ? OR idItem = ?', [b.id, b.idItem]);
    if (existing.length) {
      await query('UPDATE data_badges SET idEffect = ?, idItem = ?, NAME = ?, Options = ? WHERE id = ?', [b.idEffect, b.idItem, b.name, b.options, existing[0].id]);
      console.log(`Updated data_badges for item #${b.idItem} (${b.name})`);
    } else {
      await query('INSERT INTO data_badges (id, idEffect, idItem, NAME, Options) VALUES (?, ?, ?, ?, ?)', [b.id, b.idEffect, b.idItem, b.name, b.options]);
      console.log(`Inserted data_badges for item #${b.idItem} (${b.name})`);
    }
  }

  // 2. Insert into item_shop for tab 44 (Danh hiệu) & tab 45 (Sở hữu)
  for (const tid of [1968, 1970, 1971]) {
    for (const tabId of [44, 45]) {
      const exists = await query('SELECT id FROM item_shop WHERE tab_id = ? AND temp_id = ?', [tabId, tid]);
      if (!exists.length) {
        await query('INSERT INTO item_shop (tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec, create_time, sort_order) VALUES (?, ?, 1, 1, 1, 2, 0, NOW(), 0)', [tabId, tid]);
        console.log(`Inserted item_shop temp_id #${tid} to tab #${tabId}`);
      } else {
        console.log(`item_shop temp_id #${tid} already in tab #${tabId}`);
      }
    }
  }

  const results = await query('SELECT * FROM data_badges WHERE idItem IN (1290, 1968, 1970, 1971)');
  console.log('All Configured Badges in DB:', results);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
