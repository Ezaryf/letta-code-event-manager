/**
 * 🧱 PILLAR 1: Intent Awareness Engine
 * 
 * Detects developer intent through multi-signal analysis.
 * Knows what you're trying to do before you finish typing.
 */

import fs from 'fs';
import path from 'path';

// Intent types the engine can detect
export const INTENTS = {
  WRITING_NEW_FEATURE: 'WRITING_NEW_FEATURE',
  DEBUGGING_ERROR: 'DEBUGGING_ERROR',
  REFACTORING_CODE: 'REFACTORING_CODE',
  EXPLORING_CODEBASE: 'EXPLORING_CODEBASE',
  OPTIMIZING_PERFORMANCE: 'OPTIMIZING_PERFORMANCE',
  WRITING_TESTS: 'WRITING_TESTS',
  FIXING_BUG: 'FIXING_BUG',
  LEARNING_NEW_API: 'LEARNING_NEW_API',
  DESIGNING_ARCHITECTURE: 'DESIGNING_ARCHITECTURE',
  CODE_REVIEW: 'CODE_REVIEW',
  STUCK_AND_SEARCHING: 'STUCK_AND_SEARCHING',
  FLOW_STATE_DEEP_WORK: 'FLOW_STATE_DEEP_WORK',
};

// Intent-driven UI configurations
export const INTENT_UI_CONFIG = {
  [INTENTS.WRITING_NEW_FEATURE]: {
    suggestions: ['API_DOCS', 'PATTERNS', 'EXAMPLES'],
    verbosity: 'CONCISE',
    timing: 'PROACTIVE',
    uiElements: ['code_completion', 'api_explorer', 'pattern_suggestions'],
  },
  [INTENTS.DEBUGGING_ERROR]: {
    suggestions: ['CAUSAL_ANALYSIS', 'STACK_TRACE', 'FIXES'],
    verbosity: 'DETAILED',
    timing: 'IMMEDIATE',
    uiElements: ['causal_graph', 'variable_inspector', 'timeline'],
  },
  [INTENTS.REFACTORING_CODE]: {
    suggestions: ['SAFETY_CHECKS', 'TEST_COVERAGE', 'IMPACT_ANALYSIS'],
    verbosity: 'MODERATE',
    timing: 'AFTER_PAUSE',
    uiElements: ['impact_visualizer', 'test_generator', 'safety_checks'],
  },
  [INTENTS.STUCK_AND_SEARCHING]: {
    suggestions: ['CONTEXT_HELP', 'RELATED_CODE', 'DOCUMENTATION'],
    verbosity: 'VERBOSE',
    timing: 'IMMEDIATE',
    uiElements: ['context_help', 'code_search', 'documentation_panel'],
  },
  [INTENTS.FLOW_STATE_DEEP_WORK]: {
    suggestions: [],
    verbosity: 'SILENT',
    timing: 'NEVER',
    uiElements: [],
  },
  [INTENTS.WRITING_TESTS]: {
    suggestions: ['TEST_PATTERNS', 'EDGE_CASES', 'COVERAGE_GAPS'],
    verbosity: 'MODERATE',
    timing: 'AFTER_PAUSE',
    uiElements: ['test_generator', 'coverage_viewer', 'assertion_helper'],
  },
  [INTENTS.EXPLORING_CODEBASE]: {
    suggestions: ['NAVIGATION', 'ARCHITECTURE', 'DEPENDENCIES'],
    verbosity: 'CONCISE',
    timing: 'ON_DEMAND',
    uiElements: ['code_map', 'dependency_graph', 'search'],
  },
  [INTENTS.FIXING_BUG]: {
    suggestions: ['ROOT_CAUSE', 'SIMILAR_BUGS', 'TEST_CASES'],
    verbosity: 'DETAILED',
    timing: 'IMMEDIATE',
    uiElements: ['bug_tracker', 'diff_viewer', 'test_runner'],
  },
};

/**
 * Signal trackers for multi-dimensional intent detection
 */
