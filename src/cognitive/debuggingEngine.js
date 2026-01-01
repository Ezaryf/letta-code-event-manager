/**
 * 🧱 PILLAR 4: Why-First Debugging Engine
 * 
 * Explains root causes, not just symptoms.
 * Builds causal graphs to trace errors back to their source.
 */

// Error categories
export const ERROR_CATEGORIES = {
  SYNTAX: 'SYNTAX',
  RUNTIME: 'RUNTIME',
  LOGIC: 'LOGIC',
  TYPE: 'TYPE',
  ASYNC: 'ASYNC',
  NETWORK: 'NETWORK',
  STATE: 'STATE',
  DEPENDENCY: 'DEPENDENCY',
};

// Fix difficulty levels
export const FIX_DIFFICULTY = {
  TRIVIAL: 'TRIVIAL',     // < 1 minute
  EASY: 'EASY',           // 1-5 minutes
  MODERATE: 'MODERATE',   // 5-15 minutes
  HARD: 'HARD',           // 15-60 minutes
  COMPLEX: 'COMPLEX',     // > 1 hour
};

/**
 * Causal Graph Builder - Traces error chains
 */
class CausalGraphBuilder {
  constructor() {
    this.errorPatterns = this.initializePatterns();
  }

  initializePatterns() {
    return {
      // TypeError patterns
      'Cannot read property': {
        category: ERROR_CATEGORIES.TYPE,
        causes: ['null_reference', 'undefined_variable', 'wrong_type'],
        commonFixes: ['Add null check', 'Initialize variable', 'Verify data type'],
      },
      'is not a function': {
        category: ERROR_CATEGORIES.TYPE,
        causes: ['wrong_type', 'missing_import', 'typo'],
        commonFixes: ['Check variable type', 'Import the function', 'Fix spelling'],
      },
      'Cannot read properties of undefined': {
        category: ERROR_CATEGORIES.TYPE,
        causes: ['async_timing', 'missing_data', 'wrong_path'],
        commonFixes: ['Add optional chaining', 'Check data loading', 'Verify object path'],
      },
      'Cannot read properties of null': {
        category: ERROR_CATEGORIES.TYPE,
        causes: ['null_assignment', 'failed_query', 'cleared_reference'],
        commonFixes: ['Check for null before access', 'Verify query result', 'Track reference lifecycle'],
      },
      
      // ReferenceError patterns
      'is not defined': {
        category: ERROR_CATEGORIES.RUNTIME,
        causes: ['missing_import', 'typo', 'scope_issue'],
        commonFixes: ['Import the module', 'Fix variable name', 'Check variable scope'],
      },
      
      // SyntaxError patterns
      'Unexpected token': {
        category: ERROR_CATEGORIES.SYNTAX,
        causes: ['missing_bracket', 'invalid_syntax', 'encoding_issue'],
        commonFixes: ['Check brackets/braces', 'Review syntax', 'Check file encoding'],
      },
      
      // Async patterns
      'Unhandled promise rejection': {
        category: ERROR_CATEGORIES.ASYNC,
        causes: ['missing_catch', 'async_error', 'network_failure'],
        commonFixes: ['Add .catch() handler', 'Use try/catch with await', 'Handle network errors'],
      },
      
      // Network patterns
      'Failed to fetch': {
        category: ERROR_CATEGORIES.NETWORK,
        causes: ['cors_issue', 'server_down', 'wrong_url'],
        commonFixes: ['Check CORS configuration', 'Verify server status', 'Validate URL'],
      },
      'Network request failed': {
        category: ERROR_CATEGORIES.NETWORK,
        causes: ['no_connection', 'timeout', 'server_error'],
        commonFixes: ['Check internet connection', 'Increase timeout', 'Check server logs'],
      },
    };
  }

  buildGraph(error, context = {}) {
    const graph = {
      symptom: this.parseSymptom(error),
      causes: [],
      chain: [],
      context: context,
    };

    // Match error to known patterns
    const pattern = this.matchPattern(error.message);
    if (pattern) {
      graph.pattern = pattern;
      graph.causes = pattern.causes.map(cause => ({
        type: cause,
        probability: this.calculateProbability(cause, error, context),
        evidence: this.gatherEvidence(cause, error, context),
      }));
    }

    // Build causal chain
    graph.chain = this.buildCausalChain(error, context);

    // Rank causes by probability
    graph.causes.sort((a, b) => b.probability - a.probability);

    return graph;
  }

