/**
 * @fileoverview Lock Manager - Handles file locking coordination
 * @module src/core/lockManager
 * 
 * Implements lock file coordination between Letta and IDE agents.
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
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
 * 
 * Key behaviors:
 * - Creates .letta.lock when Letta is modifying files (Req 2.4)
 * - Watches IDE lock files and pauses auto-fix when IDE is editing (Req 2.1)
 * - Queues analysis when IDE lock exists (Req 2.2)
 * - Processes queued analyses when IDE lock is removed (Req 2.3)
 * - Yields to IDE agent on simultaneous lock attempts (Req 2.5)
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
    
    /** @type {fs.FSWatcher[]} */
    this._watchers = [];
    
    /** @type {string[]} */
    this._queuedFiles = [];
  }

  /**
   * Attempts to acquire a lock for a file.
   * Creates .letta.lock file when Letta is applying fixes (Req 2.4).
   * Yields to IDE if IDE has an existing lock (Req 2.5).
   * 
   * @param {string} filePath - Path to the file to lock
   * @param {string} [operation='analyzing'] - Operation being performed
   * @returns {boolean} True if lock was acquired
   */
  acquireLock(filePath, operation = 'analyzing') {
    // Check if IDE has a lock first - yield to IDE (Req 2.5)
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
        // Another owner has the lock
        return false;
      } else {
        // We already have a lock, add this file to it
        const fileEntry = existingLock.files.find(f => f.path === filePath);
        if (!fileEntry) {
          existingLock.files.push({
            path: filePath,
            operation: operation,
            since: new Date().toISOString()
          });
          existingLock.timestamp = new Date().toISOString();
          try {
            fs.writeFileSync(this.lockFilePath, JSON.stringify(existingLock, null, 2));
          } catch (error) {
            console.error('Failed to update lock:', error);
            return false;
          }
        }
        return true;
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
        operation: operation,
        since: new Date().toISOString()
      }]
    };
    
    try {
      // Ensure parent directory exists
      const lockDir = path.dirname(this.lockFilePath);
      if (!fs.existsSync(lockDir)) {
        fs.mkdirSync(lockDir, { recursive: true });
      }
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
      try {
        fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2));
      } catch (error) {
        console.error('Failed to update lock file:', error);
      }
    }
  }

  /**
   * Checks if a file is locked by any agent
   * @param {string} filePath - Path to check
   * @returns {LockInfo | null} Lock information or null if not locked
   */
  isLocked(filePath) {
    // Check IDE locks first
    const ideLock = this._getIDELockInfo(filePath);
    if (ideLock) {
      return ideLock;
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
   * Checks if any IDE has an active lock (regardless of specific file)
   * @returns {boolean} True if any IDE lock exists
   */
  hasIDELock() {
    for (const ideLockPath of IDE_LOCK_PATHS) {
      const fullPath = path.join(this.projectPath, ideLockPath);
      if (fs.existsSync(fullPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets detailed lock info from IDE lock files
   * @param {string} filePath - Path to check
   * @returns {LockInfo | null} Lock info or null
   * @private
   */
  _getIDELockInfo(filePath) {
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
          
          // If no specific files listed, assume all files are locked
          if (!lockData.files || lockData.files.length === 0) {
            return {
              owner: 'ide',
              filePath,
              timestamp: new Date(lockData.timestamp || Date.now()),
              operation: 'unknown'
            };
          }
        } catch {
          // Lock file exists but may be malformed - treat as locked
          return {
            owner: 'ide',
            filePath,
            timestamp: new Date(),
            operation: 'unknown'
          };
        }
      }
    }
    return null;
  }

  /**
   * Starts watching for IDE lock changes.
   * Monitors .kiro/agent.lock, .cursor/agent.lock, etc. (Req 2.1, 2.2, 2.3)
   */
  watchIDELocks() {
    // Stop any existing watchers first
    this.stopWatching();
    
    // Watch each potential IDE lock location
    for (const ideLockPath of IDE_LOCK_PATHS) {
      const dirPath = path.join(this.projectPath, path.dirname(ideLockPath));
      const lockFileName = path.basename(ideLockPath);
      
      if (fs.existsSync(dirPath)) {
        try {
          const watcher = fs.watch(dirPath, (eventType, filename) => {
            if (filename === lockFileName) {
              this._handleIDELockChange(ideLockPath, eventType);
            }
          });
          
          this._watchers.push(watcher);
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
   * Removes a callback for IDE lock changes
   * @param {(event: LockEvent) => void} callback - Callback function to remove
   */
  offIDELockChange(callback) {
    const index = this._lockChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this._lockChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Yields to IDE by releasing Letta's lock on a file.
   * Called when both systems attempt to lock the same file (Req 2.5).
   * 
   * @param {string} filePath - Path to yield
   */
  yieldToIDE(filePath) {
    this.releaseLock(filePath);
    
    // Emit a lock event to notify listeners
    /** @type {LockEvent} */
    const event = {
      type: 'released',
      owner: 'letta',
      filePath: filePath
    };
    
    this._notifyLockChange(event);
  }

  /**
   * Queues a file for later analysis when IDE lock is released (Req 2.2)
   * @param {string} filePath - Path to queue
   */
  queueForAnalysis(filePath) {
    if (!this._queuedFiles.includes(filePath)) {
      this._queuedFiles.push(filePath);
    }
  }

  /**
   * Gets and clears the queued files for analysis (Req 2.3)
   * @returns {string[]} Array of queued file paths
   */
  getAndClearQueue() {
    const queued = [...this._queuedFiles];
    this._queuedFiles = [];
    return queued;
  }

  /**
   * Gets the current queue without clearing it
   * @returns {string[]} Array of queued file paths
   */
  getQueue() {
    return [...this._queuedFiles];
  }

  /**
   * Stops watching for lock changes
   */
  stopWatching() {
    for (const watcher of this._watchers) {
      try {
        watcher.close();
      } catch (error) {
        // Ignore errors when closing watchers
      }
    }
    this._watchers = [];
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
   * @param {string} [filePath] - Optional specific path to check
   * @returns {boolean} True if IDE has lock
   * @private
   */
  _isIDELocked(filePath) {
    for (const ideLockPath of IDE_LOCK_PATHS) {
      const fullPath = path.join(this.projectPath, ideLockPath);
      if (fs.existsSync(fullPath)) {
        // If no specific file path, any IDE lock means locked
        if (!filePath) {
          return true;
        }
        
        // Check if specific file is locked
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lockData = JSON.parse(content);
          
          // If no files array or empty, assume all files locked
          if (!lockData.files || lockData.files.length === 0) {
            return true;
          }
          
          // Check if specific file is in the lock
          if (lockData.files.some(f => f.path === filePath)) {
            return true;
          }
        } catch {
          // Lock file exists but malformed - treat as locked
          return true;
        }
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
   * Handles IDE lock file changes.
   * When lock is released, processes queued analyses (Req 2.3).
   * 
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
    
    this._notifyLockChange(event);
  }

  /**
   * Notifies all registered callbacks of a lock change
   * @param {LockEvent} event - The lock event
   * @private
   */
  _notifyLockChange(event) {
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
