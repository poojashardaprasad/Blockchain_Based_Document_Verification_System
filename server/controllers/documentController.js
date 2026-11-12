const db = require('../config/db');
const blockchain = require('../utils/blockchain');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Helper to calc hash
const calculateFileHash = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return '0x' + hashSum.digest('hex'); // 0x prefix for Solidity bytes32
};

exports.uploadDocument = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const uploaderId = req.user.id; // From JWT
    const { institution_id } = req.user; // From JWT
    const { expiryDate } = req.body; // New: Expiry date from form

    // Verify Active Institution
    if (!institution_id) return res.status(403).json({ message: 'No institution linked' });

    if (expiryDate) {
        const expiry = new Date(expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiry < today) {
            return res.status(400).json({ message: 'Expiry date must be in the future' });
        }
    }

    // Double check institution status
    const [inst] = await db.query('SELECT status FROM institutions WHERE id = ?', [institution_id]);
    if (inst.length === 0 || inst[0].status !== 'active') {
        return res.status(403).json({ message: 'Institution inactive' });
    }

    const filePath = req.file.path;
    const filename = req.file.originalname;

    try {
        // 1. Calculate Hash
        const docHash = calculateFileHash(filePath);

        // Check DB first
        const [existing] = await db.query('SELECT * FROM documents WHERE original_hash = ?', [docHash]);
        if (existing.length > 0) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(200).json({
                message: 'Document already exists',
                txHash: existing[0].tx_hash,
                docHash,
                expiryDate: existing[0].expiry_date
            });
        }

        // 2. Check Blockchain (Handling re-upload of wiped DB but persistent blockchain)
        const bcCheck = await blockchain.verifyHash(docHash);
        let txHash, blockNumber;

        if (bcCheck.exists) {
            // It exists on chain but not in DB. Recover it.
            txHash = 'RECOVERED_FROM_BLOCKCHAIN';
            blockNumber = 0;
        } else {
            // New Anchor
            try {
                const result = await blockchain.anchorHash(docHash);
                txHash = result.txHash;
                blockNumber = result.blockNumber;
            } catch (err) {
                // FALLBACK: If verifyHash failed (false negative) but anchorHash reverts with "already anchored", correct it.
                // We check for "revert" or typical Ganache/Hardhat revert messages
                if (err.message && (err.message.includes('revert') || err.message.includes('already anchored'))) {
                    console.log('Anchor reverted, assuming document exists (false negative verify). Recovering...');
                    txHash = 'RECOVERED_FROM_BLOCKCHAIN';
                    blockNumber = 0;
                } else {
                    throw err; // Real error
                }
            }
        }

        // 3. Store in DB with expiry date
        const formattedExpiry = expiryDate ? new Date(expiryDate).toISOString().slice(0, 10) : null;
        console.log('Inserting Document with Expiry:', formattedExpiry);
        await db.query(
            'INSERT INTO documents (uploader_id, institution_id, filename, original_hash, tx_hash, block_number, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uploaderId, institution_id, filename, docHash, txHash, blockNumber, formattedExpiry]
        );

        // Cleanup: Delete file from server (we don't store documents)
        fs.unlinkSync(filePath);

        res.status(201).json({ message: 'Document anchored successfully', txHash, docHash, expiryDate });
    } catch (error) {
        console.error(error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Cleanup on error
        res.status(500).json({ message: 'Upload/Anchor failed: ' + error.message });
    }
};

