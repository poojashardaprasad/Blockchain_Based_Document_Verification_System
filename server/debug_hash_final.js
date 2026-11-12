const db = require('./config/db');
const crypto = require('crypto');

// Re-implementing the utility functions here to ensure we see EXACTLY what is happening
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

function computeProofHash(proofObject) {
    const normalizedObject = JSON.parse(JSON.stringify(proofObject));
    const deterministicJson = deterministicStringify(normalizedObject);
    return {
        hash: crypto.createHash('sha256').update(deterministicJson).digest('hex'),
        json: deterministicJson
    };
}

async function debug() {
    try {
        const [results] = await db.query('SELECT * FROM verification_proofs ORDER BY id DESC LIMIT 1');
        if (results.length === 0) {
            console.log('No proofs found');
            process.exit(0);
        }

        const stored = results[0];
        console.log('--- DB RECORD ---');
        console.log('ID:', stored.id);
        console.log('Stored Hash:', stored.proof_hash);

        let obj = stored.proof_object;
        if (typeof obj === 'string') obj = JSON.parse(obj);

        console.log('Object from DB (keys):', Object.keys(obj).sort());

        const { hash, json } = computeProofHash(obj);
        console.log('Recomputed Hash:', hash);
        console.log('Match?', hash === stored.proof_hash);
        console.log('Deterministic JSON String:', json);

        // Let's also see what happens WITHOUT the roundtrip
        const detJsonNoRound = deterministicStringify(obj);
        const hashNoRound = crypto.createHash('sha256').update(detJsonNoRound).digest('hex');
        console.log('Hash (No Roundtrip):', hashNoRound);
        console.log('Match (No Roundtrip)?', hashNoRound === stored.proof_hash);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

debug();
