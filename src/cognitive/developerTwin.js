/**
 * 🧬 Developer Digital Twin
 * 
 * A digital model that learns and predicts developer behavior.
 * Evolves with each interaction to provide personalized assistance.
 */

import fs from 'fs';
import path from 'path';

// Learning domains
export const LEARNING_DOMAINS = {
  COGNITIVE: 'COGNITIVE',       // How they think
  BEHAVIORAL: 'BEHAVIORAL',     // What they do
  STYLISTIC: 'STYLISTIC',       // How they code
  KNOWLEDGE: 'KNOWLEDGE',       // What they know
  EMOTIONAL: 'EMOTIONAL',       // How they feel
};

// Skill levels
export const SKILL_LEVELS = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  EXPERT: 'EXPERT',
};

/**
 * Cognitive Profile - Models how the developer thinks
 */
class CognitiveProfile {
  constructor() {
    this.problemSolvingStyle = 'unknown'; // analytical, intuitive, systematic
    this.learningStyle = 'unknown';       // visual, reading, hands-on
    this.attentionSpan = 'medium';        // short, medium, long
    this.preferredComplexity = 'medium';  // simple, medium, complex
    this.decisionSpeed = 'medium';        // fast, medium, slow
    this.errorRecoveryStyle = 'unknown';  // methodical, trial-error, seek-help
    
    this.observations = [];
    this.maxObservations = 100;
  }

  update(observation) {
    this.observations.push({
      ...observation,
      timestamp: Date.now(),
    });

    if (this.observations.length > this.maxObservations) {
      this.observations.shift();
    }

    // Infer cognitive traits from observations
    this.inferTraits();
  }

  inferTraits() {
    const recent = this.observations.slice(-20);
    
    // Infer problem-solving style
    const debugPatterns = recent.filter(o => o.type === 'debug');
    if (debugPatterns.length > 5) {
      const usesLogs = debugPatterns.filter(d => d.method === 'console_log').length;
      const usesDebugger = debugPatterns.filter(d => d.method === 'debugger').length;
      const usesTests = debugPatterns.filter(d => d.method === 'test').length;
      
      if (usesTests > usesLogs && usesTests > usesDebugger) {
        this.problemSolvingStyle = 'systematic';
      } else if (usesDebugger > usesLogs) {
        this.problemSolvingStyle = 'analytical';
      } else {
        this.problemSolvingStyle = 'intuitive';
      }
    }

    // Infer attention span from session patterns
    const sessions = recent.filter(o => o.type === 'session');
    if (sessions.length > 0) {
      const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
      if (avgDuration > 2 * 60 * 60 * 1000) this.attentionSpan = 'long';
      else if (avgDuration < 30 * 60 * 1000) this.attentionSpan = 'short';
      else this.attentionSpan = 'medium';
    }

    // Infer decision speed from response times
    const decisions = recent.filter(o => o.type === 'decision');
    if (decisions.length > 0) {
      const avgTime = decisions.reduce((sum, d) => sum + (d.responseTime || 0), 0) / decisions.length;
      if (avgTime < 2000) this.decisionSpeed = 'fast';
      else if (avgTime > 10000) this.decisionSpeed = 'slow';
      else this.decisionSpeed = 'medium';
    }
  }

  predictLikelyErrors(context) {
    const predictions = [];
    
    if (this.attentionSpan === 'short' && context.sessionDuration > 60 * 60 * 1000) {
      predictions.push({
        type: 'fatigue_error',
        probability: 0.7,
        suggestion: 'Consider taking a break - you\'ve been working for a while',
      });
    }

    if (this.problemSolvingStyle === 'intuitive' && context.complexity === 'high') {
      predictions.push({
        type: 'oversight_error',
        probability: 0.5,
        suggestion: 'This is complex - consider a more systematic approach',
      });
    }

    return predictions;
  }

  getSummary() {
    return {
      problemSolvingStyle: this.problemSolvingStyle,
      learningStyle: this.learningStyle,
      attentionSpan: this.attentionSpan,
      preferredComplexity: this.preferredComplexity,
      decisionSpeed: this.decisionSpeed,
      errorRecoveryStyle: this.errorRecoveryStyle,
      observationCount: this.observations.length,
    };
  }
}

