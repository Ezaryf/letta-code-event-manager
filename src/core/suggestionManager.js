/**
 * @fileoverview Suggestion Manager - Manages the suggestion queue for IDE agents
 * @module src/core/suggestionManager
 */

import fs from 'fs';
import path from 'path';

/**
 * @typedef {import('./types.js').Suggestion} Suggestion
 * @typedef {import('./types.js').SuggestionType} SuggestionType
 * @typedef {import('./types.js').FixAction} FixAction
 * @typedef {import('./types.js').AnalysisContext} AnalysisContext
 */

/**
 * Default suggestion retention period (24 hours in milliseconds)
 * @type {number}
 */
const DEFAULT_RETENTION = 86400000;

/**
 * Manages the suggestion queue for IDE agents to consume.
 */
export class SuggestionManager {
  /**
   * @param {string} projectPath - Path to the project root
   */
  constructor(projectPath) {
    /** @type {string} */
    this.projectPath = projectPath;
    
    /** @type {string} */
    this.suggestionsDir = path.join(projectPath, '.codemind', 'suggestions');
    
    /** @type {number} */
    this.retentionPeriod = DEFAULT_RETENTION;
    
    /** @type {fs.FSWatcher | null} */
    this._watcher = null;
    
    /** @type {Map<string, number>} - Tracks last access time for suggestions */
    this._accessTimes = new Map();
    
    /** @type {Array<(suggestionId: string, consumedBy: string) => void>} */
    this._consumptionCallbacks = [];
    
    this._ensureDirectory();
  }

  /**
   * Creates a new suggestion
   * @param {Omit<Suggestion, 'id' | 'timestamp' | 'consumed'>} suggestionData - Suggestion data
   * @returns {string} The suggestion ID
   */
  createSuggestion(suggestionData) {
    const id = this._generateId();
    const timestamp = new Date();
    
    /** @type {Suggestion} */
    const suggestion = {
      id,
      timestamp,
      file: suggestionData.file,
      type: suggestionData.type,
      confidence: Math.max(0, Math.min(1, suggestionData.confidence)),
      description: suggestionData.description,
      context: suggestionData.context || {},
      fix: suggestionData.fix,
      consumed: false
    };
    
    const filePath = path.join(this.suggestionsDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(suggestion, null, 2));
    
    return id;
  }

  /**
   * Marks a suggestion as consumed
   * @param {string} suggestionId - ID of the suggestion
   * @param {string} [consumedBy] - Who consumed the suggestion
   */
  markConsumed(suggestionId, consumedBy) {
    const filePath = path.join(this.suggestionsDir, `${suggestionId}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Suggestion not found: ${suggestionId}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const suggestion = JSON.parse(content);
    
    suggestion.consumed = true;
    suggestion.consumedBy = consumedBy || 'unknown';
    
    fs.writeFileSync(filePath, JSON.stringify(suggestion, null, 2));
  }

  /**
   * Gets all pending (unconsumed) suggestions
   * @returns {Suggestion[]} List of pending suggestions
   */
  getPendingSuggestions() {
    this._ensureDirectory();
    
    const files = fs.readdirSync(this.suggestionsDir)
      .filter(f => f.endsWith('.json'));
    
    /** @type {Suggestion[]} */
    const pending = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(
          path.join(this.suggestionsDir, file),
          'utf-8'
        );
        const suggestion = JSON.parse(content);
        
        if (!suggestion.consumed) {
          // Convert timestamp string back to Date
          suggestion.timestamp = new Date(suggestion.timestamp);
          pending.push(suggestion);
        }
      } catch (error) {
        console.error(`Failed to read suggestion ${file}:`, error);
      }
    }
    
    // Sort by timestamp, newest first
    return pending.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Gets a specific suggestion by ID
   * @param {string} suggestionId - ID of the suggestion
   * @returns {Suggestion | null} The suggestion or null
   */
  getSuggestion(suggestionId) {
    const filePath = path.join(this.suggestionsDir, `${suggestionId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const suggestion = JSON.parse(content);
      suggestion.timestamp = new Date(suggestion.timestamp);
      return suggestion;
    } catch {
      return null;
    }
  }

  /**
   * Cleans up old suggestions
   * @param {number} [maxAge] - Maximum age in milliseconds (default: retention period)
   * @returns {number} Number of suggestions cleaned up
   */
  cleanupOldSuggestions(maxAge) {
    const cutoff = Date.now() - (maxAge || this.retentionPeriod);
    let cleaned = 0;
    
    this._ensureDirectory();
    
    const files = fs.readdirSync(this.suggestionsDir)
      .filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(this.suggestionsDir, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const suggestion = JSON.parse(content);
        const timestamp = new Date(suggestion.timestamp).getTime();
        
        if (timestamp < cutoff) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch (error) {
        console.error(`Failed to process suggestion ${file}:`, error);
      }
    }
    
    return cleaned;
  }

  /**
   * Sets the retention period
   * @param {number} period - Retention period in milliseconds
   */
  setRetentionPeriod(period) {
    this.retentionPeriod = period;
  }

  /**
   * Gets all suggestions (including consumed)
   * @returns {Suggestion[]} List of all suggestions
   */
  getAllSuggestions() {
    this._ensureDirectory();
    
    const files = fs.readdirSync(this.suggestionsDir)
      .filter(f => f.endsWith('.json'));
    
    /** @type {Suggestion[]} */
    const suggestions = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(
          path.join(this.suggestionsDir, file),
          'utf-8'
        );
        const suggestion = JSON.parse(content);
        suggestion.timestamp = new Date(suggestion.timestamp);
        suggestions.push(suggestion);
      } catch (error) {
        console.error(`Failed to read suggestion ${file}:`, error);
      }
    }
    
