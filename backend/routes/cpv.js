const express = require('express');
const router = express.Router();
const cpvController = require('../controllers/cpvController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, cpvController.getCPVCodes);
router.get('/:cpvId', authenticate, cpvController.getCPVCodeById);
router.post('/', authenticate, authorize('admin'), cpvController.createCPVCode);

module.exports = router;
