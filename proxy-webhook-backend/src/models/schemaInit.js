'use strict';

// Import our centralized database query wrapper interface
const db = require('../config/database');

// Define the comprehensive initialization function to construct our relational schemas sequentially
async function initializeDatabaseSchema() {
  console.log('Beginning system database table schema verification/initialization...');

  try {
    // 1. Enable native UUID support extension inside PostgreSQL if it doesn't already exist
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Generate the base 'customers' account ledger table
    //    NOTE: password_hash is added here (not in original spec) to support bcrypt auth.
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id                    VARCHAR(255) PRIMARY KEY,
        email                 VARCHAR(255) UNIQUE NOT NULL,
        name                  VARCHAR(255) NOT NULL,
        password_hash         VARCHAR(255) NOT NULL,
        default_retention_days INTEGER DEFAULT 30 NOT NULL,
        created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 3. Generate the envelope encryption keys repository matching your cryptographic spec
    await db.query(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        key_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        encrypted_key BYTEA NOT NULL,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 4. Generate the 'pipelines' endpoint destination configuration layout
    await db.query(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id     VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        name            VARCHAR(255) NOT NULL,
        destination_url TEXT NOT NULL,
        proxy_url       TEXT,
        timeout         INTEGER DEFAULT 10000 NOT NULL,
        provider        VARCHAR(100),
        retention_days  INTEGER NOT NULL,
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 5. Generate the central 'webhooks' event ledger using BYTEA for AES-256-GCM
    await db.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id       VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        pipeline_id       UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        encrypted_payload BYTEA NOT NULL,
        iv                BYTEA NOT NULL,
        auth_tag          BYTEA NOT NULL,
        key_id            UUID NOT NULL REFERENCES encryption_keys(key_id),
        status_code       INTEGER,
        latency_ms        INTEGER,
        created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at        TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    // 6. Generate the immutable administrative audit logs database structure
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        action      VARCHAR(255) NOT NULL,
        details     TEXT,
        timestamp   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 7. Establish performance indexing paths on high-frequency conditional search properties
    await db.query(`CREATE INDEX IF NOT EXISTS idx_encryption_keys_cust ON encryption_keys(customer_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pipelines_cust ON pipelines(customer_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_cust_pipe ON webhooks(customer_id, pipeline_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_expiry ON webhooks(expires_at);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_cust ON audit_logs(customer_id);`);

    console.log('Database initialization completely successful. All tables and high-speed indexes verified.');
  } catch (error) {
    // Log the structural error traceback cleanly and escalate up the initialization stack
    console.error('CRITICAL: Database schema table synchronization crashed:', error.message);
    throw error;
  }
}

// Export the setup sequence to execute it directly inside your primary server lifecycle hooks
module.exports = { initializeDatabaseSchema };
