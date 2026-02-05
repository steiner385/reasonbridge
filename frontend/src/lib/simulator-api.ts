/**
 * Discussion Simulator API Client
 *
 * Provides functions to interact with the AI service simulator endpoints.
 * These endpoints generate AI-driven discussion responses representing different viewpoints.
 */

import { apiClient } from './api';

/**
 * Tone options for personas
 */
export type PersonaTone = 'passionate' | 'analytical' | 'measured' | 'confrontational';

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
