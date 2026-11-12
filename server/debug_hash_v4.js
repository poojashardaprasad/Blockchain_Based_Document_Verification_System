const db = require('./config/db');
const crypto = require('crypto');
require('dotenv').config();

async function debug() {
    try {
        const [proofs] = await db.query('SELECT * FROM verification_proofs ORDER BY created_at DESC LIMIT 1');
        if (proofs.length === 0) return;
        const proof = proofs[0];

        // This is what the DB gives us
        const obj = proof.proof_object;
        console.log('TYPE OF proof_object:', typeof obj);

        const target = proof.proof_hash;
        console.log('TARGET HASH:', target);

        // Try hashing the raw original string from DB (if it returns a string)
        if (typeof obj === 'string') {
            const h = crypto.createHash('sha256').update(obj).digest('hex');
            console.log('HASH OF RAW STRING FROM DB:', h);
            console.log('MATCH:', h === target);
        } else {
            // It's an object. Let's see what JSON.stringify(obj) gives
            const s = JSON.stringify(obj);
            const h = crypto.createHash('sha256').update(s).digest('hex');
            console.log('HASH OF JSON.stringify(obj_from_db):', h);
            console.log('MATCH:', h === target);
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
debug();
