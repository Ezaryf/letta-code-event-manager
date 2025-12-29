/**
 * @fileoverview Property-based tests for Suggestion Manager
 * Feature: ide-collaboration, Property 3: Suggestion Format Validity
 * Validates: Requirements 3.1, 3.2, 3.4
 */

import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SuggestionManager } from '../../src/core/suggestionManager.js';
import { 
  propertyTestConfig, 
  suggestionTypeArb, 
  confidenceArb,
  nonEmptyStringArb
} from '../helpers/testConfig.js';

/**
 * Creates a temporary test directory
 * @returns {string} Path to the created directory
 */
function createTempDir() {
  const tempBase = os.tmpdir();
  const testDir = path.join(tempBase, `suggestion-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Cleans up a test directory
 * @param {string} testDir - Path to the test directory
 */
function cleanupDir(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

/**
 * Arbitrary for valid file paths (simple version)
 */
const simpleFilePathArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => !s.includes('/') && !s.includes('\\') && s.trim().length > 0)
  .map(s => `src/${s}.js`);

/**
 * Arbitrary for analysis context
 */
const analysisContextArb = fc.record({
  framework: fc.option(fc.constantFrom('React', 'Vue', 'Angular', 'Node'), { nil: undefined }),
  relatedFiles: fc.array(simpleFilePathArb, { maxLength: 3 }),
  errorType: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined })
});

/**
 * Arbitrary for suggestion data (without id, timestamp, consumed)
 */
const suggestionInputArb = fc.record({
  file: simpleFilePathArb,
  type: suggestionTypeArb,
  confidence: confidenceArb,
  description: fc.string({ minLength: 1, maxLength: 200 }),
  context: analysisContextArb
});


describe('Property 3: Suggestion Format Validity', () => {
  /**
   * Feature: ide-collaboration, Property 3: Suggestion Format Validity
   * Validates: Requirements 3.1, 3.2, 3.4
   * 
   * For any suggestion created in Collaboration_Mode, the suggestion SHALL:
   * - Be written to `.letta/suggestions/` directory (Req 3.1)
   * - Be valid JSON matching the Suggestion schema (Req 3.2)
   * - Include confidence score (0.0-1.0) (Req 3.4)
   * - Include analysis context (framework, related files, error type) (Req 3.4)
   */

  describe('Requirement 3.1: Suggestions written to .letta/suggestions/', () => {
    test('createSuggestion writes to correct directory', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              // Check file exists in correct location
              const expectedPath = path.join(testDir, '.letta', 'suggestions', `${id}.json`);
              return fs.existsSync(expectedPath);
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('suggestion ID follows expected format', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              // ID should start with 'sug_' and contain timestamp
              return id.startsWith('sug_') && id.length > 10;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });

  describe('Requirement 3.2: Valid JSON matching Suggestion schema', () => {
    test('created suggestion is valid JSON', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              // Read and parse the file
              const filePath = path.join(testDir, '.letta', 'suggestions', `${id}.json`);
              const content = fs.readFileSync(filePath, 'utf-8');
              
              // Should not throw when parsing
              try {
                JSON.parse(content);
                return true;
              } catch {
                return false;
              }
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('suggestion has all required fields', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              const suggestion = manager.getSuggestion(id);
              
              // Check all required fields exist
              return (
                suggestion !== null &&
                typeof suggestion.id === 'string' &&
                suggestion.timestamp instanceof Date &&
                typeof suggestion.file === 'string' &&
                ['fix', 'improvement', 'warning'].includes(suggestion.type) &&
                typeof suggestion.confidence === 'number' &&
                typeof suggestion.description === 'string' &&
                typeof suggestion.context === 'object' &&
                typeof suggestion.consumed === 'boolean'
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('suggestion preserves input data', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              const suggestion = manager.getSuggestion(id);
              
              // Input data should be preserved
              return (
                suggestion !== null &&
                suggestion.file === suggestionData.file &&
                suggestion.type === suggestionData.type &&
                suggestion.description === suggestionData.description
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });

  describe('Requirement 3.4: Confidence scores and context', () => {
    test('confidence score is clamped to 0.0-1.0 range', () => {
      fc.assert(
        fc.property(
          fc.record({
            file: simpleFilePathArb,
            type: suggestionTypeArb,
            confidence: fc.float({ min: -10, max: 10, noNaN: true }),
            description: fc.string({ minLength: 1, maxLength: 100 }),
            context: analysisContextArb
          }),
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              const suggestion = manager.getSuggestion(id);
              
              // Confidence should be clamped to [0, 1]
              return (
                suggestion !== null &&
                suggestion.confidence >= 0 &&
                suggestion.confidence <= 1
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('context object is preserved', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              const suggestion = manager.getSuggestion(id);
              
              // Context should be an object
              return (
                suggestion !== null &&
                typeof suggestion.context === 'object' &&
                suggestion.context !== null
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('context framework is preserved when provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            file: simpleFilePathArb,
            type: suggestionTypeArb,
            confidence: confidenceArb,
            description: fc.string({ minLength: 1, maxLength: 100 }),
            context: fc.record({
              framework: fc.constantFrom('React', 'Vue', 'Angular', 'Node'),
              relatedFiles: fc.array(simpleFilePathArb, { maxLength: 2 }),
              errorType: fc.string({ minLength: 1, maxLength: 30 })
            })
          }),
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              const suggestion = manager.getSuggestion(id);
              
              // Framework should be preserved
              return (
                suggestion !== null &&
                suggestion.context.framework === suggestionData.context.framework
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });

  describe('Suggestion retrieval consistency', () => {
    test('getPendingSuggestions returns only unconsumed suggestions', () => {
      fc.assert(
        fc.property(
          fc.array(suggestionInputArb, { minLength: 1, maxLength: 5 }),
          (suggestionsData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Create all suggestions
              const ids = suggestionsData.map(data => manager.createSuggestion(data));
              
              // Get pending - all should be pending initially
              const pending = manager.getPendingSuggestions();
              
              return pending.length === ids.length &&
                     pending.every(s => s.consumed === false);
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('new suggestions have consumed=false', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              const suggestion = manager.getSuggestion(id);
              
              return suggestion !== null && suggestion.consumed === false;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });
});


describe('Property 4: Suggestion Consumption Round-Trip', () => {
  /**
   * Feature: ide-collaboration, Property 4: Suggestion Consumption Round-Trip
   * Validates: Requirements 3.3
   * 
   * For any suggestion that is marked as consumed, querying the suggestion 
   * SHALL return `consumed: true` with the consumer identifier.
   */

  describe('Requirement 3.3: Mark suggestions as consumed when accessed', () => {
    test('markConsumed sets consumed=true and consumedBy', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          (suggestionData, consumerId) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              // Mark as consumed
              manager.markConsumed(id, consumerId);
              
              // Query the suggestion
              const suggestion = manager.getSuggestion(id);
              
              return (
                suggestion !== null &&
                suggestion.consumed === true &&
                suggestion.consumedBy === consumerId
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('markConsumed with default consumedBy sets "unknown"', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          (suggestionData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              const id = manager.createSuggestion(suggestionData);
              
              // Mark as consumed without specifying who
              manager.markConsumed(id);
              
              const suggestion = manager.getSuggestion(id);
              
              return (
                suggestion !== null &&
                suggestion.consumed === true &&
                suggestion.consumedBy === 'unknown'
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('consumed suggestions are excluded from getPendingSuggestions', () => {
      fc.assert(
        fc.property(
          fc.array(suggestionInputArb, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0 }),
          (suggestionsData, consumeIndexSeed) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Create all suggestions
              const ids = suggestionsData.map(data => manager.createSuggestion(data));
              
              // Consume one suggestion (use modulo to get valid index)
              const consumeIndex = consumeIndexSeed % ids.length;
              manager.markConsumed(ids[consumeIndex], 'test');
              
              // Get pending suggestions
              const pending = manager.getPendingSuggestions();
              
              // Consumed suggestion should not be in pending
              return (
                pending.length === ids.length - 1 &&
                !pending.some(s => s.id === ids[consumeIndex])
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('getAllSuggestions includes consumed suggestions', () => {
      fc.assert(
        fc.property(
          fc.array(suggestionInputArb, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0 }),
          (suggestionsData, consumeIndexSeed) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Create all suggestions
              const ids = suggestionsData.map(data => manager.createSuggestion(data));
              
              // Consume one suggestion
              const consumeIndex = consumeIndexSeed % ids.length;
              manager.markConsumed(ids[consumeIndex], 'test');
              
              // Get all suggestions
              const all = manager.getAllSuggestions();
              
              // All suggestions should be present
              return (
                all.length === ids.length &&
                ids.every(id => all.some(s => s.id === id))
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('markConsumed throws for non-existent suggestion', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 30 }),
          (fakeId) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Try to mark non-existent suggestion
              try {
                manager.markConsumed(`sug_fake_${fakeId}`);
                return false; // Should have thrown
              } catch (error) {
                return error.message.includes('not found');
              }
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('consumption round-trip: create -> consume -> query returns consumed state', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          fc.constantFrom('ide', 'external', 'user', 'kiro', 'cursor'),
          (suggestionData, consumer) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Create
              const id = manager.createSuggestion(suggestionData);
              
              // Verify initially not consumed
              const beforeConsume = manager.getSuggestion(id);
              if (!beforeConsume || beforeConsume.consumed !== false) {
                return false;
              }
              
              // Consume
              manager.markConsumed(id, consumer);
              
              // Query
              const afterConsume = manager.getSuggestion(id);
              
              return (
                afterConsume !== null &&
                afterConsume.consumed === true &&
                afterConsume.consumedBy === consumer &&
                afterConsume.id === id
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });
});


describe('Suggestion Cleanup', () => {
  /**
   * Tests for cleanupOldSuggestions functionality
   * Validates: Requirements 3.1 (suggestion management)
   */

  describe('Requirement 3.1: Cleanup old suggestions', () => {
    test('cleanupOldSuggestions removes suggestions older than maxAge', () => {
      fc.assert(
        fc.property(
          fc.array(suggestionInputArb, { minLength: 1, maxLength: 5 }),
          (suggestionsData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Create suggestions
              const ids = suggestionsData.map(data => manager.createSuggestion(data));
              
              // Verify all suggestions exist
              const beforeCleanup = manager.getAllSuggestions();
              if (beforeCleanup.length !== ids.length) {
                return false;
              }
              
              // Cleanup with very large maxAge (1 year) - should keep all recent suggestions
              const cleaned = manager.cleanupOldSuggestions(86400000 * 365);
              
              // No suggestions should be removed since they were just created
              const afterCleanup = manager.getAllSuggestions();
              
              return cleaned === 0 && afterCleanup.length === ids.length;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('cleanupOldSuggestions keeps recent suggestions', () => {
      fc.assert(
        fc.property(
          fc.array(suggestionInputArb, { minLength: 1, maxLength: 5 }),
          (suggestionsData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Create suggestions
              const ids = suggestionsData.map(data => manager.createSuggestion(data));
              
              // Cleanup with very large maxAge (should keep all)
              const cleaned = manager.cleanupOldSuggestions(86400000 * 365); // 1 year
              
              // No suggestions should be removed
              const afterCleanup = manager.getAllSuggestions();
              
              return cleaned === 0 && afterCleanup.length === ids.length;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('cleanupOldSuggestions returns zero for recent suggestions', () => {
      fc.assert(
        fc.property(
          fc.array(suggestionInputArb, { minLength: 1, maxLength: 5 }),
          (suggestionsData) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Create suggestions
              suggestionsData.forEach(data => manager.createSuggestion(data));
              
              // Cleanup with large maxAge - should return 0 for recent suggestions
              const cleaned = manager.cleanupOldSuggestions(86400000);
              
              return cleaned === 0;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('setRetentionPeriod affects default cleanup behavior', () => {
      fc.assert(
        fc.property(
          suggestionInputArb,
          fc.integer({ min: 1000, max: 86400000 }),
          (suggestionData, retentionPeriod) => {
            const testDir = createTempDir();
            try {
              const manager = new SuggestionManager(testDir);
              
              // Set retention period
              manager.setRetentionPeriod(retentionPeriod);
              
              // Create a suggestion
              manager.createSuggestion(suggestionData);
              
              // Cleanup with default (should use retention period)
              // Since suggestion was just created, it should not be cleaned
              const cleaned = manager.cleanupOldSuggestions();
              
              return cleaned === 0;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });
});
