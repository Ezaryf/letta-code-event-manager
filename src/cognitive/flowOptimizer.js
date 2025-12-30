/**
 * 🧱 PILLAR 6: Programmer Flow Optimizer
 * 
 * Knows when to help and when to stay completely silent.
 * Protects and enhances deep work states.
 */

// Flow states
export const FLOW_STATES = {
  DEEP_FLOW: 'DEEP_FLOW',       // Peak productivity, don't interrupt
  FLOW: 'FLOW',                  // Good focus, minimal interruptions
  ENGAGED: 'ENGAGED',            // Working but interruptible
  DISTRACTED: 'DISTRACTED',      // Needs focus assistance
  STRUGGLING: 'STRUGGLING',      // Needs help
};

// Cognitive load levels
export const COGNITIVE_LOAD = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

// Intervention types
export const INTERVENTIONS = {
  NO_INTERVENTION: 'NO_INTERVENTION',
  GENTLE_REMINDER: 'GENTLE_REMINDER',
  MINIMAL_SUGGESTIONS: 'MINIMAL_SUGGESTIONS',
  CONTEXTUAL_HELP: 'CONTEXTUAL_HELP',
  BREAK_SUGGESTION: 'BREAK_SUGGESTION',
  PROACTIVE_HELP: 'PROACTIVE_HELP',
  TARGETED_ASSISTANCE: 'TARGETED_ASSISTANCE',
  SIMPLIFY_SUGGESTIONS: 'SIMPLIFY_SUGGESTIONS',
  FOCUS_ASSISTANCE: 'FOCUS_ASSISTANCE',
  POMODORO_SUGGESTION: 'POMODORO_SUGGESTION',
  COMPREHENSIVE_HELP: 'COMPREHENSIVE_HELP',
  ALTERNATIVE_APPROACH: 'ALTERNATIVE_APPROACH',
  TASK_SWITCH_SUGGESTION: 'TASK_SWITCH_SUGGESTION',
};

/**
 * Flow State Detector
 */
class FlowDetector {
  constructor() {
    this.metrics = {
      typingSpeed: [],
      pauseFrequency: [],
      editPatterns: [],
      errorRate: [],
      outputRate: [],
    };
    this.maxHistory = 60; // 60 data points (e.g., 1 per second = 1 minute)
  }

  recordMetric(type, value) {
    if (this.metrics[type]) {
      this.metrics[type].push({ value, timestamp: Date.now() });
      if (this.metrics[type].length > this.maxHistory) {
        this.metrics[type].shift();
      }
    }
  }

  calculateTypingSpeed(keystrokes) {
    if (!keystrokes || keystrokes.length < 2) return 0;
    const recent = keystrokes.slice(-20);
    const duration = (recent[recent.length - 1] - recent[0]) / 1000;
    return duration > 0 ? (recent.length / duration) * 60 : 0;
  }

  analyzePauses(timeline) {
    if (!timeline || timeline.length < 2) return { frequency: 0, avgDuration: 0 };
    
    const pauses = [];
    for (let i = 1; i < timeline.length; i++) {
      const gap = timeline[i] - timeline[i - 1];
      if (gap > 2000) { // 2 second pause
        pauses.push(gap);
      }
    }

    return {
      frequency: pauses.length / timeline.length,
      avgDuration: pauses.length > 0 ? pauses.reduce((a, b) => a + b, 0) / pauses.length : 0,
    };
  }

  analyzeEditPatterns(edits) {
    if (!edits || edits.length === 0) return { consistency: 0, velocity: 0 };
    
    const recent = edits.slice(-20);
    const sizes = recent.map(e => e.size || 1);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const variance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;
    
    return {
      consistency: 1 / (1 + Math.sqrt(variance)), // Higher = more consistent
      velocity: recent.length,
    };
  }

  calculateOutputRate(codeOutput) {
    if (!codeOutput || codeOutput.length === 0) return 0;
    const recent = codeOutput.slice(-10);
    const totalLines = recent.reduce((sum, o) => sum + (o.lines || 0), 0);
    return totalLines / recent.length;
  }

  calculateErrorRate(errors) {
    if (!errors || errors.length === 0) return 0;
    const recent = errors.slice(-20);
    return recent.filter(e => e.isError).length / recent.length;
  }

