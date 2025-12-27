/**
 * @fileoverview Setup verification tests for IDE Collaboration core modules
 * Verifies that all core modules are properly structured and exportable.
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

describe('Core Module Setup', () => {
  describe('Module Exports', () => {
    test('should export IDECoordinator', async () => {
      const { IDECoordinator } = await import('../../src/core/index.js');
      expect(IDECoordinator).toBeDefined();
      expect(typeof IDECoordinator).toBe('function');
    });

    test('should export LockManager', async () => {
      const { LockManager } = await import('../../src/core/index.js');
      expect(LockManager).toBeDefined();
      expect(typeof LockManager).toBe('function');
    });

    test('should export SuggestionManager', async () => {
      const { SuggestionManager } = await import('../../src/core/index.js');
      expect(SuggestionManager).toBeDefined();
      expect(typeof SuggestionManager).toBe('function');
    });

    test('should export ConfigManager', async () => {
      const { ConfigManager } = await import('../../src/core/index.js');
      expect(ConfigManager).toBeDefined();
      expect(typeof ConfigManager).toBe('function');
    });

    test('should export TYPES_VERSION', async () => {
      const { TYPES_VERSION } = await import('../../src/core/index.js');
      expect(TYPES_VERSION).toBeDefined();
      expect(typeof TYPES_VERSION).toBe('string');
    });
  });

  describe('Directory Structure', () => {
    test('src/core directory should exist', () => {
      const corePath = path.join(projectRoot, 'src', 'core');
      expect(fs.existsSync(corePath)).toBe(true);
    });

    test('all core module files should exist', () => {
      const coreFiles = [
        'types.js',
        'ideCoordinator.js',
        'lockManager.js',
        'suggestionManager.js',
        'configManager.js',
        'index.js'
      ];

      for (const file of coreFiles) {
        const filePath = path.join(projectRoot, 'src', 'core', file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });

  describe('Class Instantiation', () => {
    const testDir = path.join(projectRoot, 'tests', '.test-workspace');

    beforeAll(() => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    test('IDECoordinator should be instantiable', async () => {
      const { IDECoordinator } = await import('../../src/core/index.js');
      const coordinator = new IDECoordinator(testDir);
      expect(coordinator).toBeInstanceOf(IDECoordinator);
      expect(coordinator.projectPath).toBe(testDir);
    });

    test('LockManager should be instantiable', async () => {
      const { LockManager } = await import('../../src/core/index.js');
      const manager = new LockManager(testDir);
      expect(manager).toBeInstanceOf(LockManager);
      expect(manager.projectPath).toBe(testDir);
    });

    test('SuggestionManager should be instantiable', async () => {
      const { SuggestionManager } = await import('../../src/core/index.js');
      const manager = new SuggestionManager(testDir);
      expect(manager).toBeInstanceOf(SuggestionManager);
      expect(manager.projectPath).toBe(testDir);
    });

    test('ConfigManager should be instantiable', async () => {
      const { ConfigManager } = await import('../../src/core/index.js');
      const manager = new ConfigManager(testDir);
      expect(manager).toBeInstanceOf(ConfigManager);
      expect(manager.projectPath).toBe(testDir);
    });
  });
});
