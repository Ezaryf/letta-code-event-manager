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
 */

export { CognitiveEngine, default } from './cognitiveEngine.js';

export {
  IntentAwarenessEngine,
  INTENTS,
  INTENT_UI_CONFIG,
} from './intentEngine.js';

export {
  PredictiveAssistanceEngine,
  RISK_LEVELS,
  PREDICTION_TYPES,
} from './predictiveEngine.js';

export {
  FlowOptimizer,
  FLOW_STATES,
  COGNITIVE_LOAD,
  INTERVENTIONS,
} from './flowOptimizer.js';
