'use strict';

/**
 * Unit Tests: Retention Service
 *
 * DB is fully mocked — no PostgreSQL required.
 * Tests cover:
 *   ✓ Passing: deletes expired records, writes audit log per customer
 *   ✓ Passing: skips delete when no expired records
 *   ✗ Designed to fail: DB error propagates (service re-throws)
 */

jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../src/services/loggerservice', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const db = require('../../src/config/database');
const { runRetentionCleanup } = require('../../src/services/retentionservice');

afterEach(() => jest.clearAllMocks());

describe('runRetentionCleanup', () => {
  test('✓ returns 0 and skips DELETE when no expired webhooks', async () => {
    // First query: GROUP BY → empty
    db.query.mockResolvedValueOnce({ rows: [] });

    const deleted = await runRetentionCleanup();

    expect(deleted).toBe(0);
    expect(db.query).toHaveBeenCalledTimes(1); // only the GROUP BY, no DELETE
  });

  test('✓ deletes records and inserts audit log per customer', async () => {
    // Query 1: GROUP BY → 2 customers with expired records
    db.query.mockResolvedValueOnce({
      rows: [
        { customer_id: 'cust-A', count: '15' },
        { customer_id: 'cust-B', count: '7' },
      ],
    });
    // Query 2: DELETE → 22 rows affected
    db.query.mockResolvedValueOnce({ rowCount: 22 });
    // Queries 3 & 4: INSERT audit_logs for each customer
    db.query.mockResolvedValue({ rows: [] });

    const deleted = await runRetentionCleanup();

    expect(deleted).toBe(22);
    // Total calls: 1 GROUP BY + 1 DELETE + 2 audit INSERTs = 4
    expect(db.query).toHaveBeenCalledTimes(4);

    // Verify audit log was written for each customer
    const auditCalls = db.query.mock.calls.filter((c) => c[0].includes('INSERT INTO audit_logs'));
    expect(auditCalls.length).toBe(2);
    expect(auditCalls[0][1][0]).toBe('cust-A');
    expect(auditCalls[1][1][0]).toBe('cust-B');
  });

  test('✓ audit log message contains deleted count', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ customer_id: 'cust-X', count: '42' }] })
      .mockResolvedValueOnce({ rowCount: 42 })
      .mockResolvedValue({ rows: [] });

    await runRetentionCleanup();

    const auditCall = db.query.mock.calls.find((c) => c[0].includes('INSERT INTO audit_logs'));
    expect(auditCall[1][2]).toContain('42'); // details string contains the count
  });

  test('✗ [DESIGNED TO FAIL] DB error propagates out of runRetentionCleanup', async () => {
    db.query.mockRejectedValueOnce(new Error('DB connection lost'));
    await expect(runRetentionCleanup()).rejects.toThrow('DB connection lost');
  });
});
