const { generateProofObject, computeProofHash } = require('./utils/proofGenerator');
require('dotenv').config();

async function test() {
    try {
        const mockData = {
            documentHash: '0x3f3e28a80109fbd2b4c429265ae045a5e54cbf65adf794da622333da7cd80e95',
            institutionName: 'uity',
            verifiedAt: new Date().toISOString(),
            blockchainTx: '0x3a9046521c164a75f436f68ab35e0a0df4f7dd00396462a93a07653af0ad49d1',
            blockNumber: 10,
            verifierType: 'public',
            expiryDate: '2026-01-21T18:30:00.000Z'
        };

        const proofObject = generateProofObject(mockData);
        const proofHash = computeProofHash(proofObject);

        console.log('Object Keys:', Object.keys(proofObject));
        console.log('Generated Proof Hash:', proofHash);

        // Simulate DB storage (JSON.stringify then JSON.parse)
        const storedJson = JSON.stringify(proofObject);
        const retrievedObject = JSON.parse(storedJson);

        const recomputedHash = computeProofHash(retrievedObject);
        console.log('Recomputed Hash (Post-Storage):', recomputedHash);

        console.log('MATCH:', proofHash === recomputedHash);

        if (proofHash !== recomputedHash) {
            console.log('--- DISCREPANCY DETECTED ---');
            // Compare the deterministic JSONs
            // We need to expose deterministicStringify or just copy it
            const ds = (obj) => {
                if (obj === null) return 'null';
                if (obj instanceof Date) return JSON.stringify(obj);
                if (typeof obj !== 'object') return JSON.stringify(obj);
                if (Array.isArray(obj)) return '[' + obj.map(ds).join(',') + ']';
                const keys = Object.keys(obj).sort();
                const pairs = keys.map(key => JSON.stringify(key) + ':' + ds(obj[key]));
                return '{' + pairs.join(',') + '}';
            };

            console.log('Original DS:', ds(proofObject));
            console.log('Retrieved DS:', ds(retrievedObject));
        }

    } catch (e) {
        console.error(e);
    }
}

test();
