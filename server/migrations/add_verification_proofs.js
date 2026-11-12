const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting migration: add_verification_proofs...');

        const sql = `
            CREATE TABLE IF NOT EXISTS verification_proofs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                verification_id INT NOT NULL,
                proof_hash CHAR(64) NOT NULL UNIQUE,
                proof_object JSON NOT NULL,
                blockchain_tx_hash VARCHAR(66),
                blockchain_block_number INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (verification_id) REFERENCES verifications(id) ON DELETE CASCADE,
                INDEX idx_proof_hash (proof_hash),
                INDEX idx_verification_id (verification_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await db.query(sql);
        console.log('✅ Migration completed: verification_proofs table created');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    migrate();
}

module.exports = migrate;
