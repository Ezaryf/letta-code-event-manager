/**
 * @fileoverview Lock Manager - Handles file locking coordination
 * @module src/core/lockManager
 */

import fs from 'fs';
import path from 'path';

/**
 * @typedef {import('./types.js').LockInfo} LockInfo
 * @typedef {import('./types.js').LockEvent} LockEvent
 * @typedef {import('./types.js').LockFileData} LockFileData
 * @typedef {import('./types.js').LockOwner} LockOwner
 */

/**
 * Default lock timeout in milliseconds (30 seconds)
 * @type {number}
 */
const DEFAULT_LOCK_TIMEOUT = 30000;

/**
 * IDE lock file paths to watch
 * @type {string[]}
 */
const IDE_LOCK_PATHS = [
  '.kiro/agent.lock',
  '.cursor/agent.lock',
  '.windsurf/agent.lock',
  '.antigravity/agent.lock'
];

/**
 * Handles file locking coordination between Letta and IDE agents.
 */
export class LockManager {
  /**
   * @param {string} projectPath - Path to the project root
   */
  constructor(projectPath) {
    /** @type {string} */
    this.projectPath = projectPath;
    
    /** @type {string} */
    this.lockFilePath = path.join(projectPath, '.letta.lock');
    
    /** @type {number} */
    this.lockTimeout = DEFAULT_LOCK_TIMEOUT;
    
    /** @type {Array<(event: LockEvent) => void>} */
    this._lockChangeCallbacks = [];
    
    /** @type {fs.FSWatcher | null} */
    this._watcher = null;
  }

  /**
   * Attempts to acquire a lock for a file
   * @param {string} filePath - Path to the file to lock
   * @returns {boolean} True if lock was acquired
   */
  acquireLock(filePath) {
    // Check if IDE has a lock first
    if (this._isIDELocked(filePath)) {
      return false;
    }
    
    // Check if we already have a lock
    const existingLock = this._readLockFile();
    if (existingLock) {
      // Check if lock is stale
      const lockTime = new Date(existingLock.timestamp).getTime();
      if (Date.now() - lockTime > this.lockTimeout) {
        // Stale lock, remove it
        this._removeLockFile();
      } else if (existingLock.owner !== 'letta') {
        return false;
      }
    }
    
    // Create lock file
    /** @type {LockFileData} */
    const lockData = {
      owner: 'letta',
      pid: process.pid,
      timestamp: new Date().toISOString(),
      files: [{
        path: filePath,
        operation: 'analyzing',
        since: new Date().toISOString()
      }]
    };
    
    try {
      fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      return false;
    }
  }

  /**
   * Releases a lock for a file
   * @param {string} filePath - Path to the file to unlock
   */
  releaseLock(filePath) {
    const lockData = this._readLockFile();
    if (!lockData || lockData.owner !== 'letta') {
      return;
    }
    
    // Remove the file from the lock
    lockData.files = lockData.files.filter(f => f.path !== filePath);
    
    if (lockData.files.length === 0) {
      this._removeLockFile();
    } else {
      fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2));
    }
  }

  /**
   * Checks if a file is locked
   * @param {string} filePath - Path to check
   * @returns {LockInfo | null} Lock information or null
   */
  isLocked(filePath) {
    // Check IDE locks first
    for (const ideLockPath of IDE_LOCK_PATHS) {
      const fullPath = path.join(this.projectPath, ideLockPath);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lockData = JSON.parse(content);
          
          // Check if this file is in the lock
          if (lockData.files?.some(f => f.path === filePath)) {
            return {
              owner: 'ide',
              filePath,
              timestamp: new Date(lockData.timestamp),
              operation: lockData.files.find(f => f.path === filePath)?.operation || 'unknown'
            };
          }
        } catch {
          // Lock file exists but may be malformed
          return {
            owner: 'ide',
            filePath,
            timestamp: new Date(),
            operation: 'unknown'
          };
        }
      }
    }
    
    // Check Letta lock
    const lettaLock = this._readLockFile();
    if (lettaLock) {
      const fileEntry = lettaLock.files.find(f => f.path === filePath);
      if (fileEntry) {
        return {
          owner: /** @type {LockOwner} */ (lettaLock.owner),
          filePath,
          timestamp: new Date(lettaLock.timestamp),
          operation: fileEntry.operation
        };
      }
    }
    
    return null;
  }

  /**
   * Starts watching for IDE lock changes
   */
  watchIDELocks() {
    // Watch each potential IDE lock location
    for (const ideLockPath of IDE_LOCK_PATHS) {
      const dirPath = path.join(this.projectPath, path.dirname(ideLockPath));
      
      if (fs.existsSync(dirPath)) {
        try {
          const watcher = fs.watch(dirPath, (eventType, filename) => {
            if (filename === 'agent.lock') {
              this._handleIDELockChange(ideLockPath, eventType);
            }
          });
          
          // Store first watcher (simplified for now)
          if (!this._watcher) {
            this._watcher = watcher;
          }
        } catch (error) {
          console.error(`Failed to watch ${dirPath}:`, error);
        }
      }
    }
  }

  /**
   * Registers a callback for IDE lock changes
   * @param {(event: LockEvent) => void} callback - Callback function
   */
  onIDELockChange(callback) {
    this._lockChangeCallbacks.push(callback);
  }

  /**
   * Yields to IDE by releasing Letta's lock
   * @param {string} filePath - Path to yield
   */
  yieldToIDE(filePath) {
    this.releaseLock(filePath);
  }

  /**
   * Stops watching for lock changes
   */
  stopWatching() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  /**
   * Sets the lock timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setLockTimeout(timeout) {
    this.lockTimeout = timeout;
  }

  /**
   * Checks if IDE has a lock on any file
   * @param {string} filePath - Path to check
   * @returns {boolean} True if IDE has lock
   * @private
   */
  _isIDELocked(filePath) {
    for (const ideLockPath of IDE_LOCK_PATHS) {
      const fullPath = path.join(this.projectPath, ideLockPath);
      if (fs.existsSync(fullPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Reads the Letta lock file
   * @returns {LockFileData | null} Lock data or null
   * @private
   */
  _readLockFile() {
    if (!fs.existsSync(this.lockFilePath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(this.lockFilePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Removes the Letta lock file
   * @private
   */
  _removeLockFile() {
    try {
      if (fs.existsSync(this.lockFilePath)) {
        fs.unlinkSync(this.lockFilePath);
      }
    } catch (error) {
      console.error('Failed to remove lock file:', error);
    }
  }

  /**
   * Handles IDE lock file changes
   * @param {string} lockPath - Path to the lock file
   * @param {string} eventType - Type of file system event
   * @private
   */
  _handleIDELockChange(lockPath, eventType) {
    const fullPath = path.join(this.projectPath, lockPath);
    const exists = fs.existsSync(fullPath);
    
    /** @type {LockEvent} */
    const event = {
      type: exists ? 'acquired' : 'released',
      owner: 'ide',
      filePath: lockPath
    };
    
    for (const callback of this._lockChangeCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in lock change callback:', error);
      }
    }
  }
}

export default LockManager;
