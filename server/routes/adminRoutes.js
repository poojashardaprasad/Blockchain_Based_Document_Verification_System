const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/institution-requests', protect, authorize('admin'), controller.getInstitutionRequests);
router.post('/institution-requests/:id/approve', protect, authorize('admin'), controller.approveInstitution);
router.post('/institution-requests/:id/reject', protect, authorize('admin'), controller.rejectInstitution);
router.get('/stats', protect, authorize('admin'), controller.getStats);
router.post('/institutions/:id/deactivate', protect, authorize('admin'), controller.deactivateInstitution);
router.post('/institutions/:id/reactivate', protect, authorize('admin'), controller.reactivateInstitution);

module.exports = router;