class TemporalSignalTracker {
  constructor() {
    this.keystrokes = [];
    this.pauses = [];
    this.editHistory = [];
    this.maxHistory = 100;
  }

  recordKeystroke(timestamp = Date.now()) {
    this.keystrokes.push(timestamp);
    if (this.keystrokes.length > this.maxHistory) {
      this.keystrokes.shift();
    }
  }

  recordPause(duration, timestamp = Date.now()) {
    this.pauses.push({ duration, timestamp });
    if (this.pauses.length > this.maxHistory) {
      this.pauses.shift();
    }
  }

  recordEdit(edit) {
    this.editHistory.push({ ...edit, timestamp: Date.now() });
    if (this.editHistory.length > this.maxHistory) {
      this.editHistory.shift();
    }
  }

  measureTypingSpeed() {
    if (this.keystrokes.length < 2) return 0;
    const recent = this.keystrokes.slice(-20);
    const duration = (recent[recent.length - 1] - recent[0]) / 1000; // seconds
    return duration > 0 ? (recent.length / duration) * 60 : 0; // chars per minute
  }

  detectPauses(thresholdMs = 3000) {
    const pauses = [];
    for (let i = 1; i < this.keystrokes.length; i++) {
      const gap = this.keystrokes[i] - this.keystrokes[i - 1];
      if (gap > thresholdMs) {
        pauses.push({ duration: gap, index: i });
      }
    }
    return pauses;
  }

  calculateEditFrequency() {
    if (this.editHistory.length < 2) return 0;
    const recent = this.editHistory.slice(-10);
    const duration = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000 / 60; // minutes
    return duration > 0 ? recent.length / duration : 0; // edits per minute
  }
}

class SemanticSignalTracker {
  constructor() {
    this.recentChanges = [];
    this.activeFileHistory = [];
  }

  recordChange(change) {
    this.recentChanges.push({ ...change, timestamp: Date.now() });
    if (this.recentChanges.length > 50) {
      this.recentChanges.shift();
    }
  }

  recordActiveFile(filePath) {
    this.activeFileHistory.push({ path: filePath, timestamp: Date.now() });
    if (this.activeFileHistory.length > 50) {
      this.activeFileHistory.shift();
    }
  }

  analyzeCodeSemantics(code) {
    if (!code) return { focus: 'unknown', density: 0 };
    
    const patterns = {
      test: /\b(describe|it|test|expect|assert|mock|spy)\b/gi,
      debug: /\b(console\.(log|debug|error)|debugger|breakpoint)\b/gi,
      error: /\b(try|catch|throw|Error|Exception)\b/gi,
      async: /\b(async|await|Promise|then|catch)\b/gi,
      api: /\b(fetch|axios|request|http|api|endpoint)\b/gi,
      refactor: /\b(TODO|FIXME|HACK|REFACTOR|OPTIMIZE)\b/gi,
    };

    const scores = {};
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = code.match(pattern) || [];
      scores[type] = matches.length;
    }

    const maxType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return {
      focus: maxType ? maxType[0] : 'general',
      density: maxType ? maxType[1] : 0,
      scores,
    };
  }

  measureConceptDensity(changes) {
    if (!changes || changes.length === 0) return 0;
    
    const uniqueConcepts = new Set();
    for (const change of changes) {
      if (change.content) {
        // Extract identifiers
        const identifiers = change.content.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
        identifiers.forEach(id => uniqueConcepts.add(id));
      }
    }
    return uniqueConcepts.size / Math.max(changes.length, 1);
  }

  detectAbstractionLevel(code) {
    if (!code) return 'unknown';
    
    const lines = code.split('\n').length;
    const functions = (code.match(/\b(function|=>|async)\b/g) || []).length;
    const classes = (code.match(/\bclass\b/g) || []).length;
    const imports = (code.match(/\b(import|require)\b/g) || []).length;
    
    if (classes > 2 || imports > 10) return 'high';
    if (functions > 5 || imports > 5) return 'medium';
    return 'low';
  }
}

