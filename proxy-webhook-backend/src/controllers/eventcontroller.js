'use strict';

const db = require('../config/database');
const { getDEKByKeyId, decryptPayload } = require('../services/encryptionservice');
const { forwardWebhook } = require('../services/forwardingservice');

/**
 * GET /api/events
 * Paginated list — returns metadata only (no payload decryption).
 * Scoped strictly to the authenticated customer.
 */
async function list(req, res, next) {
  try {
    const page  = Math.max(parseInt(req.query.page  || '1',  10), 1);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT id, pipeline_id, status_code, latency_ms, created_at, expires_at
         FROM webhooks
         WHERE customer_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.customer_id, limit, offset]
      ),
      db.query(
        'SELECT COUNT(*) FROM webhooks WHERE customer_id = $1',
        [req.user.customer_id]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      events: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/events/:id
 * Fetches a single event and decrypts its payload for the UI.
 * DEK is never returned — only the decrypted plaintext payload.
 */
async function getById(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, pipeline_id, encrypted_payload, iv, auth_tag, key_id,
              status_code, latency_ms, created_at, expires_at
       FROM webhooks
       WHERE id = $1 AND customer_id = $2`,
      [req.params.id, req.user.customer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const row = result.rows[0];

    // Decrypt in memory — DEK is released to GC after this block
    const dek = await getDEKByKeyId(row.key_id);
    const rawPayload = decryptPayload(row.encrypted_payload, row.iv, row.auth_tag, dek);

    let payload;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      payload = rawPayload;
    }

    res.json({
      event: {
        id: row.id,
        pipeline_id: row.pipeline_id,
        payload,
        status_code: row.status_code,
        latency_ms: row.latency_ms,
        created_at: row.created_at,
        expires_at: row.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/events/:id/replay
 * Manually re-triggers forwarding of a stored event.
 * Runs forwarding as a background task — responds 202 Accepted immediately.
 */
async function replay(req, res, next) {
  try {
    // Verify event ownership and get its pipeline
    const result = await db.query(
      `SELECT w.id, p.id AS pipeline_id, p.destination_url, p.proxy_url, p.timeout
       FROM webhooks w
       JOIN pipelines p ON p.id = w.pipeline_id
       WHERE w.id = $1 AND w.customer_id = $2`,
      [req.params.id, req.user.customer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const row = result.rows[0];
    const pipeline = {
      id: row.pipeline_id,
      destination_url: row.destination_url,
      proxy_url: row.proxy_url,
      timeout: row.timeout,
    };

    // Fire-and-forget — do NOT await
    setImmediate(() => forwardWebhook(row.id, pipeline));

    res.status(202).json({ message: 'Replay initiated.', event_id: row.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, replay };
