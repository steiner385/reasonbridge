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
