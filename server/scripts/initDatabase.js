require('dotenv').config();
const { initializeDatabase } = require('../config/initDb');

async function main() {
    console.log('🚀 Running database schema initialization...');
    const success = await initializeDatabase();
    if (success) {
        console.log('🎉 Database initialization complete!');
        process.exit(0);
    } else {
        console.error('❌ Database initialization failed. Check credentials.');
        process.exit(1);
    }
}

main();
