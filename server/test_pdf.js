const certificateService = require('./services/certificateService');

async function testPDF() {
    try {
        const proofHash = 'test_hash_123';
        const proofObject = {
            document_hash: '0x123',
            institution_name: 'Test Inst',
            verification_result: 'VALID',
            verified_at: new Date().toISOString(),
            blockchain_tx: '0xtx',
            block_number: 100,
            verifier_type: 'public',
            expiry_date: new Date().toISOString(),
            system_version: 'v1.0'
        };

        console.log('Generating PDF...');
        const path = await certificateService.generatePDFCertificate({ proofHash, proofObject });
        console.log('✅ PDF Generated at:', path);
    } catch (e) {
        console.error('❌ PDF Generation Failed:', e);
    }
}

testPDF();