  detect(context) {
    const metrics = {
      typingSpeed: this.calculateTypingSpeed(context.keystrokes),
      pauses: this.analyzePauses(context.timeline),
      editPatterns: this.analyzeEditPatterns(context.edits),
      outputRate: this.calculateOutputRate(context.codeOutput),
      errorRate: this.calculateErrorRate(context.errors),
      taskSwitching: context.taskSwitches || 0,
      distractionLevel: context.distractions || 0,
    };

    return this.classifyFlowState(metrics);
  }

  classifyFlowState(metrics) {
    const flowScore = this.calculateFlowScore(metrics);
    
    let state;
    if (flowScore > 0.8) state = FLOW_STATES.DEEP_FLOW;
    else if (flowScore > 0.6) state = FLOW_STATES.FLOW;
    else if (flowScore > 0.4) state = FLOW_STATES.ENGAGED;
    else if (flowScore > 0.2) state = FLOW_STATES.DISTRACTED;
    else state = FLOW_STATES.STRUGGLING;

    return {
      state,
      score: flowScore,
      metrics,
      confidence: this.calculateConfidence(metrics),
    };
  }

  calculateFlowScore(metrics) {
    let score = 0.5; // Start at neutral

    // Typing speed contribution (fast = good)
    if (metrics.typingSpeed > 80) score += 0.15;
    else if (metrics.typingSpeed > 50) score += 0.1;
    else if (metrics.typingSpeed < 20) score -= 0.1;

    // Pause frequency contribution (fewer pauses = better flow)
    if (metrics.pauses.frequency < 0.1) score += 0.15;
    else if (metrics.pauses.frequency > 0.3) score -= 0.15;

    // Edit consistency contribution
    if (metrics.editPatterns.consistency > 0.7) score += 0.1;
    else if (metrics.editPatterns.consistency < 0.3) score -= 0.1;

    // Output rate contribution
    if (metrics.outputRate > 5) score += 0.1;
    else if (metrics.outputRate < 1) score -= 0.1;

    // Error rate contribution (fewer errors = better)
    if (metrics.errorRate < 0.1) score += 0.1;
    else if (metrics.errorRate > 0.3) score -= 0.15;

    // Task switching penalty
    if (metrics.taskSwitching > 5) score -= 0.2;
    else if (metrics.taskSwitching > 2) score -= 0.1;

    // Distraction penalty
    if (metrics.distractionLevel > 0.5) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }

  calculateConfidence(metrics) {
    // More data = higher confidence
    const dataPoints = Object.values(metrics).filter(v => v !== undefined && v !== null).length;
    return Math.min(dataPoints / 7, 1);
  }
}

/**
 * Cognitive Load Monitor
 */
class CognitiveLoadMonitor {
  constructor() {
    this.loadHistory = [];
    this.maxHistory = 30;
  }

  measure(context) {
    const factors = {
      codeComplexity: this.measureCodeComplexity(context.code),
      taskComplexity: this.measureTaskComplexity(context.task),
      contextSwitches: context.contextSwitches || 0,
      openFiles: context.openFiles || 1,
      pendingTasks: context.pendingTasks || 0,
      timeWorking: context.sessionDuration || 0,
    };

    const load = this.calculateLoad(factors);
    
    this.loadHistory.push({ load, factors, timestamp: Date.now() });
    if (this.loadHistory.length > this.maxHistory) {
      this.loadHistory.shift();
    }

    return {
      level: this.getLoadLevel(load),
      score: load,
      factors,
      trend: this.calculateTrend(),
    };
  }

  measureCodeComplexity(code) {
    if (!code) return 0;
    
    const lines = code.split('\n').length;
    const conditions = (code.match(/\b(if|else|switch|case|\?)\b/g) || []).length;
    const nesting = this.countMaxNesting(code);
    
    return Math.min((lines / 100 + conditions / 10 + nesting / 3) / 3, 1);
  }

  countMaxNesting(code) {
    let max = 0, current = 0;
    for (const char of code) {
      if (char === '{') { current++; max = Math.max(max, current); }
      else if (char === '}') current--;
    }
    return max;
  }

