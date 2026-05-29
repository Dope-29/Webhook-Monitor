'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json, errors, colorize, simple } = format;

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

/**
 * Strip authorization / session headers before logging.
 * SECURITY RULE: We never log raw auth tokens.
 */
function sanitizeHeaders(headers = {}) {
  const sanitized = { ...headers };
  SENSITIVE_HEADERS.forEach((key) => {
    if (sanitized[key]) sanitized[key] = '[REDACTED]';
  });
  return sanitized;
}

const isDev = process.env.NODE_ENV !== 'production';

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new transports.Console({
      format: isDev
        ? combine(colorize(), simple())
        : combine(timestamp(), json()),
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json()),
    }),
  ],
  exitOnError: false,
});

// Attach helper so middleware can call logger.sanitizeHeaders(req.headers)
logger.sanitizeHeaders = sanitizeHeaders;

module.exports = logger;
