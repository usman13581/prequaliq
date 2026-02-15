const express = require('express');
const router = express.Router();
const procuringEntityController = require('../controllers/procuringEntityController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('procuring_entity'));

router.get('/profile', procuringEntityController.getProfile);
router.put('/profile', procuringEntityController.updateProfile);
router.get('/suppliers', procuringEntityController.getSuppliers);
router.get('/suppliers/:supplierId', procuringEntityController.getSupplierDetails);

module.exports = router;
