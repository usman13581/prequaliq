const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('supplier'));

router.get('/profile', supplierController.getProfile);
router.put('/profile', supplierController.updateProfile);
router.put('/cpv-codes', supplierController.updateCPVCodes);
router.put('/nuts-codes', supplierController.updateNUTSCodes);
router.get('/questionnaires/active', supplierController.getActiveQuestionnaires);
router.get('/questionnaires/history', supplierController.getQuestionnaireHistory);

module.exports = router;
