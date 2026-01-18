/**
 * Feedback types matching backend Prisma schema
 */

export enum FeedbackType {
  FALLACY = 'FALLACY',
  INFLAMMATORY = 'INFLAMMATORY',
  UNSOURCED = 'UNSOURCED',
  BIAS = 'BIAS',
  AFFIRMATION = 'AFFIRMATION',
}

export enum HelpfulRating {
  HELPFUL = 'HELPFUL',
  NOT_HELPFUL = 'NOT_HELPFUL',
}

/**
 * Feedback entity from backend API
 */
export interface Feedback {
  id: string;
  responseId: string;
  type: FeedbackType;
  subtype?: string;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number; // 0.00-1.00
  educationalResources?: unknown;
  userAcknowledged: boolean;
  userRevised: boolean;
  userHelpfulRating?: HelpfulRating;
  displayedToUser: boolean;
  createdAt: Date;
}

/**
 * Tone-specific feedback subtypes
 */
export enum ToneSubtype {
  HOSTILE_TONE = 'hostile_tone',
  INFLAMMATORY_LANGUAGE = 'inflammatory_language',
  PERSONAL_ATTACK = 'personal_attack',
  DISMISSIVE = 'dismissive',
  SARCASTIC = 'sarcastic',
}

/**
 * Clarity-specific feedback subtypes
 */
export enum ClaritySubtype {
  UNSOURCED_CLAIM = 'unsourced_claim',
  VAGUE_LANGUAGE = 'vague_language',
  LOADED_LANGUAGE = 'loaded_language',
  BIAS_INDICATOR = 'bias_indicator',
}

/**
 * Clarity metrics for a response
 */
export interface ClarityMetrics {
  sourcingScore: number; // 0.00-1.00 (1.0 = well-sourced)
  neutralityScore: number; // 0.00-1.00 (1.0 = neutral)
  specificityScore: number; // 0.00-1.00 (1.0 = specific)
  overallClarityScore: number; // 0.00-1.00 (average of above)
  issuesDetected: {
    unsourcedClaims: number;
    biasIndicators: number;
    vagueStatements: number;
  };
}

/**
 * Props for ClarityScoreDisplay component
 */
export interface ClarityScoreDisplayProps {
  feedback: Feedback[];
  metrics?: ClarityMetrics;
  compact?: boolean;
  onAcknowledge?: (feedbackId: string) => void;
  onRateHelpful?: (feedbackId: string, rating: HelpfulRating) => void;
}

/**
 * Props for ToneIndicator component
 */
export interface ToneIndicatorProps {
  feedback: Feedback;
  onAcknowledge?: (feedbackId: string) => void;
  onRateHelpful?: (feedbackId: string, rating: HelpfulRating) => void;
  compact?: boolean;
}
