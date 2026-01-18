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
  dismissedAt?: Date | string;
  dismissalReason?: string;
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
  dismissedAt?: Date | string;
  dismissalReason?: string;
  createdAt: Date | string;
}

/**
 * Request to dismiss feedback
 */
export interface DismissFeedbackRequest {
  dismissalReason?: string;
}

/**
 * Fallacy-specific feedback subtypes
 * Common logical fallacies that AI can detect
 */
export type FallacySubtype =
  | 'ad_hominem'
  | 'straw_man'
  | 'false_dichotomy'
  | 'appeal_to_authority'
  | 'slippery_slope'
  | 'circular_reasoning'
  | 'hasty_generalization'
  | 'red_herring'
  | 'tu_quoque'
  | 'appeal_to_emotion';

/**
 * Severity level for fallacy warnings
 */
export type FallacySeverity = 'low' | 'medium' | 'high';

/**
 * Props for FallacyWarnings component
 */
export interface FallacyWarningsProps {
  /** Array of feedback items to display (will filter for FALLACY type) */
  feedback: Feedback[];
  /** Optional callback when a fallacy warning is acknowledged */
  onAcknowledge?: (feedbackId: string) => void;
  /** Optional callback to dismiss/hide a warning */
  onDismiss?: (feedbackId: string) => void;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Minimum confidence threshold to display (default: 0.8) */
  minConfidence?: number;
  /** Whether to show educational resources */
  showEducationalResources?: boolean;
}
