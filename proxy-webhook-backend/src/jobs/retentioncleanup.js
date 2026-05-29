'use strict';

const cron = require('node-cron');
const { runRetentionCleanup } = require('../services/retentionservice');
const logger = require('../services/loggerservice');

/**
 * Starts the nightly retention cleanup cron job.
 * Schedule: 2:00 AM server time, every day.
 */
function startRetentionJob() {
  // '0 2 * * *' = At minute 0 of hour 2, every day
  cron.schedule('0 2 * * *', async () => {
    logger.info('Cron: starting nightly retention cleanup...');
    try {
      const deleted = await runRetentionCleanup();
      logger.info(`Cron: retention cleanup done. Deleted ${deleted} records.`);
    } catch (err) {
      logger.error('Cron: retention cleanup failed', { error: err.message });
    }
  });

  logger.info('Retention cleanup cron job scheduled (daily at 02:00).');
}

module.exports = { startRetentionJob };
