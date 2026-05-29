'use strict';

/**
 * Unit Tests: Encryption Service (AES-256-GCM)
 *
 * These tests are PURE — no DB, no network. The db module is mocked.
 * Tests cover:
 *   ✓ Passing: correct encrypt/decrypt round-trip
 *   ✓ Passing: DEK wrap/unwrap with MEK
 *   ✗ Designed to fail: tampered ciphertext → auth tag error
 *   ✗ Designed to fail: wrong DEK for decryption → auth tag error
 *   ✗ Designed to fail: wrong auth tag → decryption throws
 */

// Mock the DB so getOrCreateCustomerDEK can be tested in isolation
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/database');
const {
  generateDEK,
  encryptDEK,
  decryptDEK,
  encryptPayload,
  decryptPayload,
  getOrCreateCustomerDEK,
  getDEKByKeyId,
} = require('../../src/services/encryptionservice');

// ─── DEK wrap/unwrap ─────────────────────────────────────────────────────────

describe('DEK wrap/unwrap (MEK envelope)', () => {
  test('✓ generates a 32-byte DEK', () => {
    const dek = generateDEK();
    expect(dek).toBeInstanceOf(Buffer);
    expect(dek.length).toBe(32);
  });

  test('✓ encryptDEK produces a buffer larger than 32 bytes (iv+tag+key)', () => {
    const dek = generateDEK();
    const wrapped = encryptDEK(dek);
    expect(wrapped).toBeInstanceOf(Buffer);
    expect(wrapped.length).toBeGreaterThan(32); // 12 + 16 + 32 = 60
  });

  test('✓ decryptDEK recovers the original DEK after encryptDEK', () => {
    const dek = generateDEK();
    const wrapped = encryptDEK(dek);
    const recovered = decryptDEK(wrapped);
    expect(recovered.equals(dek)).toBe(true);
  });

  test('✗ [DESIGNED TO FAIL] tampered encrypted DEK throws on decrypt', () => {
    const dek = generateDEK();
    const wrapped = encryptDEK(dek);
    // Flip a byte inside the ciphertext region (after iv+tag = 28 bytes)
    wrapped[29] ^= 0xFF;
    expect(() => decryptDEK(wrapped)).toThrow();
  });

  test('✗ [DESIGNED TO FAIL] wrong MASTER_KEY length throws on encrypt', () => {
    const originalKey = process.env.MASTER_KEY;
    process.env.MASTER_KEY = 'tooshort';
    expect(() => encryptDEK(generateDEK())).toThrow('MASTER_KEY must be exactly 64 hex characters');
    process.env.MASTER_KEY = originalKey;
  });
});

// ─── Payload encryption ──────────────────────────────────────────────────────

describe('Payload encrypt/decrypt (AES-256-GCM)', () => {
  let dek;
  beforeAll(() => { dek = generateDEK(); });

  test('✓ round-trip: string payload survives encrypt → decrypt', () => {
    const original = JSON.stringify({ event: 'payment.completed', amount: 9999 });
    const { ciphertext, iv, authTag } = encryptPayload(original, dek);
    const decrypted = decryptPayload(ciphertext, iv, authTag, dek);
    expect(decrypted).toBe(original);
  });

  test('✓ round-trip: object payload is serialized and recovered', () => {
    const obj = { user: 'test', data: [1, 2, 3] };
    const { ciphertext, iv, authTag } = encryptPayload(obj, dek);
    const decrypted = decryptPayload(ciphertext, iv, authTag, dek);
    expect(JSON.parse(decrypted)).toEqual(obj);
  });

  test('✓ each encryption produces a unique IV (no IV reuse)', () => {
    const msg = 'same message';
    const enc1 = encryptPayload(msg, dek);
    const enc2 = encryptPayload(msg, dek);
    expect(enc1.iv.equals(enc2.iv)).toBe(false);
    expect(enc1.ciphertext.equals(enc2.ciphertext)).toBe(false);
  });

  test('✗ [DESIGNED TO FAIL] tampered ciphertext throws on decrypt', () => {
    const { ciphertext, iv, authTag } = encryptPayload('hello world', dek);
    ciphertext[0] ^= 0xFF; // flip first byte
    expect(() => decryptPayload(ciphertext, iv, authTag, dek)).toThrow();
  });

  test('✗ [DESIGNED TO FAIL] tampered auth tag throws on decrypt', () => {
    const { ciphertext, iv, authTag } = encryptPayload('hello world', dek);
    authTag[0] ^= 0xFF; // flip first byte of auth tag
    expect(() => decryptPayload(ciphertext, iv, authTag, dek)).toThrow();
  });

  test('✗ [DESIGNED TO FAIL] wrong DEK for decryption throws', () => {
    const wrongDek = generateDEK();
    const { ciphertext, iv, authTag } = encryptPayload('secret', dek);
    expect(() => decryptPayload(ciphertext, iv, authTag, wrongDek)).toThrow();
  });
});

// ─── DB-backed key management (mocked) ──────────────────────────────────────

describe('getOrCreateCustomerDEK (mocked DB)', () => {
  afterEach(() => jest.clearAllMocks());

  test('✓ creates a new DEK if none exists in DB', async () => {
    // First query (SELECT) returns empty, INSERT returns key_id
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ key_id: 'mock-uuid-1234' }] });

    const result = await getOrCreateCustomerDEK('cust-001');
    expect(result.keyId).toBe('mock-uuid-1234');
    expect(result.dek).toBeInstanceOf(Buffer);
    expect(result.dek.length).toBe(32);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('✓ returns existing DEK from DB without INSERT', async () => {
    const dek = generateDEK();
    const encrypted = encryptDEK(dek);

    db.query.mockResolvedValueOnce({
      rows: [{ key_id: 'existing-key-id', encrypted_key: encrypted }],
    });

    const result = await getOrCreateCustomerDEK('cust-002');
    expect(result.keyId).toBe('existing-key-id');
    expect(result.dek.equals(dek)).toBe(true);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('✗ [DESIGNED TO FAIL] getDEKByKeyId throws when key not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    await expect(getDEKByKeyId('nonexistent-id')).rejects.toThrow('Encryption key not found');
  });
});
