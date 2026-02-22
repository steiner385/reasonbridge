/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Discussion Simulator State Management Types
 *
 * This module defines types for managing the state of interactive discussion
 * simulations with AI-powered personas. It handles conversation state, AI
 * operation tracking, and session persistence.
 *
 * @module types/simulator
 *
 * @remarks
 * These types are used by the simulator components and hooks to:
 * - Track conversation state and messages
 * - Manage AI operation progress and visual feedback (Issue #788)
 * - Support pause/resume via localStorage
 * - Accumulate learning metrics across exchanges
 *
 * API-related types are imported from `lib/simulator-api.ts` to avoid duplication.
 */

// Re-export API types that are also used in state management
export type {
  // Conversation configuration
  ConversationMode,
  DifficultyLevel,
  MessageRole,
  PersonaTone,

  // Persona types
  PresetPersona,
  PersonaConfig,
  ArgumentationConfig,

  // Analysis types
  ArgumentAnalysis,
  Fallacy,

  // Insights types
  LearningInsights,
  CommittedFallacy,
  RecommendedReading,

  // Transcript types
  TranscriptMessage,
  PersonaSummary,
} from '../lib/simulator-api';

// ============================================================================
// SIMULATION STATUS & CONFIGURATION
// ============================================================================

/**
 * Status of the simulation lifecycle
 *
 * @remarks
 * - `configuring`: User is setting up persona, mode, difficulty
 * - `active`: Conversation is in progress
 * - `paused`: User has paused the simulation (saved to localStorage)
 * - `completed`: Simulation has ended (max exchanges reached or user ended)
 */
export type SimulationStatus = 'configuring' | 'active' | 'paused' | 'completed';

/**
 * Available options for maximum exchanges per simulation
 *
 * @remarks
 * Used to limit simulation length. One exchange = one user message + one persona response.
 */
export type MaxExchanges = 5 | 10 | 20;

// ============================================================================
// CONVERSATION MESSAGE TYPES
// ============================================================================

/**
 * Extended conversation message with analysis and metadata
 *
 * @remarks
 * Unlike the basic `ConversationMessage` from the API module, this version
 * includes:
 * - Unique ID for React keys and referencing
 * - Timestamp for display and ordering
 * - Optional analysis for user messages (populated after API call)
 *
 * @example
 * ```typescript
 * const userMessage: SimulationConversationMessage = {
 *   id: 'msg-1',
 *   role: 'user',
 *   content: 'I believe remote work increases productivity.',
 *   timestamp: '2026-02-21T10:30:00Z',
 *   analysis: {
 *     fallacies: [],
 *     unsupportedClaims: ['productivity increases'],
 *     toneScore: 80,
 *     evidenceScore: 40,
 *     coherenceScore: 90,
 *     suggestions: ['Consider citing specific studies'],
 *   },
 * };
 * ```
 */
export interface SimulationConversationMessage {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'persona';
  /** Message content */
  content: string;
  /** ISO timestamp of when the message was sent */
  timestamp: string;
  /** Analysis results for user messages (populated asynchronously) */
  analysis?: import('../lib/simulator-api').ArgumentAnalysis;
}

// ============================================================================
// SIMULATION METRICS
// ============================================================================

/**
 * Accumulated metrics across all exchanges in a simulation
 *
 * @remarks
 * These metrics are computed progressively as the conversation unfolds.
 * They're used for:
 * - Real-time feedback in the UI
 * - Final learning insights summary
 * - Progress tracking toward improvement
 *
 * Scores are on a 0-100 scale (matching `ArgumentAnalysis` scores).
 */
export interface SimulationMetrics {
  /** Total number of exchanges completed */
  exchangeCount: number;
  /** Total fallacies detected across all user messages */
  totalFallacies: number;
  /** Average tone score (0-100) across all analyzed messages */
  averageToneScore: number;
  /** Average evidence score (0-100) across all analyzed messages */
  averageEvidenceScore: number;
  /** Average coherence score (0-100) across all analyzed messages */
  averageCoherenceScore: number;
  /** Total unsupported claims detected */
  totalUnsupportedClaims: number;
}

/**
 * Creates initial simulation metrics with zero values
 */
export const createInitialMetrics = (): SimulationMetrics => ({
  exchangeCount: 0,
  totalFallacies: 0,
  averageToneScore: 0,
  averageEvidenceScore: 0,
  averageCoherenceScore: 0,
  totalUnsupportedClaims: 0,
});

// ============================================================================
// AI OPERATION TRACKING (Issue #788)
// ============================================================================

/**
 * Status of an AI operation
 *
 * @remarks
 * Used for visual feedback during AI processing:
 * - `pending`: Queued but not yet started
 * - `active`: Currently executing
 * - `completed`: Successfully finished
 * - `failed`: Encountered an error
 */
export type AIOperationStatus = 'pending' | 'active' | 'completed' | 'failed';

/**
 * Types of AI operations in the simulator
 *
 * @remarks
 * Each operation type corresponds to a backend endpoint:
 * - `persona_response`: `/ai/simulator/chat` - Generate persona reply
 * - `argument_analysis`: `/ai/simulator/analyze` - Analyze user argument
 * - `citation_verify`: `/ai/simulator/verify-citation` - Verify claim source
 * - `insights`: `/ai/simulator/insights` - Generate learning insights
 */
export type AIOperationType =
  | 'persona_response'
  | 'argument_analysis'
  | 'citation_verify'
  | 'insights';

/**
 * Tracks an individual AI operation for visual feedback
 *
 * @remarks
 * Used by the `OperationQueue` and `AIOperationsBanner` components
 * to show users what AI processing is happening in real-time.
 *
 * @example
 * ```typescript
 * const operation: AIOperation = {
 *   id: 'op-123',
 *   type: 'argument_analysis',
 *   status: 'active',
 *   label: 'Analyzing your argument...',
 *   startedAt: Date.now(),
 *   estimatedMs: 3000,
 * };
 * ```
 */
export interface AIOperation {
  /** Unique identifier for the operation */
  id: string;
  /** Type of AI operation being performed */
  type: AIOperationType;
  /** Current status of the operation */
  status: AIOperationStatus;
  /** Human-readable label for UI display */
  label: string;
  /** Timestamp when the operation started (milliseconds since epoch) */
  startedAt: number;
  /** Estimated duration in milliseconds (for progress indication) */
  estimatedMs?: number;
  /** Error message if status is 'failed' */
  error?: string;
}

/**
 * Creates a new AI operation with default values
 *
 * @param type - The type of operation
 * @param label - Human-readable label for the operation
 * @param estimatedMs - Optional estimated duration in milliseconds
 * @returns A new AIOperation in pending status
 */
export const createAIOperation = (
  type: AIOperationType,
  label: string,
  estimatedMs?: number,
): AIOperation => ({
  id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  type,
  status: 'pending',
  label,
  startedAt: Date.now(),
  estimatedMs,
});

/**
 * Default labels for AI operation types
 */
export const AI_OPERATION_LABELS: Record<AIOperationType, string> = {
  persona_response: 'Generating persona response...',
  argument_analysis: 'Analyzing your argument...',
  citation_verify: 'Verifying citation...',
  insights: 'Generating learning insights...',
};

/**
 * Estimated durations for AI operations (in milliseconds)
 */
export const AI_OPERATION_ESTIMATES: Record<AIOperationType, number> = {
  persona_response: 4000,
  argument_analysis: 3000,
  citation_verify: 2000,
  insights: 5000,
};

// ============================================================================
// SIMULATION STATE
// ============================================================================

/**
 * Custom persona configuration for state management
 *
 * @remarks
 * Extends the basic persona config with an `id` field for tracking.
 * Used when users create custom personas in the PersonaSelector.
 */
export interface CustomPersona {
  /** Unique identifier (generated client-side) */
  id: string;
  /** Display name for the persona */
  name: string;
  /** The position/stance this persona takes */
  position: string;
  /** Background information about the persona */
  background: string;
  /** Communication style/tone */
  tone: import('../lib/simulator-api').PersonaTone;
  /** How open to opposing viewpoints (0.1 = closed, 1.0 = very open) */
  receptiveness: number;
  /** Argumentation style configuration */
  argumentation: import('../lib/simulator-api').ArgumentationConfig;
  /** Optional example arguments this persona might make */
  exampleArguments?: string[];
  /** Flag indicating this is a custom (not preset) persona */
  isCustom: true;
}

/**
 * Persona type that can be either preset or custom
 */
export type SimulationPersona =
  | (import('../lib/simulator-api').PresetPersona & { isCustom?: false })
  | CustomPersona;

/**
 * Complete state for a discussion simulation
 *
 * @remarks
 * This is the main state interface managed by the `useSimulation` hook.
 * It tracks all aspects of a simulation session:
 * - Configuration: persona, mode, difficulty, max exchanges
 * - Conversation: messages, current exchange, status
 * - Analysis: accumulated results and metrics
 * - Operations: pending AI operations for visual feedback
 *
 * @example
 * ```typescript
 * const state: SimulationState = {
 *   persona: presetPersonas[0],
 *   mode: 'debate',
 *   difficulty: 'intermediate',
 *   maxExchanges: 10,
 *   messages: [],
 *   currentExchange: 0,
 *   status: 'configuring',
 *   analysisResults: [],
 *   overallMetrics: createInitialMetrics(),
 *   pendingOperations: [],
 *   topicContext: 'Remote work policies',
 * };
 * ```
 */
export interface SimulationState {
  // ---- Configuration ----
  /** Selected persona (preset or custom) */
  persona: SimulationPersona | null;
  /** Conversation mode */
  mode: import('../lib/simulator-api').ConversationMode;
  /** Difficulty level */
  difficulty: import('../lib/simulator-api').DifficultyLevel;
  /** Maximum number of exchanges */
  maxExchanges: MaxExchanges;
  /** Optional topic context for the discussion */
  topicContext?: string;

  // ---- Conversation ----
  /** All messages in the conversation */
  messages: SimulationConversationMessage[];
  /** Current exchange number (1-indexed) */
  currentExchange: number;
  /** Current simulation status */
  status: SimulationStatus;

  // ---- Analysis ----
  /** Analysis results for each user message */
  analysisResults: import('../lib/simulator-api').ArgumentAnalysis[];
  /** Accumulated metrics across all exchanges */
  overallMetrics: SimulationMetrics;

  // ---- Operations ----
  /** Pending AI operations for visual feedback */
  pendingOperations: AIOperation[];
}

/**
 * Creates initial simulation state with defaults
 */
export const createInitialState = (): SimulationState => ({
  persona: null,
  mode: 'debate',
  difficulty: 'intermediate',
  maxExchanges: 10,
  messages: [],
  currentExchange: 0,
  status: 'configuring',
  analysisResults: [],
  overallMetrics: createInitialMetrics(),
  pendingOperations: [],
});

// ============================================================================
// SESSION PERSISTENCE
// ============================================================================

/**
 * Saved simulation data for localStorage persistence
 *
 * @remarks
 * Stored under the key `'rb_simulation_draft'` in localStorage.
 * Allows users to pause and resume simulations across browser sessions.
 *
 * @example
 * ```typescript
 * const saved: SavedSimulation = {
 *   savedAt: new Date().toISOString(),
 *   state: currentState,
 *   canResume: currentState.status !== 'completed',
 * };
 * localStorage.setItem('rb_simulation_draft', JSON.stringify(saved));
 * ```
 */
export interface SavedSimulation {
  /** ISO timestamp of when the simulation was saved */
  savedAt: string;
  /** Complete simulation state at time of save */
  state: SimulationState;
  /** Whether the simulation can be resumed (not completed) */
  canResume: boolean;
}

/**
 * localStorage key for saved simulations
 */
export const SIMULATION_STORAGE_KEY = 'rb_simulation_draft';

// ============================================================================
// SIMULATION ACTIONS (for reducer pattern)
// ============================================================================

/**
 * Actions for the simulation state reducer
 *
 * @remarks
 * These action types support a reducer-based state management pattern
 * in the `useSimulation` hook. Each action represents a discrete state change.
 */
export type SimulationAction =
  | { type: 'SET_PERSONA'; payload: SimulationPersona }
  | { type: 'SET_MODE'; payload: import('../lib/simulator-api').ConversationMode }
  | { type: 'SET_DIFFICULTY'; payload: import('../lib/simulator-api').DifficultyLevel }
  | { type: 'SET_MAX_EXCHANGES'; payload: MaxExchanges }
  | { type: 'SET_TOPIC_CONTEXT'; payload: string }
  | { type: 'START_SIMULATION' }
  | { type: 'PAUSE_SIMULATION' }
  | { type: 'RESUME_SIMULATION' }
  | { type: 'END_SIMULATION' }
  | { type: 'RESET_SIMULATION' }
  | { type: 'ADD_USER_MESSAGE'; payload: { content: string } }
  | { type: 'ADD_PERSONA_MESSAGE'; payload: { content: string } }
  | {
      type: 'UPDATE_MESSAGE_ANALYSIS';
      payload: { messageId: string; analysis: import('../lib/simulator-api').ArgumentAnalysis };
    }
  | { type: 'ADD_OPERATION'; payload: AIOperation }
  | { type: 'UPDATE_OPERATION'; payload: { id: string; status: AIOperationStatus; error?: string } }
  | { type: 'REMOVE_OPERATION'; payload: { id: string } }
  | { type: 'CLEAR_OPERATIONS' }
  | { type: 'RESTORE_STATE'; payload: SimulationState };

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Configuration options for starting a new simulation
 */
export interface SimulationConfig {
  /** Selected persona */
  persona: SimulationPersona;
  /** Conversation mode */
  mode: import('../lib/simulator-api').ConversationMode;
  /** Difficulty level */
  difficulty: import('../lib/simulator-api').DifficultyLevel;
  /** Maximum exchanges */
  maxExchanges: MaxExchanges;
  /** Optional topic context */
  topicContext?: string;
}

/**
 * Check if a persona is a custom persona
 */
export const isCustomPersona = (persona: SimulationPersona): persona is CustomPersona =>
  'isCustom' in persona && persona.isCustom === true;

/**
 * Convert a SimulationPersona to PersonaConfig for API calls
 */
export const toPersonaConfig = (
  persona: SimulationPersona,
): import('../lib/simulator-api').PersonaConfig => ({
  name: persona.name,
  position: persona.position,
  background: isCustomPersona(persona) ? persona.background : persona.description,
  tone: persona.tone,
  receptiveness: persona.receptiveness,
  argumentation: persona.argumentation,
  exampleArguments: isCustomPersona(persona) ? persona.exampleArguments : undefined,
});