class BehavioralSignalTracker {
  constructor() {
    this.gitActions = [];
    this.testRuns = [];
    this.errors = [];
    this.fileSwitches = [];
  }

  recordGitAction(action) {
    this.gitActions.push({ action, timestamp: Date.now() });
    if (this.gitActions.length > 50) this.gitActions.shift();
  }

  recordTestRun(result) {
    this.testRuns.push({ ...result, timestamp: Date.now() });
    if (this.testRuns.length > 50) this.testRuns.shift();
  }

  recordError(error) {
    this.errors.push({ ...error, timestamp: Date.now() });
    if (this.errors.length > 50) this.errors.shift();
  }

  recordFileSwitch(fromFile, toFile) {
    this.fileSwitches.push({ from: fromFile, to: toFile, timestamp: Date.now() });
    if (this.fileSwitches.length > 100) this.fileSwitches.shift();
  }

  analyzeGitPatterns() {
    const recent = this.gitActions.slice(-10);
    const commits = recent.filter(a => a.action === 'commit').length;
    const diffs = recent.filter(a => a.action === 'diff').length;
    const branches = recent.filter(a => a.action === 'branch').length;
    
    return { commits, diffs, branches, total: recent.length };
  }

  analyzeTestPatterns() {
    const recent = this.testRuns.slice(-10);
    const passed = recent.filter(r => r.passed).length;
    const failed = recent.filter(r => !r.passed).length;
    
    return { passed, failed, total: recent.length, passRate: passed / Math.max(recent.length, 1) };
  }

  analyzeErrorPatterns() {
    const recent = this.errors.slice(-10);
    const types = {};
    for (const error of recent) {
      types[error.type] = (types[error.type] || 0) + 1;
    }
    return { types, total: recent.length };
  }

  analyzeNavigationPatterns() {
    const recent = this.fileSwitches.slice(-20);
    const uniqueFiles = new Set([...recent.map(s => s.from), ...recent.map(s => s.to)]);
    return {
      switchCount: recent.length,
      uniqueFiles: uniqueFiles.size,
      explorationScore: uniqueFiles.size / Math.max(recent.length, 1),
    };
  }
}


/**
 * Intent Classifier - Uses signals to determine developer intent
 */
class IntentClassifier {
  constructor() {
    this.weights = {
      temporal: 0.25,
      semantic: 0.30,
      behavioral: 0.25,
      contextual: 0.20,
    };
  }

  predict(signals) {
    const scores = {};
    
    // Initialize all intents with base score
    for (const intent of Object.values(INTENTS)) {
      scores[intent] = 0;
    }

    // Temporal signals
    if (signals.typingSpeed > 100) {
      scores[INTENTS.FLOW_STATE_DEEP_WORK] += 0.3;
      scores[INTENTS.WRITING_NEW_FEATURE] += 0.2;
    } else if (signals.typingSpeed < 30) {
      scores[INTENTS.STUCK_AND_SEARCHING] += 0.2;
      scores[INTENTS.EXPLORING_CODEBASE] += 0.2;
    }

    if (signals.pauseDurations?.length > 5) {
      scores[INTENTS.DEBUGGING_ERROR] += 0.2;
      scores[INTENTS.STUCK_AND_SEARCHING] += 0.15;
    }

    if (signals.editFrequency > 10) {
      scores[INTENTS.REFACTORING_CODE] += 0.25;
    }

    // Semantic signals
    if (signals.semanticFocus === 'test') {
      scores[INTENTS.WRITING_TESTS] += 0.4;
    } else if (signals.semanticFocus === 'debug') {
      scores[INTENTS.DEBUGGING_ERROR] += 0.3;
    } else if (signals.semanticFocus === 'error') {
      scores[INTENTS.FIXING_BUG] += 0.3;
      scores[INTENTS.DEBUGGING_ERROR] += 0.2;
    } else if (signals.semanticFocus === 'refactor') {
      scores[INTENTS.REFACTORING_CODE] += 0.3;
    } else if (signals.semanticFocus === 'api') {
      scores[INTENTS.LEARNING_NEW_API] += 0.25;
      scores[INTENTS.WRITING_NEW_FEATURE] += 0.2;
    }

    if (signals.conceptDensity > 20) {
      scores[INTENTS.DESIGNING_ARCHITECTURE] += 0.2;
    }

    // Behavioral signals
    if (signals.testPatterns?.failed > 0) {
      scores[INTENTS.FIXING_BUG] += 0.3;
      scores[INTENTS.DEBUGGING_ERROR] += 0.2;
    }

    if (signals.errorPatterns?.total > 3) {
      scores[INTENTS.DEBUGGING_ERROR] += 0.3;
    }

    if (signals.navigationPatterns?.explorationScore > 0.7) {
      scores[INTENTS.EXPLORING_CODEBASE] += 0.3;
    }

    if (signals.gitPatterns?.diffs > 2) {
      scores[INTENTS.CODE_REVIEW] += 0.25;
    }

    // Normalize scores to probabilities
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const probabilities = {};
    for (const [intent, score] of Object.entries(scores)) {
      probabilities[intent] = total > 0 ? score / total : 1 / Object.keys(scores).length;
    }

    return probabilities;
  }
}

