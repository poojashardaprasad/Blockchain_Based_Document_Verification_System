const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch latest user data from DB to avoid stale JWT payload (e.g. after institution approval)
        const db = require('../config/db');
        const [users] = await db.query(
            'SELECT id, name, email, role, institution_id FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        console.log(`[AUTH] Freshly fetched institution_id for user ${users[0].id}: ${users[0].institution_id}`);
        req.user = users[0];
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};
