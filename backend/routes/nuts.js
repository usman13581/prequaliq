const express = require('express');
const router = express.Router();
const nutsController = require('../controllers/nutsController');
const { authenticate } = require('../middleware/auth');

// Public endpoint for count
router.get('/count', nutsController.getNUTSCount);

// Get NUTS codes (authenticated)
router.get('/', authenticate, nutsController.getNUTSCodes);
router.get('/:id', authenticate, nutsController.getNUTSCode);

module.exports = router;
