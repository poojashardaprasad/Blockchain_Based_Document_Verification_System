
const blockchain = require('./utils/blockchain');

console.log('Testing Blockchain Init...');
// access internal if possible or just call verifyHash with dummy
// initBlockchain is not exported directly, but verifyHash uses it.
// I'll assume I can test verifyHash with a dummy hash.

const dummyHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

(async () => {
    try {
        console.log('Calling verifyingHash...');
        await blockchain.verifyHash(dummyHash);
        console.log('VerifyHash called success (might be false but no crash)');
    } catch (e) {
        console.error('Test Failed:', e);
    }
})();
