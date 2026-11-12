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

            console.log(`[${isMatch ? 'MATCH' : 'FAIL '}] Hash: ${p.proof_hash.substring(0, 8)}`);
            console.log(`  Keys: ${Object.keys(obj).sort().join(', ')}`);
            if (!isMatch) {
                // Try removing expiry_date and see if it matches
                const { expiry_date, ...rest } = obj;
                if (computeProofHash(rest) === p.proof_hash) {
                    console.log('  -> MATCH FOUND IF expiry_date REMOVED!');
                }
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
debug();
