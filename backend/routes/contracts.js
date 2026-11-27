const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const contractController = require('../controllers/contractController');

router.use(authenticate);

const createContractValidation = [
  body('title').trim().notEmpty().withMessage('Contract title is required'),
  body('supplierId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid supplier'),
  body('procedureId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid procedure'),
  handleValidationErrors
];

router.get('/mine', authorize('procuring_entity'), contractController.listBuyerContracts);
router.get('/supplier-mine', authorize('supplier'), contractController.listSupplierContracts);
router.get('/attachments/:attachmentId/download', authorize('procuring_entity', 'supplier'), contractController.downloadContractAttachment);
router.get('/:contractId', authorize('procuring_entity', 'supplier'), contractController.getContractDetail);
router.post('/', authorize('procuring_entity'), createContractValidation, contractController.createContract);
router.put('/:contractId', authorize('procuring_entity'), contractController.updateContract);
router.post('/:contractId/terminate', authorize('procuring_entity'), contractController.terminateContract);
router.post('/:contractId/messages', authorize('procuring_entity', 'supplier'), contractController.postContractMessage);
router.post('/:contractId/delivery/mark-done', authorize('supplier'), contractController.markDeliveryDone);
router.post('/:contractId/delivery/accept', authorize('procuring_entity'), contractController.acceptDelivery);
router.post('/:contractId/delivery/request-changes', authorize('procuring_entity'), contractController.requestDeliveryChanges);
router.post('/:contractId/delivery/reopen', authorize('procuring_entity'), contractController.reopenDelivery);
router.post('/:contractId/call-offs', authorize('procuring_entity'), contractController.createCallOff);
router.get('/analytics/summary', authorize('procuring_entity'), contractController.analyticsSummary);
router.get('/marketplace/suppliers', authorize('procuring_entity'), contractController.discoverSuppliers);
router.post('/dis/:procedureId/apply', authorize('supplier'), contractController.applyDis);
router.get('/dis/memberships', authorize('procuring_entity'), contractController.listDisMemberships);
router.put('/dis/memberships/:membershipId', authorize('procuring_entity'), contractController.reviewDis);

module.exports = router;
