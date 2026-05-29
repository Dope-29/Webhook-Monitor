'use strict';

/**
 * Integration Tests: Pipelines Endpoints
 *
 * DB is mocked. Tests use a real JWT signed with the test JWT_SECRET.
 * Tests cover:
 *   ✓ GET  /api/pipelines         → 200 with list
 *   ✓ POST /api/pipelines         → 201 with created pipeline
 *   ✓ PUT  /api/pipelines/:id     → 200 with updated pipeline
 *   ✓ DELETE /api/pipelines/:id   → 204
 *   ✗ No auth                     → 401
 *   ✗ Other customer's pipeline   → 404 (not 403 — avoids resource disclosure)
 *   ✗ Invalid body on create      → 422
 *   ✗ Delete non-existent         → 404
 */

jest.mock('../../src/config/database', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const db      = require('../../src/config/database');
const app     = require('../../src/app');

const CUSTOMER_ID = 'cust-test-001';
const OTHER_ID    = 'cust-other-999';

// Build a real signed JWT for the test customer
function makeToken(customerId = CUSTOMER_ID) {
  return jwt.sign({ customer_id: customerId }, process.env.JWT_SECRET, {
    expiresIn: '1h',
    issuer: 'hookwatch-api',
    audience: 'hookwatch-client',
  });
}

const VALID_TOKEN = makeToken();

const MOCK_PIPELINE = {
  id: 'pipe-uuid-001',
  customer_id: CUSTOMER_ID,
  name: 'My Pipeline',
  destination_url: 'https://example.com/hook',
  proxy_url: null,
  timeout: 10000,
  provider: null,
  retention_days: 30,
  created_at: new Date().toISOString(),
};

afterEach(() => jest.clearAllMocks());

// ─── List ─────────────────────────────────────────────────────────────────────

describe('GET /api/pipelines', () => {
  test('✓ returns 200 with pipelines array for authenticated user', async () => {
    db.query.mockResolvedValueOnce({ rows: [MOCK_PIPELINE] });

    const res = await request(app)
      .get('/api/pipelines')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.pipelines)).toBe(true);
    expect(res.body.pipelines[0].id).toBe(MOCK_PIPELINE.id);
  });

  test('✗ [DESIGNED TO FAIL] no Authorization header → 401', async () => {
    const res = await request(app).get('/api/pipelines');
    expect(res.status).toBe(401);
  });
});

// ─── Create ───────────────────────────────────────────────────────────────────

describe('POST /api/pipelines', () => {
  const VALID_BODY = {
    name: 'Test Pipeline',
    destination_url: 'https://example.com/webhook',
    retention_days: 30,
  };

  test('✓ creates pipeline and returns 201', async () => {
    db.query.mockResolvedValueOnce({ rows: [MOCK_PIPELINE] });

    const res = await request(app)
      .post('/api/pipelines')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('pipeline');
  });

  test('✗ [DESIGNED TO FAIL] missing retention_days returns 422', async () => {
    const res = await request(app)
      .post('/api/pipelines')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: 'No Retention', destination_url: 'https://example.com/hook' });

    expect(res.status).toBe(422);
    expect(res.body.details.some((d) => d.field === 'retention_days')).toBe(true);
  });

  test('✗ [DESIGNED TO FAIL] invalid destination_url returns 422', async () => {
    const res = await request(app)
      .post('/api/pipelines')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: 'Bad URL', destination_url: 'not-a-url', retention_days: 30 });

    expect(res.status).toBe(422);
  });

  test('✗ [DESIGNED TO FAIL] empty body returns 422', async () => {
    const res = await request(app)
      .post('/api/pipelines')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

// ─── Update ───────────────────────────────────────────────────────────────────

describe('PUT /api/pipelines/:id', () => {
  test('✓ updates pipeline fields and returns 200', async () => {
    // Ownership check returns a row
    db.query.mockResolvedValueOnce({ rows: [{ id: MOCK_PIPELINE.id }] });
    // UPDATE returns updated row
    db.query.mockResolvedValueOnce({ rows: [{ ...MOCK_PIPELINE, name: 'Updated Name' }] });

    const res = await request(app)
      .put(`/api/pipelines/${MOCK_PIPELINE.id}`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.pipeline.name).toBe('Updated Name');
  });

  test('✗ [DESIGNED TO FAIL] pipeline belonging to another customer returns 404', async () => {
    // Ownership check: the pipeline belongs to OTHER_ID, not our customer
    db.query.mockResolvedValueOnce({ rows: [] }); // ownership check fails

    const res = await request(app)
      .put(`/api/pipelines/pipe-other-001`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(404); // 404 not 403 — avoids resource existence disclosure
  });
});

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('DELETE /api/pipelines/:id', () => {
  test('✓ deletes owned pipeline and returns 204', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: MOCK_PIPELINE.id }] });

    const res = await request(app)
      .delete(`/api/pipelines/${MOCK_PIPELINE.id}`)
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  test('✗ [DESIGNED TO FAIL] deleting non-existent pipeline returns 404', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // nothing deleted

    const res = await request(app)
      .delete('/api/pipelines/nonexistent-id')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });
});
