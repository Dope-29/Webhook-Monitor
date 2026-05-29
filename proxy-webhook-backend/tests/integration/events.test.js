'use strict';

/**
 * Integration Tests: Events Endpoints
 *
 * DB and encryption are fully mocked.
 * Tests cover:
 *   ✓ GET /api/events           → paginated list (metadata only)
 *   ✓ GET /api/events/:id       → decrypted payload returned
 *   ✓ POST /api/events/:id/replay → 202 Accepted
 *   ✗ GET /api/events/:id (non-existent) → 404
 *   ✗ No auth                   → 401
 *   ✗ Replay non-existent event → 404
 */

jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../src/services/encryptionservice', () => ({
  getDEKByKeyId:  jest.fn().mockResolvedValue(Buffer.alloc(32)),
  decryptPayload: jest.fn().mockReturnValue('{"event":"payment.success","amount":100}'),
  getOrCreateCustomerDEK: jest.fn().mockResolvedValue({ keyId: 'k1', dek: Buffer.alloc(32) }),
  encryptPayload: jest.fn().mockReturnValue({
    ciphertext: Buffer.from('cipher'),
    iv: Buffer.from('iv123456789012'),
    authTag: Buffer.from('tag1234567890123'),
  }),
}));
jest.mock('../../src/services/forwardingservice', () => ({
  forwardWebhook: jest.fn().mockResolvedValue(),
}));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const db      = require('../../src/config/database');
const app     = require('../../src/app');

const CUSTOMER_ID = 'cust-evt-test';
const TOKEN = jwt.sign({ customer_id: CUSTOMER_ID }, process.env.JWT_SECRET, {
  expiresIn: '1h',
  issuer: 'hookwatch-api',
  audience: 'hookwatch-client',
});

// Mock row matches ONLY what the list SELECT returns (no crypto fields)
const MOCK_EVENT_ROW = {
  id: 'evt-uuid-001',
  pipeline_id: 'pipe-uuid-001',
  status_code: 200,
  latency_ms: 45,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86400000).toISOString(),
};

// Full row (for getById — includes crypto fields the controller decrypts)
const MOCK_EVENT_FULL = {
  id: 'evt-uuid-001',
  pipeline_id: 'pipe-uuid-001',
  encrypted_payload: Buffer.from('encrypted'),
  iv: Buffer.alloc(12),
  auth_tag: Buffer.alloc(16),
  key_id: 'key-uuid-001',
  status_code: 200,
  latency_ms: 45,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 86400000).toISOString(),
};

afterEach(() => jest.clearAllMocks());

// ─── List events ─────────────────────────────────────────────────────────────

describe('GET /api/events', () => {
  test('✓ returns 200 with paginated event list (metadata only)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [MOCK_EVENT_ROW] }) // data query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // count query

    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.pagination).toHaveProperty('total', 1);
    // Payload must NOT be in the list response
    expect(res.body.events[0]).not.toHaveProperty('encrypted_payload');
    expect(res.body.events[0]).not.toHaveProperty('payload');
  });

  test('✓ respects ?page and ?limit query params', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '50' }] });

    const res = await request(app)
      .get('/api/events?page=3&limit=10')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(3);
    expect(res.body.pagination.limit).toBe(10);
  });

  test('✗ [DESIGNED TO FAIL] no auth header returns 401', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
  });
});

// ─── Get single event (decrypted) ────────────────────────────────────────────

describe('GET /api/events/:id', () => {
  test('✓ returns 200 with decrypted payload for owned event', async () => {
    db.query.mockResolvedValueOnce({ rows: [MOCK_EVENT_FULL] });

    const res = await request(app)
      .get('/api/events/evt-uuid-001')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.event).toHaveProperty('payload');
    expect(res.body.event.payload).toEqual({ event: 'payment.success', amount: 100 });
    // Encryption fields must NOT be exposed
    expect(res.body.event).not.toHaveProperty('encrypted_payload');
    expect(res.body.event).not.toHaveProperty('key_id');
  });

  test('✗ [DESIGNED TO FAIL] nonexistent event returns 404', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/events/nonexistent-id')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(404);
  });
});

// ─── Replay ───────────────────────────────────────────────────────────────────

describe('POST /api/events/:id/replay', () => {
  test('✓ returns 202 Accepted immediately (fire-and-forget)', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: MOCK_EVENT_ROW.id,
        pipeline_id: 'pipe-uuid-001',
        destination_url: 'https://example.com/hook',
        proxy_url: null,
        timeout: 10000,
      }],
    });

    const res = await request(app)
      .post('/api/events/evt-uuid-001/replay')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('message');
    expect(res.body.event_id).toBe(MOCK_EVENT_ROW.id);
  });

  test('✗ [DESIGNED TO FAIL] replay of nonexistent event returns 404', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/events/nonexistent-id/replay')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(404);
  });
});
