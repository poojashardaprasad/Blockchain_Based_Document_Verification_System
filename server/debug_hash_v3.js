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

async function debug() {
    try {
        const [proofs] = await db.query('SELECT * FROM verification_proofs ORDER BY created_at DESC LIMIT 1');
        if (proofs.length === 0) return;

        const proof = proofs[0];
        const proofObject = typeof proof.proof_object === 'string' ? JSON.parse(proof.proof_object) : proof.proof_object;

        console.log('DB HASH:', proof.proof_hash);

        // Remove expiry_date
        const { expiry_date, ...rest } = proofObject;

        const deterministicJsonNoExpiry = deterministicStringify(rest);
        const hashNoExpiry = crypto.createHash('sha256').update(deterministicJsonNoExpiry).digest('hex');
        console.log('DETERMINISTIC HASH (NO EXPIRY):', hashNoExpiry);

        // Try manual order NO EXPIRY
        const manualObjNoExpiry = {
            document_hash: rest.document_hash,
            institution_name: rest.institution_name,
            verification_result: rest.verification_result,
            verified_at: rest.verified_at,
            blockchain_tx: rest.blockchain_tx,
            block_number: rest.block_number,
            verifier_type: rest.verifier_type,
            system_version: rest.system_version
        };
        const manualJsonNoExpiry = JSON.stringify(manualObjNoExpiry);
        const manualHashNoExpiry = crypto.createHash('sha256').update(manualJsonNoExpiry).digest('hex');
        console.log('MANUAL ORDER JSON HASH (NO EXPIRY):', manualHashNoExpiry);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
debug();
