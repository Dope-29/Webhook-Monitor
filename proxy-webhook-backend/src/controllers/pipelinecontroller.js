'use strict';

const db = require('../config/database');

/**
 * GET /api/pipelines
 * Returns all pipelines scoped to the authenticated customer.
 */
async function list(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, name, destination_url, proxy_url, timeout, provider,
              retention_days, paused, created_at
       FROM pipelines WHERE customer_id = $1 ORDER BY created_at DESC`,
      [req.user.customer_id]
    );
    res.json({ pipelines: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pipelines
 * Creates a new pipeline. customer_id always comes from JWT, not body.
 */
async function create(req, res, next) {
  try {
    const { name, destination_url, proxy_url, timeout, provider, retention_days } = req.body;

    const result = await db.query(
      `INSERT INTO pipelines (customer_id, name, destination_url, proxy_url, timeout, provider, retention_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.customer_id, name, destination_url, proxy_url, timeout, provider, retention_days]
    );

    res.status(201).json({ pipeline: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/pipelines/:id
 * Partial update — only provided fields are updated.
 * Verifies ownership before mutating.
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;

    // Ownership check — prevents cross-customer mutation
    const existing = await db.query(
      'SELECT id FROM pipelines WHERE id = $1 AND customer_id = $2',
      [id, req.user.customer_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found.' });
    }

    // Build dynamic SET clause from provided fields only
    const ALLOWED_FIELDS = ['name', 'destination_url', 'proxy_url', 'timeout', 'provider', 'retention_days', 'paused'];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = $${idx++}`);
        values.push(req.body[field]);
      }
    }

    values.push(id);
    const result = await db.query(
      `UPDATE pipelines SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json({ pipeline: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/pipelines/:id
 * Hard delete — cascades to webhooks via FK.
 * Returns 204 No Content on success, 404 if not owned.
 */
async function remove(req, res, next) {
  try {
    const result = await db.query(
      'DELETE FROM pipelines WHERE id = $1 AND customer_id = $2 RETURNING id',
      [req.params.id, req.user.customer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found.' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
