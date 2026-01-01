/**
 * 🧱 PILLAR 3: Self-Explaining Code System
 * 
 * Creates living documentation that explains code in real-time.
 * Generates contextual explanations at multiple depth levels.
 */

// Explanation depth levels
export const EXPLANATION_DEPTH = {
  SURFACE: 'SURFACE',     // What it does
  DEEP: 'DEEP',           // How it works
  CONTEXT: 'CONTEXT',     // Why it exists
  ALTERNATIVES: 'ALTERNATIVES', // What could be different
  HISTORY: 'HISTORY',     // How it evolved
};

// Code element types
export const CODE_ELEMENTS = {
  FUNCTION: 'FUNCTION',
  CLASS: 'CLASS',
  VARIABLE: 'VARIABLE',
  IMPORT: 'IMPORT',
  EXPRESSION: 'EXPRESSION',
  BLOCK: 'BLOCK',
  COMMENT: 'COMMENT',
};

/**
 * Semantic Unit Extractor - Parses code into meaningful units
 */
class SemanticExtractor {
  constructor() {
    this.patterns = {
      function: /(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>))/g,
      class: /class\s+(\w+)(?:\s+extends\s+(\w+))?/g,
      method: /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g,
      variable: /(?:const|let|var)\s+(\w+)\s*=/g,
      import: /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g,
      export: /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)/g,
    };
  }

  extractUnits(code) {
    const units = [];
    const lines = code.split('\n');

    // Extract functions
    for (const match of code.matchAll(this.patterns.function)) {
      const name = match[1] || match[2];
      const startLine = this.getLineNumber(code, match.index);
      const body = this.extractFunctionBody(code, match.index);
      
      units.push({
        type: CODE_ELEMENTS.FUNCTION,
        name,
        startLine,
        endLine: startLine + body.split('\n').length - 1,
        body,
        isAsync: match[0].includes('async'),
        parameters: this.extractParameters(match[0]),
      });
    }

    // Extract classes
    for (const match of code.matchAll(this.patterns.class)) {
      const name = match[1];
      const extends_ = match[2];
      const startLine = this.getLineNumber(code, match.index);
      const body = this.extractClassBody(code, match.index);
      
      units.push({
        type: CODE_ELEMENTS.CLASS,
        name,
        extends: extends_,
        startLine,
        endLine: startLine + body.split('\n').length - 1,
        body,
        methods: this.extractMethods(body),
      });
    }

    // Extract imports
    for (const match of code.matchAll(this.patterns.import)) {
      const imports = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
      const source = match[3];
      
      units.push({
        type: CODE_ELEMENTS.IMPORT,
        imports,
        source,
        startLine: this.getLineNumber(code, match.index),
      });
    }

    return units;
  }

  getLineNumber(code, index) {
    return code.slice(0, index).split('\n').length;
  }

  extractFunctionBody(code, startIndex) {
    let braceCount = 0;
    let started = false;
    let body = '';
    
    for (let i = startIndex; i < code.length; i++) {
      const char = code[i];
      if (char === '{') {
        started = true;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }
      
      if (started) {
        body += char;
        if (braceCount === 0) break;
      }
    }
    
    return body;
  }

  extractClassBody(code, startIndex) {
    return this.extractFunctionBody(code, startIndex);
  }

  extractParameters(funcDeclaration) {
    const match = funcDeclaration.match(/\(([^)]*)\)/);
    if (!match) return [];
    return match[1].split(',').map(p => p.trim()).filter(p => p);
  }

  extractMethods(classBody) {
    const methods = [];
    for (const match of classBody.matchAll(this.patterns.method)) {
      methods.push(match[1]);
    }
    return methods;
  }
}

/**
 * Purpose Inferrer - Determines what code is meant to do
 */
class PurposeInferrer {
  constructor() {
    this.purposePatterns = {
      validation: /\b(valid|check|verify|assert|ensure|is[A-Z]|has[A-Z])\w*/i,
      transformation: /\b(transform|convert|map|parse|format|serialize|deserialize)\w*/i,
      fetching: /\b(fetch|get|load|retrieve|request|query|find)\w*/i,
      mutation: /\b(set|update|modify|change|mutate|add|remove|delete|create)\w*/i,
      calculation: /\b(calc|compute|sum|count|average|total|measure)\w*/i,
      filtering: /\b(filter|select|exclude|include|search|match)\w*/i,
      sorting: /\b(sort|order|rank|arrange|compare)\w*/i,
      initialization: /\b(init|setup|configure|bootstrap|start|begin)\w*/i,
      cleanup: /\b(cleanup|dispose|destroy|close|end|finish|teardown)\w*/i,
      eventHandling: /\b(on[A-Z]|handle|listen|emit|trigger|dispatch)\w*/i,
      errorHandling: /\b(catch|error|exception|throw|fail|retry)\w*/i,
      logging: /\b(log|debug|trace|info|warn|error|print)\w*/i,
    };
  }