  parseSymptom(error) {
    return {
      type: error.name || 'Error',
      message: error.message,
      stack: this.parseStack(error.stack),
      timestamp: Date.now(),
    };
  }

  parseStack(stack) {
    if (!stack) return [];
    
    const lines = stack.split('\n').slice(1);
    return lines.map(line => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          function: match[1],
          file: match[2],
          line: parseInt(match[3]),
          column: parseInt(match[4]),
        };
      }
      return { raw: line.trim() };
    }).filter(frame => frame.function || frame.raw);
  }

  matchPattern(message) {
    for (const [pattern, data] of Object.entries(this.errorPatterns)) {
      if (message.includes(pattern)) {
        return { pattern, ...data };
      }
    }
    return null;
  }

  calculateProbability(cause, error, context) {
    let probability = 0.5; // Base probability

    // Adjust based on error type
    if (cause === 'null_reference' && error.message.includes('null')) {
      probability += 0.3;
    }
    if (cause === 'async_timing' && context.hasAsync) {
      probability += 0.2;
    }
    if (cause === 'missing_import' && error.message.includes('not defined')) {
      probability += 0.25;
    }
    if (cause === 'typo' && context.recentChanges?.length > 0) {
      probability += 0.15;
    }

    return Math.min(probability, 0.95);
  }

  gatherEvidence(cause, error, context) {
    const evidence = [];

    switch (cause) {
      case 'null_reference':
        if (error.message.includes('null')) {
          evidence.push('Error message explicitly mentions null');
        }
        break;
      case 'async_timing':
        if (context.code?.includes('async') || context.code?.includes('await')) {
          evidence.push('Code contains async operations');
        }
        break;
      case 'missing_import':
        if (!context.imports?.some(i => error.message.includes(i))) {
          evidence.push('Referenced name not found in imports');
        }
        break;
    }

    return evidence;
  }

  buildCausalChain(error, context) {
    const chain = [];
    
    // Start with the symptom
    chain.push({
      step: 1,
      type: 'SYMPTOM',
      description: `Error occurred: ${error.message}`,
    });

    // Add stack trace steps
    const stack = this.parseStack(error.stack);
    if (stack.length > 0) {
      chain.push({
        step: 2,
        type: 'LOCATION',
        description: `At ${stack[0].function || 'unknown'} in ${stack[0].file || 'unknown'}:${stack[0].line || '?'}`,
      });
    }

    // Add inferred cause
    const pattern = this.matchPattern(error.message);
    if (pattern) {
      chain.push({
        step: 3,
        type: 'CAUSE',
        description: `Likely cause: ${pattern.causes[0].replace(/_/g, ' ')}`,
      });
    }

    return chain;
  }
}

/**
 * Root Cause Analyzer - Finds the actual source of problems
 */
class RootCauseAnalyzer {
  constructor() {
    this.causeDescriptions = {
      null_reference: 'A variable or property is null when it should have a value',
      undefined_variable: 'A variable is being used before it has been assigned a value',
      wrong_type: 'A value has a different type than expected',
      missing_import: 'A module or function has not been imported',
      typo: 'There is a spelling mistake in a variable or function name',
      scope_issue: 'A variable is being accessed outside its scope',
      async_timing: 'An async operation completed in an unexpected order',
      missing_catch: 'A Promise rejection is not being handled',
      cors_issue: 'Cross-Origin Resource Sharing is blocking the request',
      server_down: 'The server is not responding',
      wrong_url: 'The URL being requested is incorrect',
      missing_bracket: 'A bracket, brace, or parenthesis is missing',
      invalid_syntax: 'The code contains invalid JavaScript syntax',
    };
  }

