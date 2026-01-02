/**
 * 🛡️ Change Safety Protocol
 * 
 * Four-layer autonomy model with comprehensive safety checks
 * for auto-fix operations and code modifications.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Autonomy levels
export const AUTONOMY_LEVELS = {
  OBSERVER: 0,    // Only reports issues
  ASSISTANT: 1,   // Suggests fixes, requires approval
  PARTNER: 2,     // Auto-fixes trivial issues
  AUTONOMOUS: 3   // Full auto-fix capability
};

// Risk levels
export const RISK_LEVELS = {
  LOW: 'LOW',         // 0-20%
  MEDIUM: 'MEDIUM',   // 20-60%
  HIGH: 'HIGH',       // 60-80%
  CRITICAL: 'CRITICAL' // 80-100%
};

// Change types
export const CHANGE_TYPES = {
  SYNTAX_FIX: 'SYNTAX_FIX',
  STYLE_FIX: 'STYLE_FIX',
  SECURITY_FIX: 'SECURITY_FIX',
  PERFORMANCE_FIX: 'PERFORMANCE_FIX',
  REFACTOR: 'REFACTOR',
  TEST_GENERATION: 'TEST_GENERATION',
  DEPENDENCY_UPDATE: 'DEPENDENCY_UPDATE'
};

/**
 * Safety scoring system
 */
class SafetyScorer {
  constructor() {
    this.factors = {
      COMPLEXITY: { weight: 0.25, description: 'Code complexity and nesting' },
      TEST_COVERAGE: { weight: 0.20, description: 'Test coverage for affected code' },
      DEPENDENCIES: { weight: 0.15, description: 'Number of dependent files' },
      CHANGE_SIZE: { weight: 0.15, description: 'Lines of code changed' },
      FILE_CRITICALITY: { weight: 0.10, description: 'Importance of affected files' },
      RECENT_CHANGES: { weight: 0.10, description: 'Recent modification frequency' },
      DEVELOPER_CONFIDENCE: { weight: 0.05, description: 'Historical success rate' }
    };
  }

  /**
   * Calculate safety score for a proposed change
   */
  calculateSafetyScore(change, context = {}) {
    let totalScore = 0;
    const factorScores = {};

    for (const [factor, config] of Object.entries(this.factors)) {
      const score = this.calculateFactorScore(factor, change, context);
      factorScores[factor] = score;
      totalScore += score * config.weight;
    }

    // Normalize to 0-100 scale
    const normalizedScore = Math.max(0, Math.min(100, totalScore * 100));

    return {
      score: normalizedScore,
      level: this.getRiskLevel(normalizedScore),
      factors: factorScores,
      recommendations: this.generateRecommendations(normalizedScore, factorScores)
    };
  }

  calculateFactorScore(factor, change, context) {
    switch (factor) {
      case 'COMPLEXITY':
        return this.assessComplexity(change, context);
      case 'TEST_COVERAGE':
        return this.assessTestCoverage(change, context);
      case 'DEPENDENCIES':
        return this.assessDependencies(change, context);
      case 'CHANGE_SIZE':
        return this.assessChangeSize(change);
      case 'FILE_CRITICALITY':
        return this.assessFileCriticality(change, context);
      case 'RECENT_CHANGES':
        return this.assessRecentChanges(change, context);
      case 'DEVELOPER_CONFIDENCE':
        return this.assessDeveloperConfidence(change, context);
      default:
        return 0.5; // Neutral score
    }
  }

  assessComplexity(change, context) {
    const code = change.newContent || '';
    const lines = code.split('\n').length;
    const conditions = (code.match(/\b(if|else|switch|case|\?|&&|\|\|)\b/g) || []).length;
    const loops = (code.match(/\b(for|while|do)\b/g) || []).length;
    const nesting = this.calculateMaxNesting(code);

    // Higher complexity = lower safety score
    const complexityScore = (lines / 50) + (conditions / 5) + (loops / 3) + (nesting / 4);
    return Math.max(0, 1 - Math.min(1, complexityScore / 5));
  }

  assessTestCoverage(change, context) {
    const testCoverage = context.testCoverage || 0;
    const hasTests = context.hasTests || false;
    const testFiles = context.testFiles || [];

    if (!hasTests) return 0.2; // Low safety without tests
    if (testCoverage > 80) return 0.9; // High safety with good coverage
    if (testCoverage > 60) return 0.7;
    if (testCoverage > 40) return 0.5;
    return 0.3;
  }