/**
 * Behavioral Patterns - Models what the developer does
 */
class BehavioralPatterns {
  constructor() {
    this.codingPatterns = {
      preferredLanguages: [],
      commonOperations: [],
      testingHabits: 'unknown',
      commitFrequency: 'unknown',
      refactoringTendency: 'unknown',
    };
    
    this.workPatterns = {
      productiveHours: [],
      breakFrequency: 'unknown',
      taskSwitchingRate: 'unknown',
      focusSessionLength: 0,
    };
    
    this.errorPatterns = {
      commonMistakes: [],
      recoveryTime: 0,
      helpSeekingBehavior: 'unknown',
    };

    this.actions = [];
    this.maxActions = 500;
  }

  update(action) {
    this.actions.push({
      ...action,
      timestamp: Date.now(),
    });

    if (this.actions.length > this.maxActions) {
      this.actions.shift();
    }

    this.analyzePatterns();
  }

  analyzePatterns() {
    const recent = this.actions.slice(-100);
    
    // Analyze coding patterns
    const fileActions = recent.filter(a => a.type === 'file_edit');
    if (fileActions.length > 0) {
      const extensions = fileActions.map(a => path.extname(a.file || ''));
      const extCounts = {};
      extensions.forEach(ext => {
        extCounts[ext] = (extCounts[ext] || 0) + 1;
      });
      this.codingPatterns.preferredLanguages = Object.entries(extCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([ext]) => ext);
    }

    // Analyze work patterns
    const timestamps = recent.map(a => a.timestamp);
    if (timestamps.length > 10) {
      const hours = timestamps.map(t => new Date(t).getHours());
      const hourCounts = {};
      hours.forEach(h => {
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      });
      this.workPatterns.productiveHours = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));
    }

    // Analyze error patterns
    const errors = recent.filter(a => a.type === 'error');
    if (errors.length > 0) {
      const errorTypes = {};
      errors.forEach(e => {
        const type = e.errorType || 'unknown';
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });
      this.errorPatterns.commonMistakes = Object.entries(errorTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));
    }

    // Analyze commit frequency
    const commits = recent.filter(a => a.type === 'commit');
    if (commits.length > 0) {
      const avgGap = this.calculateAverageGap(commits.map(c => c.timestamp));
      if (avgGap < 30 * 60 * 1000) this.codingPatterns.commitFrequency = 'frequent';
      else if (avgGap > 4 * 60 * 60 * 1000) this.codingPatterns.commitFrequency = 'rare';
      else this.codingPatterns.commitFrequency = 'moderate';
    }
  }

  calculateAverageGap(timestamps) {
    if (timestamps.length < 2) return 0;
    const sorted = [...timestamps].sort((a, b) => a - b);
    let totalGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalGap += sorted[i] - sorted[i - 1];
    }
    return totalGap / (sorted.length - 1);
  }

  predictNextAction(context) {
    const recent = this.actions.slice(-10);
    const lastAction = recent[recent.length - 1];
    
    const predictions = [];
    
    // Based on last action
    if (lastAction?.type === 'file_edit') {
      predictions.push({ action: 'save_file', probability: 0.8 });
      predictions.push({ action: 'run_tests', probability: 0.3 });
    }
    
    if (lastAction?.type === 'error') {
      predictions.push({ action: 'debug', probability: 0.7 });
      predictions.push({ action: 'search', probability: 0.4 });
    }

    // Based on time patterns
    const currentHour = new Date().getHours();
    if (this.workPatterns.productiveHours.includes(currentHour)) {
      predictions.push({ action: 'deep_work', probability: 0.6 });
    }

    return predictions;
  }

  getSummary() {
    return {
      codingPatterns: this.codingPatterns,
      workPatterns: this.workPatterns,
      errorPatterns: this.errorPatterns,
      totalActions: this.actions.length,
    };
  }
}

/**
 * Stylistic Fingerprint - Models how the developer codes
 */