  inferPurpose(unit) {
    const name = unit.name || '';
    const body = unit.body || '';
    const combined = `${name} ${body}`;

    const purposes = [];
    for (const [purpose, pattern] of Object.entries(this.purposePatterns)) {
      if (pattern.test(combined)) {
        purposes.push(purpose);
      }
    }

    // Analyze return statements
    const returns = this.analyzeReturns(body);
    
    // Analyze side effects
    const sideEffects = this.analyzeSideEffects(body);

    return {
      primary: purposes[0] || 'general',
      secondary: purposes.slice(1),
      returns,
      sideEffects,
      confidence: purposes.length > 0 ? 0.8 : 0.5,
    };
  }

  analyzeReturns(body) {
    const returnStatements = body.match(/return\s+([^;]+)/g) || [];
    return {
      hasReturn: returnStatements.length > 0,
      returnsPromise: /return\s+(?:new\s+Promise|await|fetch)/.test(body),
      returnsBoolean: /return\s+(?:true|false|!|===|!==|>|<)/.test(body),
      returnsObject: /return\s+\{/.test(body),
      returnsArray: /return\s+\[/.test(body),
    };
  }

  analyzeSideEffects(body) {
    return {
      modifiesDOM: /document\.|innerHTML|appendChild|removeChild/.test(body),
      modifiesState: /this\.\w+\s*=|setState|dispatch/.test(body),
      makesNetworkCall: /fetch|axios|http|request/.test(body),
      writesToStorage: /localStorage|sessionStorage|cookie/.test(body),
      logsOutput: /console\.|log\(|debug\(/.test(body),
    };
  }
}

/**
 * NLP Generator - Creates human-readable explanations
 */
class NLPGenerator {
  generateExplanation(unit, purpose, depth = EXPLANATION_DEPTH.SURFACE) {
    switch (depth) {
      case EXPLANATION_DEPTH.SURFACE:
        return this.generateSurfaceExplanation(unit, purpose);
      case EXPLANATION_DEPTH.DEEP:
        return this.generateDeepExplanation(unit, purpose);
      case EXPLANATION_DEPTH.CONTEXT:
        return this.generateContextExplanation(unit, purpose);
      case EXPLANATION_DEPTH.ALTERNATIVES:
        return this.generateAlternativesExplanation(unit, purpose);
      default:
        return this.generateSurfaceExplanation(unit, purpose);
    }
  }

  generateSurfaceExplanation(unit, purpose) {
    const typeLabel = this.getTypeLabel(unit.type);
    const purposeDesc = this.getPurposeDescription(purpose.primary);
    const asyncLabel = unit.isAsync ? 'asynchronous ' : '';
    
    let explanation = `This ${asyncLabel}${typeLabel} "${unit.name}" ${purposeDesc}.`;
    
    if (unit.parameters?.length > 0) {
      explanation += ` It takes ${unit.parameters.length} parameter(s): ${unit.parameters.join(', ')}.`;
    }
    
    if (purpose.returns.hasReturn) {
      explanation += ` ${this.describeReturn(purpose.returns)}`;
    }
    
    if (Object.values(purpose.sideEffects).some(v => v)) {
      explanation += ` ${this.describeSideEffects(purpose.sideEffects)}`;
    }

    return {
      summary: explanation,
      purpose: purpose.primary,
      confidence: purpose.confidence,
    };
  }

  generateDeepExplanation(unit, purpose) {
    const surface = this.generateSurfaceExplanation(unit, purpose);
    const body = unit.body || '';
    
    const details = {
      ...surface,
      complexity: this.analyzeComplexity(body),
      controlFlow: this.analyzeControlFlow(body),
      dependencies: this.analyzeDependencies(body),
      patterns: this.identifyPatterns(body),
    };

    details.technicalSummary = this.generateTechnicalSummary(details);
    return details;
  }

  generateContextExplanation(unit, purpose) {
    const surface = this.generateSurfaceExplanation(unit, purpose);
    
    return {
      ...surface,
      whyItExists: this.inferWhyItExists(unit, purpose),
      useCases: this.inferUseCases(unit, purpose),
      relatedConcepts: this.findRelatedConcepts(unit),
    };
  }

  generateAlternativesExplanation(unit, purpose) {
    return {
      currentApproach: this.describeCurrentApproach(unit, purpose),
      alternatives: this.suggestAlternatives(unit, purpose),
      tradeoffs: this.analyzeTradeoffs(unit, purpose),
    };
  }

  getTypeLabel(type) {
    const labels = {
      [CODE_ELEMENTS.FUNCTION]: 'function',
      [CODE_ELEMENTS.CLASS]: 'class',
      [CODE_ELEMENTS.VARIABLE]: 'variable',
      [CODE_ELEMENTS.IMPORT]: 'import',
      [CODE_ELEMENTS.METHOD]: 'method',
    };
    return labels[type] || 'code element';
  }

  getPurposeDescription(purpose) {
    const descriptions = {
      validation: 'validates data or checks conditions',
      transformation: 'transforms or converts data',
      fetching: 'retrieves or fetches data',
      mutation: 'modifies or updates state',
      calculation: 'performs calculations',
      filtering: 'filters or selects data',
      sorting: 'sorts or orders data',
      initialization: 'initializes or sets up',
      cleanup: 'cleans up or disposes resources',
      eventHandling: 'handles events',
      errorHandling: 'handles errors',
      logging: 'logs information',
      general: 'performs a general operation',
    };
    return descriptions[purpose] || 'performs an operation';
  }

  describeReturn(returns) {
    if (returns.returnsPromise) return 'It returns a Promise.';
    if (returns.returnsBoolean) return 'It returns a boolean value.';
    if (returns.returnsObject) return 'It returns an object.';
    if (returns.returnsArray) return 'It returns an array.';
    return 'It returns a value.';
  }

  describeSideEffects(sideEffects) {
    const effects = [];
    if (sideEffects.modifiesDOM) effects.push('modifies the DOM');
    if (sideEffects.modifiesState) effects.push('modifies state');
    if (sideEffects.makesNetworkCall) effects.push('makes network calls');
    if (sideEffects.writesToStorage) effects.push('writes to storage');
    if (sideEffects.logsOutput) effects.push('logs output');
    
    if (effects.length === 0) return '';
    return `Side effects: ${effects.join(', ')}.`;
  }

  analyzeComplexity(body) {
    const conditions = (body.match(/\b(if|else|switch|case|\?|&&|\|\|)\b/g) || []).length;
    const loops = (body.match(/\b(for|while|do)\b/g) || []).length;
    const lines = body.split('\n').length;
    
    let level = 'low';
    if (conditions > 5 || loops > 3 || lines > 50) level = 'high';
    else if (conditions > 2 || loops > 1 || lines > 20) level = 'medium';
    
    return { level, conditions, loops, lines };
  }

  analyzeControlFlow(body) {
    return {
      hasConditionals: /\b(if|switch)\b/.test(body),
      hasLoops: /\b(for|while|do)\b/.test(body),
      hasEarlyReturn: /return\s+[^;]+;\s*\n\s*\S/.test(body),
      hasTryCatch: /\btry\s*\{/.test(body),
      hasAsync: /\b(async|await)\b/.test(body),
    };
  }

  analyzeDependencies(body) {
    const deps = [];
    const matches = body.matchAll(/\b(\w+)\s*\(/g);
    for (const match of matches) {
      if (!['if', 'for', 'while', 'switch', 'function', 'return'].includes(match[1])) {
        deps.push(match[1]);
      }
    }
    return [...new Set(deps)];
  }

  identifyPatterns(body) {
    const patterns = [];
    if (/\.map\(.*\)\.filter\(/.test(body)) patterns.push('chain-filter-map');
    if (/\.reduce\(/.test(body)) patterns.push('reduce');
    if (/Promise\.all\(/.test(body)) patterns.push('parallel-promises');
    if (/async.*await/.test(body)) patterns.push('async-await');
    if (/\?\?/.test(body)) patterns.push('nullish-coalescing');
    if (/\?\./.test(body)) patterns.push('optional-chaining');
    if (/\.\.\./.test(body)) patterns.push('spread-operator');
    return patterns;
  }

  generateTechnicalSummary(details) {
    const parts = [];
    parts.push(`Complexity: ${details.complexity.level}`);
    if (details.controlFlow.hasAsync) parts.push('Uses async/await');
    if (details.controlFlow.hasTryCatch) parts.push('Has error handling');
    if (details.patterns.length > 0) parts.push(`Patterns: ${details.patterns.join(', ')}`);
    return parts.join(' | ');
  }

  inferWhyItExists(unit, purpose) {
    const reasons = {
      validation: 'To ensure data integrity and prevent invalid states',
      transformation: 'To convert data between different formats or structures',
      fetching: 'To retrieve data from external sources or storage',
      mutation: 'To update application state in response to user actions or events',
      calculation: 'To compute derived values from existing data',
      filtering: 'To select relevant data from a larger dataset',
      initialization: 'To set up initial state and configuration',
      cleanup: 'To release resources and prevent memory leaks',
      eventHandling: 'To respond to user interactions or system events',
      errorHandling: 'To gracefully handle failures and provide recovery',
    };
    return reasons[purpose.primary] || 'To encapsulate a specific piece of functionality';
  }

  inferUseCases(unit, purpose) {
    const useCases = [];
    if (purpose.primary === 'validation') {
      useCases.push('Form input validation', 'API request validation', 'Data integrity checks');
    } else if (purpose.primary === 'fetching') {
      useCases.push('Loading data on component mount', 'Refreshing data', 'Search queries');
    } else if (purpose.primary === 'mutation') {
      useCases.push('User form submissions', 'State updates', 'CRUD operations');
    }
    return useCases;
  }

  findRelatedConcepts(unit) {
    const concepts = [];
    if (unit.isAsync) concepts.push('Promises', 'Async/Await', 'Event Loop');
    if (unit.type === CODE_ELEMENTS.CLASS) concepts.push('OOP', 'Inheritance', 'Encapsulation');
    return concepts;
  }

  describeCurrentApproach(unit, purpose) {
    return `Currently uses ${unit.isAsync ? 'async/await' : 'synchronous'} approach for ${purpose.primary}`;
  }

  suggestAlternatives(unit, purpose) {
    const alternatives = [];
    if (purpose.primary === 'fetching' && !unit.isAsync) {
      alternatives.push({ approach: 'Use async/await', benefit: 'Cleaner error handling' });
    }
    if (purpose.primary === 'transformation') {
      alternatives.push({ approach: 'Use functional composition', benefit: 'More reusable' });
    }
    return alternatives;
  }

  analyzeTradeoffs(unit, purpose) {
    return {
      performance: unit.isAsync ? 'Non-blocking but adds overhead' : 'Blocking but simpler',
      readability: purpose.confidence > 0.7 ? 'Good naming conventions' : 'Could be clearer',
      maintainability: 'Depends on test coverage and documentation',
    };
  }
}


/**
 * Main Self-Explaining Code Engine
 */
export class ExplanationEngine {
  constructor() {
    this.semanticExtractor = new SemanticExtractor();
    this.purposeInferrer = new PurposeInferrer();
    this.nlpGenerator = new NLPGenerator();
    this.explanationCache = new Map();
    this.cacheMaxSize = 100;
  }

  /**
   * Generate explanation for code
   */
  async explainCode(code, options = {}) {
    const depth = options.depth || EXPLANATION_DEPTH.SURFACE;
    const position = options.position; // Optional: specific line/column
    
    // Check cache
    const cacheKey = `${code.slice(0, 100)}_${depth}`;
    if (this.explanationCache.has(cacheKey)) {
      return this.explanationCache.get(cacheKey);
    }

    // Extract semantic units
    const units = this.semanticExtractor.extractUnits(code);

    // If position specified, find the relevant unit
    let targetUnits = units;
    if (position) {
      targetUnits = units.filter(u => 
        u.startLine <= position.line && u.endLine >= position.line
      );
    }

    // Generate explanations for each unit
    const explanations = targetUnits.map(unit => {
      const purpose = this.purposeInferrer.inferPurpose(unit);
      const explanation = this.nlpGenerator.generateExplanation(unit, purpose, depth);
      
      return {
        unit: {
          type: unit.type,
          name: unit.name,
          startLine: unit.startLine,
          endLine: unit.endLine,
        },
        explanation,
        purpose,
      };
    });

    // Generate overview
    const overview = this.generateOverview(explanations, code);

    const result = {
      overview,
      explanations,
      depth,
      timestamp: Date.now(),
    };

    // Cache result
    this.cacheResult(cacheKey, result);

    return result;
  }

  /**
   * Generate inline explanations for IDE hover
   */
  async generateInlineExplanation(code, position) {
    const units = this.semanticExtractor.extractUnits(code);
    
    // Find unit at position
    const unit = units.find(u => 
      u.startLine <= position.line && u.endLine >= position.line
    );

    if (!unit) {
      return { explanation: 'No code element found at this position' };
    }

    const purpose = this.purposeInferrer.inferPurpose(unit);
    const explanation = this.nlpGenerator.generateExplanation(unit, purpose, EXPLANATION_DEPTH.SURFACE);

    return {
      unit: unit.name,
      type: unit.type,
      explanation: explanation.summary,
      purpose: purpose.primary,
      quickInfo: this.generateQuickInfo(unit, purpose),
    };
  }

  /**
   * Generate quick info for hover tooltip
   */
  generateQuickInfo(unit, purpose) {
    const info = [];
    
    info.push(`📝 ${unit.type}: ${unit.name}`);
    info.push(`🎯 Purpose: ${purpose.primary}`);
    
    if (unit.parameters?.length > 0) {
      info.push(`📥 Params: ${unit.parameters.join(', ')}`);
    }
    
    if (unit.isAsync) {
      info.push('⚡ Async');
    }
    
    if (purpose.returns.hasReturn) {
      const returnType = purpose.returns.returnsPromise ? 'Promise' :
                        purpose.returns.returnsBoolean ? 'boolean' :
                        purpose.returns.returnsObject ? 'object' :
                        purpose.returns.returnsArray ? 'array' : 'value';
      info.push(`📤 Returns: ${returnType}`);
    }

    return info.join(' | ');
  }

  /**
   * Generate overview of code file
   */
  generateOverview(explanations, code) {
    const functions = explanations.filter(e => e.unit.type === CODE_ELEMENTS.FUNCTION);
    const classes = explanations.filter(e => e.unit.type === CODE_ELEMENTS.CLASS);
    const imports = explanations.filter(e => e.unit.type === CODE_ELEMENTS.IMPORT);

    const lines = code.split('\n').length;
    const purposes = [...new Set(explanations.map(e => e.purpose.primary))];

    return {
      summary: this.generateFileSummary(functions, classes, purposes),
      stats: {
        lines,
        functions: functions.length,
        classes: classes.length,
        imports: imports.length,
      },
      mainPurposes: purposes,
      complexity: this.assessOverallComplexity(code),
    };
  }

  /**
   * Generate file summary
   */
  generateFileSummary(functions, classes, purposes) {
    const parts = [];
    
    if (classes.length > 0) {
      parts.push(`Defines ${classes.length} class(es): ${classes.map(c => c.unit.name).join(', ')}`);
    }
    
    if (functions.length > 0) {
      parts.push(`Contains ${functions.length} function(s)`);
    }
    
    if (purposes.length > 0) {
      parts.push(`Main purposes: ${purposes.slice(0, 3).join(', ')}`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Assess overall complexity
   */
  assessOverallComplexity(code) {
    const lines = code.split('\n').length;
    const conditions = (code.match(/\b(if|else|switch|case|\?|&&|\|\|)\b/g) || []).length;
    const loops = (code.match(/\b(for|while|do)\b/g) || []).length;
    const functions = (code.match(/\b(function|=>)\b/g) || []).length;

    // Calculate complexity score with adjusted weights
    const score = (lines / 50) + (conditions / 5) + (loops / 2) + (functions / 5);
    
    if (score > 3) return { level: 'high', score, recommendation: 'Consider breaking into smaller modules' };
    if (score > 1) return { level: 'medium', score, recommendation: 'Complexity is manageable' };
    return { level: 'low', score, recommendation: 'Code is well-structured' };
  }

  /**
   * Cache management
   */
  cacheResult(key, result) {
    if (this.explanationCache.size >= this.cacheMaxSize) {
      const firstKey = this.explanationCache.keys().next().value;
      this.explanationCache.delete(firstKey);
    }
    this.explanationCache.set(key, result);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.explanationCache.clear();
  }

  /**
   * Format explanation for display
   */
  formatExplanation(result) {
    const lines = [];
    
    lines.push('\n📖 CODE EXPLANATION');
    lines.push('═'.repeat(50));
    
    // Overview
    lines.push(`\n📋 Overview: ${result.overview.summary}`);
    lines.push(`   Lines: ${result.overview.stats.lines} | Functions: ${result.overview.stats.functions} | Classes: ${result.overview.stats.classes}`);
    lines.push(`   Complexity: ${result.overview.complexity.level} - ${result.overview.complexity.recommendation}`);
    
    // Individual explanations
    if (result.explanations.length > 0) {
      lines.push('\n📝 Details:');
      for (const exp of result.explanations.slice(0, 5)) {
        lines.push(`\n   ${exp.unit.type}: ${exp.unit.name} (lines ${exp.unit.startLine}-${exp.unit.endLine})`);
        lines.push(`   ${exp.explanation.summary}`);
      }
      
      if (result.explanations.length > 5) {
        lines.push(`\n   ... and ${result.explanations.length - 5} more elements`);
      }
    }
    
    lines.push('\n' + '═'.repeat(50));
    
    return lines.join('\n');
  }
}

export default ExplanationEngine;