  assessDependencies(change, context) {
    const dependentFiles = context.dependentFiles || [];
    const importedBy = context.importedBy || [];
    
    const totalDependencies = dependentFiles.length + importedBy.length;
    
    if (totalDependencies === 0) return 0.9; // Safe if no dependencies
    if (totalDependencies < 3) return 0.7;
    if (totalDependencies < 10) return 0.5;
    return 0.2; // Risky with many dependencies
  }

  assessChangeSize(change) {
    const linesAdded = change.linesAdded || 0;
    const linesRemoved = change.linesRemoved || 0;
    const totalChanges = linesAdded + linesRemoved;

    if (totalChanges < 5) return 0.9;   // Very safe for small changes
    if (totalChanges < 20) return 0.7;  // Safe for moderate changes
    if (totalChanges < 50) return 0.5;  // Moderate risk
    return 0.2; // High risk for large changes
  }

  assessFileCriticality(change, context) {
    const filePath = change.filePath || '';
    const fileName = path.basename(filePath);
    
    // Critical files (lower safety score)
    const criticalPatterns = [
      /package\.json$/,
      /\.config\./,
      /index\.(js|ts)$/,
      /main\.(js|ts)$/,
      /app\.(js|ts)$/,
      /server\.(js|ts)$/
    ];

    const isCritical = criticalPatterns.some(pattern => pattern.test(fileName));
    if (isCritical) return 0.3;

    // Test files (higher safety)
    if (/\.(test|spec)\.(js|ts)$/.test(fileName)) return 0.8;

    // Regular files
    return 0.6;
  }

  assessRecentChanges(change, context) {
    const recentChanges = context.recentChanges || [];
    const lastModified = context.lastModified || new Date(0);
    
    const daysSinceLastChange = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastChange > 7) return 0.8;  // Safe if not recently changed
    if (daysSinceLastChange > 3) return 0.6;
    if (daysSinceLastChange > 1) return 0.4;
    return 0.2; // Risky if changed very recently
  }

  assessDeveloperConfidence(change, context) {
    const successRate = context.developerSuccessRate || 0.7;
    const similarChanges = context.similarChanges || 0;
    
    // Higher success rate and experience = higher safety
    let confidence = successRate;
    if (similarChanges > 10) confidence += 0.1;
    if (similarChanges > 50) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  calculateMaxNesting(code) {
    let maxNesting = 0;
    let currentNesting = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (char === '}') {
        currentNesting--;
      }
    }
    
    return maxNesting;
  }

  getRiskLevel(score) {
    if (score >= 80) return RISK_LEVELS.LOW;
    if (score >= 50) return RISK_LEVELS.MEDIUM;
    if (score >= 20) return RISK_LEVELS.HIGH;
    return RISK_LEVELS.CRITICAL;
  }

  generateRecommendations(score, factors) {
    const recommendations = [];
    
    if (score < 50) {
      recommendations.push('Consider manual review before applying changes');
    }
    
    if (factors.TEST_COVERAGE < 0.5) {
      recommendations.push('Add tests before making changes');
    }
    
    if (factors.DEPENDENCIES < 0.5) {
      recommendations.push('Review impact on dependent files');
    }
    
    if (factors.COMPLEXITY < 0.5) {
      recommendations.push('Consider breaking down complex changes');
    }
    
    return recommendations;
  }
}

/**
 * Git safety operations
 */
class GitSafetyManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Create safety branch for changes
   */
  async createSafetyBranch(changeId) {
    const branchName = `codemind-safety-${changeId}-${Date.now()}`;
    
    try {
      // Create and switch to safety branch
      execSync(`git checkout -b ${branchName}`, { 
        cwd: this.projectPath,
        stdio: 'ignore'
      });
      
      return branchName;
    } catch (error) {
      console.warn('Failed to create safety branch:', error.message);
      return null;
    }
  }

  /**
   * Create revert snapshot
   */
  async createRevertSnapshot(files, changeId) {
    const snapshotDir = path.join(this.projectPath, '.codemind', 'snapshots');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    const snapshotPath = path.join(snapshotDir, `${changeId}.json`);
    const snapshot = {
      id: changeId,
      timestamp: new Date().toISOString(),
      files: {}
    };

    // Store original file contents
    for (const filePath of files) {
      const fullPath = path.join(this.projectPath, filePath);
      if (fs.existsSync(fullPath)) {
        snapshot.files[filePath] = fs.readFileSync(fullPath, 'utf8');
      }
    }

    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    
    // Schedule cleanup after 7 days
    setTimeout(() => {
      this.cleanupSnapshot(changeId);
    }, 7 * 24 * 60 * 60 * 1000);

    return snapshotPath;
  }

  /**
   * Revert changes using snapshot
   */
  async revertFromSnapshot(changeId) {
    const snapshotPath = path.join(this.projectPath, '.codemind', 'snapshots', `${changeId}.json`);
    
    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot not found for change ${changeId}`);
    }

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    
    // Restore original file contents
    for (const [filePath, content] of Object.entries(snapshot.files)) {
      const fullPath = path.join(this.projectPath, filePath);
      fs.writeFileSync(fullPath, content);
    }

    console.log(`✅ Reverted changes for ${changeId}`);
    return true;
  }

  /**
   * Cleanup old snapshots
   */
  cleanupSnapshot(changeId) {
    const snapshotPath = path.join(this.projectPath, '.codemind', 'snapshots', `${changeId}.json`);
    if (fs.existsSync(snapshotPath)) {
      fs.unlinkSync(snapshotPath);
    }
  }

  /**
   * Check if working directory is clean
   */
  isWorkingDirectoryClean() {
    try {
      const status = execSync('git status --porcelain', {
        cwd: this.projectPath,
        encoding: 'utf8'
      });
      return status.trim() === '';
    } catch (error) {
      return false; // Not a git repository or other error
    }
  }
}

/**
 * Main Change Safety Protocol
 */
export class ChangeSafetyProtocol {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.safetyScorer = new SafetyScorer();
    this.gitManager = new GitSafetyManager(projectPath);
    this.autonomyLevel = options.autonomyLevel || AUTONOMY_LEVELS.ASSISTANT;
    this.changeHistory = [];
    this.maxChangesPerHour = options.maxChangesPerHour || 3;
  }

  /**
   * Evaluate and potentially execute a proposed change
   */
  async evaluateChange(change, context = {}) {
    const changeId = this.generateChangeId();
    const evaluation = {
      id: changeId,
      timestamp: new Date(),
      change,
      context,
      safety: null,
      decision: null,
      executed: false
    };

    // Step 1: Calculate safety score
    evaluation.safety = this.safetyScorer.calculateSafetyScore(change, context);

    // Step 2: Check rate limiting
    if (!this.checkRateLimit()) {
      evaluation.decision = {
        action: 'REJECT',
        reason: 'Rate limit exceeded (max 3 changes per hour)',
        requiresApproval: false
      };
      return evaluation;
    }

    // Step 3: Determine appropriate workflow based on autonomy level and safety
    evaluation.decision = this.determineWorkflow(evaluation.safety, change);

    // Step 4: Execute if approved
    if (evaluation.decision.action === 'EXECUTE') {
      evaluation.executed = await this.executeChange(changeId, change, evaluation.safety);
    }

    // Store in history
    this.changeHistory.push(evaluation);
    if (this.changeHistory.length > 100) {
      this.changeHistory.shift();
    }

    return evaluation;
  }

  /**
   * Determine workflow based on safety score and autonomy level
   */
  determineWorkflow(safety, change) {
    const { score, level } = safety;

    // Observer mode: never execute
    if (this.autonomyLevel === AUTONOMY_LEVELS.OBSERVER) {
      return {
        action: 'REPORT',
        reason: 'Observer mode - only reporting issues',
        requiresApproval: false
      };
    }

    // Critical risk: always require manual review
    if (level === RISK_LEVELS.CRITICAL) {
      return {
        action: 'MANUAL_REVIEW',
        reason: 'Critical risk detected - manual review required',
        requiresApproval: true,
        reviewRequired: true
      };
    }

    // High risk: depends on autonomy level
    if (level === RISK_LEVELS.HIGH) {
      if (this.autonomyLevel >= AUTONOMY_LEVELS.AUTONOMOUS) {
        return {
          action: 'EXECUTE_WITH_CONFIRMATION',
          reason: 'High risk - showing diff and requiring confirmation',
          requiresApproval: true,
          showDiff: true
        };
      } else {
        return {
          action: 'MANUAL_REVIEW',
          reason: 'High risk - manual review required',
          requiresApproval: true
        };
      }
    }

    // Medium risk: depends on autonomy level
    if (level === RISK_LEVELS.MEDIUM) {
      if (this.autonomyLevel >= AUTONOMY_LEVELS.PARTNER) {
        return {
          action: 'EXECUTE_WITH_APPROVAL',
          reason: 'Medium risk - single-key approval required',
          requiresApproval: true
        };
      } else {
        return {
          action: 'SUGGEST',
          reason: 'Medium risk - suggesting fix for manual application',
          requiresApproval: false
        };
      }
    }

    // Low risk: can auto-apply based on autonomy level
    if (this.autonomyLevel >= AUTONOMY_LEVELS.PARTNER) {
      return {
        action: 'EXECUTE',
        reason: 'Low risk - auto-applying with notification',
        requiresApproval: false
      };
    } else {
      return {
        action: 'SUGGEST',
        reason: 'Low risk - suggesting fix for manual application',
        requiresApproval: false
      };
    }
  }

  /**
   * Execute a change with full safety protocol
   */
  async executeChange(changeId, change, safety) {
    try {
      // Step 1: Create safety branch
      const safetyBranch = await this.gitManager.createSafetyBranch(changeId);
      
      // Step 2: Create revert snapshot
      const affectedFiles = [change.filePath];
      const snapshotPath = await this.gitManager.createRevertSnapshot(affectedFiles, changeId);
      
      // Step 3: Apply the change
      const fullPath = path.join(this.projectPath, change.filePath);
      fs.writeFileSync(fullPath, change.newContent);
      
      // Step 4: Generate tests if needed
      if (change.type === CHANGE_TYPES.SECURITY_FIX || safety.score < 70) {
        await this.generateTests(change);
      }
      
      // Step 5: Run existing tests
      const testResults = await this.runTests(change.filePath);
      
      if (!testResults.passed) {
        // Revert if tests fail
        await this.gitManager.revertFromSnapshot(changeId);
        return {
          success: false,
          reason: 'Tests failed after applying change',
          testResults
        };
      }
      
      // Step 6: Commit changes
      if (safetyBranch) {
        execSync(`git add ${change.filePath}`, { cwd: this.projectPath });
        execSync(`git commit -m "CodeMind auto-fix: ${change.description} (${changeId})"`, {
          cwd: this.projectPath
        });
      }
      
      console.log(`✅ Successfully applied change ${changeId}`);
      console.log(`📁 Snapshot saved: ${snapshotPath}`);
      console.log(`🌿 Safety branch: ${safetyBranch}`);
      
      return {
        success: true,
        changeId,
        safetyBranch,
        snapshotPath,
        testResults
      };
      
    } catch (error) {
      console.error(`❌ Failed to execute change ${changeId}:`, error.message);
      
      // Attempt to revert
      try {
        await this.gitManager.revertFromSnapshot(changeId);
      } catch (revertError) {
        console.error('Failed to revert changes:', revertError.message);
      }
      
      return {
        success: false,
        reason: error.message
      };
    }
  }

  /**
   * Generate tests for a change
   */
  async generateTests(change) {
    // This would integrate with the test generation system
    console.log(`🧪 Generating tests for ${change.filePath}...`);
    // Implementation would depend on the test framework and change type
  }

  /**
   * Run tests for affected files
   */
  async runTests(filePath) {
    try {
      // Run tests related to the changed file
      const testCommand = this.getTestCommand(filePath);
      execSync(testCommand, { cwd: this.projectPath, stdio: 'ignore' });
      
      return { passed: true };
    } catch (error) {
      return { 
        passed: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get appropriate test command for file
   */
  getTestCommand(filePath) {
    // Detect test framework and return appropriate command
    if (fs.existsSync(path.join(this.projectPath, 'jest.config.js'))) {
      return `npm test -- --testPathPattern=${filePath}`;
    } else if (fs.existsSync(path.join(this.projectPath, 'vitest.config.js'))) {
      return `npm run test -- ${filePath}`;
    } else {
      return 'npm test';
    }
  }

  /**
   * Check rate limiting
   */
  checkRateLimit() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentChanges = this.changeHistory.filter(
      change => change.timestamp > oneHourAgo && change.executed
    );
    
    return recentChanges.length < this.maxChangesPerHour;
  }

  /**
   * Generate unique change ID
   */
  generateChangeId() {
    return `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get change history
   */
  getChangeHistory(limit = 10) {
    return this.changeHistory.slice(-limit);
  }

  /**
   * Get safety statistics
   */
  getSafetyStatistics() {
    const total = this.changeHistory.length;
    const executed = this.changeHistory.filter(c => c.executed).length;
    const successful = this.changeHistory.filter(c => c.executed && c.success !== false).length;
    
    const riskLevels = this.changeHistory.reduce((acc, change) => {
      const level = change.safety?.level || 'UNKNOWN';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      executed,
      successful,
      successRate: executed > 0 ? (successful / executed) * 100 : 0,
      riskLevels,
      autonomyLevel: this.autonomyLevel,
      maxChangesPerHour: this.maxChangesPerHour
    };
  }

  /**
   * Set autonomy level
   */
  setAutonomyLevel(level) {
    if (Object.values(AUTONOMY_LEVELS).includes(level)) {
      this.autonomyLevel = level;
      console.log(`🤖 Autonomy level set to: ${Object.keys(AUTONOMY_LEVELS)[level]}`);
    } else {
      throw new Error('Invalid autonomy level');
    }
  }
}

export default ChangeSafetyProtocol;