  analyze(graph) {
    const topCause = graph.causes[0];
    if (!topCause) {
      return {
        cause: 'unknown',
        description: 'Unable to determine root cause',
        confidence: 0,
      };
    }

    return {
      cause: topCause.type,
      description: this.causeDescriptions[topCause.type] || 'Unknown cause',
      confidence: topCause.probability,
      evidence: topCause.evidence,
      alternatives: graph.causes.slice(1, 3).map(c => ({
        cause: c.type,
        probability: c.probability,
      })),
    };
  }
}

/**
 * Fix Path Generator - Creates step-by-step fix instructions
 */
class FixPathGenerator {
  generateFixPath(rootCause, graph, context = {}) {
    const fixPath = {
      immediate: this.generateImmediateFix(rootCause, graph),
      robust: this.generateRobustFix(rootCause, graph),
      preventive: this.generatePreventiveFix(rootCause, graph),
      steps: this.generateSteps(rootCause, graph, context),
      estimatedTime: this.estimateTime(rootCause),
      difficulty: this.assessDifficulty(rootCause),
      sideEffects: this.identifySideEffects(rootCause, context),
    };

    return fixPath;
  }

  generateImmediateFix(rootCause, graph) {
    const fixes = {
      null_reference: {
        description: 'Add null check before accessing property',
        code: 'if (obj != null) { /* access property */ }',
        time: '< 1 minute',
      },
      undefined_variable: {
        description: 'Initialize the variable before use',
        code: 'let variable = defaultValue;',
        time: '< 1 minute',
      },
      missing_import: {
        description: 'Add the missing import statement',
        code: "import { name } from 'module';",
        time: '< 1 minute',
      },
      async_timing: {
        description: 'Add await before the async call',
        code: 'const result = await asyncFunction();',
        time: '1-2 minutes',
      },
      missing_catch: {
        description: 'Add error handling to the Promise',
        code: 'promise.catch(error => handleError(error));',
        time: '1-2 minutes',
      },
      cors_issue: {
        description: 'Configure CORS on the server or use a proxy',
        code: '// Server: res.setHeader("Access-Control-Allow-Origin", "*")',
        time: '5-10 minutes',
      },
    };

    return fixes[rootCause.cause] || {
      description: 'Review the error and fix the underlying issue',
      code: '// Manual fix required',
      time: 'Varies',
    };
  }

  generateRobustFix(rootCause, graph) {
    const robustFixes = {
      null_reference: {
        description: 'Use optional chaining and nullish coalescing',
        code: 'const value = obj?.property ?? defaultValue;',
        benefits: ['Handles null and undefined', 'Cleaner syntax', 'Prevents future errors'],
      },
      async_timing: {
        description: 'Use async/await with proper error handling',
        code: `try {
  const result = await asyncFunction();
} catch (error) {
  handleError(error);
}`,
        benefits: ['Clear control flow', 'Proper error handling', 'Easier debugging'],
      },
      missing_catch: {
        description: 'Implement comprehensive error handling',
        code: `async function safeOperation() {
  try {
    return await riskyOperation();
  } catch (error) {
    logger.error('Operation failed:', error);
    throw new CustomError('Operation failed', { cause: error });
  }
}`,
        benefits: ['Centralized error handling', 'Better error messages', 'Logging'],
      },
    };

    return robustFixes[rootCause.cause] || {
      description: 'Implement proper error handling and validation',
      benefits: ['More resilient code', 'Better user experience'],
    };
  }

  generatePreventiveFix(rootCause, graph) {
    const preventiveFixes = {
      null_reference: {
        description: 'Add TypeScript or runtime type checking',
        suggestions: [
          'Use TypeScript strict mode',
          'Add runtime validation with Zod or Yup',
          'Use ESLint rules for null checks',
        ],
      },
      async_timing: {
        description: 'Establish async patterns and conventions',
        suggestions: [
          'Always use async/await over .then()',
          'Add ESLint rule for unhandled promises',
          'Use Promise.allSettled for multiple promises',
        ],
      },
      missing_import: {
        description: 'Configure auto-import in your IDE',
        suggestions: [
          'Enable auto-import in VS Code/IDE',
          'Use absolute imports with path aliases',
          'Add import sorting with ESLint',
        ],
      },
    };

    return preventiveFixes[rootCause.cause] || {
      description: 'Add tests and validation to prevent similar issues',
      suggestions: ['Add unit tests', 'Add integration tests', 'Use static analysis'],
    };
  }

