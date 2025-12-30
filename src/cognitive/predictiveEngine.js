/**
 * 🧱 PILLAR 2: Predictive Assistance Engine
 * 
 * Catches bugs before you write them.
 * Predicts problems before they happen.
 */

import fs from 'fs';
import path from 'path';

// Risk levels
export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// Prediction types
export const PREDICTION_TYPES = {
  NULL_POINTER: 'NULL_POINTER',
  RACE_CONDITION: 'RACE_CONDITION',
  MEMORY_LEAK: 'MEMORY_LEAK',
  PERFORMANCE_BOTTLENECK: 'PERFORMANCE_BOTTLENECK',
  SECURITY_VULNERABILITY: 'SECURITY_VULNERABILITY',
  TYPE_SAFETY: 'TYPE_SAFETY',
  API_MISUSE: 'API_MISUSE',
  ERROR_PRONE_PATTERN: 'ERROR_PRONE_PATTERN',
  UNHANDLED_EDGE_CASE: 'UNHANDLED_EDGE_CASE',
  ASYNC_ISSUE: 'ASYNC_ISSUE',
};

/**
 * Pattern-based static analyzer
 */
class StaticPredictor {
  constructor() {
    this.patterns = this.initializePatterns();
  }

  initializePatterns() {
    return {
      // Null pointer risks
      nullPointer: [
        { pattern: /(\w+)\.(\w+)(?!\s*\?\.)(?!\s*&&)/g, risk: 'Property access without null check' },
        { pattern: /(\w+)\[(\w+)\](?!\s*\?\?)/g, risk: 'Array access without bounds check' },
        { pattern: /JSON\.parse\(([^)]+)\)(?!\s*\?\?)/g, risk: 'JSON.parse without error handling' },
      ],
      
      // Async issues
      asyncIssues: [
        { pattern: /(?<!await\s)(\w+)\.(then|catch)\(/g, risk: 'Promise without await may cause race condition' },
        { pattern: /async\s+\w+[^{]*\{[^}]*(?!await)[^}]*\}/g, risk: 'Async function without await' },
        { pattern: /new\s+Promise\([^)]*\)\s*(?!\.catch|\.then)/g, risk: 'Unhandled promise' },
      ],
      
      // Memory leaks
      memoryLeaks: [
        { pattern: /addEventListener\([^)]+\)(?![^]*removeEventListener)/g, risk: 'Event listener without cleanup' },
        { pattern: /setInterval\([^)]+\)(?![^]*clearInterval)/g, risk: 'Interval without cleanup' },
        { pattern: /setTimeout\([^)]+\)(?![^]*clearTimeout)/g, risk: 'Timeout may need cleanup' },
      ],
      
      // Security issues
      security: [
        { pattern: /eval\s*\(/g, risk: 'eval() is dangerous - code injection risk' },
        { pattern: /innerHTML\s*=/g, risk: 'innerHTML can lead to XSS' },
        { pattern: /document\.write/g, risk: 'document.write is dangerous' },
        { pattern: /\$\{[^}]*\}\s*(?=.*(?:exec|query|sql))/gi, risk: 'Potential SQL injection' },
      ],
      
      // Performance
      performance: [
        { pattern: /for\s*\([^)]*\)\s*\{[^}]*\.push\(/g, risk: 'Array push in loop - consider pre-allocation' },
        { pattern: /\.filter\([^)]+\)\.map\(/g, risk: 'Chained filter+map - could be single reduce' },
        { pattern: /JSON\.parse\(JSON\.stringify/g, risk: 'Deep clone via JSON is slow' },
      ],
      
      // Error-prone patterns
      errorProne: [
        { pattern: /==(?!=)/g, risk: 'Loose equality - use === instead' },
        { pattern: /!=(?!=)/g, risk: 'Loose inequality - use !== instead' },
        { pattern: /typeof\s+\w+\s*===?\s*['"]undefined['"]/g, risk: 'Consider optional chaining instead' },
        { pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g, risk: 'Empty catch block swallows errors' },
      ],
    };
  }

  predict(code) {
    const predictions = [];

    for (const [category, patterns] of Object.entries(this.patterns)) {
      for (const { pattern, risk } of patterns) {
        const matches = code.matchAll(pattern);
        for (const match of matches) {
          predictions.push({
            type: this.categoryToType(category),
            risk,
            location: this.getLocation(code, match.index),
            match: match[0].slice(0, 50),
            confidence: 0.7,
            category,
          });
        }
      }
    }

    return predictions;
  }

  categoryToType(category) {
    const mapping = {
      nullPointer: PREDICTION_TYPES.NULL_POINTER,
      asyncIssues: PREDICTION_TYPES.ASYNC_ISSUE,
      memoryLeaks: PREDICTION_TYPES.MEMORY_LEAK,
      security: PREDICTION_TYPES.SECURITY_VULNERABILITY,
      performance: PREDICTION_TYPES.PERFORMANCE_BOTTLENECK,
      errorProne: PREDICTION_TYPES.ERROR_PRONE_PATTERN,
    };
    return mapping[category] || PREDICTION_TYPES.ERROR_PRONE_PATTERN;
  }

  getLocation(code, index) {
    const lines = code.slice(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length,
    };
  }
}

