const db = require('../config/db');

exports.requestInstitution = async (req, res) => {
    const { institutionName, institutionAddress } = req.body;
    const userId = req.user.id; // From JWT

    try {
        await db.query(
            'INSERT INTO institution_requests (uploader_id, institution_name, institution_address) VALUES (?, ?, ?)',
            [userId, institutionName, institutionAddress]
        );
        res.status(201).json({ message: 'Institution request submitted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMyStatus = async (req, res) => {
    const userId = req.user.id;
    try {
        // Check current link
        const [user] = await db.query('SELECT institution_id FROM users WHERE id = ?', [userId]);
        if (user[0].institution_id) {
            const [inst] = await db.query('SELECT * FROM institutions WHERE id = ?', [user[0].institution_id]);
            return res.json({ status: 'approved', institution: inst[0] });
        }

        // Check pending requests
        const [requests] = await db.query('SELECT * FROM institution_requests WHERE uploader_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
        if (requests.length > 0) {
            return res.json({ status: requests[0].status, request: requests[0] });
        }

        res.json({ status: 'none' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInstitution = async (req, res) => {
    const { id } = req.params;
    try {
        const [inst] = await db.query('SELECT * FROM institutions WHERE id = ?', [id]);
        if (inst.length === 0) return res.status(404).json({ message: 'Institution not found' });
        res.json(inst[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