  generateSteps(rootCause, graph, context) {
    return [
      {
        step: 1,
        action: 'UNDERSTAND',
        description: `Understand the error: ${rootCause.description}`,
        details: `The error occurred because ${rootCause.description.toLowerCase()}. ${rootCause.evidence?.join('. ') || ''}`,
      },
      {
        step: 2,
        action: 'LOCATE',
        description: 'Find the exact location of the issue',
        details: graph.symptom.stack?.[0] 
          ? `Check ${graph.symptom.stack[0].file}:${graph.symptom.stack[0].line}`
          : 'Review the stack trace to find the error location',
      },
      {
        step: 3,
        action: 'FIX',
        description: 'Apply the fix',
        details: this.generateImmediateFix(rootCause, graph).description,
      },
      {
        step: 4,
        action: 'VERIFY',
        description: 'Test the fix',
        details: 'Run the code again to verify the error is resolved. Check related functionality.',
      },
      {
        step: 5,
        action: 'PREVENT',
        description: 'Prevent future occurrences',
        details: this.generatePreventiveFix(rootCause, graph).description,
      },
    ];
  }

  estimateTime(rootCause) {
    const times = {
      null_reference: '1-5 minutes',
      undefined_variable: '1-2 minutes',
      missing_import: '< 1 minute',
      typo: '< 1 minute',
      async_timing: '5-15 minutes',
      missing_catch: '2-5 minutes',
      cors_issue: '10-30 minutes',
      scope_issue: '5-15 minutes',
    };
    return times[rootCause.cause] || '5-30 minutes';
  }

  assessDifficulty(rootCause) {
    const difficulties = {
      null_reference: FIX_DIFFICULTY.EASY,
      undefined_variable: FIX_DIFFICULTY.TRIVIAL,
      missing_import: FIX_DIFFICULTY.TRIVIAL,
      typo: FIX_DIFFICULTY.TRIVIAL,
      async_timing: FIX_DIFFICULTY.MODERATE,
      missing_catch: FIX_DIFFICULTY.EASY,
      cors_issue: FIX_DIFFICULTY.MODERATE,
      scope_issue: FIX_DIFFICULTY.MODERATE,
      wrong_type: FIX_DIFFICULTY.EASY,
    };
    return difficulties[rootCause.cause] || FIX_DIFFICULTY.MODERATE;
  }

  identifySideEffects(rootCause, context) {
    const sideEffects = [];
    
    if (rootCause.cause === 'null_reference') {
      sideEffects.push('Adding null checks may change control flow');
    }
    if (rootCause.cause === 'async_timing') {
      sideEffects.push('Changing async patterns may affect performance');
    }
    if (context.hasTests) {
      sideEffects.push('Existing tests may need updates');
    }

    return sideEffects;
  }
}

/**
 * Elite Error Message Generator - Creates helpful error messages
 */
class EliteErrorMessageGenerator {
  generateMessage(error, rootCause, fixPath) {
    const icon = this.getIcon(rootCause.cause);
    const category = this.getCategory(rootCause.cause);
    
    return {
      header: `${icon} ${category}: ${this.getShortDescription(rootCause)}`,
      body: this.formatBody(error, rootCause, fixPath),
      quickFixes: this.getQuickFixes(rootCause, fixPath),
      learnMore: this.getLearnMoreLinks(rootCause),
    };
  }

  getIcon(cause) {
    const icons = {
      null_reference: '🔍',
      undefined_variable: '❓',
      missing_import: '📦',
      typo: '✏️',
      async_timing: '⏱️',
      missing_catch: '🎣',
      cors_issue: '🌐',
      scope_issue: '🔒',
      wrong_type: '🧩',
    };
    return icons[cause] || '🔥';
  }

  getCategory(cause) {
    const categories = {
      null_reference: 'NULL REFERENCE',
      undefined_variable: 'UNDEFINED',
      missing_import: 'MISSING IMPORT',
      typo: 'TYPO',
      async_timing: 'ASYNC ISSUE',
      missing_catch: 'UNHANDLED PROMISE',
      cors_issue: 'CORS ERROR',
      scope_issue: 'SCOPE ERROR',
      wrong_type: 'TYPE MISMATCH',
    };
    return categories[cause] || 'ERROR';
  }