/**
 * Historical pattern analyzer
 */
class HistoricalPredictor {
  constructor() {
    this.mistakeHistory = [];
    this.patternFrequency = new Map();
  }

  recordMistake(mistake) {
    this.mistakeHistory.push({
      ...mistake,
      timestamp: Date.now(),
    });

    // Update frequency
    const key = `${mistake.type}:${mistake.pattern}`;
    this.patternFrequency.set(key, (this.patternFrequency.get(key) || 0) + 1);

    // Keep history bounded
    if (this.mistakeHistory.length > 500) {
      this.mistakeHistory.shift();
    }
  }

  predict(code, context = {}) {
    const predictions = [];

    // Find recurring patterns
    for (const [key, frequency] of this.patternFrequency.entries()) {
      if (frequency >= 2) {
        const [type, pattern] = key.split(':');
        
        // Check if similar pattern exists in current code
        if (code.includes(pattern) || this.similarPatternExists(code, pattern)) {
          predictions.push({
            type,
            risk: `You've made this mistake ${frequency} times before`,
            confidence: Math.min(0.5 + (frequency * 0.1), 0.95),
            historical: true,
            frequency,
          });
        }
      }
    }

    return predictions;
  }

  similarPatternExists(code, pattern) {
    // Simple similarity check - could be enhanced with fuzzy matching
    const words = pattern.split(/\W+/).filter(w => w.length > 3);
    return words.some(word => code.includes(word));
  }

  getTopMistakes(limit = 5) {
    return [...this.patternFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, frequency]) => {
        const [type, pattern] = key.split(':');
        return { type, pattern, frequency };
      });
  }
}

/**
 * Risk Scoring System
 */
class RiskScoringSystem {
  constructor() {
    this.riskFactors = {
      COMPLEXITY: { weight: 0.15, metrics: ['cyclomatic', 'cognitive', 'nesting'] },
      NOVELTY: { weight: 0.10, metrics: ['unfamiliarApis', 'newPatterns'] },
      CRITICALITY: { weight: 0.20, metrics: ['userImpact', 'dataLossRisk'] },
      CHANGE_SIZE: { weight: 0.10, metrics: ['linesChanged', 'filesTouched'] },
      TEST_COVERAGE: { weight: 0.15, metrics: ['coveragePercentage', 'edgeCaseTests'] },
      DEVELOPER_FATIGUE: { weight: 0.10, metrics: ['timeWorking', 'errorRate'] },
      EXTERNAL_DEPS: { weight: 0.10, metrics: ['thirdPartyApis', 'networkCalls'] },
      CONCURRENCY: { weight: 0.10, metrics: ['asyncOperations', 'sharedState'] },
    };
  }

