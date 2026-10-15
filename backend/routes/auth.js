const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { profilePictureUpload } = require('../controllers/documentController');
const { handleValidationErrors, emailField } = require('../middleware/validate');

// Validation middleware
const registerValidation = [
  emailField('email', 'Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'procuring_entity', 'supplier']),
  handleValidationErrors
];

const loginValidation = [
  emailField('email', 'Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const resetPasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
];

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/profile', authenticate, authController.getProfile);
router.put('/reset-password', authenticate, resetPasswordValidation, authController.resetPassword);
router.put('/profile-picture', authenticate, (req, res, next) => {
  profilePictureUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, authController.uploadProfilePicture);
router.delete('/profile-picture', authenticate, authController.removeProfilePicture);

module.exports = router;
