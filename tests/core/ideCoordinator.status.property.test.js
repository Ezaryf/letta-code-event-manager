/**
 * @fileoverview Property-based tests for IDE Coordinator Status Broadcasting
 * Feature: ide-collaboration, Property 6: Status Broadcasting Consistency
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { IDECoordinator } from '../../src/core/ideCoordinator.js';
import { propertyTestConfig } from '../helpers/testConfig.js';

/**
 * Creates a temporary test directory
 * @returns {string} Path to the created directory
 */
function createTempDir() {
  const tempBase = os.tmpdir();
  const testDir = path.join(tempBase, `status-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
 * Arbitrary for status states
 */
const statusStateArb = fc.constantFrom('idle', 'analyzing', 'fixing');

/**
 * Arbitrary for file paths
 */
const filePathArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-./'.split('')),
  { minLength: 1, maxLength: 50 }
).filter(s => !s.startsWith('/') && !s.includes('..') && s.length > 0);

describe('Property 6: Status Broadcasting Consistency', () => {
  /**
   * Feature: ide-collaboration, Property 6: Status Broadcasting Consistency
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   * 
   * For any status update written to .letta/status.json, the status SHALL:
   * - Reflect the current operation state ("idle", "analyzing", "fixing")
   * - Include timestamp within 1 second of actual state change
   * - Include current file being processed (if any)
   * - Include session statistics
   */

  test('status file reflects current operation state', () => {
    fc.assert(
      fc.property(
        statusStateArb,
        (status) => {
          const testDir = createTempDir();
          try {
            const coordinator = new IDECoordinator(testDir);
            coordinator.broadcastStatus(status);
            
            // Read the status file
            const statusPath = path.join(testDir, '.letta', 'status.json');
            const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
            
            return statusData.status === status;
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('status file includes timestamp within 1 second of broadcast', () => {
    fc.assert(
      fc.property(
        statusStateArb,
        (status) => {
          const testDir = createTempDir();
          try {
            const beforeTime = Date.now();
            const coordinator = new IDECoordinator(testDir);
            coordinator.broadcastStatus(status);
            const afterTime = Date.now();
            
            // Read the status file
            const statusPath = path.join(testDir, '.letta', 'status.json');
            const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
            const statusTime = new Date(statusData.timestamp).getTime();
            
            // Timestamp should be within the broadcast window (plus 1 second tolerance)
            return statusTime >= beforeTime - 1000 && statusTime <= afterTime + 1000;
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('status file includes current file when provided', () => {
    fc.assert(
      fc.property(
        statusStateArb,
        filePathArb,
        (status, currentFile) => {
          const testDir = createTempDir();
          try {
            const coordinator = new IDECoordinator(testDir);
            coordinator.broadcastStatus(status, currentFile);
            
            // Read the status file
            const statusPath = path.join(testDir, '.letta', 'status.json');
            const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
            
            return statusData.currentFile === currentFile;
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('status file includes session statistics', () => {
    fc.assert(
      fc.property(
        statusStateArb,
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 30 }),
        (status, analyzed, issues, suggestions) => {
          const testDir = createTempDir();
          try {
            const coordinator = new IDECoordinator(testDir);
            
            // Update stats before broadcasting
            for (let i = 0; i < analyzed; i++) coordinator.updateStats('analyzed');
            for (let i = 0; i < issues; i++) coordinator.updateStats('issues');
            for (let i = 0; i < suggestions; i++) coordinator.updateStats('suggestions');
            
            coordinator.broadcastStatus(status);
            
            // Read the status file
            const statusPath = path.join(testDir, '.letta', 'status.json');
            const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
            
            return (
              statusData.sessionStats !== undefined &&
              statusData.sessionStats.analyzed === analyzed &&
              statusData.sessionStats.issues === issues &&
              statusData.sessionStats.suggestions === suggestions
            );
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('status file includes queue length', () => {
    fc.assert(
      fc.property(
        statusStateArb,
        fc.integer({ min: 0, max: 20 }),
        (status, queueSize) => {
          const testDir = createTempDir();
          try {
            const coordinator = new IDECoordinator(testDir);
            
            // Add items to queue
            for (let i = 0; i < queueSize; i++) {
              coordinator.incrementQueue();
            }
            
            coordinator.broadcastStatus(status);
            
            // Read the status file
            const statusPath = path.join(testDir, '.letta', 'status.json');
            const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
            
            return statusData.queueLength === queueSize;
          } finally {
            cleanupDir(testDir);
          }
        }
      ),
      propertyTestConfig
    );
  });

  test('status file is valid JSON with required fields', () => {
    fc.assert(
      fc.property(
        statusStateArb,
        fc.option(filePathArb),
        (status, currentFile) => {
          const testDir = createTempDir();
          try {
            const coordinator = new IDECoordinator(testDir);
            coordinator.broadcastStatus(status, currentFile || undefined);
            
            // Read the status file
            const statusPath = path.join(testDir, '.letta', 'status.json');
            const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
            
            // Verify all required fields exist
            return (
              typeof statusData.status === 'string' &&
              typeof statusData.timestamp === 'string' &&
              typeof statusData.queueLength === 'number' &&
              typeof statusData.sessionStats === 'object' &&
              typeof statusData.sessionStats.analyzed === 'number' &&
              typeof statusData.sessionStats.issues === 'number' &&
              typeof statusData.sessionStats.suggestions === 'number'
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
