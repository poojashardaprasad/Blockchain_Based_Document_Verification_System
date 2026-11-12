const crypto = require('crypto');
const s = '{"block_number":10,"blockchain_tx":"0x3a9046521c164a75f436f68ab35e0a0df4f7dd00396462a93a07653af0ad49d1","document_hash":"0x3f3e28a80109fbd2b4c429265ae045a5e54cbf65adf794da622333da7cd80e95","expiry_date":"2026-01-21T18:30:00.000Z","institution_name":"uity","system_version":"v1.0","verification_result":"VALID","verified_at":"2026-01-05T15:47:20.258Z","verifier_type":"public"}';
const h = crypto.createHash('sha256').update(s).digest('hex');
console.log('HASH:', h);
console.log('TARGET:', '66eb9b51e51d62919ffdd4b43a7b8b22317f7f12f78fabee71c6cc718618f87a');
console.log('MATCH:', h === '66eb9b51e51d62919ffdd4b43a7b8b22317f7f12f78fabee71c6cc718618f87a');
