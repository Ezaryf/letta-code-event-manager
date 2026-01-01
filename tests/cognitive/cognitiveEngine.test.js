/**
 * Tests for the Cognitive Engine and its pillars
 */

import {
  CognitiveEngine,
  ExplanationEngine,
  DebuggingEngine,
  DeveloperTwin,
  INTENTS,
  FLOW_STATES,
  EXPLANATION_DEPTH,
  ERROR_CATEGORIES,
  SKILL_LEVELS,
} from '../../src/cognitive/index.js';

describe('CognitiveEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new CognitiveEngine();
  });

  test('should initialize with all pillars', () => {
    expect(engine.intentEngine).toBeDefined();
    expect(engine.predictiveEngine).toBeDefined();
    expect(engine.flowOptimizer).toBeDefined();
    expect(engine.explanationEngine).toBeDefined();
    expect(engine.debuggingEngine).toBeDefined();
    expect(engine.developerTwin).toBeDefined();
  });

  test('should start and stop correctly', () => {
    const startResult = engine.start();
    expect(startResult.started).toBe(true);
    expect(engine.isActive).toBe(true);

    const stopResult = engine.stop();
    expect(stopResult.stopped).toBe(true);
    expect(engine.isActive).toBe(false);
  });

  test('should analyze code context', async () => {
    engine.start();
    
    const result = await engine.analyze({
      activeFileContent: `
        async function fetchData() {
          const response = await fetch('/api/data');
          return response.json();
        }
      `,
      activeFile: 'test.js',
    });

    expect(result.timestamp).toBeDefined();
    expect(result.intent).toBeDefined();
    expect(result.flow).toBeDefined();
  });

  test('should enter focus mode', () => {
    const result = engine.enterFocusMode(25 * 60 * 1000);
    expect(result.focusModeActive).toBe(true);
    expect(result.duration).toBe(25 * 60 * 1000);
  });
});

describe('ExplanationEngine (Pillar 3)', () => {
  let engine;

  beforeEach(() => {
    engine = new ExplanationEngine();
  });

  test('should explain code at surface level', async () => {
    const code = `
      function calculateTotal(items) {
        return items.reduce((sum, item) => sum + item.price, 0);
      }
    `;

    const result = await engine.explainCode(code, { depth: EXPLANATION_DEPTH.SURFACE });
    
    expect(result.overview).toBeDefined();
    expect(result.explanations).toBeDefined();
    expect(result.explanations.length).toBeGreaterThan(0);
  });

  test('should generate inline explanations', async () => {
    const code = `
      async function fetchUser(id) {
        const response = await fetch(\`/api/users/\${id}\`);
        return response.json();
      }
    `;

    const result = await engine.generateInlineExplanation(code, { line: 2 });
    
    expect(result.explanation).toBeDefined();
  });

  test('should detect function purposes', async () => {
    const code = `
      function validateEmail(email) {
        return /^[^@]+@[^@]+\\.[^@]+$/.test(email);
      }
    `;

    const result = await engine.explainCode(code);
    
    expect(result.explanations[0]?.purpose?.primary).toBe('validation');
  });

  test('should assess code complexity', async () => {
    const simpleCode = `const x = 1;`;
    const complexCode = `
      function complex(a, b, c) {
        if (a > 0) {
          for (let i = 0; i < b; i++) {
            if (c[i]) {
              switch (c[i].type) {
                case 'a': return 1;
                case 'b': return 2;
                default: return 3;
              }
            }
          }
        }
        return 0;
      }
    `;

    const simpleResult = await engine.explainCode(simpleCode);
    const complexResult = await engine.explainCode(complexCode);

    expect(simpleResult.overview.complexity.level).toBe('low');
    // Complex code should not be 'low'
    expect(complexResult.overview.complexity.level).not.toBe('low');
  });
});

