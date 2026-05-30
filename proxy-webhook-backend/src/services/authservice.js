'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const xss = require('xss');
const db = require('../config/database');
const { getOrCreateCustomerDEK } = require('./encryptionservice');
const logger = require('./loggerservice');

// Lockout policy: 5 failures → locked for 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/** Strip HTML/script tags from a string value */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return xss(str.trim());
}

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
  const cleanEmail = sanitize(email).toLowerCase();
  const cleanName  = sanitize(name);

  // Duplicate email check
  const existing = await db.query(
    'SELECT id FROM customers WHERE email = $1',
    [cleanEmail]
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
    [customerId, cleanEmail, cleanName, passwordHash]
  );

  // Initialize envelope encryption for this customer immediately after creation
  await getOrCreateCustomerDEK(customerId);

  logger.info('New customer registered', { customerId, email });

  return { token: signToken(customerId), customerId };
}

/**
 * Authenticate an existing customer.
 * - Generic 401 on both wrong email and wrong password (avoids user enumeration)
 * - Brute-force lockout after MAX_ATTEMPTS failures (15-minute window)
 * - Returns signed JWT
 */
async function login({ email, password }) {
  const cleanEmail = sanitize(email).toLowerCase();

  const result = await db.query(
    'SELECT id, password_hash, failed_login_attempts, locked_until FROM customers WHERE email = $1',
    [cleanEmail]
  );

  // Always run bcrypt.compare even if user not found to prevent timing attacks
  const fakeHash = '$2b$12$invalidhashfortimingneutrality00000000000000000000000000';
  const customer = result.rows[0] || null;
  const storedHash = customer?.password_hash || fakeHash;

  // Check lockout before doing any work
  if (customer?.locked_until && new Date(customer.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(customer.locked_until) - new Date()) / 60000);
    const err = new Error(`Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`);
    err.statusCode = 429;
    err.code = 'ACCOUNT_LOCKED';
    throw err;
  }

  const valid = await bcrypt.compare(password, storedHash);

  if (!customer || !valid) {
    // Increment failure counter if the account exists
    if (customer) {
      const newAttempts = (customer.failed_login_attempts || 0) + 1;
      const lockUntil = newAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;
      await db.query(
        'UPDATE customers SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [newAttempts, lockUntil, customer.id]
      );
      if (lockUntil) {
        logger.warn('Account locked due to too many failed attempts', { customerId: customer.id });
      }
    }
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Successful login — reset failure counter
  await db.query(
    'UPDATE customers SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [customer.id]
  );

  logger.info('Customer login successful', { customerId: customer.id });
  return { token: signToken(customer.id), customerId: customer.id };
}

module.exports = { signup, login, signToken };
