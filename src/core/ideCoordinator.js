/**
 * @fileoverview IDE Coordinator - Central component for IDE detection and collaboration
 * @module src/core/ideCoordinator
 */

import fs from 'fs';
import path from 'path';

/**
 * @typedef {import('./types.js').IDEInfo} IDEInfo
 * @typedef {import('./types.js').IDEType} IDEType
 * @typedef {import('./types.js').CollaborationModeType} CollaborationModeType
 * @typedef {import('./types.js').CollaborationStatus} CollaborationStatus
 * @typedef {import('./types.js').IDEActivity} IDEActivity
 * @typedef {import('./types.js').StatusFileData} StatusFileData
 * @typedef {import('./types.js').StatusState} StatusState
 * @typedef {import('./types.js').SessionStats} SessionStats
 */

/**
 * IDE indicator configurations
 * @type {Object.<string, {folder: string, configFile?: string, statusFile?: string}>}
 */
const IDE_INDICATORS = {
  kiro: { folder: '.kiro', configFile: 'agent.lock', statusFile: 'agent-status.json' },
  cursor: { folder: '.cursor', configFile: 'agent.lock', statusFile: null },
  windsurf: { folder: '.windsurf', configFile: null, statusFile: null },
  antigravity: { folder: '.antigravity', configFile: null, statusFile: null }
};

/**
 * Central component that manages IDE detection and collaboration mode.
 */
export class IDECoordinator {
  /**
   * @param {string} projectPath - Path to the project root
   */
  constructor(projectPath) {
    /** @type {string} */
    this.projectPath = projectPath;
    
    /** @type {CollaborationModeType} */
    this._collaborationMode = 'active';
    
    /** @type {IDEInfo | null} */
    this._detectedIDE = null;
    
    /** @type {Array<(activity: IDEActivity) => void>} */
    this._activityCallbacks = [];
    
    /** @type {number} */
    this._queuedAnalyses = 0;
    
    /** @type {Date} */
    this._lastSync = new Date();
    
    /** @type {SessionStats} */
    this._sessionStats = {
      analyzed: 0,
      issues: 0,
      suggestions: 0
    };
    
    /** @type {string | undefined} */
    this._currentFile = undefined;
    
    /** @type {StatusState} */
    this._currentStatus = 'idle';
    
    /** @type {fs.FSWatcher | null} */
    this._ideStatusWatcher = null;
  }

  /**
   * Detects which IDE is present in the project
   * @returns {IDEInfo | null} Detected IDE information or null
   */
  detectIDE() {
    for (const [ideType, config] of Object.entries(IDE_INDICATORS)) {
      const folderPath = path.join(this.projectPath, config.folder);
      
      if (fs.existsSync(folderPath)) {
        /** @type {IDEInfo} */
        const ideInfo = {
          type: /** @type {IDEType} */ (ideType),
          configPath: folderPath,
          features: this._detectFeatures(ideType, folderPath)
        };
        
        // Try to detect version if possible
        const version = this._detectVersion(ideType, folderPath);
        if (version) {
          ideInfo.version = version;
        }
        
        this._detectedIDE = ideInfo;
        return ideInfo;
      }
    }
    
    this._detectedIDE = null;
    return null;
  }

  /**
   * Checks if an IDE agent is currently active
   * @returns {boolean} True if IDE is active
   */
  isIDEActive() {
    if (!this._detectedIDE) {
      return false;
    }
    
    const lockPath = path.join(
      this._detectedIDE.configPath,
      'agent.lock'
    );
    
    return fs.existsSync(lockPath);
  }

  /**
   * Gets the current collaboration mode
   * @returns {CollaborationModeType} Current collaboration mode
   */
  getCollaborationMode() {
    return this._collaborationMode;
  }