  calculateRiskScore(context) {
    let totalScore = 0;
    let totalWeight = 0;
    const factorScores = {};

    for (const [factor, config] of Object.entries(this.riskFactors)) {
      const score = this.calculateFactorScore(factor, context);
      factorScores[factor] = score;
      totalScore += score * config.weight;
      totalWeight += config.weight;
    }

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      score: normalizedScore,
      level: this.getRiskLevel(normalizedScore),
      factors: factorScores,
      topRisks: this.getTopRiskFactors(factorScores),
    };
  }

  calculateFactorScore(factor, context) {
    switch (factor) {
      case 'COMPLEXITY':
        return this.calculateComplexityRisk(context.code);
      case 'CHANGE_SIZE':
        return this.calculateChangeSizeRisk(context.changes);
      case 'TEST_COVERAGE':
        return this.calculateTestCoverageRisk(context.testCoverage);
      case 'CONCURRENCY':
        return this.calculateConcurrencyRisk(context.code);
      case 'EXTERNAL_DEPS':
        return this.calculateDependencyRisk(context.code);
      default:
        return 0.5; // Default medium risk
    }
  }

  calculateComplexityRisk(code) {
    if (!code) return 0;
    
    const lines = code.split('\n').length;
    const conditions = (code.match(/\b(if|else|switch|case|\?|&&|\|\|)\b/g) || []).length;
    const loops = (code.match(/\b(for|while|do)\b/g) || []).length;
    const nesting = this.calculateMaxNesting(code);

    // Normalize to 0-1
    const lineScore = Math.min(lines / 500, 1);
    const conditionScore = Math.min(conditions / 20, 1);
    const loopScore = Math.min(loops / 10, 1);
    const nestingScore = Math.min(nesting / 5, 1);

    return (lineScore + conditionScore + loopScore + nestingScore) / 4;
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

  calculateChangeSizeRisk(changes) {
    if (!changes) return 0;
    const totalLines = changes.reduce((sum, c) => sum + (c.linesChanged || 0), 0);
    return Math.min(totalLines / 200, 1);
  }

  calculateTestCoverageRisk(coverage) {
    if (coverage === undefined) return 0.5; // Unknown
    return 1 - (coverage / 100); // Lower coverage = higher risk
  }

  calculateConcurrencyRisk(code) {
    if (!code) return 0;
    
    const asyncCount = (code.match(/\b(async|await|Promise)\b/g) || []).length;
    const callbackCount = (code.match(/\bcallback\b/g) || []).length;
    
    return Math.min((asyncCount + callbackCount) / 20, 1);
  }

  calculateDependencyRisk(code) {
    if (!code) return 0;
    
    const imports = (code.match(/\b(import|require)\b/g) || []).length;
    const apiCalls = (code.match(/\b(fetch|axios|http)\b/g) || []).length;
    
    return Math.min((imports + apiCalls * 2) / 30, 1);
  }

  getRiskLevel(score) {
    if (score < 0.3) return RISK_LEVELS.LOW;
    if (score < 0.6) return RISK_LEVELS.MEDIUM;
    if (score < 0.8) return RISK_LEVELS.HIGH;
    return RISK_LEVELS.CRITICAL;
  }

  getTopRiskFactors(factorScores, limit = 3) {
    return Object.entries(factorScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([factor, score]) => ({ factor, score }));
  }
}


/**
 * Main Predictive Assistance Engine
 */
export class PredictiveAssistanceEngine {
  constructor() {
    this.staticPredictor = new StaticPredictor();
    this.historicalPredictor = new HistoricalPredictor();
    this.riskScoring = new RiskScoringSystem();
    this.predictionHistory = [];
  }

  /**
   * Predict problems in code before they happen
   */
  async predictProblems(code, context = {}) {
    // 1. Static prediction (code hasn't run yet)
    const staticPredictions = this.staticPredictor.predict(code);

    // 2. Historical prediction (based on past mistakes)
    const historicalPredictions = this.historicalPredictor.predict(code, context);

    // 3. Combine predictions
    const allPredictions = [...staticPredictions, ...historicalPredictions];

    // 4. Calculate overall risk
    const riskScore = this.riskScoring.calculateRiskScore({ ...context, code });

    // 5. Generate interventions
    const interventions = this.generateInterventions(allPredictions, riskScore);

    const result = {
      predictions: allPredictions,
      riskScore,
      interventions,
      timestamp: Date.now(),
      summary: this.generateSummary(allPredictions, riskScore),
    };

    // Store in history
    this.predictionHistory.push(result);
    if (this.predictionHistory.length > 100) {
      this.predictionHistory.shift();
    }

    return result;
  }

  /**
   * Generate interventions based on predictions
   */
  generateInterventions(predictions, riskScore) {
    const interventions = [];

    // Group predictions by type
    const byType = {};
    for (const pred of predictions) {
      byType[pred.type] = byType[pred.type] || [];
      byType[pred.type].push(pred);
    }

    // Generate intervention for each type
    for (const [type, preds] of Object.entries(byType)) {
      interventions.push({
        type,
        count: preds.length,
        priority: this.calculatePriority(type, preds.length, riskScore),
        suggestion: this.getSuggestion(type),
        autoFixable: this.isAutoFixable(type),
      });
    }

    // Sort by priority
    return interventions.sort((a, b) => b.priority - a.priority);
  }

  calculatePriority(type, count, riskScore) {
    const typePriority = {
      [PREDICTION_TYPES.SECURITY_VULNERABILITY]: 10,
      [PREDICTION_TYPES.NULL_POINTER]: 8,
      [PREDICTION_TYPES.RACE_CONDITION]: 7,
      [PREDICTION_TYPES.MEMORY_LEAK]: 6,
      [PREDICTION_TYPES.ASYNC_ISSUE]: 6,
      [PREDICTION_TYPES.TYPE_SAFETY]: 5,
      [PREDICTION_TYPES.PERFORMANCE_BOTTLENECK]: 4,
      [PREDICTION_TYPES.ERROR_PRONE_PATTERN]: 3,
    };

    const base = typePriority[type] || 5;
    return base + (count * 0.5) + (riskScore.score * 2);
  }

