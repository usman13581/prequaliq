const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors, emailField } = require('../middleware/validate');
const orgInviteController = require('../controllers/orgInviteController');

router.get('/preview', orgInviteController.previewInvite);

router.use(authenticate);

const createInviteValidation = [
  emailField('email', 'Valid email is required'),
  body('membershipRole')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Invalid membership role'),
  handleValidationErrors
];

router.get(
  '/mine',
  authorize('procuring_entity', 'supplier'),
  orgInviteController.listMyInvites
);
router.get(
  '/members',
  authorize('procuring_entity', 'supplier'),
  orgInviteController.listMyMembers
);
router.post(
  '/',
  authorize('procuring_entity', 'supplier'),
  createInviteValidation,
  orgInviteController.createInvite
);
router.post(
  '/accept',
  authorize('procuring_entity', 'supplier'),
  orgInviteController.acceptInvite
);
router.delete(
  '/:inviteId',
  authorize('procuring_entity', 'supplier'),
  orgInviteController.revokeInvite
);

module.exports = router;
