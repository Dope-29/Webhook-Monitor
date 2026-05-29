'use strict';

/**
 * Global test environment setup.
 * Sets env vars before any module requires database.js or services.
 * Uses a mock DB — no real PostgreSQL needed.
 */
process.env.NODE_ENV        = 'test';
process.env.MASTER_KEY      = 'a'.repeat(64); // 64-char hex placeholder for tests
process.env.JWT_SECRET      = 'test-jwt-secret-for-testing-only';
process.env.DATABASE_URL    = 'postgresql://test:test@localhost:5432/test_db';
process.env.PORT            = '5001';
