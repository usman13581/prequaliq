const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const aiExtrasController = require('../controllers/aiExtrasController');

router.use(authenticate);

router.get('/completeness', authorize('supplier'), aiExtrasController.completenessCheck);
router.get('/qualification-risk/:supplierId', authorize('procuring_entity', 'admin'), aiExtrasController.qualificationRisk);
router.get('/evaluation/:procedureId', authorize('procuring_entity'), aiExtrasController.evaluationCopilot);
router.post('/qa-draft', authorize('procuring_entity'), aiExtrasController.qaDraftReply);
router.get('/announcement/:procedureId', authorize('procuring_entity'), aiExtrasController.announcementDraft);
router.get('/award-memo/:procedureId', authorize('procuring_entity'), aiExtrasController.awardMemoDraft);
router.post('/cpv-recommend', authorize('procuring_entity', 'supplier'), aiExtrasController.cpvRecommend);
router.get('/supplier-matching/:procedureId', authorize('procuring_entity'), aiExtrasController.supplierMatching);

module.exports = router;
