const mysql = require('mysql2/promise');

async function test() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'ngocrong'
    });

    const [rows] = await conn.execute('SELECT * FROM player WHERE id = 1');
    if (rows.length === 0) {
        console.log('Player 1 not found');
        return;
    }
    const p = rows[0];
    console.log('Player found:', p.name, 'power:', p.data_point);
    await conn.end();
}

test().catch(console.error);
