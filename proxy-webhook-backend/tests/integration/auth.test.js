'use strict';

/**
 * Integration Tests: Auth Endpoints
 *
 * DB and bcrypt are mocked — all tests run in-memory.
 * Tests cover:
 *   ✓ POST /api/auth/signup  → 201 with token
 *   ✓ POST /api/auth/login   → 200 with token
 *   ✗ Duplicate email        → 409
 *   ✗ Wrong password         → 401
 *   ✗ Missing fields         → 422
 *   ✗ No token on protected  → 401
 */

jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
// Mock bcrypt to avoid slow hashing in tests
jest.mock('bcrypt', () => ({
  hash:    jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));
// Mock encryption so signup doesn't need a real DB for DEK
jest.mock('../../src/services/encryptionservice', () => ({
  getOrCreateCustomerDEK: jest.fn().mockResolvedValue({ keyId: 'mock-key', dek: Buffer.alloc(32) }),
  getDEKByKeyId:    jest.fn(),
  encryptPayload:   jest.fn(),
  decryptPayload:   jest.fn(),
}));

const request  = require('supertest');
const bcrypt   = require('bcrypt');
const db       = require('../../src/config/database');
const app      = require('../../src/app');

// Helper: mock a successful signup DB sequence
function mockSignupSuccess() {
  db.query
    .mockResolvedValueOnce({ rows: [] })           // email uniqueness check
    .mockResolvedValueOnce({ rows: [{ id: 'cust-123' }] }); // INSERT customer
}

// Helper: mock a customer in DB for login
function mockLoginCustomer(passwordHash = '$2b$10$hashedpassword') {
  db.query.mockResolvedValueOnce({
    rows: [{ id: 'cust-123', password_hash: passwordHash }],
  });
}

afterEach(() => jest.clearAllMocks());

// ─── Signup ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  test('✓ returns 201 and a JWT token on valid signup', async () => {
    mockSignupSuccess();
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'Password123', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body).toHaveProperty('customer_id');
  });

  test('✗ [DESIGNED TO FAIL] duplicate email returns 409', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] }); // email exists

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'dupe@example.com', password: 'Password123', name: 'Dupe' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('✗ [DESIGNED TO FAIL] missing password field returns 422', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', name: 'No Password' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('details');
    expect(res.body.details.some((d) => d.field === 'password')).toBe(true);
  });

  test('✗ [DESIGNED TO FAIL] weak password (< 8 chars) returns 422', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'user@example.com', password: 'short', name: 'Test' });

    expect(res.status).toBe(422);
  });

  test('✗ [DESIGNED TO FAIL] invalid email format returns 422', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'Password123', name: 'Test' });

    expect(res.status).toBe(422);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('✓ returns 200 and a JWT token on valid credentials', async () => {
    mockLoginCustomer();
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('✗ [DESIGNED TO FAIL] wrong password returns 401', async () => {
    mockLoginCustomer();
    bcrypt.compare.mockResolvedValueOnce(false); // wrong password

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('✗ [DESIGNED TO FAIL] nonexistent user returns 401 (not 404 — avoids enumeration)', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // no user found
    bcrypt.compare.mockResolvedValueOnce(false);   // timing-safe compare still runs

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'Password123' });

    expect(res.status).toBe(401); // 401, NOT 404
  });

  test('✗ [DESIGNED TO FAIL] missing email returns 422', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password123' });

    expect(res.status).toBe(422);
  });
});

// ─── Protected route guard ───────────────────────────────────────────────────

describe('JWT guard on protected routes', () => {
  test('✗ [DESIGNED TO FAIL] GET /api/pipelines without token returns 401', async () => {
    const res = await request(app).get('/api/pipelines');
    expect(res.status).toBe(401);
  });

  test('✗ [DESIGNED TO FAIL] GET /api/pipelines with malformed token returns 401', async () => {
    const res = await request(app)
      .get('/api/pipelines')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt');
    expect(res.status).toBe(401);
  });

  test('✗ [DESIGNED TO FAIL] GET /api/events without token returns 401', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
  });
});
