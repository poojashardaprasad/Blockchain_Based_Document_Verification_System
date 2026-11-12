const db = require('./config/db');
const { computeProofHash } = require('./utils/proofGenerator');
require('dotenv').config();

function deterministicStringify(obj) {
    if (obj === null) return 'null';
    if (obj instanceof Date) return JSON.stringify(obj.toISOString());
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) {
        return '[' + obj.map(deterministicStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => {
        return JSON.stringify(key) + ':' + deterministicStringify(obj[key]);
    });
    return '{' + pairs.join(',') + '}';
}

async function compareSpecific() {
    try {
        const [rows] = await db.query('SELECT proof_object, proof_hash FROM verification_proofs');

        const p5 = rows[5];
        const p8 = rows[8];

        console.log('--- PROOF INDEX 5 (FAIL) ---');
        showDetails(p5);

        console.log('\n--- PROOF INDEX 8 (MATCH) ---');
        showDetails(p8);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

function showDetails(row) {
    let obj = row.proof_object;
    if (typeof obj === 'string') obj = JSON.parse(obj);

    console.log('Hash (Stored):  ', row.proof_hash);
    console.log('Hash (Compute): ', computeProofHash(obj));
    console.log('Stringify:      ', deterministicStringify(obj));

    for (const [key, value] of Object.entries(obj).sort()) {
        console.log(`${key.padEnd(20)}: type=${(typeof value).padEnd(8)} value=${value}`);
    }
}

compareSpecific();
