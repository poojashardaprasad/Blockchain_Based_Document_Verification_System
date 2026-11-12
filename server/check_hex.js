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

async function checkHex() {
    try {
        const [rows] = await db.query('SELECT proof_object, proof_hash FROM verification_proofs ORDER BY id DESC LIMIT 1');
        const row = rows[0];
        let obj = row.proof_object;
        if (typeof obj === 'string') obj = JSON.parse(obj);

        const deterministicJson = deterministicStringify(obj);
        console.log('String Length: ', deterministicJson.length);
        console.log('Hex Codes:');
        let hex = '';
        for (let i = 0; i < deterministicJson.length; i++) {
            hex += deterministicJson.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
            if ((i + 1) % 16 === 0) hex += '\n';
        }
        console.log(hex);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkHex();
