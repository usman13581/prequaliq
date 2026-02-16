const express = require('express');
const router = express.Router();
const db = require('../models');
const cpvController = require('../controllers/cpvController');
const { authenticate, authorize } = require('../middleware/auth');

// Public endpoint so you can check DB has CPV codes without logging in (e.g. open in browser)
router.get('/count', async (req, res) => {
  try {
    const count = await db.CPVCode.count();
    res.json({ count });
  } catch (err) {
    console.error('Get CPV count error:', err);
    res.status(500).json({ message: 'Error', error: err.message });
  }
});
router.get('/', authenticate, cpvController.getCPVCodes);
router.get('/:cpvId', authenticate, cpvController.getCPVCodeById);
router.post('/', authenticate, authorize('admin'), cpvController.createCPVCode);

module.exports = router;
