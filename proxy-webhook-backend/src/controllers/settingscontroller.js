'use strict';

const db = require('../config/database');

/**
 * GET /api/settings
 * Returns the customer's current retention policy and account info.
 */
async function getSettings(req, res, next) {
  try {
    const result = await db.query(
      'SELECT id, email, name, default_retention_days, created_at FROM customers WHERE id = $1',
      [req.user.customer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json({ settings: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/settings/retention
 * Updates the account-wide default retention policy.
 */
async function updateRetention(req, res, next) {
  try {
    const { default_retention_days } = req.body;

    const result = await db.query(
      `UPDATE customers SET default_retention_days = $1 WHERE id = $2
       RETURNING id, email, name, default_retention_days`,
      [default_retention_days, req.user.customer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json({ settings: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateRetention };
