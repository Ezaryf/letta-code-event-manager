# Implementation Plan: IDE Collaboration

## Overview

This implementation plan transforms the IDE collaboration design into discrete coding tasks. The approach is incremental: first establishing core infrastructure, then building detection and coordination components, and finally integrating everything into the existing file watcher system.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - Create `src/core/` directory structure
  - Define TypeScript-style JSDoc interfaces for all components
  - Set up fast-check testing framework
  - _Requirements: All_

- [x] 2. Implement IDE Coordinator
  - [x] 2.1 Create `src/core/ideCoordinator.js` with IDE detection logic
    - Implement `detectIDE()` to scan for .kiro, .cursor, .windsurf, .antigravity folders
    - Implement `isIDEActive()` to check for running IDE processes
    - Implement `getCollaborationMode()` and `setCollaborationMode()`
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 2.2 Write property test for IDE detection
    - **Property 1: IDE Detection Enables Correct Mode**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**

  - [x] 2.3 Implement status broadcasting in IDE Coordinator
    - Implement `broadcastStatus()` to write `.letta/status.json`
    - Implement `onIDEActivity()` callback for IDE status changes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.4 Write property test for status broadcasting
    - **Property 6: Status Broadcasting Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 3. Implement Lock Manager
  - [x] 3.1 Create `src/core/lockManager.js` with lock operations
    - Implement `acquireLock()` to create `.letta.lock` file
    - Implement `releaseLock()` to remove lock file
    - Implement `isLocked()` to check lock status
    - _Requirements: 2.4_

  - [x] 3.2 Implement IDE lock watching
    - Implement `watchIDELocks()` to monitor `.kiro/agent.lock`, `.cursor/agent.lock`
    - Implement `onIDELockChange()` callback
    - Implement `yieldToIDE()` for conflict resolution
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 3.3 Write property test for lock coordination
    - **Property 2: Lock File Coordination**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [-] 4. Implement Suggestion Manager
  - [x] 4.1 Create `src/core/suggestionManager.js` with suggestion operations
    - Implement `createSuggestion()` to write to `.letta/suggestions/`
    - Implement `markConsumed()` to update suggestion status
    - Implement `getPendingSuggestions()` to list unconsumed suggestions
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 4.2 Write property test for suggestion format
    - **Property 3: Suggestion Format Validity**
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [x] 4.3 Implement suggestion consumption tracking
    - Watch for external reads of suggestion files
    - Mark suggestions as consumed when accessed
    - _Requirements: 3.3_

  - [x] 4.4 Write property test for suggestion consumption
    - **Property 4: Suggestion Consumption Round-Trip**
    - **Validates: Requirements 3.3**

  - [-] 4.5 Implement suggestion cleanup
    - Implement `cleanupOldSuggestions()` to remove old suggestions
    - _Requirements: 3.1_

- [ ] 5. Implement Config Manager
  - [ ] 5.1 Create `src/core/configManager.js` with config operations
    - Implement `loadConfig()` to read `.letta/config.json`
    - Implement `saveConfig()` to write config
    - Implement `getEffectiveConfig()` to merge global + local
    - _Requirements: 6.1, 6.5_

  - [ ] 5.2 Write property test for config merging
    - **Property 7: Config Loading and Merging**
    - **Validates: Requirements 6.1, 6.5**

  - [ ] 5.3 Implement collaboration mode behavior
    - Handle "passive", "active", "independent" modes
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ] 5.4 Write property test for collaboration mode behavior
    - **Property 8: Collaboration Mode Behavior**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [ ] 6. Checkpoint - Core components complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Conflict Resolution
  - [ ] 7.1 Add conflict detection to Lock Manager
    - Detect concurrent modifications within lock timeout
    - Create backups of both versions
    - _Requirements: 7.1, 7.2_

  - [ ] 7.2 Implement conflict resolution logic
    - Prefer IDE agent's changes by default
    - Log conflicts for review
    - _Requirements: 7.4, 7.5_

  - [ ] 7.3 Write property test for conflict resolution
    - **Property 9: Conflict Detection and Resolution**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

- [ ] 8. Implement Kiro-Specific Integration
  - [ ] 8.1 Add Kiro steering file reading
    - Read `.kiro/steering/*.md` files
    - Incorporate into analysis context
    - _Requirements: 8.1, 8.2_

  - [ ] 8.2 Add Kiro spec file awareness
    - Read `.kiro/specs/` for context
    - Respect spec requirements in analysis
    - _Requirements: 8.2_

  - [ ] 8.3 Add Kiro hook coordination
    - Detect active hooks
    - Coordinate timing with hook execution
    - _Requirements: 8.3_

  - [ ] 8.4 Write property test for Kiro integration
    - **Property 10: Kiro Steering File Integration**
    - **Validates: Requirements 8.1, 8.2**

- [ ] 9. Integrate with File Watcher
  - [ ] 9.1 Update `scripts/assistant.js` to use IDE Coordinator
    - Initialize IDE Coordinator on startup
    - Display detected IDE in banner
    - _Requirements: 1.4_

  - [ ] 9.2 Update file processing to respect locks
    - Check locks before processing files
    - Queue analyses when IDE is editing
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 9.3 Update fix application to use Suggestion Manager
    - Create suggestions instead of direct fixes in collaboration mode
    - Support --force-fix flag to bypass
    - _Requirements: 3.1, 3.5_

  - [ ] 9.4 Write property test for force-fix bypass
    - **Property 5: Force-Fix Bypass**
    - **Validates: Requirements 3.5**

- [ ] 10. Update CLI Interface
  - [ ] 10.1 Add collaboration status to CLI menu
    - Show detected IDE and collaboration mode
    - Add option to change collaboration mode
    - _Requirements: 1.4, 6.1_

  - [ ] 10.2 Add suggestion viewer to CLI
    - List pending suggestions
    - Allow manual consumption/dismissal
    - _Requirements: 3.1, 3.3_

- [ ] 11. Checkpoint - Integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Final integration tests
  - [ ] 12.1 Write end-to-end collaboration flow test
    - Test full flow: detect IDE → create suggestion → consume
    - _Requirements: All_

  - [ ] 12.2 Write lock coordination flow test
    - Test: IDE lock → queue analysis → unlock → process
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 12.3 Write conflict resolution flow test
    - Test: concurrent edit → detect → backup → resolve
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

## Notes

- All tasks are required (comprehensive testing enabled)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses JavaScript (matching existing codebase)
- fast-check library will be used for property-based testing
