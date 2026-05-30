'use strict';

/**
 * Alert Rules Controller
 *
 * Alert rule types:
 *   - failure_rate  : trigger when error rate exceeds threshold% over last N minutes
 *   - consecutive_failures : trigger when N consecutive deliveries fail
 *   - no_events     : trigger when no events received for N minutes (pipeline goes silent)
 *   - latency       : trigger when avg latency exceeds threshold ms over last N minutes
 *
 * Notification channels:
 *   - email  : plain nodemailer email
 *   - slack  : Slack incoming webhook URL
 */

const db     = require('../config/database');
const logger = require('../services/loggerservice');

// ── Helper ────────────────────────────────────────────────────────────────────
function owned(req) { return req.user.customer_id; }

// ── GET /api/alerts/rules ─────────────────────────────────────────────────────
async function listRules(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.pipeline_id, p.name AS pipeline_name,
              r.rule_type, r.threshold, r.window_minutes, r.channel_id,
              c.channel_type, c.label AS channel_label,
              r.enabled, r.created_at
       FROM   alert_rules r
       LEFT JOIN alert_channels c ON c.id = r.channel_id
       LEFT JOIN pipelines       p ON p.id = r.pipeline_id
       WHERE  r.customer_id = $1
       ORDER BY r.created_at DESC`,
      [owned(req)]
    );
    res.json({ rules: rows });
  } catch (err) { next(err); }
}

// ── POST /api/alerts/rules ────────────────────────────────────────────────────
async function createRule(req, res, next) {
  try {
    const { pipeline_id, rule_type, threshold, window_minutes, channel_id } = req.body;

    const validTypes = ['failure_rate', 'consecutive_failures', 'no_events', 'latency'];
    if (!validTypes.includes(rule_type)) {
      return res.status(422).json({ error: `Invalid rule_type. One of: ${validTypes.join(', ')}` });
    }
    if (!pipeline_id) return res.status(422).json({ error: 'pipeline_id is required.' });
    if (threshold == null || window_minutes == null) {
      return res.status(422).json({ error: 'threshold and window_minutes are required.' });
    }

    // Verify pipeline belongs to customer
    const pipe = await db.query(
      'SELECT id FROM pipelines WHERE id = $1 AND customer_id = $2',
      [pipeline_id, owned(req)]
    );
    if (!pipe.rows.length) return res.status(404).json({ error: 'Pipeline not found.' });

    // Verify channel belongs to customer (if provided)
    if (channel_id) {
      const ch = await db.query(
        'SELECT id FROM alert_channels WHERE id = $1 AND customer_id = $2',
        [channel_id, owned(req)]
      );
      if (!ch.rows.length) return res.status(404).json({ error: 'Channel not found.' });
    }

    const { rows } = await db.query(
      `INSERT INTO alert_rules (customer_id, pipeline_id, rule_type, threshold, window_minutes, channel_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [owned(req), pipeline_id, rule_type, threshold, window_minutes, channel_id || null]
    );
    res.status(201).json({ rule: rows[0] });
  } catch (err) { next(err); }
}

