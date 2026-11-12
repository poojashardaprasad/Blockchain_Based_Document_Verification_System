const crypto = require('crypto');
const s = '{"block_number":0,"blockchain_tx":"RECOVERED_FROM_BLOCKCHAIN","document_hash":"0xacdd9b189dbd2bd5d3ef36596ea1e3a5aa97064faed3eb4dbac1c7c4146a8f8","expiry_date":"2026-01-09T18:30:00.000Z","institution_name":"medical institute","system_version":"v1.0","verification_result":"VALID","verified_at":"2026-01-05T15:43:32.639Z","verifier_type":"authenticated"}';
console.log(crypto.createHash('sha256').update(s).digest('hex'));
