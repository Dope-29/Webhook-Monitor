'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT + API Key Authentication Middleware
 *
 * Supports two token formats:
 *   1. JWT token:   Authorization: Bearer eyJ...
 *   2. API key:     Authorization: Bearer hw_<hex>
 *
 * On success: injects req.user = { customer_id, email?, plan? }
 * Returns 401 on missing/expired/invalid credentials.
 */
async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Provide a valid Authorization: Bearer <token> header.',
    });
  }

  const token = authHeader.split(' ')[1];

  // API key path
  if (token.startsWith('hw_')) {
    try {
      const { findByRawKey } = require('../controllers/apikeycontroller');
      const user = await findByRawKey(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid or revoked API key.' });
      }
      req.user = user;
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'API key lookup failed.' });
    }
  }

  // JWT path
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'hookwatch-api',
      audience: 'hookwatch-client',
    });
    // If JWT contains workspace_owner_id (team member), scope data to the owner's workspace
    req.user = {
      customer_id: decoded.workspace_owner_id || decoded.customer_id,
      own_customer_id: decoded.customer_id,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

module.exports = { authenticateJWT };