/**
 * Main Intent Awareness Engine
 */
export class IntentAwarenessEngine {
  constructor() {
    this.signals = {
      temporal: new TemporalSignalTracker(),
      semantic: new SemanticSignalTracker(),
      behavioral: new BehavioralSignalTracker(),
    };
    this.intentClassifier = new IntentClassifier();
    this.lastIntent = null;
    this.intentHistory = [];
    this.confidenceThreshold = 0.3;
  }

  /**
   * Record a keystroke event
   */
  recordKeystroke() {
    this.signals.temporal.recordKeystroke();
  }

  /**
   * Record a file change
   */
  recordChange(change) {
    this.signals.temporal.recordEdit(change);
    this.signals.semantic.recordChange(change);
  }

  /**
   * Record active file change
   */
  recordActiveFile(filePath) {
    const lastFile = this.signals.semantic.activeFileHistory.slice(-1)[0]?.path;
    if (lastFile && lastFile !== filePath) {
      this.signals.behavioral.recordFileSwitch(lastFile, filePath);
    }
    this.signals.semantic.recordActiveFile(filePath);
  }

  /**
   * Record an error occurrence
   */
  recordError(error) {
    this.signals.behavioral.recordError(error);
  }

  /**
   * Record a test run
   */
  recordTestRun(result) {
    this.signals.behavioral.recordTestRun(result);
  }

  /**
   * Record a git action
   */
  recordGitAction(action) {
    this.signals.behavioral.recordGitAction(action);
  }

  /**
   * Collect all signals for intent detection
   */
  collectSignals(context = {}) {
    return {
      // Temporal signals
      typingSpeed: this.signals.temporal.measureTypingSpeed(),
      pauseDurations: this.signals.temporal.detectPauses(),
      editFrequency: this.signals.temporal.calculateEditFrequency(),

      // Semantic signals
      semanticFocus: this.signals.semantic.analyzeCodeSemantics(context.activeFileContent)?.focus,
      conceptDensity: this.signals.semantic.measureConceptDensity(this.signals.semantic.recentChanges),
      abstractionLevel: this.signals.semantic.detectAbstractionLevel(context.activeFileContent),

      // Behavioral signals
      gitPatterns: this.signals.behavioral.analyzeGitPatterns(),
      testPatterns: this.signals.behavioral.analyzeTestPatterns(),
      errorPatterns: this.signals.behavioral.analyzeErrorPatterns(),
      navigationPatterns: this.signals.behavioral.analyzeNavigationPatterns(),
    };
  }

  /**
   * Detect current developer intent
   */
  async detectIntent(context = {}) {
    // 1. Collect multi-dimensional signals
    const signals = this.collectSignals(context);

    // 2. Classify intent
    const probabilities = this.intentClassifier.predict(signals);

    // 3. Find primary and secondary intents
    const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0];
    const secondary = sorted.slice(1, 3).filter(([_, prob]) => prob > 0.1);

