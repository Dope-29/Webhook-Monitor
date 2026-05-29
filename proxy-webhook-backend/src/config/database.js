'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
