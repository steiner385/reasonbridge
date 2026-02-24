/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Discussion Simulator API Client
 *
 * Provides functions to interact with the AI service simulator endpoints.
 * These endpoints generate AI-driven discussion responses representing different viewpoints.
 *
 * @module simulator-api
 *
 * @remarks
 * This module supports two simulation modes:
 * 1. **Basic Mode** - Original endpoints for generating AI responses
 * 2. **Persona Mode** - Advanced conversational learning with preset/custom personas
 *
 * Persona Mode endpoints:
 * - `getPresetPersonas()` - List available preset personas
 * - `chat()` - Generate persona response in a conversation
 * - `analyzeArgument()` - Analyze user argument quality
 * - `generateInsights()` - Generate learning insights from transcript
 */

import { apiClient } from './api';

// ============================================================================
// SHARED TYPES
// ============================================================================

/**
 * Tone options for personas
 */
export type PersonaTone = 'passionate' | 'analytical' | 'measured' | 'confrontational';

/**
 * Conversation mode for persona interactions
 */
export type ConversationMode = 'socratic' | 'debate' | 'steelman' | 'common_ground';

/**
 * Difficulty level for persona responses
 */
export type DifficultyLevel = 'novice' | 'intermediate' | 'expert';

/**
 * Message role in a conversation
 */
export type MessageRole = 'user' | 'persona';

/**
 * Custom persona configuration for discussion simulation
 */
export interface CustomPersonaConfig {
  /** Display name for the persona */
  name: string;
  /** Core values that guide the persona's arguments */
  values: string[];
  /** Communication style/tone for the persona */
  tone: PersonaTone;
  /** How open the persona is to opposing viewpoints (0.1 = closed, 1.0 = very open) */
  receptiveness: number;
  /** Whether the persona tends to use emotional appeals in arguments */
  usesEmotionalAppeals: boolean;
  /** Whether the persona tends to cite data/statistics */
  citesData: boolean;
  /** Whether the persona tends to ask clarifying questions */
  asksQuestions: boolean;
  /** Optional cognitive biases to simulate */
  biases?: string[];
}

/**
 * Preview feedback item (matches backend type)
 */
export interface PreviewFeedbackItem {
  type: string;
  subtype?: string;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  shouldDisplay: boolean;
}

/**
 * Request for generating agent responses
 */
export interface GenerateResponseRequest {
  discussionId: string;
  personaId?: string;
  customPersona?: CustomPersonaConfig;
  action: 'draft' | 'revise';
  currentDraft?: string;
  feedback?: PreviewFeedbackItem[];
  topicTitle?: string;
  discussionHistory?: string[];
}

/**
 * Response from generating agent responses
 */
export interface GenerateResponseResult {
  content: string;
  reasoning: string;
  revisedAreas?: string[];
}

/**
 * Request for generating topic positions
 */
export interface GeneratePositionsRequest {
  topicTitle: string;
  context?: string;
}

/**
 * A single position result
 */
export interface PositionResult {
  label: string;
  summary: string;
  suggestedPersona: string;
}

/**
 * Response from generating positions
 */
export interface GeneratePositionsResult {
  positionA: PositionResult;
  positionB: PositionResult;
}

/**
 * Request for generating system prompt
 */
export interface GeneratePromptRequest {
  persona: CustomPersonaConfig;
  topicTitle?: string;
  topicContext?: string;
}

/**
 * Response from generating system prompt
 */
export interface GeneratePromptResult {
  systemPrompt: string;
}

/**
 * Generate an AI agent response
 *
 * Generates AI-driven responses that represent different viewpoints on a topic.
 * Supports both preset personas and custom persona configurations.
 *
 * @param request Request containing persona, action, and context
 * @returns Generated response with content and reasoning
 */
export async function generateResponse(
  request: GenerateResponseRequest,
): Promise<GenerateResponseResult> {
  return apiClient.post<GenerateResponseResult>('/ai/simulator/generate-response', request);
}

/**
 * Generate opposing positions for a custom topic
 *
 * Analyzes a topic and suggests two contrasting positions that
 * represent genuine philosophical or value-based differences.
 *
 * @param request Request containing topic title and optional context
 * @returns Two opposing positions with labels, summaries, and suggested personas
 */
export async function generatePositions(
  request: GeneratePositionsRequest,
): Promise<GeneratePositionsResult> {
  return apiClient.post<GeneratePositionsResult>('/ai/simulator/generate-positions', request);
}

/**
 * Generate system prompt from custom persona config
 *
 * Converts a persona configuration into a detailed system prompt
 * that can be used to guide AI response generation.
 *
 * @param request Request containing persona configuration and topic context
 * @returns Generated system prompt ready for use with AI models
 */
