/**
 * @fileoverview Config Manager - Handles collaboration configuration
 * @module src/core/configManager
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * @typedef {import('./types.js').CollaborationConfig} CollaborationConfig
 * @typedef {import('./types.js').ValidationResult} ValidationResult
 * @typedef {import('./types.js').CollaborationModeType} CollaborationModeType
 */

/**
 * Default configuration values
 * @type {CollaborationConfig}
 */
const DEFAULT_CONFIG = {
  collaboration: {
    mode: 'active',
    autoDetect: true,
    preferIDE: true,
    suggestionFormat: 'json'
  },
  lockTimeout: 30000,
  suggestionRetention: 86400000,
  ideSpecific: {
    kiro: {
      readSteeringFiles: true,
      respectSpecs: true,
      coordinateHooks: true
    }
  }
};

/**
 * Valid collaboration modes
 * @type {CollaborationModeType[]}
 */
const VALID_MODES = ['passive', 'active', 'independent'];

/**
 * Handles collaboration configuration.
 */
export class ConfigManager {
  /**
   * @param {string} projectPath - Path to the project root
   */
  constructor(projectPath) {
    /** @type {string} */
    this.projectPath = projectPath;
    
    /** @type {string} */
    this.localConfigPath = path.join(projectPath, '.letta', 'config.json');
    
    /** @type {string} */
    this.globalConfigPath = path.join(os.homedir(), '.letta', 'config.json');
    
    /** @type {CollaborationConfig | null} */
    this._cachedConfig = null;
  }

  /**
   * Loads configuration from the local config file
   * @returns {CollaborationConfig} Configuration object
   */
  loadConfig() {
    // Try local config first
    if (fs.existsSync(this.localConfigPath)) {
      try {
        const content = fs.readFileSync(this.localConfigPath, 'utf-8');
        const config = JSON.parse(content);
        return this._mergeWithDefaults(config);
      } catch (error) {
        console.error('Failed to load local config:', error);
      }
    }
    
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Saves configuration to the local config file
   * @param {CollaborationConfig} config - Configuration to save
   */
  saveConfig(config) {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }
    
    const configDir = path.dirname(this.localConfigPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(this.localConfigPath, JSON.stringify(config, null, 2));
    this._cachedConfig = null; // Invalidate cache
  }

  /**
   * Gets the effective configuration (merged global + local)
   * @returns {CollaborationConfig} Merged configuration
   */
  getEffectiveConfig() {
    if (this._cachedConfig) {
      return this._cachedConfig;
    }
    
    // Start with defaults
    let config = { ...DEFAULT_CONFIG };
    
    // Merge global config if exists
    if (fs.existsSync(this.globalConfigPath)) {
      try {
        const content = fs.readFileSync(this.globalConfigPath, 'utf-8');
        const globalConfig = JSON.parse(content);
        config = this._deepMerge(config, globalConfig);
      } catch (error) {
        console.error('Failed to load global config:', error);
      }
    }
    
    // Merge local config if exists (overrides global)
    if (fs.existsSync(this.localConfigPath)) {
      try {
        const content = fs.readFileSync(this.localConfigPath, 'utf-8');
        const localConfig = JSON.parse(content);
        config = this._deepMerge(config, localConfig);
      } catch (error) {
        console.error('Failed to load local config:', error);
      }
    }
    
    this._cachedConfig = config;
    return config;
  }

  /**
   * Validates a configuration object
   * @param {object} config - Configuration to validate
   * @returns {ValidationResult} Validation result
   */
  validateConfig(config) {
    /** @type {string[]} */
    const errors = [];
    
    // Check collaboration settings
    if (config.collaboration) {
      if (config.collaboration.mode && !VALID_MODES.includes(config.collaboration.mode)) {
        errors.push(`Invalid collaboration mode: ${config.collaboration.mode}`);
      }
      
      if (config.collaboration.suggestionFormat && 
          !['json', 'markdown'].includes(config.collaboration.suggestionFormat)) {
        errors.push(`Invalid suggestion format: ${config.collaboration.suggestionFormat}`);
      }
    }
    
    // Check lock timeout
    if (config.lockTimeout !== undefined) {
      if (typeof config.lockTimeout !== 'number' || config.lockTimeout < 0) {
        errors.push('lockTimeout must be a positive number');
      }
    }
    
    // Check suggestion retention
    if (config.suggestionRetention !== undefined) {
      if (typeof config.suggestionRetention !== 'number' || config.suggestionRetention < 0) {
        errors.push('suggestionRetention must be a positive number');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets a specific configuration value
   * @param {string} key - Dot-notation key (e.g., 'collaboration.mode')
   * @returns {any} Configuration value
   */
  get(key) {
    const config = this.getEffectiveConfig();
    const parts = key.split('.');
    
    let value = config;
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }

  /**
   * Sets a specific configuration value
   * @param {string} key - Dot-notation key
   * @param {any} value - Value to set
   */
  set(key, value) {
    const config = this.loadConfig();
    const parts = key.split('.');
    
    let current = config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    this.saveConfig(config);
  }

  /**
   * Clears the configuration cache
   */
  clearCache() {
    this._cachedConfig = null;
  }

  /**
   * Merges a config with defaults
   * @param {object} config - Config to merge
   * @returns {CollaborationConfig} Merged config
   * @private
   */
  _mergeWithDefaults(config) {
    return this._deepMerge({ ...DEFAULT_CONFIG }, config);
  }

  /**
   * Deep merges two objects
   * @param {object} target - Target object
   * @param {object} source - Source object
   * @returns {object} Merged object
   * @private
   */
  _deepMerge(target, source) {
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] !== null && typeof target[key] === 'object') {
          result[key] = this._deepMerge(target[key], source[key]);
        } else {
          result[key] = { ...source[key] };
        }
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

export default ConfigManager;
