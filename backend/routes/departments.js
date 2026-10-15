const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const departmentController = require('../controllers/departmentController');

router.use(authenticate);
router.get(
  '/mine',
  authorize('procuring_entity', 'supplier'),
  departmentController.listMyDepartments
);
router.post(
  '/mine',
  authorize('procuring_entity', 'supplier'),
  departmentController.createMyDepartment
);
router.put(
  '/:departmentId',
  authorize('procuring_entity', 'supplier', 'admin'),
  departmentController.updateDepartment
);
router.delete(
  '/:departmentId',
  authorize('procuring_entity', 'supplier', 'admin'),
  departmentController.deleteDepartment
);

module.exports = router;
