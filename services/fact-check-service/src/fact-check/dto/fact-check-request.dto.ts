/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for fact-check request validation
 */
export class FactCheckRequestDto {
  /**
   * The claim text to verify
   * Must be between 10 and 1000 characters
   */
  @IsString()
  @MinLength(10, { message: 'Claim must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Claim must not exceed 1000 characters' })
  claim!: string;

  /**
   * Language code for the fact-check search (default: 'en')
   */
  @IsOptional()
  @IsString()
  languageCode?: string;

  /**
   * Maximum number of results to return (1-20, default: 10)
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxResults?: number;
}
