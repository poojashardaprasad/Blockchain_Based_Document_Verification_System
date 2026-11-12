const db = require('./config/db');

async function checkProofs() {
    try {
        console.log('Checking verification_proofs table...\n');

        const [proofs] = await db.query('SELECT * FROM verification_proofs ORDER BY id DESC LIMIT 3');

        if (proofs.length === 0) {
            console.log('❌ No proofs found in database!');
            console.log('This means proof generation is failing.\n');
        } else {
            console.log(`✅ Found ${proofs.length} proof(s):\n`);
            proofs.forEach((proof, index) => {
                console.log(`Proof ${index + 1}:`);
                console.log(`  ID: ${proof.id}`);
                console.log(`  Verification ID: ${proof.verification_id}`);
                console.log(`  Proof Hash: ${proof.proof_hash}`);
                console.log(`  Created At: ${proof.created_at}`);
                console.log('');
            });
        }

        // Check recent verifications
        console.log('Checking recent verifications...\n');
        const [verifications] = await db.query('SELECT * FROM verifications ORDER BY id DESC LIMIT 3');

        console.log(`Found ${verifications.length} recent verification(s):\n`);
        verifications.forEach((v, index) => {
            console.log(`Verification ${index + 1}:`);
            console.log(`  ID: ${v.id}`);
            console.log(`  Result: ${v.result}`);
            console.log(`  Doc ID: ${v.doc_id}`);
            console.log(`  Timestamp: ${v.timestamp}`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProofs();
