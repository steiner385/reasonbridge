/**
 * Mark First Post DTO
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

/**
 * Request to mark first post as made
 */
export class MarkFirstPostRequestDto {
  @ApiProperty({
    description: 'ID of the first post/proposition created by the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  postId?: string;

  @ApiProperty({
    description: 'ID of the discussion where first post was made',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  discussionId?: string;
}
