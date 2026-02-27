/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional } from 'class-validator';

/**
 * Request for generating topic positions
 */
export class GeneratePositionsDto {
  @IsString()
  topicTitle!: string;

  @IsOptional()
  @IsString()
  context?: string;
}

/**
 * A single position result
 */
export class PositionResultDto {
  label!: string;
  summary!: string;
  suggestedPersona!: string;
}

/**
 * Response from generating positions
 */
export class GeneratePositionsResultDto {
  positionA!: PositionResultDto;
  positionB!: PositionResultDto;
  /**
   * Indicates the response was generated using fallback behavior
   * because the AI service was unavailable
   */
  degradedMode?: boolean;
}
