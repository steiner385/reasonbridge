/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTO for alignment response
 * Matches the Alignment schema from the OpenAPI spec
 */
export interface AlignmentDto {
  id: string;
  stance: 'SUPPORT' | 'OPPOSE' | 'NUANCED';
  nuanceExplanation?: string;
  createdAt: Date;
}
