/**
 * @fileoverview TypeScript-style JSDoc type definitions for IDE Collaboration
 * These types define the interfaces for all components in the IDE collaboration system.
 */

// ============================================================================
// IDE Coordinator Types
// ============================================================================

/**
 * @typedef {'kiro' | 'cursor' | 'windsurf' | 'antigravity' | 'unknown'} IDEType
 */

/**
 * @typedef {Object} IDEInfo
 * @property {IDEType} type - The type of IDE detected
 * @property {string} [version] - Optional version of the IDE
 * @property {string} configPath - Path to the IDE configuration
 * @property {string[]} features - List of features supported by the IDE
 */

/**
 * @typedef {'passive' | 'active' | 'independent'} CollaborationModeType
 */

/**
 * @typedef {Object} CollaborationStatus
 * @property {CollaborationModeType} mode - Current collaboration mode
 * @property {IDEInfo | null} ideDetected - Detected IDE information or null
 * @property {boolean} isIDEEditing - Whether the IDE is currently editing
 * @property {number} queuedAnalyses - Number of queued analyses
 * @property {Date} lastSync - Last synchronization timestamp
 */

/**
 * @typedef {Object} IDEActivity
 * @property {IDEType} ide - The IDE that triggered the activity
 * @property {string} action - The action performed
 * @property {string} [file] - Optional file involved in the activity
 * @property {Date} timestamp - When the activity occurred
 */

// ============================================================================
// Lock Manager Types
// ============================================================================

/**
 * @typedef {'letta' | 'ide'} LockOwner
 */

/**
 * @typedef {Object} LockInfo
 * @property {LockOwner} owner - Who owns the lock
 * @property {string} filePath - Path to the locked file
 * @property {Date} timestamp - When the lock was acquired
 * @property {string} operation - The operation being performed
 */

/**
 * @typedef {'acquired' | 'released'} LockEventType
 */

/**
 * @typedef {Object} LockEvent
 * @property {LockEventType} type - Type of lock event
 * @property {string} owner - Who triggered the event
 * @property {string} filePath - Path to the affected file
 */

/**
 * @typedef {Object} LockFileData
 * @property {string} owner - Owner of the lock
 * @property {number} pid - Process ID of the lock owner
 * @property {string} timestamp - ISO timestamp of lock creation
 * @property {LockFileEntry[]} files - List of locked files
 */

/**
 * @typedef {Object} LockFileEntry
 * @property {string} path - Path to the locked file
 * @property {string} operation - Operation being performed
 * @property {string} since - ISO timestamp of when the lock started
 */

// ============================================================================
// Suggestion Manager Types
// ============================================================================

/**
 * @typedef {'fix' | 'improvement' | 'warning'} SuggestionType
 */

/**
 * @typedef {'replace' | 'insert' | 'delete'} FixActionType
 */

/**
 * @typedef {Object} FixAction
 * @property {FixActionType} action - Type of fix action
 * @property {string} [search] - Text to search for (for replace)
 * @property {string} [replace] - Text to replace with
 * @property {number} [line] - Line number for insert/delete
 */

/**
 * @typedef {Object} AnalysisContext
 * @property {string} [framework] - Framework detected (e.g., 'React')
 * @property {string[]} [relatedFiles] - Related files for context
 * @property {string} [errorType] - Type of error detected
 */

/**
 * @typedef {Object} Suggestion
 * @property {string} id - Unique identifier for the suggestion
 * @property {Date} timestamp - When the suggestion was created
 * @property {string} file - File the suggestion applies to
 * @property {SuggestionType} type - Type of suggestion
 * @property {number} confidence - Confidence score (0.0 - 1.0)
 * @property {string} description - Human-readable description
 * @property {AnalysisContext} context - Analysis context
 * @property {FixAction} [fix] - Optional fix action
 * @property {boolean} consumed - Whether the suggestion has been consumed
 * @property {string} [consumedBy] - Who consumed the suggestion
 */

// ============================================================================
// Config Manager Types
// ============================================================================

/**
 * @typedef {Object} CollaborationSettings
 * @property {CollaborationModeType} mode - Collaboration mode
 * @property {boolean} autoDetect - Whether to auto-detect IDEs
 * @property {boolean} preferIDE - Whether to prefer IDE changes
 * @property {'json' | 'markdown'} suggestionFormat - Format for suggestions
 */

/**
 * @typedef {Object} KiroConfig
 * @property {boolean} readSteeringFiles - Whether to read Kiro steering files
 * @property {boolean} respectSpecs - Whether to respect Kiro specs
 * @property {boolean} coordinateHooks - Whether to coordinate with Kiro hooks
 */

/**
 * @typedef {Object} CursorConfig
 * @property {boolean} [enabled] - Whether Cursor integration is enabled
 */

/**
 * @typedef {Object} IDESpecificConfig
 * @property {KiroConfig} [kiro] - Kiro-specific configuration
 * @property {CursorConfig} [cursor] - Cursor-specific configuration
 */

/**
 * @typedef {Object} CollaborationConfig
 * @property {CollaborationSettings} collaboration - Collaboration settings
 * @property {number} lockTimeout - Lock timeout in milliseconds
 * @property {number} suggestionRetention - Suggestion retention in milliseconds
 * @property {IDESpecificConfig} [ideSpecific] - IDE-specific configurations
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the config is valid
 * @property {string[]} errors - List of validation errors
 */

// ============================================================================
// Status Types
// ============================================================================

/**
 * @typedef {'idle' | 'analyzing' | 'fixing'} StatusState
 */

/**
 * @typedef {Object} LastAnalysisResult
 * @property {string} file - File that was analyzed
 * @property {'ok' | 'issues' | 'error'} result - Result of the analysis
 * @property {string} timestamp - ISO timestamp of the analysis
 */

/**
 * @typedef {Object} SessionStats
 * @property {number} analyzed - Number of files analyzed
 * @property {number} issues - Number of issues found
 * @property {number} suggestions - Number of suggestions created
 */

/**
 * @typedef {Object} StatusFileData
 * @property {StatusState} status - Current status
 * @property {string} timestamp - ISO timestamp
 * @property {string} [currentFile] - Current file being processed
 * @property {number} queueLength - Number of items in queue
 * @property {LastAnalysisResult} [lastAnalysis] - Last analysis result
 * @property {SessionStats} sessionStats - Session statistics
 */

// ============================================================================
// Conflict Types
// ============================================================================

/**
 * @typedef {Object} ConflictInfo
 * @property {string} file - File with conflict
 * @property {string} lettaVersion - Path to Letta's version
 * @property {string} ideVersion - Path to IDE's version
 * @property {Date} detectedAt - When the conflict was detected
 * @property {boolean} resolved - Whether the conflict has been resolved
 */

// ============================================================================
// Export marker (for ES modules compatibility)
// ============================================================================

export const TYPES_VERSION = '1.0.0';
