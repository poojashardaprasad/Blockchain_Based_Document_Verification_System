const db = require('./config/db');
const { computeProofHash } = require('./utils/proofGenerator');
require('dotenv').config();

async function checkAllProofs() {
    try {
        const [rows] = await db.query('SELECT proof_object, proof_hash FROM verification_proofs');
        console.log(`Checking ${rows.length} proofs...\n`);

        let matches = 0;
        let fails = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let obj = row.proof_object;
            if (typeof obj === 'string') obj = JSON.parse(obj);

            const recomputed = computeProofHash(obj);
            const isMatch = recomputed === row.proof_hash;

            if (isMatch) {
                matches++;
            } else {
                fails++;
                if (fails <= 3) {
                    console.log(`Fail ${fails}: Stored ${row.proof_hash.substring(0, 10)}... | Recomputed ${recomputed.substring(0, 10)}...`);
                    console.log('Object Keys:', Object.keys(obj).sort().join(','));
                }
            }
        }

        console.log(`\nResults: ${matches} matches, ${fails} fails.`);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkAllProofs();
