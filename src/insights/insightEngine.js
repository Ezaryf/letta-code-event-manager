/**
 * 🧠 CodeMind Insight Engine
 * 
 * Revolutionary personal analytics for developers - "Fitbit for your developer mind"
 * Transforms raw development activity into deep self-awareness and growth insights.
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

// Event types for comprehensive tracking
export const EVENT_TYPES = {
  // Core Development Events
  CODE_COMPLETION: 'completion',
  DEBUG_SESSION: 'debug',
  FLOW_STATE_ENTER: 'flow_enter',
  FLOW_STATE_EXIT: 'flow_exit',
  PROBLEM_SOLVED: 'problem_solved',
  NEW_CONCEPT_LEARNED: 'concept_learned',
  REFACTORING: 'refactor',
  TEST_WRITTEN: 'test_written',
  ERROR_PATTERN: 'error_pattern',
  DECISION_POINT: 'decision',
  
  // Cognitive Events
  BREAKTHROUGH_MOMENT: 'breakthrough',
  LEARNING_TRIGGER: 'learning_trigger',
  CREATIVITY_SPARK: 'creativity_spark',
  FOCUS_SHIFT: 'focus_shift',
  INTERRUPTION: 'interruption',
  RECOVERY: 'recovery',
  
  // Tool Interaction Events
  FEATURE_USED: 'feature_used',
  AUTOMATION_SAVED_TIME: 'automation_saved',
  CUSTOMIZATION_MADE: 'customization',
  TEACHING_MOMENT: 'teaching_moment'
};

// Insight categories for comprehensive analysis
export const INSIGHT_CATEGORIES = {
  GROWTH: 'growth',
  PERFORMANCE: 'performance', 
  CREATIVITY: 'creativity',
  TOOL_MASTERY: 'tool_mastery',
  COGNITIVE_SIGNATURE: 'cognitive_signature'
};

// Developer evolution stages
export const EVOLUTION_STAGES = {
  LEARNER: { level: 1, name: 'The Learner', description: 'Mastering fundamentals' },
  PRACTITIONER: { level: 2, name: 'The Practitioner', description: 'Building real features' },
  PROBLEM_SOLVER: { level: 3, name: 'The Problem Solver', description: 'Solving complex issues independently' },
  ARCHITECT: { level: 4, name: 'The Architect', description: 'Designing systems, mentoring others' },
  INNOVATOR: { level: 5, name: 'The Innovator', description: 'Creating novel solutions and patterns' },
  VISIONARY: { level: 6, name: 'The Visionary', description: 'Shaping the future of development' }
};

/**
 * Privacy-first event structure
 */
class DeveloperEvent {
  constructor(eventType, metadata = {}) {
    this.id = this.generateEventId();
    this.timestamp = Date.now();
    this.eventType = eventType;
    this.projectHash = this.hashProject(metadata.projectPath);
    this.metadata = this.encryptMetadata(metadata);
    this.cognitiveLoad = metadata.cognitiveLoad || null;
    this.emotionalState = metadata.emotionalState || null;
    this.sessionId = metadata.sessionId || null;
  }

