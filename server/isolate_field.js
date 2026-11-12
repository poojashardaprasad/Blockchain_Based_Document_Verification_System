const db = require('./config/db');
const { computeProofHash } = require('./utils/proofGenerator');
require('dotenv').config();

async function isolateField() {
    try {
        const [rows] = await db.query('SELECT proof_object, proof_hash FROM verification_proofs');

        console.log('Proof Index | Match? | expiry_date? | blockchain_tx | block_number');
        console.log('-------------------------------------------------------------------');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let obj = row.proof_object;
            if (typeof obj === 'string') obj = JSON.parse(obj);

            const recomputed = computeProofHash(obj);
            const isMatch = recomputed === row.proof_hash;

            const hasExpiry = 'expiry_date' in obj;
            const tx = obj.blockchain_tx;
            const block = obj.block_number;

            console.log(`${String(i).padEnd(11)} | ${String(isMatch).padEnd(6)} | ${String(hasExpiry).padEnd(12)} | ${String(tx).substring(0, 15)}... | ${block}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

isolateField();
