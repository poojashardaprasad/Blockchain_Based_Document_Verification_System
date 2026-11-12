const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);

        await db.query('UPDATE users SET password_hash = ? WHERE email = "admin@example.com"', [hash]);
        console.log('Admin password reset to admin123');

        const [rows] = await db.query('SELECT * FROM users WHERE email = "admin@example.com"');
        console.log('Current Admin User:', rows[0]);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