export async function generatePrompt(
  request: GeneratePromptRequest,
): Promise<GeneratePromptResult> {
  return apiClient.post<GeneratePromptResult>('/ai/simulator/generate-prompt', request);
}

// ============================================================================
// PERSONA MODE TYPES
// ============================================================================

/**
 * Preset persona available from the backend
 */
export interface PresetPersona {
  /** Unique identifier for the persona */
  id: string;
  /** Display name of the persona */
  name: string;
  /** Brief description of the persona's approach */
  description: string;
  /** The position/stance this persona takes */
  position: string;
  /** Communication style/tone */
  tone: PersonaTone;
  /** How open to opposing viewpoints (0.1 = closed, 1.0 = very open) */
  receptiveness: number;
  /** Argumentation style configuration */
  argumentation: ArgumentationConfig;
  /** Best-suited conversation mode */
  modeAffinity: ConversationMode;
}

/**
 * Argumentation style configuration for a persona
 */
export interface ArgumentationConfig {
  /** Whether the persona uses emotional appeals */
  usesEmotionalAppeals: boolean;
  /** Whether the persona cites data/statistics */
  citesData: boolean;
  /** Whether the persona asks clarifying questions */
  asksQuestions: boolean;
}

/**
 * Full persona configuration for chat requests
 */
export interface PersonaConfig {
  /** Display name */
  name: string;
  /** The position/stance this persona takes */
  position: string;
  /** Background information about the persona */
  background: string;
  /** Communication style/tone */
  tone: PersonaTone;
  /** How open to opposing viewpoints (0.1 = closed, 1.0 = very open) */
  receptiveness: number;
  /** Argumentation style configuration */
  argumentation: ArgumentationConfig;
  /** Optional example arguments this persona might make */
  exampleArguments?: string[];
}

/**
 * A message in the conversation history
 */
export interface ConversationMessage {
  /** Role of the message sender */
  role: MessageRole;
  /** Message content */
  content: string;
}

/**
 * Request for generating a persona chat response
 */
export interface ChatRequest {
  /** Persona configuration */
  persona: PersonaConfig;
  /** Conversation mode */
  mode: ConversationMode;
  /** Difficulty level */
  difficulty: DifficultyLevel;
  /** User's message to respond to */
  userMessage: string;
  /** Previous conversation history */
  conversationHistory: ConversationMessage[];
  /** Optional topic context */
  topicContext?: string;
}

/**
 * Response from the chat endpoint
 */
export interface ChatResponse {
  /** Generated persona response */
  response: string;
  /** Name of the persona that generated the response */
  personaName: string;
  /** ISO timestamp of when the response was generated */
  timestamp: string;
}

/**
 * Context message for argument analysis
 */
export interface ContextMessage {
  /** Role of the message sender */
  role: MessageRole;
  /** Message content */
  content: string;
}

/**
 * Request for analyzing a user's argument
 */
export interface AnalyzeArgumentRequest {
  /** The user's message to analyze */
  userMessage: string;
  /** Conversation context for better analysis */
  conversationContext: ContextMessage[];
}

/**
 * A detected logical fallacy
 */
export interface Fallacy {
  /** Type of fallacy (e.g., "ad hominem", "straw man") */
  type: string;
  /** Explanation of the fallacy */
  description: string;
  /** Excerpt from the argument containing the fallacy */
  excerpt: string;
  /** How severe the fallacy is */
  severity: 'minor' | 'moderate' | 'major';
}

/**
 * Response from argument analysis
 */
