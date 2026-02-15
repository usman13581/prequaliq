const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/supplier', authorize('supplier'), documentController.upload.single('file'), documentController.uploadDocument);
router.post('/procuring-entity', authorize('procuring_entity'), documentController.upload.single('file'), documentController.uploadProcuringEntityDocument);
router.get('/', documentController.getDocuments);
router.delete('/:documentId', documentController.deleteDocument);

module.exports = router;
