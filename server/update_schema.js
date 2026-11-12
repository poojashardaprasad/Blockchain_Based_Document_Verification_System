const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function updateSchema() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Adding expiry_date column to documents table...');

        try {
            await db.query(`ALTER TABLE documents ADD COLUMN expiry_date DATE NULL AFTER status`);
            console.log('✅ Column added successfully!');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  Column already exists, skipping...');
            } else {
                throw err;
            }
        }

        // Verify the change
        const [columns] = await db.query(`SHOW COLUMNS FROM documents LIKE 'expiry_date'`);

        if (columns.length > 0) {
            console.log('✅ expiry_date column verified:', columns[0]);
        }

        await db.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

updateSchema();
