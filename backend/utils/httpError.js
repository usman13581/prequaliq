const { isProduction } = require('./securityConfig');

/**
 * Log the real error; never return internal details to clients in production (rule 01).
 */
function sendServerError(res, error, clientMessage = 'Internal server error', status = 500) {
  if (error) {
    console.error(clientMessage, error.message || error);
    if (error.stack && !isProduction()) {
      console.error(error.stack);
    }
  }
  const body = { message: clientMessage };
  if (!isProduction() && error) {
    body.error = error.message || String(error);
  }
  return res.status(status).json(body);
}

module.exports = { sendServerError };
