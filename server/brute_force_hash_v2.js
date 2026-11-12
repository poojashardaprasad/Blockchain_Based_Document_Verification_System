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

const baseData = {
    document_hash: "0xd65e8d0bbdfe4fa9552b21fcaff3cc07677053c3e9082c9fedf93a8c9e071cd0f",
    institution_name: "uity",
    verification_result: "VALID",
    verified_at: "2026-01-05T16:50:32.207Z",
    blockchain_tx: "0xdd28be313af6de083e753e1e74927904843e26c8e61058f1e3777531ebc97826",
    block_number: 14,
    verifier_type: "public",
    expiry_date: "2026-01-30T18:30:00.000Z",
    system_version: "v1.0"
};

function check(obj) {
    const jsonStr = deterministicStringify(obj);
    const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');
    if (hash === targetHash) {
        console.log('--- MATCH FOUND ---');
        console.log('Object:', JSON.stringify(obj));
        console.log('JSON:', jsonStr);
        process.exit(0);
    }
}

// Try field renames
const fieldMaps = {
    document_hash: ["documentHash", "doc_hash", "document_hash"],
    institution_name: ["institutionName", "institution", "institution_name"],
    verification_result: ["verificationResult", "result", "verification_result"],
    verified_at: ["verifiedAt", "timestamp", "verified_at"],
    blockchain_tx: ["blockchainTx", "tx_hash", "blockchain_tx"],
    block_number: ["blockNumber", "block_number"],
    verifier_type: ["verifierType", "verifier_type"],
    expiry_date: ["expiryDate", "expiry_date"],
    system_version: ["systemVersion", "version", "system_version"]
};

// This is too many permutations (3*3*3*3*3*2*2*2*3 = 3888). Let's try key ones.

function trySet(keys) {
    const obj = {};
    for (const [canonical, actual] of Object.entries(keys)) {
        obj[actual] = baseData[canonical];
    }
    check(obj);
}

console.log('Target:', targetHash);

// Try current snake_case
check(baseData);

// Try most likely CamelCase
trySet({
    document_hash: "documentHash",
    institution_name: "institutionName",
    verification_result: "verificationResult",
    verified_at: "verifiedAt",
    blockchain_tx: "blockchainTx",
    block_number: "blockNumber",
    verifier_type: "verifierType",
    expiry_date: "expiryDate",
    system_version: "systemVersion"
});

// Try mixed (from documentController.js previous versions)
trySet({
    document_hash: "document_hash",
    institution_name: "institution_name",
    verification_result: "verification_result",
    verified_at: "verified_at",
    blockchain_tx: "blockchain_tx",
    block_number: "block_number",
    verifier_type: "verifier_type",
    expiry_date: "expiry_date",
    system_version: "system_version"
});

// Try without 0x
const no0x = { ...baseData };
no0x.document_hash = no0x.document_hash.replace('0x', '');
no0x.blockchain_tx = no0x.blockchain_tx.replace('0x', '');
check(no0x);

// Try with empty strings instead of null
const noNull = { ...baseData };
if (noNull.expiry_date === null) noNull.expiry_date = "";
check(noNull);

// Try skipping system_version
const noSys = { ...baseData };
delete noSys.system_version;
check(noSys);

// Try skipping verification_result
const noRes = { ...baseData };
delete noRes.verification_result;
check(noRes);

// THE REAL CLUE: maybe VerifiedAt had NO milliseconds?
const noMillis = { ...baseData };
noMillis.verified_at = noMillis.verified_at.split('.')[0] + 'Z';
check(noMillis);

const expNoMillis = { ...baseData };
expNoMillis.expiry_date = expNoMillis.expiry_date.split('.')[0] + 'Z';
check(expNoMillis);

console.log('No match found.');
