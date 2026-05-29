'use strict';

/**
 * Webhook Ingest Controller
 *
 * Public endpoint — no JWT required.
 * Flow:
 *   1. Validate pipelineId exists
 *   2. Encrypt payload with customer's DEK
 *   3. Persist encrypted record to DB
 *   4. Respond 200 immediately (< ~30ms)
 *   5. Trigger forwarding in background (setImmediate — fire-and-forget)
 */

const db = require('../config/database');
const { getOrCreateCustomerDEK, encryptPayload } = require('../services/encryptionservice');
const { forwardWebhook } = require('../services/forwardingservice');
const logger = require('../services/loggerservice');

async function ingest(req, res, next) {
  try {
    const { pipelineId } = req.params;

    // Look up pipeline — must exist and be active
    const pipelineResult = await db.query(
      `SELECT id, customer_id, destination_url, proxy_url, timeout, retention_days
       FROM pipelines WHERE id = $1`,
      [pipelineId]
    );

    if (pipelineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found.' });
    }

    const pipeline = pipelineResult.rows[0];

    // Serialize the raw incoming body
    const rawPayload = JSON.stringify(req.body);

    // Get or bootstrap this customer's DEK (decrypted in memory only)
    const { keyId, dek } = await getOrCreateCustomerDEK(pipeline.customer_id);

    // Encrypt
    const { ciphertext, iv, authTag } = encryptPayload(rawPayload, dek);

    // Compute expiry based on pipeline retention policy
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pipeline.retention_days);

    // Persist encrypted event
    const insertResult = await db.query(
      `INSERT INTO webhooks
         (customer_id, pipeline_id, encrypted_payload, iv, auth_tag, key_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [pipeline.customer_id, pipelineId, ciphertext, iv, authTag, keyId, expiresAt]
    );

    const webhookId = insertResult.rows[0].id;

    // ── Respond immediately ──────────────────────────────────────────────────
    res.status(200).json({ received: true, event_id: webhookId });

    // ── Fire-and-forget background forwarding ────────────────────────────────
    setImmediate(() => {
      forwardWebhook(webhookId, pipeline).catch((err) => {
        logger.error('Background forwardWebhook crashed', { webhookId, error: err.message });
      });
    });

  } catch (err) {
    next(err);
  }
}

module.exports = { ingest };
