/**
 * 🧠 LETTA COGNITIVE ENGINE
 * 
 * The main orchestrator that combines all six pillars into a unified
 * cognitive partner that thinks alongside developers.
 * 
 * Pillars:
 * 1. Intent Awareness Engine - Knows what you're trying to do
 * 2. Predictive Assistance Engine - Catches bugs before you write them
 * 3. Self-Explaining Code System - Living documentation (TODO)
 * 4. Why-First Debugging Engine - Explains root causes (TODO)
 * 5. Self-Improving System - Learns your patterns
 * 6. Flow Optimizer - Protects your deep work
 */

import { IntentAwarenessEngine, INTENTS, INTENT_UI_CONFIG } from './intentEngine.js';
import { PredictiveAssistanceEngine, RISK_LEVELS, PREDICTION_TYPES } from './predictiveEngine.js';
import { FlowOptimizer, FLOW_STATES, COGNITIVE_LOAD, INTERVENTIONS } from './flowOptimizer.js';

/**
 * Developer Profile - Learns and stores developer preferences
 */
class DeveloperProfile {
  constructor() {
    this.preferences = {
      verbosity: 'MODERATE',
      timing: 'AFTER_PAUSE',
      suggestionStyle: 'CONCISE',
    };
    this.patterns = {
      commonErrors: [],
      codingStyle: {},
      productiveTimes: [],
    };
    this.stats = {
      totalSessions: 0,
      totalAnalyses: 0,
      suggestionsAccepted: 0,
      suggestionsRejected: 0,
      errorsPreventedEstimate: 0,
    };
    this.learningRate = 0.1;
  }

  /**
   * Update preferences based on interaction
   */
  updateFromInteraction(interaction) {
    // Learn from accepted/rejected suggestions
    if (interaction.accepted) {
      this.stats.suggestionsAccepted++;
      // Reinforce the style that was accepted
      if (interaction.suggestionStyle) {
        this.preferences.suggestionStyle = interaction.suggestionStyle;
      }
    } else if (interaction.rejected) {
      this.stats.suggestionsRejected++;
    }

    // Learn timing preferences
    if (interaction.responseTime) {
      if (interaction.responseTime < 1000) {
        // Quick response = developer wanted immediate help
        this.preferences.timing = 'IMMEDIATE';
      } else if (interaction.responseTime > 5000) {
        // Slow response = developer prefers to think first
        this.preferences.timing = 'AFTER_PAUSE';
      }
    }

    this.stats.totalAnalyses++;
  }

  /**
   * Record a common error pattern
   */
  recordErrorPattern(error) {
    const existing = this.patterns.commonErrors.find(e => e.type === error.type);
    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
    } else {
      this.patterns.commonErrors.push({
        type: error.type,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }

    // Keep only top 20 patterns
    this.patterns.commonErrors.sort((a, b) => b.count - a.count);
    this.patterns.commonErrors = this.patterns.commonErrors.slice(0, 20);
  }

  /**
   * Get acceptance rate
   */
  getAcceptanceRate() {
    const total = this.stats.suggestionsAccepted + this.stats.suggestionsRejected;
    return total > 0 ? this.stats.suggestionsAccepted / total : 0.5;
  }

  /**
   * Get profile summary
   */
  getSummary() {
    return {
      preferences: this.preferences,
      topErrors: this.patterns.commonErrors.slice(0, 5),
      acceptanceRate: this.getAcceptanceRate(),
      totalInteractions: this.stats.totalAnalyses,
    };
  }

  /**
   * Export profile for persistence
   */
  export() {
    return {
      preferences: this.preferences,
      patterns: this.patterns,
      stats: this.stats,
      exportedAt: Date.now(),
    };
  }

  /**
   * Import profile from persistence
   */
  import(data) {
    if (data.preferences) this.preferences = { ...this.preferences, ...data.preferences };
    if (data.patterns) this.patterns = { ...this.patterns, ...data.patterns };
    if (data.stats) this.stats = { ...this.stats, ...data.stats };
  }
}

/**
 * Main Cognitive Engine
 */
export class CognitiveEngine {
  constructor(options = {}) {
    // Initialize all pillars
    this.intentEngine = new IntentAwarenessEngine();
    this.predictiveEngine = new PredictiveAssistanceEngine();
    this.flowOptimizer = new FlowOptimizer();
    this.developerProfile = new DeveloperProfile();

    // Configuration
    this.config = {
      enableIntentDetection: options.enableIntentDetection ?? true,
      enablePrediction: options.enablePrediction ?? true,
      enableFlowProtection: options.enableFlowProtection ?? true,
      enableLearning: options.enableLearning ?? true,
      silentMode: options.silentMode ?? false,
      ...options,
    };

    // State
    this.isActive = false;
    this.lastAnalysis = null;
    this.analysisHistory = [];
    this.sessionStart = Date.now();
  }

