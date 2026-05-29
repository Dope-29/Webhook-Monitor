'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Auth Rate Limiter: 10 requests per 15 minutes per IP
 * Applied to POST /api/auth/signup and POST /api/auth/login
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP. Please try again in 15 minutes.',
  },
});

/**
 * Webhook Ingest Rate Limiter: 100 requests per minute per IP
 * Applied to POST /webhook/:pipelineId
 */
const webhookIngestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many webhook requests. Please slow down.',
  },
});

module.exports = { authLimiter, webhookIngestLimiter };
