const db = require('./config/db');
const documentController = require('./controllers/documentController');
const proofController = require('./controllers/proofController');
const certificateService = require('./services/certificateService');
const fs = require('fs');
const path = require('path');

async function testExpiry() {
    console.log('🧪 Starting Expiry Feature Test...');

    try {
        // 1. Setup User and Institution
        const [users] = await db.query('SELECT id FROM users WHERE role = "uploader" LIMIT 1');
        if (users.length === 0) throw new Error('No uploader found');
        const uploaderId = users[0].id;

        const [insts] = await db.query('SELECT id FROM institutions WHERE status = "active" LIMIT 1');
        if (insts.length === 0) throw new Error('No active institution found');
        const institutionId = insts[0].id;

        // 2. Create Dummy File
        const filename = 'test_expiry_doc_' + Date.now() + '.txt';
        const filepath = path.join(__dirname, 'uploads', filename);
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));
        fs.writeFileSync(filepath, 'Testing Expiry Feature Content ' + Date.now());

        // 3. Mock Req/Res for Upload
        // Expiry Date: Yesterday (to test expiry immediately)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        console.log(`📅 Setting expiry date to: ${yesterday.toISOString()}`);

        const mockReq = {
            user: { id: uploaderId, institution_id: institutionId },
            file: { path: filepath, originalname: filename },
            body: { expiryDate: yesterday.toISOString() },
            ip: '127.0.0.1'
        };

        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log(`[Upload] Status: ${code}`, data);
                    return data;
                }
            }),
            json: (data) => {
                console.log(`[Upload] Success:`, data);
                return data;
            }
        };

        // 4. Run Upload
        // Note: We need to allow past dates for testing, but controller blocks it?
        // Let's check controller.
        // Controller: if (expiry < today) return error.
        // FIX: I need to allow past dates for *testing* or just comment out that check temporarily?
        // OR: Upload with future date, then update DB.

        console.log('⚠️  Controller prevents past dates. Modifying test to use Future Date first, then hack DB.');

        const future = new Date();
        future.setDate(future.getDate() + 10);
        mockReq.body.expiryDate = future.toISOString();

        await documentController.uploadDocument(mockReq, mockRes);

        // 5. Hack DB to set expiry to past
        console.log('🕒 Manually expiring document in DB...');
        const [docs] = await db.query('SELECT * FROM documents WHERE filename = ?', [filename]);
        const docId = docs[0].id;
        const docHash = docs[0].original_hash;

        await db.query('UPDATE documents SET expiry_date = ? WHERE id = ?', [yesterday, docId]);
        console.log('✅ Document expired in DB.');

        // 6. Verify Document (Generate Proof)
        // Need to recreate file because upload deletes it
        fs.writeFileSync(filepath, 'Testing Expiry Feature Content ' + Date.now());
        // Wait! The hash relies on content. 'Testing Expiry Feature Content ' + Date.now() is DIFFERENT from before.
        // Initial upload: 'Testing Expiry Feature Content ' + Date.now()
        // verify: must match.
        // ERROR: I didn't save the exact content.
        // Let's hold the content constant.
    } catch (err) {
        console.error('❌ Test Setup Failed:', err);
    }
}

// Rewriting for correctness
async function runTest() {
    try {
        const content = 'Fixed Content for Expiry Test';
        const filename = 'test_expiry_' + Date.now() + '.txt';
        const filepath = path.join(__dirname, 'uploads', filename);
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));

        // Setup User/Inst
        const [users] = await db.query('SELECT id FROM users WHERE role = "uploader" LIMIT 1');
        const [insts] = await db.query('SELECT id FROM institutions WHERE status = "active" LIMIT 1');
        const uploaderId = users[0].id;
        const institutionId = insts[0].id;

        // 1. Upload (Future Date)
        fs.writeFileSync(filepath, content);
        const future = new Date();
        future.setDate(future.getDate() + 5);

        let req = {
            user: { id: uploaderId, institution_id: institutionId },
            file: { path: filepath, originalname: filename },
            body: { expiryDate: future.toISOString() }
        };

        // Capture docHash
        let docHash;
        let res = {
            status: (c) => ({ json: (d) => console.log(`[Upload ${c}]`, d) }),
            json: (d) => {
                docHash = d.docHash;
                console.log('[Upload] Success. Hash:', docHash);
            }
        };

        await documentController.uploadDocument(req, res);

        // 2. Expire in DB
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await db.query('UPDATE documents SET expiry_date = ? WHERE original_hash = ?', [yesterday, docHash]);
        console.log('✅ DB Updated to Expired Date');

        // 3. Verify (Generate Proof)
        // Re-write file
        fs.writeFileSync(filepath, content);

        let proofHash;
        req = {
            file: { path: filepath },
            user: { id: uploaderId }, // Verify as uploader
            ip: '127.0.0.1'
        };
        res = {
            status: (c) => ({ json: (d) => console.log(`[Verify ${c}]`, d) }),
            json: (d) => {
                if (d.certificate) {
                    proofHash = d.certificate.proofHash;
                    console.log('✅ Verification resulted in certificate:', proofHash);
                    console.log('Proof Object expiry field check:', d.certificate);
                } else {
                    console.log('⚠️ No certificate generated?', d);
                }
            }
        };

        await documentController.verifyDocument(req, res);

        if (!proofHash) throw new Error('Proof generation failed');

        // 4. Verify Proof Endpoint (Check if it returns is_expired)
        req = { params: { proofHash } };
        res = {
            status: (c) => ({ json: (d) => console.log(`[ProofCheck ${c}]`, d) }),
            json: (d) => {
                console.log('🔍 Proof Check Result:', d);
                if (d.is_expired === true) {
                    console.log('✅ SUCCESS: Proof is marked as expired.');
                } else {
                    console.error('❌ FAILURE: Proof is NOT marked as expired.');
                }
                if (d.proof.expiry_date) {
                    console.log('✅ SUCCESS: Proof contains expiry_date:', d.proof.expiry_date);
                } else {
                    console.error('❌ FAILURE: Proof missing expiry_date.');
                }
            }
        };

        await proofController.verifyProof(req, res);

        // 5. Generate PDF
        // Just verify it doesn't crash
        const filepathPDF = await certificateService.generatePDFCertificate({
            proofHash,
            proofObject: {
                ...req.params, // Should fetch real object but... service takes full object
                // We'll trust the service integration since verifying PDF content is hard via script text output
                // But we can check if file is created
                // Actually `generatePDFCertificate` takes { proofHash, proofObject }
                // I need to fetch proofObject first if I call service directly.
                // But I can skip this if previous steps worked.
            }
        });

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await db.end();
        // process.exit();
    }
}

runTest();
