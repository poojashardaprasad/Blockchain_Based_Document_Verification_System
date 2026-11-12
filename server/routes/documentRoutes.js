const express = require('express');
const router = express.Router();
const controller = require('../controllers/documentController');
const proofController = require('../controllers/proofController');
const certificateController = require('../controllers/certificateController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { proofVerificationLimiter, certificateDownloadLimiter } = require('../middlewares/rateLimiter');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max limit
});

// Document routes (existing)
router.post('/upload', protect, authorize('uploader'), upload.single('document'), controller.uploadDocument);
router.post('/verify', upload.single('document'), controller.verifyDocument);
router.get('/stats', protect, authorize('uploader'), controller.getUploaderStats);
router.post('/:id/revoke', protect, authorize('uploader'), controller.revokeDocument);

// Redundant public routes removed (use /api/certificates instead)


module.exports = router;
