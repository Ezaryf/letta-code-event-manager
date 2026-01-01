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
 * - Secure Credential Manager - Hardware-bound encryption for API keys
 * - Change Safety Protocol - Four-layer autonomy with comprehensive safety
 * - Adaptive Interface - Context-aware UI with progressive disclosure
 * - Hybrid Analysis Engine - Local-first with selective cloud enhancement
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

// Security & Architecture Components
export { SecureCredentialManager } from '../security/credentialManager.js';
export { ChangeSafetyProtocol, AUTONOMY_LEVELS, RISK_LEVELS as SAFETY_RISK_LEVELS, CHANGE_TYPES } from '../security/changeSafetyProtocol.js';
export { AdaptiveInterface, DISPLAY_MODES, NOTIFICATION_PRIORITIES, UI_POSITIONS } from '../ui/adaptiveInterface.js';
export { HybridAnalysisEngine, ANALYSIS_TYPES, LOCAL_CAPABILITIES, CLOUD_CAPABILITIES } from '../analysis/hybridAnalysisEngine.js';
