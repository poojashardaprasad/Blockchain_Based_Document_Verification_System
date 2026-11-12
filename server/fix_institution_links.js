const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function fixInstitutionLinks() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('=== FIXING INSTITUTION LINKS ===\n');

        // Get all approved requests
        const [approvedReqs] = await db.query(`
            SELECT ir.*, i.id as institution_id, u.name as user_name, u.email
            FROM institution_requests ir
            JOIN institutions i ON i.name = ir.institution_name
            JOIN users u ON u.id = ir.uploader_id
            WHERE ir.status = 'approved' AND u.institution_id IS NULL
        `);

        console.log(`Found ${approvedReqs.length} approved requests with unlinked users:\n`);

        for (const req of approvedReqs) {
            console.log(`Linking user ${req.email} to institution ${req.institution_name}...`);
            await db.query('UPDATE users SET institution_id = ? WHERE id = ?', [req.institution_id, req.uploader_id]);
            console.log(`✓ Fixed: ${req.email} → ${req.institution_name} (ID: ${req.institution_id})\n`);
        }

        // Verify
        const [users] = await db.query('SELECT id, name, email, role, institution_id FROM users WHERE role = "uploader"');
        console.log('\n=== ALL UPLOADERS ===');
        console.log(users);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fixInstitutionLinks();