class StylisticFingerprint {
  constructor() {
    this.preferences = {
      indentation: 'unknown',      // tabs, 2-spaces, 4-spaces
      quotes: 'unknown',           // single, double
      semicolons: 'unknown',       // always, never
      bracketStyle: 'unknown',     // same-line, new-line
      namingConvention: 'unknown', // camelCase, snake_case, PascalCase
      commentStyle: 'unknown',     // minimal, moderate, verbose
    };
    
    this.codeMetrics = {
      avgFunctionLength: 0,
      avgFileLength: 0,
      complexityPreference: 'unknown',
      abstractionLevel: 'unknown',
    };

    this.samples = [];
    this.maxSamples = 50;
  }

  update(codeSample) {
    this.samples.push({
      code: codeSample.code?.slice(0, 1000), // Limit size
      file: codeSample.file,
      timestamp: Date.now(),
    });

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    this.analyzeStyle();
  }

  analyzeStyle() {
    const allCode = this.samples.map(s => s.code || '').join('\n');
    
    if (allCode.length < 100) return;

    // Detect indentation
    const tabCount = (allCode.match(/^\t/gm) || []).length;
    const twoSpaceCount = (allCode.match(/^  (?! )/gm) || []).length;
    const fourSpaceCount = (allCode.match(/^    /gm) || []).length;
    
    if (tabCount > twoSpaceCount && tabCount > fourSpaceCount) {
      this.preferences.indentation = 'tabs';
    } else if (twoSpaceCount > fourSpaceCount) {
      this.preferences.indentation = '2-spaces';
    } else {
      this.preferences.indentation = '4-spaces';
    }

    // Detect quote style
    const singleQuotes = (allCode.match(/'/g) || []).length;
    const doubleQuotes = (allCode.match(/"/g) || []).length;
    this.preferences.quotes = singleQuotes > doubleQuotes ? 'single' : 'double';

    // Detect semicolon usage
    const withSemi = (allCode.match(/;\s*$/gm) || []).length;
    const lines = allCode.split('\n').length;
    this.preferences.semicolons = withSemi / lines > 0.5 ? 'always' : 'never';

    // Detect naming convention
    const camelCase = (allCode.match(/\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g) || []).length;
    const snakeCase = (allCode.match(/\b[a-z]+_[a-z]+\b/g) || []).length;
    
    if (camelCase > snakeCase * 2) {
      this.preferences.namingConvention = 'camelCase';
    } else if (snakeCase > camelCase * 2) {
      this.preferences.namingConvention = 'snake_case';
    } else {
      this.preferences.namingConvention = 'mixed';
    }

    // Analyze code metrics
    const functions = allCode.match(/function\s+\w+|=>\s*\{|=>\s*[^{]/g) || [];
    const avgLength = allCode.length / Math.max(functions.length, 1);
    this.codeMetrics.avgFunctionLength = Math.round(avgLength / 50); // Rough line estimate
  }

  matchesStyle(code) {
    const issues = [];
    
    // Check indentation
    if (this.preferences.indentation === 'tabs' && /^  /m.test(code)) {
      issues.push('Uses spaces instead of tabs');
    }
    if (this.preferences.indentation === '2-spaces' && /^\t/m.test(code)) {
      issues.push('Uses tabs instead of 2 spaces');
    }

    // Check quotes
    if (this.preferences.quotes === 'single' && /"/.test(code)) {
      issues.push('Uses double quotes instead of single');
    }
    if (this.preferences.quotes === 'double' && /'/.test(code)) {
      issues.push('Uses single quotes instead of double');
    }

    return {
      matches: issues.length === 0,
      issues,
    };
  }

  getSummary() {
    return {
      preferences: this.preferences,
      codeMetrics: this.codeMetrics,
      sampleCount: this.samples.length,
    };
  }
}

/**
 * Knowledge Graph - Models what the developer knows
 */
class KnowledgeGraph {
  constructor() {
    this.skills = new Map(); // skill -> { level, lastUsed, frequency }
    this.technologies = new Map();
    this.concepts = new Map();
    this.learningHistory = [];
  }

  update(observation) {
    // Update skills based on code usage
    if (observation.skills) {
      for (const skill of observation.skills) {
        const existing = this.skills.get(skill) || { level: 0, frequency: 0 };
        this.skills.set(skill, {
          level: Math.min(existing.level + 0.1, 1),
          frequency: existing.frequency + 1,
          lastUsed: Date.now(),
        });
      }
    }

    // Update technologies
    if (observation.technologies) {
      for (const tech of observation.technologies) {
        const existing = this.technologies.get(tech) || { frequency: 0 };
        this.technologies.set(tech, {
          frequency: existing.frequency + 1,
          lastUsed: Date.now(),
        });
      }
    }

    // Record learning
    if (observation.learned) {
      this.learningHistory.push({
        topic: observation.learned,
        timestamp: Date.now(),
      });
    }
  }

  assessSkillLevel(skill) {
    const data = this.skills.get(skill);
    if (!data) return SKILL_LEVELS.BEGINNER;
    
    if (data.level > 0.8 && data.frequency > 50) return SKILL_LEVELS.EXPERT;
    if (data.level > 0.6 && data.frequency > 20) return SKILL_LEVELS.ADVANCED;
    if (data.level > 0.3 && data.frequency > 5) return SKILL_LEVELS.INTERMEDIATE;
    return SKILL_LEVELS.BEGINNER;
  }

  getStrengths() {
    return [...this.skills.entries()]
      .filter(([_, data]) => data.level > 0.6)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 5)
      .map(([skill, data]) => ({ skill, level: data.level }));
  }

  getWeaknesses() {
    return [...this.skills.entries()]
      .filter(([_, data]) => data.level < 0.4 && data.frequency > 3)
      .sort((a, b) => a[1].level - b[1].level)
      .slice(0, 5)
      .map(([skill, data]) => ({ skill, level: data.level }));
  }

  suggestLearning() {
    const weaknesses = this.getWeaknesses();
    const recentTech = [...this.technologies.entries()]
      .filter(([_, data]) => Date.now() - data.lastUsed < 7 * 24 * 60 * 60 * 1000)
      .map(([tech]) => tech);

    return {
      improvementAreas: weaknesses.map(w => w.skill),
      relatedTopics: recentTech.slice(0, 3),
      suggestedResources: this.getSuggestedResources(weaknesses),
    };
  }

  getSuggestedResources(weaknesses) {
    // Would integrate with actual learning resources
    return weaknesses.map(w => ({
      skill: w.skill,
      resource: `Learn more about ${w.skill}`,
    }));
  }

  getSummary() {
    return {
      totalSkills: this.skills.size,
      totalTechnologies: this.technologies.size,
      strengths: this.getStrengths(),
      weaknesses: this.getWeaknesses(),
      recentLearning: this.learningHistory.slice(-5),
    };
  }
}


/**
 * Main Developer Digital Twin
 */
export class DeveloperTwin {
  constructor(developerId = 'default') {
    this.id = developerId;
    this.createdAt = Date.now();
    
    // Core models
    this.cognitiveProfile = new CognitiveProfile();
    this.behavioralPatterns = new BehavioralPatterns();
    this.stylisticFingerprint = new StylisticFingerprint();
    this.knowledgeGraph = new KnowledgeGraph();
    
    // Evolution tracking
    this.evolutionTimeline = [];
    this.version = 1;
    
    // Metrics
    this.predictionAccuracy = 0.5;
    this.totalObservations = 0;
  }

  /**
   * Observe and learn from developer action
   */
  async observe(observation) {
    this.totalObservations++;
    
    // Update all models
    if (observation.cognitive) {
      this.cognitiveProfile.update(observation.cognitive);
    }
    
    if (observation.action) {
      this.behavioralPatterns.update(observation.action);
    }
    
    if (observation.code) {
      this.stylisticFingerprint.update(observation.code);
    }
    
    if (observation.knowledge) {
      this.knowledgeGraph.update(observation.knowledge);
    }

    // Record evolution
    this.recordEvolution(observation);

    return {
      observed: true,
      totalObservations: this.totalObservations,
      version: this.version,
    };
  }

  /**
   * Record evolution in timeline
   */
  recordEvolution(observation) {
    this.evolutionTimeline.push({
      timestamp: Date.now(),
      type: observation.type || 'general',
      summary: this.summarizeObservation(observation),
    });

    if (this.evolutionTimeline.length > 1000) {
      this.evolutionTimeline.shift();
    }

    // Increment version periodically
    if (this.totalObservations % 100 === 0) {
      this.version++;
    }
  }

  summarizeObservation(observation) {
    if (observation.action?.type) return `Action: ${observation.action.type}`;
    if (observation.cognitive?.type) return `Cognitive: ${observation.cognitive.type}`;
    if (observation.code?.file) return `Code: ${observation.code.file}`;
    return 'General observation';
  }

  /**
   * Predict developer behavior
   */
  async predict(context = {}) {
    const predictions = {
      nextAction: this.behavioralPatterns.predictNextAction(context),
      likelyErrors: this.cognitiveProfile.predictLikelyErrors(context),
      optimalTiming: this.predictOptimalTiming(context),
      suggestedApproach: this.suggestApproach(context),
    };

    return predictions;
  }

  /**
   * Predict optimal timing for interventions
   */
  predictOptimalTiming(context) {
    const currentHour = new Date().getHours();
    const productiveHours = this.behavioralPatterns.workPatterns.productiveHours;
    
    const isProductiveTime = productiveHours.includes(currentHour);
    const attentionSpan = this.cognitiveProfile.attentionSpan;
    
    return {
      isProductiveTime,
      suggestedBreakIn: attentionSpan === 'short' ? 25 : attentionSpan === 'long' ? 90 : 45,
      bestTimeForComplexTasks: productiveHours[0] || 10,
      currentFocusLevel: isProductiveTime ? 'high' : 'moderate',
    };
  }

  /**
   * Suggest approach based on developer profile
   */
  suggestApproach(context) {
    const style = this.cognitiveProfile.problemSolvingStyle;
    const complexity = context.complexity || 'medium';
    
    const approaches = {
      analytical: {
        suggestion: 'Break down the problem systematically',
        steps: ['Analyze requirements', 'Identify components', 'Plan implementation', 'Execute step by step'],
      },
      intuitive: {
        suggestion: 'Start with a prototype and iterate',
        steps: ['Quick prototype', 'Test assumptions', 'Refine based on feedback', 'Polish'],
      },
      systematic: {
        suggestion: 'Follow established patterns and best practices',
        steps: ['Research patterns', 'Choose appropriate pattern', 'Implement with tests', 'Review'],
      },
    };

    return approaches[style] || approaches.systematic;
  }

  /**
   * Simulate how developer would approach a task
   */
  async simulate(task, context = {}) {
    return {
      understanding: this.simulateUnderstanding(task),
      approach: this.suggestApproach({ ...context, task }),
      estimatedTime: this.estimateTime(task),
      potentialChallenges: this.identifyChallenges(task),
      recommendedResources: this.knowledgeGraph.suggestLearning(),
    };
  }

  simulateUnderstanding(task) {
    const taskLower = (task.description || task).toLowerCase();
    const relevantSkills = [...this.knowledgeGraph.skills.keys()]
      .filter(skill => taskLower.includes(skill.toLowerCase()));
    
    const avgSkillLevel = relevantSkills.length > 0
      ? relevantSkills.reduce((sum, skill) => {
          const data = this.knowledgeGraph.skills.get(skill);
          return sum + (data?.level || 0);
        }, 0) / relevantSkills.length
      : 0.5;

    return {
      comprehensionLevel: avgSkillLevel > 0.7 ? 'high' : avgSkillLevel > 0.4 ? 'medium' : 'low',
      relevantSkills,
      gapsIdentified: this.knowledgeGraph.getWeaknesses()
        .filter(w => taskLower.includes(w.skill.toLowerCase())),
    };
  }

  estimateTime(task) {
    const complexity = task.complexity || 'medium';
    const decisionSpeed = this.cognitiveProfile.decisionSpeed;
    
    const baseTime = {
      simple: 30,
      medium: 120,
      complex: 480,
    }[complexity] || 120;

    const speedMultiplier = {
      fast: 0.8,
      medium: 1,
      slow: 1.3,
    }[decisionSpeed] || 1;

    return {
      minutes: Math.round(baseTime * speedMultiplier),
      confidence: 0.6,
      factors: ['complexity', 'developer speed', 'skill level'],
    };
  }

  identifyChallenges(task) {
    const challenges = [];
    const weaknesses = this.knowledgeGraph.getWeaknesses();
    const taskLower = (task.description || task).toLowerCase();

    for (const weakness of weaknesses) {
      if (taskLower.includes(weakness.skill.toLowerCase())) {
        challenges.push({
          area: weakness.skill,
          severity: weakness.level < 0.2 ? 'high' : 'medium',
          suggestion: `Consider reviewing ${weakness.skill} concepts`,
        });
      }
    }

    if (this.cognitiveProfile.attentionSpan === 'short' && task.complexity === 'complex') {
      challenges.push({
        area: 'focus',
        severity: 'medium',
        suggestion: 'Break task into smaller chunks with breaks',
      });
    }

    return challenges;
  }

  /**
   * Get optimization suggestions for the developer
   */
  getOptimizations() {
    return {
      cognitive: this.getCognitiveOptimizations(),
      behavioral: this.getBehavioralOptimizations(),
      stylistic: this.getStylisticOptimizations(),
      knowledge: this.knowledgeGraph.suggestLearning(),
    };
  }

  getCognitiveOptimizations() {
    const optimizations = [];
    
    if (this.cognitiveProfile.attentionSpan === 'short') {
      optimizations.push({
        area: 'Focus',
        suggestion: 'Try the Pomodoro technique (25 min work, 5 min break)',
        priority: 'high',
      });
    }

    if (this.cognitiveProfile.decisionSpeed === 'slow') {
      optimizations.push({
        area: 'Decision Making',
        suggestion: 'Set time limits for decisions to avoid analysis paralysis',
        priority: 'medium',
      });
    }

    return optimizations;
  }

  getBehavioralOptimizations() {
    const optimizations = [];
    
    if (this.behavioralPatterns.codingPatterns.commitFrequency === 'rare') {
      optimizations.push({
        area: 'Version Control',
        suggestion: 'Commit more frequently to reduce risk and improve history',
        priority: 'medium',
      });
    }

    if (this.behavioralPatterns.errorPatterns.commonMistakes.length > 3) {
      optimizations.push({
        area: 'Error Prevention',
        suggestion: `Focus on reducing ${this.behavioralPatterns.errorPatterns.commonMistakes[0]?.type} errors`,
        priority: 'high',
      });
    }

    return optimizations;
  }

  getStylisticOptimizations() {
    const optimizations = [];
    
    if (this.stylisticFingerprint.preferences.namingConvention === 'mixed') {
      optimizations.push({
        area: 'Code Style',
        suggestion: 'Adopt a consistent naming convention',
        priority: 'low',
      });
    }

    return optimizations;
  }

  /**
   * Generate personalized learning path
   */
  generateLearningPath() {
    const weaknesses = this.knowledgeGraph.getWeaknesses();
    const strengths = this.knowledgeGraph.getStrengths();
    
    return {
      currentLevel: this.assessOverallLevel(),
      focusAreas: weaknesses.slice(0, 3).map(w => w.skill),
      leverageStrengths: strengths.slice(0, 3).map(s => s.skill),
      milestones: this.generateMilestones(weaknesses),
      estimatedTimeToNextLevel: this.estimateTimeToNextLevel(),
    };
  }

  assessOverallLevel() {
    const skills = [...this.knowledgeGraph.skills.values()];
    if (skills.length === 0) return SKILL_LEVELS.BEGINNER;
    
    const avgLevel = skills.reduce((sum, s) => sum + s.level, 0) / skills.length;
    
    if (avgLevel > 0.8) return SKILL_LEVELS.EXPERT;
    if (avgLevel > 0.6) return SKILL_LEVELS.ADVANCED;
    if (avgLevel > 0.3) return SKILL_LEVELS.INTERMEDIATE;
    return SKILL_LEVELS.BEGINNER;
  }

  generateMilestones(weaknesses) {
    return weaknesses.slice(0, 3).map((w, i) => ({
      milestone: i + 1,
      skill: w.skill,
      target: 'Reach intermediate level',
      actions: [`Practice ${w.skill}`, `Complete 3 exercises`, `Build a small project`],
    }));
  }

  estimateTimeToNextLevel() {
    const currentLevel = this.assessOverallLevel();
    const estimates = {
      [SKILL_LEVELS.BEGINNER]: '2-4 weeks',
      [SKILL_LEVELS.INTERMEDIATE]: '1-3 months',
      [SKILL_LEVELS.ADVANCED]: '3-6 months',
      [SKILL_LEVELS.EXPERT]: 'Continuous improvement',
    };
    return estimates[currentLevel] || '1-3 months';
  }

  /**
   * Get complete twin state
   */
  getState() {
    return {
      id: this.id,
      version: this.version,
      createdAt: this.createdAt,
      totalObservations: this.totalObservations,
      cognitive: this.cognitiveProfile.getSummary(),
      behavioral: this.behavioralPatterns.getSummary(),
      stylistic: this.stylisticFingerprint.getSummary(),
      knowledge: this.knowledgeGraph.getSummary(),
      overallLevel: this.assessOverallLevel(),
    };
  }

  /**
   * Export twin for persistence
   */
  export() {
    return {
      id: this.id,
      version: this.version,
      createdAt: this.createdAt,
      totalObservations: this.totalObservations,
      cognitive: this.cognitiveProfile,
      behavioral: this.behavioralPatterns,
      stylistic: this.stylisticFingerprint,
      knowledge: {
        skills: Object.fromEntries(this.knowledgeGraph.skills),
        technologies: Object.fromEntries(this.knowledgeGraph.technologies),
      },
      evolutionTimeline: this.evolutionTimeline.slice(-100),
      exportedAt: Date.now(),
    };
  }

  /**
   * Import twin from persistence
   */
  import(data) {
    if (data.id) this.id = data.id;
    if (data.version) this.version = data.version;
    if (data.createdAt) this.createdAt = data.createdAt;
    if (data.totalObservations) this.totalObservations = data.totalObservations;
    
    if (data.knowledge?.skills) {
      this.knowledgeGraph.skills = new Map(Object.entries(data.knowledge.skills));
    }
    if (data.knowledge?.technologies) {
      this.knowledgeGraph.technologies = new Map(Object.entries(data.knowledge.technologies));
    }
    if (data.evolutionTimeline) {
      this.evolutionTimeline = data.evolutionTimeline;
    }
  }

  /**
   * Format twin summary for display
   */
  formatSummary() {
    const state = this.getState();
    const lines = [];
    
    lines.push('\n🧬 DEVELOPER DIGITAL TWIN');
    lines.push('═'.repeat(50));
    
    lines.push(`\n📊 Overview:`);
    lines.push(`   Version: ${state.version} | Observations: ${state.totalObservations}`);
    lines.push(`   Overall Level: ${state.overallLevel}`);
    
    lines.push(`\n🧠 Cognitive Profile:`);
    lines.push(`   Problem Solving: ${state.cognitive.problemSolvingStyle}`);
    lines.push(`   Attention Span: ${state.cognitive.attentionSpan}`);
    lines.push(`   Decision Speed: ${state.cognitive.decisionSpeed}`);
    
    lines.push(`\n⚡ Behavioral Patterns:`);
    lines.push(`   Commit Frequency: ${state.behavioral.codingPatterns.commitFrequency}`);
    lines.push(`   Productive Hours: ${state.behavioral.workPatterns.productiveHours.join(', ') || 'Unknown'}`);
    
    lines.push(`\n✨ Code Style:`);
    lines.push(`   Indentation: ${state.stylistic.preferences.indentation}`);
    lines.push(`   Quotes: ${state.stylistic.preferences.quotes}`);
    lines.push(`   Naming: ${state.stylistic.preferences.namingConvention}`);
    
    lines.push(`\n📚 Knowledge:`);
    lines.push(`   Skills: ${state.knowledge.totalSkills}`);
    lines.push(`   Strengths: ${state.knowledge.strengths.map(s => s.skill).join(', ') || 'Building...'}`);
    lines.push(`   Growth Areas: ${state.knowledge.weaknesses.map(w => w.skill).join(', ') || 'None identified'}`);
    
    lines.push('\n' + '═'.repeat(50));
    
    return lines.join('\n');
  }
}

// Export helper classes (constants are already exported inline at the top)
export {
  CognitiveProfile,
  BehavioralPatterns,
  StylisticFingerprint,
  KnowledgeGraph,
};

export default DeveloperTwin;
