const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function run() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [rows] = await db.query('SELECT name, email, role, institution_id FROM users');
        console.log('--- USERS ---');
        console.log(rows);

        const [reqs] = await db.query('SELECT * FROM institution_requests');
        console.log('--- REQS ---');
        console.log(reqs);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
