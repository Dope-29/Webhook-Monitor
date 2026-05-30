'use strict';

/**
 * Passport OAuth Strategy Configuration
 *
 * Strategies are only registered if their env vars are present.
 * This lets the app run in dev/test without OAuth credentials configured.
 *
 * Required env vars:
 *   GitHub  : GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 *   Google  : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   Both    : BACKEND_BASE_URL (e.g. http://localhost:5000)
 */

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateOAuthCustomer } = require('../services/oauthservice');
const logger = require('../services/loggerservice');

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:5000';

function normalizeProfile(provider, profile) {
  const emails = profile.emails || [];
  const email = emails[0]?.value || null;
  const photos = profile.photos || [];
  const avatarUrl = photos[0]?.value || null;

  const name =
    profile.displayName ||
    (profile.name ? `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim() : null) ||
    profile.username ||
    null;

  return { provider, id: profile.id, email, name, avatarUrl };
}

// ── GitHub ──────────────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/github/callback`,
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const normalized = normalizeProfile('github', profile);
          const result = await findOrCreateOAuthCustomer(normalized);
          done(null, result);
        } catch (err) {
          logger.error('GitHub OAuth strategy error', { error: err.message });
          done(err);
        }
      }
    )
  );
  logger.info('GitHub OAuth strategy registered');
} else {
  logger.warn('GitHub OAuth not configured — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
}

// ── Google ───────────────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const normalized = normalizeProfile('google', profile);
          const result = await findOrCreateOAuthCustomer(normalized);
          done(null, result);
        } catch (err) {
          logger.error('Google OAuth strategy error', { error: err.message });
          done(err);
        }
      }
    )
  );
  logger.info('Google OAuth strategy registered');
} else {
  logger.warn('Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
}

module.exports = passport;
