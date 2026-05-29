'use strict';

const logger = require('../services/loggerservice');

/**
 * Global Express Error Handler
 *
 * Must be registered LAST in app.js (after all routes).
 * Sanitizes stack traces in production to avoid information disclosure.
 */
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    statusCode,
  });

  res.status(statusCode).json({
    error: isProduction && statusCode === 500
      ? 'An internal server error occurred.'
      : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = { globalErrorHandler };
