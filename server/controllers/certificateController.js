const db = require('../config/db');
const certificateService = require('../services/certificateService');
const path = require('path');
const fs = require('fs');

/**
 * Download PDF certificate
 * GET /api/certificates/download/:proofHash
 * Public access - anyone with proof hash can download
 */
exports.downloadPDF = async (req, res) => {
    try {
        const { proofHash } = req.params;

        // Fetch proof data
        const [proofs] = await db.query(
            'SELECT proof_object FROM verification_proofs WHERE proof_hash = ?',
            [proofHash]
        );

        if (proofs.length === 0) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        const proofObject = typeof proofs[0].proof_object === 'string'
            ? JSON.parse(proofs[0].proof_object)
            : proofs[0].proof_object;

        // Generate PDF
        const filepath = await certificateService.generatePDFCertificate({
            proofHash,
            proofObject
        });

        // Send file for download
        const filename = `verification_certificate_${proofHash.substring(0, 8)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Download failed' });
                }
            }
            // Optional: cleanup file after download
            // fs.unlinkSync(filepath);
        });

    } catch (error) {
        console.error('Certificate download error:', error);
        res.status(500).json({ message: 'Failed to generate certificate' });
    }
};

/**
 * Get JSON certificate
 * GET /api/certificates/json/:proofHash
 * Public access - returns machine-verifiable JSON
 */
exports.getJSON = async (req, res) => {
    try {
        const { proofHash } = req.params;

        const [proofs] = await db.query(
            'SELECT proof_object, created_at FROM verification_proofs WHERE proof_hash = ?',
            [proofHash]
        );

        if (proofs.length === 0) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        const proofObject = typeof proofs[0].proof_object === 'string'
            ? JSON.parse(proofs[0].proof_object)
            : proofs[0].proof_object;

        const jsonCertificate = certificateService.generateJSONCertificate({
            proofHash,
            proofObject
        });

        // Set appropriate headers for JSON download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="certificate_${proofHash.substring(0, 8)}.json"`);

        res.json(jsonCertificate);

    } catch (error) {
        console.error('JSON certificate error:', error);
        res.status(500).json({ message: 'Failed to generate JSON certificate' });
    }
};

/**
 * Get certificate metadata (preview before download)
 * GET /api/certificates/preview/:proofHash
 */
exports.getCertificatePreview = async (req, res) => {
    try {
        const { proofHash } = req.params;

        const [proofs] = await db.query(
            `SELECT 
                vp.proof_object,
                vp.created_at,
                vp.blockchain_tx_hash
            FROM verification_proofs vp
            WHERE vp.proof_hash = ?`,
            [proofHash]
        );

        if (proofs.length === 0) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        const proofObject = typeof proofs[0].proof_object === 'string'
            ? JSON.parse(proofs[0].proof_object)
            : proofs[0].proof_object;

        res.json({
            proof_hash: proofHash,
            institution: proofObject.institution_name,
            verified_at: proofObject.verified_at,
            blockchain_tx: proofObject.blockchain_tx,
            block_number: proofObject.block_number,
            certificate_issued_at: proofs[0].created_at,
            download_urls: {
                pdf: `/api/certificates/download/${proofHash}`,
                json: `/api/certificates/json/${proofHash}`
            }
        });

    } catch (error) {
        console.error('Certificate preview error:', error);
        res.status(500).json({ message: 'Failed to load certificate preview' });
    }
};
