import { query } from './src/db.js';

async function main() {
  const tabs = await query('SELECT * FROM tab_shop');
  console.log('All tabs in tab_shop:');
  for (const t of tabs) {
    console.log(`id: ${t.id}, shop_id: ${t.shop_id}, name: ${t.NAME}`);
  }
}

main().catch(console.error);
