/**
 * 🧠 Letta Cognitive Engine
 * 
 * A Developer Intelligence Layer that transforms Letta from a reactive tool
 * into a cognitive partner that thinks alongside developers.
 * 
 * The Six Pillars:
 * 1. Intent Awareness Engine - Knows what you're trying to do
 * 2. Predictive Assistance Engine - Catches bugs before you write them
 * 3. Self-Explaining Code System - Living documentation
 * 4. Why-First Debugging Engine - Explains root causes
 * 5. Self-Improving System - Learns your patterns
 * 6. Flow Optimizer - Protects your deep work
 * 
 * Plus:
 * - Developer Digital Twin - A model that learns and predicts your behavior
 */

// Main engine
export { CognitiveEngine, default } from './cognitiveEngine.js';

// Pillar 1: Intent Awareness
export { IntentAwarenessEngine, INTENTS, INTENT_UI_CONFIG } from './intentEngine.js';

// Pillar 2: Predictive Assistance
export { PredictiveAssistanceEngine, RISK_LEVELS, PREDICTION_TYPES } from './predictiveEngine.js';

// Pillar 3: Self-Explaining Code
export { ExplanationEngine, EXPLANATION_DEPTH, CODE_ELEMENTS } from './explanationEngine.js';

// Pillar 4: Why-First Debugging
export { DebuggingEngine, ERROR_CATEGORIES, FIX_DIFFICULTY } from './debuggingEngine.js';

// Pillar 6: Flow Optimizer
export { FlowOptimizer, FLOW_STATES, COGNITIVE_LOAD, INTERVENTIONS } from './flowOptimizer.js';

// Developer Digital Twin
export { DeveloperTwin, LEARNING_DOMAINS, SKILL_LEVELS } from './developerTwin.js';
