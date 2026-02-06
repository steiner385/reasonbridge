/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportCommonGroundQueryDto {
  /**
   * The version of the analysis to export (optional, defaults to latest)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  /**
   * The export format (defaults to 'pdf')
   */
  @IsOptional()
  @IsIn(['pdf', 'json', 'markdown'])
  format?: 'pdf' | 'json' | 'markdown';
}
