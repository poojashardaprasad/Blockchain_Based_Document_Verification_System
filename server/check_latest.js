const db = require('./config/db');
const { computeProofHash } = require('./utils/proofGenerator');
const crypto = require('crypto');
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

async function checkLatest() {
    try {
        const [rows] = await db.query('SELECT proof_object, proof_hash FROM verification_proofs ORDER BY id DESC LIMIT 1');

        if (rows.length === 0) {
            console.log('No proofs found');
            return;
        }

        const row = rows[0];
        let obj = row.proof_object;
        if (typeof obj === 'string') obj = JSON.parse(obj);

        console.log('LATEST PROOF:');
        console.log('Hash (Stored):  ', row.proof_hash);

        // Use JSON roundtrip as implemented in proofGenerator.js
        const normalized = JSON.parse(JSON.stringify(obj));
        const deterministicJson = deterministicStringify(normalized);
        const recomputed = crypto.createHash('sha256').update(deterministicJson).digest('hex');

        console.log('Hash (Compute): ', recomputed);
        console.log('String Length:  ', deterministicJson.length);
        console.log('Raw String:     ', deterministicJson);

        for (const [key, value] of Object.entries(obj).sort()) {
            console.log(`${key.padEnd(20)}: ${value}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkLatest();
