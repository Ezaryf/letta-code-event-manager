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
 */

/**
 * IDE indicator configurations
 * @type {Object.<string, {folder: string, configFile?: string}>}
 */
const IDE_INDICATORS = {
  kiro: { folder: '.kiro', configFile: 'agent-status.json' },
  cursor: { folder: '.cursor', configFile: 'agent.lock' },
  windsurf: { folder: '.windsurf', configFile: null },
  antigravity: { folder: '.antigravity', configFile: null }
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
   * @param {string} status - Status to broadcast
   */
  broadcastStatus(status) {
    const statusPath = path.join(this.projectPath, '.letta', 'status.json');
    const statusDir = path.dirname(statusPath);
    
    // Ensure directory exists
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }
    
    /** @type {import('./types.js').StatusFileData} */
    const statusData = {
      status: /** @type {import('./types.js').StatusState} */ (status),
      timestamp: new Date().toISOString(),
      currentFile: undefined,
      queueLength: this._queuedAnalyses,
      sessionStats: {
        analyzed: 0,
        issues: 0,
        suggestions: 0
      }
    };
    
    fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
    this._lastSync = new Date();
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
