/**
 * T019 [P] [US1] - Discussion Response DTO (Feature 009)
 *
 * Response format for discussion queries
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserSummaryDto } from '../../dto/user-summary.dto.js';

/**
 * Discussion summary in list views
 */
export class DiscussionResponseDto {
  @ApiProperty({
    description: 'Discussion ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Topic ID this discussion belongs to',
    example: '660e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  topicId!: string;

  @ApiProperty({
    description: 'Discussion title',
    example: 'Should carbon taxes be increased in 2027?',
  })
  title!: string;

  @ApiProperty({
    description: 'Discussion status',
    enum: ['ACTIVE', 'ARCHIVED', 'DELETED'],
    example: 'ACTIVE',
  })
  status!: 'ACTIVE' | 'ARCHIVED' | 'DELETED';

  @ApiProperty({
    description: 'User who created the discussion',
    type: UserSummaryDto,
  })
  creator!: UserSummaryDto;

  @ApiProperty({
    description: 'Total number of responses',
    example: 42,
  })
  responseCount!: number;

  @ApiProperty({
    description: 'Number of unique participants',
    example: 15,
  })
  participantCount!: number;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2026-01-27T15:30:00Z',
  })
  lastActivityAt!: string;

  @ApiProperty({
    description: 'Discussion creation timestamp',
    example: '2026-01-27T10:00:00Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2026-01-27T15:30:00Z',
  })
  updatedAt!: string;
}

/**
 * Detailed discussion with responses (for GET /discussions/:id)
 */
export class DiscussionDetailDto extends DiscussionResponseDto {
  @ApiPropertyOptional({
    description: 'Array of top-level responses (paginated)',
    isArray: true,
  })
  responses?: any[]; // Will use ResponseDetailDto from Phase 4
}
