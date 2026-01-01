/**
 * 🧠 LETTA COGNITIVE ENGINE
 * 
 * The main orchestrator that combines all six pillars into a unified
 * cognitive partner that thinks alongside developers.
 * 
 * Pillars:
 * 1. Intent Awareness Engine - Knows what you're trying to do
 * 2. Predictive Assistance Engine - Catches bugs before you write them
 * 3. Self-Explaining Code System - Living documentation
 * 4. Why-First Debugging Engine - Explains root causes
 * 5. Self-Improving System - Learns your patterns
 * 6. Flow Optimizer - Protects your deep work
 * 
 * Plus: Developer Digital Twin - A model that learns and predicts your behavior
 */

import { IntentAwarenessEngine, INTENTS, INTENT_UI_CONFIG } from './intentEngine.js';
import { PredictiveAssistanceEngine, RISK_LEVELS, PREDICTION_TYPES } from './predictiveEngine.js';
import { FlowOptimizer, FLOW_STATES, COGNITIVE_LOAD, INTERVENTIONS } from './flowOptimizer.js';
import { ExplanationEngine, EXPLANATION_DEPTH } from './explanationEngine.js';
import { DebuggingEngine, ERROR_CATEGORIES, FIX_DIFFICULTY } from './debuggingEngine.js';
import { DeveloperTwin, SKILL_LEVELS } from './developerTwin.js';
import { SecureCredentialManager } from '../security/credentialManager.js';
import { ChangeSafetyProtocol, AUTONOMY_LEVELS, RISK_LEVELS as SAFETY_RISK_LEVELS } from '../security/changeSafetyProtocol.js';
import { AdaptiveInterface, DISPLAY_MODES, NOTIFICATION_PRIORITIES } from '../ui/adaptiveInterface.js';
import { HybridAnalysisEngine, ANALYSIS_TYPES } from '../analysis/hybridAnalysisEngine.js';
import { InsightEngine, EVENT_TYPES } from '../insights/insightEngine.js';

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
    this.explanationEngine = new ExplanationEngine();
    this.debuggingEngine = new DebuggingEngine();
    this.developerTwin = new DeveloperTwin(options.developerId);
    this.developerProfile = new DeveloperProfile();

    // Initialize new security and architecture components
    this.credentialManager = new SecureCredentialManager();
    this.safetyProtocol = new ChangeSafetyProtocol(options.projectPath || process.cwd(), {
      autonomyLevel: options.autonomyLevel || AUTONOMY_LEVELS.ASSISTANT,
      maxChangesPerHour: options.maxChangesPerHour || 3
    });
    this.adaptiveInterface = new AdaptiveInterface({
      refreshInterval: options.refreshInterval || 5000
    });
    this.hybridAnalyzer = new HybridAnalysisEngine({
      analysisType: options.analysisType || ANALYSIS_TYPES.HYBRID,
      cloudConsent: options.cloudConsent || false,
      offlineMode: options.offlineMode || false
    });

    // Initialize insight engine for comprehensive analytics
    this.insightEngine = new InsightEngine({
      enableGenius: options.enableInsights !== false,
      enablePrediction: options.enablePrediction !== false,
      retentionDays: options.insightRetentionDays || 30
    });

    // Configuration
    this.config = {
      enableIntentDetection: options.enableIntentDetection ?? true,
      enablePrediction: options.enablePrediction ?? true,
      enableFlowProtection: options.enableFlowProtection ?? true,
      enableLearning: options.enableLearning ?? true,
      enableExplanations: options.enableExplanations ?? true,
      enableDebugging: options.enableDebugging ?? true,
      enableTwin: options.enableTwin ?? true,
      enableSecurity: options.enableSecurity ?? true,
      enableAdaptiveUI: options.enableAdaptiveUI ?? true,
      enableHybridAnalysis: options.enableHybridAnalysis ?? true,
      enableInsights: options.enableInsights ?? true,
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
  async start() {
    this.isActive = true;
    this.sessionStart = Date.now();
    this.developerProfile.stats.totalSessions++;

    // Initialize security components
    if (this.config.enableSecurity) {
      await this.credentialManager.initialize();
    }

    // Start adaptive interface
    if (this.config.enableAdaptiveUI) {
      this.adaptiveInterface.start();
    }

    // Start insight engine session
    if (this.config.enableInsights) {
      this.insightEngine.startSession({
        projectPath: this.safetyProtocol.projectPath,
        cognitiveEngineVersion: '3.1.0'
      });
    }

    return { started: true, timestamp: Date.now() };
  }

  /**
   * Stop the cognitive engine
   */
  stop() {
    this.isActive = false;

    // Stop adaptive interface
    if (this.config.enableAdaptiveUI) {
      this.adaptiveInterface.stop();
    }

    // End insight engine session
    if (this.config.enableInsights) {
      this.insightEngine.endSession({
        sessionDuration: Date.now() - this.sessionStart
      });
    }

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

    // Record analysis start event for insights
    if (this.config.enableInsights) {
      this.insightEngine.recordEvent(EVENT_TYPES.CODE_COMPLETION, {
        language: context.language,
        framework: context.framework,
        complexity: this.estimateCodeComplexity(context.activeFileContent),
        filePath: context.filePath
      });
    }

    // 1. Detect intent (Pillar 1)
    if (this.config.enableIntentDetection) {
      results.intent = await this.intentEngine.detectIntent(context);
      
      // Record intent for insights
      if (this.config.enableInsights && results.intent) {
        this.insightEngine.recordEvent(EVENT_TYPES.DECISION_POINT, {
          intent: results.intent.intent,
          confidence: results.intent.confidence
        });
      }
    }

    // 2. Check flow state (Pillar 6) - Do this early to decide if we should intervene
    if (this.config.enableFlowProtection) {
      results.flow = await this.flowOptimizer.optimizeFlow({
        ...context,
        sessionDuration: Date.now() - this.sessionStart,
      });

      // Record flow state changes for insights
      if (this.config.enableInsights && results.flow) {
        const currentFlowState = results.flow.flowState?.state;
        if (currentFlowState !== this.lastFlowState) {
          if (currentFlowState === FLOW_STATES.DEEP_FLOW) {
            this.insightEngine.recordEvent(EVENT_TYPES.FLOW_STATE_ENTER, {
              flowType: 'deep',
              cognitiveLoad: results.flow.cognitiveLoad?.level
            });
          } else if (this.lastFlowState === FLOW_STATES.DEEP_FLOW) {
            this.insightEngine.recordEvent(EVENT_TYPES.FLOW_STATE_EXIT, {
              duration: Date.now() - this.lastFlowStateChange
            });
          }
          this.lastFlowState = currentFlowState;
          this.lastFlowStateChange = Date.now();
        }
      }

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

      // Record problem solving events for insights
      if (this.config.enableInsights && results.predictions?.predictions?.length > 0) {
        results.predictions.predictions.forEach(prediction => {
          if (prediction.severity === 'high' || prediction.severity === 'critical') {
            this.insightEngine.recordEvent(EVENT_TYPES.ERROR_PATTERN, {
              errorType: prediction.type,
              severity: prediction.severity,
              complexity: prediction.complexity || 5
            });
          }
        });
      }
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

    // Update developer twin
    if (this.config.enableTwin) {
      this.developerTwin.observe({
        cognitive: {
          type: 'analysis',
          intent: results.intent?.intent,
          flowState: results.flow?.flowState?.state,
        },
        action: {
          type: 'file_edit',
          file: context.activeFile,
        },
        code: context.activeFileContent ? {
          code: context.activeFileContent,
          file: context.activeFile,
        } : undefined,
        knowledge: {
          skills: this.extractSkillsFromCode(context.activeFileContent),
          technologies: this.extractTechnologies(context.activeFileContent),
        },
      });
    }
  }

  /**
   * Extract skills from code for twin learning
   */
  extractSkillsFromCode(code) {
    if (!code) return [];
    const skills = [];
    
    if (/async|await|Promise/.test(code)) skills.push('async-programming');
    if (/class\s+\w+/.test(code)) skills.push('oop');
    if (/\.(map|filter|reduce)\(/.test(code)) skills.push('functional-programming');
    if (/try\s*\{/.test(code)) skills.push('error-handling');
    if (/\b(describe|it|test|expect)\b/.test(code)) skills.push('testing');
    if (/import|require/.test(code)) skills.push('modules');
    
    return skills;
  }

  /**
   * Extract technologies from code
   */
  extractTechnologies(code) {
    if (!code) return [];
    const techs = [];
    
    if (/react|useState|useEffect/.test(code)) techs.push('react');
    if (/express|app\.(get|post|put)/.test(code)) techs.push('express');
    if (/mongoose|mongodb/.test(code)) techs.push('mongodb');
    if (/jest|describe|it\(/.test(code)) techs.push('jest');
    if (/typescript|:\s*(string|number|boolean)/.test(code)) techs.push('typescript');
    
    return techs;
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
   * Explain code (Pillar 3)
   */
  async explainCode(code, options = {}) {
    if (!this.config.enableExplanations) {
      return { error: 'Explanations disabled' };
    }
    return this.explanationEngine.explainCode(code, options);
  }

  /**
   * Get inline explanation for hover
   */
  async getInlineExplanation(code, position) {
    if (!this.config.enableExplanations) {
      return { error: 'Explanations disabled' };
    }
    return this.explanationEngine.generateInlineExplanation(code, position);
  }

  /**
   * Explain an error (Pillar 4)
   */
  async explainError(error, context = {}) {
    if (!this.config.enableDebugging) {
      return { error: 'Debugging disabled' };
    }
    
    const result = await this.debuggingEngine.explainError(error, context);
    
    // Learn from the error
    if (this.config.enableTwin) {
      await this.developerTwin.observe({
        action: { type: 'error', errorType: result.rootCause.cause },
        knowledge: { skills: [result.rootCause.cause] },
      });
    }
    
    return result;
  }

  /**
   * Get quick error explanation
   */
  quickExplainError(error) {
    return this.debuggingEngine.quickExplain(error);
  }

  /**
   * Get developer twin state
   */
  getTwinState() {
    if (!this.config.enableTwin) {
      return { error: 'Twin disabled' };
    }
    return this.developerTwin.getState();
  }

  /**
   * Get twin predictions
   */
  async getTwinPredictions(context = {}) {
    if (!this.config.enableTwin) {
      return { error: 'Twin disabled' };
    }
    return this.developerTwin.predict(context);
  }

  /**
   * Get personalized optimizations
   */
  getOptimizations() {
    if (!this.config.enableTwin) {
      return { error: 'Twin disabled' };
    }
    return this.developerTwin.getOptimizations();
  }

  /**
   * Get learning path
   */
  getLearningPath() {
    if (!this.config.enableTwin) {
      return { error: 'Twin disabled' };
    }
    return this.developerTwin.generateLearningPath();
  }

  /**
   * Secure code analysis with hybrid approach
   */
  async analyzeCodeSecurely(code, filePath, options = {}) {
    if (!this.config.enableHybridAnalysis) {
      return { error: 'Hybrid analysis disabled' };
    }

    // Use hybrid analyzer for secure, local-first analysis
    const analysisResult = await this.hybridAnalyzer.analyze(code, filePath, {
      ...options,
      cloudConsent: this.config.cloudConsent
    });

    // Integrate with cognitive analysis
    const cognitiveContext = {
      code,
      activeFileContent: code,
      filePath,
      analysisResult
    };

    const cognitiveAnalysis = await this.analyze(cognitiveContext);

    return {
      ...analysisResult,
      cognitive: cognitiveAnalysis,
      timestamp: Date.now()
    };
  }

  /**
   * Evaluate and potentially apply a code change with safety protocol
   */
  async evaluateChange(change, context = {}) {
    if (!this.config.enableSecurity) {
      return { error: 'Security features disabled' };
    }

    // Add cognitive context to safety evaluation
    const enhancedContext = {
      ...context,
      developerSuccessRate: this.developerProfile.getAcceptanceRate(),
      flowState: this.flowOptimizer.lastFlowState?.state,
      cognitiveLoad: this.flowOptimizer.lastFlowState?.cognitiveLoad?.level
    };

    const evaluation = await this.safetyProtocol.evaluateChange(change, enhancedContext);

    // Learn from the evaluation
    if (this.config.enableLearning && evaluation.executed) {
      this.developerProfile.updateFromInteraction({
        accepted: evaluation.executed.success,
        rejected: !evaluation.executed.success,
        suggestionStyle: 'auto-fix'
      });
    }

    return evaluation;
  }

  /**
   * Update adaptive interface with current state
   */
  updateInterface(data = {}) {
    if (!this.config.enableAdaptiveUI) {
      return { error: 'Adaptive UI disabled' };
    }

    // Gather current cognitive state
    const cognitiveData = {
      ...data,
      flowState: this.flowOptimizer.lastFlowState?.state,
      cognitiveLoad: this.flowOptimizer.lastFlowState?.cognitiveLoad?.level,
      intent: this.intentEngine.lastIntent,
      issues: this.lastAnalysis?.predictions?.summary?.total || 0,
      fixed: this.developerProfile.stats.suggestionsAccepted,
      project: {
        name: data.projectName || 'Project',
        version: data.projectVersion || '1.0.0'
      }
    };

    // Detect flow signals for adaptive behavior
    const signals = {
      flowState: cognitiveData.flowState,
      cognitiveLoad: cognitiveData.cognitiveLoad,
      errorFrequency: this.getRecentErrorFrequency(),
      timeInCurrentFile: Date.now() - this.sessionStart
    };

    return this.adaptiveInterface.update(cognitiveData, signals);
  }

  /**
   * Get recent error frequency for adaptive UI
   */
  getRecentErrorFrequency() {
    const recentAnalyses = this.analysisHistory.slice(-10);
    const errorsInRecent = recentAnalyses.reduce((count, analysis) => {
      return count + (analysis.predictions?.summary?.critical || 0);
    }, 0);
    return errorsInRecent;
  }

  /**
   * Set autonomy level for safety protocol
   */
  setAutonomyLevel(level) {
    if (!this.config.enableSecurity) {
      return { error: 'Security features disabled' };
    }
    this.safetyProtocol.setAutonomyLevel(level);
    return { autonomyLevel: level };
  }

  /**
   * Get security status
   */
  async getSecurityStatus() {
    if (!this.config.enableSecurity) {
      return { error: 'Security features disabled' };
    }

    const [credentialStatus, safetyStats] = await Promise.all([
      this.credentialManager.getSecurityStatus(),
      this.safetyProtocol.getSafetyStatistics()
    ]);

    return {
      credentials: credentialStatus,
      safety: safetyStats,
      hybridAnalysis: this.hybridAnalyzer.getStatistics()
    };
  }

  /**
   * Store API key securely
   */
  async storeApiKey(apiKey, service = 'letta', options = {}) {
    if (!this.config.enableSecurity) {
      return { error: 'Security features disabled' };
    }
    return this.credentialManager.storeApiKey(apiKey, service, options);
  }

  /**
   * Retrieve API key securely
   */
  async retrieveApiKey(service = 'letta', options = {}) {
    if (!this.config.enableSecurity) {
      return { error: 'Security features disabled' };
    }
    return this.credentialManager.retrieveApiKey(service, options);
  }

  /**
   * Create smart notification
   */
  notify(title, message, options = {}) {
    if (!this.config.enableAdaptiveUI) {
      return { error: 'Adaptive UI disabled' };
    }
    return this.adaptiveInterface.createSmartNotification(title, message, options);
  }

  /**
   * Silence notifications temporarily
   */
  silenceNotifications(durationMs) {
    if (!this.config.enableAdaptiveUI) {
      return { error: 'Adaptive UI disabled' };
    }
    return this.adaptiveInterface.silence(durationMs);
  }

  /**
   * Get comprehensive developer insights
   */
  getInsights(timeframe = '7d') {
    if (!this.config.enableInsights) {
      return { error: 'Insights disabled' };
    }
    return this.insightEngine.generateInsights(timeframe);
  }

  /**
   * Record a learning event
   */
  recordLearning(concept, metadata = {}) {
    if (!this.config.enableInsights) {
      return { error: 'Insights disabled' };
    }
    
    return this.insightEngine.recordEvent(EVENT_TYPES.NEW_CONCEPT_LEARNED, {
      concept,
      trigger: metadata.trigger || 'manual',
      complexity: metadata.complexity || 5,
      ...metadata
    });
  }

  /**
   * Record a breakthrough moment
   */
  recordBreakthrough(problem, solution, metadata = {}) {
    if (!this.config.enableInsights) {
      return { error: 'Insights disabled' };
    }
    
    return this.insightEngine.recordEvent(EVENT_TYPES.BREAKTHROUGH_MOMENT, {
      problem,
      solution,
      impact: metadata.impact || 7,
      complexity: metadata.complexity || 5,
      solutionType: metadata.solutionType || 'standard',
      ...metadata
    });
  }

  /**
   * Get current developer evolution stage
   */
  getEvolutionStage() {
    if (!this.config.enableInsights) {
      return { error: 'Insights disabled' };
    }
    return this.insightEngine.getCurrentEvolutionStage();
  }

  /**
   * Get skill tree progression
   */
  getSkillTree() {
    if (!this.config.enableInsights) {
      return { error: 'Insights disabled' };
    }
    const insights = this.insightEngine.generateInsights('30d');
    return insights.skillTree;
  }

  /**
   * Get genius moments archive
   */
  getGeniusMoments(limit = 10) {
    if (!this.config.enableInsights) {
      return { error: 'Insights disabled' };
    }
    const insights = this.insightEngine.generateInsights('30d');
    return insights.geniusMoments.slice(0, limit);
  }

  /**
   * Get code weather forecast
   */
  getCodeWeatherForecast() {
    if (!this.config.enableInsights) {
      return { error: 'Insights disabled' };
    }
    const insights = this.insightEngine.generateInsights('7d');
    return insights.codeWeatherForecast;
  }

  /**
   * Export all insights data
   */
  exportInsights() {
    if (!this.config.enableInsights) {
      return { error: 'Insights disabled' };
    }
    return this.insightEngine.exportInsights();
  }

  /**
   * Helper method to estimate code complexity
   */
  estimateCodeComplexity(code) {
    if (!code) return 1;
    
    const lines = code.split('\n').length;
    const conditions = (code.match(/\b(if|else|switch|case|\?|&&|\|\|)\b/g) || []).length;
    const loops = (code.match(/\b(for|while|do)\b/g) || []).length;
    const functions = (code.match(/function|=>/g) || []).length;
    
    // Simple complexity calculation
    const complexity = Math.min(10, Math.max(1, 
      (lines / 20) + 
      (conditions / 3) + 
      (loops / 2) + 
      (functions / 5)
    ));
    
    return Math.round(complexity);
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

// Export main classes (constants are exported from their source modules via index.js)
export {
  IntentAwarenessEngine,
  PredictiveAssistanceEngine,
  FlowOptimizer,
  ExplanationEngine,
  DebuggingEngine,
  DeveloperTwin,
  SecureCredentialManager,
  ChangeSafetyProtocol,
  AdaptiveInterface,
  HybridAnalysisEngine,
  InsightEngine,
  AUTONOMY_LEVELS,
  DISPLAY_MODES,
  NOTIFICATION_PRIORITIES,
  ANALYSIS_TYPES,
  EVENT_TYPES
};

export default CognitiveEngine;
