const db = require('./config/db');
const { calculateFileHash } = require('./controllers/documentController'); // Wait, calculateFileHash is not exported
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function calcHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return '0x' + hashSum.digest('hex');
}

async function liveTest() {
    try {
        console.log('=== STARTING LIVE HASH CONSISTENCY TEST ===');

        // 1. Create a dummy file
        const testFile = 'test_hash_doc.txt';
        fs.writeFileSync(testFile, 'Consistency Test ' + Date.now());
        const hash = calcHash(testFile);
        console.log(`Document Hash: ${hash}`);

        // 2. Register it in DB (simulate upload)
        // Find an uploader and institution
        const [users] = await db.query('SELECT id, institution_id FROM users WHERE role = "uploader" LIMIT 1');
        if (users.length === 0) throw new Error('No uploader found');
        const uploader = users[0];

        const [inst] = await db.query('SELECT name FROM institutions WHERE id = ?', [uploader.institution_id]);
        const instName = inst[0].name;

        const txHash = '0x' + crypto.randomBytes(32).toString('hex');
        const blockNum = 12345;
        const expiry = new Date(Date.now() + 86400000).toISOString().slice(0, 10); // Tomorrow

        console.log('Inserting document...');
        const [docResult] = await db.query(
            'INSERT INTO documents (uploader_id, institution_id, filename, original_hash, tx_hash, block_number, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uploader.id, uploader.institution_id, testFile, hash, txHash, blockNum, expiry]
        );
        const docId = docResult.insertId;

        // 3. Trigger verification logic (simulate /api/documents/verify)
        // We'll mimic the controller logic
        const { generateProofObject, computeProofHash } = require('./utils/proofGenerator');

        const proofObject = generateProofObject({
            documentHash: String(hash),
            institutionName: String(instName),
            verifiedAt: new Date().toISOString(),
            blockchainTx: String(txHash),
            blockNumber: Number(blockNum),
            verifierType: 'public',
            expiryDate: expiry
        });

        const proofHash = computeProofHash(proofObject);
        console.log(`Proof Hash: ${proofHash}`);

        const [verifyResult] = await db.query(
            'INSERT INTO verifications (doc_id, verifier_id, uploaded_hash, stored_hash, result, verifier_ip) VALUES (?, ?, ?, ?, ?, ?)',
            [docId, null, hash, hash, 'valid', '127.0.0.1']
        );
        const verificationId = verifyResult.insertId;

        await db.query(
            'INSERT INTO verification_proofs (verification_id, proof_hash, proof_object) VALUES (?, ?, ?)',
            [verificationId, proofHash, JSON.stringify(proofObject)]
        );

        console.log(`--- SUCCESS ---`);
        console.log(`Visit: http://localhost:5173/verify-proof/${proofHash}`);

        // 4. Test re-compute immediately in script
        const recomputed = computeProofHash(proofObject);
        if (recomputed === proofHash) {
            console.log('✅ Local check: PASS');
        } else {
            console.log('❌ Local check: FAIL');
        }

        // 5. Check what happens if we read it back from DB
        const [readBack] = await db.query('SELECT proof_object FROM verification_proofs WHERE proof_hash = ?', [proofHash]);
        let readObj = readBack[0].proof_object;
        if (typeof readObj === 'string') readObj = JSON.parse(readObj);

        const recomputedDB = computeProofHash(readObj);
        if (recomputedDB === proofHash) {
            console.log('✅ DB Roundtrip check: PASS');
        } else {
            console.log('❌ DB Roundtrip check: FAIL');
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit(0);
    }
}

liveTest();
