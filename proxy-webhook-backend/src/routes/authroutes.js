'use strict';

const express = require('express');
const { signup, login } = require('../controllers/authcontroller');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { signupSchema, loginSchema } = require('../validators/schemas');

const router = express.Router();

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login',  authLimiter, validate(loginSchema),  login);

module.exports = router;
