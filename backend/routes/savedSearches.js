const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const savedSearchController = require('../controllers/savedSearchController');

router.use(authenticate);

router.get('/', savedSearchController.list);
router.post('/', savedSearchController.create);
router.put('/:id', savedSearchController.update);
router.delete('/:id', savedSearchController.remove);

module.exports = router;
