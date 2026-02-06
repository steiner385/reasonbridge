/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/**
 * DTO for setting user alignment on a proposition
 * Matches the SetAlignmentRequest schema from the OpenAPI spec
 */
export class SetAlignmentDto {
  /**
   * User's stance on the proposition
   */
  @IsEnum(['SUPPORT', 'OPPOSE', 'NUANCED'])
  stance!: 'SUPPORT' | 'OPPOSE' | 'NUANCED';

  /**
   * Explanation required when stance is NUANCED
   * Optional for SUPPORT/OPPOSE
   */
  @IsOptional()
  @ValidateIf((o) => o.stance === 'NUANCED')
  @IsString()
  @MaxLength(500)
  nuanceExplanation?: string;
}
