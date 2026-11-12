const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: 'server/.env' });

async function manualVerification() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('=== MANUAL VERIFICATION SCRIPT ===\n');

        // Step 1: Create a test uploader
        console.log('STEP 1: Creating test uploader...');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);

        const [userResult] = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ['Manual Test Uploader', 'manual_test@example.com', hash, 'uploader']
        );
        const uploaderId = userResult.insertId;
        console.log(`✓ Created uploader with ID: ${uploaderId}`);

        // Step 2: Create institution request
        console.log('\nSTEP 2: Creating institution request...');
        const [reqResult] = await db.query(
            'INSERT INTO institution_requests (uploader_id, institution_name, institution_address, status) VALUES (?, ?, ?, ?)',
            [uploaderId, 'Manual Test Institution', '123 Test Street', 'pending']
        );
        console.log(`✓ Created institution request with ID: ${reqResult.insertId}`);

        // Step 3: Simulate admin approval
        console.log('\nSTEP 3: Simulating admin approval...');
        const [adminUser] = await db.query('SELECT id FROM users WHERE email = "admin@example.com"');
        const adminId = adminUser[0].id;

        const [instResult] = await db.query(
            'INSERT INTO institutions (name, address) VALUES (?, ?)',
            ['Manual Test Institution', '123 Test Street']
        );

        const institutionId = instResult.insertId;

        await db.query(
            'UPDATE users SET institution_id = ? WHERE id = ?',
            [institutionId, uploaderId]
        );

        await db.query(
            'UPDATE institution_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            ['approved', adminId, reqResult.insertId]
        );
        console.log(`✓ Approved institution with ID: ${institutionId}`);
        console.log(`✓ Updated uploader institution_id to: ${institutionId}`);

        // Step 4: Verify the setup
        console.log('\nSTEP 4: Verifying setup...');
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [uploaderId]);
        const [institutions] = await db.query('SELECT * FROM institutions WHERE id = ?', [institutionId]);
        const [requests] = await db.query('SELECT * FROM institution_requests WHERE id = ?', [reqResult.insertId]);

        console.log('\n--- VERIFICATION RESULTS ---');
        console.log('User:', {
            id: users[0].id,
            name: users[0].name,
            email: users[0].email,
            role: users[0].role,
            institution_id: users[0].institution_id
        });
        console.log('\nInstitution:', {
            id: institutions[0].id,
            name: institutions[0].name,
            address: institutions[0].address
        });
        console.log('\nRequest:', {
            id: requests[0].id,
            status: requests[0].status,
            reviewed_by: requests[0].reviewed_by
        });

        console.log('\n✅ MANUAL VERIFICATION COMPLETE!');
        console.log('\nYou can now:');
        console.log('1. Login as manual_test@example.com / password123');
        console.log('2. Upload a document');
        console.log('3. Anchor it to blockchain');
        console.log('4. Verify it on the verifier page');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

manualVerification();
