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

const targetHash = '49535581dbf8da3b2f1c406fd14f465a164298cb4f80f786dc36e6365e29c7fa';

const baseObj = {
    "block_number": 14,
    "blockchain_tx": "0xdd28be313af6de083e753e1e74927904843e26c8e61058f1e3777531ebc97826",
    "document_hash": "0xd65e8d0bbdfe4fa9552b21fcaff3cc07677053c3e9082c9fedf93a8c9e071cd0f",
    "expiry_date": "2026-01-30T18:30:00.000Z",
    "institution_name": "uity",
    "system_version": "v1.0",
    "verification_result": "VALID",
    "verified_at": "2026-01-05T16:50:32.207Z",
    "verifier_type": "public"
};

function check(name, obj, useDet = true) {
    const json = useDet ? deterministicStringify(obj) : JSON.stringify(obj);
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    if (hash === targetHash) {
        console.log(`[MATCH FOUND!] ${name}`);
        console.log('JSON:', json);
        return true;
    }
    return false;
}

console.log('Target Hash:', targetHash);

// Try variations
const variations = [
    { name: 'Base (Det)', obj: baseObj, det: true },
    { name: 'Base (Std)', obj: baseObj, det: false },
    { name: 'No 0x in tx', obj: { ...baseObj, blockchain_tx: baseObj.blockchain_tx.replace('0x', '') }, det: true },
    { name: 'No 0x in doc', obj: { ...baseObj, document_hash: baseObj.document_hash.replace('0x', '') }, det: true },
    { name: 'String block', obj: { ...baseObj, block_number: "14" }, det: true },
    { name: 'Upper case hashes', obj: { ...baseObj, blockchain_tx: baseObj.blockchain_tx.toUpperCase(), document_hash: baseObj.document_hash.toUpperCase() }, det: true },
    { name: 'Missing expiry', obj: (() => { const o = { ...baseObj }; delete o.expiry_date; return o; })(), det: true },
    { name: 'Expiry as Date', obj: { ...baseObj, expiry_date: new Date(baseObj.expiry_date) }, det: true },
    { name: 'VerifiedAt as Date', obj: { ...baseObj, verified_at: new Date(baseObj.verified_at) }, det: true },
    {
        name: 'CamelCase Keys', obj: {
            blockNumber: 14,
            blockchainTx: baseObj.blockchain_tx,
            documentHash: baseObj.document_hash,
            expiryDate: baseObj.expiry_date,
            institutionName: "uity",
            systemVersion: "v1.0",
            verificationResult: "VALID",
            verifiedAt: baseObj.verified_at,
            verifierType: "public"
        }, det: true
    }
];

for (const v of variations) {
    if (check(v.name, v.obj, v.det)) process.exit(0);
}

// Deep dive variations
console.log('No simple match. Trying field exclusions...');
const keys = Object.keys(baseObj);
for (let i = 0; i < keys.length; i++) {
    const subset = { ...baseObj };
    delete subset[keys[i]];
    if (check(`Deleted ${keys[i]}`, subset, true)) process.exit(0);
}

console.log('Finished.');
