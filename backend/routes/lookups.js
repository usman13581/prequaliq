const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const lookupAdminController = require('../controllers/lookupAdminController');

router.use(authenticate);

router.get('/:type', lookupAdminController.listPublicByType);

module.exports = router;