  /**
   * Start the cognitive engine
   */
  start() {
    this.isActive = true;
    this.sessionStart = Date.now();
    this.developerProfile.stats.totalSessions++;
    return { started: true, timestamp: Date.now() };
  }

  /**
   * Stop the cognitive engine
   */
  stop() {
    this.isActive = false;
    return {
      stopped: true,
      sessionDuration: Date.now() - this.sessionStart,
      stats: this.getSessionStats(),
    };
  }

  /**
   * Main analysis method - thinks alongside the developer
   */
  async analyze(context) {
    if (!this.isActive) {
      return { error: 'Engine not active. Call start() first.' };
    }

    const startTime = Date.now();
    const results = {
      timestamp: startTime,
      intent: null,
      predictions: null,
      flow: null,
      intervention: null,
      suggestions: [],
    };

    // 1. Detect intent (Pillar 1)
    if (this.config.enableIntentDetection) {
      results.intent = await this.intentEngine.detectIntent(context);
    }

    // 2. Check flow state (Pillar 6) - Do this early to decide if we should intervene
    if (this.config.enableFlowProtection) {
      results.flow = await this.flowOptimizer.optimizeFlow({
        ...context,
        sessionDuration: Date.now() - this.sessionStart,
      });

      // If in deep flow, minimize interventions
      if (results.flow.flowState.state === FLOW_STATES.DEEP_FLOW) {
        results.intervention = {
          type: INTERVENTIONS.NO_INTERVENTION,
          reason: 'Developer in deep flow - protecting focus',
        };
        
        // Queue any suggestions for later
        if (results.predictions?.predictions?.length > 0) {
          this.flowOptimizer.queueSuggestion({
            type: 'predictions',
            data: results.predictions,
          });
        }
      }
    }

    // 3. Predict problems (Pillar 2) - Only if not in deep flow
    if (this.config.enablePrediction && 
        results.flow?.flowState?.state !== FLOW_STATES.DEEP_FLOW) {
      results.predictions = await this.predictiveEngine.predictProblems(
        context.code || context.activeFileContent,
        context
      );
    }

    // 4. Decide on intervention based on all signals
    if (!results.intervention) {
      results.intervention = this.decideIntervention(results);
    }

    // 5. Generate suggestions based on intent and predictions
    results.suggestions = this.generateSuggestions(results, context);

    // 6. Learn from this analysis (Pillar 5)
    if (this.config.enableLearning) {
      this.learn(results, context);
    }

    // Store analysis
    results.duration = Date.now() - startTime;
    this.lastAnalysis = results;
    this.analysisHistory.push(results);
    if (this.analysisHistory.length > 100) {
      this.analysisHistory.shift();
    }

    return results;
  }

  /**
   * Decide on intervention based on all signals
   */
  decideIntervention(results) {
    const { intent, predictions, flow } = results;

    // Priority 1: Flow state
    if (flow?.flowState?.state === FLOW_STATES.DEEP_FLOW) {
      return {
        type: INTERVENTIONS.NO_INTERVENTION,
        reason: 'Protecting deep flow',
      };
    }

    // Priority 2: Critical predictions
    if (predictions?.summary?.critical > 0) {
      return {
        type: INTERVENTIONS.TARGETED_ASSISTANCE,
        reason: 'Critical issues detected',
        urgent: true,
      };
    }

    // Priority 3: Developer struggling
    if (flow?.flowState?.state === FLOW_STATES.STRUGGLING) {
      return {
        type: INTERVENTIONS.COMPREHENSIVE_HELP,
        reason: 'Developer appears to be struggling',
      };
    }

    // Priority 4: Intent-based intervention
    if (intent?.intent === INTENTS.STUCK_AND_SEARCHING && intent.confidence > 0.6) {
      return {
        type: INTERVENTIONS.PROACTIVE_HELP,
        reason: 'Developer appears stuck',
      };
    }

    // Priority 5: High cognitive load
    if (flow?.cognitiveLoad?.level === COGNITIVE_LOAD.HIGH) {
      return {
        type: INTERVENTIONS.SIMPLIFY_SUGGESTIONS,
        reason: 'High cognitive load detected',
      };
    }

    // Default: Minimal intervention
    return {
      type: INTERVENTIONS.MINIMAL_SUGGESTIONS,
      reason: 'Normal operation',
    };
  }

