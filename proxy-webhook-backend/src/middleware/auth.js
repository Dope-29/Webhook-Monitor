'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 *
 * Extracts the Bearer token from Authorization header.
 * Injects req.user = { customer_id } on success.
 * Returns 401 on missing, expired, or invalid tokens.
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Provide a valid Authorization: Bearer <token> header.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'hookwatch-api',
      audience: 'hookwatch-client',
    });
    req.user = { customer_id: decoded.customer_id };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

module.exports = { authenticateJWT };
