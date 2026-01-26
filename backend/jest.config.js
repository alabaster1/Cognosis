/**
 * Jest Configuration for Cognosis Backend
 */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.js'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Coverage configuration
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
  ],

  // Coverage thresholds (can be adjusted as more tests are added)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Verbose output
  verbose: true,

  // Timeout for tests (10 seconds)
  testTimeout: 10000,

  // Setup files (if needed later)
  // setupFilesAfterEnv: ['./tests/setup.js'],

  // Clear mocks between tests
  clearMocks: true,

  // Report slow tests
  slowTestThreshold: 5000,
};
