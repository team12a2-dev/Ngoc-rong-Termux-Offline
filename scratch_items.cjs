const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'ngocrong'
    });

    const [rows] = await conn.execute('SELECT id, name, type, description FROM item_template WHERE name LIKE "%Khoáng%" OR name LIKE "%tái chế%" OR name LIKE "%Capsule%" OR name LIKE "%Kích hoạt%" OR name LIKE "%kích hoạt%" OR (id >= 555 AND id <= 570) OR id = 1634 OR id = 1655');
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
}

check().catch(console.error);
