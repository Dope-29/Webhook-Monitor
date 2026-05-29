'use strict';

const authService = require('../services/authservice');

/**
 * POST /api/auth/signup
 * Body validated upstream by Joi. Calls authService.signup and returns JWT.
 */
async function signup(req, res, next) {
  try {
    const { token, customerId } = await authService.signup(req.body);
    res.status(201).json({ token, customer_id: customerId });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body validated upstream by Joi. Calls authService.login and returns JWT.
 */
async function login(req, res, next) {
  try {
    const { token, customerId } = await authService.login(req.body);
    res.status(200).json({ token, customer_id: customerId });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login };
