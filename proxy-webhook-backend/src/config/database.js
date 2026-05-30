'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '2',  10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Kill queries that take > 10s to prevent pile-up
  statement_timeout: 10000,
  // Kill idle transactions after 30s
  idle_in_transaction_session_timeout: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
  process.exit(-1);
});

/**
 * Centralized parameterized query wrapper.
 * NEVER pass raw user input directly into the SQL string — always use $1, $2... params.
 *
 * @param {string} text  - SQL string with $N placeholders
 * @param {Array}  params - Bound parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[DB] Slow query detected [${duration}ms]: ${text.substring(0, 120)}`);
  }
  return result;
}

/**
 * Acquire a dedicated client from the pool (for transactions).
 */
function getClient() {
  return pool.connect();
}

/**
 * Gracefully drain the pool (called on server shutdown).
 */
function end() {
  return pool.end();
}

module.exports = { query, getClient, end };
