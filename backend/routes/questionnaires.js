const express = require('express');
const router = express.Router();
const questionnaireController = require('../controllers/questionnaireController');
const { authenticate, authorize } = require('../middleware/auth');

// Supplier routes
router.post('/:questionnaireId/responses', authenticate, authorize('supplier'), questionnaireController.submitResponse);

// Combined route for GET /:questionnaireId/responses - handles both supplier and procuring_entity
router.get('/:questionnaireId/responses', authenticate, (req, res, next) => {
  if (req.user.role === 'supplier') {
    return questionnaireController.getResponse(req, res, next);
  } else if (req.user.role === 'procuring_entity') {
    return questionnaireController.getQuestionnaireResponses(req, res, next);
  } else {
    return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
  }
});

// Procuring Entity routes
router.post('/', authenticate, authorize('procuring_entity'), questionnaireController.createQuestionnaire);
router.get('/', authenticate, authorize('procuring_entity'), questionnaireController.getQuestionnaires);
router.put('/:questionnaireId', authenticate, authorize('procuring_entity'), questionnaireController.updateQuestionnaire);
router.delete('/:questionnaireId', authenticate, authorize('procuring_entity'), questionnaireController.deleteQuestionnaire);
router.put('/:questionnaireId/toggle-status', authenticate, authorize('procuring_entity'), questionnaireController.toggleQuestionnaireStatus);
router.put('/:questionnaireId/questions/:questionId', authenticate, authorize('procuring_entity'), questionnaireController.updateQuestion);
router.delete('/:questionnaireId/questions/:questionId', authenticate, authorize('procuring_entity'), questionnaireController.deleteQuestion);

module.exports = router;
