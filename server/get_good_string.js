const db = require('./config/db');
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

async function getGoodString() {
    try {
        const [rows] = await db.query('SELECT proof_object, proof_hash FROM verification_proofs');
        const row = rows[8]; // Index 8 matched
        let obj = row.proof_object;
        if (typeof obj === 'string') obj = JSON.parse(obj);

        const json = deterministicStringify(obj);
        console.log('Index 8 String Length:', json.length);
        console.log('Index 8 Raw String:   ', json);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

getGoodString();
