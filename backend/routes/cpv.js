const express = require('express');
const router = express.Router();
const cpvController = require('../controllers/cpvController');
const { authenticate, authorize } = require('../middleware/auth');

// Public endpoint so you can check DB has CPV codes without logging in (e.g. open in browser)
router.get('/count', cpvController.getCPVCount);
router.get('/', authenticate, cpvController.getCPVCodes);
router.get('/:cpvId', authenticate, cpvController.getCPVCodeById);
router.post('/', authenticate, authorize('admin'), cpvController.createCPVCode);

module.exports = router;
