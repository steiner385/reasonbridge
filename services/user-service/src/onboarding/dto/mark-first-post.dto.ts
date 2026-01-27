/**
 * Mark First Post DTO
 */

import { IsUUID, IsOptional } from 'class-validator';

/**
 * Request to mark first post as made
 */
export class MarkFirstPostRequestDto {
  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  discussionId?: string;
}
