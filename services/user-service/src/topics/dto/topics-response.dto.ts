/**
 * Topics response DTOs
 */

import { ApiProperty } from '@nestjs/swagger';
import { TopicDto } from './topic.dto';

/**
 * Response containing list of topics
 */
export class TopicsResponseDto {
  @ApiProperty({
    description: 'List of topics',
    type: [TopicDto],
  })
  topics: TopicDto[];

  @ApiProperty({
    description: 'Total number of topics matching criteria',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'Recommended minimum number of topics to select',
    example: 2,
  })
  minSelection: number;

  @ApiProperty({
    description: 'Recommended maximum number of topics to select',
    example: 3,
  })
  maxSelection: number;
}
