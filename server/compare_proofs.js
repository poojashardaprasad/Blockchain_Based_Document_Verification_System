const db = require('./config/db');
const { computeProofHash } = require('./utils/proofGenerator');
require('dotenv').config();

async function compareProofs() {
    try {
        const [rows] = await db.query('SELECT proof_object, proof_hash FROM verification_proofs');

        let match = null;
        let fail = null;

        for (const row of rows) {
            let obj = row.proof_object;
            if (typeof obj === 'string') obj = JSON.parse(obj);
            const recomputed = computeProofHash(obj);
            if (recomputed === row.proof_hash && !match) match = obj;
            if (recomputed !== row.proof_hash && !fail) fail = obj;
        }

        if (match) {
            console.log('--- MATCHING PROOF ---');
            console.log(JSON.stringify(match, null, 2));
        }

        if (fail) {
            console.log('\n--- FAILING PROOF ---');
            console.log(JSON.stringify(fail, null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

compareProofs();