  measureTaskComplexity(task) {
    if (!task) return 0.5;
    
    // Simple heuristic based on task description
    const complexityIndicators = ['refactor', 'debug', 'optimize', 'architecture', 'design'];
    const simpleIndicators = ['fix', 'update', 'add', 'change'];
    
    const taskLower = (task.description || '').toLowerCase();
    
    if (complexityIndicators.some(i => taskLower.includes(i))) return 0.8;
    if (simpleIndicators.some(i => taskLower.includes(i))) return 0.3;
    return 0.5;
  }

  calculateLoad(factors) {
    const weights = {
      codeComplexity: 0.25,
      taskComplexity: 0.25,
      contextSwitches: 0.15,
      openFiles: 0.1,
      pendingTasks: 0.1,
      timeWorking: 0.15,
    };

    let load = 0;
    load += factors.codeComplexity * weights.codeComplexity;
    load += factors.taskComplexity * weights.taskComplexity;
    load += Math.min(factors.contextSwitches / 10, 1) * weights.contextSwitches;
    load += Math.min(factors.openFiles / 20, 1) * weights.openFiles;
    load += Math.min(factors.pendingTasks / 10, 1) * weights.pendingTasks;
    load += Math.min(factors.timeWorking / (4 * 60 * 60 * 1000), 1) * weights.timeWorking; // 4 hours max

    return Math.min(load, 1);
  }

  getLoadLevel(score) {
    if (score < 0.4) return COGNITIVE_LOAD.LOW;
    if (score < 0.7) return COGNITIVE_LOAD.MEDIUM;
    return COGNITIVE_LOAD.HIGH;
  }

  calculateTrend() {
    if (this.loadHistory.length < 3) return 'stable';
    
    const recent = this.loadHistory.slice(-5);
    const first = recent.slice(0, 2).reduce((sum, h) => sum + h.load, 0) / 2;
    const last = recent.slice(-2).reduce((sum, h) => sum + h.load, 0) / 2;
    
    if (last - first > 0.1) return 'increasing';
    if (first - last > 0.1) return 'decreasing';
    return 'stable';
  }
}

/**
 * Intervention Manager
 */
class InterventionManager {
  constructor() {
    this.interventionMatrix = {
      [FLOW_STATES.DEEP_FLOW]: {
        [COGNITIVE_LOAD.LOW]: INTERVENTIONS.NO_INTERVENTION,
        [COGNITIVE_LOAD.MEDIUM]: INTERVENTIONS.NO_INTERVENTION,
        [COGNITIVE_LOAD.HIGH]: INTERVENTIONS.GENTLE_REMINDER,
      },
      [FLOW_STATES.FLOW]: {
        [COGNITIVE_LOAD.LOW]: INTERVENTIONS.MINIMAL_SUGGESTIONS,
        [COGNITIVE_LOAD.MEDIUM]: INTERVENTIONS.CONTEXTUAL_HELP,
        [COGNITIVE_LOAD.HIGH]: INTERVENTIONS.BREAK_SUGGESTION,
      },
      [FLOW_STATES.ENGAGED]: {
        [COGNITIVE_LOAD.LOW]: INTERVENTIONS.PROACTIVE_HELP,
        [COGNITIVE_LOAD.MEDIUM]: INTERVENTIONS.TARGETED_ASSISTANCE,
        [COGNITIVE_LOAD.HIGH]: INTERVENTIONS.SIMPLIFY_SUGGESTIONS,
      },
      [FLOW_STATES.DISTRACTED]: {
        [COGNITIVE_LOAD.LOW]: INTERVENTIONS.FOCUS_ASSISTANCE,
        [COGNITIVE_LOAD.MEDIUM]: INTERVENTIONS.POMODORO_SUGGESTION,
        [COGNITIVE_LOAD.HIGH]: INTERVENTIONS.BREAK_SUGGESTION,
      },
      [FLOW_STATES.STRUGGLING]: {
        [COGNITIVE_LOAD.LOW]: INTERVENTIONS.COMPREHENSIVE_HELP,
        [COGNITIVE_LOAD.MEDIUM]: INTERVENTIONS.ALTERNATIVE_APPROACH,
        [COGNITIVE_LOAD.HIGH]: INTERVENTIONS.TASK_SWITCH_SUGGESTION,
      },
    };

    this.queuedSuggestions = [];
    this.silenceUntil = 0;
  }

  decideIntervention(flowState, cognitiveLoad) {
    return this.interventionMatrix[flowState.state]?.[cognitiveLoad.level] || 
           INTERVENTIONS.MINIMAL_SUGGESTIONS;
  }

