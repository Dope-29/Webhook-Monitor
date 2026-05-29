'use strict';

const logger = require('../services/loggerservice');

/**
 * HTTP Request Logger Middleware
 *
 * SECURITY: Logs only method, path, ip, status, duration, and sanitized headers.
 * NEVER logs req.body — that would expose webhook payloads and passwords.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    logger.http('HTTP', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      headers: logger.sanitizeHeaders(req.headers),
    });
  });

  next();
}

module.exports = { requestLogger };
