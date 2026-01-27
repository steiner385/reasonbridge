/**
 * Select topics DTOs for onboarding
 * Matches OpenAPI schema definitions
 */

import {
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Topic priority assignment
 */
export class TopicPriorityDto {
  @IsUUID()
  topicId!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  priority!: number;
}

/**
 * Request payload for topic selection
 */
export class SelectTopicsRequestDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'You must select at least 2 topics' })
  @ArrayMaxSize(3, { message: 'You can select at most 3 topics' })
  @ValidateNested({ each: true })
  @Type(() => TopicPriorityDto)
  topics!: TopicPriorityDto[];
}
