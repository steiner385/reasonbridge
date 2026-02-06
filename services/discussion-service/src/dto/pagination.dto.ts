/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T011 [P] - Base pagination DTO classes (Feature 009)
 *
 * Provides consistent pagination structure across discussion and response endpoints
 */

import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for paginated endpoints
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

/**
 * Pagination metadata in responses
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  currentPage!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages!: number;

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 237,
  })
  totalItems!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
  })
  itemsPerPage!: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage!: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage!: boolean;
}

/**
 * Generic paginated response wrapper
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items for current page',
    isArray: true,
  })
  data!: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  pagination!: PaginationMetaDto;
}

/**
 * Helper function to create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMetaDto {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
