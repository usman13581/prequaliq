const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('supplier'));

router.get('/dashboard', supplierController.getDashboard);
router.get('/profile', supplierController.getProfile);
router.put('/profile', supplierController.updateProfile);
router.get('/ai/status', supplierController.getAiStatus);
router.get('/ai/endpoints', supplierController.getAiEndpoints);
router.post('/insurance/ai-suggest', supplierController.suggestInsuranceFromDocument);
router.post('/profile/ai-suggest', supplierController.suggestProfileFromDocuments);
router.get('/profile/completeness', supplierController.getCompleteness);
router.post('/profile/submit', supplierController.submitProfile);
router.get('/profile/export', supplierController.exportProfile);
router.get('/profile/submissions', supplierController.getProfileSubmissions);
router.get('/qualification', supplierController.getQualification);
router.put('/cpv-codes', supplierController.updateCPVCodes);
router.put('/nuts-codes', supplierController.updateNUTSCodes);
router.get('/references', supplierController.getReferences);
router.post('/references', supplierController.createReference);
router.put('/references/:referenceId', supplierController.updateReference);
router.delete('/references/:referenceId', supplierController.deleteReference);
router.get('/notifications', supplierController.getNotifications);
router.put('/notifications/:notificationId/read', supplierController.markNotificationRead);
router.put('/notifications/read-all', supplierController.markAllNotificationsRead);
router.get('/questionnaires/active', supplierController.getActiveQuestionnaires);
router.get('/questionnaires/history', supplierController.getQuestionnaireHistory);

module.exports = router;
