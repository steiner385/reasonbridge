/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsUUID, IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

/**
 * Sensitivity level for feedback filtering
 */
export enum FeedbackSensitivity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * DTO for requesting AI-generated feedback on a response
 */
export class RequestFeedbackDto {
  /**
   * UUID of the response to analyze
   */
  @IsUUID()
  @IsNotEmpty()
  responseId!: string;

  /**
   * The content of the response to analyze
   */
  @IsString()
  @IsNotEmpty()
  content!: string;

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
