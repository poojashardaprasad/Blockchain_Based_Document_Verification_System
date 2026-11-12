const express = require('express');
const router = express.Router();
const controller = require('../controllers/institutionController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/request', protect, authorize('uploader'), controller.requestInstitution);
router.get('/my-status', protect, authorize('uploader'), controller.getMyStatus);
router.get('/:id', protect, controller.getInstitution);

module.exports = router;
