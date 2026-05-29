'use strict';

require('dotenv').config();

// ─── Critical Env Validation (fail fast before any async code) ───────────────
const REQUIRED_ENV = ['DATABASE_URL', 'MASTER_KEY', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (process.env.MASTER_KEY.length !== 64) {
  console.error('FATAL: MASTER_KEY must be exactly 64 hex characters (32 bytes).');
  process.exit(1);
}

// ─── Load App & DB ───────────────────────────────────────────────────────────
const app = require('./app');
const db = require('./config/database');
const { initializeDatabaseSchema } = require('./models/schemaInit');
const { startRetentionJob } = require('./jobs/retentioncleanup');
const logger = require('./services/loggerservice');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // 1. Verify DB connection
    await db.query('SELECT 1');
    logger.info('PostgreSQL connection verified.');

    // 2. Run schema migrations
    await initializeDatabaseSchema();

    // 3. Start background cron jobs
    startRetentionJob();

    // 4. Bind to port
    const server = app.listen(PORT, () => {
      logger.info(`Server running in [${process.env.NODE_ENV}] mode on port ${PORT}`);
    });

    // ── Graceful Shutdown ─────────────────────────────────────────────────────
    const shutdown = (signal) => {
      logger.warn(`${signal} received — shutting down gracefully.`);
      server.close(async () => {
        await db.end();
        logger.info('Database pool drained. Process exiting.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', { reason: String(reason) });
      shutdown('unhandledRejection');
    });

  } catch (err) {
    logger.error('Server startup failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

startServer();