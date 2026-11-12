const db = require('./config/db');
const crypto = require('crypto');
require('dotenv').config();

function deterministicStringify(obj) {
    if (obj === null) return 'null';
    if (obj instanceof Date) return JSON.stringify(obj);
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

function getHash(obj) {
    return crypto.createHash('sha256').update(deterministicStringify(obj)).digest('hex');
}

async function debug() {
    try {
        const [proofs] = await db.query('SELECT * FROM verification_proofs WHERE proof_hash LIKE "66eb9b51%"');
        if (proofs.length === 0) return;
        const proof = proofs[0];
        const baseObj = typeof proof.proof_object === 'string' ? JSON.parse(proof.proof_object) : proof.proof_object;
        const target = proof.proof_hash;

        console.log('TARGET HASH:', target);

        const variations = [
            { name: 'Base', obj: { ...baseObj } },
            { name: 'TX no 0x', obj: { ...baseObj, blockchain_tx: baseObj.blockchain_tx.replace('0x', '') } },
            { name: 'Doc Hash no 0x', obj: { ...baseObj, document_hash: baseObj.document_hash.replace('0x', '') } },
            { name: 'Both no 0x', obj: { ...baseObj, blockchain_tx: baseObj.blockchain_tx.replace('0x', ''), document_hash: baseObj.document_hash.replace('0x', '') } },
            { name: 'No Z in dates', obj: { ...baseObj, expiry_date: baseObj.expiry_date.replace('Z', ''), verified_at: baseObj.verified_at.replace('Z', '') } },
        ];

        for (const v of variations) {
            const h = getHash(v.obj);
            console.log(`${v.name.padEnd(30)}: ${h} ${h === target ? 'MATCH!!!' : ''}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
debug();
