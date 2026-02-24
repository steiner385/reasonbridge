/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for content analysis requests
 */
export class AnalyzeContentDto {
  /**
   * The content to analyze for grooming patterns
   */
  @IsString()
  @IsNotEmpty()
  content!: string;
}
