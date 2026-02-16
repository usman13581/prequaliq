const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

router.post('/suppliers', adminController.createSupplier);
router.post('/procuring-entities', adminController.createProcuringEntity);
router.post('/companies', adminController.createCompany);
router.get('/suppliers', adminController.getSuppliers);
router.get('/suppliers/:supplierId', adminController.getSupplierById);
router.put('/suppliers/:supplierId/review', adminController.reviewSupplier);
router.put('/suppliers/:supplierId/toggle-status', adminController.toggleSupplierStatus);
router.put('/suppliers/:supplierId/reset-password', adminController.resetSupplierPassword);
router.put('/suppliers/:supplierId', adminController.updateSupplier);
router.get('/procuring-entities', adminController.getProcuringEntities);
router.get('/procuring-entities/:entityId', adminController.getProcuringEntityById);
router.put('/procuring-entities/:entityId/toggle-status', adminController.toggleProcuringEntityStatus);
router.put('/procuring-entities/:entityId/reset-password', adminController.resetProcuringEntityPassword);
router.put('/procuring-entities/:entityId', adminController.updateProcuringEntity);
router.get('/companies', adminController.getCompanies);
router.get('/debug/suppliers', adminController.debugSuppliers);

module.exports = router;
