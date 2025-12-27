/**
 * @fileoverview Verification that fast-check is properly configured
 * Feature: ide-collaboration, Setup: fast-check framework verification
 */

import fc from 'fast-check';
import { propertyTestConfig, ideTypeArb, collaborationModeArb } from '../helpers/testConfig.js';

describe('Fast-Check Setup Verification', () => {
  test('fast-check should be importable and functional', () => {
    expect(fc).toBeDefined();
    expect(typeof fc.assert).toBe('function');
    expect(typeof fc.property).toBe('function');
  });

  test('property test should run with configured iterations', () => {
    let runCount = 0;
    
    fc.assert(
      fc.property(fc.integer(), (n) => {
        runCount++;
        return typeof n === 'number';
      }),
      propertyTestConfig
    );
    
    expect(runCount).toBeGreaterThanOrEqual(100);
  });

  test('custom arbitraries should generate valid values', () => {
    fc.assert(
      fc.property(ideTypeArb, (ideType) => {
        const validTypes = ['kiro', 'cursor', 'windsurf', 'antigravity', 'unknown'];
        return validTypes.includes(ideType);
      }),
      propertyTestConfig
    );
  });

  test('collaboration mode arbitrary should generate valid modes', () => {
    fc.assert(
      fc.property(collaborationModeArb, (mode) => {
        const validModes = ['passive', 'active', 'independent'];
        return validModes.includes(mode);
      }),
      propertyTestConfig
    );
  });
});
