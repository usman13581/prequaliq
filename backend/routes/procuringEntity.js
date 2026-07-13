const express = require('express');
const router = express.Router();
const procuringEntityController = require('../controllers/procuringEntityController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('procuring_entity'));

router.get('/dashboard/stats', procuringEntityController.getDashboardStats);
router.get('/profile', procuringEntityController.getProfile);
router.put('/profile', procuringEntityController.updateProfile);
router.post('/profile/ai-suggest', procuringEntityController.suggestProfileFromDocuments);
router.post('/questionnaires/ai-understand', procuringEntityController.suggestQuestionnaireUnderstand);
router.post('/questionnaires/ai-suggest', procuringEntityController.suggestQuestionnaireFromDescription);
router.get('/suppliers', procuringEntityController.getSuppliers);
router.get('/suppliers/:supplierId', procuringEntityController.getSupplierDetails);

module.exports = router;
