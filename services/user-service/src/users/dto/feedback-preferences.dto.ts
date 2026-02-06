/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsBoolean, IsOptional, IsNumber, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Sensitivity level for feedback display
 * Affects which feedback items are shown based on confidence threshold
 */
export enum FeedbackSensitivity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Enabled types configuration for feedback categories
 */
export class FeedbackEnabledTypesDto {
  @IsOptional()
  @IsBoolean()
  fallacy?: boolean;

  @IsOptional()
  @IsBoolean()
  inflammatory?: boolean;

  @IsOptional()
  @IsBoolean()
  unsourced?: boolean;

  @IsOptional()
  @IsBoolean()
  bias?: boolean;

  @IsOptional()
  @IsBoolean()
  affirmation?: boolean;
}

/**
 * FeedbackPreferencesDto - User preferences for AI feedback
 *
 * Represents the user's preferences for receiving and displaying
 * AI-generated feedback on their contributions.
 */
export class FeedbackPreferencesDto {
  /**
   * Whether AI feedback is globally enabled for this user
   */
  @IsBoolean()
  enabled!: boolean;

  /**
   * Sensitivity level - affects confidence threshold for display
   * - low: Only high-confidence feedback (>= 0.9)
   * - medium: Standard threshold (>= 0.7)
   * - high: Show more feedback (>= 0.5)
   */
  @IsEnum(FeedbackSensitivity)
  sensitivity!: FeedbackSensitivity;

  /**
   * Minimum confidence threshold to display feedback (0.0-1.0)
   * Overrides sensitivity-based defaults when explicitly set
   */
  @IsNumber()
  @Min(0, { message: 'minConfidenceThreshold must be between 0 and 1' })
  @Max(1, { message: 'minConfidenceThreshold must be between 0 and 1' })
  minConfidenceThreshold!: number;

  /**
   * Whether to show educational resources with feedback
   */
  @IsBoolean()
  showEducationalResources!: boolean;

  /**
   * Whether to auto-dismiss low-confidence feedback after user review
   */
  @IsBoolean()
  autoDismissLowConfidence!: boolean;

  /**
   * Types of feedback to display (filter by category)
   */
  @ValidateNested()
  @Type(() => FeedbackEnabledTypesDto)
  enabledTypes!: FeedbackEnabledTypesDto;

  /**
   * Create default feedback preferences
   * All feedback enabled with medium sensitivity
   */
  static getDefaults(): FeedbackPreferencesDto {
    const dto = new FeedbackPreferencesDto();
    dto.enabled = true;
    dto.sensitivity = FeedbackSensitivity.MEDIUM;
    dto.minConfidenceThreshold = 0.7;
    dto.showEducationalResources = true;
    dto.autoDismissLowConfidence = false;
    dto.enabledTypes = {
      fallacy: true,
      inflammatory: true,
      unsourced: true,
      bias: true,
      affirmation: true,
    };
    return dto;
  }
}

/**
 * UpdateFeedbackPreferencesDto - Partial update for feedback preferences
 *
 * All fields are optional, allowing partial updates of preferences.
 */
export class UpdateFeedbackPreferencesDto {
  /**
   * Toggle AI feedback globally on/off
   */
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /**
   * Update sensitivity level
   */
  @IsOptional()
  @IsEnum(FeedbackSensitivity)
  sensitivity?: FeedbackSensitivity;

  /**
   * Update minimum confidence threshold
   */
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'minConfidenceThreshold must be between 0 and 1' })
  @Max(1, { message: 'minConfidenceThreshold must be between 0 and 1' })
  minConfidenceThreshold?: number;

  /**
   * Update educational resources display setting
   */
  @IsOptional()
  @IsBoolean()
  showEducationalResources?: boolean;

  /**
   * Update auto-dismiss setting
   */
  @IsOptional()
  @IsBoolean()
  autoDismissLowConfidence?: boolean;

  /**
   * Update enabled feedback types
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => FeedbackEnabledTypesDto)
  enabledTypes?: FeedbackEnabledTypesDto;
}

/**
 * FeedbackToggleDto - Simple toggle for enabling/disabling feedback
 *
 * Convenience DTO for the toggle endpoint
 */
export class FeedbackToggleDto {
  /**
   * Whether AI feedback should be enabled
   */
  @IsBoolean()
  enabled!: boolean;
}

/**
 * FeedbackPreferencesResponseDto - Response with feedback preferences
 */
export class FeedbackPreferencesResponseDto extends FeedbackPreferencesDto {
  /**
   * User ID these preferences belong to
   */
  userId!: string;

  /**
   * When preferences were last updated
   */
  updatedAt!: Date;

  constructor(userId: string, preferences: FeedbackPreferencesDto, updatedAt: Date) {
    super();
    this.userId = userId;
    this.enabled = preferences.enabled;
    this.sensitivity = preferences.sensitivity;
    this.minConfidenceThreshold = preferences.minConfidenceThreshold;
    this.showEducationalResources = preferences.showEducationalResources;
    this.autoDismissLowConfidence = preferences.autoDismissLowConfidence;
    this.enabledTypes = preferences.enabledTypes;
    this.updatedAt = updatedAt;
  }
}
