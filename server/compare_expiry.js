const db = require('./config/db');
require('dotenv').config();
const { computeProofHash } = require('./utils/proofGenerator');

async function debug() {
    try {
        const [proofs] = await db.query('SELECT * FROM verification_proofs');

        for (const p of proofs) {
            const obj = typeof p.proof_object === 'string' ? JSON.parse(p.proof_object) : p.proof_object;
            const recomputed = computeProofHash(obj);
            const isMatch = recomputed === p.proof_hash;

            if (obj.expiry_date !== undefined) {
                console.log(`[${isMatch ? 'MATCH' : 'FAIL '}] Hash: ${p.proof_hash.substring(0, 8)}`);
                console.log(`  expiry_date: ${JSON.stringify(obj.expiry_date)} (Type: ${typeof obj.expiry_date})`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
debug();
