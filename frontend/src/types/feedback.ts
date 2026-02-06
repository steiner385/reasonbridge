/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for AI feedback functionality
 */

/**
 * Type of feedback provided by the AI
 */
export type FeedbackType = 'FALLACY' | 'INFLAMMATORY' | 'UNSOURCED' | 'BIAS' | 'AFFIRMATION';

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

/**
 * Sensitivity level for feedback display
 */
export type FeedbackSensitivity = 'low' | 'medium' | 'high';

/**
 * User preferences for feedback behavior
 */
export interface FeedbackPreferences {
  /** Whether feedback is globally enabled */
  enabled: boolean;
  /** Sensitivity level - affects confidence threshold for display */
  sensitivity: FeedbackSensitivity;
  /** Minimum confidence threshold to display feedback (0.0-1.0) */
  minConfidenceThreshold: number;
  /** Whether to show educational resources with feedback */
  showEducationalResources: boolean;
  /** Whether to auto-dismiss low-confidence feedback after user review */
  autoDismissLowConfidence: boolean;
  /** Types of feedback to display (filter) */
  enabledTypes: {
    fallacy: boolean;
    inflammatory: boolean;
    unsourced: boolean;
    bias: boolean;
    affirmation: boolean;
  };
}

/**
 * Tone level representing the emotional temperature of content
 * Ranges from calm (constructive) to hostile (inflammatory)
 */
export type ToneLevel = 'calm' | 'neutral' | 'assertive' | 'heated' | 'hostile';

/**
 * Tone subtype detected by the analyzer
 */
export type ToneSubtype = 'personal_attack' | 'hostile_tone' | 'personal_attack_with_hostile_tone';

/**
 * Result of tone analysis for content
 */
export interface ToneAnalysis {
  /** Overall tone level */
  level: ToneLevel;
  /** Specific subtype if inflammatory language detected */
  subtype?: ToneSubtype;
  /** Confidence score from 0 to 1 */
  confidenceScore: number;
  /** Suggestion for improving tone (if needed) */
  suggestion?: string;
  /** Reasoning behind the analysis */
  reasoning?: string;
}

/**
 * Props for ToneIndicator component
 */
export interface ToneIndicatorProps {
  /** Tone analysis data to visualize */
  tone: ToneAnalysis;
  /** Whether to show the full gauge or a compact indicator */
  variant?: 'gauge' | 'compact' | 'inline';
  /** Whether to show the suggestion text */
  showSuggestion?: boolean;
  /** Whether to show confidence score */
  showConfidence?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Callback when the indicator is clicked */
  onClick?: () => void;
}

/**
 * Clarity level representing how clear and well-structured content is
 */
export type ClarityLevel = 'excellent' | 'good' | 'moderate' | 'needs_improvement' | 'poor';

/**
 * Factors that contribute to clarity scoring
 */
export interface ClarityFactors {
  /** How well the argument is structured (0-1) */
  structure?: number;
  /** How specific and precise the language is (0-1) */
  specificity?: number;
  /** How well claims are supported with evidence (0-1) */
  evidenceSupport?: number;
  /** How logically coherent the argument is (0-1) */
  coherence?: number;
  /** How readable the content is (0-1) */
  readability?: number;
}

/**
 * Issue detected during clarity analysis
 */
export interface ClarityIssue {
  /** Type of clarity issue */
  type: 'unsourced_claim' | 'vague_language' | 'bias_indicator' | 'unclear_structure';
  /** Description of the issue */
  description: string;
  /** Example from the content (optional) */
  example?: string;
  /** Suggestion for improvement */
  suggestion: string;
}

/**
 * Result of clarity analysis for content
 */
export interface ClarityAnalysis {
  /** Overall clarity score from 0 to 1 */
  score: number;
  /** Clarity level category */
  level: ClarityLevel;
  /** Breakdown of clarity factors (optional) */
  factors?: ClarityFactors;
  /** Specific issues detected (optional) */
  issues?: ClarityIssue[];
  /** General suggestion for improvement */
  suggestion?: string;
  /** Confidence in the analysis (0-1) */
  confidenceScore?: number;
}

/**
 * Props for ClarityScoreDisplay component
 */
export interface ClarityScoreDisplayProps {
  /** Clarity analysis data to visualize */
  clarity: ClarityAnalysis;
  /** Display variant */
  variant?: 'detailed' | 'compact' | 'inline';
  /** Whether to show the breakdown of clarity factors */
  showFactors?: boolean;
  /** Whether to show specific issues */
  showIssues?: boolean;
  /** Whether to show improvement suggestions */
  showSuggestions?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Size of the display */
  size?: 'sm' | 'md' | 'lg';
  /** Callback when the display is clicked */
  onClick?: () => void;
}
