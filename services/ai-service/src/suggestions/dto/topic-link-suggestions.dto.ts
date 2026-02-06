/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray } from 'class-validator';

/**
 * DTO for requesting topic link suggestions
 */
export class TopicLinkSuggestionsRequestDto {
  /**
   * Current topic ID
   */
  @IsUUID()
  @IsNotEmpty()
  topicId!: string;

  /**
   * Title of the current topic
   */
  @IsString()
  @IsNotEmpty()
  title!: string;

  /**
   * Content of the current topic
   */
  @IsString()
  @IsNotEmpty()
  content!: string;

  /**
   * Optional array of existing topic IDs to consider
   * If not provided, will query from database
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  existingTopicIds?: string[];
}

/**
 * Topic link suggestion with relationship type
 */
export class TopicLinkDto {
  /**
   * Target topic ID to link to
   */
  targetTopicId!: string;

  /**
   * Type of relationship (supports, contradicts, extends, questions, relates_to)
   */
  relationshipType!: string;

  /**
   * Reasoning for this link suggestion
   */
  reasoning!: string;
}

/**
 * DTO for topic link suggestion response
 */
export class TopicLinkSuggestionsResponseDto {
  /**
   * Array of topic IDs suggested for linking
   */
  suggestions!: string[];

  /**
   * Detailed link suggestions with relationship types
   */
  linkSuggestions!: TopicLinkDto[];

  /**
   * Confidence score (0-1)
   */
  confidenceScore!: number;

  /**
   * Reasoning for the suggestions
   */
  reasoning!: string;

  /**
   * AI attribution label
   */
  attribution!: string;
}
