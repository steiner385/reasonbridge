/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Search result type filter
 */
export enum SearchResultType {
  TOPICS = 'topics',
  RESPONSES = 'responses',
  ALL = 'all',
}

/**
 * Sort options for search results
 */
export enum SearchSortBy {
  RELEVANCE = 'relevance',
  DATE = 'date',
}

/**
 * DTO for unified search query parameters
 * Feature #1040: Full-Text Search for Discussions
 */
export class UnifiedSearchQueryDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'climate change policy',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  q!: string;

  @ApiPropertyOptional({
    description: 'Filter by result type',
    enum: SearchResultType,
    default: SearchResultType.ALL,
  })
  @IsOptional()
  @IsEnum(SearchResultType)
  type?: SearchResultType = SearchResultType.ALL;

  @ApiPropertyOptional({
    description: 'Filter responses by specific topic ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiPropertyOptional({
    description: 'Filter by author ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Filter results from this date',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter results until this date',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Sort results by',
    enum: SearchSortBy,
    default: SearchSortBy.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SearchSortBy)
  sortBy?: SearchSortBy = SearchSortBy.RELEVANCE;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Results per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
