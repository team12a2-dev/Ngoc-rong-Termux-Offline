import { query } from './src/db.js';

async function setupTrungThuShop() {
  const existing = await query("SELECT id FROM shop WHERE tag_name = 'TRUNG_THU'");
  let shopId = existing[0]?.id;
  if (!shopId) {
    await query("INSERT INTO shop (id, npc_id, tag_name, type_shop) VALUES (37, 69, 'TRUNG_THU', 3) ON DUPLICATE KEY UPDATE tag_name = 'TRUNG_THU'");
    shopId = 37;
    console.log('Created shop TRUNG_THU with id:', shopId);
  } else {
    console.log('Found existing shop TRUNG_THU with id:', shopId);
  }

  const existingTab = await query('SELECT id FROM tab_shop WHERE shop_id = ?', [shopId]);
  let tabId = existingTab[0]?.id;
  if (!tabId) {
    await query("INSERT INTO tab_shop (id, shop_id, NAME) VALUES (64, ?, 'Đổi<>Thưởng') ON DUPLICATE KEY UPDATE shop_id = ?", [shopId, shopId]);
    tabId = 64;
    console.log('Created tab_shop with id:', tabId);
  } else {
    console.log('Found existing tab with id:', tabId);
  }

  const existingItems = await query('SELECT id FROM item_shop WHERE tab_id = ?', [tabId]);
  if (existingItems.length === 0) {
    await query('INSERT INTO item_shop (tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec) VALUES (?, 994, 1, 1, 3, 20, 4010)', [tabId]);
    await query('INSERT INTO item_shop (tab_id, temp_id, is_new, is_sell, type_sell, cost, icon_spec) VALUES (?, 1042, 1, 1, 3, 99, 4010)', [tabId]);
    console.log('Added items 994 and 1042 to TRUNG_THU shop tab');
  } else {
    console.log('Items already present in TRUNG_THU shop:', existingItems.length);
  }

  console.log('TRUNG_THU shop is 100% ready in DB!');
}

setupTrungThuShop().catch(console.error);
