const db = require('../config/db');

exports.getInstitutionRequests = async (req, res) => {
    try {
        const [requests] = await db.query('SELECT * FROM institution_requests WHERE status = "pending"');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.approveInstitution = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id; // Reviewed by

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get Request
        const [reqs] = await connection.query('SELECT * FROM institution_requests WHERE id = ?', [id]);
        if (reqs.length === 0) throw new Error('Request not found');
        const request = reqs[0];

        // Create Institution
        const [instResult] = await connection.query(
            'INSERT INTO institutions (name, address, status) VALUES (?, ?, "active")',
            [request.institution_name, request.institution_address]
        );
        const instId = instResult.insertId;

        // Update User
        await connection.query('UPDATE users SET institution_id = ? WHERE id = ?', [instId, request.uploader_id]);

        // Update Request
        await connection.query(
            'UPDATE institution_requests SET status = "approved", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            [adminId, id]
        );

        await connection.commit();
        res.json({ message: 'Institution approved' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        connection.release();
    }
};

exports.rejectInstitution = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    try {
        await db.query(
            'UPDATE institution_requests SET status = "rejected", rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            [reason, adminId, id]
        );
        res.json({ message: 'Institution rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [users] = await db.query('SELECT COUNT(*) as count FROM users');
        const [docs] = await db.query('SELECT COUNT(*) as count FROM documents');
        const [insts] = await db.query('SELECT COUNT(*) as count FROM institutions');
        const [verifications] = await db.query('SELECT COUNT(*) as count FROM verifications');

        // Ratio: Valid vs Invalid
        const [validVerifications] = await db.query('SELECT COUNT(*) as count FROM verifications WHERE result = "valid"');
        const [invalidVerifications] = await db.query('SELECT COUNT(*) as count FROM verifications WHERE result = "invalid"');

        // Trends: Last 7 days verifications
        const [trends] = await db.query(`
            SELECT DATE(timestamp) as date, COUNT(*) as count 
            FROM verifications 
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
            GROUP BY DATE(timestamp) 
            ORDER BY DATE(timestamp) ASC
        `);

        // Detailed Lists for Modal Views
        const [usersList] = await db.query(`
            SELECT u.id, u.name, u.email, u.role, i.name as institution_name, u.created_at
            FROM users u
            LEFT JOIN institutions i ON u.institution_id = i.id
            ORDER BY u.created_at DESC
        `);

        const [documentsList] = await db.query(`
            SELECT d.id, d.filename, u.name as uploader_name, i.name as institution_name, 
                   d.created_at, d.status, d.tx_hash, d.block_number
            FROM documents d
            JOIN users u ON d.uploader_id = u.id
            JOIN institutions i ON d.institution_id = i.id
            ORDER BY d.created_at DESC
        `);

        const [institutionsList] = await db.query(`
            SELECT i.id, i.name, i.address, i.status, i.created_at,
                   COUNT(d.id) as document_count
            FROM institutions i
            LEFT JOIN documents d ON i.id = d.institution_id
            GROUP BY i.id
            ORDER BY i.created_at DESC
        `);

        const [verificationsList] = await db.query(`
            SELECT v.id, v.result, v.timestamp, d.filename, i.name as institution_name,
                   u.name as verifier_name, v.verifier_ip
            FROM verifications v
            LEFT JOIN documents d ON v.doc_id = d.id
            LEFT JOIN institutions i ON d.institution_id = i.id
            LEFT JOIN users u ON v.verifier_id = u.id
            ORDER BY v.timestamp DESC
        `);

        res.json({
            users: users[0].count,
            documents: docs[0].count,
            institutions: insts[0].count,
            verifications: verifications[0].count,
            ratios: {
                valid: validVerifications[0].count,
                invalid: invalidVerifications[0].count
            },
            trends: trends,
            // Detailed lists
            usersList: usersList,
            documentsList: documentsList,
            institutionsList: institutionsList,
            verificationsList: verificationsList
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deactivateInstitution = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if institution exists
        const [institutions] = await connection.query('SELECT * FROM institutions WHERE id = ?', [id]);
        if (institutions.length === 0) {
            throw new Error('Institution not found');
        }

        // Mark institution as inactive
        await connection.query('UPDATE institutions SET status = "inactive" WHERE id = ?', [id]);

        // Mark all documents from this institution as revoked
        await connection.query('UPDATE documents SET status = "revoked" WHERE institution_id = ?', [id]);

        // Log the revocation for all documents
        const [documents] = await connection.query('SELECT id FROM documents WHERE institution_id = ?', [id]);

        for (const doc of documents) {
            await connection.query(
                'INSERT INTO revoked_documents (document_id, reason, revoked_by) VALUES (?, ?, ?)',
                [doc.id, 'Institution deactivated by admin', adminId]
            );
        }

        // Optionally: Unlink users from this institution
        await connection.query('UPDATE users SET institution_id = NULL WHERE institution_id = ?', [id]);

        await connection.commit();
        res.json({
            message: 'Institution deactivated successfully',
            documentsRevoked: documents.length
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        connection.release();
    }
};


exports.reactivateInstitution = async (req, res) => {
    const { id } = req.params;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if institution exists
        const [institutions] = await connection.query('SELECT * FROM institutions WHERE id = ?', [id]);
        if (institutions.length === 0) {
            throw new Error('Institution not found');
        }

        // Mark institution as active
        await connection.query('UPDATE institutions SET status = "active" WHERE id = ?', [id]);

        // Restore all documents from this institution to active
        await connection.query('UPDATE documents SET status = "active" WHERE institution_id = ?', [id]);

        // Remove revocation records for documents from this institution
        await connection.query(`
            DELETE FROM revoked_documents 
            WHERE document_id IN (
                SELECT id FROM documents WHERE institution_id = ?
            )
        `, [id]);

        // Get count of restored documents
        const [documents] = await connection.query('SELECT COUNT(*) as count FROM documents WHERE institution_id = ?', [id]);

        await connection.commit();
        res.json({ 
            message: 'Institution reactivated successfully',
            documentsRestored: documents[0].count
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        connection.release();
    }
};
