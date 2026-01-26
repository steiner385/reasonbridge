/**
 * Select topics DTOs for onboarding
 * Matches OpenAPI schema definitions
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Topic priority assignment
 */
export class TopicPriorityDto {
  @ApiProperty({
    description: 'Topic ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  topicId: string;

  @ApiProperty({
    description: 'Priority level (1=highest, 3=lowest)',
    example: 1,
    minimum: 1,
    maximum: 3,
  })
  @IsInt()
  @Min(1)
  @Max(3)
  priority: number;
}

/**
 * Request payload for topic selection
 */
export class SelectTopicsRequestDto {
  @ApiProperty({
    description: 'Array of topics with priority assignments (2-3 topics required)',
    type: [TopicPriorityDto],
    minItems: 2,
    maxItems: 3,
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'You must select at least 2 topics' })
  @ArrayMaxSize(3, { message: 'You can select at most 3 topics' })
  @ValidateNested({ each: true })
  @Type(() => TopicPriorityDto)
  topics: TopicPriorityDto[];
}
