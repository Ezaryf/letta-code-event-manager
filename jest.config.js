/**
 * Jest configuration for Letta IDE Collaboration tests
 */
export default {
  // Use ES modules
  transform: {},
  
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.property.test.js'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  
  // Verbose output
  verbose: true,
  
  // Timeout for tests (property tests may take longer)
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Root directory
  rootDir: '.',
  
  // Module name mapper for ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
