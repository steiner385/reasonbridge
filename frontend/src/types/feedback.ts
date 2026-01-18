/**
 * Type definitions for AI feedback functionality
 */

/**
 * Type of feedback provided by the AI
 */
export type FeedbackType =
  | 'FALLACY'
  | 'INFLAMMATORY'
  | 'UNSOURCED'
  | 'BIAS'
  | 'AFFIRMATION';

/**
 * Request to generate feedback for a response
 */
export interface RequestFeedbackRequest {
  responseId: string;
  content: string;
}

/**
 * Feedback item returned from the AI service
 */
export interface Feedback {
  id: string;
  responseId: string;
  type: FeedbackType;
  subtype?: string;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources?: Record<string, unknown>;
  displayedToUser: boolean;
  createdAt: Date | string;
}

/**
 * Response from the feedback request endpoint
 */
export interface FeedbackResponse {
  id: string;
  responseId: string;
  type: FeedbackType;
  subtype?: string;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources?: Record<string, unknown>;
  displayedToUser: boolean;
  createdAt: Date | string;
}
