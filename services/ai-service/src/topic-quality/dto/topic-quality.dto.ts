/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsNotEmpty, IsArray, IsOptional, MaxLength, IsBoolean } from 'class-validator';

/**
 * Quality issue types that can be detected
 */
export enum TopicQualityIssueType {
  TITLE_TOO_VAGUE = 'title_too_vague',
  TITLE_TOO_LEADING = 'title_too_leading',
  DESCRIPTION_TOO_SHORT = 'description_too_short',
  DESCRIPTION_UNCLEAR = 'description_unclear',
  ONE_SIDED_FRAMING = 'one_sided_framing',
  LOADED_LANGUAGE = 'loaded_language',
  MISSING_CONTEXT = 'missing_context',
  TOO_BROAD = 'too_broad',
  TOO_NARROW = 'too_narrow',
}

/**
 * Overall quality rating
 */
export enum TopicQualityRating {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  POOR = 'poor',
}

/**
 * DTO for requesting a topic quality check
 */
export class CheckTopicQualityDto {
  /**
   * The topic title to analyze (10-200 characters)
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  /**
   * The topic description to analyze (50-5000 characters)
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  /**
   * Optional tags for context
   */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  /**
   * Whether to use AI for enhanced analysis (default: false for speed)
   */
  @IsBoolean()
  @IsOptional()
  useAI?: boolean;
}

/**
 * A specific quality issue detected
 */
export interface TopicQualityIssue {
  type: TopicQualityIssueType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
  affectedText?: string;
  confidenceScore: number;
}

/**
 * Response DTO for topic quality check
 */
export interface TopicQualityResponseDto {
  /**
   * Overall quality rating
   */
  rating: TopicQualityRating;

  /**
   * Overall quality score (0-100)
   */
  score: number;

  /**
   * List of detected issues
   */
  issues: TopicQualityIssue[];

  /**
   * Positive aspects of the topic
   */
  strengths: string[];

  /**
   * Summary of the analysis
   */
  summary: string;

  /**
   * Whether AI was used for analysis
   */
  usedAI: boolean;

  /**
   * Analysis timestamp
   */
  analyzedAt: Date;
}
