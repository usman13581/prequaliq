const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.use(authenticate);

router.get('/preview', notificationController.getPreview);
router.get('/', notificationController.list);
router.put('/read-all', notificationController.markAll);
router.put('/:notificationId/read', notificationController.markOneRead);

module.exports = router;