  getShortDescription(rootCause) {
    const descriptions = {
      null_reference: 'Accessing property of null/undefined',
      undefined_variable: 'Variable used before definition',
      missing_import: 'Module not imported',
      typo: 'Spelling mistake in identifier',
      async_timing: 'Async operation timing issue',
      missing_catch: 'Promise rejection not handled',
      cors_issue: 'Cross-origin request blocked',
      scope_issue: 'Variable out of scope',
      wrong_type: 'Unexpected value type',
    };
    return descriptions[rootCause.cause] || rootCause.description;
  }

  formatBody(error, rootCause, fixPath) {
    return `
${this.formatSection('ROOT CAUSE', rootCause.description)}

${this.formatSection('EXPLANATION', this.getExplanation(rootCause))}

${this.formatSection('HOW TO FIX', fixPath.immediate.description)}

${this.formatSection('EXAMPLE', fixPath.immediate.code)}

${this.formatSection('ESTIMATED TIME', fixPath.estimatedTime)}
`.trim();
  }

  formatSection(title, content) {
    return `📌 ${title}:\n   ${content}`;
  }

  getExplanation(rootCause) {
    const explanations = {
      null_reference: 'You tried to access a property or method on a value that is null or undefined. This usually happens when data hasn\'t loaded yet, a function returned null, or an object path is incorrect.',
      undefined_variable: 'You\'re using a variable that hasn\'t been declared or is out of scope. Check if you\'ve imported it, spelled it correctly, or if it\'s accessible from this location.',
      async_timing: 'An asynchronous operation completed in an unexpected order. This often happens when you forget to await a Promise or when multiple async operations race.',
      missing_catch: 'A Promise was rejected but there\'s no error handler. Always add .catch() or use try/catch with await to handle potential failures.',
    };
    return explanations[rootCause.cause] || 'Review the error details and stack trace to understand what went wrong.';
  }

  getQuickFixes(rootCause, fixPath) {
    const fixes = [];
    
    fixes.push({
      label: '🔧 Quick Fix',
      action: fixPath.immediate.description,
    });
    
    fixes.push({
      label: '🛡️ Robust Fix',
      action: fixPath.robust.description,
    });

    return fixes;
  }

  getLearnMoreLinks(rootCause) {
    const links = {
      null_reference: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
      async_timing: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises',
      missing_catch: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch',
    };
    return links[rootCause.cause] || 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors';
  }
}


/**
 * Main Why-First Debugging Engine
 */
export class DebuggingEngine {
  constructor() {
    this.causalGraphBuilder = new CausalGraphBuilder();
    this.rootCauseAnalyzer = new RootCauseAnalyzer();
    this.fixPathGenerator = new FixPathGenerator();
    this.errorMessageGenerator = new EliteErrorMessageGenerator();
    this.errorHistory = [];
    this.fixHistory = [];
  }

  /**
   * Analyze an error and explain why it happened
   */
  async explainError(error, context = {}) {
    const startTime = Date.now();

    // 1. Build causal graph
    const causalGraph = this.causalGraphBuilder.buildGraph(error, context);

    // 2. Find root cause
    const rootCause = this.rootCauseAnalyzer.analyze(causalGraph);

    // 3. Generate fix path
    const fixPath = this.fixPathGenerator.generateFixPath(rootCause, causalGraph, context);

    // 4. Generate elite error message
    const message = this.errorMessageGenerator.generateMessage(error, rootCause, fixPath);

    const result = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      causalGraph,
      rootCause,
      fixPath,
      message,
      confidence: rootCause.confidence,
      analysisTime: Date.now() - startTime,
      timestamp: Date.now(),
    };

    // Store in history
    this.errorHistory.push(result);
    if (this.errorHistory.length > 50) {
      this.errorHistory.shift();
    }