export interface ArgumentAnalysis {
  /** Detected logical fallacies */
  fallacies: Fallacy[];
  /** Claims made without supporting evidence */
  unsupportedClaims: string[];
  /** Score for argument tone (0-100) */
  toneScore: number;
  /** Score for evidence quality (0-100) */
  evidenceScore: number;
  /** Score for logical coherence (0-100) */
  coherenceScore: number;
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Message in a conversation transcript
 */
export interface TranscriptMessage {
  /** Unique message identifier */
  id: string;
  /** Role of the message sender */
  role: MessageRole;
  /** Message content */
  content: string;
  /** ISO timestamp of the message */
  timestamp: string;
}

/**
 * Summary of the persona for insights generation
 */
export interface PersonaSummary {
  /** Persona display name */
  name: string;
  /** The position/stance this persona takes */
  position: string;
  /** Communication style/tone */
  tone: PersonaTone;
}

/**
 * Request for generating learning insights
 */
export interface GenerateInsightsRequest {
  /** Full conversation transcript */
  transcript: TranscriptMessage[];
  /** Conversation mode used */
  mode: ConversationMode;
  /** Summary of the persona interacted with */
  persona: PersonaSummary;
  /** Optional topic context */
  topicContext?: string;
}

/**
 * A fallacy committed during the conversation
 */
export interface CommittedFallacy {
  /** Type of fallacy */
  type: string;
  /** Which exchange (message index) it occurred in */
  exchange: number;
  /** Excerpt containing the fallacy */
  excerpt: string;
}

/**
 * Recommended reading for improvement
 */
export interface RecommendedReading {
  /** Title of the resource */
  title: string;
  /** Why this reading is recommended */
  reason: string;
}

/**
 * Learning insights from a conversation
 */
export interface LearningInsights {
  /** Things the user did well */
  strengths: string[];
  /** Areas for improvement */
  improvements: string[];
  /** Fallacies committed during the conversation */
  fallaciesCommitted: CommittedFallacy[];
  /** Recommended readings for improvement */
  recommendedReadings: RecommendedReading[];
  /** Overall assessment summary */
  overallAssessment: string;
}

// ============================================================================
// PERSONA MODE API FUNCTIONS
// ============================================================================

/**
 * Get available preset personas
 *
 * Retrieves a list of pre-configured personas that users can select
 * for conversations. Each persona has a unique perspective, tone, and
 * mode affinity.
 *
 * @returns Array of preset personas
 *
 * @example
 * ```typescript
 * const personas = await getPresetPersonas();
 * console.log(personas[0].name); // e.g., "Socratic Mentor"
 * ```
 */
export async function getPresetPersonas(): Promise<PresetPersona[]> {
  return apiClient.get<PresetPersona[]>('/ai/simulator/personas');
}

/**
 * Generate a persona chat response
 *
 * Sends a message to a configured persona and receives an AI-generated
 * response that maintains the persona's characteristics, position, and tone.
 *
 * @param request Chat request containing persona, mode, difficulty, and message
 * @returns Generated response from the persona
 *
 * @example
 * ```typescript
 * const response = await chat({
 *   persona: {
 *     name: "Devil's Advocate",
 *     position: "Against remote work",
 *     background: "Traditional management consultant",
 *     tone: "analytical",
 *     receptiveness: 0.6,
 *     argumentation: {
 *       usesEmotionalAppeals: false,
 *       citesData: true,
 *       asksQuestions: true,
 *     },
 *   },
 *   mode: "debate",
 *   difficulty: "intermediate",
 *   userMessage: "Remote work increases productivity",
 *   conversationHistory: [],
 * });
 * ```
 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  return apiClient.post<ChatResponse>('/ai/simulator/chat', request);
}

/**
 * Analyze a user's argument
 *
 * Evaluates the quality of a user's argument, detecting logical fallacies,
 * unsupported claims, and providing scores for tone, evidence, and coherence.
 *
 * @param request Request containing the user message and conversation context
 * @returns Detailed analysis of the argument
 *
 * @example
 * ```typescript
 * const analysis = await analyzeArgument({
 *   userMessage: "Everyone knows that...",
 *   conversationContext: [
 *     { role: "persona", content: "What evidence supports this?" }
 *   ],
 * });
 *
 * if (analysis.fallacies.length > 0) {
 *   console.log("Fallacy detected:", analysis.fallacies[0].type);
 * }
 * ```
 */
export async function analyzeArgument(request: AnalyzeArgumentRequest): Promise<ArgumentAnalysis> {
  return apiClient.post<ArgumentAnalysis>('/ai/simulator/analyze', request);
}

/**
 * Generate learning insights from a conversation
 *
 * Analyzes a complete conversation transcript to generate personalized
 * learning insights, including strengths, areas for improvement, and
 * recommended readings.
 *
 * @param request Request containing transcript, mode, and persona summary
 * @returns Learning insights and recommendations
 *
 * @example
 * ```typescript
 * const insights = await generateInsights({
 *   transcript: [
 *     { id: "1", role: "user", content: "...", timestamp: "..." },
 *     { id: "2", role: "persona", content: "...", timestamp: "..." },
 *   ],
 *   mode: "socratic",
 *   persona: {
 *     name: "Socratic Mentor",
 *     position: "Questioner",
 *     tone: "measured",
 *   },
 * });
 *
 * console.log("Strengths:", insights.strengths);
 * console.log("Areas to improve:", insights.improvements);
 * ```
 */
export async function generateInsights(
  request: GenerateInsightsRequest,
): Promise<LearningInsights> {
  return apiClient.post<LearningInsights>('/ai/simulator/insights', request);
}
