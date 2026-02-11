/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional, Length } from 'class-validator';

/**
 * Request DTO for framing suggestions
 */
export class FramingSuggestionsRequestDto {
  /**
   * Topic title to analyze for framing
   */
  @IsString()
  @Length(1, 200)
  title!: string;

  /**
   * Topic description to analyze for framing
   */
  @IsString()
  @Length(1, 5000)
  description!: string;

  /**
   * Optional context about the topic's purpose or intended audience
   */
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  context?: string;
}

/**
 * Individual framing suggestion
 */
export interface FramingSuggestionDto {
  /**
   * The type of framing issue identified
   */
  issueType: 'LOADED_LANGUAGE' | 'ONE_SIDED' | 'UNCLEAR' | 'POLARIZING' | 'IMPROVEMENT';

  /**
   * The original text that could be improved
   */
  originalText: string;

  /**
   * Suggested alternative framing
   */
  suggestedText: string;

  /**
   * Explanation of why this change would improve the framing
   */
  explanation: string;

  /**
   * Confidence score for this suggestion (0-1)
   */
  confidenceScore: number;
}

/**
 * Response DTO for framing suggestions
 */
export interface FramingSuggestionsResponseDto {
  /**
   * The analyzed title
   */
  originalTitle: string;

  /**
   * Suggested improved title (if applicable)
   */
  suggestedTitle: string | null;

  /**
   * Individual framing suggestions
   */
  suggestions: FramingSuggestionDto[];

  /**
   * Overall neutrality score (0-1, higher is more neutral)
   */
  neutralityScore: number;

  /**
   * Overall clarity score (0-1, higher is clearer)
   */
  clarityScore: number;

  /**
   * Overall inclusivity score (0-1, higher is more inclusive)
   */
  inclusivityScore: number;

  /**
   * Overall confidence in the analysis
   */
  confidenceScore: number;

  /**
   * Reasoning for the analysis
   */
  reasoning: string;

  /**
   * Attribution for the AI analysis
   */
  attribution: string;
}
