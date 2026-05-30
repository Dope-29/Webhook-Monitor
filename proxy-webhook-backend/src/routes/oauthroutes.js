'use strict';

/**
 * OAuth Routes
 *
 * GET /api/auth/github          → redirects to GitHub
 * GET /api/auth/github/callback → handles GitHub callback
 * GET /api/auth/google          → redirects to Google
 * GET /api/auth/google/callback → handles Google callback
 *
 * On success: redirect to FRONTEND_BASE_URL/oauth-callback?token=...&customer_id=...
 * On failure: redirect to FRONTEND_BASE_URL/login?error=oauth_failed
 */

const express = require('express');
const passport = require('../config/passport');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

function successRedirect(res, { token, customerId }) {
  const params = new URLSearchParams({ token, customer_id: customerId });
  return res.redirect(`${FRONTEND_URL}/oauth-callback?${params.toString()}`);
}

function failureRedirect(res) {
  return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
}

// ── GitHub ────────────────────────────────────────────────────────────────────
router.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(501).json({ error: 'GitHub OAuth is not configured on this server.' });
  }
  passport.authenticate('github', { session: false })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user) => {
    if (err || !user) return failureRedirect(res);
    return successRedirect(res, user);
  })(req, res, next);
});

// ── Google ────────────────────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth is not configured on this server.' });
  }
  passport.authenticate('google', { session: false })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) return failureRedirect(res);
    return successRedirect(res, user);
  })(req, res, next);
});

module.exports = router;