  /**
   * Sets the collaboration mode
   * @param {CollaborationModeType} mode - The mode to set
   */
  setCollaborationMode(mode) {
    const validModes = ['passive', 'active', 'independent'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid collaboration mode: ${mode}`);
    }
    this._collaborationMode = mode;
  }

  /**
   * Gets the current collaboration status
   * @returns {CollaborationStatus} Current status
   */
  getStatus() {
    return {
      mode: this._collaborationMode,
      ideDetected: this._detectedIDE,
      isIDEEditing: this.isIDEActive(),
      queuedAnalyses: this._queuedAnalyses,
      lastSync: this._lastSync
    };
  }

  /**
   * Broadcasts status to the status file
   * @param {StatusState} status - Status to broadcast ('idle', 'analyzing', 'fixing')
   * @param {string} [currentFile] - Current file being processed
   */
  broadcastStatus(status, currentFile) {
    const statusPath = path.join(this.projectPath, '.letta', 'status.json');
    const statusDir = path.dirname(statusPath);
    
    // Ensure directory exists
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }
    
    this._currentStatus = status;
    this._currentFile = currentFile;
    
    /** @type {StatusFileData} */
    const statusData = {
      status: status,
      timestamp: new Date().toISOString(),
      currentFile: currentFile,
      queueLength: this._queuedAnalyses,
      sessionStats: { ...this._sessionStats }
    };
    
    fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
    this._lastSync = new Date();
  }

  /**
   * Updates session statistics
   * @param {'analyzed' | 'issues' | 'suggestions'} stat - Stat to increment
   * @param {number} [amount=1] - Amount to increment by
   */
  updateStats(stat, amount = 1) {
    if (stat in this._sessionStats) {
      this._sessionStats[stat] += amount;
    }
  }

  /**
   * Gets current session statistics
   * @returns {SessionStats} Current session stats
   */
  getSessionStats() {
    return { ...this._sessionStats };
  }

  /**
   * Resets session statistics
   */
  resetStats() {
    this._sessionStats = {
      analyzed: 0,
      issues: 0,
      suggestions: 0
    };
  }

  /**
   * Starts watching for IDE activity
   * Monitors IDE status files for changes and triggers callbacks
   */
  startIDEActivityWatch() {
    if (!this._detectedIDE) {
      return;
    }
    
    const ideConfig = IDE_INDICATORS[this._detectedIDE.type];
    if (!ideConfig || !ideConfig.statusFile) {
      return;
    }
    
    const statusFilePath = path.join(this._detectedIDE.configPath, ideConfig.statusFile);
    
    // Watch the IDE's status file for changes
    if (fs.existsSync(path.dirname(statusFilePath))) {
      try {
        this._ideStatusWatcher = fs.watch(path.dirname(statusFilePath), (eventType, filename) => {
          if (filename === ideConfig.statusFile) {
            this._handleIDEStatusChange(statusFilePath);
          }
        });
      } catch (error) {
        console.error('Error starting IDE activity watch:', error);
      }
    }
  }

  /**
   * Stops watching for IDE activity
   */
  stopIDEActivityWatch() {
    if (this._ideStatusWatcher) {
      this._ideStatusWatcher.close();
      this._ideStatusWatcher = null;
    }
  }

  /**
   * Handles IDE status file changes
   * @param {string} statusFilePath - Path to the IDE status file
   * @private
   */
  _handleIDEStatusChange(statusFilePath) {
    try {
      if (fs.existsSync(statusFilePath)) {
        const content = fs.readFileSync(statusFilePath, 'utf-8');
        const ideStatus = JSON.parse(content);
        
        /** @type {IDEActivity} */
        const activity = {
          ide: this._detectedIDE?.type || 'unknown',
          action: ideStatus.status || 'unknown',
          file: ideStatus.currentFile,
          timestamp: new Date()
        };
        
        this._notifyActivity(activity);
      }
    } catch (error) {
      // Ignore parse errors - file might be in the middle of being written
    }
  }

  /**
   * Reads the current IDE agent status
   * @returns {Object | null} IDE status data or null
   */
  readIDEStatus() {
    if (!this._detectedIDE) {
      return null;
    }
    
    const ideConfig = IDE_INDICATORS[this._detectedIDE.type];
    if (!ideConfig || !ideConfig.statusFile) {
      return null;
    }
    
    const statusFilePath = path.join(this._detectedIDE.configPath, ideConfig.statusFile);
    
    try {
      if (fs.existsSync(statusFilePath)) {
        const content = fs.readFileSync(statusFilePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      // Ignore errors
    }
    
    return null;
  }

  /**
   * Registers a callback for IDE activity events
   * @param {(activity: IDEActivity) => void} callback - Callback function
   */
  onIDEActivity(callback) {
    this._activityCallbacks.push(callback);
  }

  /**
   * Increments the queued analyses count
   */
  incrementQueue() {
    this._queuedAnalyses++;
  }

  /**
   * Decrements the queued analyses count
   */
  decrementQueue() {
    if (this._queuedAnalyses > 0) {
      this._queuedAnalyses--;
    }
  }

  /**
   * Detects features available for the IDE
   * @param {string} ideType - Type of IDE
   * @param {string} folderPath - Path to IDE folder
   * @returns {string[]} List of features
   * @private
   */
  _detectFeatures(ideType, folderPath) {
    const features = [];
    
    if (ideType === 'kiro') {
      // Check for Kiro-specific features
      if (fs.existsSync(path.join(folderPath, 'steering'))) {
        features.push('steering');
      }
      if (fs.existsSync(path.join(folderPath, 'specs'))) {
        features.push('specs');
      }
      if (fs.existsSync(path.join(folderPath, 'hooks'))) {
        features.push('hooks');
      }
    }
    
    return features;
  }

  /**
   * Attempts to detect the IDE version
   * @param {string} ideType - Type of IDE
   * @param {string} folderPath - Path to IDE folder
   * @returns {string | null} Version string or null
   * @private
   */
  _detectVersion(ideType, folderPath) {
    // Version detection is IDE-specific and may not always be available
    return null;
  }

  /**
   * Notifies all registered callbacks of IDE activity
   * @param {IDEActivity} activity - The activity to notify about
   * @private
   */
  _notifyActivity(activity) {
    for (const callback of this._activityCallbacks) {
      try {
        callback(activity);
      } catch (error) {
        console.error('Error in IDE activity callback:', error);
      }
    }
  }
}

export default IDECoordinator;
