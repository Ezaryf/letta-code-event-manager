/**
 * @fileoverview Property-based tests for IDE Coordinator
 * Feature: ide-collaboration, Property 1: IDE Detection Enables Correct Mode
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5
 */

import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { IDECoordinator } from '../../src/core/ideCoordinator.js';
import { propertyTestConfig, ideTypeArb, collaborationModeArb } from '../helpers/testConfig.js';

/**
 * Creates a temporary test directory
 * @returns {string} Path to the created directory
 */
function createTempDir() {
  const tempBase = os.tmpdir();
  const testDir = path.join(tempBase, `ide-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

describe('Property 1: IDE Detection Enables Correct Mode', () => {
  /**
   * Feature: ide-collaboration, Property 1: IDE Detection Enables Correct Mode
   * Validates: Requirements 1.1, 1.2, 1.3, 1.5
   * 
   * For any project directory with IDE indicators (.kiro/, .cursor/, .windsurf/, .antigravity/),
   * the system SHALL detect the IDE type and enable Collaboration_Mode.
   * For any project directory without IDE indicators, the system SHALL operate in standalone mode.
   */
  
  test('detects IDE when indicator folder exists and returns correct type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('kiro', 'cursor', 'windsurf', 'antigravity'),
        (ideType) => {
          const testDir = createTempDir();
          try {
            // Create IDE indicator folder
            const ideFolder = path.join(testDir, `.${ideType}`);
            fs.mkdirSync(ideFolder, { recursive: true });
            
            // Create coordinator and detect IDE
            const coordinator = new IDECoordinator(testDir);
            const detected = coordinator.detectIDE();
            
            // Verify IDE is detected with correct type
            return detected !== null && detected.type === ideType;
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('returns null when no IDE indicator exists (standalone mode)', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // Just need to run the test multiple times
        () => {
          const testDir = createTempDir();
          try {
            // No IDE folders created - empty project
            const coordinator = new IDECoordinator(testDir);
            const detected = coordinator.detectIDE();
            
            // Verify no IDE is detected (standalone mode)
            return detected === null;
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('detected IDE info contains required fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('kiro', 'cursor', 'windsurf', 'antigravity'),
        (ideType) => {
          const testDir = createTempDir();
          try {
            // Create IDE indicator folder
            const ideFolder = path.join(testDir, `.${ideType}`);
            fs.mkdirSync(ideFolder, { recursive: true });
            
            const coordinator = new IDECoordinator(testDir);
            const detected = coordinator.detectIDE();
            
            // Verify required fields exist
            return (
              detected !== null &&
              typeof detected.type === 'string' &&
              typeof detected.configPath === 'string' &&
              Array.isArray(detected.features)
            );
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('collaboration mode can be set and retrieved correctly', () => {
    fc.assert(
      fc.property(
        collaborationModeArb,
        (mode) => {
          const testDir = createTempDir();
          try {
            const coordinator = new IDECoordinator(testDir);
            coordinator.setCollaborationMode(mode);
            
            return coordinator.getCollaborationMode() === mode;
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('IDE detection priority: first found IDE wins', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(['kiro', 'cursor', 'windsurf', 'antigravity'], { minLength: 2, maxLength: 4 }),
        (ideTypes) => {
          const testDir = createTempDir();
          try {
            // Create multiple IDE folders
            for (const ideType of ideTypes) {
              const ideFolder = path.join(testDir, `.${ideType}`);
              fs.mkdirSync(ideFolder, { recursive: true });
            }
            
            const coordinator = new IDECoordinator(testDir);
            const detected = coordinator.detectIDE();
            
            // Should detect one of the created IDEs (first in scan order)
            return detected !== null && ideTypes.includes(detected.type);
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });
});
