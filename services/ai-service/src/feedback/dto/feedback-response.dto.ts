/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTO for feedback response
 */
export class FeedbackResponseDto {
  /**
   * UUID of the created feedback
   */
  id!: string;

  /**
   * UUID of the response being analyzed
   */
  responseId!: string;

  /**
   * Type of feedback (FALLACY, INFLAMMATORY, UNSOURCED, BIAS, AFFIRMATION)
   */
  type!: string;

  /**
   * Optional subtype for more specific categorization
   */
  subtype?: string;

  /**
   * AI-generated suggestion text
   */
  suggestionText!: string;

  /**
   * Reasoning behind the feedback
   */
  reasoning!: string;

  /**
   * Confidence score (0.00 to 1.00)
   */
  confidenceScore!: number;

  /**
   * Optional educational resources (URLs, articles, etc.)
   */
  educationalResources?: any;

  /**
   * Whether this feedback is displayed to the user
   */
  displayedToUser!: boolean;

  /**
   * Timestamp when feedback was created
   */
  createdAt!: Date;
}
