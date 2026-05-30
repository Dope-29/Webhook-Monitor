'use strict';

const express = require('express');
const { signup, login } = require('../controllers/authcontroller');
const { forgotPassword, resetPassword, sendVerification, verifyEmail } = require('../controllers/passwordresetcontroller');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateJWT } = require('../middleware/auth');
const { signupSchema, loginSchema } = require('../validators/schemas');

const router = express.Router();

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login',  authLimiter, validate(loginSchema),  login);

// Password reset (public — token in body/query)
router.post('/forgot-password',  authLimiter, forgotPassword);
router.post('/reset-password',   authLimiter, resetPassword);

// Email verification (protected — must be logged in to request)
router.post('/send-verification', authenticateJWT, sendVerification);
router.get('/verify-email',       verifyEmail);

module.exports = router;
