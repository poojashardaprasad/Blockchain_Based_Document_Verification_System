require('dotenv').config();

async function runSanityCheck() {
    console.log('🧪 Running backend sanity check...');

    // 1. Check blockchain configuration
    console.log('1. Checking blockchain loader...');
    const blockchain = require('../utils/blockchain');
    console.log('   - Contract address:', blockchain.contractAddress || 'Not set (will load from artifact if available)');
    console.log('   - Web3 initialized:', Boolean(blockchain.web3));

    // 2. Check storage service
    console.log('2. Checking storage service...');
    const storageService = require('../services/storageService');
    console.log('   - Cloud storage enabled:', storageService.isCloudStorageEnabled());
    console.log('   - Local fallback dir:', storageService.localStorageDir);

    // Test local storage file creation
    const testKey = 'test_sanity.txt';
    const storeRes = await storageService.storeFile({
        key: testKey,
        body: Buffer.from('sanity check content'),
        contentType: 'text/plain'
    });
    console.log('   - Store file result:', storeRes.storageType);
    const exists = await storageService.fileExists(testKey);
    console.log('   - File exists check:', exists);
    const content = await storageService.getFile(testKey);
    console.log('   - File read check:', content ? content.toString() : 'null');

    // Clean up test file
    const fs = require('fs');
    const path = require('path');
    const localTestPath = path.join(storageService.localStorageDir, testKey);
    if (fs.existsSync(localTestPath)) fs.unlinkSync(localTestPath);

    // 3. Check certificate service
    console.log('3. Checking certificate service...');
    const certificateService = require('../services/certificateService');
    console.log('   - Cert dir:', certificateService.certDir);

    // 4. Check routes loading
    console.log('4. Checking Express routes...');
    require('../routes/authRoutes');
    require('../routes/documentRoutes');
    require('../routes/certificateRoutes');
    require('../routes/institutionRoutes');
    require('../routes/adminRoutes');
    console.log('   - All routes loaded cleanly.');

    console.log('🎉 Backend sanity check passed completely!');
    process.exit(0);
}

runSanityCheck().catch(err => {
    console.error('❌ Sanity check failed:', err);
    process.exit(1);
});
