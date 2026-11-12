const express = require('express');
const router = express.Router();
const controller = require('../controllers/documentController');
const proofController = require('../controllers/proofController');
const certificateController = require('../controllers/certificateController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { proofVerificationLimiter, certificateDownloadLimiter } = require('../middlewares/rateLimiter');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Ensure uploads dir exists (usually done in main or manually)
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Document routes (existing)
router.post('/upload', protect, authorize('uploader'), upload.single('document'), controller.uploadDocument);
router.post('/verify', upload.single('document'), controller.verifyDocument);
router.get('/stats', protect, authorize('uploader'), controller.getUploaderStats);
router.post('/:id/revoke', protect, authorize('uploader'), controller.revokeDocument);

// Redundant public routes removed (use /api/certificates instead)


module.exports = router;
