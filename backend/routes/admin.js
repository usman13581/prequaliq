const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors, emailField, optionalEmailField } = require('../middleware/validate');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

const createUserAccountValidation = [
  emailField('email', 'Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  handleValidationErrors
];

const createEntityValidation = [
  emailField('email', 'Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('entityName').trim().notEmpty().withMessage('Entity name is required'),
  handleValidationErrors
];

const createCompanyValidation = [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  optionalEmailField('email', 'Invalid company email'),
  handleValidationErrors
];

const resetPasswordValidation = [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
];

router.get('/dashboard/stats', adminController.getDashboardStats);
router.post('/suppliers', createUserAccountValidation, adminController.createSupplier);
router.post('/procuring-entities', createEntityValidation, adminController.createProcuringEntity);
router.post('/companies', createCompanyValidation, adminController.createCompany);
router.get('/suppliers', adminController.getSuppliers);
router.get('/suppliers/:supplierId', adminController.getSupplierById);
router.put('/suppliers/:supplierId/review', adminController.reviewSupplier);
router.put('/suppliers/:supplierId/toggle-status', adminController.toggleSupplierStatus);
router.put('/suppliers/:supplierId/reset-password', resetPasswordValidation, adminController.resetSupplierPassword);
router.put('/suppliers/:supplierId', adminController.updateSupplier);
router.delete('/suppliers/:supplierId', adminController.deleteSupplier);
router.get('/procuring-entities', adminController.getProcuringEntities);
router.get('/procuring-entities/:entityId', adminController.getProcuringEntityById);
router.put('/procuring-entities/:entityId/review', adminController.reviewProcuringEntity);
router.put('/procuring-entities/:entityId/toggle-status', adminController.toggleProcuringEntityStatus);
router.put('/procuring-entities/:entityId/reset-password', resetPasswordValidation, adminController.resetProcuringEntityPassword);
router.put('/procuring-entities/:entityId', adminController.updateProcuringEntity);
router.delete('/procuring-entities/:entityId', adminController.deleteProcuringEntity);
router.get('/companies', adminController.getCompanies);
router.get('/debug/suppliers', adminController.debugSuppliers);

// Entitlements (04 / 41)
const entitlementController = require('../controllers/entitlementController');
router.get('/feature-catalog', entitlementController.getCatalog);
router.get('/users/:userId/entitlements', entitlementController.getUserEntitlements);
router.put('/users/:userId/entitlements', entitlementController.updateUserEntitlements);
router.get('/ai-flags', entitlementController.getGlobalAiFlagsAdmin);
router.put('/ai-flags', entitlementController.updateGlobalAiFlags);

// Departments (05)
const departmentController = require('../controllers/departmentController');
router.get('/departments', departmentController.adminListDepartments);
router.post('/departments', departmentController.adminCreateDepartment);
router.put('/departments/:departmentId', departmentController.updateDepartment);
router.delete('/departments/:departmentId', departmentController.deleteDepartment);

// Lookups (CPV, NUTS, generic)
const lookupAdminController = require('../controllers/lookupAdminController');
router.get('/lookups/types', lookupAdminController.listTypes);
router.post('/lookups/types', lookupAdminController.createType);
router.get('/lookups/:type', lookupAdminController.listItems);
router.post('/lookups/:type', lookupAdminController.createItem);
router.put('/lookups/:type/:id', lookupAdminController.updateItem);
router.put('/lookups/:type/:id/toggle-active', lookupAdminController.toggleActive);

module.exports = router;