  getSuggestion(type) {
    const suggestions = {
      [PREDICTION_TYPES.NULL_POINTER]: 'Add null checks or use optional chaining (?.) before accessing properties',
      [PREDICTION_TYPES.ASYNC_ISSUE]: 'Ensure all promises are properly awaited or have error handlers',
      [PREDICTION_TYPES.MEMORY_LEAK]: 'Add cleanup functions for event listeners and intervals',
      [PREDICTION_TYPES.SECURITY_VULNERABILITY]: 'Review security implications and sanitize inputs',
      [PREDICTION_TYPES.PERFORMANCE_BOTTLENECK]: 'Consider optimizing this pattern for better performance',
      [PREDICTION_TYPES.ERROR_PRONE_PATTERN]: 'This pattern is known to cause bugs - consider alternatives',
      [PREDICTION_TYPES.RACE_CONDITION]: 'Add proper synchronization or use atomic operations',
      [PREDICTION_TYPES.TYPE_SAFETY]: 'Add type annotations or runtime type checks',
    };

    return suggestions[type] || 'Review this code for potential issues';
  }

  isAutoFixable(type) {
    const autoFixable = [
      PREDICTION_TYPES.ERROR_PRONE_PATTERN,
      PREDICTION_TYPES.NULL_POINTER,
    ];
    return autoFixable.includes(type);
  }

  generateSummary(predictions, riskScore) {
    const critical = predictions.filter(p => 
      p.type === PREDICTION_TYPES.SECURITY_VULNERABILITY ||
      p.type === PREDICTION_TYPES.NULL_POINTER
    ).length;

    const warnings = predictions.length - critical;

    return {
      total: predictions.length,
      critical,
      warnings,
      riskLevel: riskScore.level,
      message: this.getSummaryMessage(critical, warnings, riskScore.level),
    };
  }

  getSummaryMessage(critical, warnings, riskLevel) {
    if (critical > 0) {
      return `⚠️ ${critical} critical issue(s) detected - review before proceeding`;
    }
    if (riskLevel === RISK_LEVELS.HIGH || riskLevel === RISK_LEVELS.CRITICAL) {
      return `🔶 High risk code - consider adding tests`;
    }
    if (warnings > 5) {
      return `💡 ${warnings} potential improvements found`;
    }
    if (warnings > 0) {
      return `✓ ${warnings} minor suggestion(s)`;
    }
    return '✅ Code looks good!';
  }

  /**
   * Record a mistake for learning
   */
  recordMistake(mistake) {
    this.historicalPredictor.recordMistake(mistake);
  }

  /**
   * Get prediction accuracy metrics
   */
  getAccuracyMetrics() {
    // This would be populated by tracking which predictions were correct
    return {
      totalPredictions: this.predictionHistory.length,
      // Would need feedback loop to calculate actual accuracy
      estimatedAccuracy: 0.75,
    };
  }

  /**
   * Get top recurring mistakes
   */
  getTopMistakes(limit = 5) {
    return this.historicalPredictor.getTopMistakes(limit);
  }

  /**
   * Format predictions for display
   */
  formatPredictions(result) {
    const lines = [];
    
    lines.push(`\n🔮 PREDICTIVE ANALYSIS`);
    lines.push(`${'─'.repeat(50)}`);
    lines.push(`Risk Level: ${result.riskScore.level} (${(result.riskScore.score * 100).toFixed(0)}%)`);
    lines.push(`${result.summary.message}`);
    lines.push('');

    if (result.predictions.length > 0) {
      lines.push(`Found ${result.predictions.length} potential issue(s):`);
      lines.push('');

      for (const pred of result.predictions.slice(0, 5)) {
        const icon = pred.type === PREDICTION_TYPES.SECURITY_VULNERABILITY ? '🔴' :
                     pred.type === PREDICTION_TYPES.NULL_POINTER ? '🟠' : '🟡';
        lines.push(`${icon} ${pred.risk}`);
        if (pred.location) {
          lines.push(`   Line ${pred.location.line}`);
        }
      }

      if (result.predictions.length > 5) {
        lines.push(`   ... and ${result.predictions.length - 5} more`);
      }
    }

    if (result.interventions.length > 0) {
      lines.push('');
      lines.push('💡 Suggestions:');
      for (const intervention of result.interventions.slice(0, 3)) {
        lines.push(`   • ${intervention.suggestion}`);
      }
    }

    return lines.join('\n');
  }
}

export default PredictiveAssistanceEngine;
