const { generateProofObject, computeProofHash } = require('./utils/proofGenerator');
const db = require('./config/db');
require('dotenv').config();

async function runTest() {
    console.log('=== VERIFICATION ROBUSTNESS TEST ===\n');

    const testCases = [
        {
            name: 'Standard Document (no expiry)',
            data: {
                documentHash: '0x' + 'a'.repeat(64),
                institutionName: 'Test University',
                verifiedAt: new Date(),
                blockchainTx: '0x' + 'b'.repeat(64),
                blockNumber: 12345,
                verifierType: 'public',
                expiryDate: null
            }
        },
        {
            name: 'Document with Expiry Date object',
            data: {
                documentHash: '0x' + 'c'.repeat(64),
                institutionName: 'Medical Center',
                verifiedAt: new Date(),
                blockchainTx: '0x' + 'd'.repeat(64),
                blockNumber: 67890,
                verifierType: 'authenticated',
                expiryDate: new Date('2030-01-01T00:00:00.000Z')
            }
        },
        {
            name: 'Document with mixed string/number inputs',
            data: {
                documentHash: '0x' + 'e'.repeat(64),
                institutionName: 12345, // Should become string
                verifiedAt: '2026-01-05T12:00:00Z',
                blockchainTx: '0x' + 'f'.repeat(64),
                blockNumber: "999", // Should become number
                verifierType: 'public',
                expiryDate: '2026-12-31'
            }
        }
    ];

    for (const tc of testCases) {
        console.log(`Testing: ${tc.name}`);

        // 1. Generate
        const proofObject = generateProofObject(tc.data);
        const hash = computeProofHash(proofObject);
        console.log(`  ✓ Generated Hash: ${hash.substring(0, 8)}...`);

        // 2. Simulate full DB cycle (Object -> JSON string -> MySQL JSON -> Object)
        const dbSimulatedObject = JSON.parse(JSON.stringify(proofObject));

        // 3. Re-verify
        const recomputedHash = computeProofHash(dbSimulatedObject);

        if (hash === recomputedHash) {
            console.log('  ✅ MATCH: Post-storage integrity preserved.');
        } else {
            console.error('  ❌ FAIL: Hash discrepancy detected!');
            console.log('    Original DS:', JSON.stringify(proofObject));
            console.log('    Retrieved DS:', JSON.stringify(dbSimulatedObject));
        }
        console.log();
    }

    console.log('--- Database Integration Test ---');
    try {
        // Insert a test record to ensure real DB behavior doesn't break anything
        const testHash = 'test_robustness_' + Date.now();
        const testObj = generateProofObject(testCases[0].data);
        const expectedHash = computeProofHash(testObj);

        // We need a valid verification_id to insert into verification_proofs
        // Let's just create a dummy verification entry first
        const [vResult] = await db.query(
            'INSERT INTO verifications (result, verifier_ip, uploaded_hash) VALUES (?, ?, ?)',
            ['valid', '127.0.0.1', '0x' + 'a'.repeat(64)]
        );
        const vId = vResult.insertId;

        await db.query(
            'INSERT INTO verification_proofs (verification_id, proof_hash, proof_object) VALUES (?, ?, ?)',
            [vId, expectedHash, JSON.stringify(testObj)]
        );

        const [rows] = await db.query('SELECT * FROM verification_proofs WHERE verification_id = ?', [vId]);
        const retrievedObj = typeof rows[0].proof_object === 'string'
            ? JSON.parse(rows[0].proof_object)
            : rows[0].proof_object;

        const finalHash = computeProofHash(retrievedObj);

        if (expectedHash === finalHash) {
            console.log('  ✅ DB INTEGRATION SUCCESS: MySQL JSON roundtrip preserved integrity.');
        } else {
            console.error('  ❌ DB INTEGRATION FAIL: Hash mismatch after real DB storage.');
        }

        // Cleanup
        await db.query('DELETE FROM verification_proofs WHERE verification_id = ?', [vId]);
        await db.query('DELETE FROM verifications WHERE id = ?', [vId]);

    } catch (err) {
        console.error('  ❌ DB TEST ERROR:', err.message);
    }

    console.log('\nVerification robustness test complete.');
    process.exit(0);
}

runTest();
