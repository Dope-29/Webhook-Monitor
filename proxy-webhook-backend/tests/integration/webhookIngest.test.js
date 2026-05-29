'use strict';

/**
 * Integration Tests: Public Webhook Ingest Endpoint
 *
 * DB and encryption are mocked. No JWT needed — this is a public endpoint.
 * Tests cover:
 *   ✓ POST /webhook/:pipelineId with valid pipeline → 200
 *   ✓ Response is immediate (< 500ms in test — forwarding is async)
 *   ✗ Nonexistent pipelineId → 404
 *   ✗ Health check → 200 (sanity)
 *   ✗ Unknown route → 404
 */

jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../src/services/encryptionservice', () => ({
  getOrCreateCustomerDEK: jest.fn().mockResolvedValue({ keyId: 'k1', dek: Buffer.alloc(32) }),
  encryptPayload: jest.fn().mockReturnValue({
    ciphertext: Buffer.from('ciphertext-data'),
    iv:         Buffer.alloc(12),
    authTag:    Buffer.alloc(16),
  }),
  getDEKByKeyId:  jest.fn(),
  decryptPayload: jest.fn(),
}));
jest.mock('../../src/services/forwardingservice', () => ({
  forwardWebhook: jest.fn().mockResolvedValue(),
}));

const request = require('supertest');
const db      = require('../../src/config/database');
const app     = require('../../src/app');

const PIPELINE_ID = 'pipe-public-001';

const MOCK_PIPELINE = {
  id: PIPELINE_ID,
  customer_id: 'cust-001',
  destination_url: 'https://destination.example.com/hook',
  proxy_url: null,
  timeout: 10000,
  retention_days: 30,
};

afterEach(() => jest.clearAllMocks());

// ─── Ingest ───────────────────────────────────────────────────────────────────

describe('POST /webhook/:pipelineId', () => {
  test('✓ returns 200 immediately with received:true and event_id', async () => {
    // Pipeline lookup
    db.query.mockResolvedValueOnce({ rows: [MOCK_PIPELINE] });
    // INSERT webhook
    db.query.mockResolvedValueOnce({ rows: [{ id: 'new-event-uuid' }] });

    const start = Date.now();
    const res = await request(app)
      .post(`/webhook/${PIPELINE_ID}`)
      .send({ event: 'order.created', orderId: 'ord-9999' });
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body).toHaveProperty('event_id');
    // Response should be fast — not blocked by forwarding
    expect(duration).toBeLessThan(500);
  });

  test('✓ accepts any arbitrary JSON body', async () => {
    db.query.mockResolvedValueOnce({ rows: [MOCK_PIPELINE] });
    db.query.mockResolvedValueOnce({ rows: [{ id: 'evt-arbitrary' }] });

    const res = await request(app)
      .post(`/webhook/${PIPELINE_ID}`)
      .send({ anything: true, nested: { value: 42 }, arr: [1, 2, 3] });

    expect(res.status).toBe(200);
  });

  test('✗ [DESIGNED TO FAIL] nonexistent pipelineId returns 404', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // no pipeline found

    const res = await request(app)
      .post('/webhook/nonexistent-pipeline-id')
      .send({ event: 'test' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('✗ [DESIGNED TO FAIL] GET on webhook endpoint returns 404 (method not allowed)', async () => {
    const res = await request(app).get(`/webhook/${PIPELINE_ID}`);
    expect(res.status).toBe(404);
  });
});

// ─── Infrastructure ───────────────────────────────────────────────────────────

describe('Infrastructure routes', () => {
  test('✓ GET /health returns 200 with status:ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('✗ [DESIGNED TO FAIL] unknown route returns 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
