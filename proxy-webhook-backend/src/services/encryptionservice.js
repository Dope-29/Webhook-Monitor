'use strict';

/**
 * Envelope Encryption Service — AES-256-GCM
 *
 * Architecture:
 *   MEK (Master Encryption Key) — lives ONLY in process.env.MASTER_KEY, never in DB
 *   DEK (Data Encryption Key)   — random 32 bytes per customer, encrypted by MEK, stored in DB
 *
 * All BYTEA storage uses raw Buffers (no Base64), keeping storage overhead minimal.
 */

const crypto = require('crypto');
const db = require('../config/database');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96 bits — recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function getMEK() {
  const hex = process.env.MASTER_KEY || '';
  if (hex.length !== 64) {
    throw new Error('MASTER_KEY must be exactly 64 hex characters (32 bytes).');
  }
  return Buffer.from(hex, 'hex');
}

// ─── Low-level crypto primitives ────────────────────────────────────────────

/**
 * Encrypt a plaintext Buffer with a given key (MEK or DEK).
 * Output layout: [iv (12 bytes)] [authTag (16 bytes)] [ciphertext (variable)]
 */
function _encrypt(plaintextBuf, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt an envelope produced by _encrypt().
 * Throws if auth tag verification fails (tamper detection).
 */
function _decrypt(envelopeBuf, key) {
  const iv = envelopeBuf.slice(0, IV_LENGTH);
  const authTag = envelopeBuf.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = envelopeBuf.slice(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ─── DEK management ─────────────────────────────────────────────────────────

/** Generate a fresh 256-bit Data Encryption Key. */
function generateDEK() {
  return crypto.randomBytes(32);
}

/** Wrap (encrypt) a DEK with the MEK for DB storage. */
function encryptDEK(dek) {
  return _encrypt(dek, getMEK());
}

/** Unwrap (decrypt) an encrypted DEK from the DB. */
function decryptDEK(encryptedDEKBuf) {
  return _decrypt(encryptedDEKBuf, getMEK());
}

// ─── Payload encryption ─────────────────────────────────────────────────────

/**
 * Encrypt a webhook payload string/object with a DEK.
 * Returns separate { ciphertext, iv, authTag } Buffers for BYTEA columns.
 */
function encryptPayload(payload, dek) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const plaintext = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

/**
 * Decrypt a webhook payload. Throws on auth tag mismatch (tamper evidence).
 * Returns the original UTF-8 string.
 */
function decryptPayload(ciphertext, iv, authTag, dek) {
  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// ─── DB-backed key management ────────────────────────────────────────────────

/**
 * Return the customer's active DEK (decrypted in memory).
 * Creates a new DEK if none exists yet.
 * The raw DEK buffer is NEVER persisted to DB — only its encrypted form is.
 */
async function getOrCreateCustomerDEK(customerId) {
  const result = await db.query(
    'SELECT key_id, encrypted_key FROM encryption_keys WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1',
    [customerId]
  );

  if (result.rows.length > 0) {
    const { key_id, encrypted_key } = result.rows[0];
    const dek = decryptDEK(encrypted_key);
    return { keyId: key_id, dek };
  }

  // Bootstrap: generate + store new DEK for this customer
  const dek = generateDEK();
  const encryptedDEK = encryptDEK(dek);

  const insert = await db.query(
    'INSERT INTO encryption_keys (customer_id, encrypted_key) VALUES ($1, $2) RETURNING key_id',
    [customerId, encryptedDEK]
  );

  return { keyId: insert.rows[0].key_id, dek };
}

/**
 * Look up a specific key_id and return its decrypted DEK.
 * Used during payload decryption (GET /api/events/:id).
 */
async function getDEKByKeyId(keyId) {
  const result = await db.query(
    'SELECT encrypted_key FROM encryption_keys WHERE key_id = $1',
    [keyId]
  );
  if (result.rows.length === 0) {
    const err = new Error(`Encryption key not found: ${keyId}`);
    err.statusCode = 500;
    throw err;
  }
  return decryptDEK(result.rows[0].encrypted_key);
}

module.exports = {
  generateDEK,
  encryptDEK,
  decryptDEK,
  encryptPayload,
  decryptPayload,
  getOrCreateCustomerDEK,
  getDEKByKeyId,
};
