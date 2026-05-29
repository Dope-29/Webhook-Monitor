/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Set test env vars before any module loads
  setupFiles: ['./tests/setup.js'],
  // Increase timeout for integration tests that call bcrypt
  testTimeout: 15000,
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  // Run all tests in the SAME process — avoids child-process OOM on memory-constrained machines
  runInBand: true,
  maxWorkers: 1,
};
