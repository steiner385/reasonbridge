/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topics response DTOs
 */

import type { TopicDto } from './topic.dto';

/**
 * Response containing list of topics
 */
export class TopicsResponseDto {
  topics!: TopicDto[];
  total!: number;
  minSelection!: number;
  maxSelection!: number;
}
