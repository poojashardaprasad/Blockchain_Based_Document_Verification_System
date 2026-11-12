const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    const [rows] = await db.query('SELECT * FROM users WHERE email="admin@example.com"');
    console.log(rows);
    process.exit(0);
}
run();
