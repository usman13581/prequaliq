const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const procedureController = require('../controllers/procedureController');

router.use(authenticate);

const createProcedureValidation = [
  body('title').trim().notEmpty().withMessage('Procedure title is required'),
  body('procedureType')
    .optional()
    .isIn(['open', 'restricted', 'negotiated', 'direct', 'framework', 'dis', 'other'])
    .withMessage('Invalid procedure type'),
  body('bidDeadline').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid bid deadline'),
  handleValidationErrors
];

router.get(
  '/mine',
  authorize('procuring_entity'),
  procedureController.listBuyerProcedures
);
router.post(
  '/',
  authorize('procuring_entity'),
  createProcedureValidation,
  procedureController.createProcedure
);
router.get(
  '/published',
  authorize('supplier'),
  procedureController.listPublishedForSupplier
);
router.get(
  '/complements/mine',
  authorize('supplier'),
  procedureController.listMyComplements
);
router.put(
  '/complements/:complementId/respond',
  authorize('supplier'),
  procedureController.respondComplement
);
router.post(
  '/complements/:complementId/messages',
  authorize('procuring_entity', 'supplier'),
  procedureController.postComplementMessage
);
router.get(
  '/complements/attachments/:attachmentId/download',
  authorize('procuring_entity', 'supplier', 'admin'),
  procedureController.downloadComplementAttachment
);

router.get(
  '/:procedureId',
  authorize('procuring_entity', 'supplier', 'admin'),
  procedureController.getProcedure
);
router.put(
  '/:procedureId',
  authorize('procuring_entity'),
  procedureController.updateProcedure
);
router.put(
  '/:procedureId/underlag',
  authorize('procuring_entity'),
  procedureController.linkQuestionnaire
);
router.post(
  '/:procedureId/qa',
  authorize('procuring_entity', 'supplier'),
  procedureController.postQaMessage
);
router.put(
  '/:procedureId/evaluations',
  authorize('procuring_entity'),
  procedureController.upsertEvaluation
);
router.put(
  '/:procedureId/award',
  authorize('procuring_entity'),
  procedureController.createAward
);
router.post(
  '/:procedureId/publish',
  authorize('procuring_entity'),
  procedureController.publishProcedure
);
router.post(
  '/:procedureId/unpublish',
  authorize('procuring_entity'),
  procedureController.unpublishProcedure
);
router.post(
  '/:procedureId/close',
  authorize('procuring_entity'),
  procedureController.closeProcedure
);
router.post(
  '/:procedureId/unseal',
  authorize('procuring_entity'),
  procedureController.unsealIfDue
);
router.post(
  '/:procedureId/watch',
  authorize('supplier'),
  procedureController.toggleWatch
);
router.post(
  '/:procedureId/complements',
  authorize('procuring_entity'),
  procedureController.createComplement
);
router.get(
  '/:procedureId/complements',
  authorize('procuring_entity', 'supplier', 'admin'),
  procedureController.listProcedureComplements
);
router.put(
  '/:procedureId/espd',
  authorize('supplier'),
  procedureController.submitEspd
);
router.get(
  '/:procedureId/audit',
  authorize('procuring_entity', 'admin'),
  procedureController.listAuditForProcedure
);

module.exports = router;
