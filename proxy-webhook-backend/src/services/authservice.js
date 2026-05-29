'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { getOrCreateCustomerDEK } = require('./encryptionservice');
const logger = require('./loggerservice');

// Use fewer rounds in test env so the suite runs fast
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 10 : 12;

function signToken(customerId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return jwt.sign({ customer_id: customerId }, secret, {
    expiresIn: '7d',
    issuer: 'hookwatch-api',
    audience: 'hookwatch-client',
  });
}

/**
 * Register a new customer.
 * - Checks for duplicate email (409)
 * - Hashes password with bcrypt
 * - Creates customer row
 * - Bootstraps envelope encryption (DEK creation)
 * - Returns signed JWT
 */
async function signup({ email, password, name }) {
  // Duplicate email check
  const existing = await db.query(
    'SELECT id FROM customers WHERE email = $1',
    [email]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Email already registered.');
    err.statusCode = 409;
    throw err;
  }

  const customerId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await db.query(
    'INSERT INTO customers (id, email, name, password_hash) VALUES ($1, $2, $3, $4)',
    [customerId, email, name, passwordHash]
  );

  // Initialize envelope encryption for this customer immediately after creation
  await getOrCreateCustomerDEK(customerId);

  logger.info('New customer registered', { customerId, email });

  return { token: signToken(customerId), customerId };
}

/**
 * Authenticate an existing customer.
 * - Generic 401 on both wrong email and wrong password (avoids user enumeration)
 * - Returns signed JWT
 */
async function login({ email, password }) {
  const result = await db.query(
    'SELECT id, password_hash FROM customers WHERE email = $1',
    [email]
  );

  // Always run bcrypt.compare even if user not found to prevent timing attacks
  const fakeHash = '$2b$12$invalidhashfortimingneutrality00000000000000000000000000';
  const storedHash = result.rows[0]?.password_hash || fakeHash;
  const valid = await bcrypt.compare(password, storedHash);

  if (result.rows.length === 0 || !valid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const customer = result.rows[0];
  logger.info('Customer login successful', { customerId: customer.id });

  return { token: signToken(customer.id), customerId: customer.id };
}

module.exports = { signup, login, signToken };
