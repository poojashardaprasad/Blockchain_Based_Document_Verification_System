const crypto = require('crypto');

function deterministicStringify(obj) {
    if (obj === null) return 'null';
    if (obj instanceof Date) return JSON.stringify(obj.toISOString());
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

const targetHash = '7dd84d67a5944a137568666011e16f0e33e8aa245ae78939d49e95f528b8e9f4';

const baseObj = {
    "block_number": 13,
    "blockchain_tx": "0x028d2890011e9c70b52598992a79c8f6e2cb71dab4233ce4d56dfddfa6d73cdd",
    "document_hash": "0x4915a9bcf598532ba8e6953ce4c25c8c1d13046d2b1cc4eff93b815d84144dcf",
    "expiry_date": "2026-01-28T18:30:00.000Z",
    "institution_name": "uity",
    "system_version": "v1.0",
    "verification_result": "VALID",
    "verified_at": "2026-01-05T16:35:12.245Z",
    "verifier_type": "public"
};

console.log('Target Hash:', targetHash);

function check(name, obj, useDet = true) {
    const json = useDet ? deterministicStringify(obj) : JSON.stringify(obj);
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    if (hash === targetHash) {
        console.log(`[MATCH] ${name} ${useDet ? '(Det)' : '(Std)'}`);
        console.log('String:', json);
        return true;
    }
    return false;
}

// 1. Basic check
check('Base', baseObj);

// 2. Variations of verified_at
const noMillis = { ...baseObj, verified_at: baseObj.verified_at.split('.')[0] + 'Z' };
check('No Millis', noMillis);

// 3. Variations of expiry_date
const expNoMillis = { ...baseObj, expiry_date: baseObj.expiry_date.split('.')[0] + 'Z' };
check('Expiry No Millis', expNoMillis);

// 4. block_number as string
const strBlock = { ...baseObj, block_number: String(baseObj.block_number) };
check('String Block', strBlock);

// 5. Missing expiry_date entirely
const noExp = { ...baseObj };
delete noExp.expiry_date;
check('No Expiry Field', noExp);

// 6. order of keys (if standard stringify was used)
check('Base', baseObj, false);

// 7. Try camelCase blockNumber
const camelBlock = { ...baseObj, blockNumber: baseObj.block_number };
delete camelBlock.block_number;
check('CamelCase Block', camelBlock);

// 8. Try documentHash instead of document_hash
const camelDoc = { ...baseObj, documentHash: baseObj.document_hash };
delete camelDoc.document_hash;
check('CamelCase Doc', camelDoc);

// 9. Try without 0x
const no0x = { ...baseObj, blockchain_tx: baseObj.blockchain_tx.replace('0x', ''), document_hash: baseObj.document_hash.replace('0x', '') };
check('No 0x', no0x);

// 10. Combination of keys (The OLD keys)
// Prior to my update, verified_at and expiry_date were likely the only keys. No, that's not it.

// 11. Maybe expiry_date: null?
const nullExp = { ...baseObj, expiry_date: null };
check('Null Expiry', nullExp);

console.log('Done.');