    return result;
  }

  /**
   * Get a quick explanation for an error
   */
  quickExplain(error) {
    const pattern = this.causalGraphBuilder.matchPattern(error.message);
    
    if (!pattern) {
      return {
        summary: 'Unknown error - review stack trace',
        category: ERROR_CATEGORIES.RUNTIME,
        quickFix: 'Check the error message and stack trace for clues',
      };
    }

    return {
      summary: pattern.causes[0].replace(/_/g, ' '),
      category: pattern.category,
      quickFix: pattern.commonFixes[0],
    };
  }

  /**
   * Record that a fix was applied
   */
  recordFix(errorId, fixApplied, success) {
    this.fixHistory.push({
      errorId,
      fixApplied,
      success,
      timestamp: Date.now(),
    });

    // Learn from successful fixes
    if (success) {
      // Could be used to improve fix suggestions
    }
  }

  /**
   * Get common errors for this project
   */
  getCommonErrors(limit = 5) {
    const errorCounts = {};
    
    for (const error of this.errorHistory) {
      const key = error.rootCause.cause;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    }

    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([cause, count]) => ({ cause, count }));
  }

  /**
   * Get fix success rate
   */
  getFixSuccessRate() {
    if (this.fixHistory.length === 0) return 0;
    const successful = this.fixHistory.filter(f => f.success).length;
    return successful / this.fixHistory.length;
  }

  /**
   * Format error explanation for display
   */
  formatExplanation(result) {
    const lines = [];
    
    lines.push('\n🔥 ERROR ANALYSIS');
    lines.push('═'.repeat(60));
    
    // Header
    lines.push(`\n${result.message.header}`);
    lines.push('─'.repeat(60));
    
    // Root cause
    lines.push(`\n❗ ROOT CAUSE:`);
    lines.push(`   ${result.rootCause.description}`);
    lines.push(`   Confidence: ${(result.rootCause.confidence * 100).toFixed(0)}%`);
    
    // Evidence
    if (result.rootCause.evidence?.length > 0) {
      lines.push(`\n📋 EVIDENCE:`);
      for (const evidence of result.rootCause.evidence) {
        lines.push(`   • ${evidence}`);
      }
    }
    
    // Causal chain
    lines.push(`\n🔗 CHAIN OF EVENTS:`);
    for (const step of result.causalGraph.chain) {
      lines.push(`   ${step.step}. ${step.description}`);
    }
    
    // Fix path
    lines.push(`\n🛠️ HOW TO FIX:`);
    lines.push(`\n   Immediate fix (${result.fixPath.estimatedTime}):`);
    lines.push(`   ${result.fixPath.immediate.description}`);
    if (result.fixPath.immediate.code) {
      lines.push(`\n   ${result.fixPath.immediate.code}`);
    }
    
    lines.push(`\n   Robust fix:`);
    lines.push(`   ${result.fixPath.robust.description}`);
    
    // Steps
    lines.push(`\n🚀 FIX PATH:`);
    for (const step of result.fixPath.steps) {
      lines.push(`   Step ${step.step}: ${step.action} - ${step.description}`);
    }
    
    // Side effects
    if (result.fixPath.sideEffects?.length > 0) {
      lines.push(`\n⚠️ WATCH OUT FOR:`);
      for (const effect of result.fixPath.sideEffects) {
        lines.push(`   • ${effect}`);
      }
    }
    
    // Prevention
    lines.push(`\n🛡️ PREVENT FUTURE OCCURRENCES:`);
    lines.push(`   ${result.fixPath.preventive.description}`);
    if (result.fixPath.preventive.suggestions) {
      for (const suggestion of result.fixPath.preventive.suggestions) {
        lines.push(`   • ${suggestion}`);
      }
    }
    
    lines.push('\n' + '═'.repeat(60));
    
    return lines.join('\n');
  }

  /**
   * Get a concise error summary
   */
  getErrorSummary(result) {
    return {
      cause: result.rootCause.cause,
      description: result.rootCause.description,
      quickFix: result.fixPath.immediate.description,
      difficulty: result.fixPath.difficulty,
      time: result.fixPath.estimatedTime,
    };
  }
}

// Export helper classes (constants are already exported inline at the top)
export {
  CausalGraphBuilder,
  RootCauseAnalyzer,
  FixPathGenerator,
  EliteErrorMessageGenerator,
};

export default DebuggingEngine;