// ── PUT /api/alerts/rules/:id ─────────────────────────────────────────────────
async function updateRule(req, res, next) {
  try {
    const { threshold, window_minutes, channel_id, enabled } = req.body;
    const { rows } = await db.query(
      `UPDATE alert_rules
       SET threshold      = COALESCE($1, threshold),
           window_minutes = COALESCE($2, window_minutes),
           channel_id     = COALESCE($3, channel_id),
           enabled        = COALESCE($4, enabled)
       WHERE id = $5 AND customer_id = $6
       RETURNING *`,
      [threshold, window_minutes, channel_id, enabled, req.params.id, owned(req)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Rule not found.' });
    res.json({ rule: rows[0] });
  } catch (err) { next(err); }
}

// ── DELETE /api/alerts/rules/:id ──────────────────────────────────────────────
async function deleteRule(req, res, next) {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM alert_rules WHERE id = $1 AND customer_id = $2',
      [req.params.id, owned(req)]
    );
    if (!rowCount) return res.status(404).json({ error: 'Rule not found.' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
}

// ── GET /api/alerts/channels ──────────────────────────────────────────────────
async function listChannels(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT id, channel_type, label, config_redacted, created_at FROM alert_channels WHERE customer_id = $1 ORDER BY created_at DESC',
      [owned(req)]
    );
    res.json({ channels: rows });
  } catch (err) { next(err); }
}

// ── POST /api/alerts/channels ─────────────────────────────────────────────────
async function createChannel(req, res, next) {
  try {
    const { channel_type, label, config } = req.body;
    if (!['email', 'slack'].includes(channel_type)) {
      return res.status(422).json({ error: 'channel_type must be email or slack.' });
    }
    if (!label) return res.status(422).json({ error: 'label is required.' });
    if (!config) return res.status(422).json({ error: 'config is required.' });

    // Validate config shape
    if (channel_type === 'email' && !config.address) {
      return res.status(422).json({ error: 'config.address required for email channel.' });
    }
    if (channel_type === 'slack' && !config.webhook_url) {
      return res.status(422).json({ error: 'config.webhook_url required for slack channel.' });
    }

    // Store redacted version for display (mask everything except first few chars)
    const redacted = channel_type === 'email'
      ? { address: config.address }
      : { webhook_url: config.webhook_url.replace(/\/[^/]+$/, '/***') };

    const { rows } = await db.query(
      `INSERT INTO alert_channels (customer_id, channel_type, label, config, config_redacted)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, channel_type, label, config_redacted, created_at`,
      [owned(req), channel_type, label, JSON.stringify(config), JSON.stringify(redacted)]
    );
    res.status(201).json({ channel: rows[0] });
  } catch (err) { next(err); }
}

// ── DELETE /api/alerts/channels/:id ──────────────────────────────────────────
async function deleteChannel(req, res, next) {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM alert_channels WHERE id = $1 AND customer_id = $2',
      [req.params.id, owned(req)]
    );
    if (!rowCount) return res.status(404).json({ error: 'Channel not found.' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
}

// ── GET /api/alerts/history ───────────────────────────────────────────────────
async function listHistory(req, res, next) {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await db.query(
      `SELECT h.id, h.rule_id, h.pipeline_id, p.name AS pipeline_name,
              h.rule_type, h.message, h.fired_at, h.resolved_at, h.acknowledged
       FROM   alert_history h
       LEFT JOIN pipelines p ON p.id = h.pipeline_id
       WHERE  h.customer_id = $1
       ORDER  BY h.fired_at DESC
       LIMIT $2 OFFSET $3`,
      [owned(req), limit, offset]
    );
    res.json({ history: rows });
  } catch (err) { next(err); }
}

// ── POST /api/alerts/history/:id/acknowledge ─────────────────────────────────
async function acknowledge(req, res, next) {
  try {
    const { rows } = await db.query(
      `UPDATE alert_history SET acknowledged = true
       WHERE id = $1 AND customer_id = $2 RETURNING *`,
      [req.params.id, owned(req)]
    );
    if (!rows.length) return res.status(404).json({ error: 'History entry not found.' });
    res.json({ entry: rows[0] });
  } catch (err) { next(err); }
}

// ── POST /api/alerts/history/acknowledge-all ─────────────────────────────────
async function acknowledgeAll(req, res, next) {
  try {
    await db.query(
      'UPDATE alert_history SET acknowledged = true WHERE customer_id = $1 AND acknowledged = false',
      [owned(req)]
    );
    res.json({ acknowledged: true });
  } catch (err) { next(err); }
}

module.exports = {
  listRules, createRule, updateRule, deleteRule,
  listChannels, createChannel, deleteChannel,
  listHistory, acknowledge, acknowledgeAll,
};
