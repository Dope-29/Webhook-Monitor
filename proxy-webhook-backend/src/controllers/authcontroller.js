'use strict';

const authService = require('../services/authservice');
const { audit }   = require('../services/auditservice');

async function signup(req, res, next) {
  try {
    const { token, customerId } = await authService.signup(req.body);
    audit(customerId, 'signup', { email: req.body.email });
    res.status(201).json({ token, customer_id: customerId });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { token, customerId } = await authService.login(req.body);
    audit(customerId, 'login', { ip: req.ip });
    res.status(200).json({ token, customer_id: customerId });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login };
