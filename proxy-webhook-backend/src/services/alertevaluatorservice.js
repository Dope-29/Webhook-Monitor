'use strict';

/**
 * Alert Evaluator — runs every minute via node-cron
 *
 * For each enabled alert rule, evaluates the condition against recent webhook
 * data and fires a notification + inserts an alert_history row if it triggers.
 *
 * Cooldown: same rule cannot fire more than once per (window_minutes) to
 * prevent alert storms. We check the last fired_at before firing again.
 */

const db     = require('../config/database');
const logger = require('./loggerservice');
const { sendAlertEmail } = require('./emailservice');
const axios  = require('axios');

// ── Evaluate all enabled rules ────────────────────────────────────────────────
async function evaluateAllRules() {
  let rules;
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.customer_id, r.pipeline_id, r.rule_type,
              r.threshold, r.window_minutes, r.channel_id,
              c.channel_type, c.config AS channel_config,
              p.name AS pipeline_name
       FROM   alert_rules r
       LEFT JOIN alert_channels c ON c.id = r.channel_id
       LEFT JOIN pipelines       p ON p.id = r.pipeline_id
       WHERE  r.enabled = true`
    );
    rules = rows;
  } catch (err) {
    logger.error('Alert evaluator: failed to load rules', { error: err.message });
    return;
  }

  for (const rule of rules) {
    try {
      await evaluateRule(rule);
    } catch (err) {
      logger.error('Alert evaluator: rule evaluation error', { ruleId: rule.id, error: err.message });
    }
  }
}

async function evaluateRule(rule) {
  // Cooldown check — don't re-fire within the same window
  const cooldown = await db.query(
    `SELECT 1 FROM alert_history
     WHERE rule_id = $1
       AND fired_at > NOW() - ($2 || ' minutes')::INTERVAL
     LIMIT 1`,
    [rule.id, rule.window_minutes]
  );
  if (cooldown.rows.length > 0) return; // still in cooldown

  let triggered = false;
  let message   = '';

  switch (rule.rule_type) {
    case 'failure_rate': {
      const { rows } = await db.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status_code IS NULL OR status_code < 0 OR status_code >= 400 THEN 1 ELSE 0 END) AS failed
         FROM webhooks
         WHERE pipeline_id = $1
           AND created_at > NOW() - ($2 || ' minutes')::INTERVAL`,
        [rule.pipeline_id, rule.window_minutes]
      );
      const total  = parseInt(rows[0].total) || 0;
      const failed = parseInt(rows[0].failed) || 0;
      if (total > 0) {
        const rate = (failed / total) * 100;
        if (rate >= rule.threshold) {
          triggered = true;
          message = `Pipeline "${rule.pipeline_name}": failure rate ${rate.toFixed(1)}% exceeded threshold of ${rule.threshold}% over last ${rule.window_minutes} min (${failed}/${total} events failed).`;
        }
      }
      break;
    }

    case 'consecutive_failures': {
      const { rows } = await db.query(
        `SELECT status_code
         FROM webhooks
         WHERE pipeline_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [rule.pipeline_id, rule.threshold]
      );
      if (rows.length >= rule.threshold) {
        const allFailed = rows.every(r => r.status_code == null || r.status_code < 0 || r.status_code >= 400);
        if (allFailed) {
          triggered = true;
          message = `Pipeline "${rule.pipeline_name}": ${rule.threshold} consecutive delivery failures detected.`;
        }
      }
      break;
    }

    case 'no_events': {
      const { rows } = await db.query(
        `SELECT MAX(created_at) AS last_event
         FROM webhooks
         WHERE pipeline_id = $1`,
        [rule.pipeline_id]
      );
      const last = rows[0]?.last_event;
      if (!last) {
        // Never received an event — check if pipeline is older than window
        const { rows: pRows } = await db.query(
          `SELECT created_at FROM pipelines WHERE id = $1`,
          [rule.pipeline_id]
        );
        const pipeCreated = pRows[0]?.created_at;
        if (pipeCreated) {
          const ageMs = Date.now() - new Date(pipeCreated).getTime();
          if (ageMs > rule.window_minutes * 60 * 1000) {
            triggered = true;
            message = `Pipeline "${rule.pipeline_name}": no events received in the last ${rule.window_minutes} min.`;
          }
        }
      } else {
        const silentMs = Date.now() - new Date(last).getTime();
        if (silentMs > rule.window_minutes * 60 * 1000) {
          triggered = true;
          message = `Pipeline "${rule.pipeline_name}": no events received in the last ${rule.window_minutes} min (last event: ${new Date(last).toISOString()}).`;
        }
      }
      break;
    }

    case 'latency': {
      const { rows } = await db.query(
        `SELECT AVG(latency_ms) AS avg_latency
         FROM webhooks
         WHERE pipeline_id = $1
           AND latency_ms IS NOT NULL
           AND created_at > NOW() - ($2 || ' minutes')::INTERVAL`,
        [rule.pipeline_id, rule.window_minutes]
      );
      const avg = parseFloat(rows[0]?.avg_latency) || 0;
      if (avg > 0 && avg >= rule.threshold) {
        triggered = true;
        message = `Pipeline "${rule.pipeline_name}": average latency ${avg.toFixed(0)}ms exceeded threshold of ${rule.threshold}ms over last ${rule.window_minutes} min.`;
      }
      break;
    }

    default:
      return;
  }

  if (!triggered) return;

  // Insert history row
  await db.query(
    `INSERT INTO alert_history (customer_id, rule_id, pipeline_id, rule_type, message)
     VALUES ($1,$2,$3,$4,$5)`,
    [rule.customer_id, rule.id, rule.pipeline_id, rule.rule_type, message]
  );

  logger.info('Alert fired', { ruleId: rule.id, ruleType: rule.rule_type, pipelineId: rule.pipeline_id });

  // Send notification
  if (rule.channel_id && rule.channel_config) {
    let cfg;
    try { cfg = typeof rule.channel_config === 'string' ? JSON.parse(rule.channel_config) : rule.channel_config; }
    catch { cfg = null; }

    if (cfg) {
      if (rule.channel_type === 'email' && cfg.address) {
        await sendAlertEmail(cfg.address, `[HookWatch Alert] ${rule.rule_type}`, message);
      } else if (rule.channel_type === 'slack' && cfg.webhook_url) {
        await sendSlackAlert(cfg.webhook_url, message);
      }
    }
  }
}

async function sendSlackAlert(webhookUrl, text) {
  try {
    await axios.post(webhookUrl, {
      text: `:warning: *HookWatch Alert*\n${text}`,
    }, { timeout: 5000 });
  } catch (err) {
    logger.warn('Slack alert delivery failed', { error: err.message });
  }
}

module.exports = { evaluateAllRules };
