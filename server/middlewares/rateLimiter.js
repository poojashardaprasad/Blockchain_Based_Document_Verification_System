const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for public proof verification endpoint
 * Limits: 100 requests per 15 minutes per IP
 */
const proofVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many verification requests from this IP, please try again later',
        retry_after: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many verification requests',
            message: 'You have exceeded the rate limit. Please try again in 15 minutes.',
            retry_after: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        });
    }
});

/**
 * Rate limiter for certificate downloads
 * More generous limit: 50 downloads per 15 minutes
 */
const certificateDownloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        error: 'Too many download requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    proofVerificationLimiter,
    certificateDownloadLimiter
};
