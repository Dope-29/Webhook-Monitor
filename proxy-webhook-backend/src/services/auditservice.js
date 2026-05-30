'use strict';

/**
 * Audit Service — writes immutable security-relevant events to audit_logs table.
 *
 * Designed to be fire-and-forget from controllers.
 * Never throws — if DB write fails we log the error and continue.
 *
 * Categories:
 *   auth        → login, logout, password_reset, email_verified, signup
 *   api_key     → api_key_created, api_key_revoked
 *   team        → member_invited, member_joined, member_removed
 *   billing     → plan_upgraded, plan_cancelled
 *   pipeline    → pipeline_created, pipeline_deleted, pipeline_paused
 *   data        → events_deleted
 */

const db     = require('../config/database');
const logger = require('./loggerservice');

/**
 * @param {string} customerId  — customer who performed the action
 * @param {string} action      — snake_case event label
 * @param {object} [details]   — optional JSON-serialisable context (no secrets!)
 */
async function audit(customerId, action, details = {}) {
  if (!customerId || !action) return;
  try {
    await db.query(
      `INSERT INTO audit_logs (customer_id, action, details) VALUES ($1, $2, $3)`,
      [customerId, action, JSON.stringify(details)]
    );
  } catch (err) {
    // Non-fatal — emit warning but never block the request
    logger.warn('audit_log write failed', { customerId, action, error: err.message });
  }
}

module.exports = { audit };
