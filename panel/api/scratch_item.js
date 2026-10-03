import { query } from './src/db.js';

async function main() {
  try {
    const rows = await query("SELECT id, name, type, description FROM item_template WHERE name LIKE '%bùa%' OR name LIKE '%Bùa%' OR name LIKE '%trí tuệ%' OR name LIKE '%Trí tuệ%' OR description LIKE '%x3%' OR description LIKE '%x4%'");
    console.log('Charm items:', rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

main();
