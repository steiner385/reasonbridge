/**
 * T036 [P] [US2] - Response Detail DTO (Feature 009)
 *
 * Response format for displaying discussion responses with threading support
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserSummaryDto } from '../../dto/user-summary.dto.js';
import { CitationDto } from '../../dto/citation-input.dto.js';

/**
 * Detailed response with author, citations, and threading info
 */
export class ResponseDetailDto {
  @ApiProperty({
    description: 'Response ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Discussion ID this response belongs to',
    example: '660e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  discussionId: string;

  @ApiProperty({
    description: 'Response content',
    example: 'I believe we should consider the environmental impact...',
  })
  content: string;

  @ApiProperty({
    description: 'Author information',
    type: UserSummaryDto,
  })
  author: UserSummaryDto;

  @ApiPropertyOptional({
    description: 'Parent response ID for threaded replies',
    example: '770e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
    nullable: true,
  })
  parentResponseId: string | null;

  @ApiPropertyOptional({
    description: 'Citations attached to this response',
    type: [CitationDto],
    isArray: true,
  })
  citations?: CitationDto[];

  @ApiProperty({
    description: 'Current version number for optimistic locking',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'Number of times this response has been edited',
    example: 0,
  })
  editCount: number;

  @ApiPropertyOptional({
    description: 'Timestamp when response was last edited',
    example: '2026-01-27T15:30:00Z',
    nullable: true,
  })
  editedAt: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when response was soft-deleted',
    example: '2026-01-27T16:00:00Z',
    nullable: true,
  })
  deletedAt: string | null;

  @ApiProperty({
    description: 'Response creation timestamp',
    example: '2026-01-27T10:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2026-01-27T10:00:00Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Number of direct replies to this response',
    example: 3,
  })
  replyCount?: number;

  @ApiPropertyOptional({
    description: 'Nested replies for thread display (populated on demand)',
    type: [ResponseDetailDto],
    isArray: true,
  })
  replies?: ResponseDetailDto[];
}
