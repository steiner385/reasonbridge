/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for creating a new tag
 */
export class CreateTagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9-\s]+$/, {
    message: 'Tag name can only contain letters, numbers, hyphens, and spaces',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value?.map((s: string) => s.trim().toLowerCase()))
  aiSynonyms?: string[];

  @IsOptional()
  @IsUUID()
  parentThemeId?: string;
}

/**
 * DTO for updating an existing tag
 */
export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9-\s]+$/, {
    message: 'Tag name can only contain letters, numbers, hyphens, and spaces',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value?.map((s: string) => s.trim().toLowerCase()))
  aiSynonyms?: string[];

  @IsOptional()
  @IsUUID()
  parentThemeId?: string | null;
}

/**
 * DTO for merging two tags
 */
export class MergeTagsDto {
  @IsUUID()
  sourceTagId!: string;

  @IsUUID()
  targetTagId!: string;
}

/**
 * Sort options for tag listing
 */
export enum TagSortBy {
  NAME = 'name',
  USAGE_COUNT = 'usageCount',
  CREATED_AT = 'createdAt',
}

/**
 * Sort direction
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for tag query parameters
 */
export class GetTagsQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  search?: string;

  @IsOptional()
  @IsUUID()
  parentThemeId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  rootTagsOnly?: boolean;

  @IsOptional()
  @IsEnum(TagSortBy)
  sortBy?: TagSortBy = TagSortBy.NAME;

  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.ASC;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

/**
 * DTO for tag search/autocomplete
 */
export class SearchTagsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  query!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}

/**
 * Tag response DTO
 */
export interface TagResponseDto {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
  aiSynonyms: string[];
  parentThemeId: string | null;
  parentTheme?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  childThemes?: {
    id: string;
    name: string;
    slug: string;
  }[];
  createdAt: Date;
}

/**
 * Paginated tag list response
 */
export interface TagListResponseDto {
  tags: TagResponseDto[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Tag statistics response
 */
export interface TagStatisticsDto {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
  topicCount: number;
  recentTopics: {
    id: string;
    title: string;
    createdAt: Date;
  }[];
  relatedTags: {
    id: string;
    name: string;
    slug: string;
    coOccurrenceCount: number;
  }[];
}
