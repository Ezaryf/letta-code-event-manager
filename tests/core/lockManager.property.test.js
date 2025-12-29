/**
 * @fileoverview Property-based tests for Lock Manager
 * Feature: ide-collaboration, Property 2: Lock File Coordination
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LockManager } from '../../src/core/lockManager.js';
import { propertyTestConfig, filePathArb } from '../helpers/testConfig.js';

/**
 * Creates a temporary test directory
 * @returns {string} Path to the created directory
 */
function createTempDir() {
  const tempBase = os.tmpdir();
  const testDir = path.join(tempBase, `lock-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
 * Creates an IDE lock file
 * @param {string} testDir - Test directory
 * @param {string} ideType - IDE type (kiro, cursor, etc.)
 * @param {string[]} [files] - Optional files to lock
 */
function createIDELock(testDir, ideType, files = []) {
  const ideLockDir = path.join(testDir, `.${ideType}`);
  fs.mkdirSync(ideLockDir, { recursive: true });
  
  const lockData = {
    owner: ideType,
    pid: 99999,
    timestamp: new Date().toISOString(),
    files: files.map(f => ({
      path: f,
      operation: 'editing',
      since: new Date().toISOString()
    }))
  };
  
  fs.writeFileSync(
    path.join(ideLockDir, 'agent.lock'),
    JSON.stringify(lockData, null, 2)
  );
}

/**
 * Removes an IDE lock file
 * @param {string} testDir - Test directory
 * @param {string} ideType - IDE type
 */
function removeIDELock(testDir, ideType) {
  const lockPath = path.join(testDir, `.${ideType}`, 'agent.lock');
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}


describe('Property 2: Lock File Coordination', () => {
  /**
   * Feature: ide-collaboration, Property 2: Lock File Coordination
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   * 
   * For any file with an active IDE lock, the system SHALL:
   * - Pause auto-fix operations for that file (Req 2.1)
   * - Queue analysis requests instead of processing immediately (Req 2.2)
   * - Process queued analyses when the lock is removed (Req 2.3)
   * - Create its own lock file when applying fixes (Req 2.4)
   * - Yield to IDE agent if both attempt to lock simultaneously (Req 2.5)
   */

  describe('Requirement 2.1: Pause auto-fix when IDE lock exists', () => {
    test('acquireLock returns false when IDE has active lock', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kiro', 'cursor', 'windsurf', 'antigravity'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
          (ideType, fileName) => {
            const testDir = createTempDir();
            try {
              const filePath = `src/${fileName}.js`;
              
              // Create IDE lock
              createIDELock(testDir, ideType, [filePath]);
              
              // Try to acquire Letta lock
              const lockManager = new LockManager(testDir);
              const acquired = lockManager.acquireLock(filePath);
              
              // Should fail because IDE has lock
              return acquired === false;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('isLocked returns IDE lock info when IDE lock exists', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kiro', 'cursor', 'windsurf', 'antigravity'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
          (ideType, fileName) => {
            const testDir = createTempDir();
            try {
              const filePath = `src/${fileName}.js`;
              
              // Create IDE lock
              createIDELock(testDir, ideType, [filePath]);
              
              const lockManager = new LockManager(testDir);
              const lockInfo = lockManager.isLocked(filePath);
              
              // Should return IDE lock info
              return lockInfo !== null && lockInfo.owner === 'ide';
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });

  describe('Requirement 2.2: Queue analysis when IDE lock exists', () => {
    test('queueForAnalysis adds files to queue', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
            { minLength: 1, maxLength: 10 }
          ),
          (fileNames) => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              
              // Queue multiple files
              const filePaths = fileNames.map(f => `src/${f}.js`);
              for (const filePath of filePaths) {
                lockManager.queueForAnalysis(filePath);
              }
              
              const queue = lockManager.getQueue();
              
              // All unique files should be in queue
              const uniquePaths = [...new Set(filePaths)];
              return queue.length === uniquePaths.length &&
                     uniquePaths.every(p => queue.includes(p));
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('queueForAnalysis does not add duplicates', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
          fc.integer({ min: 2, max: 10 }),
          (fileName, repeatCount) => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              const filePath = `src/${fileName}.js`;
              
              // Queue same file multiple times
              for (let i = 0; i < repeatCount; i++) {
                lockManager.queueForAnalysis(filePath);
              }
              
              const queue = lockManager.getQueue();
              
              // Should only have one entry
              return queue.length === 1 && queue[0] === filePath;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });


  describe('Requirement 2.3: Process queued analyses when lock removed', () => {
    test('getAndClearQueue returns all queued files and clears queue', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
            { minLength: 1, maxLength: 10 }
          ),
          (fileNames) => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              
              // Queue files
              const filePaths = [...new Set(fileNames.map(f => `src/${f}.js`))];
              for (const filePath of filePaths) {
                lockManager.queueForAnalysis(filePath);
              }
              
              // Get and clear queue
              const retrieved = lockManager.getAndClearQueue();
              const afterClear = lockManager.getQueue();
              
              // Should return all files and clear queue
              return retrieved.length === filePaths.length &&
                     filePaths.every(p => retrieved.includes(p)) &&
                     afterClear.length === 0;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });

  describe('Requirement 2.4: Create lock file when applying fixes', () => {
    test('acquireLock creates .letta.lock file with correct format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
          fc.constantFrom('analyzing', 'fixing', 'testing'),
          (fileName, operation) => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              const filePath = `src/${fileName}.js`;
              
              // Acquire lock
              const acquired = lockManager.acquireLock(filePath, operation);
              
              if (!acquired) return false;
              
              // Check lock file exists and has correct format
              const lockFilePath = path.join(testDir, '.letta.lock');
              if (!fs.existsSync(lockFilePath)) return false;
              
              const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf-8'));
              
              return (
                lockData.owner === 'letta' &&
                typeof lockData.pid === 'number' &&
                typeof lockData.timestamp === 'string' &&
                Array.isArray(lockData.files) &&
                lockData.files.length === 1 &&
                lockData.files[0].path === filePath &&
                lockData.files[0].operation === operation
              );
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('releaseLock removes file from lock and deletes lock file when empty', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
          (fileName) => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              const filePath = `src/${fileName}.js`;
              
              // Acquire and release lock
              lockManager.acquireLock(filePath);
              lockManager.releaseLock(filePath);
              
              // Lock file should be removed
              const lockFilePath = path.join(testDir, '.letta.lock');
              return !fs.existsSync(lockFilePath);
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('isLocked returns Letta lock info when Letta has lock', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
          (fileName) => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              const filePath = `src/${fileName}.js`;
              
              // Acquire lock
              lockManager.acquireLock(filePath);
              
              const lockInfo = lockManager.isLocked(filePath);
              
              return lockInfo !== null && lockInfo.owner === 'letta';
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });


  describe('Requirement 2.5: Yield to IDE on simultaneous lock attempts', () => {
    test('yieldToIDE releases Letta lock', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
          (fileName) => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              const filePath = `src/${fileName}.js`;
              
              // Acquire lock first
              lockManager.acquireLock(filePath);
              
              // Yield to IDE
              lockManager.yieldToIDE(filePath);
              
              // Lock should be released
              const lockInfo = lockManager.isLocked(filePath);
              return lockInfo === null;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('acquireLock fails when IDE lock exists (yield behavior)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kiro', 'cursor', 'windsurf', 'antigravity'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
          (ideType, fileName) => {
            const testDir = createTempDir();
            try {
              const filePath = `src/${fileName}.js`;
              
              // Create IDE lock first
              createIDELock(testDir, ideType, [filePath]);
              
              const lockManager = new LockManager(testDir);
              
              // Letta should not be able to acquire lock (yields to IDE)
              const acquired = lockManager.acquireLock(filePath);
              
              return acquired === false;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('hasIDELock returns true when any IDE lock exists', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kiro', 'cursor', 'windsurf', 'antigravity'),
          (ideType) => {
            const testDir = createTempDir();
            try {
              // Create IDE lock
              createIDELock(testDir, ideType, []);
              
              const lockManager = new LockManager(testDir);
              
              return lockManager.hasIDELock() === true;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('hasIDELock returns false when no IDE lock exists', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              
              return lockManager.hasIDELock() === false;
            } finally {
              cleanupDir(testDir);
            }
          }
        ),
        propertyTestConfig
      );
    });
  });

  describe('Lock file round-trip consistency', () => {
    test('acquire then release leaves no lock', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
            { minLength: 1, maxLength: 5 }
          ),
          (fileNames) => {
            const testDir = createTempDir();
            try {
              const lockManager = new LockManager(testDir);
              const filePaths = [...new Set(fileNames.map(f => `src/${f}.js`))];
              
              // Acquire locks for all files
              for (const filePath of filePaths) {
                lockManager.acquireLock(filePath);
              }
              
              // Release all locks
              for (const filePath of filePaths) {
                lockManager.releaseLock(filePath);
              }
              
              // No locks should remain
              const lockFilePath = path.join(testDir, '.letta.lock');
              return !fs.existsSync(lockFilePath);
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
