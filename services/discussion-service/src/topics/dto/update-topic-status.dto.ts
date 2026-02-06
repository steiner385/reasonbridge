/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum } from 'class-validator';

/**
 * DTO for updating topic status
 * Feature 016: Topic Management (T028)
 */
export class UpdateTopicStatusDto {
  @IsEnum(['SEEDING', 'ACTIVE', 'ARCHIVED', 'LOCKED'])
  status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';
}
