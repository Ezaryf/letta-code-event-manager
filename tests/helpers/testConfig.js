/**
 * @fileoverview Test configuration and helpers for property-based testing
 * @module tests/helpers/testConfig
 */

import fc from 'fast-check';

/**
 * Default fast-check configuration
 * Minimum 100 iterations per property test as per design requirements
 */
export const propertyTestConfig = {
  numRuns: 100,
  verbose: false,
  endOnFailure: true
};

/**
 * Extended configuration for more thorough testing
 */
export const extendedPropertyTestConfig = {
  numRuns: 500,
  verbose: false,
  endOnFailure: true
};

/**
 * Quick configuration for development/debugging
 */
export const quickPropertyTestConfig = {
  numRuns: 10,
  verbose: true,
  endOnFailure: true
};

// ============================================================================
// Custom Arbitraries for IDE Collaboration
// ============================================================================

/**
 * Arbitrary for IDE types
 */
export const ideTypeArb = fc.constantFrom('kiro', 'cursor', 'windsurf', 'antigravity', 'unknown');

/**
 * Arbitrary for collaboration modes
 */
export const collaborationModeArb = fc.constantFrom('passive', 'active', 'independent');

/**
 * Arbitrary for suggestion types
 */
export const suggestionTypeArb = fc.constantFrom('fix', 'improvement', 'warning');

/**
 * Arbitrary for fix action types
 */
export const fixActionTypeArb = fc.constantFrom('replace', 'insert', 'delete');

/**
 * Arbitrary for confidence scores (0.0 - 1.0)
 */
export const confidenceArb = fc.float({ min: 0, max: 1, noNaN: true });

/**
 * Arbitrary for file paths (simplified)
 */
export const filePathArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-./'.split('')),
  { minLength: 1, maxLength: 100 }
).filter(s => !s.startsWith('/') && !s.includes('..') && s.length > 0);

/**
 * Arbitrary for non-empty strings
 */
export const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 200 });

/**
 * Arbitrary for suggestion data
 */
export const suggestionDataArb = fc.record({
  file: filePathArb,
  type: suggestionTypeArb,
  confidence: confidenceArb,
  description: nonEmptyStringArb,
  context: fc.record({
    framework: fc.option(fc.constantFrom('React', 'Vue', 'Angular', 'Node')),
    relatedFiles: fc.array(filePathArb, { maxLength: 5 }),
    errorType: fc.option(nonEmptyStringArb)
  })
});

/**
 * Arbitrary for fix actions
 */
export const fixActionArb = fc.record({
  action: fixActionTypeArb,
  search: fc.option(nonEmptyStringArb),
  replace: fc.option(nonEmptyStringArb),
  line: fc.option(fc.integer({ min: 1, max: 10000 }))
});

/**
 * Arbitrary for collaboration config
 */
export const collaborationConfigArb = fc.record({
  collaboration: fc.record({
    mode: collaborationModeArb,
    autoDetect: fc.boolean(),
    preferIDE: fc.boolean(),
    suggestionFormat: fc.constantFrom('json', 'markdown')
  }),
  lockTimeout: fc.integer({ min: 1000, max: 120000 }),
  suggestionRetention: fc.integer({ min: 3600000, max: 604800000 })
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a temporary test directory
 * @param {string} basePath - Base path for the test directory
 * @returns {string} Path to the created directory
 */
export function createTestDir(basePath) {
  const fs = require('fs');
  const path = require('path');
  const testDir = path.join(basePath, `.test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Cleans up a test directory
 * @param {string} testDir - Path to the test directory
 */
export function cleanupTestDir(testDir) {
  const fs = require('fs');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

export default {
  propertyTestConfig,
  extendedPropertyTestConfig,
  quickPropertyTestConfig,
  ideTypeArb,
  collaborationModeArb,
  suggestionTypeArb,
  fixActionTypeArb,
  confidenceArb,
  filePathArb,
  nonEmptyStringArb,
  suggestionDataArb,
  fixActionArb,
  collaborationConfigArb,
  createTestDir,
  cleanupTestDir
};
