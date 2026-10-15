const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const entitlementController = require('../controllers/entitlementController');

router.use(authenticate);
router.get('/me', entitlementController.getMyEntitlements);
router.get('/catalog', entitlementController.getCatalog);
router.get('/ai-preferences', entitlementController.getMyAiPreferences);
router.put('/ai-preferences', entitlementController.updateMyAiPreferences);

module.exports = router;