    // 4. Calculate confidence
    const confidence = primary[1];

    const result = {
      intent: primary[0],
      confidence,
      secondary: secondary.map(([intent, prob]) => ({ intent, probability: prob })),
      probabilities,
      signals,
      timestamp: Date.now(),
    };

    // Store in history
    this.intentHistory.push(result);
    if (this.intentHistory.length > 100) {
      this.intentHistory.shift();
    }
    this.lastIntent = result;

    return result;
  }

  /**
   * Get UI configuration based on detected intent
   */
  getUIConfig(intentResult) {
    const config = INTENT_UI_CONFIG[intentResult.intent] || INTENT_UI_CONFIG[INTENTS.WRITING_NEW_FEATURE];
    
    // Adjust based on confidence
    if (intentResult.confidence < 0.5) {
      return {
        ...config,
        verbosity: 'LESS_INTRUSIVE',
        timing: 'AFTER_PAUSE',
      };
    }

    return config;
  }

  /**
   * Predict next likely action based on intent
   */
  async predictNextAction(intentResult, context = {}) {
    const intent = intentResult.intent;
    
    const prediction = {
      likelyFiles: [],
      likelyActions: [],
      potentialErrors: [],
      estimatedDuration: 'unknown',
      cognitiveRequirements: 'medium',
    };

    switch (intent) {
      case INTENTS.DEBUGGING_ERROR:
        prediction.likelyActions = ['add_console_log', 'check_stack_trace', 'add_breakpoint'];
        prediction.potentialErrors = ['missing_null_check', 'async_await_issue'];
        prediction.cognitiveRequirements = 'high';
        break;

      case INTENTS.WRITING_TESTS:
        prediction.likelyActions = ['create_test_file', 'add_test_case', 'run_tests'];
        prediction.potentialErrors = ['missing_mock', 'assertion_error'];
        prediction.cognitiveRequirements = 'medium';
        break;

      case INTENTS.REFACTORING_CODE:
        prediction.likelyActions = ['extract_function', 'rename_variable', 'move_code'];
        prediction.potentialErrors = ['breaking_change', 'missing_update'];
        prediction.cognitiveRequirements = 'high';
        break;

      case INTENTS.FLOW_STATE_DEEP_WORK:
        prediction.likelyActions = ['continue_coding'];
        prediction.potentialErrors = [];
        prediction.cognitiveRequirements = 'low'; // Don't interrupt!
        break;

      default:
        prediction.likelyActions = ['edit_code', 'save_file'];
        prediction.cognitiveRequirements = 'medium';
    }

    return prediction;
  }

  /**
   * Check if we should intervene based on intent
   */
  shouldIntervene(intentResult) {
    // Never intervene during deep flow
    if (intentResult.intent === INTENTS.FLOW_STATE_DEEP_WORK) {
      return false;
    }

    // Always intervene when stuck
    if (intentResult.intent === INTENTS.STUCK_AND_SEARCHING && intentResult.confidence > 0.5) {
      return true;
    }

    // Intervene for debugging with high confidence
    if (intentResult.intent === INTENTS.DEBUGGING_ERROR && intentResult.confidence > 0.6) {
      return true;
    }

    // Default: only intervene with high confidence
    return intentResult.confidence > 0.7;
  }

  /**
   * Get intent history for analysis
   */
  getIntentHistory(limit = 10) {
    return this.intentHistory.slice(-limit);
  }

  /**
   * Get intent stability (how consistent intent has been)
   */
  getIntentStability() {
    const recent = this.intentHistory.slice(-10);
    if (recent.length < 2) return 1;

    const intents = recent.map(r => r.intent);
    const mostCommon = intents.sort((a, b) =>
      intents.filter(v => v === a).length - intents.filter(v => v === b).length
    ).pop();

    return intents.filter(i => i === mostCommon).length / intents.length;
  }
}

export default IntentAwarenessEngine;
