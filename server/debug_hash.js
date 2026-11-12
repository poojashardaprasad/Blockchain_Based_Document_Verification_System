const db = require('./config/db');
const { computeProofHash } = require('./utils/proofGenerator');
require('dotenv').config();

async function debugHash() {
    const targetHash = '7dd84d67a5944a137568666011e16f0e33e8aa245ae78939d49e95f528b8e9f4';
    console.log(`Analyzing Proof Hash: ${targetHash}`);

    try {
        const [rows] = await db.query(
            'SELECT proof_object, proof_hash FROM verification_proofs WHERE proof_hash = ?',
            [targetHash]
        );

        if (rows.length === 0) {
            console.error('❌ Proof not found in DB!');
            // Let's try to find ANY proof to compare
            const [anyRows] = await db.query('SELECT proof_object, proof_hash FROM verification_proofs LIMIT 1');
            if (anyRows.length > 0) {
                console.log('Found an alternative proof for comparison:');
                compareProof(anyRows[0]);
            }
            return;
        }

        compareProof(rows[0]);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

function compareProof(row) {
    const storedHash = row.proof_hash;
    let proofObject = row.proof_object;

    if (typeof proofObject === 'string') {
        try {
            proofObject = JSON.parse(proofObject);
        } catch (e) {
            console.error('Failed to parse proof_object string');
        }
    }

    console.log('\n--- Stored Proof Object ---');
    console.log(JSON.stringify(proofObject, null, 2));

    const recomputedHash = computeProofHash(proofObject);
    console.log(`\nStored Hash:     ${storedHash}`);
    console.log(`Recomputed Hash: ${recomputedHash}`);

    if (storedHash === recomputedHash) {
        console.log('\n✅ MATCH! The hash is consistent.');
    } else {
        console.log('\n❌ MISMATCH! Finding why...');

        // Let's try to normalize and re-hash to see if it helps
        const normalized = JSON.parse(JSON.stringify(proofObject));
        const recomputedNormalized = computeProofHash(normalized);
        console.log(`Recomputed (JSON roundtrip): ${recomputedNormalized}`);

        // Check if any field is a Date or special type
        for (const [key, value] of Object.entries(proofObject)) {
            console.log(`${key}: type=${typeof value}, value=${value}`);
        }
    }
}

debugHash();
