/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Type discriminator for search results
 */
export enum SearchResultItemType {
  TOPIC = 'topic',
  RESPONSE = 'response',
}

/**
 * Base search result item
 */
export class SearchResultItemDto {
  @ApiProperty({
    description: 'Result type discriminator',
    enum: SearchResultItemType,
  })
  type!: SearchResultItemType;

  @ApiProperty({
    description: 'Item ID',
  })
  id!: string;

  @ApiProperty({
    description: 'Relevance score (higher is more relevant)',
  })
  score!: number;

  @ApiProperty({
    description: 'When the item was created',
  })
  createdAt!: Date;
}

/**
 * Topic search result
 */
export class TopicSearchResultDto extends SearchResultItemDto {
  @ApiProperty({
    description: 'Result type',
    default: SearchResultItemType.TOPIC,
  })
  override type: SearchResultItemType = SearchResultItemType.TOPIC;

  @ApiProperty({
    description: 'Topic title',
  })
  title!: string;

  @ApiProperty({
    description: 'Topic description',
  })
  description!: string;

  @ApiProperty({
    description: 'Topic slug for URL',
  })
  slug!: string;

  @ApiProperty({
    description: 'Topic status',
  })
  status!: string;

  @ApiProperty({
    description: 'Number of responses in the topic',
  })
  responseCount!: number;

  @ApiProperty({
    description: 'Number of participants',
  })
  participantCount!: number;

  @ApiProperty({
    description: 'Topic tags',
    type: [String],
  })
  tags!: string[];
}

/**
 * Response search result
 */
export class ResponseSearchResultDto extends SearchResultItemDto {
  @ApiProperty({
    description: 'Result type',
    default: SearchResultItemType.RESPONSE,
  })
  override type: SearchResultItemType = SearchResultItemType.RESPONSE;

  @ApiProperty({
    description: 'Response content (full)',
  })
  content!: string;

  @ApiPropertyOptional({
    description: 'Highlighted content with search terms marked',
  })
  highlightedContent?: string;

  @ApiProperty({
    description: 'Author ID',
  })
  authorId!: string;

  @ApiProperty({
    description: 'Parent topic ID',
  })
  topicId!: string;

  @ApiProperty({
    description: 'Parent topic title',
  })
  topicTitle!: string;

  @ApiProperty({
    description: 'Parent topic slug',
  })
  topicSlug!: string;

  @ApiPropertyOptional({
    description: 'Parent response ID (for threaded replies)',
  })
  parentId?: string | null;
}

/**
 * Pagination metadata
 */
export class SearchMetaDto {
  @ApiProperty({
    description: 'Total number of results across all types',
  })
  total!: number;

  @ApiProperty({
    description: 'Number of topic results',
  })
  topicCount!: number;

  @ApiProperty({
    description: 'Number of response results',
  })
  responseCount!: number;

  @ApiProperty({
    description: 'Current page number',
  })
  page!: number;

  @ApiProperty({
    description: 'Results per page',
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
  })
  totalPages!: number;

  @ApiProperty({
    description: 'Search query',
  })
  query!: string;
}

/**
 * Unified search results response
 * Feature #1040: Full-Text Search for Discussions
 */
export class UnifiedSearchResultsDto {
  @ApiProperty({
    description: 'Search results (topics and responses combined)',
    type: [SearchResultItemDto],
  })
  data!: (TopicSearchResultDto | ResponseSearchResultDto)[];

  @ApiProperty({
    description: 'Pagination and count metadata',
    type: SearchMetaDto,
  })
  meta!: SearchMetaDto;
}
