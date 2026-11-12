const db = require('./config/db');
const { generateProofObject } = require('./utils/proofGenerator');
const crypto = require('crypto');
require('dotenv').config();

async function debug() {
    try {
        const [proofs] = await db.query('SELECT * FROM verification_proofs ORDER BY created_at DESC LIMIT 1');
        if (proofs.length === 0) return;

        const proof = proofs[0];
        const proofObject = typeof proof.proof_object === 'string' ? JSON.parse(proof.proof_object) : proof.proof_object;

        console.log('DB HASH:', proof.proof_hash);

        // Try standard JSON.stringify (as produced by generateProofObject order)
        const standardJson = JSON.stringify(proofObject);
        const standardHash = crypto.createHash('sha256').update(standardJson).digest('hex');
        console.log('STANDARD JSON HASH:', standardHash);

        // Try manually reconstruct object in specific order if keys were different
        const manualObj = {
            document_hash: proofObject.document_hash,
            institution_name: proofObject.institution_name,
            verification_result: proofObject.verification_result,
            verified_at: proofObject.verified_at,
            blockchain_tx: proofObject.blockchain_tx,
            block_number: proofObject.block_number,
            verifier_type: proofObject.verifier_type,
            expiry_date: proofObject.expiry_date,
            system_version: proofObject.system_version
        };
        const manualJson = JSON.stringify(manualObj);
        const manualHash = crypto.createHash('sha256').update(manualJson).digest('hex');
        console.log('MANUAL ORDER JSON HASH:', manualHash);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
debug();
