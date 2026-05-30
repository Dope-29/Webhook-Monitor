'use strict';

/**
 * API Key Controller
 *
 * Keys are generated as `hw_` + 32 random bytes (hex) = 67 chars total.
 * We store only a SHA-256 hash in the DB — the raw key is shown ONCE at creation.
 *
 * Keys can be used in the Authorization header:
 *   Authorization: Bearer hw_<key>
 *
 * The auth middleware checks for `hw_` prefix and routes to key lookup instead of JWT.
 */

const crypto  = require('crypto');
const db      = require('../config/database');
const logger  = require('../services/loggerservice');
const { audit } = require('../services/auditservice');

const MAX_KEYS = 10;

// ── GET /api/api-keys ──────────────────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, name, key_prefix, last_used_at, created_at, expires_at, revoked
       FROM api_keys
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [req.user.customer_id]
    );
    res.json({ keys: rows });
  } catch (err) { next(err); }
}

// ── POST /api/api-keys ─────────────────────────────────────────────────────────
async function create(req, res, next) {
  try {
    const { name, expires_days } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(422).json({ error: 'Key name is required.' });
    }
    if (name.length > 100) {
      return res.status(422).json({ error: 'Name must be under 100 characters.' });
    }

    // Enforce key limit
    const { rows: existing } = await db.query(
      'SELECT COUNT(*) AS cnt FROM api_keys WHERE customer_id = $1 AND revoked = false',
      [req.user.customer_id]
    );
    if (parseInt(existing[0].cnt) >= MAX_KEYS) {
      return res.status(429).json({ error: `Maximum of ${MAX_KEYS} active API keys allowed.` });
    }

    // Generate key
    const raw    = 'hw_' + crypto.randomBytes(32).toString('hex'); // 67 chars
    const hash   = crypto.createHash('sha256').update(raw).digest('hex');
    const prefix = raw.slice(0, 10) + '...'; // "hw_xxxxxxx..."

    const expiresAt = expires_days
      ? new Date(Date.now() + parseInt(expires_days) * 86400 * 1000)
      : null;

    const { rows } = await db.query(
      `INSERT INTO api_keys (customer_id, name, key_hash, key_prefix, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, key_prefix, created_at, expires_at, revoked`,
      [req.user.customer_id, name.trim(), hash, prefix, expiresAt]
    );

    logger.info('API key created', { customerId: req.user.customer_id, keyId: rows[0].id });
    audit(req.user.customer_id, 'api_key_created', { keyId: rows[0].id, name: name.trim() });

    // Return raw key ONCE — never stored
    res.status(201).json({ key: rows[0], raw_key: raw });
  } catch (err) { next(err); }
}

// ── DELETE /api/api-keys/:id ───────────────────────────────────────────────────
async function revoke(req, res, next) {
  try {
    const { rowCount } = await db.query(
      'UPDATE api_keys SET revoked = true, revoked_at = NOW() WHERE id = $1 AND customer_id = $2',
      [req.params.id, req.user.customer_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Key not found.' });
    logger.info('API key revoked', { customerId: req.user.customer_id, keyId: req.params.id });
    audit(req.user.customer_id, 'api_key_revoked', { keyId: req.params.id });
    res.json({ revoked: true });
  } catch (err) { next(err); }
}

// ── Lookup by raw key (used in auth middleware) ────────────────────────────────
async function findByRawKey(rawKey) {
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const { rows } = await db.query(
    `SELECT ak.customer_id, ak.id AS key_id, ak.revoked, ak.expires_at,
            c.email, c.plan
     FROM   api_keys ak
     JOIN   customers c ON c.id = ak.customer_id
     WHERE  ak.key_hash = $1`,
    [hash]
  );
  if (!rows.length) return null;
  const row = rows[0];
  if (row.revoked) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

  // Update last_used_at asynchronously (non-blocking)
  db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.key_id]).catch(() => {});

  return { customer_id: row.customer_id, email: row.email, plan: row.plan };
}

module.exports = { list, create, revoke, findByRawKey };
