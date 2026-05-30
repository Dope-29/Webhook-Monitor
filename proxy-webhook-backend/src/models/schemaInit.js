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
    // Password reset tokens
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) NOT NULL,
        expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at     TIMESTAMP WITH TIME ZONE,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_cust ON password_resets(customer_id);`);

    // Email verification
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false NOT NULL;`);
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS verify_token_hash VARCHAR(255);`);
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS verify_token_expires TIMESTAMP WITH TIME ZONE;`);

    // Stripe billing columns
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free' NOT NULL;`);
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);`);
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_stripe ON customers(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;`);

    // Brute-force lockout columns
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL;`);
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;`);

    // OAuth columns — nullable because email/password users won't have them
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);`);
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255);`);
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
    // Allow null password_hash for OAuth-only accounts
    await db.query(`ALTER TABLE customers ALTER COLUMN password_hash DROP NOT NULL;`);
    // Unique index so one provider+id can only belong to one account
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_oauth ON customers(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;`);

    // Add paused column to pipelines if it doesn't exist (safe migration)
    await db.query(`ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT false NOT NULL;`);

    // Response capture columns on webhooks
    await db.query(`ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS response_status  INTEGER;`);
    await db.query(`ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS response_body    TEXT;`);

    // Replay attempts ledger
    await db.query(`
      CREATE TABLE IF NOT EXISTS replay_attempts (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        webhook_id  UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status_code  INTEGER,
        latency_ms   INTEGER,
        error_message TEXT
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_replay_attempts_webhook ON replay_attempts(webhook_id, attempted_at DESC);`);

    // ── Team management ───────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS team_invites (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_customer_id   VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        invitee_email       VARCHAR(255) NOT NULL,
        role                VARCHAR(20)  NOT NULL DEFAULT 'member',
        token_hash          VARCHAR(64)  NOT NULL UNIQUE,
        expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
        accepted_at         TIMESTAMP WITH TIME ZONE,
        created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_team_invites_owner ON team_invites(owner_customer_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_team_invites_hash  ON team_invites(token_hash);`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_customer_id   VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        member_customer_id  VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        role                VARCHAR(20)  NOT NULL DEFAULT 'member',
        joined_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE (owner_customer_id, member_customer_id)
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_team_members_owner  ON team_members(owner_customer_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_customer_id);`);

    // ── API keys ─────────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id  VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        name         VARCHAR(100) NOT NULL,
        key_hash     VARCHAR(64)  NOT NULL UNIQUE,  -- SHA-256 of raw key
        key_prefix   VARCHAR(20)  NOT NULL,          -- first ~10 chars for display
        last_used_at TIMESTAMP WITH TIME ZONE,
        expires_at   TIMESTAMP WITH TIME ZONE,
        revoked      BOOLEAN DEFAULT false NOT NULL,
        revoked_at   TIMESTAMP WITH TIME ZONE,
        created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_cust ON api_keys(customer_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);`);

    // ── Alert channels & rules ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS alert_channels (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id    VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        channel_type   VARCHAR(20)  NOT NULL,  -- 'email' | 'slack'
        label          VARCHAR(100) NOT NULL,
        config         TEXT NOT NULL,           -- JSON, stored encrypted-in-transit; has webhook_url or address
        config_redacted TEXT,                   -- safe-to-display version
        created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_alert_channels_cust ON alert_channels(customer_id);`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id    VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        pipeline_id    UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        rule_type      VARCHAR(50)  NOT NULL,   -- 'failure_rate'|'consecutive_failures'|'no_events'|'latency'
        threshold      NUMERIC      NOT NULL,
        window_minutes INTEGER      NOT NULL,
        channel_id     UUID REFERENCES alert_channels(id) ON DELETE SET NULL,
        enabled        BOOLEAN      DEFAULT true NOT NULL,
        created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_alert_rules_cust    ON alert_rules(customer_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled) WHERE enabled = true;`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id  VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        rule_id      UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
        pipeline_id  UUID REFERENCES pipelines(id) ON DELETE SET NULL,
        rule_type    VARCHAR(50)  NOT NULL,
        message      TEXT         NOT NULL,
        fired_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        resolved_at  TIMESTAMP WITH TIME ZONE,
        acknowledged BOOLEAN DEFAULT false NOT NULL
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_cust ON alert_history(customer_id, fired_at DESC);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alert_history(rule_id, fired_at DESC);`);

    // ── Core indexes (original) ──────────────────────────────────────────────
    await db.query(`CREATE INDEX IF NOT EXISTS idx_encryption_keys_cust ON encryption_keys(customer_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pipelines_cust ON pipelines(customer_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_cust_pipe ON webhooks(customer_id, pipeline_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_expiry ON webhooks(expires_at);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_cust ON audit_logs(customer_id);`);

    // ── Optimized indexes for hot query paths ────────────────────────────────
    // Event list sorted by time — most frequent query
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_cust_time
      ON webhooks(customer_id, created_at DESC);`);
    // Pipeline-scoped event list
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_pipe_time
      ON webhooks(pipeline_id, created_at DESC);`);
    // Replay queue — filter by failed/pending status
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_status
      ON webhooks(customer_id, status_code) WHERE status_code IS NULL OR status_code = -1;`);
    // Dashboard: events by customer + time (used for daily counts / 7-day queries)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_cust_day
      ON webhooks(customer_id, created_at);`);
    // Pipeline lookup by customer (already exists but add created_at for sort)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pipelines_cust_time
      ON pipelines(customer_id, created_at DESC);`);
    // Customer email lookup (for login)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);`);

    console.log('Database initialization completely successful. All tables and high-speed indexes verified.');
  } catch (error) {
    // Log the structural error traceback cleanly and escalate up the initialization stack
    console.error('CRITICAL: Database schema table synchronization crashed:', error.message);
    throw error;
  }
}

// Export the setup sequence to execute it directly inside your primary server lifecycle hooks
module.exports = { initializeDatabaseSchema };
