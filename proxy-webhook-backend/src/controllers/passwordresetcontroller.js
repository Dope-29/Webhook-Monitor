'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { sendPasswordReset, sendEmailVerification } = require('../services/emailservice');
const { signToken } = require('../services/authservice');
const logger = require('../services/loggerservice');

const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 10 : 12;
const RESET_EXPIRY_MS  = 60 * 60 * 1000;        // 1 hour
const VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000;   // 24 hours

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(422).json({ error: 'Email is required.' });

    const result = await db.query(
      'SELECT id FROM customers WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Always return 200 to avoid user enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });
    }

    const customerId = result.rows[0].id;
    const rawToken   = crypto.randomBytes(32).toString('hex');
    const tokenHash  = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt  = new Date(Date.now() + RESET_EXPIRY_MS);

    // Invalidate any previous unused tokens
    await db.query(
      'UPDATE password_resets SET used_at = NOW() WHERE customer_id = $1 AND used_at IS NULL',
      [customerId]
    );

    await db.query(
      'INSERT INTO password_resets (customer_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [customerId, tokenHash, expiresAt]
    );

    await sendPasswordReset(email, rawToken);
    logger.info('Password reset email sent', { customerId });

    res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(422).json({ error: 'Token and new password are required.' });
    }
    if (password.length < 8) {
      return res.status(422).json({ error: 'Password must be at least 8 characters.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      `SELECT id, customer_id FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.', code: 'INVALID_TOKEN' });
    }

    const { id: resetId, customer_id: customerId } = result.rows[0];
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db.query('UPDATE customers SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2', [passwordHash, customerId]);
    await db.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [resetId]);

    logger.info('Password reset successful', { customerId });
    const token_ = signToken(customerId);
    res.json({ message: 'Password reset successfully.', token: token_, customer_id: customerId });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/auth/send-verification ─────────────────────────────────────────
async function sendVerification(req, res, next) {
  try {
    const customerId = req.user.customer_id;
    const result = await db.query('SELECT email, email_verified FROM customers WHERE id = $1', [customerId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found.' });
    if (result.rows[0].email_verified) return res.json({ message: 'Email already verified.' });

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + VERIFY_EXPIRY_MS);

    // Reuse password_resets table with action prefix stored in token_hash comment
    // Actually store in a separate verify column on customers for simplicity
    await db.query(
      'UPDATE customers SET oauth_id = COALESCE(oauth_id, $1) WHERE id = $2',
      // We'll store the verify token in a dedicated column instead — see below
      [null, customerId]
    );
    // Store hashed verify token on customer row
    await db.query(
      'UPDATE customers SET verify_token_hash = $1, verify_token_expires = $2 WHERE id = $3',
      [tokenHash, expiresAt, customerId]
    );

    await sendEmailVerification(result.rows[0].email, rawToken);
    res.json({ message: 'Verification email sent.' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/auth/verify-email?token=... ─────────────────────────────────────
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(422).json({ error: 'Token is required.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await db.query(
      `SELECT id FROM customers
       WHERE verify_token_hash = $1 AND verify_token_expires > NOW() AND email_verified = false`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Verification link is invalid or has expired.', code: 'INVALID_TOKEN' });
    }

    await db.query(
      'UPDATE customers SET email_verified = true, verify_token_hash = NULL, verify_token_expires = NULL WHERE id = $1',
      [result.rows[0].id]
    );

    logger.info('Email verified', { customerId: result.rows[0].id });
    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { forgotPassword, resetPassword, sendVerification, verifyEmail };
