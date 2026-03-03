/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTO for querying user contributions
 *
 * Supports pagination and filtering by contribution type
 */

import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../dto/pagination.dto';

/**
 * Types of contributions a user can make
 */
export enum ContributionType {
  TOPIC = 'TOPIC',
  RESPONSE = 'RESPONSE',
  VOTE = 'VOTE',
  PROPOSITION = 'PROPOSITION',
}

/**
 * Query parameters for fetching user contributions
 */
export class GetContributionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by contribution type',
    enum: ContributionType,
    example: ContributionType.RESPONSE,
  })
  @IsOptional()
  @IsEnum(ContributionType)
  type?: ContributionType;

  @ApiPropertyOptional({
    description: 'Filter by topic ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @ApiPropertyOptional({
    description: 'Sort order (newest first by default)',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @Type(() => String)
  sortOrder?: 'asc' | 'desc' = 'desc';
}