  generateEventId() {
    return `evt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  hashProject(projectPath) {
    if (!projectPath) return 'unknown';
    return crypto.createHash('sha256').update(projectPath).digest('hex').substring(0, 16);
  }

  encryptMetadata(metadata) {
    // Remove sensitive information and encrypt remaining data
    const sanitized = {
      language: metadata.language,
      framework: metadata.framework,
      complexity: metadata.complexity,
      duration: metadata.duration,
      linesChanged: metadata.linesChanged,
      errorType: metadata.errorType,
      solutionType: metadata.solutionType
    };
    
    // In production, this would use proper encryption
    return sanitized;
  }
}

/**
 * Pattern detection and analysis engine
 */
class PatternDetector {
  constructor() {
    this.patterns = new Map();
    this.learningModels = new Map();
  }

  /**
   * Detect problem-solving style from event patterns
   */
  detectProblemSolvingStyle(events) {
    const debugEvents = events.filter(e => e.eventType === EVENT_TYPES.DEBUG_SESSION);
    const solutionEvents = events.filter(e => e.eventType === EVENT_TYPES.PROBLEM_SOLVED);
    
    let analytical = 0;
    let intuitive = 0;
    let experimental = 0;

    // Analyze debugging patterns
    debugEvents.forEach(event => {
      const duration = event.metadata.duration || 0;
      const steps = event.metadata.debugSteps || 0;
      
      if (steps > duration / 300) analytical++; // Many systematic steps
      else if (duration < 600) intuitive++; // Quick insights
      else experimental++; // Trial and error
    });

    const total = analytical + intuitive + experimental || 1;
    return {
      analytical: Math.round((analytical / total) * 100),
      intuitive: Math.round((intuitive / total) * 100),
      experimental: Math.round((experimental / total) * 100)
    };
  }

  /**
   * Detect flow state patterns
   */
  detectFlowPatterns(events) {
    const flowEnters = events.filter(e => e.eventType === EVENT_TYPES.FLOW_STATE_ENTER);
    const flowExits = events.filter(e => e.eventType === EVENT_TYPES.FLOW_STATE_EXIT);
    
    const sessions = [];
    let currentSession = null;

    flowEnters.forEach(enter => {
      const exit = flowExits.find(e => e.timestamp > enter.timestamp);
      if (exit) {
        sessions.push({
          start: enter.timestamp,
          end: exit.timestamp,
          duration: exit.timestamp - enter.timestamp,
          hour: new Date(enter.timestamp).getHours()
        });
      }
    });

    // Find peak flow hours
    const hourCounts = {};
    sessions.forEach(session => {
      hourCounts[session.hour] = (hourCounts[session.hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return {
      totalSessions: sessions.length,
      averageDuration: sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length || 0,
      longestSession: Math.max(...sessions.map(s => s.duration), 0),
      peakHours,
      weeklyGoal: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
      weeklyActual: sessions.reduce((sum, s) => sum + s.duration, 0)
    };
  }

  /**
   * Detect learning triggers and patterns
   */
  detectLearningPatterns(events) {
    const learningEvents = events.filter(e => e.eventType === EVENT_TYPES.NEW_CONCEPT_LEARNED);
    const breakthroughEvents = events.filter(e => e.eventType === EVENT_TYPES.BREAKTHROUGH_MOMENT);
    
    const triggers = {};
    learningEvents.forEach(event => {
      const trigger = event.metadata.trigger || 'unknown';
      triggers[trigger] = (triggers[trigger] || 0) + 1;
    });

    return {
      conceptsLearned: learningEvents.length,
      breakthroughs: breakthroughEvents.length,
      topTriggers: Object.entries(triggers)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([trigger, count]) => ({ trigger, count })),
      learningVelocity: learningEvents.length / 7 // concepts per week
    };
  }

  /**
   * Detect creativity patterns
   */
  detectCreativityPatterns(events) {
    const creativityEvents = events.filter(e => e.eventType === EVENT_TYPES.CREATIVITY_SPARK);
    const refactorEvents = events.filter(e => e.eventType === EVENT_TYPES.REFACTORING);
    
    const creativityByHour = {};
    creativityEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      creativityByHour[hour] = (creativityByHour[hour] || 0) + 1;
    });

    const refactorRatio = refactorEvents.length / events.filter(e => e.eventType === EVENT_TYPES.CODE_COMPLETION).length;

    return {
      creativeOutputs: creativityEvents.length,
      refactorRatio: Math.round(refactorRatio * 100),
      peakCreativityHours: Object.entries(creativityByHour)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour)),
      eleganceScore: this.calculateEleganceScore(events)
    };
  }

  calculateEleganceScore(events) {
    // Simplified elegance calculation based on code quality metrics
    const completionEvents = events.filter(e => e.eventType === EVENT_TYPES.CODE_COMPLETION);
    const totalComplexity = completionEvents.reduce((sum, e) => sum + (e.metadata.complexity || 5), 0);
    const avgComplexity = totalComplexity / completionEvents.length || 5;
    
    // Lower complexity = higher elegance (inverted scale)
    return Math.max(0, Math.min(100, 100 - (avgComplexity * 10)));
  }
}

/**
 * Skill progression tracking
 */
class SkillTracker {
  constructor() {
    this.skills = new Map();
    this.skillTree = this.initializeSkillTree();
  }

  initializeSkillTree() {
    return {
      'Core Foundations': {
        'JavaScript': { level: 0, maxLevel: 10, category: 'language' },
        'Git & Version Control': { level: 0, maxLevel: 10, category: 'tool' },
        'Algorithms': { level: 0, maxLevel: 10, category: 'concept' },
        'Design Patterns': { level: 0, maxLevel: 10, category: 'concept' }
      },
      'Frontend Mastery': {
        'React': { level: 0, maxLevel: 10, category: 'framework' },
        'Vue': { level: 0, maxLevel: 10, category: 'framework' },
        'Angular': { level: 0, maxLevel: 10, category: 'framework' },
        'CSS-in-JS': { level: 0, maxLevel: 10, category: 'technique' },
        'Responsive Design': { level: 0, maxLevel: 10, category: 'technique' }
      },
      'Backend Wizardry': {
        'Node.js': { level: 0, maxLevel: 10, category: 'runtime' },
        'Python': { level: 0, maxLevel: 10, category: 'language' },
        'API Design': { level: 0, maxLevel: 10, category: 'concept' },
        'Authentication': { level: 0, maxLevel: 10, category: 'security' },
        'Deployment': { level: 0, maxLevel: 10, category: 'devops' }
      },
      'Architecture': {
        'Microservices': { level: 0, maxLevel: 10, category: 'pattern' },
        'Monolith Patterns': { level: 0, maxLevel: 10, category: 'pattern' },
        'Database Design': { level: 0, maxLevel: 10, category: 'data' },
        'Performance': { level: 0, maxLevel: 10, category: 'optimization' },
        'Security': { level: 0, maxLevel: 10, category: 'security' }
      },
      'Emerging Skills': {
        'WebAssembly': { level: 0, maxLevel: 10, category: 'technology' },
        'Rust': { level: 0, maxLevel: 10, category: 'language' },
        'Machine Learning': { level: 0, maxLevel: 10, category: 'ai' }
      }
    };
  }

  updateSkillFromEvent(event) {
    const language = event.metadata.language;
    const framework = event.metadata.framework;
    const complexity = event.metadata.complexity || 1;

    // Update language skills
    if (language) {
      this.incrementSkill(language, complexity * 0.1);
    }

    // Update framework skills
    if (framework) {
      this.incrementSkill(framework, complexity * 0.1);
    }

    // Update based on event type
    switch (event.eventType) {
      case EVENT_TYPES.PROBLEM_SOLVED:
        this.incrementSkill('Algorithms', complexity * 0.2);
        break;
      case EVENT_TYPES.REFACTORING:
        this.incrementSkill('Design Patterns', complexity * 0.15);
        break;
      case EVENT_TYPES.TEST_WRITTEN:
        this.incrementSkill('Testing', complexity * 0.1);
        break;
    }
  }

  incrementSkill(skillName, amount) {
    // Find skill in tree
    for (const [category, skills] of Object.entries(this.skillTree)) {
      if (skills[skillName]) {
        const skill = skills[skillName];
        skill.level = Math.min(skill.maxLevel, skill.level + amount);
        break;
      }
    }
  }

  getSkillProgression() {
    const progression = {};
    
    for (const [category, skills] of Object.entries(this.skillTree)) {
      progression[category] = {};
      for (const [skillName, skill] of Object.entries(skills)) {
        progression[category][skillName] = {
          level: Math.floor(skill.level),
          progress: (skill.level % 1) * 100,
          maxLevel: skill.maxLevel,
          category: skill.category
        };
      }
    }
    
    return progression;
  }
}

/**
 * "Moments of Genius" detector and archiver
 */
class GeniusDetector {
  constructor() {
    this.moments = [];
    this.patterns = new Map();
  }

  analyzeForGenius(event, context = {}) {
    let geniusScore = 0;
    let reasons = [];

    // Check for breakthrough indicators
    if (event.eventType === EVENT_TYPES.BREAKTHROUGH_MOMENT) {
      geniusScore += 50;
      reasons.push('Breakthrough moment detected');
    }

    // Check for elegant solutions (low complexity, high impact)
    if (event.metadata.complexity < 3 && event.metadata.impact > 7) {
      geniusScore += 30;
      reasons.push('Elegant solution: low complexity, high impact');
    }

    // Check for creative problem solving
    if (event.metadata.solutionType === 'novel') {
      geniusScore += 25;
      reasons.push('Novel solution approach');
    }

    // Check for debugging mastery
    if (event.eventType === EVENT_TYPES.PROBLEM_SOLVED && 
        event.metadata.debugTime < 300 && 
        event.metadata.problemComplexity > 7) {
      geniusScore += 35;
      reasons.push('Rapid resolution of complex problem');
    }

    // If genius threshold met, archive the moment
    if (geniusScore >= 60) {
      this.archiveMoment(event, geniusScore, reasons, context);
    }

    return { isGenius: geniusScore >= 60, score: geniusScore, reasons };
  }

  archiveMoment(event, score, reasons, context) {
    const moment = {
      id: `genius-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: event.timestamp,
      title: this.generateTitle(event, context),
      problem: context.problem || 'Complex technical challenge',
      solution: context.solution || 'Innovative approach',
      brilliance: reasons.join(', '),
      tags: this.generateTags(event, context),
      score,
      code: context.codeSnippet || null,
      impact: event.metadata.impact || 0
    };

