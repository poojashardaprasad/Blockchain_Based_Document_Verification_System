const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
    try {
        console.log('Creating test users...\n');

        // Hash password
        const password = 'test123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Admin user
        console.log('Creating Admin user...');
        await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
            ['Admin User', 'admin@test.com', hashedPassword, 'admin']
        );
        console.log('✅ Admin created: admin@test.com / test123');

        // Create Uploader user
        console.log('\nCreating Uploader user...');
        await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
            ['Uploader User', 'uploader@test.com', hashedPassword, 'uploader']
        );
        console.log('✅ Uploader created: uploader@test.com / test123');

        // Create Verifier user
        console.log('\nCreating Verifier user...');
        await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
            ['Verifier User', 'verifier@test.com', hashedPassword, 'verifier']
        );
        console.log('✅ Verifier created: verifier@test.com / test123');

        console.log('\n' + '='.repeat(60));
        console.log('✅ All test users created successfully!');
        console.log('='.repeat(60));
        console.log('\nLOGIN CREDENTIALS (use EMAIL for login):');
        console.log('  Admin:    admin@test.com / test123');
        console.log('  Uploader: uploader@test.com / test123');
        console.log('  Verifier: verifier@test.com / test123');
        console.log('\n' + '='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating test users:', error);
        process.exit(1);
    }
}

createTestUsers();