  /**
   * Generate suggestions based on analysis results
   */
  generateSuggestions(results, context) {
    const suggestions = [];
    const { intent, predictions, flow, intervention } = results;

    // Don't generate suggestions if we shouldn't intervene
    if (intervention?.type === INTERVENTIONS.NO_INTERVENTION) {
      return suggestions;
    }

    // Add prediction-based suggestions
    if (predictions?.interventions) {
      for (const pred of predictions.interventions.slice(0, 3)) {
        suggestions.push({
          type: 'prediction',
          priority: pred.priority,
          message: pred.suggestion,
          autoFixable: pred.autoFixable,
        });
      }
    }

    // Add intent-based suggestions
    if (intent) {
      const uiConfig = INTENT_UI_CONFIG[intent.intent];
      if (uiConfig?.suggestions?.length > 0) {
        suggestions.push({
          type: 'intent',
          priority: 5,
          message: `Based on your current task: ${uiConfig.suggestions.join(', ')}`,
          uiElements: uiConfig.uiElements,
        });
      }
    }

    // Add flow-based suggestions
    if (flow?.message) {
      suggestions.push({
        type: 'flow',
        priority: 3,
        message: flow.message,
      });
    }

    // Sort by priority
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Learn from analysis results
   */
  learn(results, context) {
    // Record error patterns
    if (results.predictions?.predictions) {
      for (const pred of results.predictions.predictions) {
        this.developerProfile.recordErrorPattern(pred);
        this.predictiveEngine.recordMistake(pred);
      }
    }

    // Update profile stats
    this.developerProfile.stats.totalAnalyses++;
  }

  /**
   * Record user feedback on a suggestion
   */
  recordFeedback(suggestionId, accepted, context = {}) {
    this.developerProfile.updateFromInteraction({
      suggestionId,
      accepted,
      rejected: !accepted,
      responseTime: context.responseTime,
      suggestionStyle: context.suggestionStyle,
    });

    if (accepted) {
      this.developerProfile.stats.errorsPreventedEstimate++;
    }
  }

  /**
   * Record a keystroke for intent detection
   */
  recordKeystroke() {
    this.intentEngine.recordKeystroke();
  }

  /**
   * Record a file change
   */
  recordChange(change) {
    this.intentEngine.recordChange(change);
  }

  /**
   * Record active file change
   */
  recordActiveFile(filePath) {
    this.intentEngine.recordActiveFile(filePath);
  }

  /**
   * Record an error
   */
  recordError(error) {
    this.intentEngine.recordError(error);
    this.developerProfile.recordErrorPattern(error);
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      sessionDuration: Date.now() - this.sessionStart,
      analysisCount: this.analysisHistory.length,
      flow: this.flowOptimizer.getSessionStats(),
      profile: this.developerProfile.getSummary(),
      intentStability: this.intentEngine.getIntentStability(),
      topMistakes: this.predictiveEngine.getTopMistakes(3),
    };
  }

  /**
   * Get current state summary
   */
  getCurrentState() {
    return {
      isActive: this.isActive,
      lastIntent: this.intentEngine.lastIntent,
      flowState: this.flowOptimizer.lastFlowState,
      isInDeepFlow: this.flowOptimizer.isInDeepFlow(),
      isStruggling: this.flowOptimizer.isStruggling(),
    };
  }

  /**
   * Enter focus mode (silence all interventions)
   */
  enterFocusMode(durationMs) {
    return this.flowOptimizer.enterFocusMode(durationMs);
  }

  /**
   * Format analysis results for display
   */
  formatAnalysis(results) {
    const lines = [];

    // Header
    lines.push('\n🧠 COGNITIVE ANALYSIS');
    lines.push('═'.repeat(50));

    // Flow state
    if (results.flow) {
      lines.push(this.flowOptimizer.formatFlowStatus());
    }

    // Intent
    if (results.intent) {
      const confidence = (results.intent.confidence * 100).toFixed(0);
      lines.push(`🎯 Intent: ${results.intent.intent} (${confidence}%)`);
    }

    // Predictions
    if (results.predictions) {
      lines.push(this.predictiveEngine.formatPredictions(results.predictions));
    }

    // Intervention
    if (results.intervention) {
      lines.push(`\n💡 Action: ${results.intervention.type}`);
      lines.push(`   Reason: ${results.intervention.reason}`);
    }

    // Suggestions
    if (results.suggestions?.length > 0) {
      lines.push('\n📋 Suggestions:');
      for (const suggestion of results.suggestions.slice(0, 3)) {
        lines.push(`   • ${suggestion.message}`);
      }
    }

    lines.push('═'.repeat(50));

    return lines.join('\n');
  }

  /**
   * Export engine state for persistence
   */
  exportState() {
    return {
      profile: this.developerProfile.export(),
      config: this.config,
      exportedAt: Date.now(),
    };
  }

  /**
   * Import engine state from persistence
   */
  importState(state) {
    if (state.profile) {
      this.developerProfile.import(state.profile);
    }
    if (state.config) {
      this.config = { ...this.config, ...state.config };
    }
  }
}

// Export all components
export {
  IntentAwarenessEngine,
  PredictiveAssistanceEngine,
  FlowOptimizer,
  INTENTS,
  INTENT_UI_CONFIG,
  RISK_LEVELS,
  PREDICTION_TYPES,
  FLOW_STATES,
  COGNITIVE_LOAD,
  INTERVENTIONS,
};

export default CognitiveEngine;
