const { body, validationResult } = require('express-validator');
const { isAllowedEmail } = require('../utils/emailValidation');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg || 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/** express-validator chain: accept standard emails + local E2E TLDs (*.e2e) */
function emailField(field = 'email', message = 'Valid email is required') {
  return body(field)
    .trim()
    .notEmpty()
    .withMessage(message)
    .custom((value) => {
      if (!isAllowedEmail(value)) throw new Error(message);
      return true;
    })
    .normalizeEmail({ gmail_remove_dots: false });
}

function optionalEmailField(field = 'email', message = 'Invalid email') {
  return body(field)
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((value) => {
      if (!isAllowedEmail(value)) throw new Error(message);
      return true;
    })
    .normalizeEmail({ gmail_remove_dots: false });
}

module.exports = { handleValidationErrors, emailField, optionalEmailField, isAllowedEmail };