  shouldShowSuggestion(intervention) {
    if (Date.now() < this.silenceUntil) return false;
    
    const silentInterventions = [
      INTERVENTIONS.NO_INTERVENTION,
    ];
    
    return !silentInterventions.includes(intervention);
  }

  queueSuggestion(suggestion) {
    this.queuedSuggestions.push({
      ...suggestion,
      queuedAt: Date.now(),
    });
  }

  getQueuedSuggestions() {
    // Return suggestions that are still relevant (queued within last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return this.queuedSuggestions.filter(s => s.queuedAt > fiveMinutesAgo);
  }

  clearQueue() {
    this.queuedSuggestions = [];
  }

  silenceFor(durationMs) {
    this.silenceUntil = Date.now() + durationMs;
  }

  getInterventionMessage(intervention) {
    const messages = {
      [INTERVENTIONS.NO_INTERVENTION]: null,
      [INTERVENTIONS.GENTLE_REMINDER]: '💭 You\'ve been focused for a while. Consider a short break soon.',
      [INTERVENTIONS.MINIMAL_SUGGESTIONS]: null, // Show only critical suggestions
      [INTERVENTIONS.CONTEXTUAL_HELP]: '💡 Need help? I have some suggestions when you\'re ready.',
      [INTERVENTIONS.BREAK_SUGGESTION]: '☕ High cognitive load detected. A 5-minute break might help.',
      [INTERVENTIONS.PROACTIVE_HELP]: '🚀 I noticed some patterns - want me to help optimize?',
      [INTERVENTIONS.TARGETED_ASSISTANCE]: '🎯 I can help with what you\'re working on.',
      [INTERVENTIONS.SIMPLIFY_SUGGESTIONS]: '📋 Let me simplify the suggestions for you.',
      [INTERVENTIONS.FOCUS_ASSISTANCE]: '🧘 Let\'s get back on track. What\'s the main goal?',
      [INTERVENTIONS.POMODORO_SUGGESTION]: '⏱️ Try a 25-minute focused session?',
      [INTERVENTIONS.COMPREHENSIVE_HELP]: '🤝 I\'m here to help. Let\'s break this down together.',
      [INTERVENTIONS.ALTERNATIVE_APPROACH]: '🔄 Maybe try a different approach?',
      [INTERVENTIONS.TASK_SWITCH_SUGGESTION]: '🔀 Consider switching to a simpler task for now.',
    };

    return messages[intervention];
  }
}


/**
 * Main Flow Optimizer
 */
export class FlowOptimizer {
  constructor() {
    this.flowDetector = new FlowDetector();
    this.cognitiveLoadMonitor = new CognitiveLoadMonitor();
    this.interventionManager = new InterventionManager();
    
    this.sessionStart = Date.now();
    this.flowHistory = [];
    this.lastFlowState = null;
    this.deepFlowStart = null;
    this.totalDeepFlowTime = 0;
  }

  /**
   * Optimize flow based on current context
   */
  async optimizeFlow(context) {
    // 1. Detect current flow state
    const flowState = this.flowDetector.detect(context);

    // 2. Measure cognitive load
    const cognitiveLoad = this.cognitiveLoadMonitor.measure(context);

    // 3. Track flow state changes
    this.trackFlowState(flowState);

    // 4. Decide on intervention
    const intervention = this.interventionManager.decideIntervention(flowState, cognitiveLoad);

    // 5. Get intervention message (if any)
    const message = this.interventionManager.getInterventionMessage(intervention);

    // 6. Check if we should show the intervention
    const shouldShow = this.interventionManager.shouldShowSuggestion(intervention);

    return {
      flowState,
      cognitiveLoad,
      intervention,
      message: shouldShow ? message : null,
      shouldIntervene: shouldShow && message !== null,
      queuedSuggestions: this.interventionManager.getQueuedSuggestions(),
      stats: this.getSessionStats(),
    };
  }

