/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Type of contribution in user activity history
 */
export type ContributionType = 'TOPIC' | 'RESPONSE' | 'VOTE' | 'PROPOSITION';

/**
 * Topic context for a contribution
 */
export class ContributionTopicContextDto {
  @ApiProperty({ description: 'Topic ID' })
  id: string;

  @ApiProperty({ description: 'Topic title' })
  title: string;

  @ApiPropertyOptional({ description: 'Topic status' })
  status?: string;
}

/**
 * A single contribution item in user activity history
 */
export class ContributionItemDto {
  @ApiProperty({ description: 'Unique identifier for the contribution' })
  id: string;

  @ApiProperty({
    description: 'Type of contribution',
    enum: ['TOPIC', 'RESPONSE', 'VOTE', 'PROPOSITION'],
  })
  type: ContributionType;

  @ApiProperty({ description: 'ISO 8601 timestamp of when the contribution was created' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Content preview (for topics/responses, max 200 chars)' })
  contentPreview?: string;

  @ApiPropertyOptional({
    description: 'Topic context for the contribution',
    type: ContributionTopicContextDto,
  })
  topic?: ContributionTopicContextDto;

  @ApiPropertyOptional({ description: 'Response ID (for votes and propositions)' })
  responseId?: string;

  @ApiPropertyOptional({ description: 'Vote direction (for votes only)', enum: ['UP', 'DOWN'] })
  voteDirection?: 'UP' | 'DOWN';

  @ApiPropertyOptional({ description: 'Proposition text (for propositions only)' })
  propositionText?: string;

  @ApiPropertyOptional({ description: 'Number of upvotes received (for topics/responses)' })
  upvoteCount?: number;

  @ApiPropertyOptional({ description: 'Number of downvotes received (for topics/responses)' })
  downvoteCount?: number;

  @ApiPropertyOptional({ description: 'Number of replies (for responses)' })
  replyCount?: number;
}

/**
 * Statistics summary for user contributions
 */
export class ContributionStatsDto {
  @ApiProperty({ description: 'Number of topics created' })
  topicCount: number;

  @ApiProperty({ description: 'Number of responses posted' })
  responseCount: number;

  @ApiProperty({ description: 'Number of votes cast' })
  voteCount: number;

  @ApiProperty({ description: 'Number of propositions made' })
  propositionCount: number;
}

/**
 * Pagination metadata
 */
export class PaginationDto {
  @ApiProperty({ description: 'Current page number (1-indexed)' })
  currentPage: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ description: 'Number of items per page' })
  itemsPerPage: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;
}

/**
 * Paginated response for contributions
 */
export class ContributionsResponseDto {
  @ApiProperty({ description: 'Array of contribution items', type: [ContributionItemDto] })
  data: ContributionItemDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationDto })
  pagination: PaginationDto;
}