describe('DebuggingEngine (Pillar 4)', () => {
  let engine;

  beforeEach(() => {
    engine = new DebuggingEngine();
  });

  test('should explain TypeError', async () => {
    const error = new TypeError("Cannot read property 'name' of undefined");
    
    const result = await engine.explainError(error);
    
    expect(result.rootCause).toBeDefined();
    expect(result.rootCause.cause).toBe('null_reference');
    expect(result.fixPath).toBeDefined();
    expect(result.fixPath.immediate).toBeDefined();
  });

  test('should explain ReferenceError', async () => {
    const error = new ReferenceError("myVariable is not defined");
    
    const result = await engine.explainError(error);
    
    expect(result.rootCause.cause).toBe('missing_import');
    expect(result.fixPath.steps.length).toBeGreaterThan(0);
  });

  test('should provide quick explanations', () => {
    const error = new Error("Cannot read properties of null");
    
    const result = engine.quickExplain(error);
    
    expect(result.summary).toBeDefined();
    expect(result.quickFix).toBeDefined();
  });

  test('should build causal chain', async () => {
    const error = new TypeError("Cannot read property 'id' of undefined");
    error.stack = `TypeError: Cannot read property 'id' of undefined
    at getUser (user.js:10:15)
    at main (index.js:5:10)`;
    
    const result = await engine.explainError(error);
    
    expect(result.causalGraph.chain.length).toBeGreaterThan(0);
    expect(result.causalGraph.symptom.stack.length).toBeGreaterThan(0);
  });

  test('should estimate fix difficulty', async () => {
    const error = new TypeError("Cannot read property 'x' of null");
    
    const result = await engine.explainError(error);
    
    expect(result.fixPath.difficulty).toBeDefined();
    expect(result.fixPath.estimatedTime).toBeDefined();
  });
});

describe('DeveloperTwin', () => {
  let twin;

  beforeEach(() => {
    twin = new DeveloperTwin('test-developer');
  });

  test('should initialize with correct id', () => {
    expect(twin.id).toBe('test-developer');
    expect(twin.version).toBe(1);
  });

  test('should observe and learn from actions', async () => {
    const result = await twin.observe({
      action: { type: 'file_edit', file: 'test.js' },
      code: { code: 'const x = 1;', file: 'test.js' },
    });

    expect(result.observed).toBe(true);
    expect(twin.totalObservations).toBe(1);
  });

  test('should predict next actions', async () => {
    // Add some observations first
    await twin.observe({ action: { type: 'file_edit' } });
    await twin.observe({ action: { type: 'file_edit' } });
    
    const predictions = await twin.predict({});
    
    expect(predictions.nextAction).toBeDefined();
    expect(predictions.likelyErrors).toBeDefined();
  });

  test('should track knowledge and skills', async () => {
    await twin.observe({
      knowledge: {
        skills: ['async-programming', 'testing'],
        technologies: ['react', 'jest'],
      },
    });

    const state = twin.getState();
    
    expect(state.knowledge.totalSkills).toBeGreaterThan(0);
  });

  test('should generate learning path', async () => {
    // Add some skill observations
    for (let i = 0; i < 5; i++) {
      await twin.observe({
        knowledge: { skills: ['javascript'] },
      });
    }

    const learningPath = twin.generateLearningPath();
    
    expect(learningPath.currentLevel).toBeDefined();
    expect(learningPath.estimatedTimeToNextLevel).toBeDefined();
  });

  test('should export and import state', async () => {
    await twin.observe({
      action: { type: 'commit' },
      knowledge: { skills: ['git'] },
    });

    const exported = twin.export();
    
    const newTwin = new DeveloperTwin('new-id');
    newTwin.import(exported);
    
    expect(newTwin.id).toBe('test-developer');
    expect(newTwin.totalObservations).toBe(1);
  });

  test('should provide optimizations', async () => {
    const optimizations = twin.getOptimizations();
    
    expect(optimizations.cognitive).toBeDefined();
    expect(optimizations.behavioral).toBeDefined();
    expect(optimizations.stylistic).toBeDefined();
    expect(optimizations.knowledge).toBeDefined();
  });

  test('should simulate task approach', async () => {
    const simulation = await twin.simulate({
      description: 'Implement user authentication',
      complexity: 'medium',
    });

    expect(simulation.understanding).toBeDefined();
    expect(simulation.approach).toBeDefined();
    expect(simulation.estimatedTime).toBeDefined();
  });
});

describe('Integration', () => {
  test('should work together as cognitive partner', async () => {
    const engine = new CognitiveEngine();
    engine.start();

    // Simulate a coding session
    const code = `
      async function processOrder(orderId) {
        const order = await fetchOrder(orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        return calculateTotal(order.items);
      }
    `;

    // Analyze the code
    const analysis = await engine.analyze({
      activeFileContent: code,
      activeFile: 'order.js',
    });

    expect(analysis.intent).toBeDefined();
    expect(analysis.predictions).toBeDefined();
    expect(analysis.flow).toBeDefined();

    // Get code explanation
    const explanation = await engine.explainCode(code);
    expect(explanation.overview).toBeDefined();

    // Simulate an error
    const error = new TypeError("Cannot read property 'items' of undefined");
    const errorExplanation = await engine.explainError(error);
    expect(errorExplanation.rootCause).toBeDefined();
    expect(errorExplanation.fixPath).toBeDefined();

    // Check twin state
    const twinState = engine.getTwinState();
    expect(twinState.totalObservations).toBeGreaterThan(0);

    engine.stop();
  });
});