  /**
   * Track flow state changes
   */
  trackFlowState(flowState) {
    // Track deep flow time
    if (flowState.state === FLOW_STATES.DEEP_FLOW) {
      if (!this.deepFlowStart) {
        this.deepFlowStart = Date.now();
      }
    } else {
      if (this.deepFlowStart) {
        this.totalDeepFlowTime += Date.now() - this.deepFlowStart;
        this.deepFlowStart = null;
      }
    }

    // Record state change
    if (this.lastFlowState?.state !== flowState.state) {
      this.flowHistory.push({
        from: this.lastFlowState?.state,
        to: flowState.state,
        timestamp: Date.now(),
      });

      if (this.flowHistory.length > 100) {
        this.flowHistory.shift();
      }
    }

    this.lastFlowState = flowState;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const sessionDuration = Date.now() - this.sessionStart;
    const currentDeepFlow = this.deepFlowStart ? Date.now() - this.deepFlowStart : 0;
    const totalDeepFlow = this.totalDeepFlowTime + currentDeepFlow;

    return {
      sessionDuration,
      totalDeepFlowTime: totalDeepFlow,
      deepFlowPercentage: sessionDuration > 0 ? (totalDeepFlow / sessionDuration) * 100 : 0,
      flowStateChanges: this.flowHistory.length,
      currentStreak: this.getCurrentStreak(),
    };
  }

  /**
   * Get current flow streak (time in current state)
   */
  getCurrentStreak() {
    if (this.flowHistory.length === 0) return Date.now() - this.sessionStart;
    
    const lastChange = this.flowHistory[this.flowHistory.length - 1];
    return Date.now() - lastChange.timestamp;
  }

  /**
   * Queue a suggestion for later (when flow state allows)
   */
  queueSuggestion(suggestion) {
    this.interventionManager.queueSuggestion(suggestion);
  }

  /**
   * Silence all interventions for a duration
   */
  enterFocusMode(durationMs = 25 * 60 * 1000) { // Default 25 minutes (Pomodoro)
    this.interventionManager.silenceFor(durationMs);
    return {
      focusModeActive: true,
      endsAt: Date.now() + durationMs,
      duration: durationMs,
    };
  }

  /**
   * Check if currently in deep flow
   */
  isInDeepFlow() {
    return this.lastFlowState?.state === FLOW_STATES.DEEP_FLOW;
  }

  /**
   * Check if developer is struggling
   */
  isStruggling() {
    return this.lastFlowState?.state === FLOW_STATES.STRUGGLING;
  }

  /**
   * Get flow optimization suggestions
   */
  getOptimizationSuggestions() {
    const stats = this.getSessionStats();
    const suggestions = [];

    // Deep flow suggestions
    if (stats.deepFlowPercentage < 20) {
      suggestions.push({
        type: 'focus',
        message: 'Try reducing distractions to increase deep flow time',
        priority: 'high',
      });
    }

    // Break suggestions
    if (stats.sessionDuration > 2 * 60 * 60 * 1000) { // 2 hours
      suggestions.push({
        type: 'break',
        message: 'You\'ve been working for over 2 hours. Consider a longer break.',
        priority: 'medium',
      });
    }

    // State change suggestions
    if (stats.flowStateChanges > 20) {
      suggestions.push({
        type: 'stability',
        message: 'Frequent state changes detected. Try to minimize context switching.',
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Format flow status for display
   */
  formatFlowStatus() {
    if (!this.lastFlowState) return 'Flow state: Unknown';

    const state = this.lastFlowState.state;
    const stats = this.getSessionStats();
    
    const icons = {
      [FLOW_STATES.DEEP_FLOW]: '🌊',
      [FLOW_STATES.FLOW]: '💧',
      [FLOW_STATES.ENGAGED]: '⚡',
      [FLOW_STATES.DISTRACTED]: '💭',
      [FLOW_STATES.STRUGGLING]: '🆘',
    };

    const icon = icons[state] || '❓';
    const deepFlowMins = Math.round(stats.totalDeepFlowTime / 60000);
    const sessionMins = Math.round(stats.sessionDuration / 60000);

    return `${icon} ${state} | Deep flow: ${deepFlowMins}m / ${sessionMins}m (${stats.deepFlowPercentage.toFixed(0)}%)`;
  }

  /**
   * Reset session (e.g., after a break)
   */
  resetSession() {
    this.sessionStart = Date.now();
    this.flowHistory = [];
    this.lastFlowState = null;
    this.deepFlowStart = null;
    this.totalDeepFlowTime = 0;
    this.interventionManager.clearQueue();
  }
}

export default FlowOptimizer;
