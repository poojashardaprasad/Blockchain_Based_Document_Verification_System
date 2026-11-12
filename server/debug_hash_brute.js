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

function computeHash(obj, useDeterministic = true) {
    const json = useDeterministic ? deterministicStringify(obj) : JSON.stringify(obj);
    return crypto.createHash('sha256').update(json).digest('hex');
}

const targetHash = '7dd84d67a5944a137568666011e16f0e33e8aa245ae78939d49e95f528b8e9f4';

// Original object from DB
const baseObj = {
    "expiry_date": "2026-01-28T18:30:00.000Z",
    "verified_at": "2026-01-05T16:35:12.245Z",
    "block_number": 13,
    "blockchain_tx": "0x028d2890011e9c70b52598992a79c8f6e2cb71dab4233ce4d56dfddfa6d73cdd",
    "document_hash": "0x4915a9bcf598532ba8e6953ce4c25c8c1d13046d2b1cc4eff93b815d84144dcf",
    "verifier_type": "public",
    "system_version": "v1.0",
    "institution_name": "uity",
    "verification_result": "VALID"
};

console.log('Target Hash:', targetHash);

const variations = [];

// 1. Basic variations
variations.push({ name: 'Base', obj: { ...baseObj } });

// 2. Type variations
const withStringBlock = { ...baseObj, block_number: String(baseObj.block_number) };
variations.push({ name: 'String Block Number', obj: withStringBlock });

// 3. Date variations
const withDateObjects = {
    ...baseObj,
    verified_at: new Date(baseObj.verified_at),
    expiry_date: new Date(baseObj.expiry_date)
};
variations.push({ name: 'Date Objects', obj: withDateObjects });

// 4. Missing fields
const withoutExpiry = { ...baseObj };
delete withoutExpiry.expiry_date;
variations.push({ name: 'No Expiry Date', obj: withoutExpiry });

const withoutSystem = { ...baseObj };
delete withoutSystem.system_version;
variations.push({ name: 'No System Version', obj: withoutSystem });

// 5. Case variations (unlikely but check)
const camelCaseBlock = { ...baseObj, blockNumber: baseObj.block_number };
delete camelCaseBlock.block_number;
variations.push({ name: 'CamelCase Block Number', obj: camelCaseBlock });

// 6. Value variations (removing 0x)
const noPrefix = {
    ...baseObj,
    blockchain_tx: baseObj.blockchain_tx.replace('0x', ''),
    document_hash: baseObj.document_hash.replace('0x', '')
};
variations.push({ name: 'No 0x Prefixes', obj: noPrefix });

// 7. Try without deterministic (standard JSON.stringify)
console.log('\nRunning variations...\n');

for (const v of variations) {
    const h1 = computeHash(v.obj, true);
    const h2 = computeHash(v.obj, false);

    if (h1 === targetHash) console.log(`[MATCH] ${v.name} (Deterministic)`);
    if (h2 === targetHash) console.log(`[MATCH] ${v.name} (Standard)`);

    // console.log(`${v.name.padEnd(25)} | Det: ${h1.substring(0, 10)}... | Std: ${h2.substring(0, 10)}...`);
}

// 8. Try subtle field changes
const keys = Object.keys(baseObj);
for (let i = 0; i < keys.length; i++) {
    const reduced = { ...baseObj };
    delete reduced[keys[i]];
    if (computeHash(reduced, true) === targetHash) console.log(`[MATCH] Missing ${keys[i]}`);
}

console.log('\nFinished.');