exports.verifyDocument = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const verifierId = req.user ? req.user.id : null; // Optional user if public
    const filePath = req.file.path;

    try {
        // 1. Calculate Hash
        const docHash = calculateFileHash(filePath);

        // 2. Check Blockchain
        const bcResult = await blockchain.verifyHash(docHash);

        // 3. Check DB for extra details (filename, institution name)
        const [dbDoc] = await db.query(
            `SELECT d.*, i.name as institution_name 
         FROM documents d 
         JOIN institutions i ON d.institution_id = i.id 
         WHERE d.original_hash = ?`,
            [docHash]
        );

        let result = 'invalid';
        let details = {};

        if (bcResult.exists && dbDoc.length > 0) {
            // Valid if blockchain says valid AND db hash matches
            // Check revocation
            if (bcResult.status === '0' && dbDoc[0].status === 'active') {
                result = 'valid';
                details = {
                    institution: dbDoc[0].institution_name,
                    timestamp: new Date(Number(bcResult.timestamp) * 1000).toISOString(),
                    blockNumber: dbDoc[0].block_number,
                    txHash: dbDoc[0].tx_hash,
                    expiryDate: dbDoc[0].expiry_date,
                    isExpired: dbDoc[0].expiry_date && new Date() > new Date(dbDoc[0].expiry_date)
                };
            } else {
                result = 'invalid'; // Revoked
                details = { reason: bcResult.revocationReason || 'Revoked' };
            }
        }

        // 4. Log Verification
        // verifications: id, doc_id, verifier_id, uploaded_hash, stored_hash, result (valid/invalid), verifier_ip, timestamp
        // doc_id is in dbDoc[0].id if found
        const docId = dbDoc.length > 0 ? dbDoc[0].id : null;
        const ip = req.ip;

        const [verificationResult] = await db.query(
            'INSERT INTO verifications (doc_id, verifier_id, uploaded_hash, stored_hash, result, verifier_ip) VALUES (?, ?, ?, ?, ?, ?)',
            [docId, verifierId, docHash, docId ? docHash : null, result, ip]
        );
        const verificationId = verificationResult.insertId;

        // NEW: Generate cryptographic proof certificate for VALID results
        let certificateData = null;
        if (result === 'valid' && dbDoc.length > 0 && dbDoc[0].status === 'active') {
            try {
                const { generateProofObject, computeProofHash } = require('../utils/proofGenerator');

                const proofObject = generateProofObject({
                    documentHash: String(docHash),
                    institutionName: String(dbDoc[0].institution_name),
                    verifiedAt: new Date().toISOString(),
                    blockchainTx: String(dbDoc[0].tx_hash),
                    blockNumber: Number(dbDoc[0].block_number),
                    verifierType: verifierId ? 'authenticated' : 'public',
                    expiryDate: dbDoc[0].expiry_date
                });

                const proofHash = computeProofHash(proofObject);

                // Persist proof to database
                await db.query(
                    'INSERT INTO verification_proofs (verification_id, proof_hash, proof_object) VALUES (?, ?, ?)',
                    [verificationId, proofHash, JSON.stringify(proofObject)]
                );

                console.log(`✅ Verification certificate generated: ${proofHash}`);

                certificateData = {
                    proofHash,
                    downloadPDF: `/api/certificates/download/${proofHash}`,
                    downloadJSON: `/api/certificates/json/${proofHash}`,
                    verifyOnline: `/verify-proof/${proofHash}`,
                    previewUrl: `/api/certificates/preview/${proofHash}`
                };
            } catch (proofError) {
                console.error('⚠️  Proof generation failed (verification still valid):', proofError);
                // Don't fail the verification if proof generation fails
            }
        }

        // Cleanup uploaded file
        fs.unlinkSync(filePath);

        // Return response with certificate data if available
        res.json({
            result,
            ...details,
            ...(certificateData && { certificate: certificateData })
        });

    } catch (error) {
        console.error(error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ message: 'Verification failed' });
    }
};

exports.getUploaderStats = async (req, res) => {
    const uploaderId = req.user.id;
    try {
        const [docs] = await db.query('SELECT COUNT(*) as count FROM documents WHERE uploader_id = ?', [uploaderId]);
        const [verifications] = await db.query(`
            SELECT v.result, COUNT(*) as count 
            FROM verifications v
            JOIN documents d ON v.doc_id = d.id
            WHERE d.uploader_id = ?
            GROUP BY v.result
        `, [uploaderId]);

        const [recentDocs] = await db.query('SELECT * FROM documents WHERE uploader_id = ? ORDER BY created_at DESC LIMIT 5', [uploaderId]);

        // Full lists for modal views
        const [allDocuments] = await db.query(`
            SELECT d.id, d.filename, d.original_hash, d.tx_hash, d.block_number, 
                   d.status, d.created_at
            FROM documents d
            WHERE d.uploader_id = ?
            ORDER BY d.created_at DESC
        `, [uploaderId]);

        const [allVerifications] = await db.query(`
            SELECT v.id, v.result, v.timestamp, d.filename, v.verifier_ip,
                   u.name as verifier_name
            FROM verifications v
            JOIN documents d ON v.doc_id = d.id
            LEFT JOIN users u ON v.verifier_id = u.id
            WHERE d.uploader_id = ?
            ORDER BY v.timestamp DESC
        `, [uploaderId]);

        // Separate valid and invalid verifications
        const validVerifications = allVerifications.filter(v => v.result === 'valid');
        const invalidVerifications = allVerifications.filter(v => v.result === 'invalid');

        res.json({
            totalDocuments: docs[0].count,
            verifications: verifications,
            recentDocuments: recentDocs,
            // Detailed lists
            allDocuments: allDocuments,
            allVerifications: allVerifications,
            validVerifications: validVerifications,
            invalidVerifications: invalidVerifications
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Revoke Document (Uploader only)
exports.revokeDocument = async (req, res) => {
    const { id } = req.params;
    const uploaderId = req.user.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if document exists and belongs to uploader
        const [documents] = await connection.query(
            'SELECT * FROM documents WHERE id = ? AND uploader_id = ?',
            [id, uploaderId]
        );

        if (documents.length === 0) {
            throw new Error('Document not found or unauthorized');
        }

        const document = documents[0];

        if (document.status === 'revoked') {
            throw new Error('Document is already revoked');
        }

        // Mark document as revoked
        await connection.query('UPDATE documents SET status = "revoked" WHERE id = ?', [id]);

        // Log revocation
        await connection.query(
            'INSERT INTO revoked_documents (document_id, reason, revoked_by) VALUES (?, ?, ?)',
            [id, 'Revoked by uploader', uploaderId]
        );

        await connection.commit();
        res.json({ message: 'Document revoked successfully' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        connection.release();
    }
};
