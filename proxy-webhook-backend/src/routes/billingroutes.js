'use strict';

const express = require('express');
const { getStatus, createCheckout, createPortal, handleWebhook } = require('../controllers/billingcontroller');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Stripe webhook needs raw body — mount BEFORE json() parses it
// We handle this by storing req.rawBody in a middleware in app.js

// Public — Stripe webhook (no JWT, uses stripe-signature header)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body; // raw Buffer
  next();
}, handleWebhook);

// Protected
router.use(authenticateJWT);
router.get('/status',   getStatus);
router.post('/checkout', createCheckout);
router.post('/portal',   createPortal);

module.exports = router;
