const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const proofController = require('../controllers/proofController');
const { certificateDownloadLimiter, proofVerificationLimiter } = require('../middlewares/rateLimiter');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Certificate download routes (public, rate-limited)
router.get('/download/:proofHash', certificateDownloadLimiter, certificateController.downloadPDF);
router.get('/json/:proofHash', certificateDownloadLimiter, certificateController.getJSON);
router.get('/preview/:proofHash', certificateController.getCertificatePreview);

// Public proof verification (mounted here for cleaner URLs)
router.get('/verify/:proofHash', proofVerificationLimiter, proofController.verifyProof);

// Admin-only stats
router.get('/stats', protect, authorize('admin'), proofController.getProofStats);

module.exports = router;
