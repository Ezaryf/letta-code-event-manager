# Requirements Document

## Introduction

This feature enables Letta Coding Assistant to detect and collaborate with agentic IDEs (like Kiro, Antigravity, Cursor, etc.) rather than conflicting with them. When an IDE agent is actively working on code, Letta should coordinate its analysis and fixes to complement the IDE's work, resulting in better outcomes through collaboration.

## Glossary

- **Letta_System**: The Letta Coding Assistant file watcher and auto-fix system
- **IDE_Agent**: An AI agent running within an IDE (Kiro, Antigravity, Cursor, Windsurf, etc.)
- **Collaboration_Mode**: A mode where Letta coordinates with the IDE agent instead of working independently
- **Lock_File**: A file indicating an IDE agent is actively modifying code
- **Analysis_Queue**: A queue of pending file analyses that waits for IDE agent completion
- **Suggestion_Mode**: Mode where Letta provides suggestions without auto-applying fixes

## Requirements

### Requirement 1: IDE Detection

**User Story:** As a developer, I want Letta to automatically detect when I'm using an agentic IDE, so that it can adjust its behavior accordingly.

#### Acceptance Criteria

1. WHEN Letta starts, THE Letta_System SHALL scan for known IDE indicators (process names, lock files, config files)
2. WHEN a Kiro workspace is detected (.kiro folder exists), THE Letta_System SHALL enable Collaboration_Mode
3. WHEN Cursor, Windsurf, or Antigravity indicators are found, THE Letta_System SHALL enable Collaboration_Mode
4. THE Letta_System SHALL display the detected IDE in the startup banner
5. WHEN no IDE is detected, THE Letta_System SHALL operate in standalone mode

### Requirement 2: Lock File Coordination

**User Story:** As a developer, I want Letta to respect when my IDE agent is actively editing files, so that they don't create conflicting changes.

#### Acceptance Criteria

1. WHEN an IDE agent creates a lock file (.kiro/agent.lock, .cursor/agent.lock), THE Letta_System SHALL pause auto-fix for affected files
2. WHILE a lock file exists for a file, THE Letta_System SHALL queue analysis instead of immediately processing
3. WHEN a lock file is removed, THE Letta_System SHALL process queued analyses
4. THE Letta_System SHALL create its own lock file (.letta.lock) when applying fixes
5. IF both systems attempt to lock the same file, THE Letta_System SHALL yield to the IDE agent

### Requirement 3: Suggestion-Only Mode

**User Story:** As a developer, I want Letta to provide suggestions to my IDE agent instead of directly modifying files, so that the IDE agent can incorporate them intelligently.

#### Acceptance Criteria

1. WHEN Collaboration_Mode is active, THE Letta_System SHALL write suggestions to a shared location (.letta/suggestions/)
2. THE Letta_System SHALL format suggestions in a structured JSON format readable by IDE agents
3. WHEN an IDE agent reads a suggestion, THE Letta_System SHALL mark it as consumed
4. THE Letta_System SHALL include confidence scores and context with each suggestion
5. WHEN the user explicitly requests auto-fix (--force-fix), THE Letta_System SHALL apply fixes directly

### Requirement 4: Collaborative Analysis

**User Story:** As a developer, I want Letta's analysis to complement my IDE agent's work, so that I get the best of both systems.

#### Acceptance Criteria

1. WHEN the IDE agent completes a change, THE Letta_System SHALL analyze the result and provide feedback
2. THE Letta_System SHALL share its project context analysis with IDE agents via .letta/context.json
3. WHEN Letta detects issues the IDE agent missed, THE Letta_System SHALL create a suggestion for the IDE
4. THE Letta_System SHALL track which issues were found by Letta vs IDE for learning
5. WHEN both systems agree on a fix, THE Letta_System SHALL mark it as high-confidence

### Requirement 5: Real-time Communication

**User Story:** As a developer, I want Letta and my IDE agent to communicate in real-time, so that they can coordinate effectively.

#### Acceptance Criteria

1. THE Letta_System SHALL watch for IDE agent activity via file system events
2. WHEN the IDE agent writes to .kiro/agent-status.json, THE Letta_System SHALL read and respond
3. THE Letta_System SHALL write its status to .letta/status.json for IDE agents to read
4. WHEN Letta starts analysis, THE Letta_System SHALL broadcast "analyzing" status
5. WHEN Letta completes analysis, THE Letta_System SHALL broadcast results summary

### Requirement 6: Configuration

**User Story:** As a developer, I want to configure how Letta collaborates with my IDE, so that I can customize the behavior.

#### Acceptance Criteria

1. THE Letta_System SHALL read collaboration settings from .letta/config.json
2. WHEN collaboration.mode is "passive", THE Letta_System SHALL only analyze without suggesting fixes
3. WHEN collaboration.mode is "active", THE Letta_System SHALL provide suggestions to IDE
4. WHEN collaboration.mode is "independent", THE Letta_System SHALL ignore IDE and work standalone
5. THE Letta_System SHALL allow per-project override of global collaboration settings

### Requirement 7: Conflict Resolution

**User Story:** As a developer, I want conflicts between Letta and my IDE agent to be resolved gracefully, so that my code doesn't get corrupted.

#### Acceptance Criteria

1. IF Letta and IDE agent both modify the same file simultaneously, THE Letta_System SHALL detect the conflict
2. WHEN a conflict is detected, THE Letta_System SHALL preserve both versions in .letta-backups/
3. THE Letta_System SHALL notify the user of conflicts via console output
4. WHEN resolving conflicts, THE Letta_System SHALL prefer the IDE agent's changes by default
5. THE Letta_System SHALL log all conflicts for later review

### Requirement 8: IDE-Specific Integrations

**User Story:** As a developer using Kiro, I want Letta to integrate deeply with Kiro's features, so that they work seamlessly together.

#### Acceptance Criteria

1. WHEN Kiro is detected, THE Letta_System SHALL read Kiro steering files for context
2. THE Letta_System SHALL respect Kiro spec files when analyzing related code
3. WHEN Kiro has active hooks, THE Letta_System SHALL coordinate with hook execution
4. THE Letta_System SHALL format suggestions compatible with Kiro's agent input
5. WHEN Kiro MCP servers are configured, THE Letta_System SHALL avoid duplicate functionality