    return suggestions.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Starts watching for external reads of suggestion files.
   * When an external process reads a suggestion file, it will be marked as consumed.
   * Requirements: 3.3
   */
  watchForConsumption() {
    this._ensureDirectory();
    
    // Stop any existing watcher
    this.stopWatching();
    
    // Initialize access times for existing suggestions
    this._initializeAccessTimes();
    
    try {
      this._watcher = fs.watch(this.suggestionsDir, (eventType, filename) => {
        if (filename && filename.endsWith('.json')) {
          this._handleFileEvent(eventType, filename);
        }
      });
    } catch (error) {
      console.error('Failed to start suggestion watcher:', error);
    }
  }

  /**
   * Stops watching for suggestion consumption
   */
  stopWatching() {
    if (this._watcher) {
      try {
        this._watcher.close();
      } catch (error) {
        // Ignore errors when closing watcher
      }
      this._watcher = null;
    }
  }

  /**
   * Registers a callback for when a suggestion is consumed
   * @param {(suggestionId: string, consumedBy: string) => void} callback - Callback function
   */
  onConsumption(callback) {
    this._consumptionCallbacks.push(callback);
  }

  /**
   * Removes a consumption callback
   * @param {(suggestionId: string, consumedBy: string) => void} callback - Callback to remove
   */
  offConsumption(callback) {
    const index = this._consumptionCallbacks.indexOf(callback);
    if (index > -1) {
      this._consumptionCallbacks.splice(index, 1);
    }
  }

  /**
   * Checks if a suggestion has been accessed externally
   * @param {string} suggestionId - ID of the suggestion
   * @returns {boolean} True if accessed externally
   */
  wasAccessedExternally(suggestionId) {
    const filePath = path.join(this.suggestionsDir, `${suggestionId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    try {
      const stats = fs.statSync(filePath);
      const lastKnownAccess = this._accessTimes.get(suggestionId);
      
      if (lastKnownAccess && stats.atimeMs > lastKnownAccess) {
        return true;
      }
    } catch {
      return false;
    }
    
    return false;
  }

  /**
   * Marks a suggestion as consumed if it was accessed externally
   * @param {string} suggestionId - ID of the suggestion
   * @param {string} [consumedBy='external'] - Who consumed the suggestion
   * @returns {boolean} True if marked as consumed
   */
  markConsumedIfAccessed(suggestionId, consumedBy = 'external') {
    if (this.wasAccessedExternally(suggestionId)) {
      const suggestion = this.getSuggestion(suggestionId);
      if (suggestion && !suggestion.consumed) {
        this.markConsumed(suggestionId, consumedBy);
        return true;
      }
    }
    return false;
  }

  /**
   * Initializes access times for existing suggestions
   * @private
   */
  _initializeAccessTimes() {
    this._accessTimes.clear();
    
    try {
      const files = fs.readdirSync(this.suggestionsDir)
        .filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const filePath = path.join(this.suggestionsDir, file);
        const suggestionId = file.replace('.json', '');
        
        try {
          const stats = fs.statSync(filePath);
          this._accessTimes.set(suggestionId, stats.atimeMs);
        } catch {
          // Ignore errors for individual files
        }
      }
    } catch (error) {
      console.error('Failed to initialize access times:', error);
    }
  }

  /**
   * Handles file system events for suggestion files
   * @param {string} eventType - Type of event
   * @param {string} filename - Name of the file
   * @private
   */
  _handleFileEvent(eventType, filename) {
    const suggestionId = filename.replace('.json', '');
    const filePath = path.join(this.suggestionsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      // File was deleted
      this._accessTimes.delete(suggestionId);
      return;
    }
    
    try {
      const stats = fs.statSync(filePath);
      const lastKnownAccess = this._accessTimes.get(suggestionId);
      
      // Check if file was accessed (read) by external process
      if (lastKnownAccess && stats.atimeMs > lastKnownAccess) {
        const suggestion = this.getSuggestion(suggestionId);
        
        if (suggestion && !suggestion.consumed) {
          // Mark as consumed by external process
          this.markConsumed(suggestionId, 'external');
          this._notifyConsumption(suggestionId, 'external');
        }
      }
      
      // Update access time
      this._accessTimes.set(suggestionId, stats.atimeMs);
    } catch (error) {
      // Ignore errors for individual file events
    }
  }

  /**
   * Notifies all registered callbacks of a consumption event
   * @param {string} suggestionId - ID of the consumed suggestion
   * @param {string} consumedBy - Who consumed the suggestion
   * @private
   */
  _notifyConsumption(suggestionId, consumedBy) {
    for (const callback of this._consumptionCallbacks) {
      try {
        callback(suggestionId, consumedBy);
      } catch (error) {
        console.error('Error in consumption callback:', error);
      }
    }
  }

  /**
   * Ensures the suggestions directory exists
   * @private
   */
  _ensureDirectory() {
    if (!fs.existsSync(this.suggestionsDir)) {
      fs.mkdirSync(this.suggestionsDir, { recursive: true });
    }
  }

  /**
   * Generates a unique suggestion ID
   * @returns {string} Unique ID
   * @private
   */
  _generateId() {
    const now = new Date();
    const dateStr = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .slice(0, 15);
    const random = Math.random().toString(36).substring(2, 8);
    return `sug_${dateStr}_${random}`;
  }
}

export default SuggestionManager;
