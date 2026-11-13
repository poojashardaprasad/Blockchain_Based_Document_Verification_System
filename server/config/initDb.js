const db = require('./db');

/**
 * Auto-initializes the MySQL database schema if tables do not exist.
 * This runs safely on any MySQL cloud provider (Aiven, Railway, TiDB, etc.)
 * regardless of the pre-assigned database name.
 */
async function initializeDatabase() {
    console.log('🔄 Checking database connection and verifying schema...');

    try {
        // Test database connectivity
        const [result] = await db.query('SELECT 1 + 1 AS test');
        if (!result || result[0].test !== 2) {
            throw new Error('Database test query failed');
        }
        console.log('✅ Database connected successfully.');

        // 1. institutions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS institutions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address TEXT NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'uploader', 'verifier') NOT NULL,
                institution_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. institution_requests table
        await db.query(`
            CREATE TABLE IF NOT EXISTS institution_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                uploader_id INT NOT NULL,
                institution_name VARCHAR(255) NOT NULL,
                institution_address TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                reviewed_by INT NULL,
                reviewed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rejection_reason TEXT NULL,
                FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. documents table
        await db.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                uploader_id INT NOT NULL,
                institution_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                original_hash CHAR(66) NOT NULL,
                tx_hash CHAR(66) NULL,
                block_number BIGINT NULL,
                status ENUM('active', 'revoked') DEFAULT 'active',
                expiry_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploader_id) REFERENCES users(id),
                FOREIGN KEY (institution_id) REFERENCES institutions(id),
                INDEX idx_original_hash (original_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 5. revoked_documents table
        await db.query(`
            CREATE TABLE IF NOT EXISTS revoked_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id INT NOT NULL,
                reason TEXT NOT NULL,
                revoked_by INT NOT NULL,
                revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (revoked_by) REFERENCES users(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 6. verifications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS verifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                doc_id INT NULL,
                verifier_id INT NULL,
                uploaded_hash CHAR(66) NOT NULL,
                stored_hash CHAR(66) NULL,
                result ENUM('valid', 'invalid') NOT NULL,
                verifier_ip VARCHAR(45) NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE SET NULL,
                FOREIGN KEY (verifier_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_uploaded_hash (uploaded_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 7. audit_logs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action VARCHAR(255) NOT NULL,
                user_id INT NULL,
                details JSON NULL,
                ip_address VARCHAR(45) NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 8. verification_proofs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS verification_proofs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                verification_id INT NOT NULL,
                proof_hash CHAR(64) NOT NULL UNIQUE,
                proof_object JSON NOT NULL,
                blockchain_tx_hash VARCHAR(66) NULL,
                blockchain_block_number BIGINT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (verification_id) REFERENCES verifications(id) ON DELETE CASCADE,
                INDEX idx_proof_hash (proof_hash),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✅ Database schema verified: all 8 core tables and indexes are ready.');

        // Seed initial admin user if none exists
        const [admins] = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (admins.length === 0) {
            // Password: admin123 (bcrypt cost 10)
            const defaultAdminHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
            await db.query(
                "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
                ['System Admin', 'admin@example.com', defaultAdminHash, 'admin']
            );
            console.log('👤 Default admin account seeded: admin@example.com / admin123');
        }

        return true;
    } catch (error) {
        console.warn('⚠️  Database initialization notice:', error.message);
        console.warn('   The server will continue running. Ensure DATABASE_URL or DB_* credentials are set.');
        return false;
    }
}

module.exports = { initializeDatabase };
