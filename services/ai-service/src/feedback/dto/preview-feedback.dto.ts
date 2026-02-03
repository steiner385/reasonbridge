import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, MinLength } from 'class-validator';
import { FeedbackSensitivity } from './request-feedback.dto.js';

/**
 * DTO for requesting real-time preview feedback on draft content.
 *
 * This endpoint is designed for the compose experience - providing
 * feedback as users type to help them craft more constructive responses.
 *
 * Unlike requestFeedback, this does NOT:
 * - Require an existing responseId (content hasn't been posted yet)
 * - Store the feedback in the database
 * - Track acknowledgment or revision status
 */
export class PreviewFeedbackDto {
  /**
   * The draft content to analyze.
   * Minimum 20 characters to provide meaningful feedback.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'Content must be at least 20 characters for meaningful feedback' })
  content!: string;

  /**
   * Optional discussion ID for context-aware analysis.
   * When provided, feedback can consider the discussion's topic and tone.
   */
  @IsUUID()
  @IsOptional()
  discussionId?: string;

  /**
   * Optional topic ID for context-aware analysis.
   * Used for semantic caching when discussionId is not available.
   */
  @IsUUID()
  @IsOptional()
  topicId?: string;

  /**
   * Sensitivity level for feedback filtering (optional, defaults to MEDIUM)
   * - LOW: Show all feedback (confidence >= 0.5)
   * - MEDIUM: Show moderately confident feedback (confidence >= 0.7)
   * - HIGH: Show only high-confidence feedback (confidence >= 0.85)
   */
  @IsEnum(FeedbackSensitivity)
  @IsOptional()
  sensitivity?: FeedbackSensitivity;
}

/**
 * Response DTO for preview feedback.
 *
 * Similar to FeedbackResponseDto but without storage-related fields
 * (id, responseId, displayedToUser, createdAt) since preview feedback
 * is ephemeral and not persisted.
 */
export class PreviewFeedbackResponseDto {
  /**
   * Type of feedback (FALLACY, INFLAMMATORY, UNSOURCED, BIAS, AFFIRMATION)
   */
  type!: string;

  /**
   * Optional subtype for more specific categorization
   * e.g., "strawman", "ad_hominem", "statistical_claim"
   */
  subtype?: string;

  /**
   * AI-generated suggestion text - actionable advice for the user
   */
  suggestionText!: string;

  /**
   * Reasoning behind the feedback - helps users understand why
   */
  reasoning!: string;

  /**
   * Confidence score (0.00 to 1.00)
   */
  confidenceScore!: number;

  /**
   * Optional educational resources (URLs, articles, etc.)
   */
  educationalResources?: Record<string, unknown>;

  /**
   * Whether this feedback meets the sensitivity threshold for display
   */
  shouldDisplay!: boolean;
}

/**
 * Multiple feedback items can be returned for preview
 * (unlike stored feedback which returns the single highest-confidence item)
 */
export class PreviewFeedbackResultDto {
  /**
   * All detected feedback items, sorted by confidence
   */
  feedback!: PreviewFeedbackResponseDto[];

  /**
   * The primary (highest priority) feedback item, if any
   */
  primary?: PreviewFeedbackResponseDto;

  /**
   * Time taken to analyze (for performance monitoring)
   */
  analysisTimeMs!: number;

  /**
   * Whether the content is ready to post (no critical issues)
   */
  readyToPost!: boolean;

  /**
   * Summary message for the user
   */
  summary!: string;
}