    this.moments.push(moment);
    
    // Keep only top 100 moments
    this.moments.sort((a, b) => b.score - a.score);
    this.moments = this.moments.slice(0, 100);
  }

  generateTitle(event, context) {
    const titles = [
      'The Elegant Solution',
      'The Breakthrough Moment', 
      'The Creative Leap',
      'The Debugging Masterpiece',
      'The Architectural Insight',
      'The Performance Revelation',
      'The Security Insight',
      'The Refactoring Genius'
    ];
    
    return titles[Math.floor(Math.random() * titles.length)];
  }

  generateTags(event, context) {
    const tags = [];
    
    if (event.metadata.language) tags.push(event.metadata.language);
    if (event.metadata.framework) tags.push(event.metadata.framework);
    if (event.eventType === EVENT_TYPES.DEBUG_SESSION) tags.push('debugging');
    if (event.eventType === EVENT_TYPES.REFACTORING) tags.push('refactoring');
    if (event.metadata.solutionType) tags.push(event.metadata.solutionType);
    
    return tags;
  }

  getTopMoments(limit = 10) {
    return this.moments.slice(0, limit);
  }
}

/**
 * Main Insight Engine
 */
export class InsightEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      retentionDays: options.retentionDays || 30,
      insightRetentionDays: options.insightRetentionDays || 730,
      enableGenius: options.enableGenius !== false,
      enablePrediction: options.enablePrediction !== false,
      ...options
    };

    this.events = [];
    this.insights = new Map();
    this.patternDetector = new PatternDetector();
    this.skillTracker = new SkillTracker();
    this.geniusDetector = new GeniusDetector();
    this.currentSession = null;
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Record a developer event
   */
  recordEvent(eventType, metadata = {}) {
    const event = new DeveloperEvent(eventType, {
      ...metadata,
      sessionId: this.currentSession?.id
    });

    this.events.push(event);
    
    // Update skill progression
    this.skillTracker.updateSkillFromEvent(event);
    
    // Check for genius moments
    if (this.options.enableGenius) {
      const geniusResult = this.geniusDetector.analyzeForGenius(event, metadata);
      if (geniusResult.isGenius) {
        this.emit('genius-moment', geniusResult);
      }
    }

    // Emit event for real-time processing
    this.emit('event-recorded', event);
    
    return event.id;
  }

  /**
   * Start a development session
   */
  startSession(metadata = {}) {
    this.currentSession = {
      id: `session-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      startTime: Date.now(),
      metadata
    };

    this.recordEvent(EVENT_TYPES.FLOW_STATE_ENTER, {
      sessionType: 'development',
      ...metadata
    });

    return this.currentSession.id;
  }

  /**
   * End current development session
   */
  endSession(metadata = {}) {
    if (!this.currentSession) return null;

    const duration = Date.now() - this.currentSession.startTime;
    
    this.recordEvent(EVENT_TYPES.FLOW_STATE_EXIT, {
      sessionDuration: duration,
      ...metadata
    });

    const sessionId = this.currentSession.id;
    this.currentSession = null;
    
    return sessionId;
  }

  /**
   * Generate comprehensive insights
   */
  generateInsights(timeframe = '7d') {
    const events = this.getEventsInTimeframe(timeframe);
    
    const insights = {
      timeframe,
      generatedAt: Date.now(),
      
      // Core metrics
      growth: this.generateGrowthInsights(events),
      performance: this.generatePerformanceInsights(events),
      creativity: this.generateCreativityInsights(events),
      toolMastery: this.generateToolMasteryInsights(events),
      cognitiveSignature: this.generateCognitiveSignature(events),
      
      // Special features
      skillTree: this.skillTracker.getSkillProgression(),
      geniusMoments: this.geniusDetector.getTopMoments(5),
      personalizedTips: this.generatePersonalizedTips(events),
      codeWeatherForecast: this.generateCodeWeatherForecast(events)
    };

    // Cache insights
    this.insights.set(timeframe, insights);
    
    return insights;
  }

  generateGrowthInsights(events) {
    const learningPatterns = this.patternDetector.detectLearningPatterns(events);
    const skillProgression = this.skillTracker.getSkillProgression();
    
    return {
      conceptsLearned: learningPatterns.conceptsLearned,
      learningVelocity: learningPatterns.learningVelocity,
      breakthroughs: learningPatterns.breakthroughs,
      skillAdvancements: this.getRecentSkillAdvancements(skillProgression),
      growthAreas: this.identifyGrowthAreas(skillProgression)
    };
  }

  generatePerformanceInsights(events) {
    const flowPatterns = this.patternDetector.detectFlowPatterns(events);
    
    return {
      flowSessions: flowPatterns.totalSessions,
      averageFlowDuration: Math.round(flowPatterns.averageDuration / (1000 * 60)), // minutes
      longestFlow: Math.round(flowPatterns.longestSession / (1000 * 60)), // minutes
      peakHours: flowPatterns.peakHours,
      weeklyGoalProgress: Math.round((flowPatterns.weeklyActual / flowPatterns.weeklyGoal) * 100),
      productivityRhythm: this.analyzeProductivityRhythm(events)
    };
  }

  generateCreativityInsights(events) {
    const creativityPatterns = this.patternDetector.detectCreativityPatterns(events);
    
    return {
      creativeOutputs: creativityPatterns.creativeOutputs,
      refactorRatio: creativityPatterns.refactorRatio,
      eleganceScore: creativityPatterns.eleganceScore,
      peakCreativityHours: creativityPatterns.peakCreativityHours,
      experimentationRate: this.calculateExperimentationRate(events)
    };
  }

  generateToolMasteryInsights(events) {
    const featureEvents = events.filter(e => e.eventType === EVENT_TYPES.FEATURE_USED);
    const automationEvents = events.filter(e => e.eventType === EVENT_TYPES.AUTOMATION_SAVED_TIME);
    
    return {
      featuresUsed: featureEvents.length,
      timeSaved: automationEvents.reduce((sum, e) => sum + (e.metadata.timeSaved || 0), 0),
      customizations: events.filter(e => e.eventType === EVENT_TYPES.CUSTOMIZATION_MADE).length,
      teachingMoments: events.filter(e => e.eventType === EVENT_TYPES.TEACHING_MOMENT).length
    };
  }

  generateCognitiveSignature(events) {
    const problemSolvingStyle = this.patternDetector.detectProblemSolvingStyle(events);
    
    return {
      problemSolvingStyle,
      signature: this.generateSignatureName(problemSolvingStyle),
      decisionVelocity: this.analyzeDecisionVelocity(events),
      errorPatterns: this.analyzeErrorPatterns(events),
      focusArchitecture: this.analyzeFocusArchitecture(events)
    };
  }

  generateSignatureName(style) {
    const { analytical, intuitive, experimental } = style;
    
    if (analytical > 50) return 'The Systematic Analyst';
    if (intuitive > 50) return 'The Intuitive Innovator';
    if (experimental > 50) return 'The Creative Explorer';
    if (analytical > 35 && intuitive > 25) return 'The Systematic Innovator';
    if (intuitive > 35 && experimental > 25) return 'The Creative Intuitive';
    return 'The Balanced Developer';
  }

  generatePersonalizedTips(events) {
    const tips = [];
    const flowPatterns = this.patternDetector.detectFlowPatterns(events);
    const creativityPatterns = this.patternDetector.detectCreativityPatterns(events);
    
    // Flow-based tips
    if (flowPatterns.peakHours.length > 0) {
      const peakHour = flowPatterns.peakHours[0];
      tips.push(`💡 You're most productive around ${peakHour}:00 - schedule complex work then`);
    }
    
    // Creativity-based tips
    if (creativityPatterns.peakCreativityHours.length > 0) {
      const creativeHour = creativityPatterns.peakCreativityHours[0];
      tips.push(`💡 Your best architectural decisions happen around ${creativeHour}:00`);
    }
    
    // Pattern-based tips
    const debugEvents = events.filter(e => e.eventType === EVENT_TYPES.DEBUG_SESSION);
    if (debugEvents.length > 0) {
      const avgDebugTime = debugEvents.reduce((sum, e) => sum + (e.metadata.duration || 0), 0) / debugEvents.length;
      if (avgDebugTime < 300) {
        tips.push('💡 You solve debugging problems quickly - trust your instincts');
      }
    }
    
    return tips.slice(0, 5);
  }

  generateCodeWeatherForecast(events) {
    const now = new Date();
    const forecast = [];
    
    // Generate forecast for next 8 hours
    for (let i = 0; i < 8; i++) {
      const hour = (now.getHours() + i) % 24;
      const prediction = this.predictHourlyPerformance(hour, events);
      
      forecast.push({
        hour,
        timeRange: `${hour}:00-${(hour + 1) % 24}:00`,
        weather: prediction.weather,
        energy: prediction.energy,
        focus: prediction.focus,
        recommendation: prediction.recommendation,
        alerts: prediction.alerts
      });
    }
    
    return forecast;
  }

  predictHourlyPerformance(hour, events) {
    // Analyze historical performance at this hour
    const hourEvents = events.filter(e => new Date(e.timestamp).getHours() === hour);
    const flowEvents = hourEvents.filter(e => e.eventType === EVENT_TYPES.FLOW_STATE_ENTER);
    const errorEvents = hourEvents.filter(e => e.eventType === EVENT_TYPES.ERROR_PATTERN);
    
    const flowScore = flowEvents.length * 20;
    const errorPenalty = errorEvents.length * 10;
    const energy = Math.max(0, Math.min(100, flowScore - errorPenalty + 50));
    
    let weather, recommendation;
    if (energy > 80) {
      weather = 'SUNNY ☀️';
      recommendation = 'Peak creativity window. Best for architectural decisions';
    } else if (energy > 60) {
      weather = 'PARTLY CLOUDY ⛅';
      recommendation = 'Good for refactoring and code review';
    } else if (energy > 40) {
      weather = 'LIGHT RAIN 🌦️';
      recommendation = 'Minor bugs likely. Good time for tests and documentation';
    } else {
      weather = 'CLOUDY ☁️';
      recommendation = 'Consider taking a break or doing lighter tasks';
    }
    
    return {
      weather,
      energy,
      focus: Math.max(0, energy - 10),
      recommendation,
      alerts: errorEvents.length > 2 ? ['Higher chance of errors detected'] : []
    };
  }

  // Helper methods
  getEventsInTimeframe(timeframe) {
    const now = Date.now();
    let cutoff;
    
    switch (timeframe) {
      case '1d': cutoff = now - (24 * 60 * 60 * 1000); break;
      case '7d': cutoff = now - (7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoff = now - (30 * 24 * 60 * 60 * 1000); break;
      default: cutoff = now - (7 * 24 * 60 * 60 * 1000);
    }
    
    return this.events.filter(e => e.timestamp >= cutoff);
  }

  getRecentSkillAdvancements(skillProgression) {
    const advancements = [];
    
    for (const [category, skills] of Object.entries(skillProgression)) {
      for (const [skillName, skill] of Object.entries(skills)) {
        if (skill.level > 0) {
          advancements.push({
            skill: skillName,
            category,
            level: skill.level,
            progress: skill.progress
          });
        }
      }
    }
    
    return advancements.sort((a, b) => b.level - a.level).slice(0, 5);
  }

  identifyGrowthAreas(skillProgression) {
    const growthAreas = [];
    
    for (const [category, skills] of Object.entries(skillProgression)) {
      for (const [skillName, skill] of Object.entries(skills)) {
        if (skill.level < 5 && skill.level > 0) {
          const percentToMastery = Math.round(((10 - skill.level) / 10) * 100);
          growthAreas.push({
            skill: skillName,
            category,
            currentLevel: skill.level,
            percentToMastery
          });
        }
      }
    }
    
    return growthAreas.slice(0, 3);
  }

  analyzeProductivityRhythm(events) {
    const hourlyActivity = {};
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });
    
    return Object.entries(hourlyActivity)
      .map(([hour, activity]) => ({ hour: parseInt(hour), activity }))
      .sort((a, b) => a.hour - b.hour);
  }

  calculateExperimentationRate(events) {
    const totalEvents = events.length;
    const experimentalEvents = events.filter(e => 
      e.metadata.solutionType === 'experimental' || 
      e.metadata.approach === 'novel'
    ).length;
    
    return Math.round((experimentalEvents / totalEvents) * 100) || 0;
  }

  analyzeDecisionVelocity(events) {
    const decisionEvents = events.filter(e => e.eventType === EVENT_TYPES.DECISION_POINT);
    const avgDecisionTime = decisionEvents.reduce((sum, e) => sum + (e.metadata.decisionTime || 0), 0) / decisionEvents.length || 0;
    
    if (avgDecisionTime < 300) return 'Fast';
    if (avgDecisionTime < 900) return 'Moderate';
    return 'Deliberate';
  }

  analyzeErrorPatterns(events) {
    const errorEvents = events.filter(e => e.eventType === EVENT_TYPES.ERROR_PATTERN);
    const patterns = {};
    
    errorEvents.forEach(event => {
      const errorType = event.metadata.errorType || 'unknown';
      patterns[errorType] = (patterns[errorType] || 0) + 1;
    });
    
    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));
  }

  analyzeFocusArchitecture(events) {
    const focusEvents = events.filter(e => e.eventType === EVENT_TYPES.FOCUS_SHIFT);
    const interruptionEvents = events.filter(e => e.eventType === EVENT_TYPES.INTERRUPTION);
    
    return {
      focusShifts: focusEvents.length,
      interruptions: interruptionEvents.length,
      averageRecoveryTime: this.calculateAverageRecoveryTime(events)
    };
  }

  calculateAverageRecoveryTime(events) {
    const recoveryEvents = events.filter(e => e.eventType === EVENT_TYPES.RECOVERY);
    const avgRecovery = recoveryEvents.reduce((sum, e) => sum + (e.metadata.recoveryTime || 0), 0) / recoveryEvents.length || 0;
    
    return Math.round(avgRecovery / 1000); // Convert to seconds
  }

  startCleanupInterval() {
    // Clean up old events every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);
  }

  cleanupOldEvents() {
    const cutoff = Date.now() - (this.options.retentionDays * 24 * 60 * 60 * 1000);
    const initialCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    
    const cleaned = initialCount - this.events.length;
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old events`);
    }
  }

  /**
   * Export insights for external analysis
   */
  exportInsights() {
    return {
      events: this.events.length,
      insights: Object.fromEntries(this.insights),
      skillTree: this.skillTracker.getSkillProgression(),
      geniusMoments: this.geniusDetector.getTopMoments(),
      exportedAt: Date.now()
    };
  }

  /**
   * Get current developer evolution stage
   */
  getCurrentEvolutionStage() {
    const skillProgression = this.skillTracker.getSkillProgression();
    const totalSkillLevel = Object.values(skillProgression)
      .flatMap(category => Object.values(category))
      .reduce((sum, skill) => sum + skill.level, 0);
    
    const avgSkillLevel = totalSkillLevel / 25; // Assuming 25 total skills
    
    if (avgSkillLevel < 2) return EVOLUTION_STAGES.LEARNER;
    if (avgSkillLevel < 4) return EVOLUTION_STAGES.PRACTITIONER;
    if (avgSkillLevel < 6) return EVOLUTION_STAGES.PROBLEM_SOLVER;
    if (avgSkillLevel < 8) return EVOLUTION_STAGES.ARCHITECT;
    if (avgSkillLevel < 9) return EVOLUTION_STAGES.INNOVATOR;
    return EVOLUTION_STAGES.VISIONARY;
  }
}

export default InsightEngine;