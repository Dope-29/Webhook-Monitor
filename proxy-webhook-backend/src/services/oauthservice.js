'use strict';

/**
 * OAuth Service
 *
 * Handles "find or create" logic for OAuth logins.
 * Called after passport successfully verifies a provider token.
 *
 * Flow:
 *  1. Look up customer by (oauth_provider, oauth_id)
 *  2. If found → return existing customer
 *  3. If not found but email matches → link OAuth to existing account
 *  4. If completely new → create customer row + bootstrap DEK
 */

const crypto = require('crypto');
const db = require('../config/database');
const { getOrCreateCustomerDEK } = require('./encryptionservice');
const { signToken } = require('./authservice');
const logger = require('./loggerservice');

/**
 * @param {object} profile
 * @param {string} profile.provider  - 'github' | 'google'
 * @param {string} profile.id        - provider's user ID
 * @param {string} profile.email
 * @param {string} profile.name
 * @param {string} [profile.avatarUrl]
 * @returns {{ token: string, customerId: string, isNew: boolean }}
 */
async function findOrCreateOAuthCustomer({ provider, id: oauthId, email, name, avatarUrl }) {
  // 1. Existing OAuth link
  const byOAuth = await db.query(
    'SELECT id FROM customers WHERE oauth_provider = $1 AND oauth_id = $2',
    [provider, oauthId]
  );
  if (byOAuth.rows.length > 0) {
    const customerId = byOAuth.rows[0].id;
    logger.info('OAuth login — existing link', { provider, customerId });
    return { token: signToken(customerId), customerId, isNew: false };
  }

  // 2. Existing account with same email → link it
  if (email) {
    const byEmail = await db.query(
      'SELECT id FROM customers WHERE email = $1',
      [email]
    );
    if (byEmail.rows.length > 0) {
      const customerId = byEmail.rows[0].id;
      await db.query(
        'UPDATE customers SET oauth_provider = $1, oauth_id = $2, avatar_url = $3 WHERE id = $4',
        [provider, oauthId, avatarUrl || null, customerId]
      );
      logger.info('OAuth login — linked to existing email account', { provider, customerId });
      return { token: signToken(customerId), customerId, isNew: false };
    }
  }

  // 3. Brand new customer
  const customerId = crypto.randomUUID();
  const displayName = name || email?.split('@')[0] || 'User';

  await db.query(
    `INSERT INTO customers (id, email, name, password_hash, oauth_provider, oauth_id, avatar_url)
     VALUES ($1, $2, $3, NULL, $4, $5, $6)`,
    [customerId, email || null, displayName, provider, oauthId, avatarUrl || null]
  );

  await getOrCreateCustomerDEK(customerId);

  logger.info('OAuth login — new customer created', { provider, customerId });
  return { token: signToken(customerId), customerId, isNew: true };
}

module.exports = { findOrCreateOAuthCustomer };
