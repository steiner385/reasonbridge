/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTO for a single contribution item in the contribution list
 *
 * Represents a user's contribution (topic, response, vote, proposition)
 * with relevant context for display.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionType } from './get-contributions.dto';

/**
 * Summary of topic context for a contribution
 */
export class TopicContextDto {
  @ApiProperty({
    description: 'Topic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Topic title',
    example: 'Should AI be regulated?',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Topic status',
    example: 'ACTIVE',
  })
  status?: string;
}

/**
 * DTO representing a single contribution item
 */
export class ContributionItemDto {
  @ApiProperty({
    description: 'Unique identifier of the contribution',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Type of contribution',
    enum: ContributionType,
    example: ContributionType.RESPONSE,
  })
  type!: ContributionType;

  @ApiProperty({
    description: 'When the contribution was made',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Content preview (for topics/responses)',
    example: 'AI regulation should balance innovation with safety...',
    maxLength: 200,
  })
  contentPreview?: string;

  @ApiPropertyOptional({
    description: 'Topic context for responses, votes, and propositions',
    type: TopicContextDto,
  })
  topic?: TopicContextDto;

  @ApiPropertyOptional({
    description: 'Response ID (for votes and propositions)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  responseId?: string;

  @ApiPropertyOptional({
    description: 'Vote direction (for votes only)',
    enum: ['UP', 'DOWN'],
    example: 'UP',
  })
  voteDirection?: 'UP' | 'DOWN';

  @ApiPropertyOptional({
    description: 'Proposition text (for propositions only)',
    example: 'AI should require human oversight for critical decisions',
  })
  propositionText?: string;

  @ApiPropertyOptional({
    description: 'Number of upvotes received (for topics/responses)',
    example: 42,
  })
  upvoteCount?: number;

  @ApiPropertyOptional({
    description: 'Number of downvotes received (for topics/responses)',
    example: 5,
  })
  downvoteCount?: number;

  @ApiPropertyOptional({
    description: 'Number of replies (for responses)',
    example: 12,
  })
  replyCount?: number;
}

/**
 * Summary statistics for a user's contributions
 */
export class ContributionStatsDto {
  @ApiProperty({
    description: 'Total number of topics created',
    example: 15,
  })
  topicCount!: number;

  @ApiProperty({
    description: 'Total number of responses posted',
    example: 247,
  })
  responseCount!: number;

  @ApiProperty({
    description: 'Total number of votes cast',
    example: 1024,
  })
  voteCount!: number;

  @ApiProperty({
    description: 'Total number of propositions made',
    example: 89,
  })
  propositionCount!: number;
}
