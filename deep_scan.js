const fs = require('fs');
const mysql = require('./panel/api/node_modules/mysql2/promise');

async function deepScan() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'ngocrong'
  });

  const [dbItems] = await conn.query('SELECT id, type, gender, name, description, icon_id, part, head, body, leg FROM item_template ORDER BY id');
  await conn.end();

  const textLines = fs.readFileSync('export/item_template.txt', 'utf8').trim().split('\n');
  const textItems = [];
  for (let i = 1; i < textLines.length; i++) {
    const p = textLines[i].split('\t');
    if (!p[0]) continue;
    textItems.push({
      id: parseInt(p[0]),
      type: parseInt(p[1]),
      gender: parseInt(p[2]),
      name: (p[3] || '').trim(),
      description: (p[4] || '').trim(),
      icon_id: parseInt(p[6]),
      part: parseInt(p[7]),
      head: parseInt(p[12]),
      body: parseInt(p[13]),
      leg: parseInt(p[14]),
    });
  }

  // Maps of export items
  const exportByIcon = new Map();
  const exportByPart = new Map();
  const exportByHead = new Map();
  const exportById = new Map();

  textItems.forEach(t => {
    if (!t.name || t.name.includes('trống') || t.name === '<Cập nhật phiên bản mới để xem>') return;
    exportById.set(t.id, t);
    if (t.icon_id > 0) {
      if (!exportByIcon.has(t.icon_id)) exportByIcon.set(t.icon_id, []);
      exportByIcon.get(t.icon_id).push(t);
    }
    if (t.part > 0) {
      if (!exportByPart.has(t.part)) exportByPart.set(t.part, []);
      exportByPart.get(t.part).push(t);
    }
    if (t.head > 0) {
      if (!exportByHead.has(t.head)) exportByHead.set(t.head, []);
      exportByHead.get(t.head).push(t);
    }
  });

  const candidates = [];

  dbItems.forEach(db => {
    // 1. Check matching by Icon ID
    if (db.icon_id > 0 && exportByIcon.has(db.icon_id)) {
      const list = exportByIcon.get(db.icon_id);
      let match = null;
      if (list.length === 1) {
        match = list[0];
      } else {
        // Find best match by type / gender / part
        match = list.find(e => e.type === db.type && e.gender === db.gender) ||
                list.find(e => e.part === db.part && db.part > 0) ||
                list.find(e => e.head === db.head && db.head > 0) ||
                list[0];
      }
      if (match && match.name !== db.name) {
        candidates.push({
          method: 'Match Icon #' + db.icon_id,
          dbId: db.id,
          currentDbName: db.name,
          suggestedName: match.name,
          icon_id: db.icon_id,
          dbType: db.type,
          expType: match.type,
          dbPart: db.part,
          expPart: match.part
        });
        return;
      }
    }

    // 2. Check matching by Part ID (Head/Part) if icon didn't match or icon is generic
    if (db.head > 0 && exportByHead.has(db.head)) {
      const list = exportByHead.get(db.head);
      const match = list.find(e => e.body === db.body && e.leg === db.leg) || list[0];
      if (match && match.name !== db.name) {
        candidates.push({
          method: 'Match Head #' + db.head,
          dbId: db.id,
          currentDbName: db.name,
          suggestedName: match.name,
          icon_id: db.icon_id,
          dbType: db.type,
          expType: match.type,
          dbPart: db.part,
          expPart: match.part
        });
        return;
      }
    }

    // 3. Check matching by general Part ID
    if (db.part > 0 && exportByPart.has(db.part)) {
      const list = exportByPart.get(db.part);
      const match = list[0];
      if (match && match.name !== db.name) {
        candidates.push({
          method: 'Match Part #' + db.part,
          dbId: db.id,
          currentDbName: db.name,
          suggestedName: match.name,
          icon_id: db.icon_id,
          dbType: db.type,
          expType: match.type,
          dbPart: db.part,
          expPart: match.part
        });
        return;
      }
    }
  });

  console.log(`=== TÌM THẤY ${candidates.length} VẬT PHẨM CÒN KHÁC BIỆT ===\n`);
  candidates.forEach((c, i) => {
    console.log(`${(i + 1).toString().padStart(3)}. [DB ID ${c.dbId.toString().padEnd(4)}] (${c.method.padEnd(18)}) "${c.currentDbName}" ➔ "${c.suggestedName}" (Type ${c.dbType} ➔ ${c.expType})`);
  });

  return candidates;
}

deepScan().catch(console.error);
