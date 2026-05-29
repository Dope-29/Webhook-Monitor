'use strict';

/**
 * Retention Service
 *
 * Deletes webhook events past their expires_at timestamp.
 * Groups deletions by customer for per-customer audit trail entries.
 * Called by the nightly cron job.
 */

const db = require('../config/database');
const logger = require('./loggerservice');

async function runRetentionCleanup() {
  logger.info('Retention cleanup job starting...');

  try {
    // Identify which customers have expired records (for per-customer audit entries)
    const expiredByCustomer = await db.query(
      `SELECT customer_id, COUNT(*) AS count
       FROM webhooks
       WHERE expires_at < NOW()
       GROUP BY customer_id`
    );

    if (expiredByCustomer.rows.length === 0) {
      logger.info('Retention cleanup: no expired webhooks found.');
      return 0;
    }

    // Bulk delete all expired webhooks
    const deleteResult = await db.query(
      'DELETE FROM webhooks WHERE expires_at < NOW()'
    );

    const deletedCount = deleteResult.rowCount;

    // Write per-customer audit entries (audit_logs FK requires a valid customer_id)
    for (const row of expiredByCustomer.rows) {
      await db.query(
        `INSERT INTO audit_logs (customer_id, action, details)
         VALUES ($1, $2, $3)`,
        [row.customer_id, 'RETENTION_CLEANUP', `Deleted ${row.count} expired webhook events`]
      );
    }

    logger.info(`Retention cleanup complete. Deleted ${deletedCount} expired webhooks.`, {
      affectedCustomers: expiredByCustomer.rows.length,
    });

    return deletedCount;
  } catch (err) {
    logger.error('Retention cleanup job failed', { error: err.message });
    throw err;
  }
}

module.exports = { runRetentionCleanup };
